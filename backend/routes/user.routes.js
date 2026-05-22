const express = require('express');
const router = express.Router();
const {
  getUsers, getUserById, updateProfile, getDashboardStats
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static paths BEFORE dynamic /:id
router.get('/dashboard', getDashboardStats);
router.put('/profile', updateProfile);
router.get('/', getUsers);

// Dynamic paths after
router.get('/:id', getUserById);

module.exports = router;
