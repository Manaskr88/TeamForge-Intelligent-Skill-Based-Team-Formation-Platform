const Message = require('../models/Message.model');
const Team    = require('../models/Team.model');

// Helper — verify user is a team member
const isMember = (team, userId) =>
  team.members.some(m => m.user.toString() === userId.toString());

// @desc  Get messages for a team (paginated)
// @route GET /api/chat/:teamId/messages
const getMessages = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const team = await Team.findById(teamId).select('members');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!isMember(team, req.user._id))
      return res.status(403).json({ success: false, message: 'Not a team member' });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Message.countDocuments({ teamId });

    const messages = await Message.find({ teamId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, messages, total, page: parseInt(page) });
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// @desc  Send a message (REST fallback — primary path is Socket.IO)
// @route POST /api/chat/:teamId/messages
const sendMessage = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { content } = req.body;

    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Message content required' });

    const team = await Team.findById(teamId).select('members');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (!isMember(team, req.user._id))
      return res.status(403).json({ success: false, message: 'Not a team member' });

    const message = await Message.create({
      teamId,
      sender: req.user._id,
      senderName: req.user.name,
      senderAvatar: req.user.avatar || '',
      content: content.trim()
    });

    res.status(201).json({ success: true, message });
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// @desc  Mark messages as seen
// @route PUT /api/chat/:teamId/seen
const markSeen = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user._id;

    await Message.updateMany(
      { teamId, 'seenBy.user': { $ne: userId } },
      { $push: { seenBy: { user: userId, seenAt: new Date() } } }
    );

    res.json({ success: true, message: 'Marked as seen' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getMessages, sendMessage, markSeen };
