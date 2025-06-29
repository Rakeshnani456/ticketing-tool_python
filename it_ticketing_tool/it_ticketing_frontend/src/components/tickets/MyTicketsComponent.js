// src/components/tickets/MyTicketsComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, PlusCircle, User } from 'lucide-react'; // Icons
import { collection, query, onSnapshot, where, orderBy, getFirestore } from 'firebase/firestore'; // NEW: Firestore imports

// Import common UI components
import LinkButton from '../common/LinkButton';

// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase'; // Import 'app' and 'dbClient'

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

    // Initialize Firestore DB client.
    const db = dbClient; // Use the already initialized dbClient

    /**
     * Helper function to convert Firestore Timestamp to ISO string or Date object.
     * This ensures consistency for display and client-side sorting/filtering.
     * @param {object} data - The raw data from Firestore document.
     * @returns {object} Data with timestamps converted.
     */
    const formatTicketData = (data) => {
        const newData = { ...data };
        if (newData.created_at && newData.created_at.toDate) {
            newData.created_at = newData.created_at.toDate().toISOString();
        }
        if (newData.updated_at && newData.updated_at.toDate) {
            newData.updated_at = newData.updated_at.toDate().toISOString();
        }
        if (newData.resolved_at && newData.resolved_at.toDate) {
            newData.resolved_at = newData.resolved_at.toDate().toISOString();
        }
        if (newData.comments && Array.isArray(newData.comments)) {
            newData.comments = newData.comments.map(comment => {
                if (comment.timestamp && comment.timestamp.toDate) {
                    return { ...comment, timestamp: comment.timestamp.toDate().toISOString() };
                }
                return comment;
            });
        }
        return newData;
    };

    /**
     * Effect hook to set up real-time Firestore listener for tickets created by the current user.
     * This replaces the traditional HTTP fetch for continuous updates.
     */
    useEffect(() => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser || !db) {
            setLoading(false);
            showFlashMessage('Please log in to view your tickets.', 'info');
            return () => {}; // Return empty cleanup function
        }

        setLoading(true);
        setError(null);

        let ticketsRef = collection(db, 'tickets');
        let q = query(
            ticketsRef,
            where('reporter_id', '==', firebaseUser.uid), // Filter by current user's ID
            where('status', 'in', ['Open', 'In Progress', 'Hold', 'Closed', 'Resolved']), // Default filter: show ALL active and inactive tickets
            orderBy('created_at', 'desc') // Order by creation date
        );

        // If there's an exact search keyword that looks like a TICKET-ID,
        // we can try to apply that server-side for an exact match.
        // For 'My Tickets', if an exact ID is searched, it should also show resolved/closed tickets.
        if (searchKeyword && searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const exactId = searchKeyword.toUpperCase();
            q = query(
                ticketsRef,
                where('reporter_id', '==', firebaseUser.uid),
                where('display_id', '==', exactId),
                orderBy('created_at', 'desc')
            );
        }

        // Set up the real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedTickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...formatTicketData(doc.data())
            }));

            // Apply client-side search keyword filter for general keywords if not an exact ID search
            if (searchKeyword && !searchKeyword.toUpperCase().startsWith('TICKET-')) {
                const lowercasedKeyword = searchKeyword.toLowerCase();
                fetchedTickets = fetchedTickets.filter(ticket => {
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

            setTickets(fetchedTickets);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Firestore onSnapshot error (MyTicketsComponent):", err);
            setError(`Failed to load your tickets: ${err.message}`);
            showFlashMessage(`Failed to load your tickets: ${err.message}`, 'error');
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, [user, db, searchKeyword, showFlashMessage]); // Dependencies for the effect

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
                <h2 className="text-xl font-extrabold text-gray-800">My Tickets</h2> {/* Changed label to be more general */}
                <LinkButton onClick={() => navigateTo('create-ticket')} className="text-sm flex items-center space-x-1">
                    <PlusCircle size={16} /> <span>Create Ticket</span>
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
                // Added overflow-x-auto to handle horizontal scrolling on smaller screens
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
                    {/* min-w-full ensures the table takes full width but can extend if content is wider */}
                    <table className="min-w-full bg-white">
                        {/* Hidden on small screens, shown as a standard table header on medium+ screens */}
                        <thead className="hidden sm:table-header-group bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets.map((ticket, index) => (
                                // On small screens, each tr becomes a block; on medium+ it's a table row
                                <tr key={ticket.id} className="block sm:table-row bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    {/* Each td becomes a block on small screens, table cell on medium+ */}
                                    <td className="block sm:table-cell px-4 py-3 text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">#:</span>
                                        {index + 1}
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 text-sm text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('/tickets', ticket.id)}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Ticket ID:</span>
                                        {ticket.display_id} {/* Clickable Ticket ID */}
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 text-sm text-gray-800 max-w-xs truncate" title={ticket.short_description}> {/* Added truncate and max-w-xs */}
                                        <span className="block sm:hidden font-semibold text-gray-600">Short Description:</span>
                                        {ticket.short_description}
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Category:</span>
                                        {ticket.category}
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Priority:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Status:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Assigned To:</span>
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="block sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Last Updated:</span>
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
