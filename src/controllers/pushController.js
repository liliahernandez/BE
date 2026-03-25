const webpush = require('web-push');
const { PushSubscription } = require('../models');

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

exports.saveSubscription = async (req, res) => {
    try {
        const { endpoint, keys } = req.body;
        if (!endpoint || !keys) {
            return res.status(400).json({ error: 'Subscription inválida' });
        }

        console.log(`[Push] Saving subscription for user ${req.userId}...`);

        const existing = await PushSubscription.findOne({ userId: req.userId, endpoint });
        if (existing) {
            existing.keys = keys;
            await existing.save();
        } else {
            await PushSubscription.create({ userId: req.userId, endpoint, keys });
        }

        console.log(`[Push] Subscription saved for user ${req.userId}`);
        res.json({ message: 'Suscripción guardada' });
    } catch (error) {
        console.error('Save subscription error:', error);
        res.status(500).json({ error: 'Error al guardar suscripción' });
    }
};

exports.sendPushToUser = async (userId, payload) => {
    try {
        ensureVapid();
        const subscriptions = await PushSubscription.find({ userId });

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
                    await sub.deleteOne();
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

exports.getVapidPublicKey = (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};
