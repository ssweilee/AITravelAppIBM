const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const avatarController = require('../controllers/avatarController');
const { authenticateToken } = require('../middleware/authMiddleware');
const sharp = require('sharp');

const dir = './uploads/avatars';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

const compressAvatar = async (req, res, next) => {
  if (!req.file) {
    return next(); 
  }

  try {
    const originalPath = req.file.path;
    const oldFilename = req.file.filename;

    const newFilename = `${path.parse(oldFilename).name}.webp`;
    const newPath = path.join(dir, newFilename);

    await sharp(originalPath)
        .resize(512, 512, { fit: 'cover' }) 
        .webp({ quality: 80 })              
        .toFile(newPath);

    fs.unlinkSync(originalPath);
    
    req.file.filename = newFilename;
    req.file.path = newPath;
    req.file.mimetype = 'image/webp';

    next(); 

  } catch (error) {
    console.error("Image compression error:", error);
    return res.status(500).json({ message: "Failed to process the uploaded image." });
  }
};

router.post(
  '/upload-avatar',
  authenticateToken,
  upload.single('avatar'),
  compressAvatar,
  avatarController.uploadAvatar
);



module.exports = router;