// routes/tripRoutes.js
const express               = require('express');
const router                = express.Router();
const tc                    = require('../controllers/tripController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.route('/')
  .get(authenticateToken, tc.getTrips)
  .post(authenticateToken, tc.createTrip);

router.route('/:id')
  .get(authenticateToken, tc.getTripById)
  .put(authenticateToken, tc.updateTrip)
  .delete(authenticateToken, tc.deleteTrip);

// ── Comments ────────────────────────────────────────────────
router.route('/:id/comments')
  .get(authenticateToken, tc.getCommentsForTrip)
  .post(authenticateToken, tc.addCommentToTrip);

module.exports = router;
