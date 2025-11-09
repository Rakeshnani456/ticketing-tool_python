// src/components/ProfileComponent.js
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, User, Mail, Phone, Briefcase, Building, IdCard, Tag, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/constants';

// Cache keys
const PROFILE_CACHE_KEY = 'user_profile_cache';
const PROFILE_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Professional Profile Component with caching
 */
const ProfileComponent = ({ user, showFlashMessage, navigateTo, handleLogout }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingManager, setLoadingManager] = useState(false);
    const [error, setError] = useState(null);
    const [managerInfo, setManagerInfo] = useState(null);
    
    // Cache utilities
    const getCachedProfile = () => {
        try {
            const cached = localStorage.getItem(PROFILE_CACHE_KEY);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp > PROFILE_CACHE_EXPIRY) {
                localStorage.removeItem(PROFILE_CACHE_KEY);
                return null;
            }
            return data;
        } catch (err) {
            return null;
        }
    };

    const setCachedProfile = (data) => {
        try {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error('Failed to cache profile:', err);
        }
    };

    // Fetch profile (fast, without manager info)
    const fetchProfile = useCallback(async (forceRefresh = false) => {
        if (!user?.firebaseUser) return;
        
        // Check cache first
        if (!forceRefresh) {
            const cached = getCachedProfile();
            if (cached) {
                setProfile(cached);
                setLoading(false);
                // Still fetch in background for freshness
                fetchProfile(true);
                return;
            }
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            // Don't include manager for fast initial load
            const res = await fetch(`${API_BASE_URL}/profile/${user.firebaseUser.uid}?includeManager=false`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) {
                const errMsg = data?.error || 'Failed to load profile.';
                setError(errMsg);
                if (forceRefresh) {
                    showFlashMessage(errMsg, 'error');
                }
            } else {
                setProfile(data);
                setCachedProfile(data);
            }
        } catch (err) {
            console.error('Profile fetch failed:', err);
            const errMsg = 'Unable to connect. Please try again.';
            setError(errMsg);
            if (forceRefresh) {
                showFlashMessage(errMsg, 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage]);

    // Fetch manager info separately (lazy load)
    const fetchManagerInfo = useCallback(async () => {
        if (!user?.firebaseUser || !profile?.managerEmail || managerInfo) return;
        
        setLoadingManager(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/profile/${user.firebaseUser.uid}?includeManager=true`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (res.ok && data.managerName) {
                setManagerInfo({
                    name: data.managerName,
                    email: data.managerEmail,
                    role: data.managerRole,
                    contact: data.managerContactNumber,
                    employeeId: data.managerEmployeeId
                });
            }
        } catch (err) {
            console.error('Manager info fetch failed:', err);
        } finally {
            setLoadingManager(false);
        }
    }, [user, profile, managerInfo]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Load manager info when profile is loaded and has manager email
    useEffect(() => {
        if (profile?.managerEmail && !managerInfo) {
            fetchManagerInfo();
        }
    }, [profile, managerInfo, fetchManagerInfo]);

    const getInitials = () => {
        if (!profile) return 'U';
        const name = profile.fullName || profile.email || 'User';
        if (name === 'User' || name === '-') return 'U';
        return name
            .split(' ')
            .map(part => part.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const formatRole = (role) => {
        if (!role) return '-';
        return role
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (loading && !profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-gray-400" size={32} />
                    <p className="mt-4 text-sm text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="flex flex-col items-center max-w-md">
                    <XCircle className="text-red-500" size={32} />
                    <p className="mt-4 text-sm text-red-600 font-medium text-center">{error}</p>
                    <button 
                        onClick={() => fetchProfile(true)}
                        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-500">Profile unavailable</p>
                </div>
            </div>
        );
    }

    const displayManager = managerInfo || (profile.managerEmail ? { name: '-', email: profile.managerEmail } : null);

    return (
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <style>{`
                .profile-container {
                    max-width: 100%;
                    margin: 0 auto;
                }
                .profile-header {
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    padding: 1rem;
                    margin-bottom: 0.75rem;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .profile-header-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .profile-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 6px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: 500;
                    color: #64748b;
                    border: 1px solid #e2e8f0;
                }
                .profile-info {
                    flex: 1;
                }
                .profile-name {
                    font-size: 1.25rem;
                    font-weight: 500;
                    margin: 0 0 0.125rem 0;
                    color: #475569;
                }
                .profile-title {
                    font-size: 0.875rem;
                    font-weight: 400;
                    margin: 0 0 0.25rem 0;
                    color: #64748b;
                }
                .profile-email {
                    font-size: 0.8rem;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }
                .profile-stats {
                    display: flex;
                    gap: 1.25rem;
                    margin-top: 0.75rem;
                    padding-top: 0.5rem;
                    border-top: 1px solid #e2e8f0;
                }
                .stat-item {
                    text-align: left;
                }
                .stat-value {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #475569;
                    display: block;
                }
                .stat-label {
                    font-size: 0.7rem;
                    color: #64748b;
                    margin-top: 0.125rem;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    font-weight: 400;
                }
                .sections-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .section {
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                }
                .section-header {
                    background: #f8fafc;
                    padding: 0.625rem 0.875rem;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .section-icon {
                    width: 0.875rem;
                    height: 0.875rem;
                    color: #64748b;
                }
                .section-title {
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #475569;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .section-content {
                    padding: 0.875rem;
                }
                .fields-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 0.875rem;
                }
                .field-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .field-label {
                    font-size: 0.7rem;
                    font-weight: 400;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }
                .field-value {
                    font-size: 0.8rem;
                    color: #475569;
                    font-weight: 400;
                    word-break: break-word;
                }
                .field-value .empty {
                    color: #94a3b8;
                    font-style: italic;
                    font-weight: 400;
                }
                @media (max-width: 768px) {
                    .sections-container {
                        gap: 0.625rem;
                    }
                    .fields-grid {
                        grid-template-columns: 1fr;
                        gap: 0.625rem;
                    }
                    .profile-header {
                        padding: 0.75rem;
                    }
                    .profile-header-content {
                        flex-direction: column;
                        text-align: center;
                        gap: 0.625rem;
                    }
                    .profile-stats {
                        justify-content: center;
                        flex-wrap: wrap;
                        gap: 0.625rem;
                    }
                    .section-content {
                        padding: 0.625rem;
                    }
                    .section-header {
                        padding: 0.5rem 0.75rem;
                    }
                }
            `}</style>

            <div className="profile-container">
                {/* Profile Header */}
                <div className="profile-header">
                    <div className="profile-header-content">
                        <div className="profile-avatar">
                            {getInitials()}
                        </div>
                        <div className="profile-info">
                            <h1 className="profile-name">
                                {profile.fullName || profile.email || 'User'}
                            </h1>
                            <div className="profile-title">
                                {profile.designation || formatRole(profile.role) || 'User'}
                            </div>
                            <div className="profile-email">
                                <Mail className="w-3 h-3" />
                                {profile.email || 'No email provided'}
                            </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Link
                                to="/change-password"
                                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 transition-colors flex items-center gap-1.5"
                            >
                                <Key className="w-3 h-3" />
                                Change Password
                            </Link>
                        </div>
                    </div>
                    {displayManager && displayManager.name && displayManager.name !== '-' && (
                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-value">{displayManager.name}</span>
                                <span className="stat-label">Manager Name</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sections Container */}
                <div className="sections-container">
                    {/* Contact Information Section */}
                    <div className="section">
                        <div className="section-header">
                            <Phone className="section-icon" />
                            <h3 className="section-title">Contact Information</h3>
                        </div>
                        <div className="section-content">
                            <div className="fields-grid">
                                <div className="field-item">
                                    <div className="field-label">Contact Number</div>
                                    <div className="field-value">
                                        {profile.mobile || <span className="empty">No contact number provided</span>}
                                    </div>
                                </div>
                                
                                <div className="field-item">
                                    <div className="field-label">Email</div>
                                    <div className="field-value">
                                        {profile.email || <span className="empty">No email provided</span>}
                                    </div>
                                </div>
                                
                                {displayManager && displayManager.name && displayManager.name !== '-' && (
                                    <div className="field-item">
                                        <div className="field-label">Manager Name</div>
                                        <div className="field-value">
                                            {displayManager.name}
                                        </div>
                                    </div>
                                )}
                                
                                {displayManager && (
                                    <div className="field-item">
                                        <div className="field-label">Manager Email</div>
                                        <div className="field-value">
                                            {displayManager.email || <span className="empty">No manager email</span>}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="field-item">
                                    <div className="field-label">Organization</div>
                                    <div className="field-value">
                                        {profile.organization || <span className="empty">N/A</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Professional Information Section */}
                    <div className="section">
                        <div className="section-header">
                            <Briefcase className="section-icon" />
                            <h3 className="section-title">Professional Information</h3>
                        </div>
                        <div className="section-content">
                            <div className="fields-grid">
                                <div className="field-item">
                                    <div className="field-label">Employee ID</div>
                                    <div className="field-value">
                                        {profile.employeeId || <span className="empty">No employee ID</span>}
                                    </div>
                                </div>

                                <div className="field-item">
                                    <div className="field-label">Designation</div>
                                    <div className="field-value">
                                        {profile.designation || <span className="empty">No designation</span>}
                                    </div>
                                </div>

                                <div className="field-item">
                                    <div className="field-label">Employment Type</div>
                                    <div className="field-value">
                                        {profile.employmentType || <span className="empty">No employment type</span>}
                                    </div>
                                </div>

                                <div className="field-item">
                                    <div className="field-label">Role</div>
                                    <div className="field-value">
                                        {formatRole(profile.role) || <span className="empty">No role</span>}
                                    </div>
                                </div>

                                {profile.assetId && (
                                    <div className="field-item">
                                        <div className="field-label">Asset ID</div>
                                        <div className="field-value">{profile.assetId}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Manager Information Section */}
                    {displayManager && (
                        <div className="section">
                            <div className="section-header">
                                <User className="section-icon" />
                                <h3 className="section-title">Reporting Manager</h3>
                            </div>
                            <div className="section-content">
                                {loadingManager ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="animate-spin text-gray-400" size={20} />
                                    </div>
                                ) : (
                                    <div className="fields-grid">
                                        <div className="field-item">
                                            <div className="field-label">Manager Name</div>
                                            <div className="field-value">
                                                {displayManager.name && displayManager.name !== '-' ? (
                                                    displayManager.name
                                                ) : (
                                                    <span className="empty">No manager name</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="field-item">
                                            <div className="field-label">Manager Email</div>
                                            <div className="field-value">
                                                {displayManager.email || <span className="empty">No manager email</span>}
                                            </div>
                                        </div>
                                        
                                        {displayManager.contact && (
                                            <div className="field-item">
                                                <div className="field-label">Manager Mobile</div>
                                                <div className="field-value">
                                                    {displayManager.contact}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {displayManager.role && (
                                            <div className="field-item">
                                                <div className="field-label">Manager Role</div>
                                                <div className="field-value">
                                                    {formatRole(displayManager.role)}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {displayManager.employeeId && (
                                            <div className="field-item">
                                                <div className="field-label">Manager Employee ID</div>
                                                <div className="field-value">{displayManager.employeeId}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileComponent;
