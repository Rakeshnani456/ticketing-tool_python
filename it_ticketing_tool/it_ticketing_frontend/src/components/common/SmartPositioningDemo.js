import React, { useState } from 'react';
import CustomDropdown from './CustomDropdown';

/**
 * Demo component to showcase smart dropdown positioning
 * This component demonstrates how dropdowns intelligently position themselves
 * to avoid going out of the viewport
 */
const SmartPositioningDemo = () => {
    const [selectedEngineer, setSelectedEngineer] = useState('');

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
            <h1 className="text-2xl font-bold mb-6">Smart Dropdown Positioning Demo</h1>
            
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Test Smart Positioning</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Try opening the dropdowns in different positions on the screen. 
                        Dropdowns will automatically open upward when they would go out of the viewport.
                    </p>
                    
                    {/* Top section - should open downward */}
                    <div className="mb-8">
                        <h3 className="text-md font-medium mb-3 text-green-600">Top Section (Opens Downward)</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="min-w-[180px] max-w-[280px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Engineer 1:
                                </label>
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={engineerOptions}
                                    placeholder="Select engineer..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                            <div className="min-w-[180px] max-w-[280px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Engineer 2:
                                </label>
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
                    </div>

                    {/* Spacer to push content down */}
                    <div className="h-96 bg-gradient-to-b from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                        <p className="text-gray-500 text-sm">Scroll down to test bottom positioning</p>
                    </div>

                    {/* Bottom section - should open upward */}
                    <div className="mt-8">
                        <h3 className="text-md font-medium mb-3 text-blue-600">Bottom Section (Opens Upward)</h3>
                        <div className="flex flex-wrap gap-4">
                            <div className="min-w-[180px] max-w-[280px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Engineer 3:
                                </label>
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={engineerOptions}
                                    placeholder="Select engineer..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                            <div className="min-w-[180px] max-w-[280px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Engineer 4:
                                </label>
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
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Smart Positioning Features:</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Automatically detects available space above and below</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Opens upward when there's insufficient space below</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Prevents dropdown from going off-screen</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Adjusts width based on content length</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Handles edge cases and viewport boundaries</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Responsive to window resizing and scrolling</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">How It Works:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Calculates available space above and below the button</li>
                        <li>• Estimates dropdown height based on number of options</li>
                        <li>• Chooses the direction with more available space</li>
                        <li>• Applies appropriate animations (fadeInUp vs fadeInDown)</li>
                        <li>• Adjusts border radius for visual connection to button</li>
                        <li>• Recalculates position on scroll and resize events</li>
                    </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Perfect for Tables:</h3>
                    <p className="text-sm text-yellow-700">
                        This smart positioning is especially useful in data tables where the last few rows 
                        would cause dropdowns to go off-screen. Now they automatically open upward, 
                        making all options accessible regardless of the row position.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SmartPositioningDemo;
