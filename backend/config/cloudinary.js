const cloudinary            = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer                = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage that uploads directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'teamforge/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png, webp images are allowed'));
    }
  },
});

/**
 * Delete an image from Cloudinary by its URL.
 * Extracts the public_id from the URL and calls destroy().
 */
async function deleteCloudinaryImage(url) {
  if (!url || !url.includes('cloudinary.com')) return;
  try {
    // Extract public_id — everything after /upload/vXXXX/ up to (not including) extension
    const parts    = url.split('/');
    const uploadIdx = parts.findIndex(p => p === 'upload');
    if (uploadIdx === -1) return;
    // Skip version segment (v12345) if present
    let startIdx = uploadIdx + 1;
    if (/^v\d+$/.test(parts[startIdx])) startIdx++;
    const publicIdWithExt = parts.slice(startIdx).join('/');
    const publicId        = publicIdWithExt.replace(/\.[^.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Cloudinary delete warning:', err.message);
  }
}

module.exports = { cloudinary, upload, deleteCloudinaryImage };
