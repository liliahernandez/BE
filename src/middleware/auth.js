const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        req.user = user;
        req.userId = user._id; // Uso de _id de Mongo
        next();
    } catch (error) {
        res.status(401).json({ error: 'Por favor autentíquese' });
    }
};

module.exports = auth;
