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

import { DrinkEntry } from "../../firebaseConfig";
import { useAuth } from "@/hooks/useAuth";

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [_, setEstimatedBAC] = useState<number>(0);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9;
  const LOGO_SIZE = SCREEN_WIDTH * 0.37; // 30% of screen width

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#460038" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <ThemedView style={styles.contentContainer}>
            <SettingsMenu />
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
                style={[styles.logo, { width: LOGO_SIZE, height: LOGO_SIZE }]}
                resizeMode="contain"
              />
            </ThemedView>
            {user ? (
              <>
                <View style={styles.takeUnitButtonContainer}>
                  <TakeUnitButton onPress={takeUnit} units={units} size={250} />
                </View>
                <View style={styles.unitPurchaseButtonContainer}>
                  <UnitPurchaseButton />
                </View>
                <View style={styles.spacer} />
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 25,
    gap: 10,
    minHeight: "100%",
    justifyContent: "space-between",
    marginTop: -10,
  },
  headerContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 20,
    marginTop: -10,
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
    fontSize: 19,
    color: "#ffb4e4",
    marginBottom: -25,
  },
  logo: {
    position: "absolute",
    top: 60,
    right: -10,
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
    bottom: 350,
    left: 20,
  },
  unitPurchaseButtonContainer: {
    position: "absolute",
    bottom: 302,
    left: 210,
    right: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
    zIndex: -15,
  },
});
