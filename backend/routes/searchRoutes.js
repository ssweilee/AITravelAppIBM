const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

router.get('/users', authenticateToken, searchController.searchUsers);
router.get('/posts', authenticateToken, searchController.searchPosts);
router.get('/itineraries', authenticateToken, searchController.searchItineraries);

module.exports = router;