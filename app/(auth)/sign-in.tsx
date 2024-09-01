import React from 'react';
import { View, StyleSheet, Image, Platform, StatusBar as NativeStatusBar } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useThemeColor } from '@/hooks/useThemeColor';
import kkLogo from '@/assets/images/kk_logo.png';

export default function SignInScreen() {
  const backgroundColor = useThemeColor('primary');
  const textColor = useThemeColor('base-content');

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <NativeStatusBar />
      <View style={styles.logoContainer}>
        <Image source={kkLogo} style={styles.logo} resizeMode="contain" />
      </View>
      <ThemedView style={styles.contentContainer}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Välkommen till KarateKids
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textColor }]}>
          Logga in för att fortsätta
        </ThemedText>
        <View style={styles.buttonContainer}>
          <GoogleSignInButton />
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
});