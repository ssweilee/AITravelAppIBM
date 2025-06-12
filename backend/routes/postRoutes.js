const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, postController.createPost);
router.get('/', authenticateToken, postController.getUserPosts);
router.get('/feed', authenticateToken, postController.getFeedPosts);
router.get('/:userId', authenticateToken, postController.getPostsByUserId);

module.exports = router