import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo } from 'expo-server-sdk';

const PROMILLE_WARNING_THRESHOLD = 2.0;

// Create a new Expo SDK client
const expo = new Expo();

export const checkAlcoholLevelsAndNotify = functions.database
  .ref('/users/{userId}/unitTakenTimestamps/{timestamp}')
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    console.log(`Function triggered for user: ${userId}`);

    const userRef = admin.database().ref(`users/${userId}`);
    
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      console.log(`User not found for userId: ${userId}`);
      return;
    }

    const unitTakenTimestamps = user.unitTakenTimestamps || {};
    const promille = calculateBAC(unitTakenTimestamps);
    console.log(`Calculated promille for ${user.firstName}: ${promille.toFixed(2)}`);

    if (promille >= PROMILLE_WARNING_THRESHOLD) {
      console.log(`Promille threshold exceeded for ${user.firstName}. Notifying admins.`);
      const adminUsersSnapshot = await admin.database().ref('users').orderByChild('admin').equalTo(true).once('value');
      const adminUsers = adminUsersSnapshot.val();

      if (adminUsers) {
        const messages = [];
        for (const adminUserId of Object.keys(adminUsers)) {
          const adminUser = adminUsers[adminUserId];
          if (adminUser.pushToken) {
            // Check that the push token is valid
            if (!Expo.isExpoPushToken(adminUser.pushToken)) {
              console.error(`Invalid Expo push token ${adminUser.pushToken} for admin ${adminUserId}`);
              continue;
            }

            console.log(`Preparing notification for admin: ${adminUserId} with token: ${adminUser.pushToken}`);
            messages.push({
              to: adminUser.pushToken,
              title: `⚠️ FYLLEVARNING PÅ ${user.firstName.toUpperCase()} ⚠️`,
              body: `${user.firstName} har ${promille.toFixed(2)} promille alkohol i blodet`,
              data: { userId: userId, promille: promille.toString() },
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
    } else {
      console.log(`Promille threshold not exceeded for ${user.firstName}. No notification sent.`);
    }
  });

function calculateBAC(unitTakenTimestamps: Record<string, number>): number {
  const weight = 70; // Default weight in kg
  const gender = 'male'; // Default gender
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
  return Math.max(0, bac) * 10; // Convert to promille
}