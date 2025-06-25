// src/components/tickets/AllTicketsComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, XCircle, ListFilter, Download, User, CheckCircle } from 'lucide-react';

// Import common UI components
import PrimaryButton from '../common/PrimaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

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
    // State to hold ALL tickets fetched from the backend (before client-side filtering)
    const [allTickets, setAllTickets] = useState([]);
    // State for the tickets currently being displayed in the table (after client-side filtering)
    const [displayedTickets, setDisplayedTickets] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState(''); // State for status filter
    const [filterAssignment, setFilterAssignment] = useState(initialFilterAssignment); // State for assignment filter
    const [startDate, setStartDate] = useState(''); // State for start date filter for export
    const [endDate, setEndDate] = useState('');     // State for end date filter for export
    // State to control the visibility of the informational message at the top
    const [showMessage, setShowMessage] = useState(true);
    // New state for export date range popup visibility
    const [showExportPopup, setShowExportPopup] = useState(false);
    // Ref to detect clicks outside the export popup
    const exportPopupRef = useRef(null);
    const exportButtonRef = useRef(null);

    // NEW STATE: To control the success message on the export button
    const [exportSuccess, setExportSuccess] = useState(false);

    // Get today's date in YYYY-MM-DD format for the max attribute of the end date input
    const today = new Date().toISOString().split('T')[0];

    /**
     * Fetches all tickets from the backend. This fetch is designed to get the full dataset
     * before client-side filters are applied (except for `searchKeyword` which might be server-side).
     * Uses useCallback to memoize the function.
     */
    const fetchAllTicketsData = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('You must be logged in to view tickets.', 'info');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            // If backend supports keyword search on /tickets/all, include it here.
            // Otherwise, keyword filtering would be purely client-side on `allTickets` state.
            if (searchKeyword) queryParams.append('keyword', searchKeyword);

            const response = await fetch(`${API_BASE_URL}/tickets/all?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }
            const data = await response.json();
            setAllTickets(data); // Store all fetched tickets in `allTickets` state
        } catch (err) {
            setError(err.message || 'Failed to fetch tickets. Please try again.');
            showFlashMessage(err.message || 'Failed to fetch tickets.', 'error');
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage, searchKeyword, refreshKey]);

    // Effect hook to trigger data fetching when component mounts or relevant dependencies change.
    useEffect(() => {
        if (user?.firebaseUser) {
            fetchAllTicketsData();
        }
    }, [user, fetchAllTicketsData, refreshKey]);

    // Effect hook to apply client-side filtering whenever `allTickets` or filter states change.
    useEffect(() => {
        let currentFilteredTickets = [...allTickets]; // Start with all fetched tickets

        // Apply status filter
        if (filterStatus) {
            currentFilteredTickets = currentFilteredTickets.filter(t => t.status === filterStatus || (filterStatus === 'Closed' && t.status === 'Resolved'));
        }

        // Apply assignment filter
        if (filterAssignment) {
            if (filterAssignment === 'unassigned') {
                currentFilteredTickets = currentFilteredTickets.filter(t => !t.assigned_to_email);
            } else if (filterAssignment === 'assigned_to_me') {
                currentFilteredTickets = currentFilteredTickets.filter(t => t.assigned_to_id === user?.firebaseUser?.uid);
            }
        }

        // --- NEW: Apply search keyword filter with safety checks ---
        if (searchKeyword) {
            const lowercasedKeyword = searchKeyword.toLowerCase();
            currentFilteredTickets = currentFilteredTickets.filter(ticket => {
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

        setDisplayedTickets(currentFilteredTickets); // Update displayed tickets
    }, [allTickets, filterStatus, filterAssignment, user, searchKeyword]); // IMPORTANT: Add searchKeyword to dependencies

    // Effect hook to reset filters when `initialFilterAssignment` changes (e.g., navigating from menu)
    useEffect(() => {
        setFilterAssignment(initialFilterAssignment);
        setFilterStatus(''); // Clear status filter when changing assignment filter
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
     * Helper function to safely get a date string in YYYY-MM-DD format.
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

    // Calculate counts based on the *allTickets* (unfiltered) array
    const counts = {
        total_tickets: allTickets.length,
        open_tickets: allTickets.filter(t => t.status === 'Open').length,
        in_progress_tickets: allTickets.filter(t => t.status === 'In Progress').length,
        hold_tickets: allTickets.filter(t => t.status === 'Hold').length,
        closed_resolved_tickets: allTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length,
        unassigned: allTickets.filter(t => !t.assigned_to_email).length,
        assigned_to_me: allTickets.filter(t => t.assigned_to_id === user?.firebaseUser?.uid).length
    };

    // Conditional rendering for loading or error states
    if (loading && !showExportPopup) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading tickets...</span></div>;
    if (error && !showExportPopup) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">
                {initialFilterAssignment === 'assigned_to_me' }
            </h2>

            {/* Informational message for filter behavior (only if filters are shown and showMessage is true) */}
            {showFilters && showMessage && (
                <div className="relative text-sm text-gray-600 mb-4 p-2 bg-blue-50 rounded-md border border-blue-200 flex items-start justify-between">
                    <span>
                        This view shows tickets assigned to you by default. Use the filters below or search by status to refine the list.
                    </span>
                    <button
                        onClick={() => setShowMessage(false)} // Hide message on click
                        className="ml-4 p-1 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-200"
                        aria-label="Close message"
                    >
                        <XCircle size={16} className="text-blue-600" />
                    </button>
                </div>
            )}

            {/* Filter and Export Section (Conditional Rendering based on `showFilters` prop) */}
            {showFilters && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md shadow-inner border border-gray-100 flex flex-wrap gap-2 items-center relative"> {/* Added relative for popup positioning */}
                    <span className="text-sm font-semibold text-gray-700 flex items-center"><ListFilter className="mr-1" size={16} /> Filter By:</span>
                    {/* Filter buttons for status */}
                    <button onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Open' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > All ({counts.open_tickets}) </button>
                    <button onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'In Progress' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > In Progress ({counts.in_progress_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Hold' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > On Hold ({counts.hold_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Closed' || filterStatus === 'Resolved' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > Closed/Resolved ({counts.closed_resolved_tickets}) </button>

                    {/* Filter buttons for assignment */}
                    <button onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'unassigned' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > Unassigned ({counts.unassigned}) </button>
                    <button onClick={() => { setFilterAssignment('assigned_to_me'); setFilterStatus(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'assigned_to_me' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`} > Assigned to Me ({counts.assigned_to_me}) </button>

                    {/* Export button and popup */}
                    <div className="relative ml-auto flex items-center">
                        <PrimaryButton
                            onClick={toggleExportPopup}
                            Icon={Download}
                            className="w-auto px-3 py-1 text-xs"
                            disabled={loading}
                            ref={exportButtonRef} // Attach ref to the export button
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
                                        max={today} // Restrict future dates
                                    />
                                </div>
                                <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                        onClick={() => setShowExportPopup(false)}
                                        className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    {/* Confirm Export Button with dynamic content and styling */}
                                    <PrimaryButton
                                        onClick={handleExport}
                                        className={`w-auto px-3 py-1 text-xs ${exportSuccess ? 'bg-green-500 hover:bg-green-600' : ''}`}
                                        disabled={loading || !startDate || !endDate || (new Date(endDate) > new Date(today)) || (new Date(startDate) > new Date(endDate))}
                                        Icon={exportSuccess ? CheckCircle : Download} // Change icon on success
                                    >
                                        {exportSuccess ? 'Exported!' : (loading ? 'Exporting...' : 'Confirm Export')}
                                    </PrimaryButton>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Conditional rendering for no tickets found after filtering */}
            {displayedTickets.length === 0 ? (
                <p className="text-gray-600 text-sm text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    {searchKeyword ? `No tickets found matching "${searchKeyword}".` : "No tickets found matching the criteria."}
                </p>
            ) : (
                // Table to display filtered tickets
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Raised by</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                                <th className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {displayedTickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.display_id}
                                    </td>
                                    {/* MODIFICATION HERE: Added truncate and max-w-xs */}
                                    <td className="px-3 py-2 text-sm text-gray-800 max-w-xs truncate" title={ticket.short_description}>
                                        {ticket.short_description}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 flex items-center"><User size={12} className="mr-1" />{ticket.reporter_email}</td>
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
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.time_spent_minutes !== null ? `${ticket.time_spent_minutes} mins` : 'N/A'}
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