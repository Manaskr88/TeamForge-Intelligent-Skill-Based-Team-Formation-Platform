const User = require('../models/User.model');
const { generateToken } = require('../middleware/auth.middleware');
const Notification = require('../models/Notification.model');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, skills, experienceLevel, availability } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'developer',
      skills: skills || [],
      experienceLevel: experienceLevel || 'beginner',
      availability: availability || 'part-time'
    });

    // Create welcome notification
    await Notification.create({
      recipient: user._id,
      type: 'system',
      title: 'Welcome to TeamForge!',
      message: `Hey ${user.name}! Your account is ready. Start by completing your profile and exploring teams.`,
      link: '/dashboard/profile'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        experienceLevel: user.experienceLevel,
        availability: user.availability,
        avatar: user.avatar,
        bio: user.bio,
        github: user.github,
        linkedin: user.linkedin
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    // Surface validation errors (e.g. duplicate email race condition)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        experienceLevel: user.experienceLevel,
        availability: user.availability,
        avatar: user.avatar,
        bio: user.bio,
        github: user.github,
        linkedin: user.linkedin,
        location: user.location,
        website: user.website
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('teams', 'name description status')
      .populate('projects', 'title category status');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date()
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { register, login, getMe, logout };

// ── Google OAuth ──────────────────────────────────────────────────────────────
// POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: 'Google OAuth not configured on server' });
    }

    // Verify Google token
    const ticket  = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Unable to get email from Google account' });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

    if (user) {
      // Update google fields if user registered with email/password previously
      if (!user.googleId) {
        user.googleId  = googleId;
        user.provider  = 'google';
        if (!user.avatar && picture) user.avatar = picture;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user from Google data
      user = await User.create({
        name,
        email:           email.toLowerCase(),
        googleId,
        provider:        'google',
        avatar:          picture || '',
        password:        `google_oauth_${googleId}_${Date.now()}`, // placeholder — never used
        role:            'developer',
        skills:          [],
        experienceLevel: 'beginner',
        availability:    'part-time',
        bio:             '',
        isVerified:      true,
      });

      await Notification.create({
        recipient: user._id,
        type:      'system',
        title:     'Welcome to TeamForge!',
        message:   `Hey ${user.name}! Your account is ready. Start by completing your profile and exploring teams.`,
        link:      '/dashboard/profile',
      });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: {
        _id:             user._id,
        name:            user.name,
        email:           user.email,
        role:            user.role,
        skills:          user.skills,
        experienceLevel: user.experienceLevel,
        availability:    user.availability,
        avatar:          user.avatar,
        bio:             user.bio,
        github:          user.github,
        linkedin:        user.linkedin,
        provider:        user.provider,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
      ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
  }
};

module.exports = { register, login, getMe, logout, googleAuth };
