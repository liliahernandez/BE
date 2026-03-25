const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
    challengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    opponentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    winnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    challengerTeam: {
        type: Object,
        required: true
    },
    opponentTeam: {
        type: Object,
        required: true
    },
    battleLog: {
        type: [Object],
        default: []
    },
    currentTurn: {
        type: Number,
        default: 1
    },
    activePokemonChallenger: {
        type: Number,
        default: 0
    },
    activePokemonOpponent: {
        type: Number,
        default: 0
    },
    challengerMove: {
        type: String,
        default: null
    },
    opponentMove: {
        type: String,
        default: null
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

battleSchema.virtual('challenger', { ref: 'User', localField: 'challengerId', foreignField: '_id', justOne: true });
battleSchema.virtual('opponent', { ref: 'User', localField: 'opponentId', foreignField: '_id', justOne: true });
battleSchema.virtual('winner', { ref: 'User', localField: 'winnerId', foreignField: '_id', justOne: true });

module.exports = mongoose.model('Battle', battleSchema);
