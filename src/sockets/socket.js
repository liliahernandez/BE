const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
// Map to store connected users: userId -> [socketId1, socketId2, ...]
const connectedUsers = new Map();

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow our specific production URL or any from the same domain
                if (!origin || origin.includes('railway.app') || origin.includes('localhost')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'] // Explicitly enable both
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

        // PvP Battle Handlers
        socket.on('join_battle', (battleId) => {
            const room = `battle_${battleId}`;
            socket.join(room);
            console.log(`User ${userId} joined room ${room}`);
            // Let the room know a player connected/reconnected
            io.to(room).emit('player_joined', { userId });
        });

        socket.on('select_move', async (data) => {
            try {
                const { battleId, move } = data;
                const ioRoom = `battle_${battleId}`;
                const battleService = require('../../src/services/battle'); // lazy load to avoid circular
                
                // Track move selection
                const result = await battleService.registerMoveAction(battleId, userId, move);
                
                // Let other player know we selected a move (without revealing the move yet)
                socket.to(ioRoom).emit('opponent_move_selected', { ready: true });

                // If both players selected, engine calculated the turn
                if (result && result.turnExecuted) {
                    io.to(ioRoom).emit('turn_result', { battle: result.battle });
                }
            } catch (err) {
                console.error('Socket select_move error:', err);
                socket.emit('battle_error', { message: err.message });
            }
        });

        socket.on('leave_battle', (battleId) => {
            socket.leave(`battle_${battleId}`);
            console.log(`User ${userId} left room battle_${battleId}`);
            // Could set battle status to cancelled if player abandons
            socket.to(`battle_${battleId}`).emit('opponent_left', { userId });
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
