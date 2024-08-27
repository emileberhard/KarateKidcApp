import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const resetUnitsDaily = onSchedule({
  schedule: '0 12 * * *',
  timeZone: 'Europe/Stockholm',
  region: 'europe-west1',
}, async (_) => {
  const db = admin.database();
  const usersRef = db.ref('users');

  try {
    const snapshot = await usersRef.once('value');
    const updates: { [key: string]: any } = {};

    snapshot.forEach((childSnapshot) => {
      const userKey = childSnapshot.key;
      if (userKey) {
        updates[`${userKey}/unitTakenTimestamps`] = null;
        updates[`${userKey}/units`] = 0;
        updates[`${userKey}/safe/notifications`] = [];
        updates[`${userKey}/safeArrival`] = null;
      }
    });

    await usersRef.update(updates);

    console.log('Successfully reset units, timestamps, and safeArrival for all users');
    return null;
  } catch (error) {
    console.error('Error resetting units:', error);
    return null;
  }
});

export const resetSafeArrivalDaily = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Europe/Stockholm',
  region: 'europe-west1',
}, async (_) => {
  const db = admin.database();
  const usersRef = db.ref('users');

  try {
    const snapshot = await usersRef.once('value');
    const updates: { [key: string]: any } = {};

    snapshot.forEach((childSnapshot) => {
      const userKey = childSnapshot.key;
      if (userKey) {
        updates[`${userKey}/safeArrival`] = null;
      }
    });

    await usersRef.update(updates);

    console.log('Successfully reset safeArrival for all users');
    return null;
  } catch (error) {
    console.error('Error resetting safeArrival:', error);
    return null;
  }
});