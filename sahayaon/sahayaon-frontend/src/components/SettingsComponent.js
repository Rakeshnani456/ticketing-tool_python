// src/components/SettingsComponent.js
import React, { useState } from 'react';
import { useThemeContext } from '../contexts/ThemeContext'; // Import useThemeContext hook
import PrimaryButton from './common/PrimaryButton';
import CookieSettings from './common/CookieSettings';
import NotificationSettings from './common/NotificationSettings';
import DisplaySettings from './common/DisplaySettings';
import GDPRComplianceComponent from './common/GDPRComplianceComponent';
import { Palette, Cookie, Settings as SettingsIcon, Bell, Monitor, User, Shield, Database, Globe } from 'lucide-react'; // Icons

/**
 * SettingsComponent provides options for user settings, including theme selection and cookie management.
 */
const SettingsComponent = ({ navigateTo }) => {
    const { theme, toggleTheme } = useThemeContext(); // Use the theme context
    const [showCookieSettings, setShowCookieSettings] = useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    const [showDisplaySettings, setShowDisplaySettings] = useState(false);
    const [showGDPRSettings, setShowGDPRSettings] = useState(false);

    return (
        <div className={`p-4 flex-1 overflow-auto ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
            <h2 className={`text-xl font-extrabold mb-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Settings</h2>

            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Theme Settings */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Palette className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Theme Settings</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Customize your visual experience</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Choose your preferred application theme. Your preference will be saved and remembered for future visits.
                    </p>
                    <PrimaryButton
                        onClick={toggleTheme}
                        Icon={Palette}
                        className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'}`}
                    >
                        Switch to {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                    </PrimaryButton>
                </div>

                {/* Cookie Settings */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-orange-100 p-2 rounded-lg">
                            <Cookie className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Cookie Preferences</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Manage your privacy and data preferences</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Control which cookies we can use to improve your experience. You can change these settings at any time.
                    </p>
                    <PrimaryButton
                        onClick={() => setShowCookieSettings(true)}
                        Icon={Cookie}
                        className={`${theme === 'dark' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-300' : 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-300'}`}
                    >
                        Manage Cookie Preferences
                    </PrimaryButton>
                </div>

                {/* Notification Settings */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Bell className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Notification Preferences</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Control how you receive notifications</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Configure your notification preferences for tickets, updates, and system alerts.
                    </p>
                    <PrimaryButton
                        onClick={() => setShowNotificationSettings(true)}
                        Icon={Bell}
                        className={`${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'}`}
                    >
                        Configure Notifications
                    </PrimaryButton>
                </div>

                {/* Display Settings */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <Monitor className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Display Settings</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Customize your dashboard and interface</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Adjust dashboard layout, items per page, and other display preferences.
                    </p>
                    <PrimaryButton
                        onClick={() => setShowDisplaySettings(true)}
                        Icon={SettingsIcon}
                        className={`${theme === 'dark' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300' : 'bg-green-600 hover:bg-green-700 focus:ring-green-300'}`}
                    >
                        Configure Display
                    </PrimaryButton>
                </div>

                {/* Account Settings */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-indigo-100 p-2 rounded-lg">
                            <User className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Account Settings</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Manage your account and profile information</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Update your profile information, change password, and manage account security settings.
                    </p>
                    <div className="space-y-3">
                        <PrimaryButton
                            onClick={() => navigateTo && navigateTo('/profile')}
                            Icon={User}
                            className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300'}`}
                        >
                            Edit Profile
                        </PrimaryButton>
                        <PrimaryButton
                            onClick={() => navigateTo && navigateTo('/change-password')}
                            Icon={Shield}
                            className={`${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-300' : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-300'}`}
                        >
                            Change Password
                        </PrimaryButton>
                    </div>
                </div>

                {/* Data & Privacy / GDPR Compliance */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-red-100 p-2 rounded-lg">
                            <Shield className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Data & Privacy (GDPR)</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Manage your data rights and privacy preferences</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Access comprehensive GDPR compliance features including data export, account deletion, and consent management.
                    </p>
                    <PrimaryButton
                        onClick={() => setShowGDPRSettings(!showGDPRSettings)}
                        Icon={Shield}
                        className={`${theme === 'dark' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300' : 'bg-red-600 hover:bg-red-700 focus:ring-red-300'}`}
                    >
                        {showGDPRSettings ? 'Hide' : 'Manage'} Privacy & Data Settings
                    </PrimaryButton>
                </div>
                
                {showGDPRSettings && (
                    <div className="mt-4">
                        <GDPRComplianceComponent />
                    </div>
                )}

                {/* Language & Region */}
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <Globe className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Language & Region</h3>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Set your language and regional preferences</p>
                        </div>
                    </div>
                    <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Choose your preferred language, timezone, and date format.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Language</label>
                            <select className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            }`}>
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Timezone</label>
                            <select className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                    : 'bg-white border-gray-300 text-gray-900'
                            }`}>
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern Time</option>
                                <option value="America/Chicago">Central Time</option>
                                <option value="America/Denver">Mountain Time</option>
                                <option value="America/Los_Angeles">Pacific Time</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Settings Modals */}
            <CookieSettings 
                isOpen={showCookieSettings} 
                onClose={() => setShowCookieSettings(false)} 
            />
            
            <NotificationSettings 
                isOpen={showNotificationSettings} 
                onClose={() => setShowNotificationSettings(false)} 
            />
            
            <DisplaySettings 
                isOpen={showDisplaySettings} 
                onClose={() => setShowDisplaySettings(false)} 
            />
        </div>
    );
};

export default SettingsComponent;

