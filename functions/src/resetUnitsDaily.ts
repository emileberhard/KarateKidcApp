import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize the app if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp();
}

export const resetUnitsDaily = functions
  .region('europe-west1') 
  .pubsub.schedule('0 12 * * *')
  .timeZone('Europe/Stockholm')
  .onRun(async (_) => {
    const db = admin.database();
    const usersRef = db.ref('users');

    try {
      // Get all users
      const snapshot = await usersRef.once('value');
      const updates: { [key: string]: any } = {};

      snapshot.forEach((childSnapshot) => {
        const userKey = childSnapshot.key;
        if (userKey) {
          // Reset unitTakenTimestamps and units for each user
          updates[`${userKey}/unitTakenTimestamps`] = null;
          updates[`${userKey}/units`] = 0;
        }
      });

      // Apply all updates in a single operation
      await usersRef.update(updates);

      console.log('Successfully reset units and timestamps for all users');
      return null;
    } catch (error) {
      console.error('Error resetting units:', error);
      return null;
    }
  });