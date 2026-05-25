const express = require('express');
const router  = express.Router();
const {
  getRecommendedTeammates,
  getTeamRecommendations,
  getCompatibilityScore,
} = require('../controllers/recommendation.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static routes BEFORE dynamic
router.get('/teammates',          getRecommendedTeammates);   // For Me
router.get('/team/:teamId',       getTeamRecommendations);    // For Team
router.get('/compatibility/:userId', getCompatibilityScore);

module.exports = router;
