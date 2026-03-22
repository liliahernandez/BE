require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./src/config/database');
const { User, Favorite, Team, TeamPokemon } = require('./src/models');

const app = express();
const PORT = process.env.PORT || 3000;

const http = require('http');
const server = http.createServer(app);
const { initSocket } = require('./src/sockets/socket');
initSocket(server);

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow Railway origins and localhost
        if (!origin || origin.includes('railway.app') || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
// app.use(passport.initialize()); // Disabled Google Auth initialization

// Routes
app.use('/auth', require('./src/routes/auth'));
app.use('/api/auth', require('./src/routes/auth')); // Fallback for old SW or hardcoded URLs
app.use('/favorites', require('./src/routes/favorites'));
app.use('/pokemon', require('./src/routes/pokemon'));
app.use('/battles', require('./src/routes/battles'));

// Database sync and server start
sequelize.sync({ alter: true }) // Changed to alter to update User table with new columns
    .then(() => {
        console.log('PostgreSQL database synced');
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`➜  Local:   http://localhost:${PORT}/`);
            const os = require('os');
            const networkInterfaces = os.networkInterfaces();
            for (const interfaceName in networkInterfaces) {
                const interfaces = networkInterfaces[interfaceName];
                for (const iface of interfaces) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        console.log(`➜  Network: http://${iface.address}:${PORT}/`);
                    }
                }
            }
        });
    })
    .catch(err => {
        console.error('Failed to sync database:', err);
    });