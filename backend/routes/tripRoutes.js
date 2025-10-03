const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireOwnership } = require('../utils/ownership');
const Trip = require('../models/Trip');
const Comment = require('../models/Comment');

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
router.delete('/:tripId', authenticateToken,requireOwnership(Trip,'tripId','userId'), tripController.deleteTrip);
router.post('/:tripId/comment', authenticateToken, tripController.addTripComment);
router.get('/:tripId/comments', authenticateToken, tripController.getTripComments);
router.delete('/:tripId/comment/:commentId', authenticateToken, requireOwnership(Comment, 'commentId', 'userId'), tripController.deleteTripComment);


module.exports = router;