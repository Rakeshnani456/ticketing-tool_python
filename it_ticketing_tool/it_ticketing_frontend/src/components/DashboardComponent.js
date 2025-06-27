// src/components/DashboardComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'; // Recharts for charting
import { LayoutDashboard, Ticket, Info, XCircle, Loader2 } from 'lucide-react'; // Icons

// Import API Base URL and COLORS from constants
import { API_BASE_URL, COLORS } from '../config/constants';

/**
 * Dashboard component displaying key metrics and a pie chart of ticket statuses.
 * Accessible only to support users.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {function} props.showFlashMessage - Function to display temporary messages.
 * @returns {JSX.Element} The dashboard overview.
 */
const DashboardComponent = ({ user, navigateTo, showFlashMessage }) => {
    const [ticketStatusData, setTicketStatusData] = useState([]); // Data for the pie chart
    const [totalTickets, setTotalTickets] = useState(0); // Total number of tickets
    const [loading, setLoading] = useState(true); // Loading state
    const [error, setError] = useState(null); // Error state

    /**
     * Fetches ticket status counts from the backend API.
     * This function is memoized using useCallback to prevent unnecessary re-renders.
     */
    const fetchTicketStatusCounts = useCallback(async () => {
        if (!user || !user.firebaseUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await user.firebaseUser.getIdToken(); // Get Firebase ID token for authorization
            const response = await fetch(`${API_BASE_URL}/tickets/status-summary`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                // Transform backend data into the format required by Recharts: [{ name: 'Status', value: count }]
                const formattedData = Object.keys(data).map(status => ({
                    name: status,
                    value: data[status]
                }));
                setTicketStatusData(formattedData);
                // Calculate total tickets from the formatted data
                const total = formattedData.reduce((sum, item) => sum + item.value, 0);
                setTotalTickets(total);
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to fetch ticket status counts.');
                showFlashMessage(errorData.message || 'Failed to fetch ticket status counts.', 'error');
            }
        } catch (err) {
            console.error("Network error fetching ticket status counts:", err);
            setError('Network error: Could not connect to the server.');
            showFlashMessage('Network error: Could not connect to the server.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage]); // Dependencies for useCallback

    // Effect hook to trigger data fetching when component mounts or user changes.
    useEffect(() => {
        fetchTicketStatusCounts();
    }, [fetchTicketStatusCounts]); // `fetchTicketStatusCounts` is a dependency because it's memoized

    /**
     * Custom Tooltip component for the Pie Chart.
     * Displays the status name, ticket count, and percentage on hover.
     * @param {object} props - Recharts tooltip props.
     * @param {boolean} props.active - Whether the tooltip is active.
     * @param {Array<object>} props.payload - Data payload for the hovered slice.
     * @returns {JSX.Element|null} The tooltip content or null.
     */
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-sm">
                    <p className="font-semibold text-gray-800">{`${payload[0].name}`}</p>
                    <p className="text-gray-700">{`Tickets: ${payload[0].value}`}</p>
                    <p className="text-gray-600">{`Percentage: ${(payload[0].percent * 100).toFixed(1)}%`}</p>
                </div>
            );
        }
        return null;
    };

    // Conditional rendering for loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[calc(100vh-8rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-gray-700">Loading dashboard data...</p>
            </div>
        );
    }

    // Conditional rendering for error state
    if (error) {
        return (
            <div className="text-center text-red-600 mt-8 text-base font-bold p-6 bg-red-100 rounded-lg shadow-md border border-red-200">
                <XCircle size={24} className="inline-block mr-2" /> {error}
            </div>
        );
    }

    return (
        <div className="p-6 overflow-auto flex-1 bg-gray-100">
            {/* Dashboard Header */}
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <LayoutDashboard size={28} className="mr-3 text-blue-600" />
                Dashboard Overview
            </h1>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Total Tickets Card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-lg shadow-lg flex items-center justify-between">
                    <div>
                        <div className="text-sm opacity-90">Total Tickets</div>
                        <div className="text-4xl font-bold mt-1">{totalTickets}</div>
                    </div>
                    <Ticket size={48} className="opacity-75" />
                </div>

                {/* Create Ticket Quick Action Card */}
                <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-lg shadow-lg flex items-center justify-between cursor-pointer hover:from-green-600 hover:to-green-800 transition duration-300"
                    onClick={() => navigateTo('createTicket')}>
                    <div>
                        <div className="text-sm opacity-90">Quick Action</div>
                        <div className="text-4xl font-bold mt-1">Create New Ticket</div>
                    </div>
                    <Ticket size={48} className="opacity-75 transform rotate-[-20deg]" />
                </div>
            </div>

            {/* Ticket Status Chart and Breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 flex flex-col lg:flex-row items-center lg:items-start justify-center lg:justify-between gap-8">
                <div className="lg:w-1/2 w-full flex flex-col items-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <PieChart size={20} className="mr-2 text-purple-600" />
                        Tickets by Status
                    </h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={ticketStatusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80} // Consistent outerRadius
                                fill="#8884d8"
                                // The `renderCustomizedLabel` function and `labelLine` are intentionally removed from Pie props
                                // as per the original code to avoid showing labels directly on the pie chart slices.
                            >
                                {
                                    // Map data to Pie Cells, assigning colors cyclically
                                    ticketStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))
                                }
                            </Pie>
                            <Tooltip content={<CustomTooltip />} /> {/* Custom tooltip for detailed info on hover */}
                            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Breakdown List */}
                <div className="lg:w-1/2 w-full bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                        <Info size={18} className="mr-2 text-blue-500" />
                        Status Breakdown
                    </h3>
                    {ticketStatusData.length > 0 ? (
                        <ul className="space-y-2">
                            {ticketStatusData.map((item, index) => (
                                <li
                                    key={item.name}
                                    className="flex items-center justify-between py-2 px-3 bg-white rounded-md shadow-sm text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition duration-150"
                                    onClick={() => navigateTo('allTickets', { status: item.name })} // Make clickable to navigate to filtered tickets
                                >
                                    <span className="flex items-center">
                                        <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                        {item.name}:
                                    </span>
                                    <span className="font-semibold text-gray-900">{item.value} tickets</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic">No ticket status data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardComponent;
