import React, { useState, useEffect, useCallback } from 'react';
import { Image, StyleSheet, Platform, View, useWindowDimensions } from 'react-native';
import { ref, onValue, set, increment, DataSnapshot } from 'firebase/database';
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

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [units, setUnits] = useState<number>(0);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const BUTTON_WIDTH = SCREEN_WIDTH * 0.9; // 90% of screen width

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const unitsRef = ref(database, `users/${currentUser.uid}/units`);
        const unsubscribe = onValue(unitsRef, (snapshot: DataSnapshot) => {
          const data = snapshot.val();
          setUnits(data || 0);
        });
        return () => unsubscribe();
      }
    });

    return () => {
      authUnsubscribe();
    };
  }, []);

  const takeUnit = useCallback(async () => {
    if (user && units > 0) {
      const unitsRef = ref(database, `users/${user.uid}/units`);
      set(unitsRef, increment(-1));
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
});