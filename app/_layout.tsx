import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useSegments, useRouter } from 'expo-router';
import { auth } from 'firebaseConfig';
import { User } from 'firebase/auth';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

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
      if (initializing) setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user) {
      router.replace('/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, segments, initializing]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (initializing || !fontsLoaded) return null; // or a loading spinner

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Add this line to hide the header
      }}
    />
  );
}