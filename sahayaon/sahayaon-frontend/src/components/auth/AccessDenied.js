// src/components/auth/AccessDenied.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { authClient } from '../../config/firebase';

const AccessDenied = () => {
    const navigate = useNavigate();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Check if user was actually denied access (via sessionStorage flag)
        const accessDeniedFlag = sessionStorage.getItem('access_denied');
        
        if (!accessDeniedFlag) {
            // If no flag, redirect to login - this page should only be accessed after actual denial
            navigate('/login', { replace: true });
            return;
        }
        
        // Mark as authorized to view this page
        setIsAuthorized(true);
        
        // Clear the flag after checking (one-time use)
        sessionStorage.removeItem('access_denied');
        
        // Ensure user is signed out
        const signOutUser = async () => {
            try {
                await signOut(authClient);
            } catch (error) {
                console.error('Error signing out:', error);
            }
        };
        signOutUser();
    }, [navigate]);

    // Don't render content if not authorized (will redirect)
    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="max-w-md w-full">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
                    
                    <p className="text-gray-700 mb-6">
                        Your account access has been revoked. Please contact your administrator for assistance.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;

