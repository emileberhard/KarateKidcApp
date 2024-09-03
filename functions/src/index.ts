import * as admin from "firebase-admin";

admin.initializeApp();

export { getCompletion } from './getCompletion';
export { resetUnitsDaily, resetSafeArrivalDaily } from './resetUnitsDaily';
export { checkAlcoholLevelsAndNotify } from './bacNotifications';
export { notifyAdminsOnSafeArrival } from './safeArrivalNotification';
export { sendAnnouncement } from './sendAnnouncement';

export * from './notificationService';

export { logUnitChanges } from './logUnitChanges';
export { sendSwishReturnNotification } from './sendSwishReturnNotification';
export { getEvents } from './getEvents';