import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
const expo = new Expo();

export const notifyAdminsOnSafeArrival = functions.database
  .ref('/users/{userId}/safeArrival')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const newValue = change.after.val();

    // Only proceed if safeArrival is set to true
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

      // Fetch admin users
      const adminUsersSnapshot = await db.ref('users').orderByChild('admin').equalTo(true).once('value');
      const adminUsers = adminUsersSnapshot.val();

      if (adminUsers) {
        const messages = [];
        for (const adminUserId of Object.keys(adminUsers)) {
          const adminUser = adminUsers[adminUserId];
          if (adminUser.pushToken) {
            if (!Expo.isExpoPushToken(adminUser.pushToken)) {
              console.error(`Invalid Expo push token ${adminUser.pushToken} for admin ${adminUserId}`);
              continue;
            }

            console.log(`Preparing notification for admin: ${adminUserId} with token: ${adminUser.pushToken}`);
            messages.push({
              to: adminUser.pushToken,
              title: `Nolla har kommit hem säkert 🏠`,
              body: `${user.firstName} har markerat sig själv som hemkommen`,
              data: { userId: userId, safeArrival: true },
            });
          } else {
            console.log(`Admin ${adminUserId} has no push token`);
          }
        }

        // Send the messages
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            console.log('Notifications sent:', ticketChunk);
          } catch (error) {
            console.error('Error sending notifications:', error);
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