import * as admin from "firebase-admin";
import * as apn from "apn";

let apnProvider: apn.Provider;
let isProduction: boolean = false;

interface NotificationData {
  title: string;
  body: string;
  data: Record<string, string>;
}

export async function initializeNotificationService(users: Record<string, any>) {
  isProduction = Object.values(users).some(user => user.profile === "production");

  apnProvider = new apn.Provider({
    token: {
      key: process.env.APN_KEY_PATH || "./ApnsKey.p8",
      keyId: process.env.APN_KEY_ID || "F59KT9N498",
      teamId: process.env.APN_TEAM_ID || "NNP2B278S6",
    },
    production: isProduction,
  });
}

export async function sendNotifications(users: Record<string, any>, notificationData: NotificationData) {
  const fcmMessages: admin.messaging.Message[] = [];
  const apnsMessages: apn.Notification[] = [];

  for (const userId in users) {
    const user = users[userId];
    if (!user.muted && user.pushToken && user.platform) {
      if (user.platform === "android") {
        fcmMessages.push(createFCMMessage(user.pushToken, notificationData));
      } else if (user.platform === "ios") {
        apnsMessages.push(createAPNSMessage(notificationData));
      }
    }
  }

  await sendFCMNotifications(fcmMessages);
  await sendAPNSNotifications(apnsMessages, users);
}

function createFCMMessage(token: string, notificationData: NotificationData): admin.messaging.Message {
  return {
    token: token,
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
  };
}

function createAPNSMessage(notificationData: NotificationData): apn.Notification {
  const notification = new apn.Notification();
  notification.alert = {
    title: notificationData.title,
    body: notificationData.body,
  };
  notification.payload = notificationData.data;
  notification.topic = process.env.FUNCTIONS_CONFIG_APN_BUNDLE_ID || "com.emileberhard.karatekidc";
  notification.sound = "notification.wav";
  return notification;
}

async function sendFCMNotifications(fcmMessages: admin.messaging.Message[]) {
  if (fcmMessages.length > 0) {
    try {
      const response = await admin.messaging().sendAll(fcmMessages);
      console.log("FCM Notifications sent:", JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error sending FCM notifications:", error);
    }
  }
}

async function sendAPNSNotifications(apnsMessages: apn.Notification[], users: Record<string, any>) {
  if (apnsMessages.length > 0) {
    try {
      // Find the first non-muted iOS user's token
      const apnsToken = Object.values(users).find(user => user.platform === "ios" && !user.muted)?.pushToken;
      if (!apnsToken) {
        console.log("No valid APNS token found for non-muted iOS users");
        return;
      }
      const results = await Promise.all(
        apnsMessages.map((notification) => apnProvider.send(notification, apnsToken))
      );
      console.log("APNS Notifications sent:", JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("Error sending APNS notifications:", error);
    }
  }
}

export function shutdownNotificationService() {
  if (apnProvider) {
    apnProvider.shutdown();
  }
}