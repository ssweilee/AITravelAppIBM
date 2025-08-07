const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/recommendTrips', authenticateToken, recommendationController.buildUserPreferenceProfile);

module.exports = router;