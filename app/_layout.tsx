import React, { useState, useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { auth } from 'firebaseConfig';
import { User } from 'firebase/auth';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator } from 'react-native';

// Import font files
import JetBrainsMonoRegular from '../assets/fonts/JetBrainsMono-Regular.ttf';
import JetBrainsMonoBold from '../assets/fonts/JetBrainsMono-Bold.ttf';
import SUSERegular from '../assets/fonts/SUSE-Regular.ttf';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [fontsLoaded] = useFonts({
    'JetBrainsMono-Regular': JetBrainsMonoRegular,
    'JetBrainsMono-Bold': JetBrainsMonoBold,
    'SUSE-Regular': SUSERegular,
  });
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fontsLoaded || initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [user, segments, initializing, fontsLoaded, router]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffb4e4" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}