const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
    challenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    opponent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    challengerTeam: [{
        pokemonId: Number,
        name: String,
        sprite: String,
        types: [String],
        stats: Object,
        moves: [String],
        currentHp: Number
    }],
    opponentTeam: [{
        pokemonId: Number,
        name: String,
        sprite: String,
        types: [String],
        stats: Object,
        moves: [String],
        currentHp: Number
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    battleLog: [{
        turn: Number,
        attacker: String,
        defender: String,
        move: String,
        damage: Number,
        effectiveness: Number,
        message: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('Battle', battleSchema);
