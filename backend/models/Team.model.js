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

// Virtual for member count — guard against undefined when partially populated
teamSchema.virtual('memberCount').get(function() {
  return Array.isArray(this.members) ? this.members.length : 0;
});

// Only apply virtuals when members field is present to avoid crashes on partial selects
teamSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Safe memberCount — never crash on partial population
    if (!Array.isArray(ret.members)) {
      delete ret.memberCount;
    }
    return ret;
  }
});

module.exports = mongoose.model('Team', teamSchema);
