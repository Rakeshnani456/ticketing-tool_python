// src/components/common/CookieSettings.js

import React, { useState, useEffect } from 'react';
import { Settings, Cookie, Shield, BarChart3, Target, CheckCircle, XCircle } from 'lucide-react';
import { useUserPreferences, useCookieConsent } from '../../hooks/useCookies';

/**
 * Cookie Settings Component
 * Allows users to manage their cookie preferences
 */
const CookieSettings = ({ isOpen, onClose }) => {
    const { preferences, updatePreferences } = useUserPreferences();
    const { consent, acceptCookies, declineCookies } = useCookieConsent();
    const [localPreferences, setLocalPreferences] = useState({
        necessary: true, // Always required
        functional: true,
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        if (preferences) {
            setLocalPreferences({
                necessary: true,
                functional: preferences.notifications?.email !== false,
                analytics: preferences.analytics || false,
                marketing: preferences.marketing || false
            });
        }
    }, [preferences]);

    const handleToggle = (cookieType) => {
        if (cookieType === 'necessary') return; // Can't disable necessary cookies
        
        setLocalPreferences(prev => ({
            ...prev,
            [cookieType]: !prev[cookieType]
        }));
    };

    const handleSave = () => {
        // Update user preferences
        const updatedPreferences = {
            ...preferences,
            notifications: {
                ...preferences.notifications,
                email: localPreferences.functional
            },
            analytics: localPreferences.analytics,
            marketing: localPreferences.marketing
        };
        
        updatePreferences(updatedPreferences);
        
        // Update analytics consent
        if (localPreferences.analytics) {
            localStorage.setItem('analytics_enabled', 'true');
        } else {
            localStorage.setItem('analytics_enabled', 'false');
        }
        
        onClose();
    };

    const handleAcceptAll = () => {
        setLocalPreferences({
            necessary: true,
            functional: true,
            analytics: true,
            marketing: true
        });
        acceptCookies();
        onClose();
    };

    const handleDeclineAll = () => {
        setLocalPreferences({
            necessary: true,
            functional: false,
            analytics: false,
            marketing: false
        });
        declineCookies();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Cookie className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Cookie Settings</h2>
                                <p className="text-sm text-gray-600">Manage your cookie preferences</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Cookie Types */}
                    <div className="space-y-6">
                        {/* Necessary Cookies */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-5 h-5 text-green-600" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">Necessary Cookies</h3>
                                        <p className="text-sm text-gray-600">Essential for website functionality</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="ml-2 text-sm text-gray-600">Always Active</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">
                                These cookies are necessary for the website to function and cannot be switched off. 
                                They are usually only set in response to actions made by you which amount to a request for services.
                            </p>
                        </div>

                        {/* Functional Cookies */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <Settings className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">Functional Cookies</h3>
                                        <p className="text-sm text-gray-600">Remember your preferences</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.functional}
                                        onChange={() => handleToggle('functional')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                These cookies enable the website to provide enhanced functionality and personalisation. 
                                They may be set by us or by third party providers whose services we have added to our pages.
                            </p>
                        </div>

                        {/* Analytics Cookies */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
                                        <p className="text-sm text-gray-600">Help us understand usage</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.analytics}
                                        onChange={() => handleToggle('analytics')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                These cookies allow us to count visits and traffic sources so we can measure and improve 
                                the performance of our site. They help us to know which pages are the most and least popular.
                            </p>
                        </div>

                        {/* Marketing Cookies */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <Target className="w-5 h-5 text-orange-600" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">Marketing Cookies</h3>
                                        <p className="text-sm text-gray-600">Personalized advertisements</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localPreferences.marketing}
                                        onChange={() => handleToggle('marketing')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">
                                These cookies may be set through our site by our advertising partners to build a profile 
                                of your interests and show you relevant adverts on other sites.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleDeclineAll}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Decline All
                        </button>
                        
                        <button
                            onClick={handleAcceptAll}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Accept All
                        </button>
                        
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                            Save Preferences
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieSettings;
