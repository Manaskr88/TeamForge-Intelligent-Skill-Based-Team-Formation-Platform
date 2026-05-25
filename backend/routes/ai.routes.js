const express     = require('express');
const rateLimit   = require('express-rate-limit');
const router      = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  chatAssistant,
  generateIdea,
  saveIdea,
  getSavedIdeas,
  deleteSavedIdea,
  skillGapAnalysis,
  aiTeamRecommendations,
} = require('../controllers/ai.controller');

// Rate limiter — 20 AI requests per user per minute
// keyGenerator uses userId (not IP) so IPv6 validation is irrelevant
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  // Always key by authenticated user ID — never falls back to IP
  keyGenerator: (req) => String(req.user?._id || 'anon'),
  skip: (req) => !req.user,          // skip if somehow unauthenticated (protect handles that)
  validate: false,                   // disable all built-in validations (we key by userId, not IP)
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(protect);
router.use(aiLimiter);

// Feature 1 — Team Chat AI
router.post('/chat', chatAssistant);

// Feature 2 — Hackathon Idea Generator
router.post('/generate-idea',     generateIdea);
router.post('/save-idea',         saveIdea);
router.get('/saved-ideas',        getSavedIdeas);
router.delete('/saved-ideas/:id', deleteSavedIdea);

// Feature 3 — Skill Gap Analyzer
router.post('/skill-gap-analysis', skillGapAnalysis);

// Feature 4 — AI Team Recommendations
router.post('/team-recommendations', aiTeamRecommendations);

module.exports = router;
