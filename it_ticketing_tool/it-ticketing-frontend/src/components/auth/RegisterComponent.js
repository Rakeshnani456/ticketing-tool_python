// src/components/auth/RegisterComponent.js

import React, { useState } from 'react';
import { User } from 'lucide-react'; // Icon for register button

// Import common UI components
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

/**
 * Component for user registration.
 * Allows new users to create an account with email, password, and select a role.
 * Communicates with a backend API for the registration process.
 * @param {object} props - Component props.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @returns {JSX.Element} The registration form.
 */
const RegisterComponent = ({ navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // Default role for new registrations
    const [loading, setLoading] = useState(false); // Loading state for button feedback

    /**
     * Handles the form submission for registration.
     * Sends user data to the backend for account creation.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setLoading(true); // Start loading state

        try {
            // Send registration data to the backend API
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }), // Send email, password, and role
            });
            const data = await response.json(); // Parse response from backend

            if (response.ok) {
                // If registration is successful, show success message and navigate to login
                showFlashMessage(data.message || 'Registration successful! Please log in.', 'success');
                navigateTo('login');
            } else {
                // If registration fails, show error message from backend or a generic one
                showFlashMessage(data.error || 'Registration failed.', 'error');
            }
        } catch (error) {
            // Handle network errors or issues reaching the server
            console.error('Registration error:', error);
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setLoading(false); // End loading state
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-offwhite p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-200 animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-5 text-center">Join Us</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <FormInput
                        id="registerEmail"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <FormInput
                        id="registerPassword"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        showPasswordToggle={true} // Enable password visibility toggle
                    />
                    <FormSelect
                        id="role"
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        options={[
                            { value: 'user', label: 'User' },
                            { value: 'support', label: 'Support Associate' },
                            { value: 'admin', label: 'Admin' }
                        ]}
                    />
                    <PrimaryButton type="submit" loading={loading ? "Registering..." : null} Icon={User} className="bg-green-600 hover:bg-green-700 focus:ring-green-300">
                        Register
                    </PrimaryButton>
                </form>
                <p className="text-center mt-4 text-gray-600 text-xs">
                    Already have an account?{' '}
                    <LinkButton onClick={() => navigateTo('login')}>
                        Log In
                    </LinkButton>
                </p>
            </div>
        </div>
    );
};

export default RegisterComponent;
