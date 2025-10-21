import React from 'react';
import { Bell, User, Plus } from 'lucide-react';
import TooltipBubble from './TooltipBubble';

/**
 * Test component to verify tooltip isolation and positioning
 * This component tests if tooltips are properly isolated and positioned
 * relative to their individual trigger elements
 */
const TooltipIsolationTest = () => {
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Tooltip Isolation Test</h1>
            
            <div className="space-y-6">
                {/* Header Simulation */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Header Tooltip Test - Individual Positioning</h3>
                    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex items-center gap-4">
                        {/* Create Button */}
                        <TooltipBubble title="Create a new ticket" id="test-create-tooltip">
                            <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200">
                                <Plus className="w-4 h-4" />
                                <span>Create</span>
                            </button>
                        </TooltipBubble>

                        {/* Notification Bell */}
                        <TooltipBubble title="Notifications" id="test-notification-tooltip">
                            <button className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200">
                                <Bell className="w-5 h-5" />
                            </button>
                        </TooltipBubble>

                        {/* Profile Button */}
                        <TooltipBubble title="Profile" id="test-profile-tooltip">
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
                            <TooltipBubble title="Create a new ticket" id="individual-create-tooltip">
                                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-all duration-200 mx-auto">
                                    <Plus className="w-4 h-4" />
                                    Create Ticket
                                </button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="text-center">
                            <h4 className="font-medium text-gray-800 mb-3">Notification Bell</h4>
                            <TooltipBubble title="View notifications" id="individual-notification-tooltip">
                                <button className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 mx-auto">
                                    <Bell className="w-5 h-5" />
                                </button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="text-center">
                            <h4 className="font-medium text-gray-800 mb-3">Profile Icon</h4>
                            <TooltipBubble title="View profile" id="individual-profile-tooltip">
                                <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-300 hover:bg-gray-200 transition-all duration-200 mx-auto">
                                    U
                                </button>
                            </TooltipBubble>
                        </div>
                    </div>
                </div>

                {/* Spacing Test */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Spacing Test - Different Gaps</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-20">Gap 2:</span>
                            <TooltipBubble title="Tooltip 1" id="spacing-test-1">
                                <button className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Button 1</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 2" id="spacing-test-2">
                                <button className="px-2 py-1 bg-green-500 text-white rounded text-sm">Button 2</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 3" id="spacing-test-3">
                                <button className="px-2 py-1 bg-red-500 text-white rounded text-sm">Button 3</button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 w-20">Gap 4:</span>
                            <TooltipBubble title="Tooltip 4" id="spacing-test-4">
                                <button className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Button 4</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 5" id="spacing-test-5">
                                <button className="px-2 py-1 bg-green-500 text-white rounded text-sm">Button 5</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 6" id="spacing-test-6">
                                <button className="px-2 py-1 bg-red-500 text-white rounded text-sm">Button 6</button>
                            </TooltipBubble>
                        </div>
                        
                        <div className="flex items-center gap-8">
                            <span className="text-sm text-gray-600 w-20">Gap 8:</span>
                            <TooltipBubble title="Tooltip 7" id="spacing-test-7">
                                <button className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Button 7</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 8" id="spacing-test-8">
                                <button className="px-2 py-1 bg-green-500 text-white rounded text-sm">Button 8</button>
                            </TooltipBubble>
                            <TooltipBubble title="Tooltip 9" id="spacing-test-9">
                                <button className="px-2 py-1 bg-red-500 text-white rounded text-sm">Button 9</button>
                            </TooltipBubble>
                        </div>
                    </div>
                </div>

                {/* Test Results */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Expected Results:</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                        <li>• <strong>Individual positioning:</strong> Each tooltip should appear directly under its own button</li>
                        <li>• <strong>No interference:</strong> Tooltips should not affect each other's positioning</li>
                        <li>• <strong>Consistent behavior:</strong> All tooltips should use the same positioning logic</li>
                        <li>• <strong>Proper isolation:</strong> Each tooltip should be independent of others</li>
                        <li>• <strong>Direct alignment:</strong> Tooltips should be left-aligned with their trigger elements</li>
                    </ul>
                </div>

                {/* Debug Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Debug Information:</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Isolation:</strong> Each TooltipBubble has <code>isolation: 'isolate'</code> to prevent stacking context issues</p>
                        <p><strong>Unique IDs:</strong> Each tooltip has a unique <code>data-tooltip-id</code> attribute</p>
                        <p><strong>Positioning:</strong> Tooltips use <code>getBoundingClientRect()</code> on their individual trigger elements</p>
                        <p><strong>Portal:</strong> Tooltips are rendered using <code>createPortal</code> to document.body</p>
                        <p><strong>Z-index:</strong> All tooltips use <code>zIndex: 9999</code> for proper layering</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TooltipIsolationTest;
