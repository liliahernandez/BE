const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    keys: {
        type: DataTypes.JSON,
        allowNull: false
    }
});

module.exports = PushSubscription;
