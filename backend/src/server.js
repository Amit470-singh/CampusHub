/**
 * CAMPUSHUB REST API & REAL-TIME SERVER
 * Version 2.2.0 (Production-Ready for Vercel Serverless & Supabase)
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

function parseOrigin(str) {
  if (!str) return '';
  const trimmed = str.trim();
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch (e) {
    return trimmed.replace(/\/+$/, '');
  }
}

// Parse Allowed Origins for CORS
const configuredOrigins = config.FRONTEND_ORIGIN
  ? config.FRONTEND_ORIGIN.split(',').map(parseOrigin).filter(Boolean)
  : [];

function isOriginAllowed(origin) {
  if (!origin) return true; // Mobile apps, Postman, curl, server-to-server
  const cleanOrigin = parseOrigin(origin);

  // Local development origins
  if (config.NODE_ENV !== 'production') {
    if (cleanOrigin.startsWith('http://localhost') || cleanOrigin.startsWith('http://127.0.0.1')) {
      return true;
    }
    if (config.FRONTEND_ORIGIN === '*') {
      return true;
    }
  }

  // Production: strictly allow configured FRONTEND_ORIGIN only
  if (configuredOrigins.includes(cleanOrigin)) {
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
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Root endpoint for API service discovery & health status
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CampusHub REST API',
    version: '2.2.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      teams: '/api/teams',
      events: '/api/events',
      products: '/api/products',
      communities: '/api/communities',
      discussions: '/api/discussions',
      notifications: '/api/notifications',
      chats: '/api/chats',
      roadmaps: '/api/roadmaps'
    }
  });
});

// Mount API Endpoints (both on /api and root fallback for flexible rewrite environments)
app.use('/api', apiRoutes);
app.use(apiRoutes);

// Optional: Serve frontend static assets if hosted together (e.g. local dev preview)
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
// REAL-TIME WEBSOCKET LAYER (Socket.IO for local / standalone)
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
    next();
  } catch (err) {
    next();
  }
});

io.on('connection', (socket) => {
  const user = socket.user;

  if (user) {
    onlineUsers.set(user.id, socket.id);
    socket.join(`user:${user.id}`);
    io.emit('presence_update', { userId: user.id, status: 'online' });
  }

  socket.on('join_chat', ({ chatId }) => {
    if (chatId) socket.join(`chat:${chatId}`);
  });

  socket.on('leave_chat', ({ chatId }) => {
    if (chatId) socket.leave(`chat:${chatId}`);
  });

  socket.on('send_message', async (payload, ack) => {
    try {
      const { chatId, text, recipientId } = payload;
      if (!chatId || !text || !text.trim()) {
        if (typeof ack === 'function') ack({ success: false, message: 'Message text required' });
        return;
      }

      const senderId = user ? user.id : 'user-01';
      const senderName = user ? user.name : 'me';

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

      io.to(`chat:${chatId}`).emit('receive_message', broadcastPayload);

      if (recipientId) {
        io.to(`user:${recipientId}`).emit('receive_message', broadcastPayload);
      }

      if (typeof ack === 'function') ack({ success: true, data: savedMsg });
    } catch (err) {
      console.error('Socket send_message error:', err.message);
      if (typeof ack === 'function') ack({ success: false, message: 'Failed to deliver message' });
    }
  });

  socket.on('disconnect', () => {
    if (user) {
      onlineUsers.delete(user.id);
      io.emit('presence_update', { userId: user.id, status: 'offline' });
    }
  });
});

// Start HTTP & WebSocket Server only when run directly as standalone script
if (require.main === module) {
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
}

module.exports = app;
module.exports.app = app;
module.exports.server = server;
module.exports.io = io;
