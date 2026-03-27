const mongoose = require('mongoose');

const teamPokemonSchema = new mongoose.Schema({
    pokemonId: { type: Number, required: true },
    name: { type: String, required: true },
    sprite: { type: String },
    types: { type: [String] },
    stats: { type: Object },
    moves: { type: [String] }
});

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pokemon: [teamPokemonSchema],
    createdAt: { type: Date, default: Date.now }
});

const userTeamsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    userName: { type: String },
    userNickname: { type: String },
    teams: [teamSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', userTeamsSchema);
