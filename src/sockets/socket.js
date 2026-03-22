const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
// Map to store connected users: userId -> [socketId1, socketId2, ...]
const connectedUsers = new Map();

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "https://pokedex-production-494a.up.railway.app",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            // Remove 'Bearer ' prefix if present
            const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
            const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const userId = String(socket.userId);
        
        // Add to connected users
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);

        console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

        socket.on('disconnect', () => {
            const userId = String(socket.userId);
            console.log(`User disconnected: ${userId} with socket ID: ${socket.id}`);
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(userId);
                }
            }
        });
    });

    return io;
};

// Emits an event to a specific user
const notifyUser = (userId, eventName, payload) => {
    if (!io) {
        console.error('Socket.io not initialized.');
        return;
    }

    const userIdStr = userId.toString();
    const userSockets = connectedUsers.get(userIdStr);

    if (userSockets) {
        for (const socketId of userSockets) {
            io.to(socketId).emit(eventName, payload);
        }
        console.log(`Notified user ${userIdStr} with event ${eventName}`);
    } else {
        console.log(`User ${userIdStr} is not currently connected.`);
    }
};

module.exports = {
    initSocket,
    notifyUser
};
