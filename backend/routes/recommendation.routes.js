const express = require('express');
const router = express.Router();
const { getRecommendedTeammates, getCompatibilityScore } = require('../controllers/recommendation.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/teammates', getRecommendedTeammates);
router.get('/compatibility/:userId', getCompatibilityScore);

module.exports = router;
