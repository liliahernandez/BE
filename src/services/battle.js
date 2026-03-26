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
    calculateEffectiveness(attackType, defenderTypes) {
        let effectiveness = 1;
        if(defenderTypes) {
            defenderTypes.forEach(defType => {
                if (typeChart[attackType] && typeChart[attackType][defType] !== undefined) {
                    effectiveness *= typeChart[attackType][defType];
                }
            });
        }
        return effectiveness;
    }

    calculateDamage(attacker, defender, move, moveType) {
        let attack = attacker.stats?.attack || attacker.stats?.['special-attack'] || 50;
        let defense = defender.stats?.defense || defender.stats?.['special-defense'] || 50;
        const level = 50; 
        const power = 60; // Simplified flat power

        const stab = (attacker.types && attacker.types.includes(moveType)) ? 1.5 : 1;
        const effectiveness = this.calculateEffectiveness(moveType, defender.types || []);

        const baseDamage = ((((2 * level / 5) + 2) * power * (attack / defense)) / 50) + 2;
        const damage = Math.floor(baseDamage * stab * effectiveness * (Math.random() * 0.15 + 0.85));

        return { damage, effectiveness };
    }

    async registerMoveAction(battleId, userId, move) {
        const initialBattle = await Battle.findById(battleId);
        if (!initialBattle) throw new Error('Battle not found');

        if (initialBattle.status === 'completed' || initialBattle.status === 'cancelled') {
            throw new Error('Battle is already over');
        }

        const isChallenger = initialBattle.challengerId.toString() === userId.toString();
        const isOpponent = initialBattle.opponentId.toString() === userId.toString();

        if (!isChallenger && !isOpponent) throw new Error('Usuario no autorizado para esta batalla');

        const updateField = isChallenger ? { challengerMove: move } : { opponentMove: move };

        // Atomic update guarantees no race condition if players click at exact same millisecond
        const battle = await Battle.findByIdAndUpdate(
            battleId,
            { $set: updateField },
            { new: true }
        ).populate('challenger').populate('opponent');

        if (battle.status === 'pending') {
            battle.status = 'active';
            
            // Initialization: Set full HP
            battle.challengerTeam.forEach(p => { if(!p.currentHp) p.currentHp = p.stats?.hp || 100; });
            battle.opponentTeam.forEach(p => { if(!p.currentHp) p.currentHp = p.stats?.hp || 100; });
            battle.markModified('challengerTeam');
            battle.markModified('opponentTeam');
            await battle.save(); // Just to persist initialization
        }

        if (battle.challengerMove && battle.opponentMove) {
            await this.executeTurn(battle);
            return { turnExecuted: true, battle };
        } else {
            return { turnExecuted: false };
        }
    }

    async executeTurn(battle) {
        const chPokemon = battle.challengerTeam[battle.activePokemonChallenger];
        const opPokemon = battle.opponentTeam[battle.activePokemonOpponent];

        const chMove = battle.challengerMove;
        const opMove = battle.opponentMove;

        // Reset
        battle.challengerMove = null;
        battle.opponentMove = null;

        const chSpeed = chPokemon.stats?.speed || 50;
        const opSpeed = opPokemon.stats?.speed || 50;
        
        const chName = battle.challenger ? (battle.challenger.name || "Retador") : 'Retador';
        const opName = battle.opponent ? (battle.opponent.name || "Oponente") : 'Oponente';
        
        const turnLogs = [];
        
        const executeAttack = (attackerPk, defenderPk, attackerTrainer, defenderTrainer, moveName) => {
            if (attackerPk.currentHp <= 0 || defenderPk.currentHp <= 0) return;
            
            // Fallback move type to the pokemon's primary type
            const moveType = (attackerPk.types && attackerPk.types.length > 0) ? attackerPk.types[0] : 'normal'; 
            
            const { damage, effectiveness } = this.calculateDamage(attackerPk, defenderPk, moveName, moveType);
            defenderPk.currentHp = Math.max(0, defenderPk.currentHp - damage);

            let effectivenessText = '';
            if (effectiveness > 1) effectivenessText = "¡Es súper efectivo!";
            else if (effectiveness < 1 && effectiveness > 0) effectivenessText = "No es muy efectivo...";
            else if (effectiveness === 0) effectivenessText = "¡No afecta al oponente!";

            turnLogs.push({
                turn: battle.currentTurn,
                attacker: attackerTrainer,
                defender: defenderTrainer,
                move: moveName,
                damage,
                effectiveness,
                message: `${attackerTrainer}: ¡${attackerPk.name.toUpperCase()} usó ${moveName.toUpperCase()}! ${effectivenessText}`
            });
        };

        if (chSpeed >= opSpeed) {
            executeAttack(chPokemon, opPokemon, chName, opName, chMove);
            executeAttack(opPokemon, chPokemon, opName, chName, opMove);
        } else {
            executeAttack(opPokemon, chPokemon, opName, chName, opMove);
            executeAttack(chPokemon, opPokemon, chName, opName, chMove);
        }

        let chFainted = false;
        let opFainted = false;

        if (chPokemon.currentHp <= 0) {
            turnLogs.push({ turn: battle.currentTurn, message: `¡El ${chPokemon.name.toUpperCase()} de ${chName} se debilitó!` });
            const nextIdx = battle.challengerTeam.findIndex((p, i) => i > battle.activePokemonChallenger && p.currentHp > 0);
            if (nextIdx !== -1) {
                battle.activePokemonChallenger = nextIdx;
                turnLogs.push({ turn: battle.currentTurn, message: `${chName} sacó a ${battle.challengerTeam[nextIdx].name.toUpperCase()}.` });
            } else {
                chFainted = true;
            }
        }

        if (opPokemon.currentHp <= 0) {
            turnLogs.push({ turn: battle.currentTurn, message: `¡El ${opPokemon.name.toUpperCase()} de ${opName} se debilitó!` });
            const nextIdx = battle.opponentTeam.findIndex((p, i) => i > battle.activePokemonOpponent && p.currentHp > 0);
            if (nextIdx !== -1) {
                battle.activePokemonOpponent = nextIdx;
                turnLogs.push({ turn: battle.currentTurn, message: `${opName} sacó a ${battle.opponentTeam[nextIdx].name.toUpperCase()}.` });
            } else {
                opFainted = true;
            }
        }

        if (chFainted && opFainted) {
            battle.status = 'completed';
            battle.winnerId = null; // tie
            turnLogs.push({ turn: battle.currentTurn, message: `¡La batalla terminó en empate!` });
            battle.completedAt = new Date();
        } else if (chFainted) {
            battle.status = 'completed';
            battle.winnerId = battle.opponentId;
            turnLogs.push({ turn: battle.currentTurn, message: `¡${opName} gana la batalla!` });
            battle.completedAt = new Date();
        } else if (opFainted) {
            battle.status = 'completed';
            battle.winnerId = battle.challengerId;
            turnLogs.push({ turn: battle.currentTurn, message: `¡${chName} gana la batalla!` });
            battle.completedAt = new Date();
        }

        battle.battleLog = [...(battle.battleLog || []), ...turnLogs];
        battle.currentTurn += 1;

        battle.markModified('challengerTeam');
        battle.markModified('opponentTeam');

        await battle.save();
    }

    // Deprecated simulation endpoint logic. Returns an error as it's replaced by real-time PvP.
    async simulateBattle(battleId) {
        throw new Error('Offline battle simulation replaced by interactive WebSockets PvP.');
    }
}

module.exports = new BattleService();
