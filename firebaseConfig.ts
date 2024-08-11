import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "karatekidc-e1f0b.firebaseapp.com",
  databaseURL: "https://karatekidc-e1f0b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "karatekidc-e1f0b",
  storageBucket: "karatekidc-e1f0b.appspot.com",
  messagingSenderId: "341175787162",
  appId: "1:341175787162:web:5e3d17f33f5a3e820ec923",
  measurementId: "G-S61QSG9EMZ"
};

// Add this type definition
export interface DrinkEntry {
  timestamp: number;
  units: number;
}

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize services
const database: Database = getDatabase(app);

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app); 
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export { app, database, auth };