import React, { useState } from 'react';
import CustomDropdown from './CustomDropdown';

/**
 * Comprehensive demo component to showcase all smart positioning features
 * This component demonstrates smart positioning for:
 * 1. CustomDropdown components (table dropdowns)
 * 2. Assign Tickets popup dropdown
 * 3. Profile popups
 * 4. Ticket ID popups
 */
const ComprehensiveSmartPositioningDemo = () => {
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [showAssignPopup, setShowAssignPopup] = useState(false);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [showTicketPopup, setShowTicketPopup] = useState(false);

    // Sample engineer data
    const engineerOptions = [
        { value: 'unassigned', label: 'Unassigned' },
        { value: 'john.doe@company.com', label: 'John Doe' },
        { value: 'alexandra.smith@company.com', label: 'Alexandra Smith' },
        { value: 'christopher.johnson@company.com', label: 'Christopher Johnson' },
        { value: 'elizabeth.williams@company.com', label: 'Elizabeth Williams' },
        { value: 'michael.brown@company.com', label: 'Michael Brown' },
        { value: 'sarah.davis@company.com', label: 'Sarah Davis' },
        { value: 'robert.wilson@company.com', label: 'Robert Wilson' },
        { value: 'jennifer.moore@company.com', label: 'Jennifer Moore' },
        { value: 'william.taylor@company.com', label: 'William Taylor' },
        { value: 'patricia.anderson@company.com', label: 'Patricia Anderson' },
        { value: 'david.thomas@company.com', label: 'David Thomas' },
        { value: 'linda.jackson@company.com', label: 'Linda Jackson' },
        { value: 'james.white@company.com', label: 'James White' },
        { value: 'barbara.harris@company.com', label: 'Barbara Harris' },
        { value: 'richard.martin@company.com', label: 'Richard Martin' },
        { value: 'susan.garcia@company.com', label: 'Susan Garcia' },
        { value: 'joseph.martinez@company.com', label: 'Joseph Martinez' },
        { value: 'jessica.robinson@company.com', label: 'Jessica Robinson' },
        { value: 'thomas.clark@company.com', label: 'Thomas Clark' }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Comprehensive Smart Positioning Demo</h1>
            
            <div className="space-y-8">
                {/* Table Dropdown Demo */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">1. Table Dropdowns (CustomDropdown)</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        These dropdowns automatically adjust their position based on available space.
                        Try opening them in different positions on the screen.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Engineer Assignment:
                            </label>
                            <div className="min-w-[180px] max-w-[280px]">
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={engineerOptions}
                                    placeholder="Select engineer..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status Change:
                            </label>
                            <div className="min-w-[180px] max-w-[280px]">
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={[
                                        { value: 'open', label: 'Open' },
                                        { value: 'in-progress', label: 'In Progress' },
                                        { value: 'hold', label: 'Hold' },
                                        { value: 'resolved', label: 'Resolved' },
                                        { value: 'closed', label: 'Closed' }
                                    ]}
                                    placeholder="Select status..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Priority Level:
                            </label>
                            <div className="min-w-[180px] max-w-[280px]">
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' }
                                    ]}
                                    placeholder="Select priority..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spacer to test bottom positioning */}
                <div className="h-96 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 text-sm">Scroll down to test bottom positioning</p>
                </div>

                {/* Assign Popup Demo */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">2. Assign Tickets Popup</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        The "Assign Tickets to Engineer" popup uses the same CustomDropdown component
                        and benefits from smart positioning.
                    </p>
                    
                    <button
                        onClick={() => setShowAssignPopup(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Open Assign Popup
                    </button>
                </div>

                {/* Profile Popup Demo */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">3. Profile Popups</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Profile popups now have smart positioning to avoid going off-screen.
                    </p>
                    
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowProfilePopup(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                            Show Profile Popup
                        </button>
                        
                        <button
                            onClick={() => setShowTicketPopup(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                        >
                            Show Ticket ID Popup
                        </button>
                    </div>
                </div>

                {/* Features Summary */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Smart Positioning Features:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Dropdown Components:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Automatic upward/downward positioning</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Content-aware width calculation</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Smooth animations for both directions</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Viewport boundary detection</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="font-medium text-gray-800 mb-2">Popup Components:</h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Smart positioning for profile popups</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Dynamic arrow direction</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Edge case handling</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 font-bold">✓</span>
                                    <span>Responsive to window resizing</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Benefits for All Tickets Page:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Table dropdowns:</strong> Always accessible regardless of row position</li>
                        <li>• <strong>Assign popup:</strong> Dropdown within popup uses smart positioning</li>
                        <li>• <strong>Profile popups:</strong> Never go off-screen when hovering over user names</li>
                        <li>• <strong>Ticket ID popups:</strong> Smart positioning for ticket ID hover popups</li>
                        <li>• <strong>Consistent UX:</strong> All popups and dropdowns behave intelligently</li>
                        <li>• <strong>Mobile friendly:</strong> Works well on all screen sizes</li>
                    </ul>
                </div>
            </div>

            {/* Assign Popup Modal */}
            {showAssignPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowAssignPopup(false)} />
                    <div className="relative z-10 bg-white border border-gray-300 rounded-md shadow-lg p-6 w-full max-w-md">
                        <button
                            onClick={() => setShowAssignPopup(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-semibold mb-4">Assign Tickets to Engineer</h3>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Engineer</label>
                            <CustomDropdown
                                value={selectedEngineer}
                                onChange={setSelectedEngineer}
                                options={[
                                    { value: '', label: 'Choose an engineer...' },
                                    ...engineerOptions.slice(1) // Remove 'Unassigned' option
                                ]}
                                className="w-full"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowAssignPopup(false)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowAssignPopup(false)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Popup */}
            {showProfilePopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowProfilePopup(false)} />
                    <div className="relative z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]">
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                            User Profile
                        </div>
                        <div className="px-3 py-2 text-sm space-y-3">
                            <div>
                                <div className="font-medium text-gray-900">John Doe</div>
                                <div className="text-gray-500">john.doe@company.com</div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                                    Copy Email
                                </button>
                                <button className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                                    Copy Name
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket ID Popup */}
            {showTicketPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowTicketPopup(false)} />
                    <div className="relative z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px]">
                        <div className="py-1">
                            <a
                                href="#"
                                className="block px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                            >
                                Open Ticket #12345
                            </a>
                            <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                                Copy Ticket ID
                            </button>
                            <button className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                                Copy Ticket URL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprehensiveSmartPositioningDemo;
