// src/components/auth/RegisterComponent.js

import React, { useState } from 'react';
import { User } from 'lucide-react'; // Icon for register button

// Import common UI components
import FormInput from '../common/FormInput';
import FormSelect from '../common/FormSelect';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Supabase client from config
import { supabase } from '../../config/supabase';

/**
 * Component for user registration.
 * Allows new users to create an account with email, password, and select a role.
 * Uses Supabase Auth for registration and creates user profile.
 * @param {object} props - Component props.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @param {object} props.currentUser - Current authenticated user (for admin registration).
 * @returns {JSX.Element} The registration form.
 */
const RegisterComponent = ({ currentUser, navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // Default role for new registrations
    const [loading, setLoading] = useState(false); // Loading state for button feedback

    // Determine role options based on currentUser
    let roleOptions = [{ value: 'user', label: 'User' }];
    if (currentUser) {
        if (currentUser.role === 'super_admin') {
            roleOptions = [
                { value: 'user', label: 'User' },
                { value: 'support', label: 'Support Associate' },
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' },
            ];
        } else if (currentUser.role === 'site_admin') {
            roleOptions = [
                { value: 'user', label: 'User' },
                { value: 'support', label: 'Support Associate' },
            ];
        }
    }

    /**
     * Handles the form submission for registration.
     * Creates user account in Supabase Auth and user profile in database.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setLoading(true); // Start loading state

        try {
            // 1. Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`
                }
            });

            if (authError) {
                throw authError;
            }

            // 2. If admin is creating the user, update the user profile with the specified role
            if (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'site_admin')) {
                const { error: profileError } = await supabase
                    .from('users')
                    .update({ 
                        role: role,
                        active: true,
                        must_change_password: false
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    throw profileError;
                }
            }

            // 3. Show success message
            if (authData.user && !authData.user.email_confirmed_at) {
                showFlashMessage('Registration successful! Please check your email to verify your account before logging in.', 'success');
            } else {
                showFlashMessage('Registration successful! Please log in.', 'success');
            }
            
            navigateTo('login');

        } catch (error) {
            // Handle registration errors
            console.error('Registration error:', error);
            let errorMessage = 'Registration failed.';
            
            if (error.message) {
                switch (error.message) {
                    case 'User already registered':
                        errorMessage = 'An account with this email already exists.';
                        break;
                    case 'Password should be at least 6 characters':
                        errorMessage = 'Password must be at least 6 characters long.';
                        break;
                    case 'Invalid email':
                        errorMessage = 'Please enter a valid email address.';
                        break;
                    default:
                        errorMessage = error.message;
                }
            }
            
            showFlashMessage(errorMessage, 'error');
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
                    {/* Only show role dropdown if currentUser is super_admin or site_admin */}
                    {currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'site_admin') && (
                        <FormSelect
                            id="role"
                            label="Role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            options={roleOptions.filter(option => option.value !== 'site_admin')}
                        />
                    )}
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
