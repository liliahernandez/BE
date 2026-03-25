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
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Battle', battleSchema);
