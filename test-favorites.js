require('dotenv').config();
const mongoose = require('mongoose');
const { Favorite, User } = require('./src/models');
const pokeAPIService = require('./src/services/pokeapi');

async function test() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log('Connected DB');
        
        let user = await User.findOne();
        if(!user) {
            console.log('No user found');
            process.exit(0);
        }
        console.log('Found user:', user._id);

        console.log('Testing getFavorites...');
        const favorites = await Favorite.find({ userId: user._id });
        console.log('Favorites got:', favorites.length);

        console.log('Testing getPokemonDetails for id 1...');
        const pokemon = await pokeAPIService.getPokemonDetails(1);
        console.log('Pokemon details got:', !!pokemon);

        const sprite = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default;
        console.log('Sprite extracted:', sprite);

        console.log('Testing Favorite.create...');
        await Favorite.create({
            userId: user._id,
            pokemonId: pokemon.id,
            name: pokemon.name,
            sprite: sprite,
            types: pokemon.types.map(t => t.type.name)
        });
        console.log('Favorite created successfully!');

		// Cleanup
		await Favorite.deleteMany({ userId: user._id, pokemonId: pokemon.id });
        console.log('Test complete and clean!');
    } catch(e) {
        console.error('ERROR EN TEST:', e.message, e.stack);
    } finally {
        process.exit(0);
    }
}

test();
