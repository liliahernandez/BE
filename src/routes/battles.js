const express = require('express');
const router = express.Router();
const battleController = require('../controllers/battleController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Battle routes
router.post('/', battleController.createBattle);
router.post('/:battleId/start', battleController.startBattle);
router.get('/:battleId', battleController.getBattle);
router.get('/', battleController.getUserBattles);
router.delete('/:battleId', battleController.cancelBattle);

module.exports = router;
