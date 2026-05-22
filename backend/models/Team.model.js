const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Team description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  requiredSkills: [{
    type: String,
    trim: true
  }],
  projectType: {
    type: String,
    enum: ['web-development', 'ai-ml', 'app-development', 'blockchain', 'cybersecurity', 'open-source', 'other'],
    default: 'web-development'
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: 2,
    max: 20
  },
  status: {
    type: String,
    enum: ['recruiting', 'active', 'completed', 'paused'],
    default: 'recruiting'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

teamSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);
