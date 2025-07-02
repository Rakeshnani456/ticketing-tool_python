// src/components/DashboardComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'; // Recharts for charting
import { LayoutDashboard, Ticket, Info, XCircle, Loader2, User, ClipboardCheck, PauseCircle, ListChecks } from 'lucide-react'; // Icons
import { collection, query, onSnapshot, where, orderBy, getFirestore, limit } from 'firebase/firestore';
import { dbClient } from '../config/firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
    const [recentTickets, setRecentTickets] = useState([]);
    const [kanbanTickets, setKanbanTickets] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState(null);

    // Compute ticketStatusData and totalTickets from kanbanTickets in real time
    useEffect(() => {
        if (!kanbanTickets || kanbanTickets.length === 0) {
            setTicketStatusData([]);
            setTotalTickets(0);
            setLoading(false);
            return;
        }
        // Count tickets by status
        const statusCounts = kanbanTickets.reduce((acc, ticket) => {
            acc[ticket.status] = (acc[ticket.status] || 0) + 1;
            return acc;
        }, {});
        // Format for recharts
        const formattedData = Object.keys(statusCounts).map(status => ({
            name: status,
            value: statusCounts[status]
        }));
        setTicketStatusData(formattedData);
        setTotalTickets(kanbanTickets.length);
        setLoading(false);
    }, [kanbanTickets]);

    // Fetch recent tickets (last 10)
    useEffect(() => {
        if (!user || !user.firebaseUser) return;
        let ticketsRef = collection(dbClient, 'tickets');
        let q;
        if (user.role === 'support' || user.role === 'admin') {
            q = query(ticketsRef, orderBy('created_at', 'desc'), limit(10));
        } else {
            q = query(ticketsRef, where('reporter_id', '==', user.firebaseUser.uid), orderBy('created_at', 'desc'), limit(10));
        }
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    display_id: data.display_id,
                    short_description: data.short_description,
                    status: data.status,
                    priority: data.priority,
                    updated_at: data.updated_at && data.updated_at.toDate ? data.updated_at.toDate().toISOString() : '',
                };
            });
            setRecentTickets(fetched);
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch all tickets for Kanban columns
    useEffect(() => {
        if (!user || !user.firebaseUser) return;
        let ticketsRef = collection(dbClient, 'tickets');
        let q;
        if (user.role === 'support' || user.role === 'admin') {
            q = query(ticketsRef, orderBy('created_at', 'desc'));
        } else {
            q = query(ticketsRef, where('reporter_id', '==', user.firebaseUser.uid), orderBy('created_at', 'desc'));
        }
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    display_id: data.display_id,
                    short_description: data.short_description,
                    status: data.status,
                    priority: data.priority,
                    assigned_to_email: data.assigned_to_email,
                    created_at: data.created_at && data.created_at.toDate ? data.created_at.toDate().toISOString() : '',
                };
            });
            setKanbanTickets(fetched);
        });
        return () => unsubscribe();
    }, [user]);

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

    // Define the statuses for columns (no Closed/Resolved)
    const statuses = [
        'Open',
        'In Progress',
        'Hold'
    ];
    const statusColors = {
        'Open': 'border-blue-500',
        'In Progress': 'border-yellow-500',
        'Hold': 'border-purple-500',
    };

    // Recent tickets for the current user (most recent at top)
    const recentUserTickets = kanbanTickets
        .filter(t => user && t.assigned_to_email === user.firebaseUser.email)
        .sort((a, b) => b.id.localeCompare(a.id)) // fallback: sort by id (or use created_at if available)
        .slice(0, 5);

    // Priority color mapping for tile backgrounds
    const priorityBg = {
        'Low': 'bg-blue-50',
        'Medium': 'bg-yellow-50',
        'High': 'bg-red-50',
        'Critical': 'bg-red-100',
        'default': 'bg-gray-50',
    };

    // Compute metrics for cards
    let openCount, inProgressCount, holdCount, assignedToMeCount;
    if (user && (user.role === 'support' || user.role === 'admin')) {
        openCount = kanbanTickets.filter(t => t.status === 'Open').length;
        inProgressCount = kanbanTickets.filter(t => t.status === 'In Progress').length;
        holdCount = kanbanTickets.filter(t => t.status === 'Hold').length;
        assignedToMeCount = kanbanTickets.filter(t => t.assigned_to_email === user.firebaseUser.email && ['Open', 'In Progress'].includes(t.status)).length;
    } else {
        openCount = kanbanTickets.filter(t => t.status === 'Open' && (t.assigned_to_email === user.firebaseUser.email || t.reporter_id === user.firebaseUser.uid)).length;
        inProgressCount = kanbanTickets.filter(t => t.status === 'In Progress' && (t.assigned_to_email === user.firebaseUser.email || t.reporter_id === user.firebaseUser.uid)).length;
        holdCount = kanbanTickets.filter(t => t.status === 'Hold' && (t.assigned_to_email === user.firebaseUser.email || t.reporter_id === user.firebaseUser.uid)).length;
        assignedToMeCount = kanbanTickets.filter(t => t.assigned_to_email === user.firebaseUser.email && ['Open', 'In Progress'].includes(t.status)).length;
    }

    // Table data based on selected card
    let filteredTableTickets;
    if (!selectedStatus) {
        filteredTableTickets = kanbanTickets
            .filter(t => user && (t.assigned_to_email === user.firebaseUser.email || t.reporter_id === user.firebaseUser.uid))
            .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
            .slice(0, 5);
    } else if (selectedStatus === 'Assigned') {
        filteredTableTickets = kanbanTickets.filter(t => t.assigned_to_email === user.firebaseUser.email && ['Open', 'In Progress'].includes(t.status));
    } else if (user && (user.role === 'support' || user.role === 'admin')) {
        filteredTableTickets = kanbanTickets.filter(t => t.status === selectedStatus);
    } else {
        filteredTableTickets = kanbanTickets.filter(t => t.status === selectedStatus && (t.assigned_to_email === user.firebaseUser.email || t.reporter_id === user.firebaseUser.uid));
    }

    // Table heading based on selected card
    let tableHeading = 'Recent Tickets';
    if (selectedStatus === 'Open') tableHeading = 'Open Tickets';
    else if (selectedStatus === 'In Progress') tableHeading = 'In Progress Tickets';
    else if (selectedStatus === 'Hold') tableHeading = 'On Hold Tickets';
    else if (selectedStatus === 'Assigned') tableHeading = 'Assigned to Me';

    // Card config
    const metricCards = [
        { label: 'Open', count: openCount, icon: ClipboardCheck, color: 'bg-blue-200/80 text-blue-900', status: 'Open' },
        { label: 'In Progress', count: inProgressCount, icon: ListChecks, color: 'bg-yellow-200/80 text-yellow-900', status: 'In Progress' },
        { label: 'Hold', count: holdCount, icon: PauseCircle, color: 'bg-purple-200/80 text-purple-900', status: 'Hold' },
        { label: 'Assigned to Me', count: assignedToMeCount, icon: User, color: 'bg-orange-200/80 text-orange-900', status: 'Assigned' },
    ];

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
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                <LayoutDashboard size={28} className="mr-3 text-blue-600" />
                Dashboard Overview
            </h1>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {metricCards.map(card => (
                    <div
                        key={card.label}
                        className={`flex flex-col items-center justify-center rounded-lg shadow-md p-4 cursor-pointer transition border border-gray-200 hover:shadow-lg ${card.color} ${selectedStatus === card.status ? 'ring-2 ring-blue-400' : ''}`}
                        onClick={() => setSelectedStatus(card.status === selectedStatus ? null : card.status)}
                    >
                        <card.icon size={28} className="mb-2" />
                        <div className="text-lg font-bold">{card.count}</div>
                        <div className="text-xs font-medium mt-1">{card.label}</div>
                    </div>
                ))}
            </div>
            {/* Recent Tickets Table */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                    <ClipboardCheck size={18} className="mr-2 text-blue-500" />
                    {tableHeading}
                </h2>
                {filteredTableTickets.length === 0 ? (
                    <p className="text-gray-500 italic">No tickets found.</p>
                ) : (
                    <div className="w-full max-w-full overflow-x-auto">
                        <table className="w-full min-w-0 bg-white text-xs">
                            <thead className="bg-gray-100 border-b border-gray-200">
                                <tr>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assignee</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredTableTickets.map(ticket => (
                                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 text-xs cursor-pointer" onClick={() => navigateTo('/tickets', ticket.id)}>
                                        <td className="px-2 py-2 text-xs text-blue-700 hover:underline font-medium">{ticket.display_id}</td>
                                        <td className="px-2 py-2 text-xs text-gray-800 max-w-xs truncate" title={ticket.short_description}>{ticket.short_description}</td>
                                        <td className="px-2 py-2 text-xs">
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{ticket.status}</span>
                                        </td>
                                        <td className="px-2 py-2 text-xs">
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{ticket.priority}</span>
                                        </td>
                                        <td className="px-2 py-2 text-xs text-gray-800">{ticket.assigned_to_email || 'Unassigned'}</td>
                                        <td className="px-2 py-2 text-xs text-gray-800">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardComponent;
