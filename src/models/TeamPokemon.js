const mongoose = require('mongoose');

const teamPokemonSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    pokemonId: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    sprite: {
        type: String
    },
    types: {
        type: [String]
    },
    stats: {
        type: Object
    },
    moves: {
        type: [String]
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TeamPokemon', teamPokemonSchema);
