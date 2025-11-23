// src/config/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'; // NEW: Import getFirestore and enableIndexedDbPersistence
import { getStorage } from 'firebase/storage';

// --- Firebase Client-Side Configuration ---
// IMPORTANT: This must match the backend Firebase project (it-ticketing-tool-dd679)
// To get these values:
// 1. Go to Firebase Console: https://console.firebase.google.com/project/it-ticketing-tool-dd679
// 2. Click the gear icon ⚙️ > Project settings
// 3. Scroll down to "Your apps" section
// 4. If no web app exists, click "Add app" > Web (</>) icon
// 5. Copy the config values from the Firebase SDK snippet
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};


// Validate config before initialization
// Check for actual placeholder patterns (empty strings, placeholder text, etc.)
const hasPlaceholders = 
  !firebaseConfig.apiKey || 
  !firebaseConfig.projectId || 
  !firebaseConfig.messagingSenderId || 
  !firebaseConfig.appId ||
  firebaseConfig.apiKey.includes('YOUR_') ||
  firebaseConfig.apiKey.includes('your-') ||
  firebaseConfig.projectId.includes('your-') ||
  firebaseConfig.projectId.includes('YOUR_');

if (hasPlaceholders) {
  console.error('⚠️ FIREBASE CONFIGURATION INCOMPLETE ⚠️');
  console.error('Firebase configuration values are missing or incomplete.');
  console.error('\nThis app uses environment variables. Please ensure you have:');
  console.error('1. Created a .env file in sahayaon-frontend/ directory');
  console.error('2. Added all REACT_APP_FIREBASE_* environment variables');
  console.error('3. Restarted your development server after creating/updating .env');
  console.error('\nRequired environment variables:');
  console.error('- REACT_APP_FIREBASE_API_KEY');
  console.error('- REACT_APP_FIREBASE_AUTH_DOMAIN');
  console.error('- REACT_APP_FIREBASE_PROJECT_ID');
  console.error('- REACT_APP_FIREBASE_STORAGE_BUCKET');
  console.error('- REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
  console.error('- REACT_APP_FIREBASE_APP_ID');
  console.error('- REACT_APP_FIREBASE_MEASUREMENT_ID');
  console.error('\nGet values from: https://console.firebase.google.com/project/it-ticketing-tool-dd679/settings/general');
  throw new Error(
    'Firebase configuration is incomplete. Please create a .env file in sahayaon-frontend/ ' +
    'with REACT_APP_FIREBASE_* environment variables and restart your development server.'
  );
}

// Initialize Firebase
let app;
let authClient;
let dbClient;
let storage;

try {
  app = initializeApp(firebaseConfig);
  
  // Get Firebase Auth instance
  authClient = getAuth(app);
  // Get Firestore instance
  dbClient = getFirestore(app);
  // Get Firebase Storage instance
  storage = getStorage(app);
  
  // Enable offline persistence (handle multi-tab error gracefully)
  enableIndexedDbPersistence(dbClient).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a a time.
      console.warn('Firestore persistence failed-precondition: Multiple tabs open. Persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Firestore persistence unimplemented: The current browser does not support all features required.');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('\nPlease check:');
  console.error('1. Firebase config values are correct');
  console.error('2. Project it-ticketing-tool-dd679 exists and has a web app configured');
  console.error('3. Get config from: https://console.firebase.google.com/project/it-ticketing-tool-dd679/settings/general');
  throw error;
}

// Export the auth and db clients for use in other components
export { app, authClient, dbClient, storage };

// This file sets up and initializes Firebase for your application.
// It exports the `authClient` instance, allowing other components to
// interact with Firebase Authentication services without re-initializing Firebase.
// It now also exports the `dbClient` for Firestore interactions.
