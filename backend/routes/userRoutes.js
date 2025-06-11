const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

router.get('/profile', authenticateToken, userController.getUserProfile);
router.put('/:id/follow', authenticateToken, userController.followUser);
router.get('/:id', authenticateToken, userController.getSingleUser);

module.exports = router;