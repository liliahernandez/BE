const webpush = require('web-push');
const { PushSubscription } = require('../models');

// Configure VAPID
webpush.setVapidDetails(
    'mailto:admin@pokedex.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Save a push subscription for a user
exports.saveSubscription = async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys) {
            return res.status(400).json({ error: 'Subscription inválida' });
        }

        await PushSubscription.upsert({
            userId: req.userId,
            endpoint,
            keys
        }, { where: { userId: req.userId, endpoint } });

        res.json({ message: 'Suscripción guardada' });
    } catch (error) {
        console.error('Save subscription error:', error);
        res.status(500).json({ error: 'Error al guardar suscripción' });
    }
};

// Send a push notification to a specific user
exports.sendPushToUser = async (userId, payload) => {
    try {
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
