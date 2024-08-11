import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, View, TouchableOpacity } from 'react-native';
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
        const unitsRef = ref(database, `users/${currentUser.uid}/units`);
        const unsubscribe = onValue(unitsRef, (snapshot: DataSnapshot) => {
          const data = snapshot.val();
          setUnits(data || 0);
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
      // You might want to add some visual feedback here, like a temporary message
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
              </>
            ) : (
              <>
                <ThemedText type="default" style={styles.welcomeText}>
                  Välkommen till DOJO!
                </ThemedText>
                <GoogleSignInButton />
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
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginVertical: 10,
    minWidth: 200,
  },
  beerCanIcon: {
    width: 100,
    height: 100,
  },
  contentContainer: {
    gap: 1,
  },
});