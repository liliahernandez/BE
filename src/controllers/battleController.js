const { Battle, User, Team, TeamPokemon } = require('../models');
const battleService = require('../services/battle');
const { notifyUser } = require('../sockets/socket');
const { Op } = require('sequelize');

// Create battle challenge
exports.createBattle = async (req, res) => {
    try {
        const { opponentId, teamId } = req.body;

        if (!opponentId || !teamId) {
            return res.status(400).json({ error: 'ID de oponente y ID de equipo requeridos' });
        }

        // Check if opponent exists 
        const challenger = await User.findByPk(req.userId, {
            include: [{ model: User, as: 'friends' }]
        });
        const opponent = await User.findByPk(opponentId, {
            include: [{ 
                model: Team, 
                as: 'teams',
                include: [{ model: TeamPokemon, as: 'pokemon' }]
             }]
        });

        if (!opponent) {
            return res.status(404).json({ error: 'Oponente no encontrado' });
        }

        // Check if friends
        const isFriend = await challenger.hasFriend(opponent);
        if (!isFriend) {
            return res.status(400).json({ error: 'Solo puedes batallar con amigos' });
        }

        // Get challenger's team
        const challengerTeamModel = await Team.findOne({
            where: { id: teamId, userId: req.userId },
            include: [{ model: TeamPokemon, as: 'pokemon' }]
        });
        
        if (!challengerTeamModel) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        // Get opponent's first team 
        if (!opponent.teams || opponent.teams.length === 0) {
            return res.status(400).json({ error: 'El oponente no tiene equipos' });
        }
        const opponentTeamModel = opponent.teams[0];

        // Create battle
        const battle = await Battle.create({
            challengerId: req.userId,
            opponentId: opponentId,
            challengerTeam: challengerTeamModel.pokemon,
            opponentTeam: opponentTeamModel.pokemon,
            status: 'pending'
        });

        // Notify the opponent in real-time
        notifyUser(opponentId, 'battle_request', {
            battleId: battle.id,
            challengerId: challenger.id,
            challengerEmail: challenger.email,
            challengerName: challenger.name,
            challengerFriendCode: challenger.friendCode
        });

        res.json({
            message: 'Batalla creada exitosamente',
            battleId: battle.id,
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

        const battle = await Battle.findByPk(battleId, {
            include: [
                { model: User, as: 'challenger', attributes: ['email', 'name', 'friendCode'] },
                { model: User, as: 'opponent', attributes: ['email', 'name', 'friendCode'] },
                { model: User, as: 'winner', attributes: ['email', 'name', 'friendCode'] }
            ]
        });

        if (!battle) {
            return res.status(404).json({ error: 'Batalla no encontrada' });
        }

        // Check if user is part of this battle
        if (battle.challengerId !== req.userId && battle.opponentId !== req.userId) {
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
        const battles = await Battle.findAll({
            where: {
                [Op.or]: [
                    { challengerId: req.userId },
                    { opponentId: req.userId }
                ]
            },
            include: [
                { model: User, as: 'challenger', attributes: ['email', 'name', 'friendCode'] },
                { model: User, as: 'opponent', attributes: ['email', 'name', 'friendCode'] },
                { model: User, as: 'winner', attributes: ['email', 'name', 'friendCode'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

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

        const battle = await Battle.findByPk(battleId);

        if (!battle) {
            return res.status(404).json({ error: 'Batalla no encontrada' });
        }

        // Only challenger can cancel
        if (battle.challengerId !== req.userId) {
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
