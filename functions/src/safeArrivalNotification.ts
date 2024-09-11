import { onValueCreated } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';
import { initializeNotificationService, sendNotifications, shutdownNotificationService } from "./notificationService";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const safeArrivalNotification = onValueCreated({
  ref: '/users/{userId}/safeArrival',
  region: 'europe-west1',
}, async (event) => {
  const safeArrival = event.data.val();
  const userId = event.params.userId;

  console.log(`New safe arrival value: ${safeArrival}`);

  // Stop if the new value is null
  if (safeArrival === null) {
    console.log(`Skipping notification for user ${userId} as safe arrival is null`);
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

    // Fetch all admin users
    const adminUsersSnapshot = await db.ref('users').orderByChild('admin').equalTo(true).once('value');
    const adminUsers = adminUsersSnapshot.val();

    if (adminUsers) {
      console.log(`Sending notification to admin users:`, JSON.stringify(adminUsers, null, 2));

      await initializeNotificationService(adminUsers);
      await sendNotifications(adminUsers, {
        title: `${user.firstName} har gått hem 🏠`,
        body: `${user.firstName} har markerat sig själv som hemkommen`,
        data: { userId: userId, safeArrival: 'true' }
      });
    } else {
      console.log(`No admin users found. No notification sent.`);
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