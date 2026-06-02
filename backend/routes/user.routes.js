const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const {
  getUsers, getUserById, updateProfile, getDashboardStats, uploadAvatar,
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

// ── Multer config ─────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads/profile-images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png, webp allowed'));
    }
  },
});

router.use(protect);

// Static routes BEFORE dynamic /:id
router.get('/dashboard',     getDashboardStats);
router.put('/profile',       updateProfile);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);
router.get('/',              getUsers);

// Dynamic
router.get('/:id', getUserById);

module.exports = router;
