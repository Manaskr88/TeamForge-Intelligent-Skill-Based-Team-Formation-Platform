const express  = require('express');
const router   = express.Router();
const { upload } = require('../config/cloudinary');
const {
  getUsers, getUserById, updateProfile, getDashboardStats, uploadAvatar,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static routes BEFORE dynamic /:id
router.get('/dashboard',      getDashboardStats);
router.put('/profile',        updateProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);
router.get('/',               getUsers);

// Dynamic
router.get('/:id', getUserById);

module.exports = router;
