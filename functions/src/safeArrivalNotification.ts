import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';
import * as apn from 'apn';

if (!admin.apps.length) {
  admin.initializeApp();
}

const apnProvider = new apn.Provider({
  token: {
    key: process.env.APN_KEY_PATH || './ApnsKey.p8',
    keyId: process.env.APN_KEY_ID || 'F59KT9N498',
    teamId: process.env.APN_TEAM_ID || 'NNP2B278S6',
  },
  production: false,
});

export const notifyAdminsOnSafeArrival = onValueWritten({
  ref: '/users/{userId}/safeArrival',
  region: 'europe-west1',
}, async (event) => {
  const userId = event.params.userId;
  const newValue = event.data.after;

  if (!newValue) {
    console.log(`Safe arrival not set for user: ${userId}`);
    return null;
  }

  console.log(`Safe arrival set for user: ${userId}`);

  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);

  try {
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      console.log(`User not found for userId: ${userId}`);
      return null;
    }

    const adminUsersSnapshot = await db.ref('users').orderByChild('admin').equalTo(true).once('value');
    const adminUsers = adminUsersSnapshot.val();

    console.log(`Admin users:`, JSON.stringify(adminUsers, null, 2));

    if (adminUsers) {
      const fcmMessages: admin.messaging.Message[] = [];
      const apnsMessages: apn.Notification[] = [];

      for (const adminUserId of Object.keys(adminUsers)) {
        const adminUser = adminUsers[adminUserId];
        console.log(`Processing admin user: ${adminUserId}`, JSON.stringify(adminUser, null, 2));

        if (adminUser.pushToken && adminUser.platform) {
          const message = {
            title: `Nolla har kommit hem säkert 🏠`,
            body: `${user.firstName} har markerat sig själv som hemkommen`,
            data: { userId: userId, safeArrival: 'true' }
          };

          if (adminUser.platform === 'android') {
            console.log(`Creating FCM message for admin: ${adminUserId}`);
            fcmMessages.push({
              token: adminUser.pushToken,
              notification: {
                title: message.title,
                body: message.body,
              },
              data: message.data,
              android: {
                notification: {
                  sound: 'notification',
                  priority: 'high',
                },
              },
            });
          } else if (adminUser.platform === 'ios') {
            console.log(`Creating APNS message for admin: ${adminUserId}`);
            const notification = new apn.Notification();
            notification.alert = {
              title: message.title,
              body: message.body
            };
            notification.payload = message.data;
            notification.topic = process.env.FUNCTIONS_CONFIG_APN_BUNDLE_ID || 'com.emileberhard.karatekidc';
            notification.sound = 'notification.wav';
            apnsMessages.push(notification);
          }
        } else {
          console.log(`Admin ${adminUserId} has no push token or platform`);
        }
      }

      console.log(`FCM messages to send:`, JSON.stringify(fcmMessages, null, 2));
      console.log(`APNS messages to send:`, JSON.stringify(apnsMessages.map(n => ({
        alert: n.alert,
        payload: n.payload,
        topic: n.topic,
        sound: n.sound
      })), null, 2));

      if (fcmMessages.length > 0) {
        try {
          const response = await admin.messaging().sendAll(fcmMessages);
          console.log('FCM Notifications sent:', JSON.stringify(response, null, 2));
        } catch (error) {
          console.error('Error sending FCM notifications:', error);
        }
      }

      const apnsToken = adminUsers[Object.keys(adminUsers)[0]].pushToken;
      console.log(`APNS token: ${apnsToken}\nMessage: ${JSON.stringify(apnsMessages[0], null, 2)}`);

      const apnsPromises = apnsMessages.map((notification) => 
        apnProvider.send(notification, apnsToken)
      );

      if (apnsPromises.length > 0) {
        try {
          const results = await Promise.all(apnsPromises);
          console.log('APNS Notifications sent:', JSON.stringify(results, null, 2));
          
          results.forEach((result, index) => {
            if (result.failed.length > 0) {
              console.error(`APNS Notification ${index + 1} failed:`, JSON.stringify(result.failed[0], null, 2));
            } else {
              console.log(`APNS Notification ${index + 1} sent successfully`);
            }
          });
        } catch (error) {
          console.error('Error sending APNS notifications:', error);
        }
      }
    } else {
      console.log('No admin users found');
    }

    return null;
  } catch (error) {
    console.error('Error processing safe arrival notification:', error);
    return null;
  }
});

process.on('exit', () => {
  apnProvider.shutdown();
});