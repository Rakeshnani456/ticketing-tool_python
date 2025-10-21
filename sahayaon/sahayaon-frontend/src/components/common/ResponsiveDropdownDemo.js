import React, { useState } from 'react';
import CustomDropdown from './CustomDropdown';

/**
 * Demo component to showcase the improved responsive dropdown behavior
 * This component demonstrates how the dropdown adapts to different engineer names
 */
const ResponsiveDropdownDemo = () => {
    const [selectedEngineer, setSelectedEngineer] = useState('');

    // Sample engineer data with various name lengths
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
        { value: 'thomas.clark@company.com', label: 'Thomas Clark' },
        { value: 'sarah.rodriguez@company.com', label: 'Sarah Rodriguez' },
        { value: 'charles.lewis@company.com', label: 'Charles Lewis' },
        { value: 'karen.lee@company.com', label: 'Karen Lee' },
        { value: 'christopher.walker@company.com', label: 'Christopher Walker' },
        { value: 'nancy.hall@company.com', label: 'Nancy Hall' },
        { value: 'daniel.allen@company.com', label: 'Daniel Allen' },
        { value: 'lisa.young@company.com', label: 'Lisa Young' },
        { value: 'matthew.hernandez@company.com', label: 'Matthew Hernandez' },
        { value: 'betty.king@company.com', label: 'Betty King' },
        { value: 'anthony.wright@company.com', label: 'Anthony Wright' },
        { value: 'helen.lopez@company.com', label: 'Helen Lopez' },
        { value: 'mark.hill@company.com', label: 'Mark Hill' },
        { value: 'sandra.scott@company.com', label: 'Sandra Scott' },
        { value: 'donald.green@company.com', label: 'Donald Green' },
        { value: 'donna.adams@company.com', label: 'Donna Adams' },
        { value: 'steven.baker@company.com', label: 'Steven Baker' },
        { value: 'carol.gonzalez@company.com', label: 'Carol Gonzalez' },
        { value: 'paul.nelson@company.com', label: 'Paul Nelson' },
        { value: 'ruth.carter@company.com', label: 'Ruth Carter' },
        { value: 'andrew.mitchell@company.com', label: 'Andrew Mitchell' },
        { value: 'sharon.perez@company.com', label: 'Sharon Perez' },
        { value: 'joshua.roberts@company.com', label: 'Joshua Roberts' },
        { value: 'michelle.turner@company.com', label: 'Michelle Turner' },
        { value: 'kenneth.phillips@company.com', label: 'Kenneth Phillips' },
        { value: 'laura.campbell@company.com', label: 'Laura Campbell' },
        { value: 'kevin.parker@company.com', label: 'Kevin Parker' },
        { value: 'deborah.evans@company.com', label: 'Deborah Evans' },
        { value: 'brian.edwards@company.com', label: 'Brian Edwards' },
        { value: 'dorothy.collins@company.com', label: 'Dorothy Collins' },
        { value: 'ronald.stewart@company.com', label: 'Ronald Stewart' },
        { value: 'amy.sanchez@company.com', label: 'Amy Sanchez' },
        { value: 'timothy.morris@company.com', label: 'Timothy Morris' },
        { value: 'angela.rogers@company.com', label: 'Angela Rogers' },
        { value: 'jason.reed@company.com', label: 'Jason Reed' },
        { value: 'brenda.cook@company.com', label: 'Brenda Cook' },
        { value: 'jeffrey.morgan@company.com', label: 'Jeffrey Morgan' },
        { value: 'emma.bell@company.com', label: 'Emma Bell' },
        { value: 'jacob.murphy@company.com', label: 'Jacob Murphy' },
        { value: 'olivia.bailey@company.com', label: 'Olivia Bailey' },
        { value: 'gary.rivera@company.com', label: 'Gary Rivera' },
        { value: 'cynthia.cooper@company.com', label: 'Cynthia Cooper' },
        { value: 'ryan.richardson@company.com', label: 'Ryan Richardson' },
        { value: 'marie.cox@company.com', label: 'Marie Cox' },
        { value: 'nicholas.howard@company.com', label: 'Nicholas Howard' },
        { value: 'janet.ward@company.com', label: 'Janet Ward' },
        { value: 'eric.torres@company.com', label: 'Eric Torres' },
        { value: 'catherine.peterson@company.com', label: 'Catherine Peterson' },
        { value: 'jonathan.gray@company.com', label: 'Jonathan Gray' },
        { value: 'frances.ramirez@company.com', label: 'Frances Ramirez' },
        { value: 'stephen.james@company.com', label: 'Stephen James' },
        { value: 'christine.watson@company.com', label: 'Christine Watson' },
        { value: 'larry.brooks@company.com', label: 'Larry Brooks' },
        { value: 'samantha.kelly@company.com', label: 'Samantha Kelly' },
        { value: 'scott.sanders@company.com', label: 'Scott Sanders' },
        { value: 'debra.price@company.com', label: 'Debra Price' },
        { value: 'wayne.bennett@company.com', label: 'Wayne Bennett' },
        { value: 'rachel.wood@company.com', label: 'Rachel Wood' },
        { value: 'ralph.barnes@company.com', label: 'Ralph Barnes' },
        { value: 'carolyn.ross@company.com', label: 'Carolyn Ross' },
        { value: 'eugene.henderson@company.com', label: 'Eugene Henderson' },
        { value: 'janet.coleman@company.com', label: 'Janet Coleman' },
        { value: 'arthur.jenkins@company.com', label: 'Arthur Jenkins' },
        { value: 'maria.perry@company.com', label: 'Maria Perry' },
        { value: 'louis.powell@company.com', label: 'Louis Powell' },
        { value: 'heather.long@company.com', label: 'Heather Long' },
        { value: 'philip.patterson@company.com', label: 'Philip Patterson' },
        { value: 'diane.hughes@company.com', label: 'Diane Hughes' },
        { value: 'johnny.flores@company.com', label: 'Johnny Flores' },
        { value: 'virginia.washington@company.com', label: 'Virginia Washington' },
        { value: 'roger.butler@company.com', label: 'Roger Butler' },
        { value: 'joyce.simmons@company.com', label: 'Joyce Simmons' },
        { value: 'victor.foster@company.com', label: 'Victor Foster' },
        { value: 'judy.gonzales@company.com', label: 'Judy Gonzales' },
        { value: 'arthur.bryant@company.com', label: 'Arthur Bryant' },
        { value: 'cheryl.alexander@company.com', label: 'Cheryl Alexander' },
        { value: 'lawrence.russell@company.com', label: 'Lawrence Russell' },
        { value: 'mildred.griffin@company.com', label: 'Mildred Griffin' },
        { value: 'eugene.diaz@company.com', label: 'Eugene Diaz' },
        { value: 'katherine.hayes@company.com', label: 'Katherine Hayes' }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">Responsive Dropdown Demo</h1>
            
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Engineer Assignment Dropdown</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        This dropdown now adapts its width to accommodate engineer names of various lengths.
                        The dropdown will automatically expand to show full names without truncation.
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assign Ticket To:
                            </label>
                            <div className="min-w-[180px] max-w-[280px] w-full">
                                <CustomDropdown
                                    value={selectedEngineer}
                                    onChange={setSelectedEngineer}
                                    options={engineerOptions}
                                    placeholder="Select an engineer..."
                                    className="text-xs w-full"
                                    variant="minimal"
                                />
                            </div>
                        </div>
                        
                        {selectedEngineer && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-800">
                                    <strong>Selected:</strong> {engineerOptions.find(opt => opt.value === selectedEngineer)?.label || selectedEngineer}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Improvements Made:</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Increased dropdown container width from 120-128px to 180-280px</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Removed table cell width constraints (max-w-32)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Enhanced dropdown width calculation based on content length</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Removed text truncation in dropdown options</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Added tooltips for full engineer names</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">✓</span>
                            <span>Made dropdown responsive to screen size</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Key Features:</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Dropdown automatically adjusts width based on the longest engineer name</li>
                        <li>• Full names are displayed without truncation</li>
                        <li>• Responsive design works on all screen sizes</li>
                        <li>• Tooltips show complete information on hover</li>
                        <li>• Maintains consistent styling with the rest of the application</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResponsiveDropdownDemo;
