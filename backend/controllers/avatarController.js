/*
exports.uploadAvatar = (req, res) => {
   if (!req.file) {
     return res.status(400).json({ message: 'No file uploaded' });
   }
 
   const profilePicture = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
   return res.json({ success: true, profilePicture: profilePicture });
 };
 */

 // controllers/avatarController.js
const User = require('../models/User');

exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const profilePicture = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
  try {
    const user = await User.findById(req.user.userId);
    user.profilePicture = profilePicture;
    await user.save();
    res.json({ success: true, profilePicture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not save avatar' });
  }
};