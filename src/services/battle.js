const Battle = require('../models/Battle');

// Type effectiveness chart
const typeChart = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

class BattleService {
    // Calculate type effectiveness
    calculateEffectiveness(attackType, defenderTypes) {
        let effectiveness = 1;

        defenderTypes.forEach(defType => {
            if (typeChart[attackType] && typeChart[attackType][defType] !== undefined) {
                effectiveness *= typeChart[attackType][defType];
            }
        });

        return effectiveness;
    }

    // Calculate damage
    calculateDamage(attacker, defender, move, moveType) {
        const attack = attacker.stats.attack || attacker.stats['special-attack'];
        const defense = defender.stats.defense || defender.stats['special-defense'];
        const level = 50; // Default level
        const power = 60; // Default move power

        // STAB (Same Type Attack Bonus)
        const stab = attacker.types.includes(moveType) ? 1.5 : 1;

        // Type effectiveness
        const effectiveness = this.calculateEffectiveness(moveType, defender.types);

        // Damage formula (simplified Pokemon damage calculation)
        const baseDamage = ((((2 * level / 5) + 2) * power * (attack / defense)) / 50) + 2;
        const damage = Math.floor(baseDamage * stab * effectiveness * (Math.random() * 0.15 + 0.85));

        return { damage, effectiveness };
    }

    // Simulate a turn
    simulateTurn(attacker, defender, attackerName, defenderName, turnNumber) {
        // Select random move (simplified - in real Pokemon, player chooses)
        const moveIndex = Math.floor(Math.random() * Math.min(attacker.moves.length, 4));
        const moveName = attacker.moves[moveIndex] || 'tackle';
        const moveType = attacker.types[0]; // Simplified - use first type

        const { damage, effectiveness } = this.calculateDamage(attacker, defender, moveName, moveType);

        defender.currentHp = Math.max(0, defender.currentHp - damage);

        let effectivenessText = '';
        if (effectiveness > 1) effectivenessText = "It's super effective!";
        else if (effectiveness < 1 && effectiveness > 0) effectivenessText = "It's not very effective...";
        else if (effectiveness === 0) effectivenessText = "It doesn't affect the opponent!";

        return {
            turn: turnNumber,
            attacker: attackerName,
            defender: defenderName,
            move: moveName,
            damage,
            effectiveness,
            message: `${attackerName}'s ${attacker.name} used ${moveName}! ${effectivenessText} Dealt ${damage} damage.`
        };
    }

    // Simulate full battle
    async simulateBattle(battleId) {
        const battle = await Battle.findById(battleId)
            .populate('challenger', 'email friendCode')
            .populate('opponent', 'email friendCode');

        if (!battle) {
            throw new Error('Battle not found');
        }

        if (battle.status !== 'pending') {
            throw new Error('Battle already started or completed');
        }

        // Initialize HP for all Pokemon
        battle.challengerTeam.forEach(pokemon => {
            pokemon.currentHp = pokemon.stats.hp;
        });

        battle.opponentTeam.forEach(pokemon => {
            pokemon.currentHp = pokemon.stats.hp;
        });

        battle.status = 'active';
        battle.battleLog = [];

        let turn = 1;
        let challengerIndex = 0;
        let opponentIndex = 0;

        // Battle loop - continues until one team is defeated
        while (challengerIndex < battle.challengerTeam.length &&
            opponentIndex < battle.opponentTeam.length) {

            const challengerPokemon = battle.challengerTeam[challengerIndex];
            const opponentPokemon = battle.opponentTeam[opponentIndex];

            // Determine who goes first based on speed
            const challengerSpeed = challengerPokemon.stats.speed;
            const opponentSpeed = opponentPokemon.stats.speed;

            if (challengerSpeed >= opponentSpeed) {
                // Challenger attacks first
                const log1 = this.simulateTurn(
                    challengerPokemon,
                    opponentPokemon,
                    battle.challenger.email,
                    battle.opponent.email,
                    turn
                );
                battle.battleLog.push(log1);

                if (opponentPokemon.currentHp <= 0) {
                    battle.battleLog.push({
                        turn,
                        message: `${battle.opponent.email}'s ${opponentPokemon.name} fainted!`
                    });
                    opponentIndex++;
                    turn++;
                    continue;
                }

                // Opponent attacks back
                const log2 = this.simulateTurn(
                    opponentPokemon,
                    challengerPokemon,
                    battle.opponent.email,
                    battle.challenger.email,
                    turn
                );
                battle.battleLog.push(log2);

                if (challengerPokemon.currentHp <= 0) {
                    battle.battleLog.push({
                        turn,
                        message: `${battle.challenger.email}'s ${challengerPokemon.name} fainted!`
                    });
                    challengerIndex++;
                }
            } else {
                // Opponent attacks first
                const log1 = this.simulateTurn(
                    opponentPokemon,
                    challengerPokemon,
                    battle.opponent.email,
                    battle.challenger.email,
                    turn
                );
                battle.battleLog.push(log1);

                if (challengerPokemon.currentHp <= 0) {
                    battle.battleLog.push({
                        turn,
                        message: `${battle.challenger.email}'s ${challengerPokemon.name} fainted!`
                    });
                    challengerIndex++;
                    turn++;
                    continue;
                }

                // Challenger attacks back
                const log2 = this.simulateTurn(
                    challengerPokemon,
                    opponentPokemon,
                    battle.challenger.email,
                    battle.opponent.email,
                    turn
                );
                battle.battleLog.push(log2);

                if (opponentPokemon.currentHp <= 0) {
                    battle.battleLog.push({
                        turn,
                        message: `${battle.opponent.email}'s ${opponentPokemon.name} fainted!`
                    });
                    opponentIndex++;
                }
            }

            turn++;
        }

        // Determine winner
        if (challengerIndex >= battle.challengerTeam.length) {
            battle.winner = battle.opponent._id;
            battle.battleLog.push({
                turn,
                message: `${battle.opponent.email} wins the battle!`
            });
        } else {
            battle.winner = battle.challenger._id;
            battle.battleLog.push({
                turn,
                message: `${battle.challenger.email} wins the battle!`
            });
        }

        battle.status = 'completed';
        battle.completedAt = new Date();

        await battle.save();
        return battle;
    }
}

module.exports = new BattleService();
