import React, { useState, useEffect, useCallback } from 'react';
import { Image, StyleSheet, Platform, View, useWindowDimensions } from 'react-native';
import { ref, onValue, push, serverTimestamp, increment, set, DataSnapshot } from 'firebase/database';
import { database, auth } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import HomeSlider from '@/components/HomeSlider';
import TakeUnitButton from '@/components/TakeUnitButton';
import PromilleMeter from '@/components/PromilleMeter';

import { DrinkEntry } from '../../firebaseConfig';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [units, setUnits] = useState<number>(0);
  const [drinks, setDrinks] = useState<DrinkEntry[]>([]);
  const [estimatedBAC, setEstimatedBAC] = useState<number>(0);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9; // 90% of screen width

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const unitsRef = ref(database, `users/${currentUser.uid}/units`);
        const drinksRef = ref(database, `users/${currentUser.uid}/drinks`);
        
        const unitsUnsubscribe = onValue(unitsRef, (snapshot: DataSnapshot) => {
          const data = snapshot.val();
          setUnits(data || 0);
        });

        const drinksUnsubscribe = onValue(drinksRef, (snapshot: DataSnapshot) => {
          const data = snapshot.val();
          if (data) {
            const drinkEntries: DrinkEntry[] = Object.values(data);
            setDrinks(drinkEntries);
            const promille = calculateBAC(drinkEntries);
            setEstimatedBAC(promille);
            
            // Notify admin if promille is dangerously high
            if (promille >= 2.0 && user) {
              notifyAdmin(user.uid, promille);
            }
          } else {
            setDrinks([]);
            setEstimatedBAC(0);
          }
        });

        return () => {
          unitsUnsubscribe();
          drinksUnsubscribe();
        };
      }
    });

    return () => {
      authUnsubscribe();
    };
  }, []);

  const calculateBAC = (drinkEntries: DrinkEntry[]): number => {
    // This is a simplified BAC calculation and should not be used for actual medical purposes
    const weight = 70; // kg, should be user-specific in a real app
    const gender = 'male'; // should be user-specific in a real app
    const metabolismRate = gender === 'male' ? 0.015 : 0.017;
    const bodyWaterConstant = gender === 'male' ? 0.68 : 0.55;

    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;

    let totalAlcohol = 0;
    drinkEntries.forEach(entry => {
      if (entry.timestamp > last24Hours) {
        const hoursAgo = (now - entry.timestamp) / (60 * 60 * 1000);
        const remainingAlcohol = Math.max(0, entry.units * 10 - (hoursAgo * metabolismRate));
        totalAlcohol += remainingAlcohol;
      }
    });

    const bac = (totalAlcohol / (weight * 1000 * bodyWaterConstant)) * 100;
    const promille = Math.max(0, bac) * 10; // Convert BAC to promille
    return promille;
  };

  const notifyAdmin = (userId: string, promille: number) => {
    const notificationRef = ref(database, 'notifications/highPromille');
    push(notificationRef, {
      userId,
      promille,
      timestamp: serverTimestamp()
    });
  };

  const takeUnit = useCallback(async () => {
    if (user && units > 0) {
      try {
        const unitsRef = ref(database, `users/${user.uid}/units`);
        const drinksRef = ref(database, `users/${user.uid}/drinks`);
        
        // Decrease available units
        await set(unitsRef, increment(-1));
        
        // Add drink entry
        await push(drinksRef, {
          timestamp: serverTimestamp(),
          units: 1
        });
      } catch (error) {
        console.error("Error taking unit:", error);
        // Handle the error appropriately, e.g., show an error message to the user
      }
    }
  }, [user, units]);

  const arrivedHomeSafely = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (user) {
      const safeArrivalRef = ref(database, `users/${user.uid}/safeArrival`);
      set(safeArrivalRef, new Date().toISOString());
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FFFFFF', dark: '#1D3D47' }}
        headerImage={
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/karatekidc_logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        }>
        <ThemedView style={styles.contentContainer}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title">
              {user ? `Konnichiwa, ${user.displayName?.split(' ')[0]}` : 'Konnichiwa'}
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
                  <PromilleMeter promille={estimatedBAC} width={BUTTON_WIDTH} />
                  <HomeSlider
                    onSlideComplete={arrivedHomeSafely}
                    text="Bekräfta Hemkomst"
                    width={BUTTON_WIDTH}
                  />
                </View>
              </>
            ) : (
              <>
                <ThemedText type="default" style={styles.welcomeText}>
                  Välkommen till dojon! Var vänlig och logga in för att komma igång.
                </ThemedText>
                <View style={styles.googleSignInContainer}>
                  <GoogleSignInButton />
                </View>
              </>
            )}
          </ThemedView>
        </ThemedView>
      </ParallaxScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  logoContainer: {
    backgroundColor: '#ff00bb',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40, 
  },
  logo: {
    width: '80%',
    height: '80%',
  },
  welcomeText: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 25,
    color: '#ffa9e8',
  },
  contentContainer: {
    gap: 1,
  },
  googleSignInContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 20,
  },
  bacText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#ffa9e8',
  },
});