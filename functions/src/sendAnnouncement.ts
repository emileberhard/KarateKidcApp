import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { initializeNotificationService, sendNotifications, shutdownNotificationService } from "./notificationService";

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

export const sendAnnouncement = onCall(
  {
    region: "europe-west1",
  },
  async (request) => {
    if (!dbUsers) {
      await fetchUsers();
      await initializeNotificationService(dbUsers);
    }

    
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

    await sendNotifications(dbUsers, {
      title: "KK-MEDDELANDE ⚠️🥷",
      body: message,
      data: { type: "announcement" },
    });

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
  shutdownNotificationService();
});
