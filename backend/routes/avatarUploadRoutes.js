const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const avatarController = require('../controllers/avatarController');

const dir = './uploads/avatars';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

const { authenticateToken } = require('../middleware/authMiddleware');
router.post(
  '/upload-avatar',
  authenticateToken,
  upload.single('avatar'),
  avatarController.uploadAvatar
);
console.log('>>> avatarController:', avatarController);


module.exports = router;
