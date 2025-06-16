const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, chatController.getOrCreateChat);
router.get('/', authenticateToken, chatController.getUserChats);
router.post('/group', authenticateToken, chatController.createGroupChat);
router.get('/:chatId', authenticateToken, chatController.getChatById);
router.post('/:chatId/leave', authenticateToken, chatController.leaveGroupChat);

module.exports = router;