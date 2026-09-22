const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const dotenv     = require('dotenv');
const path       = require('path');
const jwt        = require('jsonwebtoken');

dotenv.config();

// ── Global crash guards (MUST be first) ──────────────────────────────────────
// These prevent the entire Node process from dying on unhandled async errors.
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION — server will continue:', err.message);
  console.error(err.stack);
  // Do NOT call process.exit() — Render free tier takes ~30s to restart.
  // Log and continue; a single bad request should never kill the server.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // Same reasoning — log but keep running.
});

const app    = express();
const server = http.createServer(app);

// ── CORS origins ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://team-forge-y1hx.onrender.com',  // production frontend
].filter(Boolean);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  // Reduce ping interval on free tier to avoid false disconnects during cold wake
  pingInterval: 25000,
});

// Attach io to app so controllers can emit if needed
app.set('io', io);

// Track online users: { socketId -> { userId, teamIds[] } }
const onlineUsers = new Map();

// Socket.IO JWT auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(socket.id, { userId, teamIds: [] });

  // ── Join a team room ──────────────────────────────────────────────────────
  socket.on('join_team', async (teamId) => {
    try {
      const Team = require('./models/Team.model');
      const team = await Team.findById(teamId).select('members');
      if (!team) return socket.emit('error', { message: 'Team not found' });

      const isMember = team.members.some(m => m.user.toString() === userId);
      if (!isMember) return socket.emit('error', { message: 'Not a team member' });

      socket.join(`team:${teamId}`);
      const userData = onlineUsers.get(socket.id);
      if (userData && !userData.teamIds.includes(teamId)) {
        userData.teamIds.push(teamId);
      }

      // Broadcast online members list for this team
      const roomSockets = await io.in(`team:${teamId}`).fetchSockets();
      const onlineInTeam = [...new Set(roomSockets.map(s => s.userId))];
      io.to(`team:${teamId}`).emit('online_users', { teamId, users: onlineInTeam });
    } catch (err) {
      console.error('join_team error:', err.message);
    }
  });

  // ── Leave a team room ─────────────────────────────────────────────────────
  socket.on('leave_team', async (teamId) => {
    socket.leave(`team:${teamId}`);
    const roomSockets = await io.in(`team:${teamId}`).fetchSockets();
    const onlineInTeam = [...new Set(roomSockets.map(s => s.userId))];
    io.to(`team:${teamId}`).emit('online_users', { teamId, users: onlineInTeam });
  });

  // ── Send message ──────────────────────────────────────────────────────────
  socket.on('send_message', async ({ teamId, content }) => {
    try {
      if (!content?.trim()) return;

      const [Team, Message, User] = [
        require('./models/Team.model'),
        require('./models/Message.model'),
        require('./models/User.model'),
      ];

      const [team, user] = await Promise.all([
        Team.findById(teamId).select('members'),
        User.findById(userId).select('name avatar'),
      ]);

      if (!team || !user) return;
      if (!team.members.some(m => m.user.toString() === userId)) {
        return socket.emit('error', { message: 'Not a team member' });
      }

      const message = await Message.create({
        teamId,
        sender: userId,
        senderName: user.name,
        senderAvatar: user.avatar || '',
        content: content.trim(),
      });

      // Broadcast to all team members (including sender)
      io.to(`team:${teamId}`).emit('new_message', {
        _id:          message._id,
        teamId,
        sender:       userId,
        senderName:   user.name,
        senderAvatar: user.avatar || '',
        content:      message.content,
        createdAt:    message.createdAt,
        seenBy:       [],
      });
    } catch (err) {
      console.error('send_message error:', err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── Typing indicator ──────────────────────────────────────────────────────
  socket.on('typing_start', ({ teamId, userName }) => {
    socket.to(`team:${teamId}`).emit('user_typing', { userId, userName, teamId });
  });

  socket.on('typing_stop', ({ teamId }) => {
    socket.to(`team:${teamId}`).emit('user_stopped_typing', { userId, teamId });
  });

  // ── Project Chat ──────────────────────────────────────────────────────────
  socket.on('join_project_room', async (projectId) => {
    try {
      const Project = require('./models/Project.model');
      const project = await Project.findById(projectId).select('owner members');
      if (!project) return socket.emit('error', { message: 'Project not found' });

      const isOwner = project.owner.toString() === userId;
      const isMember = project.members.some(m => m.user.toString() === userId);
      if (!isOwner && !isMember) {
        return socket.emit('error', { message: 'Not authorized to join this project chat' });
      }

      socket.join(`project:${projectId}`);
      socket.emit('joined_project_room', { projectId });
    } catch (err) {
      console.error('join_project_room error:', err.message);
      socket.emit('error', { message: 'Failed to join project room' });
    }
  });

  socket.on('send_project_message', async ({ projectId, message }) => {
    try {
      if (!message?.trim()) return;

      const [Project, ProjectMessage, User] = [
        require('./models/Project.model'),
        require('./models/ProjectMessage.model'),
        require('./models/User.model'),
      ];

      const [project, user] = await Promise.all([
        Project.findById(projectId).select('owner members'),
        User.findById(userId).select('name avatar'),
      ]);

      if (!project || !user) return socket.emit('error', { message: 'Project or user not found' });

      const isOwner = project.owner.toString() === userId;
      const isMember = project.members.some(m => m.user.toString() === userId);
      if (!isOwner && !isMember) {
        return socket.emit('error', { message: 'Not authorized to send project messages' });
      }

      const chatMessage = await ProjectMessage.create({
        projectId,
        sender: userId,
        message: message.trim(),
      });

      const msgObj = chatMessage.toObject();
      msgObj.sender = {
        _id: user._id,
        name: user.name,
        avatar: user.avatar || '',
        profileImage: user.avatar || '',
      };

      // Broadcast to project room
      io.to(`project:${projectId}`).emit('receive_project_message', msgObj);
    } catch (err) {
      console.error('send_project_message error:', err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── Mark seen ─────────────────────────────────────────────────────────────
  socket.on('mark_seen', async ({ teamId }) => {
    try {
      const Message = require('./models/Message.model');
      await Message.updateMany(
        { teamId, 'seenBy.user': { $ne: userId } },
        { $push: { seenBy: { user: userId, seenAt: new Date() } } }
      );
      socket.to(`team:${teamId}`).emit('messages_seen', { userId, teamId });
    } catch (err) {
      console.error('mark_seen error:', err.message);
    }
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const userData = onlineUsers.get(socket.id);
    if (userData) {
      for (const teamId of userData.teamIds) {
        try {
          const roomSockets = await io.in(`team:${teamId}`).fetchSockets();
          const onlineInTeam = [...new Set(roomSockets.map(s => s.userId))];
          io.to(`team:${teamId}`).emit('online_users', { teamId, users: onlineInTeam });
        } catch (err) {
          console.error('disconnect broadcast error:', err.message);
        }
      }
      onlineUsers.delete(socket.id);
    }
  });
});

// ── Express middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Use 'combined' log format in production for better request auditing
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check (no DB required) ─────────────────────────────────────────────
// This endpoint must respond instantly so the frontend can detect whether
// the server is awake. It intentionally does NOT require dbReady.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: dbReady ? 'connected' : 'connecting',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── DB-ready guard ────────────────────────────────────────────────────────────
let dbReady = false;
app.use('/api', (req, res, next) => {
  // /api/health is excluded from the guard
  if (req.path === '/health') return next();
  if (!dbReady) {
    return res.status(503).json({
      success: false,
      message: 'Server is starting up. Please retry in a few seconds.',
      retryAfter: 3,
    });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth.routes'));
app.use('/api/users',           require('./routes/user.routes'));
app.use('/api/teams',           require('./routes/team.routes'));
app.use('/api/projects',        require('./routes/project.routes'));
app.use('/api/invitations',     require('./routes/invitation.routes'));
app.use('/api/notifications',   require('./routes/notification.routes'));
app.use('/api/recommendations', require('./routes/recommendation.routes'));
app.use('/api/chat',            require('./routes/chat.routes'));
app.use('/api/ai',              require('./routes/ai.routes'));

// /api/health — also responds with DB state for frontend probing
app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    db: dbReady ? 'connected' : 'connecting',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  // Never expose stack traces in production
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: isDev ? err.message : (err.message || 'Internal Server Error'),
    ...(isDev && { stack: err.stack }),
  });
});

// ── MongoDB connection ────────────────────────────────────────────────────────
const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Atlas M0 free tier: keep pool small to avoid exhausting connections
      maxPoolSize: 5,
      minPoolSize: 1,
      // How long to wait for a server selection before erroring
      serverSelectionTimeoutMS: 10000,
      // How long a socket can be idle before being closed
      socketTimeoutMS: 45000,
      // How long to wait for a connection to be established
      connectTimeoutMS: 10000,
      // Keep the connection alive during inactivity (Atlas sleeps connections after idle)
      heartbeatFrequencyMS: 10000,
    });
    dbReady = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection attempt ${attempt} failed: ${error.message}`);
    // Exponential backoff: 3s, 6s, 12s, capped at 30s
    const delay = Math.min(3000 * Math.pow(2, attempt - 1), 30000);
    console.log(`   Retrying in ${delay / 1000}s...`);
    setTimeout(() => connectDB(attempt + 1), delay);
  }
};

mongoose.connection.on('disconnected', () => {
  dbReady = false;
  console.warn('⚠️  MongoDB disconnected — requests will return 503 until reconnected');
});
mongoose.connection.on('reconnected', () => {
  dbReady = true;
  console.log('✅ MongoDB reconnected');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

connectDB();

// ── AI provider startup log ───────────────────────────────────────────────────
const hasGemini = !!process.env.GEMINI_API_KEY;
const hasGroq   = !!process.env.GROQ_API_KEY;
console.log(`🤖 AI providers: ${hasGemini ? '✅ Gemini (primary)' : '❌ Gemini (no key)'} | ${hasGroq ? '✅ Groq (fallback)' : '❌ Groq (no key)'}`);
if (!hasGemini && !hasGroq) console.warn('⚠️  No AI provider configured — AI features will fail');

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TeamForge Server + Socket.IO running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🏥 Health check: GET /health or GET /api/health`);
});

module.exports = { app, io };
