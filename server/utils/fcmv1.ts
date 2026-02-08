import admin from "firebase-admin";
import path from 'path';

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

try {
    let serviceAccount: any;
    // 1. Try Environment Variable (For Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            // If it's a string, parse it. 
            // Render environment variables handles newlines, but sometimes they are literal \n
            let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
            if (typeof raw === 'string') {
                serviceAccount = JSON.parse(raw);
            }
        } catch (e: any) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT from Env:", e.message);
        }
    }

    // 2. Fallback to Local File (Development)
    if (!serviceAccount) {
        try {
            // Use import for JSON or require. TS resolveJsonModule is enabled.
            // But require is easier for dynamic path if needed, though import is static.
            // We'll stick to require for this config file loading or use fs if preferred.
            // Since it's a JSON file being loaded as an object:
            serviceAccount = require(SERVICE_ACCOUNT_PATH);
        } catch (e) {
            console.log("No local service-account.json found (Expected in Production if using Env Var)");
        }
    }

    // Initialize if we found credentials
    if (serviceAccount && admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin Initialized successfully.");
    } else if (!serviceAccount) {
        console.error("CRITICAL: No Firebase Credentials found (Env Var or File).");
    }

} catch (error: any) {
    console.error("Failed to initialize Firebase Admin:", error.message);
}

/**
 * Sends a Push Notification via FCM (Firebase Admin SDK)
 * @param {string} deviceToken - The FCM device token
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {object} data - Optional data payload
 */
export async function sendPushNotification(deviceToken: string, title: string, body: string, data: any = {}) {
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
