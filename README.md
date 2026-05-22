# TeamForge — Intelligent Skill-Based Team Formation Platform

A production-ready full-stack MERN application for building smarter teams using AI-powered skill matching.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18 + Vite, Tailwind CSS, Framer Motion    |
| Backend    | Node.js, Express.js                             |
| Database   | MongoDB Atlas + Mongoose                        |
| Auth       | JWT + bcryptjs                                  |
| Icons      | Lucide React                                    |
| Deployment | Frontend → Vercel, Backend → Render             |

---

## Project Structure

```
teamforge/
├── backend/
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth + validation
│   ├── models/            # Mongoose schemas
│   ├── routes/            # Express routers
│   ├── uploads/           # Static file storage
│   ├── server.js          # Entry point
│   └── .env               # Environment variables
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/    # Navbar, Sidebar
    │   │   └── ui/        # Button, Input, Modal, Avatar, Badge, Loader
    │   ├── context/       # AuthContext
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── dashboard/
    │   │       ├── DashboardLayout.jsx
    │   │       ├── DashboardHome.jsx
    │   │       ├── ProfilePage.jsx
    │   │       ├── TeamsPage.jsx
    │   │       ├── TeamDetailPage.jsx
    │   │       ├── ProjectsPage.jsx
    │   │       ├── ProjectDetailPage.jsx
    │   │       ├── RecommendPage.jsx
    │   │       ├── InvitationsPage.jsx
    │   │       ├── NotificationsPage.jsx
    │   │       └── ExplorePage.jsx
    │   ├── services/      # Axios API calls
    │   └── App.jsx
    └── .env
```

---

## Quick Start

### 1. Clone & Install

```bash
# Backend
cd teamforge/backend
npm install

# Frontend
cd teamforge/frontend
npm install
```

### 2. Configure Environment

**Backend** — copy `.env.example` to `.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/teamforge
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Frontend** — copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

### Auth
| Method | Route              | Description        |
|--------|--------------------|--------------------|
| POST   | /api/auth/register | Register user      |
| POST   | /api/auth/login    | Login              |
| GET    | /api/auth/me       | Get current user   |
| POST   | /api/auth/logout   | Logout             |

### Users
| Method | Route                | Description         |
|--------|----------------------|---------------------|
| GET    | /api/users           | Get all users       |
| GET    | /api/users/dashboard | Dashboard stats     |
| GET    | /api/users/:id       | Get user by ID      |
| PUT    | /api/users/profile   | Update profile      |

### Teams
| Method | Route                        | Description      |
|--------|------------------------------|------------------|
| GET    | /api/teams                   | Get all teams    |
| POST   | /api/teams                   | Create team      |
| GET    | /api/teams/my                | My teams         |
| GET    | /api/teams/:id               | Team detail      |
| PUT    | /api/teams/:id               | Update team      |
| DELETE | /api/teams/:id               | Delete team      |
| POST   | /api/teams/:id/leave         | Leave team       |
| DELETE | /api/teams/:id/members/:uid  | Remove member    |

### Projects
| Method | Route                   | Description       |
|--------|-------------------------|-------------------|
| GET    | /api/projects           | Get all projects  |
| POST   | /api/projects           | Create project    |
| GET    | /api/projects/my        | My projects       |
| GET    | /api/projects/:id       | Project detail    |
| PUT    | /api/projects/:id       | Update project    |
| DELETE | /api/projects/:id       | Delete project    |
| POST   | /api/projects/:id/apply | Apply to project  |

### Recommendations
| Method | Route                              | Description          |
|--------|------------------------------------|----------------------|
| GET    | /api/recommendations/teammates     | Get recommendations  |
| GET    | /api/recommendations/compatibility/:id | Compatibility score |

---

## Compatibility Score Formula

```
Score = (Skill Match × 0.5) + (Experience Match × 0.3) + (Availability Match × 0.2)
```

- **Skill Match**: Complementary skills score higher than identical ones
- **Experience Match**: Peer-level or mentor-mentee pairings
- **Availability Match**: Schedule overlap for real collaboration

---

## Deployment

### Backend → Render

1. Push backend to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set environment variables in Render dashboard
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend → Vercel

1. Push frontend to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set `VITE_API_URL` to your Render backend URL
4. Deploy

---

## Features

- JWT authentication with persistent sessions
- Smart teammate matching with compatibility scoring
- Team creation, management, and member invitations
- Project posting with skill requirements
- Real-time notifications
- Explore developers with advanced filters
- Responsive mobile-first design
- Glassmorphism UI with Framer Motion animations
- Skeleton loaders and empty states
