// src/components/auth/LoginComponent.js

import React, { useState } from 'react';
import { signInWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; // Firebase authentication method
import { LogIn } from 'lucide-react'; // Icon for login button

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Firebase auth client from config
import { authClient, dbClient } from '../../config/firebase'; // Import dbClient
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Import Firestore helpers
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
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [firebaseUserForChange, setFirebaseUserForChange] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
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
                // Fetch Firestore user document to check mustChangePassword
                const userDocRef = doc(dbClient, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists() && userDocSnap.data().mustChangePassword) {
                    setMustChangePassword(true);
                    setFirebaseUserForChange(firebaseUser);
                    setLoading(false);
                    showFlashMessage('You must change your password before continuing.', 'info');
                    return;
                } else {
                    // If backend verification is successful, call onLoginSuccess with user data
                    onLoginSuccess({ firebaseUser, role: data.user.role, email: firebaseUser.email });
                }
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

    // Change password logic for forced change
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            showFlashMessage('New password and confirm password do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters long.');
            showFlashMessage('Password must be at least 6 characters long.', 'error');
            return;
        }
        setPasswordChangeLoading(true);
        try {
            // Re-authenticate with the old password (already done in login), so just update password
            await updatePassword(firebaseUserForChange, newPassword);
            // Update mustChangePassword in Firestore
            const userDocRef = doc(dbClient, 'users', firebaseUserForChange.uid);
            await updateDoc(userDocRef, { mustChangePassword: false });
            showFlashMessage('Password updated successfully! Please log in with your new password.', 'success');
            setMustChangePassword(false);
            setFirebaseUserForChange(null);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setPasswordChangeLoading(false);
            setEmail('');
            setPassword('');
            // Optionally, sign out the user and force re-login
            await authClient.signOut();
        } catch (err) {
            let errorMessage = 'Failed to update password.';
            if (err.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak.';
            } else {
                errorMessage = err.message;
            }
            setPasswordError(errorMessage);
            showFlashMessage(errorMessage, 'error');
        } finally {
            setPasswordChangeLoading(false);
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

    if (mustChangePassword) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-blue-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-fade-in">
                    <div className="flex flex-col items-center mb-6">
                        <img src={require('../../assets/logo/logo.png')} alt="Company Logo" className="h-20 mb-2" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-1 tracking-tight">Set New Password</h2>
                        <p className="text-gray-500 text-sm">You must set a new password before continuing.</p>
                    </div>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <FormInput
                            id="newPassword"
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            showPasswordToggle={true}
                        />
                        <FormInput
                            id="confirmPassword"
                            label="Re-enter New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            showPasswordToggle={true}
                            error={!!passwordError}
                        />
                        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                        <div className="flex items-center justify-center">
                            <PrimaryButton type="submit" loading={passwordChangeLoading ? "Changing..." : null} Icon={LogIn} className="w-40 whitespace-nowrap">
                                {passwordChangeLoading ? "Changing..." : "Change Password"}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-50 to-blue-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-fade-in">
                <div className="flex flex-col items-center mb-6">
                    <img src={require('../../assets/logo/logo.png')} alt="Company Logo" className="h-20 mb-2" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-1 tracking-tight">Sign in to your account</h2>
                    <p className="text-gray-500 text-sm">Enter your credentials to continue</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        onFocus={handleEmailFocus}
                        required
                        autoComplete="username"
                    />
                    <FormInput
                        id="password"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handlePasswordFocus}
                        required
                        error={passwordError}
                        showPasswordToggle={true}
                        autoComplete="current-password"
                    />
                    <div className="flex items-center justify-center">
                        <PrimaryButton type="submit" loading={loading ? "Logging In..." : null} Icon={LogIn} className="w-40 whitespace-nowrap">
                            {loading ? "Logging In..." : "Log In"}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginComponent;