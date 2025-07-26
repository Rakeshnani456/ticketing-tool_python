// src/components/ProfileComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, FilePenLine } from 'lucide-react';
import PrimaryButton from './common/PrimaryButton';
import { API_BASE_URL } from '../config/constants';

/**
 * Displays user's profile info and allows password change navigation.
 * @param {object} props
 * @param {object} props.user - Authenticated user object.
 * @param {function} props.showFlashMessage - Displays temporary flash message.
 * @param {function} props.navigateTo - Navigation function.
 * @param {function} props.handleLogout - Logout handler.
 */
const ProfileComponent = ({ user, showFlashMessage, navigateTo, handleLogout }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!user?.firebaseUser) return;

        setLoading(true);
        setError(null);

        try {
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/profile/${user.firebaseUser.uid}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });

            const data = await res.json();
            if (!res.ok) {
                const errMsg = data?.error || 'Failed to load profile.';
                setError(errMsg);
                showFlashMessage(errMsg, 'error');
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error('Profile fetch failed:', err);
            const errMsg = 'Unable to connect. Please try again.';
            setError(errMsg);
            showFlashMessage(errMsg, 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const renderLoading = () => (
        <div className="flex justify-center items-center text-gray-600 mt-10 space-x-2">
            <Loader2 className="animate-spin" size={20} />
            <span>Retrieving profile...</span>
        </div>
    );

    const renderError = () => (
        <div className="flex justify-center items-center text-red-600 mt-10 space-x-2">
            <XCircle size={20} />
            <span>{error}</span>
        </div>
    );

    const renderEmpty = () => (
        <div className="text-center text-gray-500 mt-10">
            Profile details are currently unavailable.
        </div>
    );

    const getFullName = () =>
        profile.fullName ||
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        profile.name ||
        '-';

    return (
        <div className="p-6 bg-offwhite min-h-full overflow-auto">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">My Profile</h2>

            {loading && renderLoading()}
            {error && renderError()}
            {!loading && !error && !profile && renderEmpty()}

            {profile && (
                <section className="bg-white border border-gray-200 shadow-lg rounded-2xl max-w-2xl mx-auto p-6 sm:p-8">
                    {/* User Info */}
                    <dl className="divide-y divide-gray-100 text-sm text-gray-700 space-y-4">
                        <div className="flex justify-between">
                            <dt className="font-medium text-gray-600">Full Name</dt>
                            <dd>{getFullName()}</dd>
                        </div>
                        <div className="flex justify-between pt-4">
                            <dt className="font-medium text-gray-600">Employee ID</dt>
                            <dd>{profile.employeeid || '-'}</dd>
                        </div>
                        <div className="flex justify-between pt-4">
                            <dt className="font-medium text-gray-600">Role</dt>
                            <dd className="capitalize">{profile.role}</dd>
                        </div>
                        <div className="flex justify-between pt-4">
                            <dt className="font-medium text-gray-600">Email</dt>
                            <dd>{profile.email}</dd>
                        </div>
                    </dl>

                    {/* Action Buttons */}
                    <div className="mt-8 flex justify-end gap-2">
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 min-h-0 h-8 rounded focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
                        >
                            Logout
                        </button>
                        <PrimaryButton
                            onClick={() => navigateTo('/change-password')}
                            Icon={FilePenLine}
                            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 text-xs px-3 py-1.5 min-h-0 h-8"
                        >
                            Change Password
                        </PrimaryButton>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ProfileComponent;
