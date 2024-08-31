import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { initializeNotificationService, sendNotifications, shutdownNotificationService } from "./notificationService";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const sendSwishReturnNotification = onCall({
  region: "europe-west1",
  enforceAppCheck: false,
}, async (request) => {
  console.log("Function called with request:", request);
  console.log("Auth context:", request.auth);

  if (!request.auth) {
    console.error("No auth context provided");
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = request.auth.uid;
  console.log("User ID:", userId);

  try {
    const db = admin.database();
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      throw new HttpsError("not-found", "User not found.");
    }

   
    await new Promise(resolve => setTimeout(resolve, 5500));

    await initializeNotificationService({ [userId]: user });
    await sendNotifications({ [userId]: user }, {
      title: "Återgå till appen",
      body: "Klicka här för att gå tillbaka till appen",
      data: { type: "swish_return" }
    });

    return { success: true, message: "Notification sent successfully" };
  } catch (error) {
    console.error('Error sending Swish return notification:', error);
    throw new HttpsError("internal", "Error sending notification");
  } finally {
    shutdownNotificationService();
  }
});