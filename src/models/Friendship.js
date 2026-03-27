const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    friendName: { type: String },
    friendNickname: { type: String },
    addedAt: { type: Date, default: Date.now }
});

const userFriendshipsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    userName: { type: String },
    userNickname: { type: String },
    friends: [friendSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Friendship', userFriendshipsSchema);
