// src/components/tickets/AllTicketsComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, XCircle, ListFilter, Download, User, CheckCircle } from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, getFirestore } from 'firebase/firestore';

// Import common UI components
import PrimaryButton from '../common/PrimaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase';

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

        setLoading(true);
        setError(null);

        let ticketsRef = collection(db, 'tickets');
        let q;

        // If there's an exact search keyword that looks like a TICKET-ID,
        // apply that filter directly in the Firestore query for efficiency.
        if (searchKeyword && searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const exactId = searchKeyword.toUpperCase();
            q = query(ticketsRef, where('display_id', '==', exactId), orderBy('created_at', 'desc'));
        } else {
            // Otherwise, fetch all tickets ordered by creation date.
            // Client-side filtering for status and assignment will be applied in the next useEffect.
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
            setError(`Failed to load tickets: ${err.message}`);
            showFlashMessage(`Failed to load tickets: ${err.message}`, 'error');
            setLoading(false);
        });

        // Cleanup function: unsubscribe from the listener when the component unmounts
        return () => unsubscribe();
    }, [user, db, searchKeyword]); // Re-run effect if these dependencies change


    /**
     * Effect hook to apply client-side filtering (status, assignment, general search)
     * whenever `allTickets` (the raw data from Firestore) or filter states change.
     */
    useEffect(() => {
        let currentFilteredTickets = [...allTickets]; // Start with all tickets fetched by Firestore

        // Always filter out 'Closed' and 'Resolved' tickets from being displayed in the grid
// Always filter out 'Closed', 'Resolved', and 'Cancelled' tickets from being displayed in the grid
        currentFilteredTickets = currentFilteredTickets.filter(ticket => !['Closed', 'Resolved', 'Cancelled'].includes(ticket.status));
        // Apply status filter based on filterStatus state
        // If filterStatus is an empty string, no status filter is applied, showing all statuses
        if (filterStatus) {
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

        setDisplayedTickets(currentFilteredTickets); // Update displayed tickets
    }, [allTickets, filterStatus, filterAssignment, searchKeyword, user]); // Dependencies include all filtering states and user


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
            const idToken = user.firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);

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
        return 'All Tickets'; // Default if no specific filter is active
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

    // Conditional rendering for loading or error states
    if (loading && !showExportPopup) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading tickets...</span></div>;
    if (error && !showExportPopup) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            {/* Decreased heading size from text-xl to text-lg */}
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">
                {getPageHeading()}
            </h2>

            {/* Informational message for filter behavior (only if filters are shown and showMessage is true) */}
            {showFilters && showMessage && (
                <div
                    ref={messageBoxRef} // Attach ref here
                    className={`relative text-sm text-gray-600 p-2 bg-blue-50 rounded-md border border-blue-200 flex items-start justify-between transition-all duration-500 ease-in-out`}
                    style={{
                        opacity: messageOpacity,
                        transform: messageTransform,
                        marginBottom: messageMarginBottom, // Use style for dynamic margin-bottom
                        // Transition applies to opacity, transform, and margin-bottom
                        transition: 'opacity 1s ease-in-out, transform 1 ease-in-out, margin-bottom 1 ease-in-out',
                        pointerEvents: messageOpacity === 0 ? 'none' : 'auto' // Disable pointer events when fully faded
                    }}
                >

                    <span>
                        {/* Shorter message content */}
                        Showing {getPageHeading().toLowerCase()}. Use filters to refine.
                    </span>
                    <button
                        onClick={handleCloseMessage} // Use the new handler
                        className="ml-4 p-1 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-200"
                        aria-label="Close message"
                    >
                        <XCircle size={16} className="text-blue-600" />
                    </button>
                </div>
            )}

            {/* Filter and Export Section (Conditional Rendering based on `showFilters` prop) */}
            {showFilters && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md shadow-inner border border-gray-100 flex flex-wrap gap-2 items-center relative">
                    <span className="text-sm font-semibold text-gray-700 flex items-center"><ListFilter className="mr-1" size={16} /> Filter By:</span>
                    {/* MODIFIED: 'All' button now sets filterStatus to empty string to show all tickets */}
                    <button
    onClick={() => { setFilterStatus(''); setFilterAssignment(''); }} // Set to empty string for 'All' and clear assignment
    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === '' && filterAssignment === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
>
    All ({counts.total_tickets}) {/* Now simply show the total_tickets which are already filtered for active ones */}
</button>
                    {/* MODIFIED: Ensure setFilterAssignment('') is called for status filters */}
                    <button onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Open' && filterAssignment === '' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > Open ({counts.open_tickets}) </button>
                    <button onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'In Progress' && filterAssignment === '' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > In Progress ({counts.in_progress_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Hold' && filterAssignment === '' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > On Hold ({counts.hold_tickets}) </button>
                    {/* Removed the "Closed/Resolved" filter button */}

                    {/* MODIFIED: Filter button for 'Unassigned' - ensure setFilterStatus('') is called */}
                    <button onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'unassigned' && filterStatus === '' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > Unassigned ({counts.unassigned}) </button>
                    {/* Removed the 'Assigned to Me' button */}

                    {/* Export button and popup */}
                    <div className="relative ml-auto flex items-center">
                        <PrimaryButton
                            onClick={toggleExportPopup}
                            Icon={Download}
                            className="w-auto px-3 py-1 text-xs"
                            disabled={loading}
                            ref={exportButtonRef}
                        >
                            Export
                        </PrimaryButton>

                        {showExportPopup && (
                            <div ref={exportPopupRef} className="absolute top-full right-0 mt-2 p-3 bg-white border border-gray-300 rounded-md shadow-lg z-10 flex flex-col space-y-2">
                                <p className="text-xs font-semibold text-gray-700">Select Date Range for Export:</p>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="p-1 border border-gray-300 rounded-md text-xs w-28"
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
                                        Icon={exportSuccess ? CheckCircle : Download}
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
                <div className="w-full max-w-full overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
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
                            {displayedTickets.map((ticket, index) => (
                                <tr key={ticket.id} className="block sm:table-row bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50 text-xs">
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words">
                                        <span className="block sm:hidden font-semibold text-gray-600">#:</span>
                                        {index + 1}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-blue-700 hover:underline font-medium cursor-pointer whitespace-normal break-words" onClick={() => navigateTo('/tickets', ticket.id)}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Ticket ID:</span>
                                        {ticket.display_id}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 max-w-xs truncate whitespace-normal break-words" title={ticket.short_description}>
                                        <span className="block sm:hidden font-semibold text-gray-600">Short Description:</span>
                                        {ticket.short_description}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words">
                                        <span className="block sm:hidden font-semibold text-gray-600">Category:</span>
                                        {ticket.category}
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 text-xs text-gray-800 whitespace-normal break-words">
                                        <span className="block sm:hidden font-semibold text-gray-600">Priority:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>{ticket.priority}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 whitespace-normal break-words text-xs text-gray-800">
                                        <span className="block sm:hidden font-semibold text-gray-600">Status:</span>
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>{ticket.status}</span>
                                    </td>
                                    <td className="block sm:table-cell px-2 py-2 whitespace-normal break-words text-xs text-gray-800">
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