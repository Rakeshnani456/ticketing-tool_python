// src/components/auth/LoginComponent.js

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebase authentication method
import { LogIn } from 'lucide-react'; // Icon for login button

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Firebase auth client from config
import { authClient } from '../../config/firebase';
// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

/**
 * Component for user login.
 * Handles email/password authentication and communicates with a backend for role verification.
 * @param {object} props - Component props.
 * @param {function} props.onLoginSuccess - Callback function on successful login, receives user object.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @returns {JSX.Element} The login form.
 */
const LoginComponent = ({ onLoginSuccess, navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(false); // State to indicate password error for styling

    /**
     * Handles the form submission for login.
     * Authenticates with Firebase and then verifies user role with the backend.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setPasswordError(false); // Reset password error on new submission attempt
        setLoading(true); // Start loading state

        try {
            // 1. Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(authClient, email, password);
            const firebaseUser = userCredential.user;
            const idToken = await firebaseUser.getIdToken(); // Get Firebase ID token

            // 2. Send ID token to backend for verification and user role retrieval
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}` // Pass ID token in Authorization header
                },
                body: JSON.stringify({ email: firebaseUser.email }),
            });

            const data = await response.json(); // Parse backend response

            // 3. Handle backend response
            if (response.ok) {
                // If backend verification is successful, call onLoginSuccess with user data
                onLoginSuccess({ firebaseUser, role: data.user.role, email: firebaseUser.email });
            } else {
                // If backend verification fails, show error and sign out from Firebase
                showFlashMessage(data.error || 'Login failed after token verification.', 'error');
                authClient.signOut(); // Ensure user is signed out if backend rejects
            }
        } catch (error) {
            // Handle Firebase authentication errors
            console.error('Login error:', error);
            let errorMessage = 'Login failed.';
            if (error.code) {
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Invalid email or password.';
                        setPasswordError(true); // Set password error for visual feedback
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email format.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed login attempts. Please try again later.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your internet connection.';
                        break;
                    default:
                        errorMessage = error.message; // Generic Firebase error message
                }
            } else {
                errorMessage = 'An unexpected network error occurred or server is unreachable.';
            }
            showFlashMessage(errorMessage, 'error'); // Display error message to user
        } finally {
            setLoading(false); // End loading state
        }
    };

    /**
     * Resets password error state when the password input is focused.
     */
    const handlePasswordFocus = () => {
        setPasswordError(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-offwhite p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-200 animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-5 text-center">Welcome Back!</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <FormInput
                        id="email"
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <FormInput
                        id="password"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handlePasswordFocus}
                        required
                        error={passwordError} // Pass error state to FormInput for styling
                        showPasswordToggle={true} // Enable password visibility toggle
                    />
                    <PrimaryButton type="submit" loading={loading ? "Logging In..." : null} Icon={LogIn}>
                        Log In
                    </PrimaryButton>
                </form>
                <p className="text-center mt-4 text-gray-600 text-xs">
                    Don't have an account?{' '}
                    <LinkButton onClick={() => navigateTo('register')}>
                        Register here
                    </LinkButton>
                </p>
            </div>
        </div>
    );
};

export default LoginComponent;
