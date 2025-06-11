const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const searchController = require('../controllers/searchController');

router.get('/', authenticateToken, searchController.search);

module.exports = router;