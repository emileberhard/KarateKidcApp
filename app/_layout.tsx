import React, { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import { SpaceMono_400Regular as SpaceMono } from "@expo-google-fonts/space-mono";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { app } from "../firebaseConfig"; // Import the Firebase app

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  const [loaded] = useFonts({
    SpaceMono,
  });

  useEffect(() => {
    // Check if Firebase app is initialized
    if (app) {
      setIsFirebaseReady(true);
    } else {
      console.error("Firebase app is not initialized");
    }
  }, []);

  useEffect(() => {
    if (loaded && isFirebaseReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isFirebaseReady]);

  if (!loaded || !isFirebaseReady) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="tabs" options={{ headerShown: false }} />
      </Stack>
      <Redirect href="/tabs" />
    </ThemeProvider>
  );
}
