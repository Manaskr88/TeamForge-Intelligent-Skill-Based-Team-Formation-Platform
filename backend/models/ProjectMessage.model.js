const mongoose = require('mongoose');

const projectMessageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

projectMessageSchema.index({ projectId: 1, createdAt: 1 });

module.exports = mongoose.model('ProjectMessage', projectMessageSchema);
