import { onValueCreated } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';
import { initializeNotificationService, sendNotifications, shutdownNotificationService } from "./notificationService";

const PROMILLE_WARNING_THRESHOLD = 2.0;


if (!admin.apps.length) {
  admin.initializeApp();
}


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
        await initializeNotificationService(adminUsers);
        await sendNotifications(adminUsers, {
          title: `⚠️ FYLLEVARNING PÅ ${user.firstName.toUpperCase()} ⚠️`,
          body: `${user.firstName} har ${promille.toFixed(2)} promille alkohol i blodet`,
          data: { userId: userId, promille: promille.toString() }
        });
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
  shutdownNotificationService();
});