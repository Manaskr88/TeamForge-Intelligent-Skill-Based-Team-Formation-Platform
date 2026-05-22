const express = require('express');
const router = express.Router();
const {
  createTeam, getTeams, getTeamById,
  updateTeam, deleteTeam, removeMember,
  leaveTeam, getMyTeams
} = require('../controllers/team.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static paths BEFORE dynamic /:id
router.get('/my', getMyTeams);
router.get('/', getTeams);
router.post('/', createTeam);

// Dynamic paths after
router.get('/:id', getTeamById);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/leave', leaveTeam);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
