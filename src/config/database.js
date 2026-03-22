const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pokemon_app', {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: process.env.DATABASE_URL ? {
            require: true,
            rejectUnauthorized: false
        } : false
    }
});

module.exports = sequelize;
