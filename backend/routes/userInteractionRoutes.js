const router= require('express').Router();
const {authenticateToken} = require('../middleware/authMiddleware');
const ui = require('../controllers/InteractionController');

router.put('/:type/:id/like', authenticateToken, ui.toggleLike);
router.put('/:type/:id/save', authenticateToken, ui.toggleSave);
router.put('/:type/:id/mention', authenticateToken, ui.addMention);
module.exports = router;
