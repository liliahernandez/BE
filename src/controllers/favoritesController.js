const { Favorite, Team, User } = require('../models');
const pokeAPIService = require('../services/pokeapi');

exports.getFavorites = async (req, res) => {
    try {
        const doc = await Favorite.findOne({ userId: req.userId });
        res.json({ favorites: doc?.favorites || [] });
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
        
        const newFav = {
            pokemonId: pokemon.id,
            name: pokemon.name,
            sprite: sprite,
            types: pokemon.types ? pokemon.types.map(t => t.type.name) : []
        };

        // Bucket pattern: One document per user in the favorites collection
        const doc = await Favorite.findOneAndUpdate(
            { userId: req.userId },
            { 
                $set: { userName: user.name, userNickname: user.nickname },
                $addToSet: { favorites: newFav } 
            },
            { upsert: true, new: true }
        );

        // Mirror in User document for easy visibility
        await User.updateOne(
            { _id: req.userId },
            { $addToSet: { favorites: pokemon.name } }
        );

        res.json({ message: 'Añadido a favoritos', favorites: doc.favorites });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: error.message || 'Error añadiendo favorito' });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const { pokemonId } = req.params;
        
        // Find the favorite to get the name (for the User mirror)
        const currentDoc = await Favorite.findOne({ userId: req.userId });
        const favToRemove = currentDoc?.favorites.find(f => f.pokemonId === Number(pokemonId));

        const doc = await Favorite.findOneAndUpdate(
            { userId: req.userId },
            { $pull: { favorites: { pokemonId: Number(pokemonId) } } },
            { new: true }
        );

        if (favToRemove) {
            await User.updateOne(
                { _id: req.userId },
                { $pull: { favorites: favToRemove.name } }
            );
        }
        
        res.json({ message: 'Eliminado de favoritos', favorites: doc?.favorites || [] });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Error eliminando favorito' });
    }
};

exports.getTeams = async (req, res) => {
    try {
        const doc = await Team.findOne({ userId: req.userId });
        res.json({ teams: doc?.teams || [] });
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

        const doc = await Team.findOneAndUpdate(
            { userId: req.userId },
            { 
                $set: { userName: user.name, userNickname: user.nickname },
                $push: { teams: { name, pokemon: teamPokemon } } 
            },
            { upsert: true, new: true }
        );

        const createdTeam = doc.teams[doc.teams.length - 1];
        res.json({ message: 'Equipo creado', team: createdTeam });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({ error: 'Error creando equipo' });
    }
};

exports.deleteTeam = async (req, res) => {
    try {
        const { teamId } = req.params;
        const doc = await Team.findOneAndUpdate(
            { userId: req.userId },
            { $pull: { teams: { _id: teamId } } },
            { new: true }
        );

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

        const doc = await Team.findOne({ userId: req.userId });
        if (!doc) return res.status(404).json({ error: 'No se encontraron equipos para este usuario' });

        const team = doc.teams.id(teamId);
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
        
        await doc.save();
        res.json({ message: 'Equipo actualizado', team });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({ error: 'Error actualizando equipo' });
    }
};
