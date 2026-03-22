const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Battle = sequelize.define('Battle', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
        defaultValue: 'pending'
    },
    challengerTeam: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    opponentTeam: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    battleLog: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Battle;
