const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    name: {
        type: String,
        required: true,
        default: 'Entrenador'
    },
    nickname: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    friendCode: {
        type: String,
        required: true,
        unique: true
    },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Favorite' }],
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.generateFriendCode = async function() {
    let code;
    let exists = true;
    while (exists) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const user = await this.findOne({ friendCode: code });
        if (!user) exists = false;
    }
    return code;
};

module.exports = mongoose.model('User', userSchema);
