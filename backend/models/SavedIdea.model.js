const mongoose = require('mongoose');

const savedIdeaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  projectName:    { type: String, required: true },
  tagline:        { type: String, default: '' },
  domain:         { type: String, default: '' },
  theme:          { type: String, default: '' },
  techStack:      [{ type: String }],
  coreFeatures:   [{ type: String }],
  problemStatement: { type: String, default: '' },
  solution:       { type: String, default: '' },
  uniqueSellingPoint: { type: String, default: '' },
  fullData:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('SavedIdea', savedIdeaSchema);
