import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Platform,
  View,
  useWindowDimensions,
  SafeAreaView,
} from "react-native";
import {
  ref,
  onValue,
  push,
  serverTimestamp,
  increment,
  set,
  getDatabase,
  get,
  child,
} from "firebase/database";
import { database } from "../../firebaseConfig";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { HelloWave } from "@/components/HelloWave";
import { ScrollView } from "react-native-gesture-handler";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import HomeSlider from "@/components/HomeSlider";
import TakeUnitButton from "@/components/TakeUnitButton";
import { Image } from "react-native";
import kkLogo from "@/assets/images/kk_logo.png";
import { TouchableOpacity } from "react-native";
import { getAuth, signOut } from "firebase/auth";

import { DrinkEntry } from "../../firebaseConfig";
import { useAuth } from "@/hooks/useAuth";

const PROMILLE_WARNING_THRESHOLD = 2.0;

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [_, setEstimatedBAC] = useState<number>(0);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9;

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.firstName}`);

      const unsubscribe = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          setUnits(userData.units || 0);

          if (userData.unitTakenTimestamps) {
            const drinkEntries: DrinkEntry[] = Object.entries(
              userData.unitTakenTimestamps
            ).map(([_, timestamp]) => ({
              timestamp: timestamp as number,
              units: 1,
            }));
            setDrinks(drinkEntries);
            const promille = calculateBAC(drinkEntries);
            setEstimatedBAC(promille);
          } else {
            setDrinks([]);
            setEstimatedBAC(0);
          }
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  const calculateBAC = (drinkEntries: DrinkEntry[]): number => {
    const weight = 70;
    const gender = "male";
    const metabolismRate = gender === "male" ? 0.015 : 0.017;
    const bodyWaterConstant = gender === "male" ? 0.68 : 0.55;

    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;

    let totalAlcohol = 0;
    drinkEntries.forEach((entry) => {
      if (entry.timestamp > last24Hours) {
        const hoursAgo = (now - entry.timestamp) / (60 * 60 * 1000);
        const remainingAlcohol = Math.max(
          0,
          entry.units * 10 - hoursAgo * metabolismRate
        );
        totalAlcohol += remainingAlcohol;
      }
    });

    const bac = (totalAlcohol / (weight * 1000 * bodyWaterConstant)) * 100;
    const promille = Math.max(0, bac) * 10;
    return promille;
  };

  const sendWarningNotification = async (
    user: { uid: string; firstName: string; displayName?: string },
    promille: number
  ) => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const firstName = user.firstName || "User";
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `️ FYLLEVARNING PÅ ${firstName.toUpperCase()} ️`,
          body: `${firstName} har ${promille.toFixed(
            2
          )} promille alkohol i blodet`,
          data: { userId: user.uid, promille: promille.toString() },
          sound: "notification.wav", // Add this line to specify the custom sound
        },
        trigger: null,
      });

      const db = getDatabase();
      const notificationsRef = ref(db, "notifications/highPromille");
      const newNotificationRef = push(notificationsRef);
      await set(newNotificationRef, {
        userId: user.uid,
        firstName,
        promille,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending warning notification:", error);
    }
  };

  const takeUnit = useCallback(async () => {
    if (user && user.firstName && units > 0) {
      try {
        const userRef = ref(database, `users/${user.firstName}`);

        await set(child(userRef, "units"), increment(-1));

        const newDrinkRef = push(child(userRef, "unitTakenTimestamps"));
        await set(newDrinkRef, serverTimestamp());

        const newDrinkSnapshot = await get(newDrinkRef);
        const newDrink = { timestamp: newDrinkSnapshot.val(), units: 1 };

        const updatedDrinks = [...drinks, newDrink];
        const newPromille = calculateBAC(updatedDrinks);

        if (newPromille >= PROMILLE_WARNING_THRESHOLD) {
          console.log("Sending warning notification...");
          await sendWarningNotification(
            { uid: user.userId, firstName: user.firstName },
            newPromille
          );
        }
      } catch (error) {
        console.error("Error taking unit:", error);
      }
    }
  }, [user, units, drinks]);

  const arrivedHomeSafely = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (user && user.firstName) {
      const safeArrivalRef = ref(
        database,
        `users/${user.firstName}/safeArrival`
      );
      set(safeArrivalRef, new Date().toISOString());
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // The useAuth hook will automatically update the user state
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <ThemedView style={styles.contentContainer}>
            <ThemedView style={styles.headerContainer}>
              <ThemedView style={styles.titleContainer}>
                <ThemedText style={styles.titleText}>
                  {user ? `Osu, ${user.firstName}` : "Osu"}
                </ThemedText>
                <HelloWave />
              </ThemedView>
              <ThemedText style={styles.welcomeText}>
                Välkommen till dojon!
              </ThemedText>
              <Image
                source={kkLogo}
                style={[styles.logo, { width: 140, height: 140 }]}
                resizeMode="contain"
              />
            </ThemedView>
            {user ? (
              <>
                <View style={styles.takeUnitButtonContainer}>
                  <TakeUnitButton onPress={takeUnit} units={units} size={250} />
                </View>
                <View style={styles.spacer} />
                <View style={styles.logoutButtonContainer}>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                  >
                    <ThemedText style={styles.logoutButtonText}>
                      LOGGA UT
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.googleSignInContainer}>
                <GoogleSignInButton />
              </View>
            )}
          </ThemedView>
        </ScrollView>
        {user && (
          <View style={styles.arrivalButtonContainer}>
            <HomeSlider
              onSlideComplete={arrivedHomeSafely}
              text="Bekräfta Hemkomst"
              width={BUTTON_WIDTH}
            />
          </View>
        )}
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#460038",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 25,
    gap: 10,
    minHeight: "100%", // Ensure the content container takes up at least the full screen height
    justifyContent: "space-between", // Distribute space between elements
  },
  headerContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  welcomeText: {
    fontWeight: "bold",
    fontSize: 20,
    color: "#ffb4e4",
    marginBottom: -25,
    marginTop: 8,
  },
  logo: {
    position: "absolute",
    top: 50,
    left: 210,
  },
  stepContainer: {
    gap: 8,
  },
  googleSignInContainer: {
    alignItems: "center",
    paddingVertical: 200,
  },
  buttonContainer: {
    alignItems: "center",
    gap: 20,
  },
  unitsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  arrivalButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  takeUnitButtonContainer: {
    position: "absolute",
    top: 125,
    left: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1, // This will push the logout button to the bottom
  },
  logoutButtonContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 100, // Add some margin at the bottom for better scrolling
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    width: "100%",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});
