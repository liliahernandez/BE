const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    pokemon: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamPokemon' }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
