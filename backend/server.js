const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DB-ready guard ────────────────────────────────────────────────────────────
// Reject API calls that need the DB while connection is still pending
let dbReady = false;

app.use('/api', (req, res, next) => {
  // Health check always passes
  if (req.path === '/health') return next();
  if (!dbReady) {
    return res.status(503).json({
      success: false,
      message: 'Database connecting, please retry in a moment.',
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

// Health check (bypasses DB guard above)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    db: dbReady ? 'connected' : 'connecting',
    timestamp: new Date(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler — logs the REAL error message
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Database connection ───────────────────────────────────────────────────────
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
    console.error('   Check your MONGODB_URI in .env');
    // Retry after 5 s instead of crashing
    console.log('🔄 Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

// Handle connection drops after initial connect
mongoose.connection.on('disconnected', () => {
  dbReady = false;
  console.warn('⚠️  MongoDB disconnected — reconnecting...');
});
mongoose.connection.on('reconnected', () => {
  dbReady = true;
  console.log('✅ MongoDB reconnected');
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TeamForge Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
