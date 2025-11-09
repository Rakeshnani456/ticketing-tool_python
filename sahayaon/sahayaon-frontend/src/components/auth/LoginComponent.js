// src/components/auth/LoginComponent.js

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { LogIn, AlertCircle, CheckCircle, Eye, EyeOff, Wifi, WifiOff, Shield, Lock } from 'lucide-react';

// Import common UI components
import FormInput from '../common/FormInput';
import PrimaryButton from '../common/PrimaryButton';
import LinkButton from '../common/LinkButton';

// Import Firebase auth client from config
import { authClient, dbClient } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { API_BASE_URL } from '../../config/constants';

/**
 * Simple Security Alert Component
 */
const SecurityAlert = ({ onProceed, onCancel }) => {
    return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
                <div className="bg-orange-100 rounded-full p-1.5 flex-shrink-0">
                    <Shield className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-orange-800 mb-1">
                        Password Change Required
                    </h4>
                    <p className="text-orange-700 text-sm mb-3">
                        For your security, you must change your password before accessing the system.
                    </p>
                    <div className="flex space-x-2">
                        <button
                            onClick={onCancel}
                            className="px-3 py-1.5 text-orange-600 border border-orange-300 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onProceed}
                            className="px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Enhanced Toast Component for better user feedback
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
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            case 'info':
                return <AlertCircle className="w-5 h-5 text-blue-500" />;
            default:
                return <AlertCircle className="w-5 h-5 text-gray-500" />;
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
 * Enhanced Error Display Component
 */
const ErrorAlert = ({ error, onDismiss }) => {
    if (!error) return null;

    return (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg relative animate-pulse-once" role="alert">
            <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1">
                    <span className="block text-sm font-medium">{error}</span>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="ml-2 text-red-400 hover:text-red-600 transition-colors"
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
 * Network Status Indicator
 */
const NetworkStatus = ({ isOnline }) => {
    if (isOnline) return null;

    return (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg mb-4">
            <div className="flex items-center">
                <WifiOff className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-sm">You appear to be offline. Please check your connection.</span>
            </div>
        </div>
    );
};

/**
 * Enhanced Login Component with improved error handling and user feedback
 */
const LoginComponent = ({ onLoginSuccess, navigateTo, showFlashMessage }) => {
    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    

    
    // Security alert state
    const [showSecurityAlert, setShowSecurityAlert] = useState(false);
    const [pendingUserData, setPendingUserData] = useState(null);
    
    // Error and feedback state
    const [formError, setFormError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [toast, setToast] = useState({ message: '', type: '', isVisible: false });
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [attemptCount, setAttemptCount] = useState(0);
    
    // Password validation state
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Enhanced toast display function
     */
    const showToast = (message, type = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, isVisible: false }));
    };

    /**
     * Clear all errors
     */
    const clearErrors = () => {
        setFormError('');
        setFieldErrors({});
    };

    /**
     * Validate password strength for new passwords
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
     * Enhanced error message mapping
     */
    const getFirebaseErrorMessage = (errorCode) => {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password. Please try again.',
            'auth/invalid-credential': 'Invalid email or password. Please check your credentials.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/user-disabled': 'This account has been disabled. Contact support for assistance.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again in a few minutes.',
            'auth/network-request-failed': 'Network error. Please check your internet connection.',
            'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact support.',
            'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/requires-recent-login': 'Please log out and log back in to perform this action.',
        };

        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    };

    /**
     * Handle security alert proceed action
     */
    const handleSecurityAlertProceed = () => {
        setShowSecurityAlert(false);
        // Navigate to the dedicated password change route
        navigateTo('/initial-password-change', null, { 
            state: { userData: pendingUserData.user } 
        });
    };

    /**
     * Handle security alert cancel action
     */
    const handleSecurityAlertCancel = () => {
        setShowSecurityAlert(false);
        setPendingUserData(null);
        // Clear form and go back to login
        setEmail('');
        setPassword('');
        setFormError('');
        // Sign out the user since they cancelled
        authClient.signOut();
    };

    /**
     * Enhanced form submission with better error handling
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearErrors();

        // Client-side validation
        if (!email.trim()) {
            setFieldErrors({ email: 'Email is required' });
            return;
        }

        if (!password) {
            setFieldErrors({ password: 'Password is required' });
            return;
        }

        if (!isOnline) {
            showToast('Please check your internet connection and try again.', 'error');
            return;
        }

        setLoading(true);
        setAttemptCount(prev => prev + 1);

        try {
            // 1. Authenticate with Firebase
            const userCredential = await signInWithEmailAndPassword(authClient, email, password);
            const firebaseUser = userCredential.user;
            const idToken = await firebaseUser.getIdToken();

            // 2. Backend verification with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ email: firebaseUser.email }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();

            // 3. Handle response
            if (response.ok) {
                showToast('Login successful! Welcome back.', 'success');
                setTimeout(() => {
                    onLoginSuccess({ 
                        firebaseUser, 
                        role: data.user.role, 
                        email: firebaseUser.email 
                    });
                }, 1000);
            } else if (response.status === 403 && data.mustChangePassword) {
                // Show simple security alert and don't proceed with login
                setPendingUserData(data);
                setShowSecurityAlert(true);
                // Don't call onLoginSuccess - user should stay on login page
            } else {
                const errorMsg = data.error || 'Login verification failed. Please try again.';
                setFormError(errorMsg);
                await authClient.signOut();
                
                if (attemptCount >= 2) {
                    showToast('Having trouble? Try resetting your password.', 'info');
                }
            }

        } catch (error) {
            console.error('Login error:', error);
            
            if (error.name === 'AbortError') {
                setFormError('Request timed out. Please try again.');
                showToast('Connection timeout. Please try again.', 'error');
            } else if (error.code) {
                const errorMessage = getFirebaseErrorMessage(error.code);
                setFormError(errorMessage);
                
                if (['auth/wrong-password', 'auth/invalid-credential'].includes(error.code)) {
                    setFieldErrors({ password: 'Incorrect password' });
                    setPassword('');
                }
                
                if (error.code === 'auth/too-many-requests') {
                    showToast('Account temporarily locked due to multiple failed attempts.', 'warning');
                }
            } else {
                setFormError('Unable to connect to our servers. Please try again.');
                showToast('Connection failed. Please check your internet connection.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };



    /**
     * Handle input focus events
     */
    const handleInputFocus = (fieldName) => {
        setFieldErrors(prev => ({ ...prev, [fieldName]: '' }));
        if (Object.keys(fieldErrors).length <= 1) {
            setFormError('');
        }
    };





    // Main login form
    return (
        <>
            <Toast {...toast} onClose={hideToast} />
            <div className="h-screen bg-gray-50 flex overflow-hidden">
                {/* Left side - Company Name */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-white relative overflow-hidden" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f3f4f6' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat'
                }}>
                    <div className="relative z-10 flex flex-col justify-center items-center px-12 py-16 text-gray-800 h-full w-full">
                        <img src={require('../../assets/logo/Logo2.png')} alt="Company Logo" className="max-h-40 w-auto max-w-full object-contain" />
                    </div>
                    
                    {/* Footer copyright */}
                    <div className="absolute bottom-6 left-6 right-6">
                        <div className="text-center">
                            <p className="text-xs text-gray-600">© 2025 Kriasol Technologies LLP. All rights reserved.</p>
                        </div>
                    </div>
                </div>

                {/* Right side - Login Form */}
                <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="w-full max-w-md">
                        {/* Mobile logo */}
                        <div className="lg:hidden flex justify-center items-center mb-6">
                            <img src={require('../../assets/logo/Logo2.png')} alt="Company Logo" className="max-h-25 w-auto max-w-full object-contain" />
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
                                <p className="text-gray-600 text-sm">Enter your credentials to access your account</p>
                            </div>

                            <NetworkStatus isOnline={isOnline} />
                            <ErrorAlert error={formError} onDismiss={() => setFormError('')} />
                            
                            {showSecurityAlert ? (
                                <SecurityAlert 
                                    onProceed={handleSecurityAlertProceed}
                                    onCancel={handleSecurityAlertCancel}
                                />
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <FormInput
                                            id="email"
                                            label="Email Address"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => handleInputFocus('email')}
                                            required
                                            autoComplete="username"
                                            error={!!fieldErrors.email}
                                            className="h-10"
                                        />
                                        {fieldErrors.email && (
                                            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
                                        )}
                                    </div>

                                    <div>
                                        <FormInput
                                            id="password"
                                            label="Password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => handleInputFocus('password')}
                                            required
                                            error={!!fieldErrors.password}
                                            showPasswordToggle={true}
                                            autoComplete="current-password"
                                            className="h-10"
                                        />
                                        {fieldErrors.password && (
                                            <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                id="remember-me"
                                                name="remember-me"
                                                type="checkbox"
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                                Remember me
                                            </label>
                                        </div>

                                        {attemptCount >= 3 && (
                                            <LinkButton 
                                                onClick={() => navigateTo('forgot-password')}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Forgot password?
                                            </LinkButton>
                                        )}
                                    </div>

                                    <div className="pt-1">
                                        <PrimaryButton 
                                            type="submit" 
                                            loading={loading} 
                                            Icon={LogIn} 
                                            className="w-full h-10 text-sm font-semibold"
                                            disabled={!isOnline}
                                        >
                                            {loading ? "Signing In..." : "Sign In"}
                                        </PrimaryButton>
                                    </div>
                                </form>
                            )}

                        </div>
                        
                        {/* Footer links */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                                <a href="#" className="hover:text-gray-800 transition-colors">Privacy Policy</a>
                                <span>•</span>
                                <a href="#" className="hover:text-gray-800 transition-colors">Terms of Service</a>
                                <span>•</span>
                                <a href="#" className="hover:text-gray-800 transition-colors">Contact</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginComponent;