exports.uploadAvatar = (req, res) => {
   if (!req.file) {
     return res.status(400).json({ message: 'No file uploaded' });
   }
 
   const profilePicture = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
   return res.json({ success: true, profilePicture: profilePicture });
 };
 