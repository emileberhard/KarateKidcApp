import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging'; // Add 'Messaging' to the import
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
export interface User {
  userId: string;
  pushToken?: string;
  admin: boolean;
  units: number;
  unitTakenTimestamps: { [key: string]: number };
  safeArrival?: string;
  firstName: string;
  lastName?: string;
  email: string;
}

// Add this interface
export interface DrinkEntry {
  timestamp: number;
  units: number;
}

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize services
const database: Database = getDatabase(app);
const functions = getFunctions(app, 'europe-west1');

const cloudFunctions = {
  getCompletion: httpsCallable(functions, 'getCompletion'),
  sendAdminNotification: httpsCallable(functions, 'sendAdminNotification'),
}

let auth: Auth;

if (Platform.OS === 'web') {
  auth = getAuth(app); 
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize FCM
let messaging: Messaging | null = null;
isSupported().then((isSupported) => {
  if (isSupported) {
    messaging = getMessaging(app);
  }
});

export { app, database, auth, cloudFunctions, messaging };