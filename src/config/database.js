const mongoose = require('mongoose');

// Añadir virtual id automáticamente a todos los modelos (igual que PostgreSQL)
mongoose.plugin(function(schema) {
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });
});

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/pokemon_app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
