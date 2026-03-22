const User = require('./User');
const Favorite = require('./Favorite');
const Team = require('./Team');
const TeamPokemon = require('./TeamPokemon');

// User <-> Favorite
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId' });

// User <-> Team
User.hasMany(Team, { foreignKey: 'userId', as: 'teams' });
Team.belongsTo(User, { foreignKey: 'userId' });

// Team <-> TeamPokemon
Team.hasMany(TeamPokemon, { foreignKey: 'teamId', as: 'pokemon' });
TeamPokemon.belongsTo(Team, { foreignKey: 'teamId' });

// User <-> User (Friends)
// Self-referencing many-to-many
User.belongsToMany(User, {
    as: 'friends',
    through: 'Friendships',
    foreignKey: 'userId',
    otherKey: 'friendId'
});

module.exports = {
    User,
    Favorite,
    Team,
    TeamPokemon
};
