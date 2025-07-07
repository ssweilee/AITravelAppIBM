const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Create a new trip
router.post('/create', authenticateToken, tripController.createTrip);

// Get current user's trips
router.get('/mine', authenticateToken, tripController.getUserTrips);

// Get all public trips
router.get('/', authenticateToken, tripController.getAllTrips);

// Get trips by specific user ID
router.get('/user/:userId', authenticateToken, tripController.getTripsByUserId);

// Get specific trip by ID
router.get('/:tripId', authenticateToken, tripController.getTripById);

// Update trip
router.put('/:tripId', authenticateToken, tripController.updateTrip);

// Delete trip
router.delete('/:tripId', authenticateToken, tripController.deleteTrip);
router.post('/:tripId/comment', authenticateToken, tripController.addTripComment);
router.get('/:tripId/comments', authenticateToken, tripController.getTripComments);


module.exports = router;