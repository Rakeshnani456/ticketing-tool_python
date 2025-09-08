// src/components/tickets/MyTicketsComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, PlusCircle, User, ChevronLeft, ChevronRight } from 'lucide-react'; // Icons
// Import common UI components
import LinkButton from '../common/LinkButton';

// Import Supabase client
import { supabase } from '../../config/supabase';

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
    const [currentPage, setCurrentPage] = useState(1);
    const ticketsPerPage = 30;
    const totalPages = Math.ceil(tickets.length / ticketsPerPage);
    const paginatedTickets = tickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);

    /**
     * Helper function to format ticket data for display.
     * @param {object} data - The raw data from Supabase.
     * @returns {object} Data with timestamps formatted.
     */
    const formatTicketData = (data) => {
        const newData = { ...data };
        // Supabase already returns ISO strings for timestamps, so no conversion needed
        return newData;
    };

    /**
     * Effect hook to fetch tickets created by the current user using Supabase.
     */
    useEffect(() => {
        console.log('MyTicketsComponent - User object:', user);
        console.log('MyTicketsComponent - User UID:', user?.uid);
        console.log('MyTicketsComponent - User ID:', user?.id);
        
        if (!user?.uid) {
            setLoading(false);
            showFlashMessage('Please log in to view your tickets.', 'info');
            return;
        }

        setError(null);
        setLoading(true);

        const fetchMyTickets = async () => {
            try {
                let query = supabase
                    .from('tickets')
                    .select('*')
                    .eq('reporter_id', user.uid)
                    .order('created_at', { ascending: false });

                // Apply search filter if provided
                if (searchKeyword) {
                    if (searchKeyword.toUpperCase().startsWith('TICKET-')) {
                        // Exact ID search
                        query = query.eq('display_id', searchKeyword.toUpperCase());
                    } else {
                        // General search - we'll filter client-side for better performance
                        query = query.limit(100);
                    }
                } else {
                    // Default filter: show active tickets only
                    query = query.in('status', ['Open', 'In Progress', 'Hold']).limit(50);
                }

                const { data: tickets, error } = await query;

                if (error) {
                    throw error;
                }

                let fetchedTickets = tickets || [];

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
            } catch (err) {
                console.error("Error fetching my tickets:", err);
                setError(`Failed to load your tickets: ${err.message}`);
                showFlashMessage(`Failed to load your tickets: ${err.message}`, 'error');
                setLoading(false);
            }
        };

        fetchMyTickets();
    }, [user?.id, searchKeyword, showFlashMessage]);

    const handlePageChange = (page) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    useEffect(() => { setCurrentPage(1); }, [tickets]);

    function renderPagination() {
      if (totalPages <= 1) return null;
      const pages = [];
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, start + 2);
      if (end - start < 2) start = Math.max(1, end - 2);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} onClick={() => handlePageChange(i)} className={`mx-0.5 w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>{i}</button>
        );
      }
      const firstTicket = (currentPage - 1) * ticketsPerPage + 1;
      const lastTicket = Math.min(currentPage * ticketsPerPage, tickets.length);
      return (
        <div className="inline-flex items-center gap-1 align-middle">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronLeft size={12} /></button>
          {pages}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronRight size={12} /></button>
        </div>
      );
    }

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

    // Conditional rendering for error states only
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-white flex-1 overflow-auto">
            {/* Header layout: title and Create Ticket button on the left, pagination on the far right */}
            <div className="flex items-center mb-4 gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-gray-800 mr-2">
                    {searchKeyword ? `Search Results for "${searchKeyword}" (including resolved and cancelled tickets)` : 'My Tickets'}
                </h2>
                <LinkButton onClick={() => navigateTo('create-ticket')} className="text-sm flex items-center space-x-1 ml-2">
                    <PlusCircle size={16} /> <span>Create Ticket</span>
                </LinkButton>
                <div className="relative flex flex-col items-end ml-auto">
                    {renderPagination()}
                </div>
            </div>
            {tickets.length === 0 ? (
                // Message when no tickets are found
                <div className="text-center text-gray-600 text-sm p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="mb-2">{searchKeyword ? `No tickets found matching "${searchKeyword}".` : "You haven't created any tickets yet."}</p>
                    {!searchKeyword && <p className="font-semibold">Click "Create Ticket" to get started!</p>}
                </div>
            ) : (
                // Table to display tickets
                <div className="w-full max-w-full overflow-x-auto border border-gray-200 bg-white">
                    <table className="w-full min-w-0 bg-white text-xs">
                        <thead className="hidden sm:table-header-group bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">#</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Ticket ID</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Short Description</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Category</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Priority</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Status</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Assigned To</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedTickets.map((ticket, index) => (
                                <tr key={ticket.id} className="block sm:table-row bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 text-xs">
                                    <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">#:</span>
                                        {index + 1}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 text-xs text-blue-700 hover:underline font-medium cursor-pointer whitespace-normal break-words border-r border-gray-200" onClick={() => navigateTo('/tickets', ticket.id)}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Ticket ID:</span>
                                        {ticket.display_id}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 max-w-xs truncate whitespace-normal break-words border-r border-gray-200" title={ticket.short_description}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Short Description:</span>
                                        {ticket.short_description}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Category:</span>
                                        {ticket.category}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Priority:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>{ticket.priority}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 whitespace-normal break-words text-xs text-gray-800 border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Status:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>{ticket.status}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 whitespace-normal break-words text-xs text-gray-800 border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Assigned To:</span>
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-4 whitespace-normal break-words text-xs text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Last Updated:</span>
                                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: '2-digit', 
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true 
                                        }) : 'N/A'}
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
