// src/components/common/CookieConsentBanner.js

import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useCookieConsent } from '../../hooks/useCookies';

/**
 * Cookie Consent Banner Component
 * Displays cookie consent options to users
 */
const CookieConsentBanner = () => {
    const { consent, isLoading, acceptCookies, declineCookies } = useCookieConsent();
    const [showDetails, setShowDetails] = useState(false);
    const [selectedCookies, setSelectedCookies] = useState({
        necessary: true, // Always required
        functional: true,
        analytics: false,
        marketing: false
    });

    // Don't show banner if consent is already given or declined
    if (isLoading || consent !== 'not_set') {
        return null;
    }

    const handleAcceptAll = () => {
        acceptCookies();
    };

    const handleDeclineAll = () => {
        declineCookies();
    };

    const handleCustomAccept = () => {
        // Set analytics consent based on user selection
        if (selectedCookies.analytics) {
            // Enable analytics cookies
            localStorage.setItem('analytics_enabled', 'true');
        } else {
            // Disable analytics cookies
            localStorage.setItem('analytics_enabled', 'false');
        }
        acceptCookies();
    };

    const handleCookieToggle = (cookieType) => {
        if (cookieType === 'necessary') return; // Can't disable necessary cookies
        
        setSelectedCookies(prev => ({
            ...prev,
            [cookieType]: !prev[cookieType]
        }));
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <Cookie className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    We use cookies to enhance your experience
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">
                                    We use cookies to provide essential functionality, analyze site usage, 
                                    and personalize your experience. You can choose which cookies to accept.
                                </p>
                                
                                {/* Cookie Details */}
                                {showDetails && (
                                    <div className="mt-4 space-y-3">
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3">Cookie Types</h4>
                                            <div className="space-y-3">
                                                {/* Necessary Cookies */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                            <span className="font-medium text-gray-900">Necessary</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Essential for website functionality and security
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="text-xs text-gray-500">Always Active</span>
                                                    </div>
                                                </div>

                                                {/* Functional Cookies */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <Settings className="w-4 h-4 text-blue-500" />
                                                            <span className="font-medium text-gray-900">Functional</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Remember your preferences and settings
                                                        </p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCookies.functional}
                                                            onChange={() => handleCookieToggle('functional')}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {/* Analytics Cookies */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <AlertCircle className="w-4 h-4 text-purple-500" />
                                                            <span className="font-medium text-gray-900">Analytics</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Help us understand how you use our website
                                                        </p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCookies.analytics}
                                                            onChange={() => handleCookieToggle('analytics')}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                {/* Marketing Cookies */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2">
                                                            <AlertCircle className="w-4 h-4 text-orange-500" />
                                                            <span className="font-medium text-gray-900">Marketing</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Used to deliver personalized advertisements
                                                        </p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCookies.marketing}
                                                            onChange={() => handleCookieToggle('marketing')}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            {showDetails ? 'Hide Details' : 'Customize'}
                        </button>
                        
                        <button
                            onClick={handleDeclineAll}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Decline All
                        </button>
                        
                        {showDetails ? (
                            <button
                                onClick={handleCustomAccept}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Accept Selected
                            </button>
                        ) : (
                            <button
                                onClick={handleAcceptAll}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                            >
                                Accept All
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;
