const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { notifyUser } = require('../sockets/socket');

// Register new user
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Correo, contraseña y nombre requeridos' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Correo ya registrado' });
        }

        const friendCode = await User.generateFriendCode();

        const user = await User.create({
            email,
            password,
            name,
            friendCode
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                friendCode: user.friendCode
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error registrando usuario' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Correo y contraseña requeridos' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                friendCode: user.friendCode
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error iniciando sesión' });
    }
};

// Get profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            include: [{
                model: User,
                as: 'friends',
                attributes: ['id', 'email', 'name', 'nickname', 'friendCode'],
                through: { attributes: [] } // Exclude junction table
            }],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Error obteniendo perfil' });
    }
};

// Add friend (Send / Accept Request)
exports.addFriend = async (req, res) => {
    try {
        const { friendCode, action, friendId } = req.body;
        const user = await User.findByPk(req.userId);

        if (action === 'send_request') {
            if (!friendCode) {
                return res.status(400).json({ error: 'Código de amigo requerido' });
            }
            const friend = await User.findOne({ where: { friendCode } });
            if (!friend) {
                return res.status(404).json({ error: 'Código de amigo no encontrado' });
            }
            if (friend.id === req.userId) {
                return res.status(400).json({ error: 'No puedes añadirte a ti mismo' });
            }
            const hasFriend = await user.hasFriend(friend);
            if (hasFriend) {
                return res.status(400).json({ error: 'Ya son amigos' });
            }
            
            // Send socket notification
            notifyUser(friend.id, 'friend_request', {
                requesterId: user.id,
                requesterEmail: user.email,
                requesterName: user.name,
                requesterFriendCode: user.friendCode
            });
            
            return res.json({ message: 'Solicitud de amistad enviada' });
        } 
        
        if (action === 'accept_request') {
            if (!friendId) {
                return res.status(400).json({ error: 'ID de amigo requerido' });
            }
            const friend = await User.findByPk(friendId);
            if (!friend) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            const hasFriend = await user.hasFriend(friend);
            if (hasFriend) {
                return res.status(400).json({ error: 'Ya son amigos' });
            }

            await user.addFriend(friend);
            await friend.addFriend(user); // Bi-directional
            
            notifyUser(friend.id, 'friend_request_accepted', {
                acceptorId: user.id,
                acceptorEmail: user.email,
                acceptorName: user.name,
                acceptorFriendCode: user.friendCode
            });

            return res.json({
                message: 'Amigo añadido exitosamente',
                friend: {
                    id: friend.id,
                    email: friend.email,
                    name: friend.name,
                    friendCode: friend.friendCode
                }
            });
        }

        return res.status(400).json({ error: 'Acción no válida' });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({ error: 'Error procesando solicitud de amistad' });
    }
};

// Get friends
exports.getFriends = async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            include: [{
                model: User,
                as: 'friends',
                attributes: ['id', 'email', 'name', 'friendCode'],
                through: { attributes: [] }
            }]
        });

        res.json({ friends: user.friends });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Error obteniendo amigos' });
    }
};

// Remove friend
exports.removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const user = await User.findByPk(req.userId);
        const friend = await User.findByPk(friendId);

        if (!friend) {
            return res.status(404).json({ error: 'Amigo no encontrado' });
        }

        const hasFriend = await user.hasFriend(friend);
        if (!hasFriend) {
            return res.status(400).json({ error: 'No son amigos' });
        }

        await user.removeFriend(friend);
        await friend.removeFriend(user); // Bi-directional

        res.json({ message: 'Amigo eliminado exitosamente' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Error eliminando amigo' });
    }
};
