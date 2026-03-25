const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Favorite', favoriteSchema);
