// src/components/ChangePasswordComponent.js

import React, { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; // Import reauthenticateWithCredential and EmailAuthProvider
import { FilePenLine, Loader2, XCircle } from 'lucide-react'; // Icons

// Import common UI components
import FormInput from './common/FormInput';
import PrimaryButton from './common/PrimaryButton';

/**
 * ChangePassword component for allowing users to update their password.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object (includes firebaseUser).
 * @param {function} props.showFlashMessage - Function to display a temporary message.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @returns {JSX.Element} The password change view.
 */
const ChangePasswordComponent = ({ user, showFlashMessage, navigateTo }) => {
    const [currentPassword, setCurrentPassword] = useState(''); // NEW: State for current password
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    /**
     * Handles the password change submission.
     * Validates input, re-authenticates the user, and then attempts to update the user's password via Firebase.
     * @param {Event} e - The form submission event.
     */
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

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

        setPasswordChangeLoading(true);
        try {
            // Step 1: Re-authenticate the user with their current password
            const credential = EmailAuthProvider.credential(user.firebaseUser.email, currentPassword);
            await reauthenticateWithCredential(user.firebaseUser, credential);

            // Step 2: If re-authentication is successful, proceed with password update
            await updatePassword(user.firebaseUser, newPassword);
            showFlashMessage('Password updated successfully!', 'success');
            setCurrentPassword(''); // Clear current password field
            setNewPassword('');
            setConfirmPassword('');
            navigateTo('profile'); // Navigate back to profile after successful change
        } catch (err) {
            console.error('Password change error:', err);
            let errorMessage = 'Failed to update password.';
            if (err.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect current password. Please try again.';
            } else if (err.code === 'auth/invalid-email') { // Should not happen if user is logged in
                errorMessage = 'Invalid email address.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later.';
            } else {
                errorMessage = err.message; // Generic Firebase error message
            }
            setPasswordError(errorMessage);
            showFlashMessage(errorMessage, 'error');
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    if (!user) {
        return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>You must be logged in to change your password.</span></div>;
    }

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">Change Password</h2>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl mx-auto border border-gray-200">
                <form onSubmit={handleChangePassword} className="space-y-3">
                    {/* NEW: Current Password Input */}
                    <FormInput
                        id="currentPassword"
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        showPasswordToggle={true}
                    />
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
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        showPasswordToggle={true}
                        error={!!passwordError}
                    />
                    {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    <PrimaryButton type="submit" loading={passwordChangeLoading ? "Updating..." : null} Icon={FilePenLine} className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-300">
                        Update Password
                    </PrimaryButton>
                    <PrimaryButton onClick={() => navigateTo('profile')} className="bg-gray-500 hover:bg-gray-600 focus:ring-gray-300 ml-2">
                        Cancel
                    </PrimaryButton>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordComponent;