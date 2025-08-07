// src/components/auth/InitialPasswordChangeComponent.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';

// Import Firebase auth client from config
import { authClient } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';

/**
 * Toast Component for user feedback
 */
const Toast = ({ message, type, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const getToastStyles = () => {
        const baseStyles = "fixed top-4 right-4 z-50 max-w-sm w-full bg-white border-l-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out";
        switch (type) {
            case 'success':
                return `${baseStyles} border-green-500`;
            case 'error':
                return `${baseStyles} border-red-500`;
            case 'warning':
                return `${baseStyles} border-yellow-500`;
            case 'info':
                return `${baseStyles} border-blue-500`;
            default:
                return `${baseStyles} border-gray-500`;
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <Shield className="w-5 h-5 text-green-500" />;
            case 'error':
                return <Shield className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <Shield className="w-5 h-5 text-yellow-500" />;
            case 'info':
                return <Shield className="w-5 h-5 text-blue-500" />;
            default:
                return <Shield className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className={getToastStyles()}>
            <div className="flex items-start p-4">
                <div className="flex-shrink-0">
                    {getIcon()}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <span className="sr-only">Close</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

    /**
     * Status Alert Component
     */
    const StatusAlert = ({ message, type, onDismiss }) => {
        if (!message) return null;

        const getAlertStyles = () => {
            switch (type) {
                case 'success':
                    return 'bg-green-50 border-green-200 text-green-800';
                case 'error':
                    return 'bg-red-50 border-red-200 text-red-800';
                case 'warning':
                    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
                default:
                    return 'bg-blue-50 border-blue-200 text-blue-800';
            }
        };

        const getIcon = () => {
            switch (type) {
                case 'success':
                    return <Shield className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />;
                case 'error':
                    return <Shield className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />;
                case 'warning':
                    return <Shield className="w-4 h-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />;
                default:
                    return <Shield className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />;
            }
        };

        return (
            <div className={`border px-4 py-3 rounded-lg relative ${getAlertStyles()}`} role="alert">
                <div className="flex items-start">
                    {getIcon()}
                    <div className="flex-1">
                        <span className="block text-sm font-medium">{message}</span>
                    </div>
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <span className="sr-only">Dismiss</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    };

/**
 * Initial Password Change Component
 */
const InitialPasswordChangeComponent = ({ navigateTo, showFlashMessage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Form state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ message: '', type: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    
    // Password validation state
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
    
    // Get user data from location state
    const userData = location.state?.userData;
    const userEmail = userData?.email || '';

    useEffect(() => {
        // If no user data, redirect to login
        if (!userData) {
            navigate('/login');
        }
    }, [userData, navigate]);

    /**
     * Show status message
     */
    const showStatus = (message, type = 'info') => {
        setStatusMessage({ message, type });
    };

    const clearStatus = () => {
        setStatusMessage({ message: '', type: '' });
    };

    /**
     * Clear all errors
     */
    const clearErrors = () => {
        setStatusMessage({ message: '', type: '' });
        setFieldErrors({});
    };

    /**
     * Validate password strength
     */
    const validatePasswordStrength = (password) => {
        if (!password) return { score: 0, feedback: '' };

        let score = 0;
        let feedback = [];

        if (password.length >= 8) score += 1;
        else feedback.push('at least 8 characters');

        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('an uppercase letter');

        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('a lowercase letter');

        if (/\d/.test(password)) score += 1;
        else feedback.push('a number');

        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
        else feedback.push('a special character');

        const strengthText = score < 2 ? 'Weak' : score < 4 ? 'Fair' : score < 5 ? 'Good' : 'Strong';
        const feedbackText = feedback.length > 0 ? `Add ${feedback.join(', ')}` : '';

        return { score, feedback: feedbackText, strength: strengthText };
    };

    /**
     * Handle password change submission
     */
    const handleChangePassword = async (e) => {
        e.preventDefault();
        clearErrors();

        // Validation
        if (newPassword !== confirmPassword) {
            setFieldErrors({ confirmPassword: 'Passwords do not match' });
            showStatus('Passwords do not match. Please try again.', 'error');
            return;
        }

        const strength = validatePasswordStrength(newPassword);
        if (strength.score < 3) {
            setFieldErrors({ newPassword: 'Password is too weak' });
            showStatus(`Password too weak. ${strength.feedback}`, 'error');
            return;
        }

        setPasswordChangeLoading(true);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${API_BASE_URL}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: userData.id, newPassword }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            if (response.ok) {
                showStatus('Password updated successfully! You can now log in.', 'success');
                
                // Sign out and redirect to login
                await signOut(authClient);
                
                // Redirect to login after a short delay
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                const errorMsg = data.error || 'Failed to update password. Please try again.';
                showStatus(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Password change error:', error);
            const errorMsg = error.name === 'AbortError' 
                ? 'Request timed out. Please try again.'
                : 'Failed to update password. Please try again.';
            
            showStatus(errorMsg, 'error');
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    /**
     * Handle input focus events
     */
    const handleInputFocus = (fieldName) => {
        setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
        if (Object.keys(fieldErrors).length <= 1) {
            clearStatus();
        }
    };

    /**
     * Handle password input for strength checking
     */
    const handleNewPasswordChange = (e) => {
        const value = e.target.value;
        setNewPassword(value);
        setPasswordStrength(validatePasswordStrength(value));
    };

    /**
     * Password strength indicator component
     */
    const PasswordStrengthIndicator = ({ strength }) => {
        if (!strength.score) return null;

        const getStrengthColor = () => {
            if (strength.score < 2) return 'text-red-500';
            if (strength.score < 4) return 'text-yellow-500';
            return 'text-green-500';
        };

        return (
            <div className="mt-1">
                <p className={`text-xs ${getStrengthColor()}`}>
                    Password strength: {strength.strength}
                </p>
            </div>
        );
    };

    // If no user data, show loading
    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 animate-fade-in">
                <div className="flex flex-col items-center mb-6">
                    <img src={require('../../assets/logo/logo.png')} alt="Company Logo" className="h-10 mb-4" />
                    <h2 className="text-2xl font-sm text-gray-800 mb-1 tracking-tight">Change Password</h2>
                    <p className="text-gray-600 text-sm text-center">
                        Changing password for <span className="font-medium text-gray-800">{userEmail}</span>
                    </p>
                </div>

                <StatusAlert 
                    message={statusMessage.message} 
                    type={statusMessage.type} 
                    onDismiss={clearStatus}
                />

                <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <FormInput
                                id="newPassword"
                                label="New Password"
                                type="password"
                                value={newPassword}
                                onChange={handleNewPasswordChange}
                                onFocus={() => handleInputFocus('newPassword')}
                                required
                                showPasswordToggle={true}
                                error={!!fieldErrors.newPassword}
                            />
                            {fieldErrors.newPassword && (
                                <p className="text-red-500 text-xs mt-1">{fieldErrors.newPassword}</p>
                            )}
                            <PasswordStrengthIndicator strength={passwordStrength} />
                        </div>

                        <div>
                            <FormInput
                                id="confirmPassword"
                                label="Confirm New Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onFocus={() => handleInputFocus('confirmPassword')}
                                required
                                showPasswordToggle={true}
                                error={!!fieldErrors.confirmPassword}
                            />
                            {fieldErrors.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-center pt-4">
                            <PrimaryButton 
                                type="submit" 
                                loading={passwordChangeLoading} 
                                Icon={Lock} 
                                className="w-full"
                                disabled={passwordStrength.score < 3}
                            >
                                {passwordChangeLoading ? "Updating Password..." : "Update Password"}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>

    );
};

export default InitialPasswordChangeComponent; 