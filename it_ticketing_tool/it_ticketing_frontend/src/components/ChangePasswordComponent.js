// src/components/ChangePasswordComponent.js

import React, { useState } from 'react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; // Import reauthenticateWithCredential and EmailAuthProvider
import { doc, updateDoc } from 'firebase/firestore'; // Import Firestore helpers
import { FilePenLine, Loader2, XCircle, Shield, Lock } from 'lucide-react'; // Icons
import { dbClient } from '../config/firebase'; // Import dbClient

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
    const [currentPassword, setCurrentPassword] = useState('');
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
        if (!currentPassword) {
            setPasswordError('Current password is required.');
            showFlashMessage('Current password is required.', 'error');
            return;
        }
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
            // Update mustChangePassword in Firestore
            const userDocRef = doc(dbClient, 'users', user.firebaseUser.uid);
            await updateDoc(userDocRef, { mustChangePassword: false });
            showFlashMessage('Password updated successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            navigateTo('/profile'); // Navigate back to profile after successful change
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

    // Only show password change form without logo and branding
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FilePenLine className="w-6 h-6 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Change Password</h2>
                        <p className="text-gray-600 text-sm">Update your account password for enhanced security</p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <FormInput
                                id="currentPassword"
                                label="Current Password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                showPasswordToggle={true}
                                className="h-10"
                            />
                        </div>
                        
                        <div>
                            <FormInput
                                id="newPassword"
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                showPasswordToggle={true}
                                className="h-10"
                            />
                        </div>
                    
                        <div>
                            <FormInput
                                id="confirmPassword"
                                label="Confirm New Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                showPasswordToggle={true}
                                error={!!passwordError}
                                className="h-10"
                            />
                            {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                        </div>

                        <div className="pt-1">
                            <PrimaryButton 
                                type="submit" 
                                loading={passwordChangeLoading ? "Changing..." : null} 
                                Icon={FilePenLine} 
                                className="w-full h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
                            >
                                {passwordChangeLoading ? "Changing..." : "Change Password"}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordComponent;