const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, itineraryController.createItinerary);
router.get('/mine', authenticateToken, itineraryController.getUserItineraries);
router.get('/:id', authenticateToken, itineraryController.getItinerariesByUserId);

module.exports = router;