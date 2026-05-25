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

const app    = express();
const server = http.createServer(app);

// ── CORS origins ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
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
        const roomSockets = await io.in(`team:${teamId}`).fetchSockets();
        const onlineInTeam = [...new Set(roomSockets.map(s => s.userId))];
        io.to(`team:${teamId}`).emit('online_users', { teamId, users: onlineInTeam });
      }
      onlineUsers.delete(socket.id);
    }
  });
});

// ── Express middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DB-ready guard ────────────────────────────────────────────────────────────
let dbReady = false;
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!dbReady) return res.status(503).json({ success: false, message: 'Database connecting, please retry.' });
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

app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', db: dbReady ? 'connected' : 'connecting', timestamp: new Date() })
);

// ── Error handlers ────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── MongoDB ───────────────────────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    dbReady = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => { dbReady = false; console.warn('⚠️  MongoDB disconnected'); });
mongoose.connection.on('reconnected',  () => { dbReady = true;  console.log('✅ MongoDB reconnected'); });

connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TeamForge Server + Socket.IO running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };
