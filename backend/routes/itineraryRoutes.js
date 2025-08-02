const express = require('express');
const router = express.Router();
const itineraryController = require('../controllers/itineraryController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireOwnership } = require('../utils/ownership');
const Itinerary = require('../models/Itinerary');

router.post('/create', authenticateToken, itineraryController.createItinerary);
router.get('/mine', authenticateToken, itineraryController.getUserItineraries);
router.get('/:id', authenticateToken, itineraryController.getItinerariesByUserId);
router.get('/detail/:itineraryId', authenticateToken, itineraryController.getItineraryById);
router.delete('/:itineraryId', authenticateToken, requireOwnership(Itinerary,'itineraryId', 'createdBy'), itineraryController.deleteItinerary);

module.exports = router;