const admin = require("firebase-admin");
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    // Check if already initialized to avoid error
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin Initialized successfully.");
    }
} catch (error) {
    console.error("Failed to initialize Firebase Admin:", error.message);
}

/**
 * Sends a Push Notification via FCM (Firebase Admin SDK)
 * @param {string} deviceToken - The FCM device token
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {object} data - Optional data payload
 */
async function sendPushNotification(deviceToken, title, body, data = {}) {
    try {
        const message = {
            token: deviceToken,
            notification: {
                title: title,
                body: body
            },
            data: data
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

module.exports = { sendPushNotification };
