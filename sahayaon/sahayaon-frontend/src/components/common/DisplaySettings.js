// src/components/common/DisplaySettings.js

import React, { useState, useEffect } from 'react';
import { Monitor, Grid, List, Eye, Filter, RefreshCw, XCircle } from 'lucide-react';
import { useUserPreferences } from '../../hooks/useCookies';

/**
 * Display Settings Component
 * Allows users to configure their display and interface preferences
 */
const DisplaySettings = ({ isOpen, onClose }) => {
    const { preferences, updateDashboardPreferences, updateTicketPreferences } = useUserPreferences();
    const [localSettings, setLocalSettings] = useState({
        // Dashboard settings
        layout: 'grid',
        itemsPerPage: 10,
        showFilters: true,
        showSearch: true,
        compactMode: false,
        
        // Ticket settings
        defaultView: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        autoRefresh: true,
        refreshInterval: 30,
        showPriority: true,
        showStatus: true,
        showAssignee: true,
        showDate: true
    });

    useEffect(() => {
        if (preferences) {
            setLocalSettings(prev => ({
                ...prev,
                ...preferences.dashboard,
                ...preferences.tickets
            }));
        }
    }, [preferences]);

    const handleInputChange = (field, value) => {
        setLocalSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = () => {
        // Split settings into dashboard and ticket preferences
        const { defaultView, sortBy, sortOrder, autoRefresh, refreshInterval, showPriority, showStatus, showAssignee, showDate, ...dashboardSettings } = localSettings;
        
        const ticketSettings = {
            defaultView,
            sortBy,
            sortOrder,
            autoRefresh,
            refreshInterval,
            showPriority,
            showStatus,
            showAssignee,
            showDate
        };

        updateDashboardPreferences(dashboardSettings);
        updateTicketPreferences(ticketSettings);
        onClose();
    };

    const handleReset = () => {
        setLocalSettings({
            layout: 'grid',
            itemsPerPage: 10,
            showFilters: true,
            showSearch: true,
            compactMode: false,
            defaultView: 'all',
            sortBy: 'createdAt',
            sortOrder: 'desc',
            autoRefresh: true,
            refreshInterval: 30,
            showPriority: true,
            showStatus: true,
            showAssignee: true,
            showDate: true
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <Monitor className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Display Settings</h2>
                                <p className="text-sm text-gray-600">Customize your dashboard and interface</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Dashboard Settings */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Dashboard Settings</h3>
                            
                            {/* Layout Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Layout Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleInputChange('layout', 'grid')}
                                        className={`p-3 border rounded-lg flex items-center space-x-2 ${
                                            localSettings.layout === 'grid' 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <Grid className="w-4 h-4" />
                                        <span className="text-sm">Grid</span>
                                    </button>
                                    <button
                                        onClick={() => handleInputChange('layout', 'list')}
                                        className={`p-3 border rounded-lg flex items-center space-x-2 ${
                                            localSettings.layout === 'list' 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <List className="w-4 h-4" />
                                        <span className="text-sm">List</span>
                                    </button>
                                </div>
                            </div>

                            {/* Items Per Page */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Items Per Page</label>
                                <select
                                    value={localSettings.itemsPerPage}
                                    onChange={(e) => handleInputChange('itemsPerPage', parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value={5}>5 items</option>
                                    <option value={10}>10 items</option>
                                    <option value={20}>20 items</option>
                                    <option value={50}>50 items</option>
                                    <option value={100}>100 items</option>
                                </select>
                            </div>

                            {/* Show Filters */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Filter className="w-5 h-5 text-gray-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Show Filters</h4>
                                        <p className="text-sm text-gray-600">Display filter options on dashboard</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.showFilters}
                                        onChange={(e) => handleInputChange('showFilters', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Show Search */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Eye className="w-5 h-5 text-gray-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Show Search</h4>
                                        <p className="text-sm text-gray-600">Display search bar on dashboard</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.showSearch}
                                        onChange={(e) => handleInputChange('showSearch', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Compact Mode */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div>
                                    <h4 className="font-medium text-gray-900">Compact Mode</h4>
                                    <p className="text-sm text-gray-600">Use smaller spacing for more content</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.compactMode}
                                        onChange={(e) => handleInputChange('compactMode', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        </div>

                        {/* Ticket Settings */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Ticket Settings</h3>
                            
                            {/* Default View */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Ticket View</label>
                                <select
                                    value={localSettings.defaultView}
                                    onChange={(e) => handleInputChange('defaultView', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Tickets</option>
                                    <option value="my-tickets">My Tickets</option>
                                    <option value="assigned">Assigned to Me</option>
                                    <option value="open">Open Tickets</option>
                                    <option value="closed">Closed Tickets</option>
                                </select>
                            </div>

                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                                <select
                                    value={localSettings.sortBy}
                                    onChange={(e) => handleInputChange('sortBy', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="createdAt">Created Date</option>
                                    <option value="updatedAt">Updated Date</option>
                                    <option value="priority">Priority</option>
                                    <option value="status">Status</option>
                                    <option value="title">Title</option>
                                </select>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleInputChange('sortOrder', 'desc')}
                                        className={`p-3 border rounded-lg ${
                                            localSettings.sortOrder === 'desc' 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <span className="text-sm">Newest First</span>
                                    </button>
                                    <button
                                        onClick={() => handleInputChange('sortOrder', 'asc')}
                                        className={`p-3 border rounded-lg ${
                                            localSettings.sortOrder === 'asc' 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    >
                                        <span className="text-sm">Oldest First</span>
                                    </button>
                                </div>
                            </div>

                            {/* Auto Refresh */}
                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <RefreshCw className="w-5 h-5 text-gray-600" />
                                    <div>
                                        <h4 className="font-medium text-gray-900">Auto Refresh</h4>
                                        <p className="text-sm text-gray-600">Automatically refresh ticket lists</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={localSettings.autoRefresh}
                                        onChange={(e) => handleInputChange('autoRefresh', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Refresh Interval */}
                            {localSettings.autoRefresh && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Refresh Interval (seconds)</label>
                                    <select
                                        value={localSettings.refreshInterval}
                                        onChange={(e) => handleInputChange('refreshInterval', parseInt(e.target.value))}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value={10}>10 seconds</option>
                                        <option value={30}>30 seconds</option>
                                        <option value={60}>1 minute</option>
                                        <option value={300}>5 minutes</option>
                                    </select>
                                </div>
                            )}

                            {/* Column Visibility */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Show Columns</h4>
                                <div className="space-y-2">
                                    {[
                                        { key: 'showPriority', label: 'Priority' },
                                        { key: 'showStatus', label: 'Status' },
                                        { key: 'showAssignee', label: 'Assignee' },
                                        { key: 'showDate', label: 'Date' }
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">{label}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={localSettings[key]}
                                                    onChange={(e) => handleInputChange(key, e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
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
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DisplaySettings;
