const { google } = require('googleapis');
const path = require('path');

// USER MUST PROVIDE THIS FILE
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

async function getAccessToken() {
    // Load Key
    const key = require(SERVICE_ACCOUNT_PATH);
    const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging'];

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: key.client_email,
            private_key: key.private_key.replace(/\\n/g, '\n'),
            project_id: key.project_id
        },
        scopes: SCOPES,
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

/**
 * Sends a Push Notification via FCM V1 API
 * @param {string} deviceToken - The FCM device token from the frontend
 * @param {string} title - Notification Title
 * @param {string} body - Notification Body
 * @param {object} data - Optional data payload
 */
async function sendPushNotification(deviceToken, title, body, data = {}) {
    try {
        const accessToken = await getAccessToken();
        const projectId = require(SERVICE_ACCOUNT_PATH).project_id;

        const message = {
            message: {
                token: deviceToken,
                notification: {
                    title: title,
                    body: body
                },
                data: data
            }
        };

        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        const json = await response.json();
        if (!response.ok) {
            console.error('Error sending FCM V1 message:', json);
            return false;
        }
        console.log('Successfully sent message:', json);
        return true;
    } catch (error) {
        console.error('FCM Send Error Detail:', error.message || error);
        if (error.response) {
            console.error('FCM Response Data:', error.response.data);
        }
        return false;
    }
}

module.exports = { sendPushNotification };
