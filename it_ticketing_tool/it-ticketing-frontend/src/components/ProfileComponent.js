// src/components/ProfileComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { updatePassword } from 'firebase/auth'; // Firebase authentication method for updating password
import { User, KeyRound, FilePenLine, LogOut, Loader2, XCircle } from 'lucide-react'; // Icons

// Import common UI components
import FormInput from './common/FormInput';
import PrimaryButton from './common/PrimaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../config/constants';

/**
 * Profile component for displaying user information and allowing password changes.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object (includes firebaseUser and role).
 * @param {function} props.showFlashMessage - Function to display a temporary message.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {function} props.handleLogout - Callback function to log out the user.
 * @returns {JSX.Element} The user profile view.
 */
const ProfileComponent = ({ user, showFlashMessage, navigateTo, handleLogout }) => {
    const [profile, setProfile] = useState(null); // Stores fetched user profile data
    const [loading, setLoading] = useState(true); // Loading state for fetching profile
    const [error, setError] = useState(null); // Error state for fetching profile
    const [newPassword, setNewPassword] = useState(''); // State for new password input
    const [confirmPassword, setConfirmPassword] = useState(''); // State for confirm password input
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false); // Loading state for password change
    const [passwordError, setPasswordError] = useState(''); // Error message for password change

    /**
     * Fetches the user's profile data from the backend.
     * Uses useCallback to memoize the function.
     */
    const fetchProfile = useCallback(async () => {
        if (!user || !user.firebaseUser) return; // Exit if user is not authenticated

        setLoading(true); // Start loading profile
        setError(null); // Clear previous errors
        try {
            const idToken = await user.firebaseUser.getIdToken(); // Get Firebase ID token for authorization
            const response = await fetch(`${API_BASE_URL}/profile/${user.firebaseUser.uid}`, {
                headers: { 'Authorization': `Bearer ${idToken}` } // Include token
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data); // Set profile data
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch profile.');
                showFlashMessage(errorData.error || 'Failed to fetch profile.', 'error');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Network error or server unreachable.');
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setLoading(false); // End loading profile
        }
    }, [user, showFlashMessage]); // Dependencies for useCallback

    // Effect hook to fetch profile data when component mounts or user changes
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]); // `fetchProfile` is a dependency because it's memoized

    /**
     * Handles the password change submission.
     * Validates input and attempts to update the user's password via Firebase.
     * @param {Event} e - The form submission event.
     */
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(''); // Clear previous password errors

        // Client-side validation for password match and length
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

        setPasswordChangeLoading(true); // Start password change loading
        try {
            await updatePassword(user.firebaseUser, newPassword); // Update password via Firebase Auth
            showFlashMessage('Password updated successfully!', 'success');
            setNewPassword(''); // Clear password fields on success
            setConfirmPassword('');
        } catch (err) {
            console.error('Password change error:', err);
            let errorMessage = 'Failed to update password.';
            if (err.code === 'auth/requires-recent-login') {
                // Specific Firebase error if user needs to re-authenticate
                errorMessage = 'Please log in again to update your password (requires recent login).';
            } else {
                errorMessage = err.message; // Generic Firebase error message
            }
            setPasswordError(errorMessage); // Set password error for display
            showFlashMessage(errorMessage, 'error');
        } finally {
            setPasswordChangeLoading(false); // End password change loading
        }
    };

    // Conditional rendering for loading, error, or no profile data
    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading profile...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;
    if (!profile) return <div className="text-center text-gray-600 mt-8 text-base">No profile data available.</div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">My Profile</h2>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl mx-auto border border-gray-200">
                {/* User Information Section */}
                <div className="mb-6 space-y-3">
                    <p className="text-sm text-gray-700 flex items-center"><User size={16} className="mr-2 text-blue-500" /> <span className="font-semibold">Email:</span> {profile.email}</p>
                    <p className="text-sm text-gray-700 flex items-center"><KeyRound size={16} className="mr-2 text-purple-500" /> <span className="font-semibold">Role:</span> <span className="capitalize">{profile.role}</span></p>
                </div>

                {/* Change Password Section */}
                <h3 className="text-lg font-bold text-gray-800 mb-3">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                    <FormInput
                        id="newPassword"
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        showPasswordToggle={true} // Enable password visibility toggle
                    />
                    <FormInput
                        id="confirmPassword"
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        showPasswordToggle={true} // Enable password visibility toggle
                        error={!!passwordError} // Pass error state for styling
                    />
                    {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    <PrimaryButton type="submit" loading={passwordChangeLoading ? "Updating..." : null} Icon={FilePenLine} className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-300">
                        Update Password
                    </PrimaryButton>
                </form>

                {/* Logout Button */}
                <div className="mt-6 border-t pt-4 border-gray-200">
                    <PrimaryButton onClick={handleLogout} Icon={LogOut} className="bg-red-600 hover:bg-red-700 focus:ring-red-300">
                        Log Out
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};

export default ProfileComponent;
