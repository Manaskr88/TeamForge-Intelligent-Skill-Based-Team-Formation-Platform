const User    = require('../models/User.model');
const Team    = require('../models/Team.model');
const Project = require('../models/Project.model');

// ── GET /api/users ─────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { skills, experience, availability, search, page = 1, limit = 12 } = req.query;
    let query = { _id: { $ne: req.user._id } };

    if (skills)       query.skills          = { $in: skills.split(',').map(s => s.trim()) };
    if (experience)   query.experienceLevel = experience;
    if (availability) query.availability    = availability;
    if (search) {
      query.$or = [
        { name:   { $regex: search, $options: 'i' } },
        { bio:    { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true, users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), limit: parseInt(limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/users/:id ─────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teams',    'name description status projectType')
      .populate('projects', 'title category status difficulty');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── PUT /api/users/profile ─────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, experienceLevel, availability, github, linkedin, website, location, role, avatar } = req.body;

    const updateData = {};
    if (name)                   updateData.name            = name;
    if (bio !== undefined)      updateData.bio             = bio;
    if (skills)                 updateData.skills          = skills;
    if (experienceLevel)        updateData.experienceLevel = experienceLevel;
    if (availability)           updateData.availability    = availability;
    if (github !== undefined)   updateData.github          = github;
    if (linkedin !== undefined) updateData.linkedin        = linkedin;
    if (website !== undefined)  updateData.website         = website;
    if (location !== undefined) updateData.location        = location;
    if (role)                   updateData.role            = role;
    if (avatar !== undefined)   updateData.avatar          = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── GET /api/users/dashboard ───────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find team-linked projects for this user
    const userTeams = await Team.find({ 'members.user': userId }).select('project').lean();
    const teamProjectIds = userTeams.filter(t => t.project).map(t => t.project);

    const projectQuery = {
      $or: [
        { owner: userId },
        { 'joinRequests.user': userId },
        { 'applicants.user': userId }, // Keep applicants.user check for backward compatibility with old seeds
        { _id: { $in: teamProjectIds } },
      ]
    };

    const [teamsCount, projectsCount, user] = await Promise.all([
      Team.countDocuments({ 'members.user': userId }),
      Project.countDocuments(projectQuery),
      User.findById(userId)
        .populate('teams',    'name status projectType members')
        .populate('projects', 'title status category'),
    ]);

    const [activeTeams, recentProjects] = await Promise.all([
      Team.find({ 'members.user': userId, status: { $in: ['active', 'recruiting'] } })
        .populate('leader',       'name avatar')
        .populate('members.user', 'name avatar')
        .limit(5),
      Project.find(projectQuery)
        .populate('owner', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      stats: {
        teamsCount,
        projectsCount,
        skillsCount:       user.skills.length,
        completedProjects: user.completedProjects,
      },
      activeTeams,
      recentProjects,
      user,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/users/upload-avatar ─────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Cloudinary multer-storage-cloudinary puts the secure URL in req.file.path
    const avatarUrl = req.file.path;

    if (!avatarUrl || !avatarUrl.startsWith('https://')) {
      return res.status(500).json({ success: false, message: 'Cloudinary upload failed — check CLOUDINARY_* env vars' });
    }

    // Delete old Cloudinary image if one exists
    const currentUser = await User.findById(req.user._id).select('avatar');
    if (currentUser?.avatar && currentUser.avatar.includes('cloudinary.com')) {
      const { deleteCloudinaryImage } = require('../config/cloudinary');
      await deleteCloudinaryImage(currentUser.avatar);
    }

    // Save new Cloudinary URL to DB
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Avatar uploaded', avatar: avatarUrl, user });
  } catch (err) {
    console.error('Upload avatar error:', err.message);
    const msg = err.message || ''
    res.status(500).json({
      success: false,
      message: msg.includes('API key') || msg.includes('Invalid')
        ? 'Cloudinary credentials invalid — check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env'
        : 'Upload failed: ' + msg
    });
  }
};

module.exports = { getUsers, getUserById, updateProfile, getDashboardStats, uploadAvatar };
