// src/config/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'; // NEW: Import getFirestore and enableIndexedDbPersistence
import { getStorage } from 'firebase/storage';

// --- Firebase Client-Side Configuration ---
// Replace these with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyDZVwd_WHUw8RzUfkVklT7_9U6Mc-FNL-o",
    authDomain: "it-ticketing-tool-dd679.firebaseapp.com",
    projectId: "it-ticketing-tool-dd679",
    storageBucket: "it-ticketing-tool-dd679.firebasestorage.app",
    messagingSenderId: "919553361675",
    appId: "1:919553361675:web:ae1be7140926013786840e",
    measurementId: "G-HCVXC67K86"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase Auth instance
const authClient = getAuth(app);
// Get Firestore instance
const dbClient = getFirestore(app); // NEW: Export the Firestore client
// Get Firebase Storage instance
const storage = getStorage(app);

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

// Export the auth and db clients for use in other components
export { app, authClient, dbClient, storage }; // NEW: Export 'app', 'dbClient', and 'storage'

// This file sets up and initializes Firebase for your application.
// It exports the `authClient` instance, allowing other components to
// interact with Firebase Authentication services without re-initializing Firebase.
// It now also exports the `dbClient` for Firestore interactions.
