import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Platform,
  View,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import {
  ref,
  onValue,
  push,
  serverTimestamp,
  increment,
  set,
  child,
} from "firebase/database";
import { database } from "../../firebaseConfig";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { HelloWave } from "@/components/HelloWave";
import { ScrollView } from "react-native-gesture-handler";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import HomeSlider from "@/components/HomeSlider";
import TakeUnitButton from "@/components/TakeUnitButton";
import { Image } from "react-native";
import kkLogo from "@/assets/images/kk_logo.png";
import SettingsMenu from "@/components/SettingsMenu";
import UnitPurchaseButton from "@/components/UnitPurchaseButton";
import { TodaysEvents } from "@/components/TodaysEvents";

import { DrinkEntry } from "../../firebaseConfig";
import { useAuth } from "@/hooks/useAuth";

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [_, setEstimatedBAC] = useState<number>(0);
  const [safeArrival, setSafeArrival] = useState<string | null>(null);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9;
  const LOGO_SIZE = SCREEN_WIDTH * 0.4;

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
          setSafeArrival(userData.safeArrival || null);
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

  const takeUnit = useCallback(async () => {
    if (user && user.firstName && units > 0) {
      try {
        const userRef = ref(database, `users/${user.firstName}`);

        await set(child(userRef, "units"), increment(-1));

        const newDrinkRef = push(child(userRef, "unitTakenTimestamps"));
        await set(newDrinkRef, serverTimestamp());
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

  const resetSlider = useCallback(() => {
    if (user && user.firstName) {
      const safeArrivalRef = ref(
        database,
        `users/${user.firstName}/safeArrival`
      );
      set(safeArrivalRef, null);
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#460038" />
      <GestureHandlerRootView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <ThemedView>
            <SettingsMenu onResetSlider={resetSlider} />
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
            </ThemedView>
            {user ? (
              <View style={styles.userContentContainer}>
                <View style={styles.unifiedButtonContainer}>
                  <TakeUnitButton onPress={takeUnit} units={units} size={250} />
                  <View style={styles.logoAndPurchaseContainer}>
                    <Image
                      source={kkLogo}
                      style={[
                        styles.logo,
                        { width: LOGO_SIZE, height: LOGO_SIZE },
                      ]}
                      resizeMode="contain"
                    />
                    <UnitPurchaseButton />
                  </View>
                </View>
                <TodaysEvents />
              </View>
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
              isActive={!!safeArrival}
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  headerContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 25,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  welcomeText: {
    fontWeight: "bold",
    fontSize: 19,
    color: "#ffb4e4",
    marginBottom: 10,
  },
  logo: {
    marginBottom: 20,
    marginTop: -30,
    marginLeft: 10,
  },
  userContentContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  unifiedButtonContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
  },
  logoAndPurchaseContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  googleSignInContainer: {
    alignItems: "center",
    marginTop: 50,
  },
  arrivalButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});
