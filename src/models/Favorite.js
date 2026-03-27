const mongoose = require('mongoose');

const favoritePokemonSchema = new mongoose.Schema({
    pokemonId: { type: Number, required: true },
    name: { type: String, required: true },
    sprite: { type: String },
    types: { type: [String] },
    addedAt: { type: Date, default: Date.now }
});

const favoriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    userName: { type: String },
    userNickname: { type: String },
    favorites: [favoritePokemonSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Favorite', favoriteSchema);
