![MERN](https://img.shields.io/badge/Stack-MERN-blue)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)
![React](https://img.shields.io/badge/Frontend-React.js-61DAFB)
![Node](https://img.shields.io/badge/Backend-Node.js-brightgreen)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![Deployment](https://img.shields.io/badge/Deployed-Vercel%20%26%20Render-purple)

# 🚀 TeamForge – Skill Based Team Formation Platform

🔗 **Live Demo:** https://teamforge.vercel.app/ 
🔗 **Backend API:** https://teamforge-api.onrender.com/
💻 **GitHub Repository:** https://github.com/Manaskr88/teamforge

---

## 📖 Overview

TeamForge is a full-stack MERN application designed to help students, developers, and hackathon participants build balanced and compatible teams efficiently.

The platform uses a smart compatibility matching algorithm that analyzes users based on:

* Skills
* Experience Level
* Availability

Unlike traditional team finders, TeamForge prioritizes complementary skills to create stronger and more diverse teams.

The application also includes:

* Real-time team chat
* Team/project management
* Invitation workflows
* Public developer profiles
* Smart recommendations system

---

## 🚀 Tech Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* Framer Motion

### Backend

* Node.js
* Express.js
* Socket.IO

### Database

* MongoDB Atlas
* Mongoose

### Authentication

* JWT Authentication
* bcryptjs

### Deployment

* Vercel (Frontend)
* Render (Backend)

---

## ✨ Key Features

### 👤 Authentication & User System

* JWT-based authentication
* Persistent login sessions
* Multi-step registration workflow
* Editable public user profiles

### 🤝 Smart Team Matching

* Compatibility scoring system
* Skill-based recommendations
* Complementary skill prioritization
* Match explanation breakdowns

### 👥 Team Management

* Create and manage teams
* Invite users to teams
* Browse teams with filters
* Team member management

### 💬 Real-Time Team Chat

* Private team chat rooms
* Socket.IO powered messaging
* Typing indicators
* Seen receipts
* Online/offline member tracking
* Persistent chat history

### 📂 Project Collaboration

* Create and browse projects
* Apply to join projects
* View applicants and required skills
* Hackathon-focused workflows

### 🔔 Notifications System

* Team invitations
* Application updates
* Real-time activity notifications
* Read/unread management

### 🌐 Explore Developers

* Search developers
* Filter by skills and experience
* Public developer profiles
* Invite directly from profiles

---

## 🧠 Compatibility Algorithm

The smart recommendation engine calculates compatibility using:

* Skills → 50%
* Experience → 30%
* Availability → 20%

The platform rewards complementary skills more than identical ones to encourage balanced team formation.

Example:

* Frontend Developer + Backend Developer → Higher Match
* Two identical frontend developers → Lower Match

---

## 🏗 System Architecture

Client (React + Vite Frontend)
→ REST API (Node.js + Express Backend)
→ MongoDB Atlas Database

Real-time communication handled using Socket.IO.
Authentication secured using JWT tokens.

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Manaskr88/teamforge
```

### 2️⃣ Navigate into project folder

```bash
cd teamforge
```

---

## 🔧 Backend Setup

### Navigate to backend

```bash
cd backend
```

### Install dependencies

```bash
npm install
```

### Create `.env`

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Start backend server

```bash
npm run dev
```

---

## 🎨 Frontend Setup

### Navigate to frontend

```bash
cd frontend
```

### Install dependencies

```bash
npm install
```

### Create `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

### Start frontend

```bash
npm run dev
```

---

## 📂 Project Structure

```bash
teamforge/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── context/
│   └── utils/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── sockets/
│   └── config/
```

---

## 🔌 Core API Endpoints

| Method | Endpoint              | Description          |
| ------ | --------------------- | -------------------- |
| POST   | /api/auth/register    | Register user        |
| POST   | /api/auth/login       | Login user           |
| GET    | /api/users/profile    | Get profile          |
| PUT    | /api/users/profile    | Update profile       |
| GET    | /api/recommendations  | Get compatible users |
| POST   | /api/teams/create     | Create team          |
| POST   | /api/invitations/send | Send invitation      |
| GET    | /api/projects         | Get projects         |

---

## 📈 Performance & Optimization

* Optimized recommendation matching logic
* Real-time Socket.IO event handling
* Responsive mobile-first UI
* Efficient MongoDB query structure
* Persistent authentication sessions

---

## 🔮 Future Enhancements

* AI-powered teammate recommendations
* Video/audio team rooms
* GitHub integration
* Calendar & scheduling system
* Hackathon event integration
* Advanced analytics dashboard

---

## 👨‍💻 Author

**Manas Kumar**
Full Stack Developer

🔗 GitHub: https://github.com/Manaskr88
🔗 LeetCode: https://leetcode.com/u/Manaskr88

---

## ⭐ Contributing

Contributions are welcome.
Fork the repository and submit a pull request for improvements or new features.

---

## 📜 License

This project is licensed under the MIT License.
