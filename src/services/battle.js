const { Battle, User } = require('../models');

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
        const level = 50; 
        const power = 60; 

        // STAB (Same Type Attack Bonus)
        const stab = attacker.types.includes(moveType) ? 1.5 : 1;

        // Type effectiveness
        const effectiveness = this.calculateEffectiveness(moveType, defender.types);

        // Damage formula 
        const baseDamage = ((((2 * level / 5) + 2) * power * (attack / defense)) / 50) + 2;
        const damage = Math.floor(baseDamage * stab * effectiveness * (Math.random() * 0.15 + 0.85));

        return { damage, effectiveness };
    }

    // Simulate a turn
    simulateTurn(attacker, defender, attackerName, defenderName, turnNumber) {
        const moveIndex = Math.floor(Math.random() * Math.min(attacker.moves.length, 4));
        const moveName = attacker.moves[moveIndex] || 'tackle';
        const moveType = attacker.types[0]; 

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
        const battle = await Battle.findByPk(battleId, {
            include: [
                { model: User, as: 'challenger', attributes: ['email', 'name'] },
                { model: User, as: 'opponent', attributes: ['email', 'name'] }
            ]
        });

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

        // Battle loop
        while (challengerIndex < battle.challengerTeam.length &&
            opponentIndex < battle.opponentTeam.length) {

            const challengerPokemon = battle.challengerTeam[challengerIndex];
            const opponentPokemon = battle.opponentTeam[opponentIndex];

            const challengerSpeed = challengerPokemon.stats.speed;
            const opponentSpeed = opponentPokemon.stats.speed;

            const chName = battle.challenger.name || battle.challenger.email;
            const opName = battle.opponent.name || battle.opponent.email;

            if (challengerSpeed >= opponentSpeed) {
                const log1 = this.simulateTurn(challengerPokemon, opponentPokemon, chName, opName, turn);
                battle.battleLog.push(log1);

                if (opponentPokemon.currentHp <= 0) {
                    battle.battleLog.push({ turn, message: `${opName}'s ${opponentPokemon.name} fainted!` });
                    opponentIndex++;
                } else {
                    const log2 = this.simulateTurn(opponentPokemon, challengerPokemon, opName, chName, turn);
                    battle.battleLog.push(log2);

                    if (challengerPokemon.currentHp <= 0) {
                        battle.battleLog.push({ turn, message: `${chName}'s ${challengerPokemon.name} fainted!` });
                        challengerIndex++;
                    }
                }
            } else {
                const log1 = this.simulateTurn(opponentPokemon, challengerPokemon, opName, chName, turn);
                battle.battleLog.push(log1);

                if (challengerPokemon.currentHp <= 0) {
                    battle.battleLog.push({ turn, message: `${chName}'s ${challengerPokemon.name} fainted!` });
                    challengerIndex++;
                } else {
                    const log2 = this.simulateTurn(challengerPokemon, opponentPokemon, chName, opName, turn);
                    battle.battleLog.push(log2);

                    if (opponentPokemon.currentHp <= 0) {
                        battle.battleLog.push({ turn, message: `${opName}'s ${opponentPokemon.name} fainted!` });
                        opponentIndex++;
                    }
                }
            }
            turn++;
        }

        // Determine winner
        if (challengerIndex >= battle.challengerTeam.length) {
            battle.winnerId = battle.opponentId;
            battle.battleLog.push({ turn, message: `${opName} wins the battle!` });
        } else {
            battle.winnerId = battle.challengerId;
            battle.battleLog.push({ turn, message: `${chName} wins the battle!` });
        }

        battle.status = 'completed';
        battle.completedAt = new Date();

        // Use changed() to help Sequelize with JSONB if needed, though direct save usually works
        await Battle.update({
            status: battle.status,
            battleLog: battle.battleLog,
            challengerTeam: battle.challengerTeam,
            opponentTeam: battle.opponentTeam,
            winnerId: battle.winnerId,
            completedAt: battle.completedAt
        }, { where: { id: battle.id } });

        return await Battle.findByPk(battle.id, {
            include: [
                { model: User, as: 'challenger', attributes: ['email', 'name'] },
                { model: User, as: 'opponent', attributes: ['email', 'name'] },
                { model: User, as: 'winner', attributes: ['email', 'name'] }
            ]
        });
    }
}

module.exports = new BattleService();
