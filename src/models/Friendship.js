const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: { type: String },
    userNickname: { type: String },
    friendName: { type: String },
    friendNickname: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Friendship', friendshipSchema);
