// src/components/auth/LoginComponent.js

import React, { useState } from 'react';
import { LogIn } from 'lucide-react'; // Icon for login button

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

/**
 * Component for user login.
 * Handles email/password authentication with MongoDB backend.
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
    const [passwordError, setPasswordError] = useState(false);
    const [formError, setFormError] = useState('');

    /**
     * Handles the form submission for login.
     * Authenticates directly with the MongoDB backend.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(false);
        setFormError('');
        setLoading(true);

        try {
            // Send email and password directly to backend
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the JWT token
                localStorage.setItem('token', data.token);
                
                // Call onLoginSuccess with user data in the expected format
                onLoginSuccess(data.user);
            } else {
                setFormError(data.error || 'Login failed. Please try again.');
                if (data.error && data.error.includes('password')) {
                    setPasswordError(true);
                    setPassword('');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            setFormError('Network error. Please check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resets password error state and clears general form error when the password input is focused.
     */
    const handlePasswordFocus = () => {
        setPasswordError(false);
        setFormError('');
    };

    /**
     * Resets general form error when the email input is focused.
     */
    const handleEmailFocus = () => {
        setFormError('');
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
                        onFocus={handleEmailFocus}
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
                        error={passwordError}
                        showPasswordToggle={true}
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