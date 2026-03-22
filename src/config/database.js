const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pokemon_app', {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    dialectOptions: {
        // ssl: {
        //     require: true, 
        //     rejectUnauthorized: false 
        // }
    }
});

module.exports = sequelize;
