const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.post('/friends', auth, authController.addFriend);
router.get('/friends', auth, authController.getFriends);
router.get('/friends/pending', auth, authController.getPendingRequests);
router.delete('/friends/:friendId', auth, authController.removeFriend);

// Google Auth routes removed as per user request

module.exports = router;
