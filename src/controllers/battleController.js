const { Battle, User, Team } = require('../models');
const battleService = require('../services/battle');
const { notifyUser } = require('../sockets/socket');
const { sendPushToUser } = require('./pushController');

exports.createBattle = async (req, res) => {
    try {
        const { opponentId, teamId } = req.body;
        if (!opponentId || !teamId) return res.status(400).json({ error: 'ID de oponente y ID de equipo requeridos' });

        const challenger = await User.findById(req.userId).populate('friends');
        const opponent = await User.findById(opponentId);

        if (!opponent) return res.status(404).json({ error: 'Oponente no encontrado' });

        const isFriend = challenger.friends.some(f => f._id.toString() === opponentId);
        if (!isFriend) return res.status(400).json({ error: 'Solo puedes batallar con amigos' });

        const challengerTeamModel = await Team.findOne({ _id: teamId, userId: req.userId }).populate('pokemon');
        if (!challengerTeamModel) return res.status(404).json({ error: 'Equipo no encontrado' });

        const opponentTeams = await Team.find({ userId: opponentId }).populate('pokemon');
        if (!opponentTeams || opponentTeams.length === 0) return res.status(400).json({ error: 'El oponente no tiene equipos' });
        const opponentTeamModel = opponentTeams[0]; // Simplified: taking first team

        const battle = await Battle.create({
            challengerId: req.userId,
            opponentId: opponentId,
            challengerTeam: challengerTeamModel.pokemon.map(p => p.toObject ? p.toObject() : p),
            opponentTeam: opponentTeamModel.pokemon.map(p => p.toObject ? p.toObject() : p),
            status: 'pending'
        });

        notifyUser(opponentId, 'battle_request', {
            battleId: battle._id,
            challengerId: challenger._id,
            challengerEmail: challenger.email,
            challengerName: challenger.name,
            challengerFriendCode: challenger.friendCode
        });

        sendPushToUser(opponentId, {
            title: '¡Reto de Batalla! ⚔️',
            body: `${challenger.name || challenger.email} te ha retado a una batalla Pokémon.`,
            data: { action: 'accept-battle', battleId: battle._id, challengerId: challenger._id }
        });

        res.json({ message: 'Batalla creada exitosamente', battleId: battle._id, battle });
    } catch (error) {
        console.error('Create battle error:', error);
        res.status(500).json({ error: 'Error creando batalla' });
    }
};

exports.startBattle = async (req, res) => {
    try {
        const battle = await battleService.simulateBattle(req.params.battleId);
        res.json({ message: 'Batalla completada', battle });
    } catch (error) {
        console.error('Start battle error:', error);
        res.status(500).json({ error: error.message || 'Error iniciando batalla' });
    }
};

exports.getBattle = async (req, res) => {
    try {
        const battle = await Battle.findById(req.params.battleId)
            .populate('challenger', 'email name friendCode')
            .populate('opponent', 'email name friendCode')
            .populate('winner', 'email name friendCode');

        if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });

        const chId = battle.challengerId ? battle.challengerId.toString() : '';
        const opId = battle.opponentId ? battle.opponentId.toString() : '';
        const reqUser = String(req.userId);

        if (chId !== reqUser && opId !== reqUser) {
            console.log(`403 Triggered in getBattle. chId: ${chId}, opId: ${opId}, reqUser: ${reqUser}`);
            return res.status(403).json({ error: 'No autorizado para ver esta batalla', debug: { chId, opId, reqUser }});
        }
        res.json({ battle });
    } catch (error) {
        console.error('Get battle error:', error);
        res.status(500).json({ error: 'Error obteniendo batalla' });
    }
};

exports.getUserBattles = async (req, res) => {
    try {
        const battles = await Battle.find({
            $or: [{ challengerId: req.userId }, { opponentId: req.userId }]
        })
        .populate('challenger', 'email name friendCode')
        .populate('opponent', 'email name friendCode')
        .populate('winner', 'email name friendCode')
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({ battles });
    } catch (error) {
        console.error('Get user battles error:', error);
        res.status(500).json({ error: 'Error obteniendo batallas' });
    }
};

exports.cancelBattle = async (req, res) => {
    try {
        const battle = await Battle.findById(req.params.battleId);
        if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });
        
        if (battle.challengerId.toString() !== req.userId && battle.opponentId.toString() !== req.userId) {
            return res.status(403).json({ error: 'Solo los participantes pueden eliminar la batalla' });
        }

        await Battle.findByIdAndDelete(req.params.battleId);
        res.json({ message: 'Batalla eliminada exitosamente' });
    } catch (error) {
        console.error('Delete battle error:', error);
        res.status(500).json({ error: 'Error eliminando batalla' });
    }
};
