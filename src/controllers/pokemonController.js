const pokeAPIService = require('../services/pokeapi');

// Get Pokemon list with pagination
exports.getPokemonList = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const parsedLimit = parseInt(limit);
        const data = await pokeAPIService.getPokemonList(parsedLimit, parseInt(offset));

        let results;

        // Optimization: For large lists (e.g. > 50), skip detailed fetching to avoid N+1 API calls
        // This means "types" will be empty in the list view, but it allows loading 1000+ items instantly.
        if (parsedLimit > 50) {
            results = data.results.map(pokemon => {
                // Extract ID from URL: https://pokeapi.co/api/v2/pokemon/1/
                const id = pokemon.url.split('/').filter(Boolean).pop();
                return {
                    id: parseInt(id),
                    name: pokemon.name,
                    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                    types: [] // Empty types to save 1000+ requests
                };
            });
        } else {
            // Original behavior for small pages: fetch full details including types
            results = await Promise.all(
                data.results.map(async (pokemon) => {
                    const details = await pokeAPIService.getPokemonDetails(pokemon.name);
                    return {
                        id: details.id,
                        name: details.name,
                        sprite: details.sprites.front_default,
                        types: details.types.map(t => t.type.name)
                    };
                })
            );
        }

        res.json({
            count: data.count,
            next: data.next,
            previous: data.previous,
            results: results
        });
    } catch (error) {
        console.error('Get Pokemon list error:', error);
        res.status(500).json({ error: 'Error obteniendo lista de Pokemon' });
    }
};

// Get Pokemon details
exports.getPokemonDetails = async (req, res) => {
    try {
        const { idOrName } = req.params;
        const pokemon = await pokeAPIService.getPokemonDetails(idOrName);
        const species = await pokeAPIService.getPokemonSpecies(idOrName);

        // Get evolution chain
        let evolutionChain = null;
        if (species.evolution_chain) {
            const chainData = await pokeAPIService.getEvolutionChain(species.evolution_chain.url);
            evolutionChain = pokeAPIService.parseEvolutionChain(chainData.chain);
        }

        // Format response
        const response = {
            id: pokemon.id,
            name: pokemon.name,
            sprites: {
                front_default: pokemon.sprites.front_default,
                front_shiny: pokemon.sprites.front_shiny,
                official_artwork: pokemon.sprites.other['official-artwork'].front_default
            },
            types: pokemon.types.map(t => ({
                slot: t.slot,
                name: t.type.name
            })),
            stats: pokemon.stats.reduce((acc, stat) => {
                acc[stat.stat.name] = stat.base_stat;
                return acc;
            }, {}),
            abilities: pokemon.abilities.map(a => ({
                name: a.ability.name,
                is_hidden: a.is_hidden
            })),
            moves: pokemon.moves.slice(0, 20).map(m => m.move.name), // Limit to 20 moves
            height: pokemon.height,
            weight: pokemon.weight,
            species: {
                name: species.name,
                generation: species.generation.name,
                habitat: species.habitat?.name,
                is_legendary: species.is_legendary,
                is_mythical: species.is_mythical
            },
            evolutionChain
        };

        res.json(response);
    } catch (error) {
        console.error('Get Pokemon details error:', error);
        res.status(500).json({ error: 'Error obteniendo detalles del Pokemon' });
    }
};

// Search Pokemon by name
exports.searchPokemon = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({ error: 'Parámetro nombre requerido' });
        }

        const pokemon = await pokeAPIService.getPokemonDetails(name.toLowerCase());

        res.json({
            id: pokemon.id,
            name: pokemon.name,
            sprite: pokemon.sprites.front_default,
            types: pokemon.types.map(t => t.type.name)
        });
    } catch (error) {
        console.error('Search Pokemon error:', error);
        res.status(404).json({ error: 'Pokemon no encontrado' });
    }
};

// Get Pokemon by type
exports.getPokemonByType = async (req, res) => {
    try {
        const { type } = req.params;
        const data = await pokeAPIService.getPokemonByType(type);

        // Limit results and format
        const pokemon = data.pokemon.slice(0, 50).map(p => ({
            name: p.pokemon.name,
            url: p.pokemon.url
        }));

        res.json({
            type: data.name,
            pokemon
        });
    } catch (error) {
        console.error('Get Pokemon by type error:', error);
        res.status(500).json({ error: 'Error obteniendo Pokemon por tipo' });
    }
};

// Get all types
exports.getTypes = async (req, res) => {
    try {
        const data = await pokeAPIService.getTypes();
        res.json({ types: data.results });
    } catch (error) {
        console.error('Get types error:', error);
        res.status(500).json({ error: 'Error obteniendo tipos' });
    }
};

// Get generations (regions)
exports.getGenerations = async (req, res) => {
    try {
        const data = await pokeAPIService.getGenerations();
        res.json({ generations: data.results });
    } catch (error) {
        console.error('Get generations error:', error);
        res.status(500).json({ error: 'Error obteniendo generaciones' });
    }
};

// Get Pokemon by generation
exports.getPokemonByGeneration = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await pokeAPIService.getGeneration(id);

        res.json({
            name: data.name,
            pokemon: data.pokemon_species.map(p => ({
                name: p.name,
                url: p.url
            }))
        });
    } catch (error) {
        console.error('Get Pokemon by generation error:', error);
        res.status(500).json({ error: 'Error obteniendo Pokemon por generación' });
    }
};
