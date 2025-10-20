// src/components/common/NotificationSettings.js

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Monitor, XCircle, CheckCircle } from 'lucide-react';
import { useUserPreferences } from '../../hooks/useCookies';

/**
 * Notification Settings Component
 * Allows users to configure their notification preferences
 */
const NotificationSettings = ({ isOpen, onClose }) => {
    const { preferences, updateNotificationPreferences } = useUserPreferences();
    const [localSettings, setLocalSettings] = useState({
        email: true,
        push: true,
        desktop: false,
        ticketUpdates: true,
        systemAlerts: true,
        weeklyReports: false,
        dailyDigest: true,
        urgentOnly: false
    });

    useEffect(() => {
        if (preferences?.notifications) {
            setLocalSettings(prev => ({
                ...prev,
                ...preferences.notifications
            }));
        }
    }, [preferences]);

    const handleToggle = (setting) => {
        setLocalSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
    };

    const handleSave = () => {
        updateNotificationPreferences(localSettings);
        onClose();
    };

    const handleReset = () => {
        setLocalSettings({
            email: true,
            push: true,
            desktop: false,
            ticketUpdates: true,
            systemAlerts: true,
            weeklyReports: false,
            dailyDigest: true,
            urgentOnly: false
        });
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
                                <Bell className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
                                <p className="text-sm text-gray-600">Configure how you receive notifications</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Notification Channels */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h3>
                            
                            {/* Email Notifications */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div className="flex items-center space-x-3">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Email Notifications</h4>
                                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.email}
                                        onChange={() => handleToggle('email')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Push Notifications */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div className="flex items-center space-x-3">
                                    <Smartphone className="w-5 h-5 text-green-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Push Notifications</h4>
                                        <p className="text-sm text-gray-600">Receive push notifications on your device</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.push}
                                        onChange={() => handleToggle('push')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Desktop Notifications */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div className="flex items-center space-x-3">
                                    <Monitor className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Desktop Notifications</h4>
                                        <p className="text-sm text-gray-600">Show desktop notifications when app is open</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.desktop}
                                        onChange={() => handleToggle('desktop')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Notification Types */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
                            
                            {/* Ticket Updates */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div>
                                    <h4 className="font-medium text-gray-900">Ticket Updates</h4>
                                    <p className="text-sm text-gray-600">Get notified when tickets are updated, assigned, or resolved</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.ticketUpdates}
                                        onChange={() => handleToggle('ticketUpdates')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* System Alerts */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div>
                                    <h4 className="font-medium text-gray-900">System Alerts</h4>
                                    <p className="text-sm text-gray-600">Receive important system maintenance and security alerts</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.systemAlerts}
                                        onChange={() => handleToggle('systemAlerts')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Weekly Reports */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div>
                                    <h4 className="font-medium text-gray-900">Weekly Reports</h4>
                                    <p className="text-sm text-gray-600">Receive weekly summary reports of your tickets and activities</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.weeklyReports}
                                        onChange={() => handleToggle('weeklyReports')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Daily Digest */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div>
                                    <h4 className="font-medium text-gray-900">Daily Digest</h4>
                                    <p className="text-sm text-gray-600">Get a daily summary of all your ticket activities</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.dailyDigest}
                                        onChange={() => handleToggle('dailyDigest')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Urgent Only */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-3">
                                <div>
                                    <h4 className="font-medium text-gray-900">Urgent Only</h4>
                                    <p className="text-sm text-gray-600">Only receive notifications for urgent or high-priority tickets</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.urgentOnly}
                                        onChange={() => handleToggle('urgentOnly')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Reset to Default
                        </button>
                        
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
