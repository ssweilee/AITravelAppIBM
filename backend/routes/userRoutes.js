const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');
const { body, validationResult } = require('express-validator');

router.get('/profile', authenticateToken, userController.getUserProfile);
router.put('/:id/follow', authenticateToken, userController.followUser);
router.get('/:id', authenticateToken, userController.getSingleUser);
// get the saved posts of the user
router.get('/savedPosts', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId)
    .populate('savedPosts', 'content userId createdAt');
  res.json(user.savedPosts);
});

// Edit user profile route
//names, location, trips, reviews, bio, years on travel?,  picture?
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
       .optional()
       .trim()
       .isLength({ max: 100 })
       .withMessage('Bio must be 100 characters or less'),
     body('country').optional(),//make scroll down
     body('profilePicture').optional(),
     body('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
   ],
   async (req, res) => {
      console.log('Edit profile route - User ID:', req.params.id, 'Body:', req.body);
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
         res.status(200).json({ message: 'Profile updated successfully', data: result });
       } catch (error) {
         console.error('Edit profile route - Error:', error.message, error.stack);
         res.status(500).json({ message: 'Error updating profile', error: error.message });
       }
    }
  );

module.exports = router;