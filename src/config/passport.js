const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Find or create user
            let user = await User.findOne({ where: { googleId: profile.id } });

            if (!user) {
                // Check if email already exists
                const email = profile.emails[0].value;
                user = await User.findOne({ where: { email } });

                if (user) {
                    // Link account
                    user.googleId = profile.id;
                    await user.save();
                } else {
                    // Create new user
                    const friendCode = await User.generateFriendCode(); // Ensure this static method works
                    user = await User.create({
                        email: email,
                        googleId: profile.id,
                        friendCode: friendCode,
                        password: null
                    });
                }
            }
            return cb(null, user);
        } catch (err) {
            return cb(err, null);
        }
    }
));

module.exports = passport;
