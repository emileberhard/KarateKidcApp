import { onValueCreated } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';
import * as apn from 'apn';

const PROMILLE_WARNING_THRESHOLD = 2.0;


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


export const checkAlcoholLevelsAndNotify = onValueCreated({
  ref: '/users/{userId}/unitTakenTimestamps/{timestamp}',
  region: 'europe-west1',
}, async (event) => {
  const userId = event.params.userId;
  console.log(`Function triggered for user: ${userId}`);

  try {
    const userRef = admin.database().ref(`users/${userId}`);
    
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      console.log(`User not found for userId: ${userId}`);
      return;
    }

    console.log(`User data:`, JSON.stringify(user, null, 2));

    const unitTakenTimestamps = user.unitTakenTimestamps || {};
    console.log(`Unit taken timestamps:`, JSON.stringify(unitTakenTimestamps, null, 2));

    const promille = calculateBAC(unitTakenTimestamps);
    console.log(`Calculated promille for ${user.firstName}: ${promille.toFixed(2)}`);

    if (promille >= PROMILLE_WARNING_THRESHOLD) {
      console.log(`Promille threshold exceeded for ${user.firstName}. Notifying admins.`);
      const adminUsersSnapshot = await admin.database().ref('users').orderByChild('admin').equalTo(true).once('value');
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
              title: `⚠️ FYLLEVARNING PÅ ${user.firstName.toUpperCase()} ⚠️`,
              body: `${user.firstName} har ${promille.toFixed(2)} promille alkohol i blodet`,
              data: { userId: userId, promille: promille.toString() }
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
              apnsMessages.push(notification);  // Add this line to store the notification
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
            
            // Add more detailed logging for each result
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
    } else {
      console.log(`Promille threshold not exceeded for ${user.firstName}. No notification sent.`);
    }
  } catch (error) {
    console.error('Error in checkAlcoholLevelsAndNotify:', error);
  }
});

function calculateBAC(unitTakenTimestamps: Record<string, number>): number {
  const weight = 70; 
  const gender = 'male'; 
  const metabolismRate = gender === 'male' ? 0.015 : 0.017;
  const bodyWaterConstant = gender === 'male' ? 0.68 : 0.55;

  const now = Date.now();
  const last24Hours = now - 24 * 60 * 60 * 1000;

  let totalAlcohol = 0;
  Object.values(unitTakenTimestamps).forEach((timestamp) => {
    if (timestamp > last24Hours) {
      const hoursAgo = (now - timestamp) / (60 * 60 * 1000);
      const remainingAlcohol = Math.max(0, 10 - hoursAgo * metabolismRate);
      totalAlcohol += remainingAlcohol;
    }
  });

  const bac = (totalAlcohol / (weight * 1000 * bodyWaterConstant)) * 100;
  return Math.max(0, bac) * 10; 
}


process.on('exit', () => {
  apnProvider.shutdown();
});