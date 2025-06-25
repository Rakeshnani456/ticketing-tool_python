// src/components/tickets/MyTicketsComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, PlusCircle, User } from 'lucide-react'; // Icons

// Import common UI components
import LinkButton from '../common/LinkButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

/**
 * Component to display a list of tickets created by the current user.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {function} props.showFlashMessage - Function to display temporary messages.
 * @param {string} props.searchKeyword - Keyword to filter tickets by (e.g., ticket ID).
 * @param {number} props.refreshKey - A key that, when changed, triggers a re-fetch of tickets.
 * @returns {JSX.Element} The list of user's tickets or a loading/error message.
 */
const MyTicketsComponent = ({ user, navigateTo, showFlashMessage, searchKeyword, refreshKey }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Fetches tickets associated with the current user from the backend.
     * Uses useCallback to memoize the function, preventing unnecessary re-renders.
     */
    const fetchMyTickets = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('Please log in to view your tickets.', 'info');
            return;
        }

        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const idToken = await firebaseUser.getIdToken(); // Get Firebase ID token for authorization
            const queryParams = new URLSearchParams({ userId: firebaseUser.uid }); // Add user ID to query params

            // For MyTickets, if you want client-side keyword filtering to always apply
            // remove this line if you are sure backend handles 'keyword' for '/tickets/my'
            // if (searchKeyword) {
            //     queryParams.append('keyword', searchKeyword);
            // }

            const response = await fetch(`${API_BASE_URL}/tickets/my?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}` // Include token
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }

            let data = await response.json();

            // --- NEW: Apply client-side search keyword filter for MyTickets with safety checks ---
            if (searchKeyword) {
                const lowercasedKeyword = searchKeyword.toLowerCase();
                data = data.filter(ticket => {
                    // Safely access properties, converting null/undefined to empty string before toLowerCase()
                    const displayId = (ticket.display_id || '').toLowerCase();
                    const shortDescription = (ticket.short_description || '').toLowerCase();
                    const reporterEmail = (ticket.reporter_email || '').toLowerCase();
                    const category = (ticket.category || '').toLowerCase();

                    return (
                        displayId.includes(lowercasedKeyword) ||
                        shortDescription.includes(lowercasedKeyword) ||
                        reporterEmail.includes(lowercasedKeyword) ||
                        category.includes(lowercasedKeyword)
                    );
                });
            }
            // --- END NEW ---

            setTickets(data); // Set fetched (and now filtered) tickets to state
        } catch (err) {
            console.error('Error fetching my tickets:', err);
            setError(err.message || 'Failed to fetch tickets. Please try again.');
            showFlashMessage(err.message || 'Failed to fetch your tickets.', 'error');
        } finally {
            setLoading(false); // End loading state
        }
    }, [user, showFlashMessage, searchKeyword, refreshKey]); // Re-run effect if these dependencies change

    // Effect hook to trigger data fetching when user, search keyword, or refresh key changes.
    useEffect(() => {
        if (user?.firebaseUser) {
            fetchMyTickets();
        }
    }, [user, fetchMyTickets, refreshKey]); // `fetchMyTickets` is a dependency because it's wrapped in `useCallback`

    /**
     * Determines CSS classes for a ticket's status badge.
     * @param {string} status - The status of the ticket (e.g., 'Open', 'In Progress').
     * @returns {string} Tailwind CSS classes for status styling.
     */
    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    /**
     * Determines CSS classes for a ticket's priority badge.
     * @param {string} priority - The priority of the ticket (e.g., 'Low', 'High').
     * @returns {string} Tailwind CSS classes for priority styling.
     */
    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': return 'bg-red-100 text-red-800';
            case 'Critical': return 'bg-red-200 text-red-900 border border-red-500';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    // Conditional rendering for loading, error, or no tickets state
    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading your tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-l font-bold text-green-800">Created by Me: </h2> {/* Updated label */}
                <LinkButton onClick={() => navigateTo('createTicket')} className="text-sm flex items-center space-x-1">
                    <PlusCircle size={16} /> <span>Create Ticket</span> {/* Link style for Create Ticket */}
                </LinkButton>
            </div>
            {tickets.length === 0 ? (
                // Message when no tickets are found
                <div className="text-center text-gray-600 text-sm p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="mb-2">{searchKeyword ? `No tickets found matching "${searchKeyword}".` : "You haven't created any tickets yet."}</p>
                    {!searchKeyword && <p className="font-semibold">Click "Create Ticket" to get started!</p>}
                </div>
            ) : (
                // Table to display tickets
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.display_id} {/* Clickable Ticket ID */}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.short_description}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.category}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MyTicketsComponent;