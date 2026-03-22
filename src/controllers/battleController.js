const Battle = require('../models/Battle');
const User = require('../models/User');
const battleService = require('../services/battle');
const { notifyUser } = require('../sockets/socket');

// Create battle challenge
exports.createBattle = async (req, res) => {
    try {
        const { opponentId, teamId } = req.body;

        if (!opponentId || !teamId) {
            return res.status(400).json({ error: 'ID de oponente y ID de equipo requeridos' });
        }

        // Check if opponent exists and is a friend
        const challenger = await User.findById(req.userId);
        const opponent = await User.findById(opponentId);

        if (!opponent) {
            return res.status(404).json({ error: 'Oponente no encontrado' });
        }

        if (!challenger.friends.includes(opponentId)) {
            return res.status(400).json({ error: 'Solo puedes batallar con amigos' });
        }

        // Get challenger's team
        const challengerTeam = challenger.teams.id(teamId);
        if (!challengerTeam) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Get opponent's first team (or you could let them choose)
        if (!opponent.teams || opponent.teams.length === 0) {
            return res.status(400).json({ error: 'El oponente no tiene equipos' });
        }
        const opponentTeam = opponent.teams[0];

        // Create battle
        const battle = new Battle({
            challenger: req.userId,
            opponent: opponentId,
            challengerTeam: challengerTeam.pokemon,
            opponentTeam: opponentTeam.pokemon
        });

        await battle.save();

        // Notify the opponent in real-time
        notifyUser(opponentId, 'battle_request', {
            battleId: battle._id,
            challengerId: challenger._id,
            challengerEmail: challenger.email,
            challengerFriendCode: challenger.friendCode
        });

        res.json({
            message: 'Batalla creada exitosamente',
            battleId: battle._id,
            battle
        });
    } catch (error) {
        console.error('Create battle error:', error);
        res.status(500).json({ error: 'Error creando batalla' });
    }
};

// Start/simulate battle
exports.startBattle = async (req, res) => {
    try {
        const { battleId } = req.params;

        const battle = await battleService.simulateBattle(battleId);

        res.json({
            message: 'Batalla completada',
            battle
        });
    } catch (error) {
        console.error('Start battle error:', error);
        res.status(500).json({ error: error.message || 'Error iniciando batalla' });
    }
};

// Get battle details
exports.getBattle = async (req, res) => {
    try {
        const { battleId } = req.params;

        const battle = await Battle.findById(battleId)
            .populate('challenger', 'email friendCode')
            .populate('opponent', 'email friendCode')
            .populate('winner', 'email friendCode');

        if (!battle) {
            return res.status(404).json({ error: 'Batalla no encontrada' });
        }

        // Check if user is part of this battle
        if (battle.challenger._id.toString() !== req.userId.toString() &&
            battle.opponent._id.toString() !== req.userId.toString()) {
            return res.status(403).json({ error: 'No autorizado para ver esta batalla' });
        }

        res.json({ battle });
    } catch (error) {
        console.error('Get battle error:', error);
        res.status(500).json({ error: 'Error obteniendo batalla' });
    }
};

// Get user's battles
exports.getUserBattles = async (req, res) => {
    try {
        const battles = await Battle.find({
            $or: [
                { challenger: req.userId },
                { opponent: req.userId }
            ]
        })
            .populate('challenger', 'email friendCode')
            .populate('opponent', 'email friendCode')
            .populate('winner', 'email friendCode')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ battles });
    } catch (error) {
        console.error('Get user battles error:', error);
        res.status(500).json({ error: 'Error obteniendo batallas' });
    }
};

// Cancel battle
exports.cancelBattle = async (req, res) => {
    try {
        const { battleId } = req.params;

        const battle = await Battle.findById(battleId);

        if (!battle) {
            return res.status(404).json({ error: 'Batalla no encontrada' });
        }

        // Only challenger can cancel
        if (battle.challenger.toString() !== req.userId.toString()) {
            return res.status(403).json({ error: 'Solo el retador puede cancelar la batalla' });
        }

        if (battle.status !== 'pending') {
            return res.status(400).json({ error: 'Solo se pueden cancelar batallas pendientes' });
        }

        battle.status = 'cancelled';
        await battle.save();

        res.json({ message: 'Batalla cancelada exitosamente' });
    } catch (error) {
        console.error('Cancel battle error:', error);
        res.status(500).json({ error: 'Error cancelando batalla' });
    }
};
