import React, { useState, useEffect, useCallback } from "react";
import {
  Image,
  StyleSheet,
  Platform,
  View,
  useWindowDimensions,
  SafeAreaView,
  ImageSourcePropType,
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
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import HomeSlider from "@/components/HomeSlider";
import TakeUnitButton from "@/components/TakeUnitButton";
import PromilleMeter from "@/components/PromilleMeter";

import { DrinkEntry } from "../../firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import KarateKidcLogo from "@/assets/images/karatekidc_logo.png";

const KarateKidcLogoTyped = KarateKidcLogo as ImageSourcePropType;

const PROMILLE_WARNING_THRESHOLD = 2.0;

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [estimatedBAC, setEstimatedBAC] = useState<number>(0);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9;
  const [lastNotificationTimestamp, setLastNotificationTimestamp] =
    useState<number>(0);

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

            if (promille >= PROMILLE_WARNING_THRESHOLD) {
              console.log("Sending warning notification...");
              sendWarningNotification(
                { uid: user.userId, firstName: user.firstName },
                promille
              );
            }
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

      const firstName = user.displayName?.split(" ")[0] || "User";
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ STUPFULL NOLLA ⚠️",
          body: `${firstName} har ${promille.toFixed(
            2
          )} promille alkohol i blodet`,
          data: { userId: user.uid, promille: promille.toString() },
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

        const currentTime = Date.now();
        if (
          newPromille >= PROMILLE_WARNING_THRESHOLD &&
          currentTime - lastNotificationTimestamp > 5 * 60 * 1000
        ) {
          console.log("Sending warning notification...");
          await sendWarningNotification(
            { uid: user.userId, firstName: user.firstName },
            newPromille
          );
          setLastNotificationTimestamp(currentTime);
        }
      } catch (error) {
        console.error("Error taking unit:", error);
      }
    }
  }, [user, units, drinks, lastNotificationTimestamp]);

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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ParallaxScrollView
          headerBackgroundColor={{ light: "#FFFFFF", dark: "#1D3D47" }}
          headerImage={
            <View style={styles.logoContainer}>
              <Image
                source={KarateKidcLogoTyped}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          }
        >
          <ThemedView style={styles.contentContainer}>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">
                {user ? `Konnichiwa, ${user.firstName}` : "Konnichiwa"}
              </ThemedText>
              <HelloWave />
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
              {user ? (
                <>
                  <ThemedText type="default" style={styles.welcomeText}>
                    Välkommen till dojon!
                  </ThemedText>
                  <View style={styles.buttonContainer}>
                    <TakeUnitButton
                      onPress={takeUnit}
                      units={units}
                      width={BUTTON_WIDTH}
                    />
                    <PromilleMeter
                      promille={estimatedBAC}
                      width={BUTTON_WIDTH}
                    />
                  </View>
                </>
              ) : (
                <>
                  <ThemedText type="default" style={styles.welcomeText}>
                    Välkommen till dojon! Var vänlig och logga in för att komma
                    igng.
                  </ThemedText>
                  <View style={styles.googleSignInContainer}>
                    <GoogleSignInButton />
                  </View>
                </>
              )}
            </ThemedView>
          </ThemedView>
        </ParallaxScrollView>
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  logoContainer: {
    backgroundColor: "#ff00bb",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: "90%",
    height: "90%",
  },
  welcomeText: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 25,
    color: "#ffa9e8",
  },
  contentContainer: {
    gap: 1,
  },
  googleSignInContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: "center",
    gap: 20,
  },
  bacText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    color: "#ffa9e8",
  },
  arrivalButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
