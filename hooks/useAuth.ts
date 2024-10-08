import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { getDevicePushTokenAsync } from "expo-notifications";

interface UserData {
  userId: string;
  admin?: boolean;
  safeArrival?: string;
  units?: number;
  unitTakenTimestamps?: Record<string, number>;
  lastName?: string;
  pushToken?: string;
  firstName: string;
  email: string;
  platform?: string;
  profile?: string;
}

export function useAuth() {
  const auth = getAuth();
  const database = getDatabase();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const usersRef = ref(database, 'users');
        onValue(usersRef, async (snapshot) => {
          const usersData = snapshot.val();
          const userEntry = Object.entries(usersData).find(([_, userData]: [string, UserData]) => userData.userId === firebaseUser.uid);
          
          if (userEntry) {
            const [firstName, userData] = userEntry as [string, UserData];
            const userObj: UserData = {
              userId: firebaseUser.uid,
              email: firebaseUser.email || '',
              admin: userData.admin || false,
              safeArrival: userData.safeArrival,
              units: userData.units || 0,
              unitTakenTimestamps: userData.unitTakenTimestamps || {},
              firstName,
              lastName: userData.lastName,
              pushToken: userData.pushToken,
            };
            setUser(userObj);

            if (Platform.OS !== "web") {
              const currentPlatform = Platform.OS;
              const currentProfile = process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
              const currentToken = await getDevicePushTokenAsync();
              
              if (!userData.pushToken || 
                  userData.platform !== currentPlatform || 
                  userData.profile !== currentProfile ||
                  userData.pushToken !== currentToken.data) {
                await configurePushNotifications(firstName, currentToken);
              }
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const configurePushNotifications = async (firstName: string, currentToken: Notifications.DevicePushToken) => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Failed to get push token for push notification!");
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      console.log("Push token:", currentToken);

      const currentPlatform = Platform.OS;
      const currentProfile = process.env.EXPO_PUBLIC_EAS_BUILD_PROFILE;
      
      const userRef = ref(database, `users/${firstName}`);
      await update(userRef, { 
        pushToken: currentToken.data, 
        platform: currentPlatform, 
        profile: currentProfile 
      });
      
    } catch (error) {
      console.error("Error updating push token:", error);
    }
  };

  return { user, loading };
}