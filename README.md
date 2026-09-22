# TeamForge — Intelligent Skill-Based Team Formation Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-team--forge--y1hx.onrender.com-brightgreen)](https://team-forge-y1hx.onrender.com)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-emerald)](https://mongodb.com)
[![AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash%20%2B%20Groq-purple)](https://aistudio.google.com)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-orange)](https://socket.io)

> A production-ready full-stack platform for smart team formation using AI-powered skill matching, real-time collaboration, and intelligent recommendations.

🌐 **Live:** https://team-forge-y1hx.onrender.com

---

## Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Teammate Recommendations | AI ranks developers by compatibility using skill and experience matching |
| 💡 Hackathon Idea Generator | Generate complete project plans — roadmap, team roles, tech stack |
| 📊 Skill Gap Analyzer | Personalized AI career roadmaps and learning plans |
| 💬 Real-time Team Chat | Socket.IO chat with built-in AI assistant |
| 👥 Team Management | Create, join, invite members, and manage teams |
| 🔍 Explore Developers | Search and filter developers by skill, experience, availability |
| 📋 Projects | Post projects, request to join, manage join requests |
| 🔔 Notifications | Real-time notification bell in navbar |
| 📸 Avatar Upload | Profile photo upload via Cloudinary with instant sync |
| 🔐 Google OAuth | Sign in with Google in addition to email/password |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js + Express.js + Socket.IO |
| Database | MongoDB Atlas + Mongoose |
| AI — Primary | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| AI — Fallback | Groq API (`qwen/qwen3.8-27b`) |
| Auth | JWT + bcryptjs + Google OAuth |
| File Upload | Multer + Cloudinary |

---

## AI Provider Architecture

The backend uses a **dual-provider fallback chain** for all AI features:

```
Request → Gemini 1.5 Flash (primary)
               ↓ fails or key missing?
          Groq qwen/qwen3.8-27b (fallback)
               ↓ fails?
          Clean error returned to user
```

- **Gemini 1.5 Flash** — primary. Native JSON mode, 1M tokens/day free, no reasoning token drain.
- **Groq** — automatic fallback. Used if Gemini is unavailable or rate-limited.
- Set **both** keys for maximum reliability. Either key alone is sufficient to run the app.

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configure Environment

**Backend** — copy `.env.example` to `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/teamforge
JWT_SECRET=your_32_char_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# AI — set at least one
GEMINI_API_KEY=AIzaSy_your_key_from_aistudio.google.com
GROQ_API_KEY=gsk_your_key_from_console.groq.com

# Optional (for avatar uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

**Frontend** — copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id   # optional
```

### 3. Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Deployment

### Backend → Render (Free Web Service)

1. Push to GitHub
2. Create **Web Service** on [render.com](https://render.com)
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. **Health Check Path:** `/health`
7. Add environment variables in Render dashboard (all keys from `.env.example`)
8. Set `CLIENT_URL` to your frontend URL

### Frontend → Render (Static Site) or Vercel

1. **Root Directory:** `frontend`
2. **Build Command:** `npm install && npm run build`
3. **Publish Directory:** `dist`
4. Add rewrite rule: `/*` → `/index.html`
5. Environment variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://your-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = your Google OAuth client ID (optional)

> **Note on Render free tier:** The backend sleeps after 15 minutes of inactivity. On first visit after a sleep period, the frontend automatically detects the cold start and shows a "Waking up the server…" message while the backend spins up (~15–30s). No action needed from the user.

---

## Getting AI API Keys (Both Free)

### Gemini (Primary — Recommended)
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API key**
3. Copy the key (starts with `AIzaSy`)
4. Add as `GEMINI_API_KEY` in your `.env` and Render dashboard

### Groq (Fallback)
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up / log in (free)
3. Click **Create API Key**
4. Copy the key (starts with `gsk_`)
5. Add as `GROQ_API_KEY` in your `.env` and Render dashboard

---

## API Reference

### AI Routes (JWT required, 20 req/min per user)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/chat` | AI team chat assistant |
| POST | `/api/ai/generate-idea` | Hackathon idea generator |
| POST | `/api/ai/skill-gap-analysis` | Skill gap + learning roadmap |
| POST | `/api/ai/team-recommendations` | AI personal teammate recommendations |
| POST | `/api/ai/team-analysis` | AI team-mode recommendations |
| POST | `/api/ai/save-idea` | Save a generated idea |
| GET  | `/api/ai/saved-ideas` | Get saved ideas |

### Core Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/google` | Google OAuth login/register |
| GET  | `/api/auth/me` | Get current session user |
| GET  | `/api/users/dashboard` | Dashboard stats + active teams |
| PUT  | `/api/users/profile` | Update profile |
| POST | `/api/users/upload-avatar` | Upload avatar to Cloudinary |
| GET  | `/api/recommendations/teammates` | Algorithmic teammate suggestions |
| GET  | `/api/chat/:teamId/messages` | Paginated team chat history |
| GET  | `/api/health` | Health check (no auth, no DB required) |

---

## Project Structure

```
team_forge/
├── backend/
│   ├── controllers/     auth, user, team, project, invitation,
│   │                    notification, recommendation, ai, chat
│   ├── models/          User, Team, Project, Invitation,
│   │                    Notification, Message, ProjectMessage, SavedIdea
│   ├── routes/          REST routes + AI routes (rate-limited)
│   ├── services/
│   │   └── ai.service.js   Gemini + Groq dual-provider AI integration
│   ├── middleware/      auth (JWT protect), validation
│   ├── config/          cloudinary.js
│   └── server.js        Express + Socket.IO + MongoDB connection
│
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/   Sidebar, DashboardTopbar, Navbar
        │   ├── ui/       Button, Input, Modal, Avatar, Badge, Loader
        │   └── project/  ProjectChat
        ├── context/      AuthContext (session + wake detection)
        ├── hooks/        useSocket (Socket.IO singleton)
        ├── pages/
        │   ├── LandingPage, LoginPage, RegisterPage
        │   └── dashboard/  Home, Teams, TeamDetail, Projects,
        │                   ProjectDetail, Profile, UserProfile,
        │                   Explore, Invitations, Notifications,
        │                   AIRecommendations, IdeaGenerator, SkillGapAnalyzer
        ├── services/     api.js (Axios — standard + AI-specific instances)
        └── utils/        serverWake.js (cold-start detection + backoff)
```

---

## Production Optimizations

- **Cold start handling** — frontend detects sleeping backend and shows a progress message instead of appearing frozen
- **Exponential backoff** — health probe retries with increasing delays, stops after ~60s
- **Code splitting** — all 14 dashboard pages are lazy-loaded via `React.lazy()` so the initial bundle is small
- **Search debouncing** — 350ms debounce on all search inputs prevents API calls on every keystroke
- **Fire-and-forget writes** — non-critical DB writes (online status, view counts) don't block API responses
- **MongoDB indexes** — indexes on `User.skills`, `experienceLevel`, `availability` and TTL index on `Invitation.expiresAt`
- **Global crash guards** — `uncaughtException` and `unhandledRejection` handlers keep the server alive after unexpected errors

---

Built with ❤️ for developers, by Manas.
