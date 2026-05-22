const express = require('express');
const router  = express.Router();
const { getMessages, sendMessage, markSeen } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/:teamId/messages',  getMessages);
router.post('/:teamId/messages', sendMessage);
router.put('/:teamId/seen',      markSeen);

module.exports = router;
