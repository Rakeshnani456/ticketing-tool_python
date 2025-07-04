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
            const idToken = localStorage.getItem('jwtToken'); // Get Firebase ID token for authorization
            const response = await fetch(`