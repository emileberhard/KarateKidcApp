import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, View, TouchableOpacity, Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { ref, onValue, set, increment, DataSnapshot } from 'firebase/database';
import { database, auth } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import HomeSlider from '@/components/HomeSlider';
import TestComponent from '@/components/TestComponent';

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [units, setUnits] = useState<number>(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const unsubscribe = onValue(userRef, (snapshot: DataSnapshot) => {
          const userData = snapshot.val();
          setUnits(userData?.units || 0);
          
          // Store first name if it doesn't exist
          if (!userData?.firstName && currentUser.displayName) {
            const firstName = currentUser.displayName.split(' ')[0];
            set(ref(database, `users/${currentUser.uid}/firstName`), firstName);
          }
        });
        return () => unsubscribe();
      }
    });

    // Load the sound file
    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/unit_taken.wav')
      );
      setSound(sound);
    }

    loadSound();

    return () => {
      authUnsubscribe();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const takeUnit = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (user) {
      const unitsRef = ref(database, `users/${user.uid}/units`);
      set(unitsRef, increment(1));

      // Play the sound
      if (sound) {
        await sound.replayAsync();
      }
    }
  };

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
            <ThemedText type="title">Konnichiwa</ThemedText>
            <HelloWave />
          </ThemedView>
          <ThemedView style={styles.stepContainer}>
            {user ? (
              <>
                <ThemedText type="default" style={styles.welcomeText}>
                  Välkommen till dojon, {user.displayName?.split(' ')[0]}!
                </ThemedText>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.combinedButton} onPress={takeUnit}>
                    <Image
                      source={require('@/assets/images/beer_can.png')}
                      style={styles.beerCanIcon}
                      resizeMode="contain"
                    />
                    <View style={styles.unitsContainer}>
                      <ThemedText style={styles.unitsValue}>{units}</ThemedText>
                      <ThemedText style={styles.unitsLabel}>enheter</ThemedText>
                    </View>
                  </TouchableOpacity>
                  <HomeSlider
                    onSlideComplete={arrivedHomeSafely}
                    text="Bekräfta Hemkomst"
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
    gap: 8,
    marginBottom: 4, 
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
  unitsContainer: {
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  unitsLabel: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  unitsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 40,
  },
  welcomeText: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 16,
    color: '#ffa9e8',
  },
  combinedButton: {
    backgroundColor: '#ff00bb',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH - 40, // Match the width of HomeSlider
    height: 130, // Match the height of HomeSlider
  },
  beerCanIcon: {
    width: 100,
    height: 100,
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
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
});