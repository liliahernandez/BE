const { User } = require('../models');
const pokeAPIService = require('../services/pokeapi');

exports.getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ favorites: user?.favorites || [] });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: error.message || 'Error obteniendo favoritos' });
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.body;
        if (!pokemonId) return res.status(400).json({ error: 'ID de Pokemon requerido' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const pokemon = await pokeAPIService.getPokemonDetails(pokemonId);
        if (!pokemon) return res.status(404).json({ error: 'Pokemon no encontrado en PokeAPI' });

        const sprite = pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default || '';
        
        const alreadyFavorite = user.favorites.some(f => f.pokemonId === pokemon.id);
        if (alreadyFavorite) {
            return res.status(400).json({ error: 'Pokemon ya en favoritos' });
        }

        user.favorites.push({
            pokemonId: pokemon.id,
            name: pokemon.name,
            sprite: sprite,
            types: pokemon.types ? pokemon.types.map(t => t.type.name) : []
        });

        await user.save();
        res.json({ message: 'Añadido a favoritos', favorites: user.favorites });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: error.message || 'Error añadiendo favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.params;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        user.favorites = user.favorites.filter(f => f.pokemonId !== Number(pokemonId));
        await user.save();
        
        res.json({ message: 'Eliminado de favoritos', favorites: user.favorites });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Error eliminando favorito' });
    }
};

exports.getTeams = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        res.json({ teams: user?.teams || [] });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({ error: 'Error obteniendo equipos' });
    }
};

exports.createTeam = async (req, res) => {
    try {
        const { name, pokemonIds, pokemon } = req.body;
        if (!name) return res.status(400).json({ error: 'Nombre del equipo requerido' });
        
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const pList = pokemon || (pokemonIds ? pokemonIds.map(id => ({ pokemonId: id, moves: [] })) : []);
        if (pList.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });

        const pokemonData = await Promise.all(pList.map(p => pokeAPIService.getPokemonDetails(p.pokemonId)));
        const teamPokemon = pokemonData.map((apiData, index) => {
            const userMoves = pList[index].moves;
            return {
                pokemonId: apiData.id,
                name: apiData.name,
                sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                types: apiData.types ? apiData.types.map(t => t.type.name) : [],
                stats: apiData.stats ? apiData.stats.reduce((acc, stat) => { acc[stat.stat.name] = stat.base_stat; return acc; }, {}) : {},
                moves: (userMoves && userMoves.length > 0) ? userMoves : (apiData.moves ? apiData.moves.slice(0, 4).map(m => m.move?.name || m.name) : [])
            };
        });

        user.teams.push({ name, pokemon: teamPokemon });
        await user.save();

        const createdTeam = user.teams[user.teams.length - 1];
        res.json({ message: 'Equipo creado', team: createdTeam });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Error creando equipo' });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        user.teams = user.teams.filter(t => t._id.toString() !== teamId);
        await user.save();

        res.json({ message: 'Equipo eliminado' });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({ error: 'Error eliminando equipo' });
    }
};

exports.updateTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const { name, pokemonIds, pokemon } = req.body;

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const team = user.teams.id(teamId);
        if (!team) return res.status(404).json({ error: 'Equipo no encontrado' });

        if (name) team.name = name;

        const pList = pokemon || (pokemonIds ? pokemonIds.map(id => ({ pokemonId: id, moves: [] })) : undefined);

        if (pList) {
            if (pList.length > 6) return res.status(400).json({ error: 'Tamaño de equipo inválido' });
            
            const pokemonData = await Promise.all(pList.map(p => pokeAPIService.getPokemonDetails(p.pokemonId)));
            team.pokemon = pokemonData.map((apiData, index) => {
                const userMoves = pList[index].moves;
                return {
                    pokemonId: apiData.id,
                    name: apiData.name,
                    sprite: apiData.sprites?.other?.['official-artwork']?.front_default || apiData.sprites?.front_default,
                    types: apiData.types ? apiData.types.map(t => t.type.name) : [],
                    stats: apiData.stats ? apiData.stats.reduce((acc, stat) => { acc[stat.stat.name] = stat.base_stat; return acc; }, {}) : {},
                    moves: (userMoves && userMoves.length > 0) ? userMoves : (apiData.moves ? apiData.moves.slice(0, 4).map(m => m.move?.name || m.name) : [])
                };
            });
        }
        
        await user.save();
        res.json({ message: 'Equipo actualizado', team });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Error actualizando equipo' });
    }
};
