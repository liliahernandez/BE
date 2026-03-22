const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// To store individual pokemon in a team
const TeamPokemon = sequelize.define('TeamPokemon', {
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
        type: DataTypes.STRING
    },
    types: {
        type: DataTypes.ARRAY(DataTypes.STRING)
    },
    stats: {
        type: DataTypes.JSONB // Requires Postgres
    },
    moves: {
        type: DataTypes.ARRAY(DataTypes.STRING)
    }
});

module.exports = TeamPokemon;
