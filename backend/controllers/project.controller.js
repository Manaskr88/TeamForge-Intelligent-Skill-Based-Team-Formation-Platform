const Project = require('../models/Project.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');
const ProjectMessage = require('../models/ProjectMessage.model');

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
      .populate('owner', 'name avatar email skills experienceLevel availability')
      .populate('team', 'name members status')
      .populate('members.user', 'name avatar skills experienceLevel availability isOnline')
      .populate('joinRequests.user', 'name avatar skills experienceLevel availability');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Increment views without a full save round-trip (no validation overhead)
    Project.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })
      .catch((err) => console.error('view increment error:', err.message));

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

// @desc    Apply to project (Legacy)
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

// @desc    Get my projects (owned + joined via team membership + join requests)
// @route   GET /api/projects/my
// @access  Private
const getMyProjects = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all teams the user is a member of
    const userTeams = await require('../models/Team.model')
      .find({ 'members.user': userId })
      .select('project')
      .lean();

    const teamProjectIds = userTeams
      .filter(t => t.project)
      .map(t => t.project);

    // Return projects the user owns OR is a member of via team OR has requested to join
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { _id:   { $in: teamProjectIds } },
        { 'joinRequests.user': userId },
        { 'applicants.user': userId },
      ]
    })
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (error) {
    console.error('getMyProjects error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Request to join project
// @route   POST /api/projects/:projectId/request-join
// @access  Private
const requestJoinProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = req.user._id;

    // Rule: Prevent owner requesting to join own project
    if (project.owner.toString() === userId.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request to join your own project' });
    }

    // Rule: Prevent existing members requesting again
    const isMember = project.members.some(m => m.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({ success: false, message: 'You are already a member of this project' });
    }

    // Rule: Prevent duplicate pending requests / Control rejected requests
    const existingRequest = project.joinRequests.find(r => r.user.toString() === userId.toString());
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ success: false, message: 'You already have a pending join request' });
      }
      if (existingRequest.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Your join request was already accepted' });
      }
      if (existingRequest.status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Your request to join this project was rejected. You cannot submit another request.'
        });
      }
    }

    project.joinRequests.push({
      user: userId,
      status: 'pending',
      requestedAt: new Date()
    });

    await project.save();

    // Notify project owner
    await Notification.create({
      recipient: project.owner,
      sender: userId,
      type: 'project-applied',
      title: 'Project Join Request',
      message: `${req.user.name} requested to join ${project.title}.`,
      link: `/dashboard/projects/${project._id}`
    });

    res.status(201).json({ success: true, message: 'Join request sent successfully' });
  } catch (error) {
    console.error('Request join project error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get join requests
// @route   GET /api/projects/:projectId/join-requests
// @access  Private (Owner only)
const getJoinRequests = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('joinRequests.user', 'name avatar skills experienceLevel availability');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Rule: Only project owner can view requests
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can view join requests' });
    }

    res.json({ success: true, joinRequests: project.joinRequests || [] });
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Accept join request
// @route   PATCH /api/projects/:projectId/join-requests/:requestId/accept
// @access  Private (Owner only)
const acceptJoinRequest = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Rule: Only project owner can accept
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can accept requests' });
    }

    const joinReq = project.joinRequests.find(r => r._id.toString() === req.params.requestId.toString());
    if (!joinReq) return res.status(404).json({ success: false, message: 'Join request not found' });

    if (joinReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${joinReq.status}` });
    }

    // Update request status
    joinReq.status = 'accepted';
    joinReq.respondedAt = new Date();

    // Add to members
    project.members.push({
      user: joinReq.user,
      role: 'member',
      joinedAt: new Date()
    });

    await project.save();

    // Add project to user's joined projects
    await User.findByIdAndUpdate(joinReq.user, { $addToSet: { projects: project._id } });

    // Create notification for applicant
    await Notification.create({
      recipient: joinReq.user,
      sender: req.user._id,
      type: 'application-accepted',
      title: 'Join Request Accepted',
      message: `Your request to join ${project.title} was accepted.`,
      link: `/dashboard/projects/${project._id}`
    });

    res.json({ success: true, message: 'Request accepted successfully' });
  } catch (error) {
    console.error('Accept join request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reject join request
// @route   PATCH /api/projects/:projectId/join-requests/:requestId/reject
// @access  Private (Owner only)
const rejectJoinRequest = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Rule: Only project owner can reject
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only project owner can reject requests' });
    }

    const joinReq = project.joinRequests.find(r => r._id.toString() === req.params.requestId.toString());
    if (!joinReq) return res.status(404).json({ success: false, message: 'Join request not found' });

    if (joinReq.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${joinReq.status}` });
    }

    // Update request status
    joinReq.status = 'rejected';
    joinReq.respondedAt = new Date();

    await project.save();

    // Create notification for applicant
    await Notification.create({
      recipient: joinReq.user,
      sender: req.user._id,
      type: 'application-rejected',
      title: 'Join Request Rejected',
      message: `Your request to join ${project.title} was rejected.`,
      link: `/dashboard/projects/${project._id}`
    });

    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get project members
// @route   GET /api/projects/:projectId/members
// @access  Private
const getProjectMembers = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('members.user', 'name avatar skills experienceLevel availability isOnline');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    res.json({ success: true, members: project.members || [] });
  } catch (error) {
    console.error('Get project members error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get project chat messages
// @route   GET /api/projects/:projectId/chat
// @access  Private (Owner and members only)
const getProjectChatMessages = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = req.user._id;
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(m => m.user.toString() === userId.toString());

    // Security check: Only owner or member can access project chat
    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view this project chat' });
    }

    const messages = await ProjectMessage.find({ projectId: req.params.projectId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.sender) {
        msgObj.sender.profileImage = msgObj.sender.avatar;
      }
      return msgObj;
    });

    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('Get project chat messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Send project chat message
// @route   POST /api/projects/:projectId/chat
// @access  Private (Owner and members only)
const sendProjectChatMessage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = req.user._id;
    const isOwner = project.owner.toString() === userId.toString();
    const isMember = project.members.some(m => m.user.toString() === userId.toString());

    // Security check: Only owner or member can send message
    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to send messages to this project chat' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const chatMessage = await ProjectMessage.create({
      projectId: req.params.projectId,
      sender: userId,
      message: message.trim()
    });

    const populated = await ProjectMessage.findById(chatMessage._id).populate('sender', 'name avatar');
    const msgObj = populated.toObject();
    if (msgObj.sender) {
      msgObj.sender.profileImage = msgObj.sender.avatar;
    }

    res.status(201).json({ success: true, message: msgObj });
  } catch (error) {
    console.error('Send project chat message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  applyToProject,
  getMyProjects,
  requestJoinProject,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
  getProjectMembers,
  getProjectChatMessages,
  sendProjectChatMessage
};
