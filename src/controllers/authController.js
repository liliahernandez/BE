const jwt = require('jsonwebtoken');
const { User, FriendRequest, Friendship } = require('../models');
const { notifyUser } = require('../sockets/socket');
const { sendPushToUser } = require('./pushController');

exports.register = async (req, res) => {
    try {
        const { email, password, name, nickname } = req.body;
        if (!email || !password || !name) return res.status(400).json({ error: 'Correo, contraseña y nombre requeridos' });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Correo ya registrado' });

        const friendCode = await User.generateFriendCode();
        const user = await User.create({ email, password, name, nickname, friendCode });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '365d' });

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token,
            user: { 
                id: user._id, 
                email: user.email, 
                name: user.name, 
                nickname: user.nickname, 
                friendCode: user.friendCode 
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error registrando usuario' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: { 
                id: user._id, 
                email: user.email, 
                name: user.name, 
                nickname: user.nickname, 
                friendCode: user.friendCode 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error iniciando sesión' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .populate('friends', 'email name nickname friendCode')
            .select('-password');
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Error obteniendo perfil' });
    }
};

exports.addFriend = async (req, res) => {
    try {
        const { friendCode, action, friendId } = req.body;
        const user = await User.findById(req.userId).populate('friends');

        if (action === 'send_request') {
            if (!friendCode) return res.status(400).json({ error: 'Código de amigo requerido' });
            const friend = await User.findOne({ friendCode });
            if (!friend) return res.status(404).json({ error: 'Código de amigo no encontrado' });
            if (friend._id.toString() === req.userId) return res.status(400).json({ error: 'No puedes añadirte a ti mismo' });
            
            if (user.friends.some(f => f._id.toString() === friend._id.toString())) {
                return res.status(400).json({ error: 'Ya son amigos' });
            }

            // AUTO-ACEPTAR AMISTAD INSTANTANEAMENTE
            await User.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
            await User.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });
            
            // Bucket pattern for requester (user)
            await Friendship.findOneAndUpdate(
                { userId: user._id },
                { 
                    $set: { userName: user.name, userNickname: user.nickname },
                    $addToSet: { friends: { friendId: friend._id, friendName: friend.name, friendNickname: friend.nickname } } 
                },
                { upsert: true }
            );

            // Bucket pattern for receiver (friend)
            await Friendship.findOneAndUpdate(
                { userId: friend._id },
                { 
                    $set: { userName: friend.name, userNickname: friend.nickname },
                    $addToSet: { friends: { friendId: user._id, friendName: user.name, friendNickname: user.nickname } } 
                },
                { upsert: true }
            );

            const payload = {
                message: '¡Ahora son amigos!',
                friendId: user._id.toString(),
                friendName: user.name,
                otherId: friend._id.toString(),
                otherName: friend.name
            };

            setTimeout(() => {
                notifyUser(friend._id.toString(), 'friendship_updated', payload);
                notifyUser(user._id.toString(), 'friendship_updated', payload);
                notifyUser(friend._id.toString(), 'friend_request_accepted', payload);
                notifyUser(user._id.toString(), 'friend_request_accepted', payload);
            }, 500);

            sendPushToUser(friend._id, {
                title: '¡Nuevo Amigo! 🤝', 
                body: `${user.name} usó tu código y te ha agregado. ¡Ya son amigos!`,
                data: { action: 'view-friends' }
            });

            return res.json({ message: '¡Amistad establecida automáticamente!', isMutual: true, friend: { id: friend._id, name: friend.name } });
        } 
        if (action === 'accept_request') {
            const friend = await User.findById(friendId);
            if (!friend) return res.status(404).json({ error: 'Usuario no encontrado' });

            await User.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
            await User.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });
            
            // Bucket pattern for both
            await Friendship.findOneAndUpdate(
                { userId: user._id },
                { 
                    $set: { userName: user.name, userNickname: user.nickname },
                    $addToSet: { friends: { friendId: friend._id, friendName: friend.name, friendNickname: friend.nickname } } 
                },
                { upsert: true }
            );
            await Friendship.findOneAndUpdate(
                { userId: friend._id },
                { 
                    $set: { userName: friend.name, userNickname: friend.nickname },
                    $addToSet: { friends: { friendId: user._id, friendName: user.name, friendNickname: user.nickname } } 
                },
                { upsert: true }
            );

            await FriendRequest.deleteMany({
                $or: [
                    { senderId: user._id, receiverId: friend._id },
                    { senderId: friend._id, receiverId: user._id }
                ]
            });

            const payload = {
                message: '¡Ahora son amigos!',
                friendId: user._id.toString(),
                friendName: user.name,
                otherId: friend._id.toString(),
                otherName: friend.name
            };

            setTimeout(() => {
                notifyUser(friend._id.toString(), 'friendship_updated', payload);
                notifyUser(user._id.toString(), 'friendship_updated', payload);
                notifyUser(friend._id.toString(), 'friend_request_accepted', payload);
                notifyUser(user._id.toString(), 'friend_request_accepted', payload);
            }, 500);

            return res.json({ message: 'Amigo añadido exitosamente', friend: { id: friend._id, name: friend.name } });
        }
        return res.status(400).json({ error: 'Acción no válida' });
    } catch (error) {
        console.error('Add friend error:', error);
        res.status(500).json({ error: 'Error' });
    }
};

exports.getFriends = async (req, res) => {
    try {
        const doc = await Friendship.findOne({ userId: req.userId });
        res.json({ friends: doc?.friends || [] });
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Error obteniendo amigos' });
    }
};

exports.removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const user = await User.findById(req.userId);
        const friend = await User.findById(friendId);

        if (!friend) return res.status(404).json({ error: 'Amigo no encontrado' });

        // Use atomic updates to prevent Mongoose validation errors during .save()
        await User.updateOne({ _id: user._id }, { $pull: { friends: friend._id } });
        await User.updateOne({ _id: friend._id }, { $pull: { friends: user._id } });

        // Update buckets
        await Friendship.findOneAndUpdate({ userId: user._id }, { $pull: { friends: { friendId: friend._id } } });
        await Friendship.findOneAndUpdate({ userId: friend._id }, { $pull: { friends: { friendId: user._id } } });

        // Notify the friend in real-time so their list updates instantly without refreshing
        notifyUser(friend._id.toString(), 'friendship_updated', {
            message: 'Un amigo te ha eliminado'
        });

        res.json({ message: 'Amigo eliminado exitosamente' });
    } catch (error) {
        console.error('Remove friend error:', error);
        res.status(500).json({ error: 'Error eliminando amigo' });
    }
};

exports.getPendingRequests = async (req, res) => {
    try {
        const requests = await FriendRequest.find({ receiverId: req.userId, status: 'pending' });
        const senderIds = requests.map(r => r.senderId);
        const senders = await User.find({ _id: { $in: senderIds } }).select('email name friendCode');
        res.json({ pending: senders });
    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ error: 'Error fetching pending requests' });
    }
};
