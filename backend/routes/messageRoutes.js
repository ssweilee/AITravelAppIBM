const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

router.get('/:chatId', authenticateToken, messageController.getMessagesForChat);
router.post('/:chatId', authenticateToken, messageController.sendMessage);
router.post('/:chatId/share', authenticateToken, messageController.shareContent);




module.exports = router;