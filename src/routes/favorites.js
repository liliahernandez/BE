const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Favorites routes
router.get('/', favoritesController.getFavorites);
router.post('/', favoritesController.addFavorite);
router.delete('/:pokemonId', favoritesController.removeFavorite);

// Teams routes
router.get('/teams', favoritesController.getTeams);
router.post('/teams', favoritesController.createTeam);
router.put('/teams/:teamId', favoritesController.updateTeam);
router.delete('/teams/:teamId', favoritesController.deleteTeam);

module.exports = router;
