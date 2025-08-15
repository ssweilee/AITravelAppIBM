const User = require('../models/User'); 

exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const userId = req.user.id; 
    const filename = req.file.filename;

    const relativePath = `/uploads/avatars/${filename}`;
    await User.findByIdAndUpdate(userId, { profilePicture: relativePath });

    res.json({ success: true, profilePicture: relativePath });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
