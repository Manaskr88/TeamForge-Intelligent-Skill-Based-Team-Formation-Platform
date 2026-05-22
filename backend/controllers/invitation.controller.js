const Invitation = require('../models/Invitation.model');
const Team = require('../models/Team.model');
const User = require('../models/User.model');
const Notification = require('../models/Notification.model');

// @desc    Send invitation
// @route   POST /api/invitations
// @access  Private
const sendInvitation = async (req, res) => {
  try {
    const { to, team, project, type, message } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient (to) is required' });
    }

    // Check if invitation already exists
    const existing = await Invitation.findOne({
      from: req.user._id,
      to,
      ...(team && { team }),
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Invitation already sent' });
    }

    const invitation = await Invitation.create({
      from: req.user._id,
      to,
      ...(team && { team }),
      ...(project && { project }),
      type: type || 'team-invite',
      message: message || ''
    });

    // Notify recipient
    const teamDoc = team ? await Team.findById(team) : null;
    await Notification.create({
      recipient: to,
      sender: req.user._id,
      type: 'team-invite',
      title: 'Team Invitation',
      message: `${req.user.name} invited you to join ${teamDoc ? `"${teamDoc.name}"` : 'a team'}`,
      link: '/dashboard/invitations',
      data: { invitationId: invitation._id }
    });

    res.status(201).json({ success: true, message: 'Invitation sent', invitation });
  } catch (error) {
    console.error('Send invitation error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get my invitations (received)
// @route   GET /api/invitations
// @access  Private
const getMyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({
      to: req.user._id,
      status: 'pending'
    })
      .populate('from', 'name avatar email skills experienceLevel')
      .populate('team', 'name description projectType')
      .sort({ createdAt: -1 });

    res.json({ success: true, invitations });
  } catch (error) {
    console.error('Get invitations error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Respond to invitation
// @route   PUT /api/invitations/:id
// @access  Private
const respondToInvitation = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be accepted or rejected' });
    }

    const invitation = await Invitation.findById(req.params.id)
      .populate('from', 'name _id')
      .populate('team', 'name members maxMembers _id');

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }
    if (invitation.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invitation already responded to' });
    }

    invitation.status = status;
    await invitation.save();

    if (status === 'accepted' && invitation.team) {
      const team = await Team.findById(invitation.team._id);
      if (!team) {
        return res.status(404).json({ success: false, message: 'Team no longer exists' });
      }
      if (team.members.length >= team.maxMembers) {
        return res.status(400).json({ success: false, message: 'Team is full' });
      }

      const alreadyMember = team.members.find(
        m => m.user.toString() === req.user._id.toString()
      );
      if (!alreadyMember) {
        team.members.push({ user: req.user._id, role: 'member' });
        await team.save();
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { teams: team._id } });
      }

      await Notification.create({
        recipient: invitation.from._id,
        sender: req.user._id,
        type: 'invite-accepted',
        title: 'Invitation Accepted',
        message: `${req.user.name} accepted your invitation to join "${team.name}"`,
        link: `/dashboard/teams/${team._id}`
      });
    } else if (status === 'rejected') {
      await Notification.create({
        recipient: invitation.from._id,
        sender: req.user._id,
        type: 'invite-rejected',
        title: 'Invitation Declined',
        message: `${req.user.name} declined your team invitation`
      });
    }

    res.json({ success: true, message: `Invitation ${status}`, invitation });
  } catch (error) {
    console.error('Respond invitation error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// @desc    Get sent invitations
// @route   GET /api/invitations/sent
// @access  Private
const getSentInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ from: req.user._id })
      .populate('to', 'name avatar email')
      .populate('team', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, invitations });
  } catch (error) {
    console.error('Get sent invitations error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = { sendInvitation, getMyInvitations, respondToInvitation, getSentInvitations };
