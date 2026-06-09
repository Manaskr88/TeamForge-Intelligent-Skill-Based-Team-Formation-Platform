# TeamForge — Intelligent Skill-Based Team Formation Platform

[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue)](https://vitejs.dev)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-emerald)](https://mongodb.com)
[![AI](https://img.shields.io/badge/AI-Groq%20LLaMA%203.1-purple)](https://console.groq.com)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-orange)](https://socket.io)

> A production-ready SaaS platform for smart team formation using AI-powered skill matching, real-time chat, and intelligent recommendations.

---

## Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Teammates | Groq AI analyzes and ranks developers by compatibility |
| 💡 Idea Generator | Generate complete hackathon project plans with AI |
| 📊 Skill Gap Analyzer | AI career roadmaps and learning plans |
| 💬 Team Chat | Real-time Socket.IO chat with AI assistant (@AI) |
| 👥 Team Management | Create, join, and manage teams |
| 🔍 Explore | Search and filter developers |
| 📋 Projects | Post and apply to projects/hackathons |
| 🔔 Notifications | Real-time notification system in navbar |
| 📸 Avatar Upload | Profile photo upload with instant global sync |
| 🔗 Profile Links | GitHub, LinkedIn, website integration |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js + Express.js + Socket.IO |
| Database | MongoDB Atlas + Mongoose |
| AI | Groq API (LLaMA 3.1 8B Instant) |
| Auth | JWT + bcryptjs |
| File Upload | Multer |

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure Environment

**Backend** — copy `.env.example` to `.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/teamforge?retryWrites=true&w=majority
JWT_SECRET=your_32_char_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
GROQ_API_KEY=gsk_your_key_from_console.groq.com
```

**Frontend** — copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173

---

## Deployment

### Backend → Render

1. Push `backend/` to GitHub
2. Create **Web Service** on [render.com](https://render.com)
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Set environment variables in Render dashboard (from `.env.example`)
6. Set `CLIENT_URL` to your Vercel frontend URL

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. **Framework Preset:** Vite
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Set environment variables:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://your-backend.onrender.com`
7. Deploy

---

## API Endpoints

### AI Routes (all require JWT)

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/ai/chat | AI chat assistant |
| POST | /api/ai/generate-idea | Hackathon idea generator |
| POST | /api/ai/skill-gap-analysis | Skill gap analyzer |
| POST | /api/ai/team-recommendations | AI personal recommendations |
| POST | /api/ai/team-analysis | AI team-mode recommendations |
| POST | /api/ai/save-idea | Save an idea |
| GET | /api/ai/saved-ideas | Get saved ideas |

### Core Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/users/dashboard | Dashboard stats |
| PUT | /api/users/profile | Update profile |
| POST | /api/users/upload-avatar | Upload avatar photo |
| GET | /api/recommendations/teammates | For-Me recommendations |
| GET | /api/recommendations/team/:id | For-Team recommendations |
| GET | /api/chat/:teamId/messages | Get chat history |

---

## Getting a Groq API Key (Free)

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up / log in (free)
3. Click **Create API Key**
4. Copy the key (starts with `gsk_`)
5. Add to `backend/.env` as `GROQ_API_KEY=gsk_...`
6. Restart backend

---

## Project Structure

```
team_forge/
├── backend/
│   ├── controllers/   auth, user, team, project, invitation, notification, recommendation, ai, chat
│   ├── models/        User, Team, Project, Invitation, Notification, Message, SavedIdea
│   ├── routes/        all REST + AI routes
│   ├── services/      ai.service.js (Groq integration)
│   ├── middleware/    auth, validation
│   ├── uploads/       profile-images/
│   └── server.js      Express + Socket.IO
│
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/  Navbar, Sidebar, DashboardTopbar
        │   ├── ui/      Button, Input, Modal, Avatar, Badge, Loader, LogoIcon
        │   └── chat/    TeamChat (with AI @mention)
        ├── context/     AuthContext (global user state)
        ├── hooks/       useSocket
        ├── pages/
        │   ├── LandingPage, LoginPage, RegisterPage
        │   └── dashboard/  Home, Teams, Projects, Profile, Explore,
        │                   Invitations, Notifications, UserProfile,
        │                   AIRecommendations, IdeaGenerator, SkillGapAnalyzer
        └── services/    api.js (all Axios calls)
```

---

Built with ❤️ for developers, by Manas.
