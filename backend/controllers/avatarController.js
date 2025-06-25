const sharp = require('sharp');
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const outputPath = `uploads/avatars/${Date.now()}-${req.file.originalname.split('.')[0]}.webp`;
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    // Delete original file
    fs.unlinkSync(req.file.path);

    const profilePicture = `${req.protocol}://${req.get('host')}/${outputPath}`;
    return res.json({ success: true, profilePicture });
  } catch (error) {
    console.error('[DEBUG] uploadAvatar: Error processing image:', error.message);
    return res.status(500).json({ message: 'Failed to process image' });
  }
};