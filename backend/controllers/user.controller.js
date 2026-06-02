const User = require('../models/User.model');
const Team = require('../models/Team.model');
const Project = require('../models/Project.model');

// @desc    Get all users (with filters)
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { skills, experience, availability, search, page = 1, limit = 12 } = req.query;

    let query = { _id: { $ne: req.user._id } };

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillsArray };
    }
    if (experience) query.experienceLevel = experience;
    if (availability) query.availability = availability;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teams', 'name description status projectType')
      .populate('projects', 'title category status difficulty');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const {
      name, bio, skills, experienceLevel, availability,
      github, linkedin, website, location, role, avatar
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (experienceLevel) updateData.experienceLevel = experienceLevel;
    if (availability) updateData.availability = availability;
    if (github !== undefined) updateData.github = github;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (role) updateData.role = role;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true, returnDocument: 'after' }
    ).select('-password');

    res.json({ success: true, message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [teamsCount, projectsCount, user] = await Promise.all([
      Team.countDocuments({ 'members.user': userId }),
      Project.countDocuments({ $or: [{ owner: userId }, { 'applicants.user': userId }] }),
      User.findById(userId).populate('teams', 'name status projectType members').populate('projects', 'title status category')
    ]);

    const activeTeams = await Team.find({ 'members.user': userId, status: { $in: ['active', 'recruiting'] } })
      .populate('leader', 'name avatar')
      .populate('members.user', 'name avatar')
      .limit(5);

    const recentProjects = await Project.find({
      $or: [{ owner: userId }, { 'applicants.user': userId }]
    })
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        teamsCount,
        projectsCount,
        skillsCount: user.skills.length,
        completedProjects: user.completedProjects
      },
      activeTeams,
      recentProjects,
      user
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, getUserById, updateProfile, getDashboardStats, uploadAvatar };

// ── Upload avatar ─────────────────────────────────────────────────────────────
async function uploadAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const avatarUrl   = `${BACKEND_URL}/uploads/profile-images/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: avatarUrl } },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Avatar uploaded', avatar: avatarUrl, user });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
}
