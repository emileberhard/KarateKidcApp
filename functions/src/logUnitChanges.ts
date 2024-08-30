import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const logUnitChanges = onValueWritten({
  ref: '/users/{userId}/units',
  region: 'europe-west1',
}, async (event) => {
  const userId = event.params.userId;
  const oldValue = event.data.before.val();
  const newValue = event.data.after.val();

  if (oldValue === newValue) {
    return null;
  }

  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  const logRef = db.ref('unit_log');

  try {
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      console.log(`User not found for userId: ${userId}`);
      return null;
    }

    const logEntry = {
      userId,
      firstName: user.firstName,
      lastName: user.lastName,
      oldUnits: oldValue,
      newUnits: newValue,
      change: newValue - oldValue,
      timestamp: admin.database.ServerValue.TIMESTAMP
    };

    await logRef.push(logEntry);

    console.log(`Logged unit change for user ${userId}: ${oldValue} -> ${newValue}`);
    return null;
  } catch (error) {
    console.error('Error logging unit change:', error);
    return null;
  }
});