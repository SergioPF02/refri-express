const { sendPushNotification } = require('./fcmv1');

// Token from DB scan (Technician)
// device_token: 'dIjafW14SDSUmWecAPNj25:APA91bFG3lyyFUA_-H7KMyiXDycPLTeEgPrHv1R3RluK9TnHXs507gx89CHQkLpGd9ZtLWBe8X7rJXGJ8j1cQ9zpuBbKuXFLf5ZrWX56MpQni2ya_INy0s4'
const targetToken = 'dIjafW14SDSUmWecAPNj25:APA91bFG3lyyFUA_-H7KMyiXDycPLTeEgPrHv1R3RluK9TnHXs507gx89CHQkLpGd9ZtLWBe8X7rJXGJ8j1cQ9zpuBbKuXFLf5ZrWX56MpQni2ya_INy0s4';

async function test() {
    console.log("Sending test notification...");
    const result = await sendPushNotification(
        targetToken,
        "Prueba Manual",
        "Si ves esto, Firebase está funcionando.",
        { type: "test" }
    );
    console.log("Result:", result);
}

test().catch(console.error);
