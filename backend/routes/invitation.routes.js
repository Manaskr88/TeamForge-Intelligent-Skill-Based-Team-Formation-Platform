const express = require('express');
const router = express.Router();
const {
  sendInvitation,
  getMyInvitations,
  respondToInvitation,
  getSentInvitations
} = require('../controllers/invitation.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// IMPORTANT: /sent must be defined BEFORE /:id
// otherwise Express matches "sent" as an :id param
router.get('/sent', getSentInvitations);
router.get('/', getMyInvitations);
router.post('/', sendInvitation);
router.put('/:id', respondToInvitation);

module.exports = router;
