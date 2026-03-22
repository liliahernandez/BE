const webpush = require('web-push');
const { PushSubscription } = require('../models');

// Lazy VAPID initialization
let vapidConfigured = false;
function ensureVapid() {
    if (vapidConfigured) return;
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (!pub || !priv) {
        throw new Error('VAPID keys not set in environment variables!');
    }
    webpush.setVapidDetails('mailto:admin@pokedex.app', pub, priv);
    vapidConfigured = true;
    console.log('[Push] VAPID configured successfully');
}

// Save a push subscription for a user
exports.saveSubscription = async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys) {
            return res.status(400).json({ error: 'Subscription inválida' });
        }

        console.log(`[Push] Saving subscription for user ${req.userId}, endpoint: ${endpoint.substring(0, 50)}...`);

        // Use findOrCreate pattern (upsert with separate where doesn't work in all Sequelize versions)
        const [sub, created] = await PushSubscription.findOrCreate({
            where: { userId: req.userId, endpoint },
            defaults: { userId: req.userId, endpoint, keys }
        });

        if (!created) {
            // Update keys if subscription already exists
            await sub.update({ keys });
        }

        console.log(`[Push] Subscription ${created ? 'created' : 'updated'} for user ${req.userId}`);
        res.json({ message: 'Suscripción guardada' });
    } catch (error) {
        console.error('Save subscription error:', error);
        res.status(500).json({ error: 'Error al guardar suscripción' });
    }
};

// Send a push notification to a specific user
exports.sendPushToUser = async (userId, payload) => {
    try {
        ensureVapid();
        const subscriptions = await PushSubscription.findAll({ where: { userId } });

        if (subscriptions.length === 0) {
            console.log(`[Push] No subscriptions for user ${userId}`);
            return;
        }

        const payloadStr = JSON.stringify(payload);
        
        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payloadStr);
                console.log(`[Push] Sent to user ${userId}`);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired — clean up
                    await sub.destroy();
                    console.log(`[Push] Removed expired subscription for user ${userId}`);
                } else {
                    console.error(`[Push] Error sending to user ${userId}:`, err.message);
                }
            }
        }
    } catch (error) {
        console.error('[Push] sendPushToUser error:', error);
    }
};

// Get VAPID public key
exports.getVapidPublicKey = (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};
