import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';
import { initializeNotificationService, sendNotifications, shutdownNotificationService } from "./notificationService";

if (!admin.apps.length) {
  admin.initializeApp();
}

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
      await initializeNotificationService(adminUsers);
      await sendNotifications(adminUsers, {
        title: `Nolla har kommit hem säkert 🏠`,
        body: `${user.firstName} har markerat sig själv som hemkommen`,
        data: { userId: userId, safeArrival: 'true' }
      });
    }

    return null;
  } catch (error) {
    console.error('Error processing safe arrival notification:', error);
    return null;
  }
});

process.on('exit', () => {
  shutdownNotificationService();
});