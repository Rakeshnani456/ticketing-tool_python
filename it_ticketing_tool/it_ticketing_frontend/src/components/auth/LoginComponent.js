// src/components/auth/LoginComponent.js

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth'; // Firebase authentication method
import { LogIn } from 'lucide-react'; // Icon for login button

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Firebase auth client from config
import { authClient } from '../../config/firebase'; // Corrected syntax
// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants'; // Corrected syntax

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
    const [formError, setFormError] = useState(''); // State for general form error message

    /**
     * Handles the form submission for login.
     * Authenticates with Firebase and then verifies user role with the backend.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setPasswordError(false); // Reset password error on new submission attempt
        setFormError(''); // Clear any previous general form errors
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
                // If backend verification fails, set form error and sign out from Firebase
                setFormError(data.error || 'Login failed after token verification. Please try again.');
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
                    case 'auth/invalid-credential': // Explicitly handle this common error
                        errorMessage = 'Invalid email or password. Please try again.';
                        setPasswordError(true); // Set password error for visual feedback
                        setPassword(''); // Clear password field for re-entry
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
                        errorMessage = error.message || 'An unexpected authentication error occurred.'; // Fallback for other Firebase errors
                }
            } else {
                errorMessage = 'An unexpected network error occurred or server is unreachable.';
            }
            setFormError(errorMessage); // Display error message inside the form
        } finally {
            setLoading(false); // End loading state
        }
    };

    /**
     * Resets password error state and clears general form error when the password input is focused.
     */
    const handlePasswordFocus = () => {
        setPasswordError(false);
        setFormError(''); // Clear general form error when user focuses on password
    };

    /**
     * Resets general form error when the email input is focused.
     */
    const handleEmailFocus = () => {
        setFormError(''); // Clear general form error when user focuses on email
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-offwhite p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-200 animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-5 text-center">Welcome Back!</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {formError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative text-sm" role="alert">
                            <span className="block sm:inline">{formError}</span>
                        </div>
                    )}
                    <FormInput
                        id="email"
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleEmailFocus} // Add onFocus handler for email
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
                    <LinkButton disabled sx={{ pointerEvents: 'none', opacity: 0.5, cursor: 'not-allowed' }}>
                        Register here
                    </LinkButton>
                </p>
            </div>
        </div>
    );
};

export default LoginComponent;