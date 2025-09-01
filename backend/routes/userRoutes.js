const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

router.get('/followers-following', authenticateToken, userController.getFollowersAndFollowing);
router.get('/profile', authenticateToken, userController.getUserProfile);
router.get('/followings', authenticateToken, userController.getUserFollowings)
router.put('/:id/follow', authenticateToken, userController.followUser);
router.get('/:id', authenticateToken, userController.getSingleUser);
// get the saved posts of the user
router.get('/savedPosts', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId)
    .populate('savedPosts', 'content userId createdAt');
  res.json(user.savedPosts);
});
router.get('/:id/followers', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id)
      .populate('followers', 'firstName lastName profilePicture bio location')
      .populate('followings', 'firstName lastName profilePicture bio location');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      followers: user.followers,
      following: user.followings
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Error fetching followers', error: error.message });
  }
});

// Edit user profile route
router.put(
   '/edit/:id',
   authenticateToken,
   [
     body('firstName')
       .optional()
       .trim()
       .isLength({ min: 1, max: 50 })
       .withMessage('First name must be between 1 and 50 characters')
       .matches(/^[a-zA-Z\s]+$/)
       .withMessage('First name must contain only letters and spaces'),
     body('lastName')
       .optional()
       .trim()
       .isLength({ min: 1, max: 50 })
       .withMessage('Last name must be between 1 and 50 characters')
       .matches(/^[a-zA-Z\s]+$/)
       .withMessage('Last name must contain only letters and spaces'),
     body('bio')
       .optional(),
     body('location').optional(),
     body('profilePicture').optional(),
     body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
   ],
   async (req, res) => {
      console.log('[/api/users/edit/:id] route hit');
      console.log('Headers auth userId from token:', req.user?.userId);
      console.log('Edit profile route - User ID param:', req.params.id, 'Body:', req.body);
      const { id } = req.params;
      const userIdFromToken = req.user.userId;
  
      if (id !== userIdFromToken) {
        return res.status(403).json({ message: 'Unauthorized: You can only edit your own profile' });
      }
  
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
      }
  
      try {
         const updatedData = req.body;
         console.log('Edit profile route - Calling updateUserProfile with:', id, updatedData);
         const result = await userController.updateUserProfile(id, updatedData);
         if (!result) {
           return res.status(404).json({ message: 'User not found' });
         }
         res.status(200).json({ success: true, user: result });
       } catch (error) {
         console.error('Edit profile route - Error:', error.message, error.stack);
         res.status(500).json({ message: 'Error updating profile', error: error.message });
       }
    }
  );
router.put(
  '/edit',
  authenticateToken,
  async (req, res) => {
    const userId = req.user.userId;
    const updatedData = req.body;
    try {
      const result = await userController.updateUserProfile(userId, updatedData);
      if (!result) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ success: true, user: result });
    } catch (error) {
      res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
  }
);
router.put('/change-email', authenticateToken, userController.changeEmail);
router.put('/change-password', authenticateToken, userController.changePassword);

module.exports = router;