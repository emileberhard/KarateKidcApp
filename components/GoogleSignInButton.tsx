import React from "react";
import { TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { auth, database } from "../firebaseConfig";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { ref, set } from "firebase/database";

GoogleSignin.configure({
  webClientId:
    "341175787162-34emlae8g18b2cm8i08gf7ei1dq97anl.apps.googleusercontent.com",

  offlineAccess: true,
  forceCodeForRefreshToken: true,
  accountName: "",
  scopes: ["profile", "email"],
});

const GoogleSignInButton = () => {
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const { idToken, user } = await GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      const userRef = ref(database, `users/${user.givenName}`);
      await set(userRef, {
        userId: result.user.uid,
        firstName: user.givenName,
        lastName: user.familyName,
        email: user.email,
        admin: false,
        units: 0,
      });

      console.log("Google Sign-In Successful");
    } catch (error) {
      const errorCode = (error as { code: string }).code;
      if (errorCode === statusCodes.SIGN_IN_CANCELLED) {
        console.log("Sign in cancelled");
      } else if (errorCode === statusCodes.IN_PROGRESS) {
        console.log("Sign in is in progress");
      } else if (errorCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log("Play services not available");
      } else {
        console.error("Error signing in with Google:", error);
      }
      if (Platform.OS === "android") {
        console.error(
          "Detailed error on Android:",
          JSON.stringify(error, null, 2)
        );
        console.error("Error code:", errorCode);
        console.error("Error message:", (error as Error).message);
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
    backgroundColor: "#4285F4",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    width: "90%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default GoogleSignInButton;
