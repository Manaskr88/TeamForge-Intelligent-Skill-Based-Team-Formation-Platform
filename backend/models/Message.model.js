const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message too long']
  },
  messageType: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  },
  seenBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seenAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Compound index for efficient team message queries
messageSchema.index({ teamId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
