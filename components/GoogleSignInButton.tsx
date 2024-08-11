import React from 'react';
import { Button } from 'react-native';
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

  return <Button title="Sign in with Google" onPress={handleGoogleSignIn} />;
};

export default GoogleSignInButton;