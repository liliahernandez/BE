const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FriendRequest = sequelize.define('FriendRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // pending, accepted, rejected
    }
}, {
    timestamps: true
});

module.exports = FriendRequest;
