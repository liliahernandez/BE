const { User, Favorite, Team, TeamPokemon } = require('../models');
const pokeAPIService = require('../services/pokeapi');

// Get favorites
exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.findAll({ where: { userId: req.userId } });
        res.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Error obteniendo favoritos' });
    }
};

// Add favorite
exports.addFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.body;

        if (!pokemonId) {
            return res.status(400).json({ error: 'ID de Pokemon requerido' });
        }

        // Check duplicate
        const existing = await Favorite.findOne({
            where: { userId: req.userId, pokemonId }
        });

        if (existing) {
            return res.status(400).json({ error: 'Pokemon ya en favoritos' });
        }

        const pokemon = await pokeAPIService.getPokemonDetails(pokemonId);

        await Favorite.create({
            userId: req.userId,
            pokemonId: pokemon.id,
            name: pokemon.name,
            sprite: pokemon.sprites.front_default,
            types: pokemon.types.map(t => t.type.name)
        });

        const favorites = await Favorite.findAll({ where: { userId: req.userId } });
        res.json({ message: 'Añadido a favoritos', favorites });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: 'Error añadiendo favorito' });
    }
};

// Remove favorite
exports.removeFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.params;
        await Favorite.destroy({
            where: { userId: req.userId, pokemonId }
        });

        const favorites = await Favorite.findAll({ where: { userId: req.userId } });
        res.json({ message: 'Eliminado de favoritos', favorites });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Error eliminando favorito' });
    }
};

// Get teams
exports.getTeams = async (req, res) => {
    try {
        const teams = await Team.findAll({
            where: { userId: req.userId },
            include: [{ model: TeamPokemon, as: 'pokemon' }]
        });
        res.json({ teams });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Error obteniendo equipos' });
    }
};

// Create team
exports.createTeam = async (req, res) => {
    try {
        const { name, pokemonIds } = req.body;

        if (!name) return res.status(400).json({ error: 'Nombre del equipo requerido' });
        if (!pokemonIds || pokemonIds.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });

        const team = await Team.create({ userId: req.userId, name });

        if (pokemonIds && pokemonIds.length > 0) {
            const pokemonPromises = pokemonIds.map(id => pokeAPIService.getPokemonDetails(id));
            const pokemonData = await Promise.all(pokemonPromises);

            const teamPokemon = pokemonData.map(p => ({
                teamId: team.id,
                pokemonId: p.id,
                name: p.name,
                sprite: p.sprites.front_default,
                types: p.types.map(t => t.type.name),
                stats: p.stats.reduce((acc, stat) => {
                    acc[stat.stat.name] = stat.base_stat;
                    return acc;
                }, {}),
                moves: p.moves.slice(0, 4).map(m => m.move.name)
            }));

            await TeamPokemon.bulkCreate(teamPokemon);
        }

        const fullTeam = await Team.findByPk(team.id, {
            include: [{ model: TeamPokemon, as: 'pokemon' }]
        });

        res.json({ message: 'Equipo creado', team: fullTeam });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Error creando equipo' });
    }
};

// Delete team
exports.deleteTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        await Team.destroy({ where: { id: teamId, userId: req.userId } });

        // Cascade delete TeamPokemon is usually handled by DB constraints or hooks not manual here if defined
        // For safety/simplicity manual:
        await TeamPokemon.destroy({ where: { teamId } });

        res.json({ message: 'Equipo eliminado' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Error eliminando equipo' });
    }
};

// Update team
exports.updateTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, pokemonIds } = req.body;

        const team = await Team.findOne({ where: { id: teamId, userId: req.userId } });
        if (!team) {
            return res.status(404).json({ error: 'Equipo no encontrado' });
        }

        if (name) {
            team.name = name;
            await team.save();
        }

        if (pokemonIds) {
            if (pokemonIds.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });

            // Remove existing pokemon
            await TeamPokemon.destroy({ where: { teamId } });

            if (pokemonIds.length > 0) {
                const pokemonPromises = pokemonIds.map(id => pokeAPIService.getPokemonDetails(id));
                const pokemonData = await Promise.all(pokemonPromises);

                const teamPokemon = pokemonData.map(p => ({
                    teamId: team.id,
                    pokemonId: p.id,
                    name: p.name,
                    sprite: p.sprites.front_default,
                    types: p.types.map(t => t.type.name),
                    stats: p.stats.reduce((acc, stat) => {
                        acc[stat.stat.name] = stat.base_stat;
                        return acc;
                    }, {}),
                    moves: p.moves.slice(0, 4).map(m => m.move.name)
                }));

                await TeamPokemon.bulkCreate(teamPokemon);
            }
        }

        const updatedTeam = await Team.findByPk(team.id, {
            include: [{ model: TeamPokemon, as: 'pokemon' }]
        });

        res.json({ message: 'Equipo actualizado', team: updatedTeam });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Error actualizando equipo' });
    }
};
