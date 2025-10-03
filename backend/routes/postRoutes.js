const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireOwnership } = require('../utils/ownership');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

router.post('/', authenticateToken, postController.createPost);
router.get('/', authenticateToken, postController.getUserPosts);
//router.get('/:userId', authenticateToken, postController.getPostsByUserId);
router.get('/feed', authenticateToken, postController.getFeedPosts);
router.get('/user/:userId', authenticateToken, postController.getPostsByUserId);
router.get('/:postId', authenticateToken, postController.getPostById);
router.post('/:postId/comment', authenticateToken, postController.addComment);
router.get('/:postId/comments', authenticateToken, postController.getCommentsForPost);
router.delete('/:postId/comment/:commentId', authenticateToken,requireOwnership(Comment,'commentId','userId'), postController.deleteComment);
router.delete('/:postId', authenticateToken,requireOwnership(Post, 'postId', 'userId'), postController.deletePost);

module.exports = router