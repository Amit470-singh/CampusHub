/**
 * CAMPUSHUB REST API & REAL-TIME SOCKET.IO SERVER
 * Version 2.1.0 (Production-Ready for Koyeb & Supabase)
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const config = require('./config/config');
const apiRoutes = require('./routes');
const requestLogger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const db = require('../../database/db');

const app = express();
const server = http.createServer(app);

// Initialize DB connection pool
db.getPool();

// Parse Allowed Origins for CORS
const configuredOrigins = config.FRONTEND_ORIGIN
  ? config.FRONTEND_ORIGIN.split(',').map(o => o.trim().replace(/\/+$/, ''))
  : [];

function isOriginAllowed(origin) {
  if (!origin) return true; // Mobile apps, Postman, curl, server-to-server
  const cleanOrigin = origin.replace(/\/+$/, '');

  // Local development origins
  if (config.NODE_ENV !== 'production') {
    if (cleanOrigin.startsWith('http://localhost') || cleanOrigin.startsWith('http://127.0.0.1')) {
      return true;
    }
  }

  // Allow wildcard only if explicitly configured in non-production
  if (config.FRONTEND_ORIGIN === '*' && config.NODE_ENV !== 'production') {
    return true;
  }

  // Exact whitelist match
  if (configuredOrigins.includes(cleanOrigin) || configuredOrigins.includes('*')) {
    return true;
  }

  // Allow GitHub Pages origins if frontend is hosted there
  if (cleanOrigin.endsWith('.github.io')) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ [CORS Blocked] Origin not allowed: ${origin}`);
      callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Mount API Endpoints
app.use('/api', apiRoutes);

// Optional: Serve frontend static assets if hosted together (e.g. Docker or local preview)
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

// API 404 handler for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Fallback for SPA routing if serving frontend statically
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
    const indexPath = path.join(frontendPath, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  }
  next();
});

// Error handling
app.use(errorHandler);

// =========================================================
// REAL-TIME WEBSOCKET LAYER (Socket.IO)
// =========================================================
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) callback(null, true);
      else callback(new Error('Socket CORS blocked'));
    },
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 25000
});

// Active online users registry (userId -> socketId)
const onlineUsers = new Map();

// Socket.IO JWT Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers?.authorization?.split(' ')[1] ||
                  null;

    if (token) {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await db.getUser(decoded.id) || await db.getUserByEmail(decoded.email);
      if (user) {
        socket.user = user;
      }
    }
    // Allow connection even as guest for public channel events; authenticated features check socket.user
    next();
  } catch (err) {
    // If token invalid, allow as guest rather than aborting connection
    next();
  }
});

io.on('connection', (socket) => {
  const user = socket.user;
  const userId = user ? user.id : `guest_${socket.id.substring(0, 5)}`;
  const userName = user ? user.name : 'Anonymous Student';

  if (user) {
    onlineUsers.set(user.id, socket.id);
    socket.join(`user:${user.id}`);
    io.emit('presence_update', { userId: user.id, status: 'online' });
  }

  // Join specific chat room
  socket.on('join_chat', ({ chatId }) => {
    if (chatId) {
      socket.join(`chat:${chatId}`);
    }
  });

  // Leave specific chat room
  socket.on('leave_chat', ({ chatId }) => {
    if (chatId) {
      socket.leave(`chat:${chatId}`);
    }
  });

  // Real-time message exchange
  socket.on('send_message', async (payload, ack) => {
    try {
      const { chatId, text, recipientId } = payload;
      if (!chatId || !text || !text.trim()) {
        if (typeof ack === 'function') ack({ success: false, message: 'Message text required' });
        return;
      }

      const senderId = user ? user.id : 'user-01';
      const senderName = user ? user.name : 'me';

      // Persist in Supabase / PostgreSQL database
      const savedMsg = await db.sendMessage(chatId, senderId, senderName, text.trim());

      const broadcastPayload = {
        chatId,
        message: {
          id: savedMsg.id,
          senderId,
          sender: senderName,
          text: text.trim(),
          createdAt: savedMsg.createdAt || new Date().toISOString()
        }
      };

      // Broadcast to all participants in this chat room
      io.to(`chat:${chatId}`).emit('receive_message', broadcastPayload);

      // If recipient has a private user room, notify them directly
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('receive_message', broadcastPayload);
      }

      if (typeof ack === 'function') ack({ success: true, data: savedMsg });
    } catch (err) {
      console.error('Socket send_message error:', err.message);
      if (typeof ack === 'function') ack({ success: false, message: 'Failed to deliver message' });
    }
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    if (user) {
      onlineUsers.delete(user.id);
      io.emit('presence_update', { userId: user.id, status: 'offline' });
    }
  });
});

// Start HTTP & WebSocket Server
server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`
🚀 =======================================================
⚡ CAMPUSHUB BACKEND REST & REAL-TIME SERVER ONLINE
📍 Port:              ${config.PORT}
📍 Local Endpoint:    http://localhost:${config.PORT}/api
🏥 Health Check:      http://localhost:${config.PORT}/api/health
💬 Real-time Chat:    Socket.IO enabled on /socket.io
🗄️ Database:          PostgreSQL / Supabase
⚡ Environment:       ${config.NODE_ENV}
=======================================================
  `);
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down CampusHub server...`);
  server.close(async () => {
    try {
      const pool = db.getPool();
      await pool.end();
      console.log('✅ PostgreSQL connection pool closed.');
    } catch (e) {
      // Ignore pool close errors on shutdown
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, server, io };
