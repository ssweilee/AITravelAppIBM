const User = require('../models/User'); 

exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const userId = req.user.id; 
    const filename = req.file.filename;

    
    await User.findByIdAndUpdate(userId, { profilePicture: filename });

    const fullUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${filename}`;

    return res.json({ 
      success: true, 
      profilePicture: filename, 
      profilePictureUrl: fullUrl 
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
