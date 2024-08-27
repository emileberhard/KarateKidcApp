import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as apn from "apn";

let dbUsers: Record<string, User> | null = null;

interface User {
  admin?: boolean;
  userId: string;
  profile?: string;
  pushToken?: string;
  platform?: string;
}

async function fetchUsers() {
  const db = admin.database();
  const usersSnapshot = await db.ref("users").once("value");
  dbUsers = usersSnapshot.val();
}


let apnProvider: apn.Provider;

async function initializeApnProvider() {
  await fetchUsers();
  const isProduction = Object.values(dbUsers || {}).some(user => user.profile === "production");

  apnProvider = new apn.Provider({
    token: {
      key: process.env.APN_KEY_PATH || "./ApnsKey.p8",
      keyId: process.env.APN_KEY_ID || "F59KT9N498",
      teamId: process.env.APN_TEAM_ID || "NNP2B278S6",
    },
    production: isProduction,
  });
}

export const sendAnnouncement = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    if (!apnProvider) {
      await initializeApnProvider();
    }

    // Check if the caller is an admin
    if (!request.auth || !(await isUserAdmin(request.auth.uid))) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can send announcements."
      );
    }

    const { message } = request.data;
    if (!message || typeof message !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "Message must be a non-empty string."
      );
    }

    const fcmMessages: admin.messaging.Message[] = [];
    const apnsMessages: apn.Notification[] = [];

    for (const userId in dbUsers) {
      const user = dbUsers[userId];
      if (user.pushToken && user.platform) {
        const notificationData = {
          title: "Announcement",
          body: message,
          data: { type: "announcement" },
        };

        if (user.platform === "android") {
          fcmMessages.push({
            token: user.pushToken,
            notification: {
              title: notificationData.title,
              body: notificationData.body,
            },
            data: notificationData.data,
            android: {
              notification: {
                sound: "notification",
                priority: "high",
              },
            },
          });
        } else if (user.platform === "ios") {
          const notification = new apn.Notification();
          notification.alert = {
            title: notificationData.title,
            body: notificationData.body,
          };
          notification.payload = notificationData.data;
          notification.topic =
            process.env.FUNCTIONS_CONFIG_APN_BUNDLE_ID ||
            "com.emileberhard.karatekidc";
          notification.sound = "notification.wav";
          apnsMessages.push(notification);
        }
      }
    }

    // Send FCM messages
    if (fcmMessages.length > 0) {
      try {
        const response = await admin.messaging().sendAll(fcmMessages);
        console.log(
          "FCM Announcements sent:",
          JSON.stringify(response, null, 2)
        );
      } catch (error) {
        console.error("Error sending FCM announcements:", error);
      }
    }

    // Send APNS messages
    if (apnsMessages.length > 0) {
      try {
        const results = await Promise.all(
          apnsMessages.map((notification) =>
            apnProvider.send(
              notification,
              dbUsers[Object.keys(dbUsers)[0]].pushToken
            )
          )
        );
        console.log(
          "APNS Announcements sent:",
          JSON.stringify(results, null, 2)
        );
      } catch (error) {
        console.error("Error sending APNS announcements:", error);
      }
    }

    return { success: true, message: "Announcement sent successfully" };
  }
);

async function isUserAdmin(uid: string): Promise<boolean> {
  if (!dbUsers) {
    await fetchUsers();
  }
  const user = Object.values(dbUsers || {}).find(u => u.userId === uid);
  console.log("User info:", user);
  console.log("Admin status:", user?.admin === true);
  return user?.admin === true;
}

process.on("exit", () => {
  apnProvider.shutdown();
});
