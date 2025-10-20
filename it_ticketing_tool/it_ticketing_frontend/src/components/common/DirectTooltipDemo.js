import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, User, Plus } from 'lucide-react';
import TooltipBubble from './TooltipBubble';

/**
 * Demo component to showcase direct tooltip positioning
 * This component demonstrates how tooltips now appear directly under elements
 * without any horizontal offset
 */
const DirectTooltipDemo = () => {
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Direct Tooltip Positioning Demo</h1>
            
            <div className="space-y-6">
                {/* Header Preview */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Header Tooltips - Direct Positioning</h3>
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

                {/* Individual Tests */}
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

                {/* Positioning Explanation */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Direct Positioning Features:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Positioning Logic:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Tooltips appear directly under elements (left-aligned)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>No horizontal centering offset</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Arrow points to the left edge of the element</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Consistent positioning across all tooltips</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Technical Details:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>leftPosition = rect.left (no centering calculation)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Arrow positioned at left: 12px</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Still prevents off-screen positioning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Maintains smart above/below positioning</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Benefits of Direct Positioning:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Precise alignment:</strong> Tooltips appear exactly where users expect them</li>
                        <li>• <strong>No confusion:</strong> Clear visual connection between element and tooltip</li>
                        <li>• <strong>Consistent behavior:</strong> All tooltips use the same direct positioning</li>
                        <li>• <strong>Better UX:</strong> Users can easily see which element the tooltip refers to</li>
                        <li>• <strong>Professional appearance:</strong> Clean, aligned tooltip positioning</li>
                        <li>• <strong>Maintains smart features:</strong> Still prevents off-screen positioning</li>
                    </ul>
                </div>

                {/* Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">How to Test:</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Hover over the Create button, notification bell, and profile icon</li>
                        <li>• Notice how tooltips appear directly under each element</li>
                        <li>• Tooltips are left-aligned with the elements (no centering)</li>
                        <li>• Arrows point to the left edge of the elements</li>
                        <li>• Tooltips still position above if there's no space below</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default DirectTooltipDemo;
