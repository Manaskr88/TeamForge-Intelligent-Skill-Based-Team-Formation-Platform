const Project = require('../models/Project.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const {
      title, description, category, requiredSkills, difficulty,
      deadline, maxTeamSize, tags, githubUrl, liveUrl, isHackathon, hackathonDetails
    } = req.body;

    const project = await Project.create({
      title, description, category,
      owner: req.user._id,
      requiredSkills: requiredSkills || [],
      difficulty: difficulty || 'intermediate',
      deadline,
      maxTeamSize: maxTeamSize || 5,
      tags: tags || [],
      githubUrl: githubUrl || '',
      liveUrl: liveUrl || '',
      isHackathon: isHackathon || false,
      hackathonDetails: hackathonDetails || {}
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { projects: project._id } });

    const populated = await Project.findById(project._id).populate('owner', 'name avatar email');

    res.status(201).json({ success: true, message: 'Project created successfully', project: populated });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const { category, difficulty, skills, search, isHackathon, page = 1, limit = 12 } = req.query;

    let query = { status: { $ne: 'cancelled' } };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (isHackathon !== undefined) query.isHackathon = isHackathon === 'true';
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.requiredSkills = { $in: skillsArray };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('owner', 'name avatar')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      projects,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name avatar email skills experienceLevel')
      .populate('team', 'name members status')
      .populate('applicants.user', 'name avatar skills experienceLevel');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Increment views
    project.views += 1;
    await project.save({ validateBeforeSave: false });

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (owner only)
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can update' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('owner', 'name avatar');

    res.json({ success: true, message: 'Project updated', project: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (owner only)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can delete' });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { projects: project._id } });
    await Project.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Apply to project
// @route   POST /api/projects/:id/apply
// @access  Private
const applyToProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const alreadyApplied = project.applicants.find(a => a.user.toString() === req.user._id.toString());
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'Already applied to this project' });
    }

    project.applicants.push({ user: req.user._id });
    await project.save();

    // Notify project owner
    await Notification.create({
      recipient: project.owner,
      sender: req.user._id,
      type: 'project-applied',
      title: 'New Project Application',
      message: `${req.user.name} applied to join your project "${project.title}"`,
      link: `/dashboard/projects/${project._id}`
    });

    res.json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get my projects
// @route   GET /api/projects/my
// @access  Private
const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject, applyToProject, getMyProjects };
