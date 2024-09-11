import * as admin from "firebase-admin";
import * as apn from "apn";

let apnProviders: Record<string, apn.Provider> = {};

interface NotificationData {
  title: string;
  body: string;
  data: Record<string, string>;
}

export async function initializeNotificationService(users: Record<string, any>) {
  console.log("Initializing Notification Service");
  for (const userId in users) {
    const user = users[userId];
    if (user.platform === "ios") {
      console.log(`Initializing APN Provider for user ${userId}`);
      apnProviders[userId] = new apn.Provider({
        token: {
          key: process.env.APN_KEY_PATH || "./ApnsKey.p8",
          keyId: process.env.APN_KEY_ID || "F59KT9N498",
          teamId: process.env.APN_TEAM_ID || "NNP2B278S6",
        },
        production: user.profile === "production",
      });
    }
  }
  console.log(`Initialized ${Object.keys(apnProviders).length} APN Providers`);
}

export async function sendNotifications(users: Record<string, any>, notificationData: NotificationData) {
  console.log("Sending notifications", { notificationData });
  const fcmMessages: admin.messaging.Message[] = [];
  const apnsMessages: NotificationData[] = [];

  for (const userId in users) {
    const user = users[userId];
    if (!user.muted && user.pushToken && user.platform) {
      if (user.platform === "android") {
        fcmMessages.push(createFCMMessage(user.pushToken, notificationData));
      } else if (user.platform === "ios") {
        apnsMessages.push(notificationData);
      }
    }
  }

  console.log(`Prepared ${fcmMessages.length} FCM messages and ${apnsMessages.length} APNS messages`);

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
    console.log(`Sending ${fcmMessages.length} FCM notifications`);
    try {
      const response = await admin.messaging().sendAll(fcmMessages);
      console.log("FCM Notifications sent:", JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Error sending FCM notifications:", error);
    }
  } else {
    console.log("No FCM notifications to send");
  }
}

async function sendAPNSNotifications(apnsMessages: NotificationData[], users: Record<string, any>) {
  if (apnsMessages.length > 0) {
    console.log(`Sending ${apnsMessages.length} APNS notifications`);
    try {
      const results = await Promise.all(
        Object.entries(users).map(([userId, user]) => {
          if (user.platform === "ios" && !user.muted && user.pushToken) {
            const provider = apnProviders[userId];
            if (provider) {
              console.log(`Sending APNS notification to user ${userId}`);
              return provider.send(createAPNSMessage(apnsMessages[0]), user.pushToken);
            } else {
              console.warn(`No APN provider found for user ${userId}`);
            }
          }
          return Promise.resolve(null);
        })
      );
      console.log("APNS Notifications sent:", JSON.stringify(results.filter(Boolean), null, 2));
    } catch (error) {
      console.error("Error sending APNS notifications:", error);
    }
  } else {
    console.log("No APNS notifications to send");
  }
}

export function shutdownNotificationService() {
  console.log("Shutting down Notification Service");
  for (const provider of Object.values(apnProviders)) {
    provider.shutdown();
  }
  apnProviders = {};
  console.log("Notification Service shut down");
}