// src/components/ChangePasswordComponent.js

import React, { useState } from 'react';
import { FilePenLine, Loader2, XCircle } from 'lucide-react'; // Icons
import { supabase } from '../config/supabase'; // Import Supabase client

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
            // Update password using Supabase
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            // Update mustChangePassword in Supabase
            const { error: updateError } = await supabase
                .from('users')
                .update({ mustChangePassword: false })
                .eq('id', user.uid);

            if (updateError) {
                console.warn('Could not update mustChangePassword flag:', updateError);
            }

            showFlashMessage('Password updated successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            navigateTo('/profile'); // Navigate back to profile after successful change
        } catch (err) {
            console.error('Password change error:', err);
            let errorMessage = 'Failed to update password.';
            if (err.message && err.message.includes('password')) {
                errorMessage = 'Password does not meet requirements.';
            } else if (err.message && err.message.includes('too many')) {
                errorMessage = 'Too many attempts. Please try again later.';
            } else {
                errorMessage = err.message || 'Failed to update password.';
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

    // Only show new password and confirm password fields, and a single change button
    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">Set New Password</h2>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto border border-gray-200">
                <form onSubmit={handleChangePassword} className="space-y-3">
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
                        label="Re-enter New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        showPasswordToggle={true}
                        error={!!passwordError}
                    />
                    {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    <PrimaryButton type="submit" loading={passwordChangeLoading ? "Changing..." : null} Icon={FilePenLine} className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-300 w-full">
                        {passwordChangeLoading ? "Changing..." : "Change Password"}
                    </PrimaryButton>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordComponent;