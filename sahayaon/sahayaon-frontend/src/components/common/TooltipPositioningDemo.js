import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, Plus, Search, Home, Settings } from 'lucide-react';
import TooltipBubble from './TooltipBubble';

/**
 * Demo component to showcase improved tooltip positioning
 * This component demonstrates how tooltips now position themselves correctly
 * and avoid going off-screen
 */
const TooltipPositioningDemo = () => {
    const [selectedPosition, setSelectedPosition] = useState('center');

    const positions = [
        { value: 'top-left', label: 'Top Left', description: 'Test tooltips in top-left corner' },
        { value: 'top-right', label: 'Top Right', description: 'Test tooltips in top-right corner' },
        { value: 'center', label: 'Center', description: 'Test tooltips in center of screen' },
        { value: 'bottom-left', label: 'Bottom Left', description: 'Test tooltips in bottom-left corner' },
        { value: 'bottom-right', label: 'Bottom Right', description: 'Test tooltips in bottom-right corner' }
    ];

    const getPositionClasses = () => {
        switch (selectedPosition) {
            case 'top-left':
                return 'justify-start items-start';
            case 'top-right':
                return 'justify-end items-start';
            case 'center':
                return 'justify-center items-center';
            case 'bottom-left':
                return 'justify-start items-end';
            case 'bottom-right':
                return 'justify-end items-end';
            default:
                return 'justify-center items-center';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Tooltip Positioning Demo</h1>
            
            <div className="space-y-6">
                {/* Controls */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Test Tooltip Positioning</h2>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Test Position:
                        </label>
                        <select
                            value={selectedPosition}
                            onChange={(e) => setSelectedPosition(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {positions.map(position => (
                                <option key={position.value} value={position.value}>
                                    {position.label} - {position.description}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Header Preview */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Header Tooltips Test</h3>
                    <div className={`border border-gray-200 rounded-lg p-8 flex ${getPositionClasses()}`} style={{ minHeight: '400px' }}>
                        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex items-center gap-4">
                            {/* Create Button */}
                            <TooltipBubble title="Create a new ticket">
                                <Link 
                                    to="/create-ticket" 
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap bg-white text-orange-500 border border-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create</span>
                                </Link>
                            </TooltipBubble>

                            {/* Notification Bell */}
                            <TooltipBubble title="Notifications">
                                <button className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200">
                                    <Bell className="w-5 h-5" />
                                </button>
                            </TooltipBubble>

                            {/* Profile Button */}
                            <TooltipBubble title="Profile">
                                <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all duration-200">
                                    U
                                </button>
                            </TooltipBubble>
                        </div>
                    </div>
                </div>

                {/* Individual Tooltip Tests */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Individual Tooltip Tests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <h4 className="font-medium text-gray-800 mb-3">Create Button</h4>
                            <TooltipBubble title="Create a new ticket">
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 mx-auto">
                                    <Plus className="w-4 h-4" />
                                    Create Ticket
                                </button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="text-center">
                            <h4 className="font-medium text-gray-800 mb-3">Notification Bell</h4>
                            <TooltipBubble title="View notifications">
                                <button className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 mx-auto">
                                    <Bell className="w-5 h-5" />
                                </button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="text-center">
                            <h4 className="font-medium text-gray-800 mb-3">Profile Icon</h4>
                            <TooltipBubble title="View profile">
                                <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-300 hover:bg-gray-200 transition-all duration-200 mx-auto">
                                    U
                                </button>
                            </TooltipBubble>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Improved Tooltip Features:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Smart Positioning:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Centers horizontally relative to the element</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Automatically positions above if no space below</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Prevents tooltips from going off-screen</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Consistent positioning across all tooltips</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Visual Improvements:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Smooth fade-in animation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Proper z-index for overlay positioning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Portal rendering for better performance</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Consistent styling across all tooltips</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Benefits:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Better UX:</strong> Tooltips are always visible and properly positioned</li>
                        <li>• <strong>No more cut-offs:</strong> Smart positioning prevents tooltips from going off-screen</li>
                        <li>• <strong>Consistent behavior:</strong> All tooltips use the same positioning logic</li>
                        <li>• <strong>Professional appearance:</strong> Centered positioning looks more polished</li>
                        <li>• <strong>Responsive design:</strong> Works well on all screen sizes</li>
                        <li>• <strong>Performance optimized:</strong> Portal rendering and efficient calculations</li>
                    </ul>
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">How to Test:</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Hover over the Create button, notification bell, and profile icon</li>
                        <li>• Try different positions to see how tooltips adapt</li>
                        <li>• Notice how tooltips center horizontally on their elements</li>
                        <li>• Test on different screen sizes to see responsive behavior</li>
                        <li>• Tooltips will automatically position above if there's no space below</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TooltipPositioningDemo;
