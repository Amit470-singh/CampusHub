# CampusHub 🚀

> **Student-Only Collaboration & Project Matching Network**  
> Don’t Just Study. Build Real Stuff.

---

## 📂 Architecture Overview

CampusHub is structured as a clean, decoupled modular application:

```
campus-hub/
├── frontend/             # Standalone Client-Side Application
│   ├── index.html        # Interactive UI & SPA layout
│   ├── style.css         # Custom design system & styles
│   ├── app.js            # Client-side state & interactive logic
│   └── package.json      # Frontend server scripts
│
├── backend/              # Node.js / Express REST API Server
│   ├── src/
│   │   ├── config/       # Environment & runtime configuration
│   │   ├── controllers/  # API business logic
│   │   ├── middlewares/  # Logger, error handlers, and cors
│   │   ├── routes/       # Endpoint routes (/api/auth, /api/events, etc.)
│   │   └── server.js     # Express server entry point
│   └── package.json      # Backend dependencies & scripts
│
├── database/             # Relational Data & Persistence Layer (PostgreSQL / Supabase)
│   ├── db.js             # Data Access Object (DAO) & connection pool
│   ├── schema.sql        # Database schema definitions (PostgreSQL DDL)
│   ├── seed.sql          # Seed dataset
│   └── seed.js           # CLI seeding script
│
├── api/                  # Vercel Serverless Function Entrypoint
│   └── index.js          # Routes HTTP requests to Express app
│
└── package.json          # Root workspace orchestration scripts
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# Install backend dependencies
cd backend && npm install

# (Optional) Install frontend dependencies
cd ../frontend && npm install
```

### 2. Running the Application

#### Option A: Run Backend Server (with API & Static Fallback)
```bash
npm run start:backend
# or from root:
npm start
```
- API Endpoint: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`
- Frontend UI: `http://localhost:5000`

#### Option B: Run Frontend Separately (Dev Mode)
```bash
npm run dev:frontend
# or cd frontend && npx serve -l 3000
```
- Frontend UI: `http://localhost:3000`

#### Option C: Run Backend in Watch Mode
```bash
npm run dev:backend
```

---

## 🛠️ API Subsystems
- `GET /api/health` - API Health check
- `GET /api/user/profile` - Current user profile
- `GET /api/teams` - Hackathon & project teams
- `GET /api/events` - Hackathons, workshops, and meetups
- `GET /api/products` - Marketplace items
- `GET /api/discussions` - Campus feed & discussions
- `GET /api/communities` - Student clubs & circles
- `GET /api/chats` - Direct messaging threads
- `GET /api/roadmaps` - Developer learning roadmaps

---

## 📜 License
MIT License
