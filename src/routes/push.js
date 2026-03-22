const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const auth = require('../middleware/auth');

router.get('/vapid-public-key', pushController.getVapidPublicKey);
router.post('/subscribe', auth, pushController.saveSubscription);

module.exports = router;
