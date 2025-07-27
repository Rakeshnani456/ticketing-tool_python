// src/components/auth/LoginComponent.js

import React, { useState } from 'react';
import { LogIn } from 'lucide-react'; // Icon for login button

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Supabase client from config
import { supabase } from '../../config/supabase';

/**
 * Component for user login.
 * Handles email/password authentication using Supabase Auth.
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
    const [userUidForChange, setUserUidForChange] = useState(null); // Store UID for password change
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(false); // State to indicate password error for styling
    const [formError, setFormError] = useState(''); // State for general form error message

    /**
     * Handles the form submission for login.
     * Authenticates with Supabase and retrieves user profile.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setPasswordError(false); // Reset password error on new submission attempt
        setFormError(''); // Clear any previous general form errors
        setLoading(true); // Start loading state

        try {
            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                throw authError;
            }

            const supabaseUser = authData.user;

            // 2. Get user profile from users table
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', supabaseUser.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            // 3. Check if user must change password
            if (profileData.must_change_password) {
                setMustChangePassword(true);
                setUserUidForChange(supabaseUser.id);
                setLoading(false);
                showFlashMessage('You must change your password before continuing.', 'info');
                return;
            }

            // 4. Create user object for the app
            const userProfile = {
                supabaseUser,
                role: profileData.role,
                email: supabaseUser.email,
                uid: supabaseUser.id,
                client_name: profileData.client_name,
                company_name: profileData.company_name
            };

            // 5. Call onLoginSuccess with user data
            onLoginSuccess(userProfile);

        } catch (error) {
            // Handle authentication errors
            console.error('Login error:', error);
            let errorMessage = 'Login failed.';
            
            if (error.message) {
                switch (error.message) {
                    case 'Invalid login credentials':
                        errorMessage = 'Invalid email or password. Please try again.';
                        setPasswordError(true); // Set password error for visual feedback
                        setPassword(''); // Clear password field for re-entry
                        break;
                    case 'Email not confirmed':
                        errorMessage = 'Please verify your email address before logging in.';
                        break;
                    case 'Too many requests':
                        errorMessage = 'Too many failed login attempts. Please try again later.';
                        break;
                    default:
                        errorMessage = error.message || 'An unexpected authentication error occurred.';
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
            // Update password in Supabase
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            // Update must_change_password in users table
            const { error: updateError } = await supabase
                .from('users')
                .update({ must_change_password: false })
                .eq('id', userUidForChange);

            if (updateError) {
                throw updateError;
            }

            showFlashMessage('Password updated successfully! Please log in with your new password.', 'success');
            setMustChangePassword(false);
            setUserUidForChange(null);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordError('');
            setPasswordChangeLoading(false);
            setEmail(''); // Clear email for new login
            setPassword(''); // Clear password for new login

        } catch (error) {
            console.error('Password change error:', error);
            let errorMessage = 'Failed to update password.';
            if (error.message) {
                errorMessage = error.message;
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
            <div className={`flip-container ${mustChangePassword ? 'flipped' : ''} bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-fade-in`}>
                <div className="flipper">
                    {/* Front: Login Form */}
                    <div className="front">
                        <div className="p-8">
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
                    {/* Back: Password Change Form */}
                    <div className="back">
                        <div className="p-8">
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
                </div>
            </div>
        </div>
    );
};

export default LoginComponent;