import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, Search, Home, Settings } from 'lucide-react';

/**
 * Demo component to showcase responsive Create button positioning
 * This component demonstrates how the Create button adapts to different screen sizes
 * and avoids collisions with other header items
 */
const ResponsiveCreateButtonDemo = () => {
    const [selectedRole, setSelectedRole] = useState('admin');
    const [screenSize, setScreenSize] = useState('desktop');

    const roles = [
        { value: 'admin', label: 'Admin', description: 'Dashboard + Management + Search + Create + Notifications' },
        { value: 'support', label: 'Support', description: 'Dashboard + Search + Create + Notifications' },
        { value: 'user', label: 'User', description: 'Search + Create + Contact Info + Notifications' }
    ];

    const screenSizes = [
        { value: 'mobile', label: 'Mobile (< 768px)', width: '320px' },
        { value: 'tablet', label: 'Tablet (768px - 1024px)', width: '768px' },
        { value: 'desktop', label: 'Desktop (> 1024px)', width: '1200px' },
        { value: 'large', label: 'Large Desktop (> 1280px)', width: '1400px' }
    ];

    const getCurrentWidth = () => {
        const size = screenSizes.find(s => s.value === screenSize);
        return size ? size.width : '1200px';
    };

    const renderHeader = () => {
        const isAdmin = selectedRole === 'admin';
        const isSupport = selectedRole === 'support';
        const isUser = selectedRole === 'user';
        const isMobile = screenSize === 'mobile';
        const isTablet = screenSize === 'tablet';
        const isDesktop = screenSize === 'desktop' || screenSize === 'large';

        return (
            <div 
                className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3"
                style={{ width: getCurrentWidth() }}
            >
                {/* Logo Section */}
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        K
                    </div>
                </div>

                {/* Left Navigation */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Dashboard button for Admin/Support */}
                    {(isAdmin || isSupport) && (
                        <div className={`${isMobile ? 'hidden' : 'block'}`}>
                            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
                                <Home className="w-4 h-4" />
                                <span className="hidden sm:inline">Dashboard</span>
                            </button>
                        </div>
                    )}

                    {/* Management Dropdown for Admin */}
                    {isAdmin && (
                        <div className={`${isMobile ? 'hidden' : 'block'}`}>
                            <button className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50">
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">Manage</span>
                            </button>
                        </div>
                    )}

                    {/* Search Component */}
                    {(isAdmin || isSupport || isUser) && (
                        <div className={`${isMobile ? 'hidden' : 'block'}`}>
                            <div className={`${isDesktop ? 'w-64' : isTablet ? 'w-48' : 'w-32'}`}>
                                <div className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md bg-gray-50">
                                    <Search className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-500">Search...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mobile Search Button */}
                    {isMobile && (
                        <button className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100">
                            <Search className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1 min-w-0" />

                {/* Contact Information (for User role) */}
                {isUser && (
                    <div className={`contact-info ${isDesktop ? 'flex' : 'hidden'} items-center gap-2 mr-2`}>
                        <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-50">
                                <span className="text-gray-600 font-medium text-xs">📞 +91 9391930393</span>
                            </div>
                            <div className="w-px h-6 bg-gray-300"></div>
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-50">
                                <span className="text-gray-600 font-medium text-xs">✉️ HelloIT@kriasol.com</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Section: Create Button + Notifications + Profile */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0">
                    {/* Create Ticket Button - Next to notification bell */}
                    <div className="group relative">
                        <Link 
                            to="/create-ticket" 
                            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap bg-white text-orange-500 border border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 flex-shrink-0`}
                        >
                            <span className="text-orange-500">+</span>
                            <span className="hidden sm:inline">Create</span>
                        </Link>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Create a new ticket
                        </div>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200">
                            <Bell className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Profile Button */}
                    <div className="relative">
                        <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200">
                            U
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Responsive Create Button Demo</h1>
            
            <div className="space-y-6">
                {/* Controls */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Test Different Scenarios</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                User Role:
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {roles.map(role => (
                                    <option key={role.value} value={role.value}>
                                        {role.label} - {role.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Screen Size:
                            </label>
                            <select
                                value={screenSize}
                                onChange={(e) => setScreenSize(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {screenSizes.map(size => (
                                    <option key={size.value} value={size.value}>
                                        {size.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Header Preview */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Header Preview</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {renderHeader()}
                    </div>
                </div>

                {/* Features */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Responsive Features:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Create Button Positioning:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Always positioned next to notification bell (left of it)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Responsive padding: px-2 on mobile, px-3 on larger screens</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Text hidden on small screens, visible on sm+ screens</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Flex-shrink-0 prevents button from shrinking</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Collision Prevention:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Contact info hidden on smaller screens (xl+ only)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Responsive gaps between elements</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Search bar adapts width based on screen size</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Navigation items hide on mobile to save space</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Benefits:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Consistent positioning:</strong> Create button always in the same relative position</li>
                        <li>• <strong>No collisions:</strong> Responsive design prevents overlap with other elements</li>
                        <li>• <strong>Better UX:</strong> Users can always find the Create button in the same location</li>
                        <li>• <strong>Mobile friendly:</strong> Optimized for all screen sizes</li>
                        <li>• <strong>Clean layout:</strong> Elements adapt gracefully to available space</li>
                        <li>• <strong>Professional appearance:</strong> Maintains visual hierarchy across all devices</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResponsiveCreateButtonDemo;
