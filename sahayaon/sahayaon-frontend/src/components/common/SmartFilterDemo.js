// src/components/common/SmartFilterDemo.js

import React, { useState } from 'react';
import SmartFilterDropdown from './SmartFilterDropdown';
import { useSmartFilters } from '../../hooks/useSmartFilters';

/**
 * Demo component to showcase the Smart Filter functionality
 * This can be used for testing and demonstration purposes
 */
const SmartFilterDemo = () => {
    const [availableEngineers] = useState([
        { email: 'john.doe@company.com', name: 'John Doe' },
        { email: 'jane.smith@company.com', name: 'Jane Smith' },
        { email: 'mike.johnson@company.com', name: 'Mike Johnson' },
        { email: 'sarah.wilson@company.com', name: 'Sarah Wilson' }
    ]);

    const [availableClients] = useState([
        { 'Client name': 'Acme Corporation', companyName: 'Acme Corporation' },
        { 'Client name': 'Tech Solutions Inc', companyName: 'Tech Solutions Inc' },
        { 'Client name': 'Global Industries', companyName: 'Global Industries' },
        { 'Client name': 'StartupXYZ', companyName: 'StartupXYZ' }
    ]);

    const [sampleTickets] = useState([
        {
            id: '1',
            display_id: 'TICKET-001',
            status: 'Open',
            priority: 'High',
            assigned_to_email: 'john.doe@company.com',
            client_name: 'Acme Corporation',
            created_at: new Date().toISOString(),
            short_description: 'Server down issue'
        },
        {
            id: '2',
            display_id: 'TICKET-002',
            status: 'In Progress',
            priority: 'Medium',
            assigned_to_email: 'jane.smith@company.com',
            client_name: 'Tech Solutions Inc',
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            short_description: 'Database optimization'
        },
        {
            id: '3',
            display_id: 'TICKET-003',
            status: 'Resolved',
            priority: 'Low',
            assigned_to_email: null,
            client_name: 'Global Industries',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            short_description: 'Password reset request'
        }
    ]);

    const {
        filters,
        handleFiltersChange,
        clearAllFilters,
        applyFilters,
        hasActiveFilters,
        getFilterSummary
    } = useSmartFilters();

    const filteredTickets = applyFilters(sampleTickets);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Smart Filter Demo
                </h2>
                
                {/* Filter Controls */}
                <div className="mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <SmartFilterDropdown
                            filters={filters}
                            onFiltersChange={handleFiltersChange}
                            availableEngineers={availableEngineers}
                            availableClients={availableClients}
                        />
                        
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                    
                    {/* Filter Summary */}
                    {hasActiveFilters && (
                        <div className="text-sm text-gray-600">
                            <strong>Active Filters:</strong> {getFilterSummary().join(', ')}
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Results ({filteredTickets.length} of {sampleTickets.length} tickets)
                    </h3>
                </div>

                {/* Ticket List */}
                <div className="space-y-3">
                    {filteredTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm font-medium text-blue-600">
                                            {ticket.display_id}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                            ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                                            ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                            ticket.status === 'Resolved' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                            ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                                            ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                                            ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 font-medium">{ticket.short_description}</p>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                        <span>Client: {ticket.client_name}</span>
                                        <span>Assigned: {ticket.assigned_to_email || 'Unassigned'}</span>
                                        <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {filteredTickets.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No tickets match the current filters.</p>
                            <p className="text-sm mt-1">Try adjusting your filter criteria.</p>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">How to use Smart Filters:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Click the "Filters" button to open the filter dropdown</li>
                        <li>• Select filter categories (Status, Priority, Assigned To, Client, Created Date)</li>
                        <li>• Choose multiple options within each category for advanced filtering</li>
                        <li>• Use the search feature within each filter category</li>
                        <li>• Clear individual filters or all filters at once</li>
                        <li>• Filter state is automatically saved in the URL for sharing</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SmartFilterDemo;
