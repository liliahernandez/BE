const axios = require('axios');

const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

class PokeAPIService {
    // Get list of Pokemon with pagination
    async getPokemonList(limit = 20, offset = 0) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching Pokemon list: ' + error.message);
        }
    }

    // Get detailed Pokemon information
    async getPokemonDetails(idOrName) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${idOrName}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching Pokemon details: ' + error.message);
        }
    }

    // Get Pokemon encounters
    async getPokemonEncounters(idOrName) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/pokemon/${idOrName}/encounters`);
            return response.data;
        } catch (error) {
            return []; // Return empty if not found
        }
    }

    // Get Pokemon species information (for evolution chain)
    async getPokemonSpecies(idOrName) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/pokemon-species/${idOrName}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching Pokemon species: ' + error.message);
        }
    }

    // Get evolution chain
    async getEvolutionChain(url) {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching evolution chain: ' + error.message);
        }
    }

    // Get Pokemon by type
    async getPokemonByType(type) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/type/${type}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching Pokemon by type: ' + error.message);
        }
    }

    // Get all types
    async getTypes() {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/type`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching types: ' + error.message);
        }
    }

    // Get generation (region) information
    async getGeneration(id) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/generation/${id}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching generation: ' + error.message);
        }
    }

    // Get all generations
    async getGenerations() {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/generation`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching generations: ' + error.message);
        }
    }

    // Get move details
    async getMove(idOrName) {
        try {
            const response = await axios.get(`${POKEAPI_BASE_URL}/move/${idOrName}`);
            return response.data;
        } catch (error) {
            throw new Error('Error fetching move: ' + error.message);
        }
    }

    // Parse evolution chain into a readable format
    parseEvolutionChain(chain) {
        const evolutionLine = [];

        const traverse = (node) => {
            const urlParts = node.species.url.split('/');
            const id = urlParts[urlParts.length - 2];
            evolutionLine.push({
                id: parseInt(id),
                name: node.species.name,
                sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
            });

            if (node.evolves_to.length > 0) {
                node.evolves_to.forEach(evolution => traverse(evolution));
            }
        };

        traverse(chain.chain);
        return evolutionLine;
    }
}

module.exports = new PokeAPIService();
