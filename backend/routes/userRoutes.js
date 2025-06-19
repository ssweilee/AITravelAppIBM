const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/profile', authenticateToken, userController.getUserProfile);
router.put('/:id/follow', authenticateToken, userController.followUser);
router.get('/:id', authenticateToken, userController.getSingleUser);
// get the saved posts of the user
router.get('/savedPosts', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId)
    .populate('savedPosts', 'content userId createdAt');
  res.json(user.savedPosts);
});

module.exports = router;