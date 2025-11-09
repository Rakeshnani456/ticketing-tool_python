// src/components/tickets/MyTicketsComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, XCircle, PlusCircle, User, ChevronLeft, ChevronRight } from 'lucide-react'; // Icons
import { collection, query, onSnapshot, where, orderBy, getFirestore, limit } from 'firebase/firestore'; // NEW: Firestore imports

// Import common UI components
import LinkButton from '../common/LinkButton';
import ModernTicketGrid from '../common/ModernTicketGrid';

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
    const [loading, setLoading] = useState(false); // Start with false to avoid spinner flash
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ticketsPerPage = 30;
    const totalPages = Math.ceil(tickets.length / ticketsPerPage);
    const paginatedTickets = tickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);
    
    // Selection and export state
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [selectedTickets, setSelectedTickets] = useState([]);

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

        setError(null);

        // OPTIMIZED: Check cache first
        const cacheKey = `my_tickets_${firebaseUser.uid}_${searchKeyword || 'default'}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        
        // Use cached data if it's less than 2 minutes old
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 120000) {
            try {
                const parsedData = JSON.parse(cachedData);
                setTickets(parsedData);
                setLoading(false);
            } catch (e) {
                console.warn('Failed to parse cached my tickets data:', e);
            }
        }

        let ticketsRef = collection(db, 'tickets');
        let q;
        
        // OPTIMIZED: Apply proper filtering and limits
        if (searchKeyword) {
            q = query(
                ticketsRef,
                where('reporter_id', '==', firebaseUser.uid), // Filter by current user's ID
                orderBy('created_at', 'desc'), // Order by creation date
                limit(100) // Limit to prevent excessive reads
            );
        } else {
            // Default filter: show active tickets only (Open, In Progress, Hold)
            q = query(
                ticketsRef,
                where('reporter_id', '==', firebaseUser.uid), // Filter by current user's ID
                where('status', 'in', ['Open', 'In Progress', 'Hold']), // Default filter: show active tickets only
                orderBy('created_at', 'desc'), // Order by creation date
                limit(50) // Limit to prevent excessive reads
            );
        }

        // If there's an exact search keyword that looks like a TICKET-ID,
        // we can try to apply that server-side for an exact match.
        // For 'My Tickets', if an exact ID is searched, it should also show resolved/closed tickets.
        if (searchKeyword && searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const exactId = searchKeyword.toUpperCase();
            q = query(
                ticketsRef,
                where('reporter_id', '==', firebaseUser.uid),
                where('display_id', '==', exactId),
                orderBy('created_at', 'desc'),
                limit(10) // Limit for exact searches
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
            
            // Cache the data
            localStorage.setItem(cacheKey, JSON.stringify(fetchedTickets));
            localStorage.setItem(`${cacheKey}_time`, now.toString());
        }, (err) => {
            console.error("Firestore onSnapshot error (MyTicketsComponent):", err);
            setError(`Failed to load your tickets: ${err.message}`);
            showFlashMessage(`Failed to load your tickets: ${err.message}`, 'error');
            setLoading(false);
        });

        // Cleanup function
        return () => unsubscribe();
    }, [db, searchKeyword, showFlashMessage]); // Dependencies for the effect

    const handlePageChange = (page) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    useEffect(() => { setCurrentPage(1); }, [tickets]);

    // Export selected tickets
    const exportSelectedTickets = async () => {
        if (selectedTickets.length === 0) {
            showFlashMessage('Please select tickets to export', 'error');
            return;
        }
        
        setLoading(true);
        try {
            const selectedTicketData = tickets.filter(ticket => 
                selectedTickets.includes(ticket.id)
            );

            // Create CSV content
            const headers = [
                'Ticket ID',
                'Short Description',
                'Created Date',
                'Priority',
                'Status',
                'Assigned To',
                'Reporter Email',
                'Request For Email',
                'Created At'
            ];

            const csvRows = [headers.join(',')];

            selectedTicketData.forEach(ticket => {
                const row = [
                    ticket.display_id || '',
                    `"${(ticket.short_description || '').replace(/"/g, '""')}"`,
                    ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '',
                    ticket.priority || '',
                    ticket.status || '',
                    ticket.assigned_to_email || 'Unassigned',
                    ticket.reporter_email || '',
                    ticket.request_for_email || '',
                    ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ''
                ];
                csvRows.push(row.join(','));
            });

            const csvContent = csvRows.join('\n');
            
            // Download the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const exportDate = new Date().toISOString().slice(0, 10);
            const fileName = `my_tickets_export_${exportDate}.csv`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            showFlashMessage(`Exported ${selectedTickets.length} ticket(s) successfully`, 'success');
            
            // Clear selected tickets after successful export
            setSelectedTickets([]);
            setShowCheckboxes(false);
            
        } catch (error) {
            console.error('Export selected tickets error:', error);
            showFlashMessage('Error exporting selected tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle peek ticket
    const handlePeekTicket = (ticket) => {
        navigateTo('/tickets', ticket.id);
    };

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

    // Conditional rendering for error states only
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-white flex-1 overflow-auto">
            {/* Header layout: title on the left, create button and pagination on the right */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h2 className="text-xl font-extrabold text-gray-800">
                    {searchKeyword ? `Search Results for "${searchKeyword}" (including resolved and cancelled tickets)` : 'My Tickets'}
                    <span className="ml-2 text-base font-normal text-gray-600">
                        - Showing {paginatedTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                    </span>
                </h2>
                <div className="flex items-center gap-3 ml-auto">
                    {/* Select Tickets Button */}
                    {tickets.length > 0 && (
                        <button
                            onClick={() => {
                                if (showCheckboxes && selectedTickets.length > 0) {
                                    // Cancel: clear selections and hide checkboxes
                                    setSelectedTickets([]);
                                    setShowCheckboxes(false);
                                } else {
                                    // Toggle selection mode
                                    setShowCheckboxes(!showCheckboxes);
                                    if (!showCheckboxes) {
                                        setSelectedTickets([]); // Clear selections when enabling
                                    }
                                }
                            }}
                            disabled={loading}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 border ${
                                showCheckboxes && selectedTickets.length > 0
                                    ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                                    : showCheckboxes
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                                    : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
                            }`}
                            title={showCheckboxes && selectedTickets.length > 0 ? 'Cancel and unselect all tickets' : showCheckboxes ? 'Cancel selection mode' : 'Select tickets to export'}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {showCheckboxes && selectedTickets.length > 0 ? 'Cancel Select' : showCheckboxes ? 'Cancel Select' : 'Select Tickets'}
                        </button>
                    )}
                    {/* Export Selected Button */}
                    {tickets.length > 0 && showCheckboxes && selectedTickets.length > 0 && (
                        <button
                            onClick={exportSelectedTickets}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-200 disabled:opacity-50 border bg-green-600 text-white hover:bg-green-700 border-green-600"
                            title="Export selected tickets"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 0 002 2h12a2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                            </svg>
                            Export Selected ({selectedTickets.length})
                        </button>
                    )}
                    {/* Create Ticket Button - Top Right - only show when there are tickets */}
                    {tickets.length > 0 && (
                        <button
                            onClick={() => navigateTo('/create-ticket')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white text-xs font-semibold rounded-md hover:bg-orange-700 transition-colors duration-200 shadow-sm"
                            title="Create a new ticket"
                        >
                            <PlusCircle size={14} className="flex-shrink-0" />
                            <span>Create Ticket</span>
                        </button>
                    )}
                    {/* Pagination */}
                    {tickets.length > 0 && (
                        <div className="relative flex flex-col items-end">
                            {renderPagination()}
                        </div>
                    )}
                </div>
            </div>
            {tickets.length === 0 ? (
                // Message when no tickets are found
                <div className="text-center text-gray-600 text-sm p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[200px] flex flex-col justify-center">
                    <div className="mb-4">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {searchKeyword ? `No tickets found matching "${searchKeyword}"` : "No tickets found"}
                        </h3>
                        <p className="text-gray-600">
                            {searchKeyword 
                                ? "Try adjusting your search criteria or create a new ticket." 
                                : "Create your first support ticket to get started with our help desk system."
                            }
                        </p>
                    </div>
                    {!searchKeyword && (
                        <div className="mt-4">
                            <LinkButton 
                                onClick={() => navigateTo('create-ticket')} 
                                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <PlusCircle size={16} />
                                <span>Create Ticket</span>
                            </LinkButton>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Selection info bar */}
                    {showCheckboxes && selectedTickets.length > 0 && (
                        <div className="mb-4 px-3 py-2 text-sm rounded-md border text-blue-900 bg-blue-50 border-blue-400">
                            <span>{`${selectedTickets.length} ${selectedTickets.length === 1 ? 'ticket' : 'tickets'} selected.`}</span>
                        </div>
                    )}
                    {/* Modern Ticket Grid */}
                    <ModernTicketGrid
                        tickets={paginatedTickets}
                        onTicketClick={(ticket) => navigateTo('/tickets', ticket.id)}
                        onStatusChange={null}
                        onAssignmentChange={null}
                        onPeek={handlePeekTicket}
                        user={user}
                        loading={loading}
                        showCheckboxes={showCheckboxes}
                        selectedTickets={selectedTickets}
                        startIndex={(currentPage - 1) * ticketsPerPage}
                        onTicketSelect={(ticketIds) => {
                            setSelectedTickets(ticketIds);
                        }}
                    />
                </>
            )}
        </div>
    );
};

export default MyTicketsComponent;
