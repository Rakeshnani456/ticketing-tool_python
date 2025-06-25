// src/config/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

// Export the auth client for use in other components
export { authClient };

// This file sets up and initializes Firebase for your application.
// It exports the `authClient` instance, allowing other components to
// interact with Firebase Authentication services without re-initializing Firebase.
