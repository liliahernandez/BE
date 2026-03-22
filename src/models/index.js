const User = require('./User');
const Favorite = require('./Favorite');
const Team = require('./Team');
const TeamPokemon = require('./TeamPokemon');
const Battle = require('./Battle');
const FriendRequest = require('./FriendRequest');

// User <-> Favorite
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId' });

// User <-> Team
User.hasMany(Team, { foreignKey: 'userId', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'userId' });

// Team <-> TeamPokemon
Team.hasMany(TeamPokemon, { foreignKey: 'teamId', as: 'pokemon' });
TeamPokemon.belongsTo(Team, { foreignKey: 'teamId' });

const Friendship = require('./Friendship');

// User <-> User (Friends)
User.belongsToMany(User, {
    as: 'friends',
    through: Friendship, // Explicit model
    foreignKey: 'userId',
    otherKey: 'friendId'
});

// User <-> Battle (Challenger and Opponent)
User.hasMany(Battle, { foreignKey: 'challengerId', as: 'initiatedBattles' });
User.hasMany(Battle, { foreignKey: 'opponentId', as: 'receivedBattles' });
User.hasMany(Battle, { foreignKey: 'winnerId', as: 'wonBattles' });
Battle.belongsTo(User, { foreignKey: 'challengerId', as: 'challenger' });
Battle.belongsTo(User, { foreignKey: 'opponentId', as: 'opponent' });
Battle.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });

module.exports = {
    User,
    Favorite,
    Team,
    TeamPokemon,
    Battle,
    FriendRequest,
    Friendship
};
