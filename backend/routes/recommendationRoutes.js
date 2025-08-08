const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getPythonRecommendations } = require('../controllers/recommendationController');

//router.post('/recommendTrips', authenticateToken, recommendationController.buildUserPreferenceProfile);
router.post('/python', authenticateToken, getPythonRecommendations);

module.exports = router;