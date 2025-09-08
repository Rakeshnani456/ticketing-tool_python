// src/components/ProfileComponent.js
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, FilePenLine, User, Mail, Shield, Briefcase, LogOut } from 'lucide-react';
import PrimaryButton from './common/PrimaryButton';
import { API_BASE_URL } from '../config/constants';
import { getAccessToken } from '../utils/utils';

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
        if (!user?.supabaseUser) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await getAccessToken(user);
            const res = await fetch(`${API_BASE_URL}/profile/${user.uid}`, {
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
        <div className="flex flex-col items-center justify-center py-6">
            <Loader2 className="animate-spin text-blue-500" size={20} />
            <p className="mt-2 text-sm text-gray-600">Retrieving profile...</p>
        </div>
    );
    
    const renderError = () => (
        <div className="flex flex-col items-center justify-center py-6">
            <XCircle className="text-red-500" size={20} />
            <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            <button 
                onClick={fetchProfile}
                className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
            >
                Try Again
            </button>
        </div>
    );
    
    const renderEmpty = () => (
        <div className="flex flex-col items-center justify-center py-6">
            <User className="text-gray-400" size={20} />
            <p className="mt-2 text-sm text-gray-500">Profile unavailable</p>
        </div>
    );
    
    const getFullName = () =>
        profile.fullName ||
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
        profile.name ||
        '-';
    
    const getInitials = () => {
        const name = getFullName();
        if (name === '-') return 'U';
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 md:p-4">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-bold text-center text-gray-800 mb-4">My Profile</h2>
                
                {loading && renderLoading()}
                {error && renderError()}
                {!loading && !error && !profile && renderEmpty()}
                
                {profile && (
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        {/* Profile Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-3 md:p-4 text-white">
                            <div className="flex flex-col md:flex-row items-center">
                                <div className="flex-shrink-0 mb-2 md:mb-0 md:mr-4">
                                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                                        {getInitials()}
                                    </div>
                                </div>
                                <div className="text-center md:text-left">
                                    <h1 className="text-lg md:text-xl font-bold">{getFullName()}</h1>
                                    <p className="text-blue-100 text-xs mt-1">{profile.email}</p>
                                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
                                        <Shield size={12} className="mr-1" />
                                        {profile.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Profile Details */}
                        <div className="p-3 md:p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center">
                                        <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                                            <User className="text-blue-600" size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-medium text-gray-500">Full Name</h3>
                                            <p className="text-sm font-medium text-gray-900">{getFullName()}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center">
                                        <div className="p-1.5 bg-indigo-100 rounded-lg mr-3">
                                            <Briefcase className="text-indigo-600" size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-medium text-gray-500">Employee ID</h3>
                                            <p className="text-sm font-medium text-gray-900">{profile.employeeid || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center">
                                        <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                                            <Shield className="text-purple-600" size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-medium text-gray-500">Role</h3>
                                            <p className="text-sm font-medium text-gray-900 capitalize">{profile.role}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center">
                                        <div className="p-1.5 bg-teal-100 rounded-lg mr-3">
                                            <Mail className="text-teal-600" size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-medium text-gray-500">Email</h3>
                                            <p className="text-sm font-medium text-gray-900">{profile.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors"
                                >
                                    <LogOut size={14} />
                                    Logout
                                </button>
                                <PrimaryButton
                                    onClick={() => navigateTo('/change-password')}
                                    Icon={FilePenLine}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 text-sm"
                                >
                                    Change Password
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileComponent;