const express = require('express');
const router = express.Router();
const pokemonController = require('../controllers/pokemonController');
const auth = require('../middleware/auth');

// Public routes
// router.use(auth); // Commented out to allow public access

// Get Pokemon list
router.get('/', pokemonController.getPokemonList);

// Search Pokemon
router.get('/search', pokemonController.searchPokemon);

// Get types
router.get('/types', pokemonController.getTypes);

// Get generations
router.get('/generations', pokemonController.getGenerations);

// Get Pokemon by type
router.get('/type/:type', pokemonController.getPokemonByType);

// Get Pokemon by generation
router.get('/generation/:id', pokemonController.getPokemonByGeneration);

// Get Pokemon details (must be last to avoid conflicts)
router.get('/:idOrName', pokemonController.getPokemonDetails);

module.exports = router;
