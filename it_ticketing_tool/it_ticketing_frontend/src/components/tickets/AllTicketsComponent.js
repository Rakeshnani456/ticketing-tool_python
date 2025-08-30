// src/components/tickets/AllTicketsComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, XCircle, ListFilter, User, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { collection, query, onSnapshot, where, orderBy, getFirestore, limit, getDocs, doc, updateDoc } from 'firebase/firestore';

// Import common UI components

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase';


/**
 * Component to display all tickets, primarily for support users.
 * Includes filtering capabilities by status, assignment, and date range, and an export function.
 * 
 * ENGINEER CONFIGURATION:
 * Engineers are automatically fetched from the Firestore 'users' collection
 * where users have the role 'support'. No manual configuration needed.
 * 
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

    // Add state for assign functionality
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [showAssignPopup, setShowAssignPopup] = useState(false);
    const [availableEngineers, setAvailableEngineers] = useState([]);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignPopupRef] = useState(useRef(null));
    
    // New state for dynamic checkbox behavior
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [assignMode, setAssignMode] = useState(false);

    // Add at the top of the component (after useState declarations)
    const [filterBy, setFilterBy] = useState('status'); // 'status', 'priority', or 'company'
    const [filterPriority, setFilterPriority] = useState('');
    const [filterCompany, setFilterCompany] = useState(''); // New state for company filter
    const [companies, setCompanies] = useState([]); // New state for companies list
    const [loadingCompanies, setLoadingCompanies] = useState(false); // New state for companies loading

    // Get today's date in ISO-MM-DD format for the max attribute of the end date input
    const today = new Date().toISOString().split('T')[0];

    // Initialize Firestore DB client. This will be the same instance as exported from firebase.js.
    const db = dbClient; // Use the already initialized dbClient

    // Function to fetch companies for filtering
    const fetchCompanies = useCallback(async () => {
        if (loadingCompanies) return;
        
        setLoadingCompanies(true);
        try {
            console.log('Fetching companies from:', `${API_BASE_URL}/api/clients`);
            const response = await fetch(`${API_BASE_URL}/api/clients`);
            if (!response.ok) {
                throw new Error(`Failed to fetch companies: ${response.status} ${response.statusText}`);
            }
            const companiesData = await response.json();
            console.log('Fetched companies data:', companiesData);
            setCompanies(companiesData);
        } catch (error) {
            console.error('Error fetching companies:', error);
            showFlashMessage('Failed to load companies for filtering', 'error');
        } finally {
            setLoadingCompanies(false);
        }
    }, [loadingCompanies, showFlashMessage]);

    // Function to fetch available engineers
    const fetchEngineers = useCallback(async () => {
        try {
            // Fetch engineers directly from Firestore users collection
            // Look for users with role 'support' as specified in the requirements
            const usersRef = collection(db, 'users');
            const engineersQuery = query(usersRef, where('role', '==', 'support'));
            
            const snapshot = await getDocs(engineersQuery);
            
            if (!snapshot.empty) {
                const engineers = snapshot.docs.map(doc => {
                    const userData = doc.data();
                    return {
                        id: doc.id,
                        name: userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.email),
                        email: userData.email,
                        role: userData.role
                    };
                });
                
                            setAvailableEngineers(engineers);
                console.log('Successfully loaded engineers from Firestore:', engineers);
                            return;
            } else {
                console.log('No engineers found with role "support" in the database');
                setAvailableEngineers([]);
                showFlashMessage('No engineers found in the system. Please add users with "support" role.', 'info');
            }
            
        } catch (error) {
            console.error('Error in fetchEngineers:', error);
            setAvailableEngineers([]);
            showFlashMessage('Failed to load engineers. Please check your connection and try again.', 'error');
        }
    }, [showFlashMessage, db]);

    // Function to handle ticket selection
    const handleTicketSelection = (ticketId) => {
        setSelectedTickets(prev => {
            if (prev.includes(ticketId)) {
                return prev.filter(id => id !== ticketId);
            } else {
                return [...prev, ticketId];
            }
        });
    };

    // Function to enter assign mode
    const enterAssignMode = () => {
        setAssignMode(true);
        setShowCheckboxes(true);
        setSelectedTickets([]); // Clear previous selections - NO auto-selection
    };

    // Function to exit assign mode
    const exitAssignMode = () => {
        setAssignMode(false);
        setShowCheckboxes(false);
        setSelectedTickets([]);
        setShowAssignPopup(false);
    };

    // Function to exit export selection mode
    const exitExportSelectionMode = () => {
        setAssignMode(false);
        setShowCheckboxes(false);
        setSelectedTickets([]);
        setShowExportPopup(false);
    };

    // Function to clear all filters
    const clearAllFilters = () => {
        setFilterBy('status');
        setFilterStatus('');
        setFilterPriority('');
        setFilterAssignment('');
        setFilterCompany('');
    };

    // Function to enter export selection mode
    const enterExportSelectionMode = () => {
        setAssignMode(false);
        setShowCheckboxes(true);
        setSelectedTickets([]); // Clear previous selections - NO auto-selection
    };

    // Function to select only unassigned tickets for assignment
    const selectUnassignedTickets = () => {
        const unassignedTicketIds = paginatedTickets
            .filter(ticket => !ticket.assigned_to_email)
            .map(ticket => ticket.id);
        setSelectedTickets(unassignedTicketIds);
    };

    // Function to handle bulk assignment
    const handleBulkAssign = async () => {
        if (!selectedEngineer || selectedTickets.length === 0) {
            showFlashMessage('Please select an engineer and tickets to assign', 'error');
            return;
        }

        setAssignLoading(true);
        try {
            // Firebase SDK handles authentication automatically when user is signed in
            // No need to manually check for tokens
            
            // First, test if the backend is reachable
            console.log('Testing backend connectivity...');
            console.log('API_BASE_URL:', API_BASE_URL);
            console.log('User role:', user.role);
            console.log('User email:', user.email);

            // Test backend connectivity first
            try {
                const testResponse = await fetch(`${API_BASE_URL}/tickets/summary-counts`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                    }
                });
                console.log('Backend connectivity test result:', testResponse.status, testResponse.statusText);
            } catch (testError) {
                console.error('Backend connectivity test failed:', testError);
                showFlashMessage('Cannot connect to backend server. Please check if the server is running.', 'error');
                return;
            }

            // Process each ticket individually since there's no bulk endpoint
            const assignmentPromises = selectedTickets.map(async (ticketId) => {
                try {
                    // Find the ticket data to get the current assignment
                    const ticket = allTickets.find(t => t.id === ticketId);
                    if (!ticket) {
                        console.warn(`Ticket ${ticketId} not found in current data`);
                        return { success: false, ticketId, error: 'Ticket not found' };
                    }

                    // Update the ticket assignment in Firestore directly
                    const ticketRef = doc(db, 'tickets', ticketId);
                    
                    // First, get the assigned user's ID from the users collection
                    const usersRef = collection(db, 'users');
                    const userQuery = query(usersRef, where('email', '==', selectedEngineer));
                    const userSnapshot = await getDocs(userQuery);
                    
                    if (userSnapshot.empty) {
                        throw new Error(`Engineer ${selectedEngineer} not found in users collection`);
                    }
                    
                    const assignedUser = userSnapshot.docs[0];
                    
                    // Trigger the existing backend assignment email system FIRST (before updating Firestore)
                    // This ensures the backend sees the original assignment value and can detect the change
                    try {
                        console.log(`Attempting to trigger email for ticket ${ticket.display_id}...`);
                        console.log(`Current assignment: ${ticket.assigned_to_email || 'unassigned'}`);
                        console.log(`New assignment: ${selectedEngineer}`);
                        console.log(`Ticket data:`, {
                            id: ticket.id,
                            display_id: ticket.display_id,
                            reporter_email: ticket.reporter_email,
                            request_for_email: ticket.request_for_email,
                            current_assigned: ticket.assigned_to_email
                        });
                        
                        const token = await user.firebaseUser.getIdToken();
                        console.log(`Got token, calling backend for ticket ${ticket.display_id}...`);
                        
                        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                            method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                                assigned_to_email: selectedEngineer
                })
            });

                        console.log(`Backend response for ticket ${ticket.display_id}:`, response.status, response.statusText);
                        
                        if (response.ok) {
                            const responseData = await response.json();
                            console.log(`Email notification triggered for ticket ${ticket.display_id}:`, responseData);
                        } else {
                            const errorData = await response.text();
                            console.warn(`Failed to trigger email for ticket ${ticket.display_id}:`, response.status, response.statusText, errorData);
                        }
                    } catch (emailError) {
                        console.error(`Error triggering email for ticket ${ticket.display_id}:`, emailError);
                        // Don't fail the assignment if email fails
                    }

                    // Now update the ticket in Firestore
                    await updateDoc(ticketRef, {
                        assigned_to_email: selectedEngineer,
                        assigned_to_id: assignedUser.id,
                        updated_at: new Date()
                    });

                    return { success: true, ticketId };
                } catch (error) {
                    console.error(`Error assigning ticket ${ticketId}:`, error);
                    return { success: false, ticketId, error: error.message };
                }
            });

            // Wait for all assignments to complete
            const results = await Promise.all(assignmentPromises);
            
            // Count successful and failed assignments
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            if (successful.length > 0) {
                showFlashMessage(`Successfully assigned ${successful.length} tickets to ${selectedEngineer}`, 'success');
            }
            
            if (failed.length > 0) {
                showFlashMessage(`Failed to assign ${failed.length} tickets. Check console for details.`, 'error');
                console.error('Failed assignments:', failed);
            }

            // Clear selection and close popup
            setSelectedTickets([]);
            setSelectedEngineer('');
            setShowAssignPopup(false);
            
            // Exit assign mode after successful assignment
            exitAssignMode();
            
            // The real-time listener will automatically update the UI
            // since we're updating the Firestore documents directly
            
        } catch (error) {
            console.error('Error in bulk assignment:', error);
            showFlashMessage(`Failed to assign tickets: ${error.message}`, 'error');
        } finally {
            setAssignLoading(false);
        }
    };



    // Get location for URL parameters
    const location = useLocation();

    // Read URL parameters for initial filtering
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const statusParam = urlParams.get('status');
        const assignmentParam = urlParams.get('assignment');
        
        console.log('URL Parameters detected:', {
            statusParam,
            assignmentParam,
            fullSearch: location.search
        });
        
        if (statusParam) {
            console.log('Setting filter status from URL:', statusParam);
            setFilterStatus(statusParam);
            setFilterBy('status');
        }
        
        if (assignmentParam) {
            console.log('Setting filter assignment from URL:', assignmentParam);
            setFilterAssignment(assignmentParam);
        }
    }, [location.search]);

    // Check and reset company filter if user doesn't have permission
    useEffect(() => {
        const hasCompanyFilterPermission = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support';
        
        console.log('Company filter permission check:', {
            userRole: user?.role,
            hasPermission: hasCompanyFilterPermission,
            currentFilterBy: filterBy
        });
        
        if (filterBy === 'company' && !hasCompanyFilterPermission) {
            console.log('User does not have permission for company filtering, resetting to status filter');
            setFilterBy('status');
            setFilterCompany('');
        }
    }, [user?.role, filterBy]);

    // Fetch companies when filterBy changes to 'company'
    useEffect(() => {
        console.log('Company fetch effect triggered:', {
            filterBy,
            companiesLength: companies.length,
            shouldFetch: filterBy === 'company' && companies.length === 0
        });
        
        if (filterBy === 'company' && companies.length === 0) {
            console.log('Fetching companies...');
            fetchCompanies();
        }
    }, [filterBy, companies.length, fetchCompanies]);

    // Fetch engineers when component mounts
    useEffect(() => {
        console.log('Fetching engineers...');
        fetchEngineers();
    }, [fetchEngineers]);

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

        // OPTIMIZED: Check cache first
        const cacheKey = `all_tickets_${user.uid}_${searchKeyword || 'default'}_${filterBy || 'default'}_${filterCompany || 'default'}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        
        // Use cached data if it's less than 2 minutes old
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 120000) {
            try {
                const parsedData = JSON.parse(cachedData);
                setAllTickets(parsedData);
                setLoading(false);
            } catch (e) {
                console.warn('Failed to parse cached all tickets data:', e);
            }
        }

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
            q = query(ticketsRef, where('display_id', '==', exactId), orderBy('created_at', 'desc'), limit(10));
        } else if (user && user.role === 'site_admin' && user.client_name) {
            // Only fetch tickets for this site_admin's company
            q = query(ticketsRef, where('client_name', '==', user.client_name), orderBy('created_at', 'desc'), limit(100));
        } else if (user && user.role === 'site_admin') {
            // Fallback: if site admin doesn't have client_name, fetch all tickets and filter client-side
            console.warn("Site admin user doesn't have client_name field, falling back to client-side filtering");
            q = query(ticketsRef, orderBy('created_at', 'desc'), limit(100));
        } else {
            // Otherwise, fetch all tickets ordered by creation date.
            q = query(ticketsRef, orderBy('created_at', 'desc'), limit(100));
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
            
            // Cache the data
            localStorage.setItem(cacheKey, JSON.stringify(fetchedTickets));
            localStorage.setItem(`${cacheKey}_time`, now.toString());
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
    }, [db, searchKeyword, user, filterBy, filterCompany]);


    /**
     * Effect hook to apply client-side filtering (status, assignment, general search)
     * whenever `allTickets` (the raw data from Firestore) or filter states change.
     */
    useEffect(() => {
        console.log('Filtering effect triggered with:', {
            filterStatus,
            filterBy,
            filterPriority,
            filterAssignment,
            filterCompany,
            totalTickets: allTickets.length
        });
        
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
        } else {
            console.log("Non-site admin user - no automatic company filtering applied");
        }

        // Always filter out 'Closed', 'Resolved', and 'Cancelled' tickets from being displayed in the grid
        // UNLESS there's a search keyword, in which case include all tickets for search results
        if (!searchKeyword) {
            currentFilteredTickets = currentFilteredTickets.filter(ticket => !['Closed', 'Resolved', 'Cancelled'].includes(ticket.status));
        }
        // Apply status filter based on filterStatus state
        // If filterStatus is an empty string, no status filter is applied, showing all statuses
        if (filterBy === 'status' && filterStatus) {
            console.log('Applying status filter:', filterStatus);
            const beforeCount = currentFilteredTickets.length;
            currentFilteredTickets = currentFilteredTickets.filter(ticket => ticket.status === filterStatus);
            console.log(`Status filter applied: ${beforeCount} -> ${currentFilteredTickets.length} tickets`);
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

        // Apply company filter (client-side filtering since we're using Firestore directly)
        if (filterBy === 'company' && filterCompany) {
            console.log('Applying company filter:', filterCompany);
            console.log('Available companies:', companies.map(c => c.companyName));
            console.log('Sample tickets before filtering:', currentFilteredTickets.slice(0, 3).map(t => ({
                id: t.display_id,
                client_name: t.client_name,
                companyName: t.companyName
            })));
            
            const beforeCount = currentFilteredTickets.length;
            currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                const ticketCompany = ticket.client_name || ticket.companyName;
                const matches = ticketCompany === filterCompany;
                if (!matches) {
                    console.log("Filtered out ticket:", {
                        ticketId: ticket.display_id,
                        ticketCompany: ticketCompany,
                        filterCompany: filterCompany
                    });
                }
                return matches;
            });
            console.log(`Company filter applied: ${beforeCount} -> ${currentFilteredTickets.length} tickets`);
        } else if (filterBy === 'company' && !filterCompany) {
            console.log('Company filter type selected but no company selected - showing all tickets');
        } else if (filterBy !== 'company') {
            console.log('Not using company filter - filterBy is:', filterBy);
        }
        
        // Debug: log final filtered tickets count
        console.log('Final filtered tickets count:', currentFilteredTickets.length);
        console.log('Filtering summary:', {
            filterBy,
            filterStatus,
            filterPriority,
            filterAssignment,
            filterCompany,
            totalTickets: allTickets.length,
            filteredTickets: currentFilteredTickets.length
        });

        setDisplayedTickets(currentFilteredTickets); // Update displayed tickets
    }, [allTickets, filterStatus, filterPriority, filterBy, filterAssignment, filterCompany, searchKeyword, user, companies]); // Dependencies include all filtering states and user


    // Effect hook to measure message box height and set up auto-hide timer
    useEffect(() => {
        // Check if there are URL parameters first
        const urlParams = new URLSearchParams(location.search);
        const statusParam = urlParams.get('status');
        const assignmentParam = urlParams.get('assignment');
        
        // Only reset filter states if there are no URL parameters
        if (!statusParam && !assignmentParam) {
            // Reset filter states based on initialFilterAssignment
            setFilterAssignment(initialFilterAssignment);
            if (!initialFilterAssignment && filterStatus !== '') { // Only reset to 'Open' if no assignment filter AND filterStatus is not already empty
                setFilterStatus('Open'); // Re-default to Open if no assignment filter is active
            } else {
                setFilterStatus(''); // Clear status filter if an assignment filter is explicitly set
            }
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
    }, [initialFilterAssignment, location.search]);


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

    // Effect hook to handle clicks outside the assign popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if click is outside the assign popup
            if (assignPopupRef.current && !assignPopupRef.current.contains(event.target)) {
                setShowAssignPopup(false);
            }
        };

        if (showAssignPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAssignPopup]);

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

        // If tickets are selected for export, use those instead of date range
        if (selectedTickets.length > 0 && !assignMode) {
            // Export selected tickets directly
            await exportSelectedTickets();
            return;
        }

        // Otherwise, use date range export (existing logic)
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
                
                // Clear selected tickets after successful export (if any were selected)
                if (selectedTickets.length > 0) {
                    setSelectedTickets([]);
                }
                
                // Exit export selection mode after successful export
                setShowCheckboxes(false);
                
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
     * Exports selected tickets directly without date range filtering
     */
    const exportSelectedTickets = async () => {
        setLoading(true);
        try {
            // Get the selected ticket data from the current displayed tickets
            const selectedTicketData = paginatedTickets.filter(ticket => 
                selectedTickets.includes(ticket.id)
            );

            // Create CSV content for selected tickets
            const csvContent = createCSVFromTickets(selectedTicketData);
            
            // Download the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const exportDateString = getSafeDateStringForFilename(new Date());
            const fileName = `selected_tickets_export_${exportDateString}.csv`;
            a.download = String(fileName);
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setExportSuccess(true);
            
            // Clear selected tickets after successful export
            setSelectedTickets([]);
            
            // Exit export selection mode after successful export
            setShowCheckboxes(false);
            
            // Close popup after success
            setTimeout(() => {
                setShowExportPopup(false);
                setExportSuccess(false);
            }, 2000);
            
        } catch (error) {
            console.error('Export selected tickets error:', error);
            showFlashMessage('Error exporting selected tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Creates CSV content from ticket data
     */
    const createCSVFromTickets = (tickets) => {
        const headers = [
            'Ticket ID',
            'Short Description',
            'Category',
            'Priority',
            'Status',
            'Assigned To',
            'Reporter Email',
            'Request For Email',
            'Created At',
            'Last Updated'
        ];

        const csvRows = [headers.join(',')];

        tickets.forEach(ticket => {
            const row = [
                ticket.display_id || '',
                `"${(ticket.short_description || '').replace(/"/g, '""')}"`, // Escape quotes in description
                ticket.category || '',
                ticket.priority || '',
                ticket.status || '',
                ticket.assigned_to_email || 'Unassigned',
                ticket.reporter_email || '',
                ticket.request_for_email || '',
                ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '',
                ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : ''
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
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
    // When searching, include all tickets including resolved and cancelled
    const counts = {
        // 'All' button shows count of active tickets (Open, In Progress, Hold) or all tickets when searching
        total_tickets: searchKeyword 
            ? allTickets.length 
            : allTickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length,
        open_tickets: allTickets.filter(t => t.status === 'Open').length,
        in_progress_tickets: allTickets.filter(t => t.status === 'In Progress').length,
        hold_tickets: allTickets.filter(t => t.status === 'Hold').length,
        // This count still shows Closed/Resolved for potential future use or specific filter button
        closed_resolved_tickets: allTickets.filter(t => ['Closed', 'Resolved'].includes(t.status)).length,
        // Exclude Closed, Resolved, and Cancelled from unassigned count for consistency, unless searching
        unassigned: searchKeyword 
            ? allTickets.filter(t => !t.assigned_to_email).length
            : allTickets.filter(t => !t.assigned_to_email && !['Closed', 'Resolved', 'Cancelled'].includes(t.status)).length,
        // Removed assigned_to_me count as the button is being removed
    };
    // Function to determine the page heading based on active filters
    const getPageHeading = useCallback(() => {
        if (searchKeyword) {
            return `Search Results for "${searchKeyword}" (including resolved and cancelled tickets)`;
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
    const ticketsPerPage = 30;
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
          <button key={i} onClick={() => handlePageChange(i)} className={`mx-0.5 w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200 ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>{i}</button>
        );
      }
      const firstTicket = (currentPage - 1) * ticketsPerPage + 1;
      const lastTicket = Math.min(currentPage * ticketsPerPage, displayedTickets.length);
      return (
        <div className="inline-flex items-center gap-1 align-middle">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronLeft size={12} /></button>
          {pages}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:opacity-50"><ChevronRight size={12} /></button>
        </div>
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
                <div className="mb-2 p-0 bg-white rounded-md flex flex-wrap gap-2 items-center relative">
                    <span className="text-sm font-semibold text-gray-700">
  Filter By:
</span>
                    <div className="relative inline-block mr-2">
                      <select
                        value={filterBy}
                        onChange={e => { 
                          console.log('Filter type changed from', filterBy, 'to', e.target.value);
                          setFilterBy(e.target.value); 
                          setFilterStatus(''); 
                          setFilterPriority(''); 
                          setFilterCompany(''); 
                        }}
                        className="px-2 py-1.5 rounded border border-gray-300 text-xs font-semibold bg-white pr-8 appearance-none h-8"
                      >
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support') && (
                          <option value="company">Company</option>
                        )}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        {filterBy === 'company' ? (
                          <ChevronRight className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    </div>
{filterBy === 'company' && (user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support') && (
  <div>
    <select
      value={filterCompany}
      onChange={e => {
        console.log('Company filter changed from', filterCompany, 'to', e.target.value);
        setFilterCompany(e.target.value);
      }}
      className="px-2 py-1.5 rounded border border-gray-300 text-xs font-semibold bg-white mr-2 h-8"
    >
      <option value="">All</option>
      {loadingCompanies ? (
        <option value="" disabled>Loading companies...</option>
      ) : companies.length === 0 ? (
        <option value="" disabled>No companies found</option>
      ) : (
        companies.map(company => (
          <option key={company.id} value={company.companyName}>
            {company.companyName}
          </option>
        ))
      )}
    </select>

  </div>
)}
{filterBy === 'status' && (
  <div className="inline-flex bg-gray-200 border border-gray-300 rounded-full shadow-sm overflow-hidden">
    <button 
      onClick={() => { setFilterStatus(''); setFilterAssignment(''); }} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterStatus === '' && filterAssignment === '' ? 'bg-blue-600 text-white rounded-l-full' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      All <span className={`${filterStatus === '' && filterAssignment === '' ? 'text-white' : 'text-blue-600 font-bold'}`}>({counts.total_tickets})</span>
    </button>
    <button 
      onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterStatus === 'Open' && filterAssignment === '' ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      Open <span className={`${filterStatus === 'Open' && filterAssignment === '' ? 'text-white' : 'text-green-600 font-bold'}`}>({counts.open_tickets})</span>
    </button>
    <button 
      onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterStatus === 'In Progress' && filterAssignment === '' ? 'bg-yellow-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      In Progress <span className={`${filterStatus === 'In Progress' && filterAssignment === '' ? 'text-white' : 'text-yellow-600 font-bold'}`}>({counts.in_progress_tickets})</span>
    </button>
    <button 
      onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterStatus === 'Hold' && filterAssignment === '' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      On Hold <span className={`${filterStatus === 'Hold' && filterAssignment === '' ? 'text-white' : 'text-purple-600 font-bold'}`}>({counts.hold_tickets})</span>
    </button>
    <button 
      onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterAssignment === 'unassigned' && filterStatus === '' ? 'bg-orange-600 text-white rounded-r-full' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      Unassigned <span className={`${filterAssignment === 'unassigned' && filterStatus === '' ? 'text-white' : 'text-orange-600 font-bold'}`}>({counts.unassigned})</span>
    </button>
  </div>
)}
{filterBy === 'priority' && (
  <div className="inline-flex bg-gray-200 border border-gray-300 rounded-full shadow-sm overflow-hidden">
    <button 
      onClick={() => setFilterPriority('')} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterPriority === '' ? 'bg-blue-600 text-white rounded-l-full' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      All
    </button>
    <button 
      onClick={() => setFilterPriority('Low')} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterPriority === 'Low' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      Low
    </button>
    <button 
      onClick={() => setFilterPriority('Medium')} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterPriority === 'Medium' ? 'bg-orange-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      Medium
    </button>
    <button 
      onClick={() => setFilterPriority('High')} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterPriority === 'High' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      High
    </button>
    <button 
      onClick={() => setFilterPriority('Critical')} 
      className={`px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${filterPriority === 'Critical' ? 'bg-red-900 text-white rounded-r-full' : 'text-gray-700 hover:bg-gray-100'}`}
    >
      Critical
    </button>
  </div>
)}

                    {/* Clear Filters Button */}
                    {(filterBy !== 'status' || filterStatus !== '' || filterPriority !== '' || filterAssignment !== '' || filterCompany !== '') && (
                        <button
                            onClick={clearAllFilters}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                        >
                            <svg className="w-3 h-3 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear Filters
                        </button>
                    )}

                    {/* In the filter/export section, move pagination to be just left of Export button */}
                    <div className="relative ml-auto flex items-center gap-2">
                        {renderPagination()}
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-3">
                            {!assignMode && !showCheckboxes ? (
                                // Normal mode - show Assign and Select buttons
                                <>
                                    <button 
                                        onClick={enterAssignMode}
                                        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-md shadow-sm hover:from-blue-700 hover:to-blue-800 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Assign
                                    </button>
                                    <button 
                                        onClick={enterExportSelectionMode}
                                        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-md shadow-sm hover:from-gray-200 hover:to-gray-300 hover:shadow-md transition-all duration-200 ease-in-out border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1"
                                    >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Select
                                    </button>
                                </>
                            ) : assignMode ? (
                                // Assign mode - show Assign button with count and Cancel button
                                <>
                            <button 
                                onClick={() => setShowAssignPopup(true)}
                                disabled={selectedTickets.length === 0}
                                        className={`group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                    selectedTickets.length === 0 
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                                                : 'text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-md focus:ring-green-500'
                                }`}
                            >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                Assign {selectedTickets.length > 0 && `(${selectedTickets.length})`}
                            </button>
                                    <button 
                                        onClick={exitAssignMode}
                                        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                    >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                            </button>
                                </>
                            ) : (
                                // Export selection mode - show Cancel button
                                <button 
                                    onClick={exitExportSelectionMode}
                                    className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                >
                                    <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Cancel
                                </button>
                            )}
                            <button className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-md shadow-sm hover:from-purple-700 hover:to-purple-800 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1">
                                <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Notes
                            </button>
                        </div>
                        
                        <div className="ml-3">
                            <button
                            onClick={toggleExportPopup}
                                disabled={loading}
                            ref={exportButtonRef}
                                className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-md shadow-sm hover:from-emerald-700 hover:to-emerald-800 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {!assignMode && selectedTickets.length > 0 
                                    ? `Export Selected (${selectedTickets.length})` 
                                    : 'Export Tickets'
                                }
                            </button>
                        </div>

                        {showExportPopup && (
                            <div ref={exportPopupRef} className="absolute top-full right-0 mt-2 p-3 bg-white border border-gray-300 rounded-md shadow-lg z-10 flex flex-col space-y-2">
                                {!assignMode && selectedTickets.length > 0 && (
                                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 mb-2">
                                        📋 {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected for export
                                    </div>
                                )}
                                {!assignMode && selectedTickets.length > 0 ? (
                                    // Show selected tickets info when tickets are selected
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-700">Export Selected Tickets:</p>
                                        <p className="text-xs text-gray-600">
                                            Ready to export {selectedTickets.length} selected ticket{selectedTickets.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                ) : showCheckboxes && !assignMode ? (
                                    // Show message when in export selection mode but no tickets selected yet
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-gray-700">Select Tickets for Export:</p>
                                        <p className="text-xs text-gray-600">
                                            Use the checkboxes to select which tickets you want to export
                                        </p>
                                    </div>
                                ) : (
                                    // Show date range form when no tickets are selected and not in selection mode
                                    <>
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
                                    <select
                                        id="export-status"
                                        value={exportStatus}
                                        onChange={(e) => setExportStatus(e.target.value)}
                                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white h-8 min-w-[110px]"
                                    >
                                        <option value="">All</option>
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Hold">Hold</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>
                                    </>
                                )}
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button
                                        onClick={() => setShowExportPopup(false)}
                                        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                    >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleExport}
                                        disabled={loading || ((!startDate || !endDate || (new Date(endDate) > new Date(today)) || (new Date(startDate) > new Date(endDate))) && !selectedTickets.length)}
                                        className={`group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                            exportSuccess 
                                                ? 'text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                                                : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                                        } ${loading || ((!startDate || !endDate || (new Date(endDate) > new Date(today)) || (new Date(startDate) > new Date(endDate))) && !selectedTickets.length) ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:shadow-md'}`}
                                    >
                                        {exportSuccess ? (
                                            <>
                                                <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Exported!
                                            </>
                                        ) : loading ? (
                                            <>
                                                <svg className="w-3 h-3 mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Confirm Export
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Assign Popup - Only show when in assign mode */}
                        {showAssignPopup && assignMode && (
                            <div ref={assignPopupRef} className="absolute top-full right-0 mt-2 p-4 bg-white border border-gray-300 rounded-md shadow-lg z-10 flex flex-col space-y-3 min-w-80">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-gray-700">Assign Tickets to Engineer</h3>
                                    <button 
                                        onClick={() => setShowAssignPopup(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-600">
                                        {assignMode 
                                            ? `Selected ${selectedTickets.length} unassigned ticket${selectedTickets.length !== 1 ? 's' : ''}`
                                            : `Selected ${selectedTickets.length} ticket${selectedTickets.length !== 1 ? 's' : ''} for export`
                                        }
                                    </p>
                                    
                                    {availableEngineers.length === 0 ? (
                                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                            ⚠️ No engineers available. Please check system configuration.
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Select Engineer:
                                            </label>
                                            <select
                                                value={selectedEngineer}
                                                onChange={(e) => setSelectedEngineer(e.target.value)}
                                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">Choose an engineer...</option>
                                                {availableEngineers.map(engineer => (
                                                    <option key={engineer.id} value={engineer.email}>
                                                        {engineer.name} ({engineer.email})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        onClick={() => setShowAssignPopup(false)}
                                        className="group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                    >
                                        <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkAssign}
                                        disabled={!selectedEngineer || assignLoading || availableEngineers.length === 0}
                                        className={`group relative inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md shadow-sm transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                            !selectedEngineer || assignLoading || availableEngineers.length === 0
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none transform-none'
                                                : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-md focus:ring-blue-500'
                                        }`}
                                    >
                                        {assignLoading ? (
                                            <>
                                                <svg className="w-3 h-3 mr-1.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Assigning...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Assign Tickets
                                            </>
                                        )}
                                    </button>
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
                <>
                    {/* Ticket Count Display */}
                    <div className="text-[12px] text-gray-500 text-left mb-2 px-0">
                        Showing {((currentPage - 1) * ticketsPerPage) + 1}-{Math.min(currentPage * ticketsPerPage, displayedTickets.length)} of {displayedTickets.length} Tickets
                        {filterBy === 'company' && (
                            <span className="ml-7 text-gray-600">
                                   Companies: {companies.length}, Selected: {filterCompany || 'None'}
                            </span>
                        )}
                    </div>
                    <div className="w-full max-w-full overflow-x-auto border border-gray-200 bg-white mt-0">
                    <table className="w-full min-w-0 bg-white text-xs">
                        <thead className="hidden sm:table-header-group bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words">
                                    <div className="flex flex-col items-start space-y-1">
                                        {assignMode && (
                                            <span className="text-xs text-gray-500 font-normal">
                                                
                                            </span>
                                        )}
                                    <input 
                                        type="checkbox" 
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                    if (assignMode) {
                                                        // In assign mode, select only unassigned tickets
                                                const unassignedTicketIds = paginatedTickets
                                                    .filter(ticket => !ticket.assigned_to_email)
                                                    .map(ticket => ticket.id);
                                                setSelectedTickets(unassignedTicketIds);
                                                    } else if (showCheckboxes) {
                                                        // In export mode, select all tickets
                                                        const allTicketIds = paginatedTickets.map(ticket => ticket.id);
                                                        setSelectedTickets(allTicketIds);
                                                    }
                                            } else {
                                                setSelectedTickets([]);
                                            }
                                        }}
                                            checked={
                                                assignMode 
                                                    ? selectedTickets.length > 0 && selectedTickets.length === paginatedTickets.filter(ticket => !ticket.assigned_to_email).length
                                                    : selectedTickets.length > 0 && selectedTickets.length === paginatedTickets.length
                                            }
                                            disabled={!assignMode && !showCheckboxes}
                                            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${
                                                !assignMode && !showCheckboxes ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                            }`}
                                        />
                                    </div>
                                </th>
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
                                        <span className="block sm:hidden font-semibold text-gray-600">Select:</span>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTickets.includes(ticket.id)}
                                            onChange={() => handleTicketSelection(ticket.id)}
                                            disabled={(!assignMode && !showCheckboxes) || (assignMode && ticket.assigned_to_email)}
                                            className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${
                                                (!assignMode && !showCheckboxes) || (assignMode && ticket.assigned_to_email) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                            }`}
                                        />
                                    </td>
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
                </>
            )}
            
            {/* Bottom Pagination */}
            {displayedTickets.length > 0 && (
                <div className="flex justify-center items-center mt-4 mb-2 px-4">
                    {renderPagination()}
                </div>
            )}
        </div>
    );
};

export default AllTicketsComponent;