// src/components/ProfileComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { User, KeyRound, LogOut, Loader2, XCircle, FilePenLine } from 'lucide-react'; // Icons

// Import common UI components
import PrimaryButton from './common/PrimaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../config/constants';

/**
 * Profile component for displaying user information and allowing navigation to password change.
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

                {/* Change Password Button */}
                <div className="mt-6 border-t pt-4 border-gray-200">
                    <PrimaryButton onClick={() => navigateTo('changePassword')} Icon={FilePenLine} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-300">
                        Change Password
                    </PrimaryButton>
                </div>

                {/* Logout Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <PrimaryButton onClick={handleLogout} Icon={LogOut} className="bg-red-600 hover:bg-red-700 focus:ring-red-300">
                        Log Out
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};

export default ProfileComponent;