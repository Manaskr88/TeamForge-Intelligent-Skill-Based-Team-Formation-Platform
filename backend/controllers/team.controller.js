const Team = require('../models/Team.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

// @desc    Create team
// @route   POST /api/teams
// @access  Private
const createTeam = async (req, res) => {
  try {
    const { name, description, requiredSkills, projectType, maxMembers, tags, isPublic } = req.body;

    const team = await Team.create({
      name,
      description,
      leader: req.user._id,
      members: [{ user: req.user._id, role: 'leader' }],
      requiredSkills: requiredSkills || [],
      projectType: projectType || 'web-development',
      maxMembers: maxMembers || 5,
      tags: tags || [],
      isPublic: isPublic !== undefined ? isPublic : true
    });

    // Add team to user's teams
    await User.findByIdAndUpdate(req.user._id, { $push: { teams: team._id } });

    const populated = await Team.findById(team._id)
      .populate('leader', 'name avatar email')
      .populate('members.user', 'name avatar email skills');

    res.status(201).json({ success: true, message: 'Team created successfully', team: populated });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private
const getTeams = async (req, res) => {
  try {
    const { skills, projectType, status, search, page = 1, limit = 12 } = req.query;

    let query = { isPublic: true };
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.requiredSkills = { $in: skillsArray };
    }
    if (projectType) query.projectType = projectType;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Team.countDocuments(query);
    const teams = await Team.find(query)
      .populate('leader', 'name avatar')
      .populate('members.user', 'name avatar skills')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      teams,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get teams error:', error.message);
    res.status(500).json({ success: false, message: 'Server error', ...(process.env.NODE_ENV === 'development' && { error: error.message }) });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('leader', 'name avatar email skills experienceLevel')
      .populate('members.user', 'name avatar email skills experienceLevel availability')
      .populate('project', 'title category status');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (leader only)
const updateTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only team leader can update team' });
    }

    const updated = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('leader', 'name avatar')
      .populate('members.user', 'name avatar skills');

    res.json({ success: true, message: 'Team updated', team: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (leader only)
const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only team leader can delete team' });
    }

    // Remove team from all members
    const memberIds = team.members.map(m => m.user);
    await User.updateMany({ _id: { $in: memberIds } }, { $pull: { teams: team._id } });
    await Team.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private (leader only)
const removeMember = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only team leader can remove members' });
    }

    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Leader cannot remove themselves' });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();
    await User.findByIdAndUpdate(req.params.userId, { $pull: { teams: team._id } });

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Leave team
// @route   POST /api/teams/:id/leave
// @access  Private
const leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.leader.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Leader cannot leave. Transfer leadership or delete team.' });
    }

    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString());
    await team.save();
    await User.findByIdAndUpdate(req.user._id, { $pull: { teams: team._id } });

    res.json({ success: true, message: 'Left team successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get my teams
// @route   GET /api/teams/my
// @access  Private
const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('leader', 'name avatar')
      .populate('members.user', 'name avatar skills')
      .sort({ createdAt: -1 });

    res.json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createTeam, getTeams, getTeamById, updateTeam, deleteTeam, removeMember, leaveTeam, getMyTeams };
