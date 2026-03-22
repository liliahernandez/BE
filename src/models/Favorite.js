const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define('Favorite', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    pokemonId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sprite: {
        type: DataTypes.STRING,
        allowNull: true
    },
    types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true
    }
});

module.exports = Favorite;
