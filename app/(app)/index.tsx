import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Platform,
  View,
  ActivityIndicator,
} from "react-native";
import {
  ref,
  onValue,
  push,
  increment,
  set,
  update,
  child,
} from "firebase/database";
import { database } from "../../firebaseConfig";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { HelloWave } from "@/components/HelloWave";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import HomeSlider from "@/components/HomeSlider";
import TakeUnitButton from "@/components/TakeUnitButton";
import { Image } from "react-native";
import kkLogo from "@/assets/images/kk_logo.png";
import SettingsMenu from "@/components/SettingsMenu";
import UnitPurchaseButton from "@/components/UnitPurchaseButton";
import { TodaysEvents } from "@/components/TodaysEvents";
import { ResponsiblePhaddersPanel } from "@/components/ResponsiblePhaddersPanel";
import UpcomingEvents from "@/components/UpcomingEvents";

import { DrinkEntry } from "../../firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { ScrollView } from "react-native";
import { theme } from "@/theme";
import PhoneNumberPrompt from "@/components/PhoneNumberPrompt";
import { useDebugSettings } from "@/hooks/useDebugSettings";

export default function HomeScreen() {
  const { user } = useAuth();
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [_, setEstimatedBAC] = useState<number>(0);
  const [safeArrival, setSafeArrival] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showHomeSlider, _setShowHomeSlider] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [debugTime, setDebugTime] = useState<Date | null>(null);
  const { debugMode } = useDebugSettings();

  useEffect(() => {
    if (user) {
      const userRef = ref(database, `users/${user.userId}`);

      const unsubscribe = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
         
          if (!userData.phoneNumber) {
            setShowPhonePrompt(true);
          }
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
        setIsLoading(false);
      });

      // Add a listener for debug time
      const debugTimeRef = ref(database, 'debugTime');
      const unsubscribeDebugTime = onValue(debugTimeRef, (snapshot) => {
        const debugTimeValue = snapshot.val();
        if (debugTimeValue) {
          setDebugTime(new Date(debugTimeValue));
        } else {
          setDebugTime(null);
        }
      });

      return () => {
        unsubscribe();
        unsubscribeDebugTime();
      };
    }
  }, [user]);

  const handlePhoneSubmit = useCallback((phoneNumber: string) => {
    if (user && user.userId) {
      const userRef = ref(database, `users/${user.userId}`);
      update(userRef, { phoneNumber })
        .then(() => {
          setShowPhonePrompt(false);
         
        })
        .catch((error) => {
          console.error("Error saving phone number:", error);
         
        });
    }
  }, [user]);

  // Function to get the current time (either debug time or actual time)
  const getCurrentTime = useCallback(() => {
    return debugTime || new Date();
  }, [debugTime]);

  const calculateBAC = useCallback((drinkEntries: DrinkEntry[]): number => {
    const weight = 70;
    const gender = "male";
    const metabolismRate = gender === "male" ? 0.015 : 0.017;
    const bodyWaterConstant = gender === "male" ? 0.68 : 0.55;

    const now = getCurrentTime().getTime();
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
  }, [getCurrentTime]);

  const takeUnit = useCallback(async () => {
    if (user && user.userId && units > 0) {
      try {
        const userRef = ref(database, `users/${user.userId}`);

        await set(child(userRef, "units"), increment(-1));

        const newDrinkRef = push(child(userRef, "unitTakenTimestamps"));
        await set(newDrinkRef, getCurrentTime().getTime());
      } catch (error) {
        console.error("Error taking unit:", error);
      }
    }
  }, [user, units, drinks, getCurrentTime]);

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb4e4" />
      </View>
    );
  }

  return (
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
            <ThemedText bold style={styles.welcomeText}>
              Välkommen till dojen!
            </ThemedText>
          </ThemedView>
          {user && (
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
              {showHomeSlider && (
                <View style={styles.homeSliderContainer}>
                  <HomeSlider
                    onSlideComplete={arrivedHomeSafely}
                    text="Bekräfta Hemkomst"
                    isActive={!!safeArrival}
                  />
                </View>
              )}
              <ResponsiblePhaddersPanel />
              <TodaysEvents debugMode={debugMode} />
              <UpcomingEvents />
            </View>
          )}
        </ThemedView>
      </ScrollView>
      <PhoneNumberPrompt 
        isVisible={showPhonePrompt} 
        onSubmit={handlePhoneSubmit} 
        isAdmin={user?.admin || false} 
      />
      {debugTime && (
        <ThemedText style={styles.debugTimeText}>
          Debug Time: {debugTime.toLocaleString()}
        </ThemedText>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#460038",
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
    color: "white",
    fontFamily: theme.fonts.bold,
  },
  welcomeText: {
    fontSize: 18,
    marginLeft: 2,
    fontFamily: theme.fonts.bold,
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
    marginBottom: 10,
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
  contentContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 55 : 45,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 90, 
  },
  homeSliderContainer: {
    marginBottom: 10,

  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#460038',
  },
  debugTimeText: {
    color: 'yellow',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});
