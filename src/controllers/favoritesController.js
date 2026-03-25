const { Favorite, Team, TeamPokemon } = require('../models');
const pokeAPIService = require('../services/pokeapi');

exports.getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ userId: req.userId });
        res.json({ favorites });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: error.message || 'Error obteniendo favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.body;
        if (!pokemonId) return res.status(400).json({ error: 'ID de Pokemon requerido' });

        const pokemon = await pokeAPIService.getPokemonDetails(pokemonId);
        if (!pokemon) return res.status(404).json({ error: 'Pokemon no encontrado en PokeAPI' });

        const sprite = pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '';
        
        const existing = await Favorite.findOne({ userId: req.userId, pokemonId });
        if (existing) {
            return res.status(400).json({ error: 'Pokemon ya en favoritos' });
        }

        await Favorite.create({
            userId: req.userId,
            pokemonId: pokemon.id,
            name: pokemon.name,
            sprite: sprite,
            types: pokemon.types ? pokemon.types.map(t => t.type.name) : []
        });

        const favorites = await Favorite.find({ userId: req.userId });
        res.json({ message: 'Añadido a favoritos', favorites });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: error.message || 'Error añadiendo favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.params;
        await Favorite.deleteOne({ userId: req.userId, pokemonId });
        const favorites = await Favorite.find({ userId: req.userId });
        res.json({ message: 'Eliminado de favoritos', favorites });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Error eliminando favorito' });
    }
};

exports.getTeams = async (req, res) => {
    try {
        const teams = await Team.find({ userId: req.userId }).populate('pokemon');
        res.json({ teams });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Error obteniendo equipos' });
    }
};

exports.createTeam = async (req, res) => {
    try {
        const { name, pokemonIds } = req.body;
        if (!name) return res.status(400).json({ error: 'Nombre del equipo requerido' });
        if (!pokemonIds || pokemonIds.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });

        const team = await Team.create({ userId: req.userId, name });

        if (pokemonIds && pokemonIds.length > 0) {
            const pokemonData = await Promise.all(pokemonIds.map(id => pokeAPIService.getPokemonDetails(id)));
            const teamPokemon = pokemonData.map(p => ({
                teamId: team._id,
                pokemonId: p.id,
                name: p.name,
                sprite: p.sprites.other['official-artwork'].front_default || p.sprites.front_default,
                types: p.types.map(t => t.type.name),
                stats: p.stats.reduce((acc, stat) => { acc[stat.stat.name] = stat.base_stat; return acc; }, {}),
                moves: p.moves.slice(0, 4).map(m => m.move.name)
            }));
            const createdPokemon = await TeamPokemon.insertMany(teamPokemon);
            team.pokemon = createdPokemon.map(cp => cp._id);
            await team.save();
        }

        const fullTeam = await Team.findById(team._id).populate('pokemon');
        res.json({ message: 'Equipo creado', team: fullTeam });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Error creando equipo' });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const team = await Team.findOne({ _id: teamId, userId: req.userId });
        if(!team) return res.status(404).json({ error: 'Equipo no encontrado' });
        await Team.deleteOne({ _id: teamId });
        await TeamPokemon.deleteMany({ teamId });
        res.json({ message: 'Equipo eliminado' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Error eliminando equipo' });
    }
};

exports.updateTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, pokemonIds } = req.body;

        const team = await Team.findOne({ _id: teamId, userId: req.userId });
        if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });

        if (name) { team.name = name; await team.save(); }

        if (pokemonIds) {
            if (pokemonIds.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });
            await TeamPokemon.deleteMany({ teamId });
            
            if (pokemonIds.length > 0) {
                const pokemonData = await Promise.all(pokemonIds.map(id => pokeAPIService.getPokemonDetails(id)));
                const teamPokemon = pokemonData.map(p => ({
                    teamId: team._id,
                    pokemonId: p.id,
                    name: p.name,
                    sprite: p.sprites.other['official-artwork'].front_default || p.sprites.front_default,
                    types: p.types.map(t => t.type.name),
                    stats: p.stats.reduce((acc, stat) => { acc[stat.stat.name] = stat.base_stat; return acc; }, {}),
                    moves: p.moves.slice(0, 4).map(m => m.move.name)
                }));
                const createdPokemon = await TeamPokemon.insertMany(teamPokemon);
                team.pokemon = createdPokemon.map(cp => cp._id);
                await team.save();
            } else {
                team.pokemon = [];
                await team.save();
            }
        }
        const updatedTeam = await Team.findById(team._id).populate('pokemon');
        res.json({ message: 'Equipo actualizado', team: updatedTeam });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Error actualizando equipo' });
    }
};
