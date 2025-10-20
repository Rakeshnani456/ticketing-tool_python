import React from 'react';
import { useResponsiveSearchWidth, useScreenWidth } from '../../hooks/useResponsiveSearchWidth';

/**
 * Demo component to showcase responsive search bar behavior
 * This component shows how the search bar width adapts to different user roles and screen sizes
 */
const ResponsiveSearchDemo = () => {
    const screenWidth = useScreenWidth();
    
    const adminWidths = useResponsiveSearchWidth('admin', screenWidth);
    const supportWidths = useResponsiveSearchWidth('support', screenWidth);
    const userWidths = useResponsiveSearchWidth('user', screenWidth);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Responsive Search Bar Demo</h1>
            
            <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Current Screen Width: {screenWidth}px</p>
            </div>

            <div className="space-y-8">
                {/* Admin Role */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4 text-blue-600">Admin Role</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Navigation: Dashboard + Management + Search + Create
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Large:</span>
                            <div 
                                className="bg-blue-100 border-2 border-blue-300 rounded px-3 py-1"
                                style={{ width: `${adminWidths.lg}px` }}
                            >
                                Search Bar ({adminWidths.lg}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Medium:</span>
                            <div 
                                className="bg-blue-100 border-2 border-blue-300 rounded px-3 py-1"
                                style={{ width: `${adminWidths.md}px` }}
                            >
                                Search Bar ({adminWidths.md}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Small:</span>
                            <div 
                                className="bg-blue-100 border-2 border-blue-300 rounded px-3 py-1"
                                style={{ width: `${adminWidths.sm}px` }}
                            >
                                Search Bar ({adminWidths.sm}px)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Support Role */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4 text-green-600">Support Role</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Navigation: Dashboard + Search + Create
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Large:</span>
                            <div 
                                className="bg-green-100 border-2 border-green-300 rounded px-3 py-1"
                                style={{ width: `${supportWidths.lg}px` }}
                            >
                                Search Bar ({supportWidths.lg}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Medium:</span>
                            <div 
                                className="bg-green-100 border-2 border-green-300 rounded px-3 py-1"
                                style={{ width: `${supportWidths.md}px` }}
                            >
                                Search Bar ({supportWidths.md}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Small:</span>
                            <div 
                                className="bg-green-100 border-2 border-green-300 rounded px-3 py-1"
                                style={{ width: `${supportWidths.sm}px` }}
                            >
                                Search Bar ({supportWidths.sm}px)
                            </div>
                        </div>
                    </div>
                </div>

                {/* User Role */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4 text-purple-600">User Role</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Navigation: Search + Create
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Large:</span>
                            <div 
                                className="bg-purple-100 border-2 border-purple-300 rounded px-3 py-1"
                                style={{ width: `${userWidths.lg}px` }}
                            >
                                Search Bar ({userWidths.lg}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Medium:</span>
                            <div 
                                className="bg-purple-100 border-2 border-purple-300 rounded px-3 py-1"
                                style={{ width: `${userWidths.md}px` }}
                            >
                                Search Bar ({userWidths.md}px)
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-20 text-sm">Small:</span>
                            <div 
                                className="bg-purple-100 border-2 border-purple-300 rounded px-3 py-1"
                                style={{ width: `${userWidths.sm}px` }}
                            >
                                Search Bar ({userWidths.sm}px)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">How it works:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Search bar width adapts based on the number of navigation items</li>
                    <li>• Admin roles get less search space (more navigation items)</li>
                    <li>• Support roles get moderate search space</li>
                    <li>• Regular users get the most search space (fewest navigation items)</li>
                    <li>• Width calculations are responsive to screen size</li>
                </ul>
            </div>
        </div>
    );
};

export default ResponsiveSearchDemo;
