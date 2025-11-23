// src/components/auth/InitialPasswordChangeComponent.js

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, ArrowRight, XCircle } from 'lucide-react';

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
 * Initial Password Change Component - Enterprise Portal Style
 */
const InitialPasswordChangeComponent = ({ navigateTo, showFlashMessage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Step management: 'prompt' -> 'form' -> 'success'
    const [currentStep, setCurrentStep] = useState('prompt');
    
    // Form state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ message: '', type: '' });
    const [fieldErrors, setFieldErrors] = useState({});
    
    // Password validation state
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '', strength: '' });
    
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
     * Handle cancel action
     */
    const handleCancel = async () => {
        // Sign out user and redirect to login
        await signOut(authClient);
        navigate('/login');
    };

    /**
     * Handle continue to password form
     */
    const handleContinue = () => {
        setCurrentStep('form');
    };

    /**
     * Validate password strength
     */
    const validatePasswordStrength = (password) => {
        if (!password) return { score: 0, feedback: [], strength: '' };

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

        return { score, feedback: feedbackText, strength: strengthText, checks: feedback };
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
                // Show success step
                setCurrentStep('success');
                
                // Sign out and redirect to login after delay
                setTimeout(async () => {
                    await signOut(authClient);
                    navigate('/login');
                }, 3000);
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
     * Password strength indicator component - Enterprise style
     */
    const PasswordStrengthIndicator = ({ strength }) => {
        if (!strength.score) return null;

        const getStrengthColor = () => {
            if (strength.score < 2) return { text: 'text-red-600', bg: 'bg-red-500', label: 'Weak' };
            if (strength.score < 4) return { text: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Fair' };
            if (strength.score < 5) return { text: 'text-gray-700', bg: 'bg-gray-600', label: 'Good' };
            return { text: 'text-green-600', bg: 'bg-green-600', label: 'Strong' };
        };

        const colors = getStrengthColor();
        const progress = (strength.score / 5) * 100;

        return (
            <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${colors.text}`}>
                        Password Strength: <strong>{colors.label}</strong>
                    </span>
                    <span className="text-gray-500">{strength.score}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-300 ${colors.bg}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                {strength.feedback && (
                    <p className="text-xs text-gray-600 mt-1">{strength.feedback}</p>
                )}
            </div>
        );
    };

    /**
     * Password requirements checklist
     */
    const PasswordRequirements = ({ password }) => {
        const requirements = [
            { label: 'At least 8 characters', met: password.length >= 8 },
            { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
            { label: 'One lowercase letter', met: /[a-z]/.test(password) },
            { label: 'One number', met: /\d/.test(password) },
            { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) }
        ];

        if (!password) return null;

        return (
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                <ul className="space-y-1">
                    {requirements.map((req, idx) => (
                        <li key={idx} className="flex items-center text-xs">
                            {req.met ? (
                                <CheckCircle2 size={13} className="text-green-600 mr-2 flex-shrink-0" />
                            ) : (
                                <XCircle size={13} className="text-gray-400 mr-2 flex-shrink-0" />
                            )}
                            <span className={req.met ? 'text-gray-900' : 'text-gray-600'}>
                                {req.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    // If no user data, show loading
    if (!userData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="flex flex-col items-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent"></div>
                    <p className="text-gray-600 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 bg-white relative border-r border-gray-200">
                <div className="relative z-10 flex flex-col justify-center items-center px-12 py-16 w-full h-full">
                    <img 
                        src={require('../../assets/logo/Logo2.png')} 
                        alt="SahayaOn Logo" 
                        className="h-20 mb-6 object-contain" 
                    />
                </div>
            </div>

            {/* Right side - Content */}
            <div className="w-full lg:w-1/2 xl:w-3/5 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen overflow-y-auto">
                <div className="w-full max-w-lg py-4">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex justify-center mb-6">
                        <img 
                            src={require('../../assets/logo/Logo2.png')} 
                            alt="SahayaOn Logo" 
                            className="h-12 object-contain" 
                        />
                    </div>

                    {/* Step 1: Prompt Screen */}
                    {currentStep === 'prompt' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            {/* Header */}
                            <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
                                <div className="flex items-start">
                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                        <Shield className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                            Security Update Required
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            Account: <span className="font-medium text-gray-700">{userEmail}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-6 py-6">
                                {/* Main Message */}
                                <div className="mb-6">
                                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                                        To ensure the security of your account and protect your information, you must update your password before accessing the system.
                                    </p>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        This is a mandatory security measure that helps maintain the integrity of your account and comply with our security policies.
                                    </p>
                                </div>

                                {/* Security Benefits */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-semibold text-blue-900 mb-2">
                                                Why This Is Important
                                            </h3>
                                            <ul className="space-y-1.5 text-xs text-blue-800">
                                                <li className="flex items-start">
                                                    <span className="text-blue-600 mr-2">•</span>
                                                    <span>Protects your account from unauthorized access</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <span className="text-blue-600 mr-2">•</span>
                                                    <span>Ensures compliance with security best practices</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <span className="text-blue-600 mr-2">•</span>
                                                    <span>Helps safeguard your sensitive business data</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Password Requirements */}
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
                                    <div className="flex items-start">
                                        <Lock className="w-4 h-4 text-gray-600 mr-3 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-900 mb-2">
                                                Password Requirements
                                            </p>
                                            <ul className="space-y-1 text-xs text-gray-700">
                                                <li className="flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                    Minimum 8 characters in length
                                                </li>
                                                <li className="flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                    At least one uppercase letter (A-Z)
                                                </li>
                                                <li className="flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                    At least one lowercase letter (a-z)
                                                </li>
                                                <li className="flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                    At least one number (0-9)
                                                </li>
                                                <li className="flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                                                    At least one special character (!@#$%^&*)
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-md transition-colors border border-gray-300 hover:border-gray-400 flex items-center justify-center text-sm"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Cancel & Sign Out
                                    </button>
                                    <button
                                        onClick={handleContinue}
                                        className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-md transition-colors shadow-sm hover:shadow flex items-center justify-center text-sm"
                                    >
                                        Proceed to Update Password
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Password Form */}
                    {currentStep === 'form' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            {/* Header */}
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                                            <Lock className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Create New Password</h2>
                                            <p className="text-xs text-gray-500">
                                                Step 2 of 2 • Account: <span className="font-medium text-gray-700">{userEmail}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCancel}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                                        aria-label="Close"
                                        title="Cancel and sign out"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Form Content */}
                            <div className="px-6 py-6">
                                <div className="mb-5">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Please create a strong password that meets all security requirements. Your password will be encrypted and securely stored.
                                    </p>
                                </div>

                                <StatusAlert 
                                    message={statusMessage.message} 
                                    type={statusMessage.type} 
                                    onDismiss={clearStatus}
                                />

                                <form onSubmit={handleChangePassword} className="space-y-5 mt-5">
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
                                            className="h-11 text-sm"
                                            placeholder="Enter your new password"
                                        />
                                        {fieldErrors.newPassword && (
                                            <p className="text-red-600 text-xs mt-1.5 flex items-center">
                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                {fieldErrors.newPassword}
                                            </p>
                                        )}
                                        <PasswordStrengthIndicator strength={passwordStrength} />
                                        <PasswordRequirements password={newPassword} />
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
                                            className="h-11 text-sm"
                                            placeholder="Re-enter your new password"
                                        />
                                        {fieldErrors.confirmPassword && (
                                            <p className="text-red-600 text-xs mt-1.5 flex items-center">
                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                {fieldErrors.confirmPassword}
                                            </p>
                                        )}
                                        {confirmPassword && newPassword === confirmPassword && (
                                            <p className="text-green-600 text-xs mt-1.5 flex items-center">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                Passwords match
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <PrimaryButton 
                                            type="submit" 
                                            loading={passwordChangeLoading} 
                                            Icon={Lock} 
                                            className="w-full h-10 text-sm font-medium"
                                            disabled={passwordStrength.score < 3 || newPassword !== confirmPassword}
                                        >
                                            {passwordChangeLoading ? "Updating Password..." : "Update Password"}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Success Screen */}
                    {currentStep === 'success' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="px-6 py-10 text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                    Password Updated Successfully
                                </h2>
                                <p className="text-gray-700 text-sm mb-2 leading-relaxed max-w-md mx-auto">
                                    Your password has been successfully updated and encrypted. Your account is now secured with the new password.
                                </p>
                                <p className="text-gray-500 text-xs mb-6">
                                    You will be redirected to the login page in a few moments. Please sign in with your new password.
                                </p>
                                <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            © 2025 Kriasol Technologies LLP. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InitialPasswordChangeComponent; 