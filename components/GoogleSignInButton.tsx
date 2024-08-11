import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Configure GoogleSignin
GoogleSignin.configure({
  webClientId: '341175787162-34emlae8g18b2cm8i08gf7ei1dq97anl.apps.googleusercontent.com', 
});

const GoogleSignInButton = () => {
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      console.log('Google Sign-In Successful');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Sign in cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('Play services not available');
      } else {
        console.error('Error signing in with Google:', error);
      }
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
      <Text style={styles.buttonText}>LOGGA IN</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    width: '90%', // Make the button wider
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24, // Increase font size
    fontWeight: 'bold',
  },
});

export default GoogleSignInButton;