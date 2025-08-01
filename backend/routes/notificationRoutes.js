// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

// GET /api/notifications
router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateToken, notificationController.markAsRead);

// POST /api/notifications/clear
router.post('/clear', authenticateToken, notificationController.clearNotifications);
router.post('/clear-all', authenticateToken, notificationController.deleteAllNotifications); // new delete-all

// DELETE /api/notifications/:id
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

module.exports = router;