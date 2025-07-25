// src/components/tickets/AllTicketsComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, XCircle, ListFilter, Download, User, CheckCircle, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, getFirestore } from 'firebase/firestore';

// Import common UI components
import PrimaryButton from '../common/PrimaryButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase';
import { ReactComponent as FilterIcon } from '../../assets/icons/FilterIcon.svg';
import { ReactComponent as CancelFilterIcon } from '../../assets/icons/CancelFilterIcon.svg';

/**
 * Component to display all tickets, primarily for support users.
 * Includes filtering capabilities by status, assignment, and date range, and an export function.
 * @param {object} props - Component props.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {function} props.showFlashMessage - Function to display temporary messages.
 * @param {object} props.user - The current authenticated user object.
 * @param {string} props.searchKeyword - Keyword to filter tickets by (e.g., ticket ID, description).
 * @param {number} props.refreshKey - A key that, when changed, triggers a re-fetch of tickets.
 * @param {string} [props.initialFilterAssignment=''] - Initial assignment filter ('unassigned', 'assigned_to_me', or '').
 * @param {boolean} [props.showFilters=true] - Whether to display the filter and export section.
 * @returns {JSX.Element} The list of all tickets or a loading/error message.
 */
const AllTicketsComponent = ({ navigateTo, showFlashMessage, user, searchKeyword, refreshKey, initialFilterAssignment = '', showFilters = true }) => {
    // State to hold ALL tickets fetched from Firestore (before client-side filtering)
    const [allTickets, setAllTickets] = useState([]);
    // State for the tickets currently being displayed in the table (after client-side filtering)
    const [displayedTickets, setDisplayedTickets] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // MODIFIED: Default filterStatus to '' to show all active tickets initially
    const [filterStatus, setFilterStatus] = useState(''); // State for status filter
    const [filterAssignment, setFilterAssignment] = useState(initialFilterAssignment); // State for assignment filter
    const [startDate, setStartDate] = useState(''); // State for start date filter for export
    const [endDate, setEndDate] = useState('');     // State for end date filter for export
    // State to control the visibility of the informational message at the top
    const [showMessage, setShowMessage] = useState(true);
    // State to control the message box's opacity and position for fade-out effect
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [messageTransform, setMessageTransform] = useState('translateY(0)');
    // NEW: State to control the margin-bottom for the "move up" effect on grid content
    const [messageMarginBottom, setMessageMarginBottom] = useState('1rem'); // Use explicit px/rem for margin-bottom for smoother transition

    // NEW: Ref to get the actual height of the message box for accurate margin adjustment
    const messageBoxRef = useRef(null);
    const initialMessageBoxHeight = useRef(0); // Store initial height including its margin

    // New state for export date range popup visibility
    const [showExportPopup, setShowExportPopup] = useState(false);
    // Ref to detect clicks outside the export popup
    const exportPopupRef = useRef(null);
    const exportButtonRef = useRef(null);

    // New state for export success message on the export button
    const [exportSuccess, setExportSuccess] = useState(false);

    // Add state for export status filter
    const [exportStatus, setExportStatus] = useState('');

    // Add at the top of the component (after useState declarations)
    const [filterBy, setFilterBy] = useState('status'); // 'status' or 'priority'
    const [filterPriority, setFilterPriority] = useState('');

    // Get today's date in ISO-MM-DD format for the max attribute of the end date input
    const today = new Date().toISOString().split('T')[0];

    // Initialize Firestore DB client. This will be the same instance as exported from firebase.js.
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
     * Effect hook to set up real-time Firestore listener for all tickets.
     * This ensures 'allTickets' state contains the comprehensive dataset for accurate counts.
     */
    useEffect(() => {
        if (!user || !user.firebaseUser || !db) {
            setLoading(false);
            showFlashMessage('Authentication required to view tickets.', 'info');
            return () => {};
        }

        setError(null);

        // Debug site admin user profile
        if (user.role === 'site_admin') {
            console.log("Site admin user profile debug:", {
                uid: user.uid,
                email: user.email,
                client_name: user.client_name,
                companyName: user.companyName,
                firebaseUser: user.firebaseUser ? 'present' : 'missing'
            });
        }

        let ticketsRef = collection(db, 'tickets');
        let q;

        // If there's an exact search keyword that looks like a TICKET-ID,
        // apply that filter directly in the Firestore query for efficiency.
        if (searchKeyword && searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const exactId = searchKeyword.toUpperCase();
            q = query(ticketsRef, where('display_id', '==', exactId), orderBy('created_at', 'desc'));
        } else if (user && user.role === 'site_admin' && user.client_name) {
            // Only fetch tickets for this site_admin's company
            q = query(ticketsRef, where('client_name', '==', user.client_name), orderBy('created_at', 'desc'));
        } else if (user && user.role === 'site_admin') {
            // Fallback: if site admin doesn't have client_name, fetch all tickets and filter client-side
            console.warn("Site admin user doesn't have client_name field, falling back to client-side filtering");
            q = query(ticketsRef, orderBy('created_at', 'desc'));
        } else {
            // Otherwise, fetch all tickets ordered by creation date.
            q = query(ticketsRef, orderBy('created_at', 'desc'));
        }

        // Set up the real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets = snapshot.docs.map(doc => ({
                id: doc.id,
                ...formatTicketData(doc.data()) // Format timestamps
            }));
            setAllTickets(fetchedTickets); // Update the raw fetched tickets (full dataset or exact search result)
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Firestore onSnapshot error:", err);
            // Add more specific error handling for site admin
            if (user && user.role === 'site_admin') {
                console.error("Site admin ticket fetch error details:", {
                    userClientName: user.client_name,
                    userCompanyName: user.companyName,
                    error: err.message,
                    code: err.code
                });
            }
            setError(`Failed to load tickets: ${err.message}`);
            showFlashMessage(`Failed to load tickets: ${err.message}`, 'error');
            setLoading(false);
        });

        // Cleanup function: unsubscribe from the listener when the component unmounts
        return () => unsubscribe();
    }, [db, searchKeyword, user]); // Add user as dependency


    /**
     * Effect hook to apply client-side filtering (status, assignment, general search)
     * whenever `allTickets` (the raw data from Firestore) or filter states change.
     */
    useEffect(() => {
        let currentFilteredTickets = [...allTickets]; // Start with all tickets fetched by Firestore

        // If user is a site_admin, filter tickets by their company/client
        if (user && user.role === 'site_admin') {
            if (user.client_name) {
                console.log("Site admin filtering tickets:", {
                    userClientName: user.client_name,
                    userCompanyName: user.companyName,
                    totalTickets: currentFilteredTickets.length
                });
                currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                    const ticketClientName = ticket.client_name || ticket.companyName;
                    const matches = ticketClientName === user.client_name || ticketClientName === user.companyName;
                    if (!matches) {
                        console.log("Filtered out ticket:", {
                            ticketId: ticket.display_id,
                            ticketClientName: ticketClientName,
                            userClientName: user.client_name,
                            userCompanyName: user.companyName
                        });
                    }
                    return matches;
                });
                console.log("After site admin filtering:", {
                    filteredTickets: currentFilteredTickets.length
                });
            } else {
                console.warn("Site admin user doesn't have client_name field - showing all tickets");
                showFlashMessage('Warning: Site admin profile missing company information. Showing all tickets.', 'warning');
            }
        }

        // Always filter out 'Closed' and 'Resolved' tickets from being displayed in the grid
// Always filter out 'Closed', 'Resolved', and 'Cancelled' tickets from being displayed in the grid
        currentFilteredTickets = currentFilteredTickets.filter(ticket => !['Closed', 'Resolved', 'Cancelled'].includes(ticket.status));
        // Apply status filter based on filterStatus state
        // If filterStatus is an empty string, no status filter is applied, showing all statuses
        if (filterBy === 'status' && filterStatus) {
            currentFilteredTickets = currentFilteredTickets.filter(ticket => ticket.status === filterStatus);
        }

        // Apply assignment filter
        if (filterAssignment) {
            if (filterAssignment === 'unassigned') {
                currentFilteredTickets = currentFilteredTickets.filter(ticket => !ticket.assigned_to_email);
            } else if (filterAssignment === 'assigned_to_me') {
                currentFilteredTickets = currentFilteredTickets.filter(ticket => ticket.assigned_to_id === user?.firebaseUser?.uid);
            }
        }

        // Apply client-side search keyword filter (only if it wasn't handled fully by Firestore query)
        if (searchKeyword && !searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const lowercasedKeyword = searchKeyword.toLowerCase();
            currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                const displayId = (ticket.display_id || '').toLowerCase();
                const shortDescription = (ticket.short_description || '').toLowerCase();
                const reporterEmail = (ticket.reporter_email || '').toLowerCase();
                const category = (ticket.category || '').toLowerCase();
                const assignedToEmail = (ticket.assigned_to_email || '').toLowerCase();

                return (
                    displayId.includes(lowercasedKeyword) ||
                    shortDescription.includes(lowercasedKeyword) || // Corrected typo here
                    reporterEmail.includes(lowercasedKeyword) ||
                    category.includes(lowercasedKeyword) ||
                    assignedToEmail.includes(lowercasedKeyword)
                );
            });
        }

        // Apply priority filter
        if (filterBy === 'priority' && filterPriority) {
            // Debug: log priorities
            console.log('Filtering by priority:', filterPriority);
            console.log('Ticket priorities:', currentFilteredTickets.map(t => t.priority));
            currentFilteredTickets = currentFilteredTickets.filter(ticket => (ticket.priority || '').toLowerCase() === filterPriority.toLowerCase());
        }

        setDisplayedTickets(currentFilteredTickets); // Update displayed tickets
    }, [allTickets, filterStatus, filterPriority, filterBy, filterAssignment, searchKeyword]); // Dependencies include all filtering states and user


    // Effect hook to measure message box height and set up auto-hide timer
    useEffect(() => {
        // Reset filter states based on initialFilterAssignment
        setFilterAssignment(initialFilterAssignment);
        if (!initialFilterAssignment && filterStatus !== '') { // Only reset to 'Open' if no assignment filter AND filterStatus is not already empty
            setFilterStatus('Open'); // Re-default to Open if no assignment filter is active
        } else {
            setFilterStatus(''); // Clear status filter if an assignment filter is explicitly set
        }

        // Reset message visibility and animation states
        setShowMessage(true);
        setMessageOpacity(1);
        setMessageTransform('translateY(0)');
        setMessageMarginBottom('1rem'); // Reset margin to initial Tailwind 'mb-4' which is 1rem

        // NEW: Measure the message box height once it's rendered
        if (messageBoxRef.current) {
            // Get clientHeight (includes padding) + any rendered margin-bottom
            const computedStyle = getComputedStyle(messageBoxRef.current);
            const height = messageBoxRef.current.offsetHeight; // Includes padding and border
            const marginBottom = parseFloat(computedStyle.marginBottom);
            initialMessageBoxHeight.current = height + marginBottom; // Total space occupied
        }

        // NEW: Automatically close message after 2 seconds when the component mounts or filters change
        const timer = setTimeout(() => {
            handleCloseMessage();
        }, 2000); // 2000 milliseconds = 2 seconds

        // Cleanup the timer if the component unmounts or dependencies change before it fires
        return () => clearTimeout(timer);
    }, [initialFilterAssignment]);


    // Effect hook to handle clicks outside the export popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if click is outside the popup and not on the export button itself
            if (exportPopupRef.current && !exportPopupRef.current.contains(event.target) &&
                exportButtonRef.current && !exportButtonRef.current.contains(event.target)) {
                setShowExportPopup(false);
                setExportSuccess(false); // Reset success message when closing popup
            }
        };

        if (showExportPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportPopup]);

    /**
     * Helper function to safely get a date string in ISO-MM-DD format.
     * Returns an empty string if the date is invalid or an error occurs.
     * @param {Date | string} dateInput - The date object or date string.
     * @returns {string} Formatted date string or empty string.
     */
    const getSafeDateStringForFilename = (dateInput) => {
        try {
            const d = new Date(dateInput);
            // Check if the date is valid (not "Invalid Date")
            if (isNaN(d.getTime())) {
                return ''; // Return empty string for invalid dates
            }
            return d.toISOString().slice(0, 10);
        } catch (e) {
            console.error("Error formatting date for filename:", e);
            return ''; // Return empty string on error
        }
    };


    /**
     * Handles the export of tickets as a CSV file.
     * Uses start and end date filters for the export.
     */
    const handleExport = async () => {
        setExportSuccess(false); // Reset success state at the start of a new export attempt

        if (!startDate || !endDate) {
            showFlashMessage('Please select both a start and an end date for the export.', 'error');
            return;
        }

        if (new Date(endDate) > new Date(today)) {
            showFlashMessage('End date cannot be in the future.', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showFlashMessage('Start date cannot be after the end date.', 'error');
            return;
        }

        setLoading(true); // Indicate loading for export
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (exportStatus) queryParams.append('status', exportStatus);

            // Note: The backend endpoint '/tickets/export' still uses HTTP fetch,
            // as real-time export directly from Firestore client is not a typical use case.
            const response = await fetch(`${API_BASE_URL}/tickets/export?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const blob = await response.blob(); // Get response as Blob
                const url = window.URL.createObjectURL(blob); // Create a URL for the Blob
                const a = document.createElement('a'); // Create a temporary anchor element
                a.href = url;
                const exportDateString = getSafeDateStringForFilename(new Date());
                const fileName = `tickets_export_${exportDateString}.csv`;
                a.download = String(fileName);
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                // Instead of a flash message, set success state for the button
                setExportSuccess(true);
                // Optionally close popup after a short delay
                setTimeout(() => {
                    setShowExportPopup(false);
                    setExportSuccess(false); // Reset for next time
                }, 2000); // Close after 2 seconds
            } else {
                const errorData = await response.json();
                showFlashMessage(`Export failed: ${errorData.error || 'Server error'}`, 'error');
                setExportSuccess(false); // Ensure success state is false on error
            }
        } catch (error) {
            console.error('Export error:', error);
            showFlashMessage('Network error during export.', 'error');
            setExportSuccess(false); // Ensure success state is false on error
        } finally {
            // Keep loading true briefly if success message is displayed on button,
            // or set to false immediately if a different loading indicator is desired.
            // For button-based success, we'll control loading with `exportSuccess` as well.
            if (!exportSuccess) { // Only stop loading if it's not a success scenario (i.e., error occurred)
                 setLoading(false);
            }
        }
    };

    /**
     * Toggles the visibility of the export date range popup.
     */
    const toggleExportPopup = () => {
        setShowExportPopup(prev => !prev);
        // Reset dates and success message when showing the popup for a fresh start
        if (!showExportPopup) {
            setStartDate('');
            setEndDate('');
            setExportSuccess(false);
        }
    };

    /**
     * Determines CSS classes for a ticket's status badge.
     * @param {string} status - The status of the ticket.
     * @returns {string} Tailwind CSS classes.
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
     * @param {string} priority - The priority of the ticket.
     * @returns {string} Tailwind CSS classes.
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

    // Calculate counts based on the *allTickets* array, which now contains the full dataset
const counts = {
        // 'All' button now shows count of ALL active tickets (Open, In Progress, Hold)
        total_tickets: allTickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length,
        open_tickets: allTickets.filter(t => t.status === 'Open').length,
        in_progress_tickets: allTickets.filter(t => t.status === 'In Progress').length,
        hold_tickets: allTickets.filter(t => t.status === 'Hold').length,
        // This count still shows Closed/Resolved for potential future use or specific filter button
        closed_resolved_tickets: allTickets.filter(t => ['Closed', 'Resolved'].includes(t.status)).length,
        // Exclude Closed, Resolved, and Cancelled from unassigned count for consistency
        unassigned: allTickets.filter(t => !t.assigned_to_email && !['Closed', 'Resolved', 'Cancelled'].includes(t.status)).length,
        // Removed assigned_to_me count as the button is being removed
    };
    // Function to determine the page heading based on active filters
    const getPageHeading = useCallback(() => {
        if (searchKeyword) {
            return `Search Results for "${searchKeyword}"`;
        }
        if (filterAssignment === 'assigned_to_me') {
            return 'Tickets Assigned To Me';
        }
        if (filterAssignment === 'unassigned') {
            return 'Unassigned Tickets';
        }
        if (filterStatus) {
            if (filterStatus === 'Closed') {
                return 'Closed/Resolved Tickets';
            }
            return `${filterStatus} Tickets`;
        }
        return 'Workflow'; // Default if no specific filter is active
    }, [filterStatus, filterAssignment, searchKeyword]);

    // Function to handle closing the message with a fade-out effect and upward movement
    const handleCloseMessage = useCallback(() => {
        if (messageBoxRef.current) {
            // Calculate total height to move up
            const currentHeight = messageBoxRef.current.offsetHeight; // Get current rendered height
            const currentComputedStyle = getComputedStyle(messageBoxRef.current);
            const currentMarginBottom = parseFloat(currentComputedStyle.marginBottom);

            // Set transform to move up by its full height (including its original margin)
            setMessageTransform(`translateY(-${currentHeight + currentMarginBottom}px)`);
            setMessageOpacity(0); // Start fade out
            setMessageMarginBottom(`-${currentHeight}px`); // Set negative margin to pull content up

            // After animation, hide completely
            setTimeout(() => {
                setShowMessage(false);
                setMessageMarginBottom('0'); // Ensure no lingering negative margin
                setMessageTransform('translateY(0)'); // Reset transform for next time it might show
                setMessageOpacity(1); // Reset opacity for next time it might show
            }, 500); // Matches the CSS transition duration
        } else {
            // Fallback if ref is not yet set (e.g., during initial render)
            setMessageOpacity(0);
            setMessageTransform('translateY(-100%)'); // Generic large move up
            setMessageMarginBottom('-5rem'); // Generic large negative margin
            setTimeout(() => {
                setShowMessage(false);
                setMessageMarginBottom('0');
                setMessageTransform('translateY(0)');
                setMessageOpacity(1);
            }, 500);
        }
    }, []); // No dependencies for handleCloseMessage itself, uses refs

    // Conditional rendering for error states only
    const [currentPage, setCurrentPage] = useState(1);
    const ticketsPerPage = 15;
    const totalPages = Math.ceil(displayedTickets.length / ticketsPerPage);
    const paginatedTickets = displayedTickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);

    useEffect(() => { setCurrentPage(1); }, [displayedTickets]);

    const handlePageChange = (page) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    function renderPagination() {
      if (totalPages <= 1) return null;
      const pages = [];
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, start + 2);
      if (end - start < 2) start = Math.max(1, end - 2);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} onClick={() => handlePageChange(i)} className={`mx-0.5 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors duration-200 ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>{i}</button>
        );
      }
      const firstTicket = (currentPage - 1) * ticketsPerPage + 1;
      const lastTicket = Math.min(currentPage * ticketsPerPage, displayedTickets.length);
      return (
        <>
          <div className="inline-flex items-center gap-0.5 align-middle">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronLeft size={10} /></button>
            {pages}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronRight size={10} /></button>
          </div>
          <div className="text-[10px] text-gray-500 mt-1 ml-1" style={{ position: 'absolute', left: 0, top: '100%' }}>Showing tickets {firstTicket}-{lastTicket} of {displayedTickets.length}</div>
        </>
      );
    }

    return (
        <div className="p-4 bg-white flex-1 overflow-auto">
            {/* Decreased heading size from text-xl to text-lg */}
            <div className="flex items-center space-x-3 mb-4">
                <h2 className="text-lg font-extrabold text-gray-800">
                    {getPageHeading()}
                </h2>
                {user && user.role === 'site_admin' && !user.client_name && (
                    <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-md">
                        ⚠️ Missing company info
                    </div>
                )}
            </div>
            <div className="w-full h-px bg-gray-200 mb-2 mt-0" />

            {/* Filter and Export Section (Conditional Rendering based on `showFilters` prop) */}
            {showFilters && (
                <div className="mb-2 p-3 bg-white rounded-md flex flex-wrap gap-2 items-center relative">
                    <span className="text-sm font-semibold text-gray-700 flex items-center">
  {(filterBy !== 'status' || filterStatus !== '' || filterPriority !== '' || filterAssignment !== '') ? (
    <CancelFilterIcon
      className="mr-1 cursor-pointer"
      style={{ width: 16, height: 16 }}
      title="Clear Filter"
      onClick={() => { setFilterBy('status'); setFilterStatus(''); setFilterPriority(''); setFilterAssignment(''); }}
    />
  ) : (
    <FilterIcon className="mr-1" style={{ width: 16, height: 16 }} />
  )}
  Filter By:
</span>
                    <select
  value={filterBy}
  onChange={e => { setFilterBy(e.target.value); setFilterStatus(''); setFilterPriority(''); }}
  className="px-2 py-1 rounded border border-gray-300 text-xs font-semibold bg-white mr-2"
>
  <option value="status">Status</option>
  <option value="priority">Priority</option>
</select>
{filterBy === 'status' && (
  <>
    <button onClick={() => { setFilterStatus(''); setFilterAssignment(''); }} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterStatus === '' && filterAssignment === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>All ({counts.total_tickets})</button>
    <button onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Open' && filterAssignment === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Open ({counts.open_tickets})</button>
    <button onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'In Progress' && filterAssignment === '' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>In Progress ({counts.in_progress_tickets})</button>
    <button onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Hold' && filterAssignment === '' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>On Hold ({counts.hold_tickets})</button>
    <button onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'unassigned' && filterStatus === '' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Unassigned ({counts.unassigned})</button>
  </>
)}
{filterBy === 'priority' && (
  <>
    <button onClick={() => setFilterPriority('')} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterPriority === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>All</button>
    <button onClick={() => setFilterPriority('Low')} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterPriority === 'Low' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Low</button>
    <button onClick={() => setFilterPriority('Medium')} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterPriority === 'Medium' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Medium</button>
    <button onClick={() => setFilterPriority('High')} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterPriority === 'High' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>High</button>
    <button onClick={() => setFilterPriority('Critical')} className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors duration-200 shadow-sm ${filterPriority === 'Critical' ? 'bg-red-900 text-white hover:bg-red-800' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Critical</button>
  </>
)}
                    {/* Removed the "Closed/Resolved" filter button */}

                    {/* MODIFIED: Filter button for 'Unassigned' - ensure setFilterStatus('') is called */}
                    {/* Removed the 'Assigned to Me' button */}

                    {/* In the filter/export section, move pagination to be just left of Export button */}
                    <div className="relative ml-auto flex items-center gap-2">
                        {renderPagination()}
                        <div className="ml-3"><PrimaryButton
                            onClick={toggleExportPopup}
                            Icon={Download}
                            className="w-auto px-3 py-1 text-xs"
                            disabled={loading}
                            ref={exportButtonRef}
                        >
                            Export
                        </PrimaryButton></div>

                        {showExportPopup && (
                            <div ref={exportPopupRef} className="absolute top-full right-0 mt-2 p-3 bg-white border border-gray-300 rounded-md shadow-lg z-10 flex flex-col space-y-2">
                                <p className="text-xs font-semibold text-gray-700">Select Date Range and Status for Export:</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="p-1 border border-gray-300 rounded-md text-xs w-28"
                                        max={today}
                                    />
                                    <span className="text-sm">to</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="p-1 border border-gray-300 rounded-md text-xs w-28"
                                        max={today}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <label htmlFor="export-status" className="text-xs font-semibold text-gray-700">Status:</label>
                                    <Select
                                        id="export-status"
                                        value={exportStatus}
                                        onChange={e => setExportStatus(e.target.value)}
                                        size="small"
                                        displayEmpty
                                        sx={{
                                            minWidth: 110,
                                            fontSize: '0.8rem',
                                            background: 'white',
                                            borderRadius: 1,
                                            height: '26px',
                                            minHeight: '26px',
                                            border: '1px solid #d1d5db',
                                            display: 'flex',
                                            alignItems: 'center',
                                            '& .MuiSelect-select': {
                                                height: '26px',
                                                minHeight: '26px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                paddingTop: 0,
                                                paddingBottom: 0,
                                                paddingLeft: '0.5rem',
                                                paddingRight: '1.5rem', // for dropdown arrow
                                                boxSizing: 'border-box',
                                            },
                                        }}
                                        inputProps={{ 'aria-label': 'Status' }}
                                    >
                                        <MenuItem value="" sx={{ fontSize: '0.85rem' }}>All</MenuItem>
                                        <MenuItem value="Open" sx={{ fontSize: '0.85rem' }}>Open</MenuItem>
                                        <MenuItem value="In Progress" sx={{ fontSize: '0.85rem' }}>In Progress</MenuItem>
                                        <MenuItem value="Hold" sx={{ fontSize: '0.85rem' }}>Hold</MenuItem>
                                        <MenuItem value="Resolved" sx={{ fontSize: '0.85rem' }}>Resolved</MenuItem>
                                        <MenuItem value="Cancelled" sx={{ fontSize: '0.85rem' }}>Cancelled</MenuItem>
                                    </Select>
                                </div>
                                <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                        onClick={() => setShowExportPopup(false)}
                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <PrimaryButton
                                        onClick={handleExport}
                                        className={`w-auto px-3 py-1 text-xs ${exportSuccess ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                        disabled={loading || !startDate || !endDate || (new Date(endDate) > new Date(today)) || (new Date(startDate) > new Date(endDate))}
                                        Icon={exportSuccess ? CheckCircle : ChevronUp}
                                    >
                                        {exportSuccess ? 'Exported!' : (loading ? 'Exporting...' : 'Confirm Export')}
                                    </PrimaryButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {displayedTickets.length === 0 ? (
                <p className="text-gray-600 text-sm text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    {searchKeyword ? `No tickets found matching "${searchKeyword}".` : "No tickets found matching the criteria."}
                </p>
            ) : (
                <div className="w-full max-w-full overflow-x-auto border border-gray-200 bg-white mt-0">
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
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">#:</span>
                                        {index + 1}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-blue-700 hover:underline font-medium cursor-pointer whitespace-normal break-words border-r border-gray-200" onClick={() => navigateTo('/tickets', ticket.id)}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Ticket ID:</span>
                                        {ticket.display_id}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 max-w-xs truncate whitespace-normal break-words border-r border-gray-200" title={ticket.short_description}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Short Description:</span>
                                        {ticket.short_description}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Category:</span>
                                        {ticket.category}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Priority:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>{ticket.priority}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 whitespace-normal break-words text-xs text-gray-800 border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Status:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>{ticket.status}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 whitespace-normal break-words text-xs text-gray-800 border-r border-gray-200">
                                        <span className="block sm:hidden font-semibold text-gray-600">Assigned To:</span>
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 whitespace-normal break-words text-xs text-gray-800">
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

export default AllTicketsComponent;