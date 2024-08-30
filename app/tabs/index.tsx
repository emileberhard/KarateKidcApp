import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Platform,
  View,
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
import { ScrollView } from "react-native";

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [_, setEstimatedBAC] = useState<number>(0);
  const [safeArrival, setSafeArrival] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.userId}`);

      const unsubscribe = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          setUnits(userData.units || 0);
          setFirstName(userData.firstName || "");

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
    if (user && user.userId && units > 0) {
      try {
        const userRef = ref(database, `users/${user.userId}`);

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
    if (user && user.userId) {
      const safeArrivalRef = ref(
        database,
        `users/${user.userId}/safeArrival`
      );
      set(safeArrivalRef, new Date().toISOString());
    }
  };

  const resetSlider = useCallback(() => {
    if (user && user.userId) {
      const safeArrivalRef = ref(
        database,
        `users/${user.userId}/safeArrival`
      );
      set(safeArrivalRef, null);
    }
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#460038" />
      <GestureHandlerRootView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.contentContainer}>
            <SettingsMenu onResetSlider={resetSlider} />
            <ThemedView style={styles.headerContainer}>
              <ThemedView style={styles.titleContainer}>
                <ThemedText style={styles.titleText}>
                  {user ? `Osu, ${firstName}` : "Osu"}
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
                    <View style={styles.logoContainer}>
                      <Image
                        source={kkLogo}
                        style={styles.logo}
                        resizeMode="contain"
                      />
                    </View>
                    <UnitPurchaseButton />
                  </View>
                </View>
                <View style={styles.homeSliderContainer}>
                  <HomeSlider
                    onSlideComplete={arrivedHomeSafely}
                    text="Bekräfta Hemkomst"
                    isActive={!!safeArrival}
                  />
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
  },
  headerContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 10,
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
    width: '90%',
    height: '90%',
  },
  userContentContainer: {
    flex: 1,
    width: "100%",
  },
  unifiedButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoAndPurchaseContainer: {
    flexDirection: "column",
    flex: 1,
    paddingLeft: 20,
  },
  logoContainer: {
    marginBottom: 30,
    marginRight: -10,
    position: 'absolute',
    top: -150,
    left: 10,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
  contentContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 90, 
  },
  homeSliderContainer: {
    marginBottom: 20,
  },

});
