// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogOut, ChevronDown, Search, CheckCircle, XCircle, Info, AlertTriangle, Bell, Menu, LayoutDashboard, List, Tag, ClipboardCheck, PlusCircle, Users } from 'lucide-react'; // NEW: Import Users icon
import { motion } from 'framer-motion'; // Import motion from framer-motion

// Import Firebase auth client and dbClient
import { authClient, dbClient } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase authentication methods
import { collection, query, onSnapshot, getFirestore } from 'firebase/firestore'; // NEW: Firestore imports

// Import API Base URL from constants (still used for other API calls like notifications)
import { API_BASE_URL } from './config/constants';

// Import local logo image
import KriasolLogo from './assets/logo/logo.png';

// Import common UI components
import FormInput from './components/common/FormInput';
import PrimaryButton from './components/common/PrimaryButton';

// Import feature components
import LoginComponent from './components/auth/LoginComponent';
import RegisterComponent from './components/auth/RegisterComponent';
import CreateTicketComponent from './components/tickets/CreateTicketComponent';
import MyTicketsComponent from './components/tickets/MyTicketsComponent';
import AllTicketsComponent from './components/tickets/AllTicketsComponent';
import TicketDetailComponent from './components/tickets/TicketDetailComponent';
import DashboardComponent from './components/DashboardComponent';
import ProfileComponent from './components/ProfileComponent';
import AccessDeniedComponent from './components/AccessDeniedComponent';
import ChangePasswordComponent from './components/ChangePasswordComponent'; // NEW: Import ChangePasswordComponent
import UserManagementComponent from './components/admin/UserManagementComponent'; // NEW: Import UserManagementComponent

/**
 * Main application component.
 * Manages user authentication state, global navigation, flash messages, and renders
 * the appropriate page based on the current route and user role.
 */
const App = () => {
    // State for the current authenticated user (Firebase user + custom role)
    const [currentUser, setCurrentUser] = useState(null);
    // State for managing the current active page/view
    const [currentPage, setCurrentPage] = useState('myTickets');
    // State to hold the ID of the selected ticket for detail view
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    // State for displaying temporary flash messages
    const [flashMessage, setFlashMessage] = useState(null);
    // State for the type of flash message (e.g., 'success', 'error', 'info')
    const [flashType, setFlashType] = useState('info');
    // Ref to manage the timeout for hiding flash messages
    const flashMessageTimeoutRef = useRef(null);
    // Key to force refresh of ticket lists (e.g., after creating a new ticket)
    const [ticketListRefreshKey, setTicketListRefreshKey] = useState(0);
    // State for the global search keyword
    const [searchKeyword, setSearchKeyword] = useState('');
    // State to control the visibility of the user profile dropdown menu
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    // State to store ticket counts for sidebar badges
    const [ticketCounts, setTicketCounts] = useState({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 });

    // NEW STATES FOR NOTIFICATIONS
    const [notifications, setNotifications] = useState([]);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
    const notificationPollingIntervalRef = useRef(null);
    const notificationMenuRef = useRef(null); // Ref for the notification menu

    // UPDATED STATES AND REFS FOR SIDEBAR MENU (NOW ALWAYS VISIBLE, ONLY EXPANDS/COLLAPSES)
    // isSidebarExpanded: controls if the sidebar is expanded (with text) or collapsed (icons only)
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Initial state for login/register pages
    const sidebarMenuRef = useRef(null);

    // Define variants for Framer Motion animation for the sidebar
    // w-56 is 224px, w-16 is 64px
    const sidebarVariants = {
        expanded: { width: 224, transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { width: 64, transition: { type: "spring", stiffness: 300, damping: 30 } }
    };

    // Define variants for Framer Motion animation for the sidebar text
    const textVariants = {
        expanded: { opacity: 1, width: "auto", transition: { delay: 0.1, duration: 0.2 } },
        collapsed: { opacity: 0, width: 0, transition: { duration: 0.2 } }
    };

    // Define variants for Framer Motion animation for the main content's left margin
    const mainContentVariants = {
        expanded: { marginLeft: 224, transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { marginLeft: 64, transition: { type: "spring", stiffness: 300, damping: 30 } }
    };


    /**
     * Fetches notifications for the current user.
     * @param {object} user - The current authenticated user object.
     * @returns {void}
     */
    const fetchNotifications = useCallback(async (user) => {
        if (!user || !user.firebaseUser) {
            setNotifications([]);
            setHasNewNotifications(false);
            return;
        }
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/notifications/my`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
                setHasNewNotifications(data.some(n => !n.read)); // Check if any unread notifications
            } else {
                console.error("Failed to fetch notifications:", await response.json());
            }
        } catch (error) {
            console.error("Network error fetching notifications:", error);
        }
    }, []);

    // Helper function to format notification messages with bold text for ticket ID and description
    const formatNotificationMessage = (message) => {
        // This regex specifically targets the format "New ticket <ticketId> created by <reporterEmail>: "<shortDescription>""
        const ticketRegex = /(New ticket\s+)(\S+)(\s+created by\s+)([^:]+)(:\s*")([^"]+)(")/;

        const match = message.match(ticketRegex);
        if (match) {
            const [, prefix1, ticketId, prefix2, reporterEmail, prefix3, shortDescription, suffix] = match;
            // Return HTML string with bold and blue text color
            return `${prefix1}<strong class="text-blue-600">${ticketId}</strong>${prefix2}${reporterEmail}${prefix3}<strong class="text-blue-600">${shortDescription}</strong>${suffix}`;
        }
        return message; // Return original message if no specific pattern is matched
    };


    // Effect hook to listen for Firebase authentication state changes.
    // This is crucial for maintaining user session and fetching user roles from backend.
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(authClient, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const idToken = await firebaseUser.getIdToken(); // Get Firebase ID token
                    // Verify ID token with backend to get user's custom role
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({ email: firebaseUser.email }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        // On successful verification, set currentUser state with Firebase user and role
                        const userProfile = { firebaseUser, role: data.user.role, email: firebaseUser.email, uid: firebaseUser.uid };
                        setCurrentUser(userProfile);
                        fetchNotifications(userProfile); // Fetch notifications for logged-in user

                        // Start polling for notifications
                        if (notificationPollingIntervalRef.current) {
                            clearInterval(notificationPollingIntervalRef.current);
                        }
                        notificationPollingIntervalRef.current = setInterval(() => {
                            fetchNotifications(userProfile);
                        }, 30000); // Poll every 30 seconds

                        // NEW: Set up Firestore listener for ticket counts
                        const ticketsCollectionRef = collection(dbClient, 'tickets');
                        const ticketsQuery = query(ticketsCollectionRef);

                        const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
                            const fetchedTickets = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data() // Get raw data; no need to format timestamps for counts
                            }));

                            const totalTickets = fetchedTickets.length;
                            const activeTickets = fetchedTickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length;
                            const assignedToMeTickets = fetchedTickets.filter(t => t.assigned_to_id === userProfile.uid).length;

                            setTicketCounts({
                                total_tickets: totalTickets,
                                active_tickets: activeTickets,
                                assigned_to_me: assignedToMeTickets
                            });
                        }, (err) => {
                            console.error("Firestore onSnapshot error for ticket counts:", err);
                            // Optionally show a flash message for count errors
                        });

                        // Navigate based on user role
                        if (data.user.role === 'support' || data.user.role === 'admin') { // Modified: Admin also goes to dashboard
                            setCurrentPage('dashboard');
                        } else {
                            setCurrentPage('myTickets'); // Regular users go to their tickets
                        }
                        setIsSidebarExpanded(false); // Start with sidebar collapsed (icons only)
                        return () => { // Cleanup for tickets listener if auth state changes again
                           unsubscribeTickets();
                        };
                    } else {
                        // If backend verification fails, show error and log out from Firebase
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        setCurrentPage('login'); // Redirect to login
                        setIsSidebarExpanded(false); // Ensure sidebar is collapsed on auth failure
                    }
                } catch (error) {
                    // Handle network or other errors during auth state change processing
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    setCurrentPage('login'); // Redirect to login
                    setIsSidebarExpanded(false); // Ensure sidebar is collapsed on error
                }
            } else {
                // If no Firebase user is logged in, clear currentUser state and go to login page
                setCurrentUser(null);
                setCurrentPage('login');
                setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Reset counts
                setNotifications([]); // Clear notifications
                setHasNewNotifications(false); // Clear new notification flag
                if (notificationPollingIntervalRef.current) {
                    clearInterval(notificationPollingIntervalRef.current); // Stop polling
                }
                setIsSidebarExpanded(false); // Collapse sidebar on logout
            }
        });
        return () => {
            unsubscribeAuth(); // Cleanup the auth state listener on component unmount
            if (notificationPollingIntervalRef.current) {
                clearInterval(notificationPollingIntervalRef.current); // Clear polling on unmount
            }
            // No need to clean up ticket listener here, it's handled within the if (firebaseUser) block
        };
    }, [fetchNotifications]);

    // Effect hook to handle clicks outside the notification menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If the notification menu is open and the click is outside of it, close it
            if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target) && isNotificationMenuOpen) {
                setIsNotificationMenuOpen(false);
            }
        };

        // Add event listener when component mounts
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            // Clean up the event listener when component unmounts
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationMenuOpen]);


    /**
     * Callback function for successful login.
     * Sets the current user and navigates to the appropriate page based on role.
     * @param {object} user - The user object returned from the login process.
     * @returns {void}
     */
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        fetchNotifications(user); // Fetch notifications on login
        if (user.role === 'support' || user.role === 'admin') { // Modified: Admin also goes to dashboard
            setCurrentPage('dashboard');
        } else {
            setCurrentPage('myTickets');
        }
        setIsSidebarExpanded(false); // Start with sidebar collapsed (icons only)
    };

    /**
     * Handles user logout.
     * Signs out from Firebase, clears user state, and navigates to the login page.
     * @returns {void}
     */
    const handleLogout = async () => {
        try {
            await signOut(authClient); // Sign out from Firebase
            setCurrentUser(null); // Clear current user state
            showFlashMessage('Logged out successfully.', 'success');
            navigateTo('login'); // Navigate to login page
        } catch (error) {
            console.error('Logout error:', error);
            showFlashMessage('Failed to log out.', 'error');
        } finally {
            setIsProfileMenuOpen(false); // Close profile menu
            setIsNotificationMenuOpen(false); // Close notification menu
            setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Reset counts
            setNotifications([]); // Clear notifications
            setHasNewNotifications(false); // Clear new notification flag
            if (notificationPollingIntervalRef.current) {
                clearInterval(notificationPollingIntervalRef.current); // Stop polling
            }
            setIsSidebarExpanded(false); // Collapse sidebar on logout
        }
    };

    /**
     * Global navigation function.
     * Updates the current page and selected ticket ID, and triggers data refreshes.
     * @param {string} page - The name of the page to navigate to.
     * @param {string|null} [id=null] - Optional ID for detail pages (e.g., ticket ID).
     * @returns {void}
     */
    const navigateTo = (page, id = null) => {
        // console.log(`App: Navigating to page: ${page}, with ID: ${id}`); // Debugging
        setCurrentPage(page);
        setSelectedTicketId(id);
        setSearchKeyword(''); // Clear search keyword on page change
        setTicketListRefreshKey(prev => prev + 0); // Increment key to force ticket list refresh
        if (currentUser) {
            fetchNotifications(currentUser); // Re-fetch notifications on navigation
        }
        setIsProfileMenuOpen(false); // Close profile menu on navigation
        setIsNotificationMenuOpen(false); // Close notification menu on navigation
    };

    /**
     * Displays a temporary flash message to the user.
     * @param {string} message - The message content.
     * @param {'info'|'success'|'error'|'warning'} [type='info'] - The type of message for styling.
     * @param {number} [duration=3000] - Duration in milliseconds before the message hides.
     * @returns {void}
     */
    const showFlashMessage = useCallback((message, type = 'info', duration = 3000) => {
        if (flashMessageTimeoutRef.current) {
            clearTimeout(flashMessageTimeoutRef.current); // Clear any existing timeout
        }
        setFlashMessage(message);
        setFlashType(type);
        flashMessageTimeoutRef.current = setTimeout(() => {
            setFlashMessage(null); // Hide message after duration
        }, duration);
    }, []); // Empty dependency array means this function is stable

    /**
     * Callback function for when a new ticket is successfully created.
     * Triggers a refresh of ticket lists and counts, and new notification fetch.
     * @returns {void}
     */
    const handleTicketCreated = () => {
        setTicketListRefreshKey(prev => prev + 1); // Refresh ticket lists
        if (currentUser) {
            fetchNotifications(currentUser); // Fetch new notifications
        }
    };

    /**
     * Handles changes in the global search input.
     * @param {Event} e - The change event.
     * @returns {void}
     */
    const handleSearchChange = (e) => {
        setSearchKeyword(e.target.value);
    };

    /**
     * Handles submission of the global search form.
     * Triggers a refresh of ticket lists to apply the search filter.
     * @param {Event} e - The form submission event.
     * @returns {void}
     */
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setTicketListRefreshKey(prev => prev + 1); // Force re-render of ticket lists with new search keyword
    };

    /**
     * Marks a notification as read and refreshes the notification list.
     * @param {string} notificationId - The ID of the notification to mark as read.
     * @param {string} ticketId - The ID of the ticket associated with the notification (optional).
     */
    const markNotificationAsRead = useCallback(async (notificationId, ticketId = null) => {
        try {
            const idToken = await currentUser.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                //showFlashMessage('Notification marked as read.', 'info');
                fetchNotifications(currentUser); // Refresh notifications after marking read
                if (ticketId) {
                    navigateTo('ticketDetail', ticketId); // Navigate to ticket detail if provided
                }
            } else {
                console.error('Failed to mark notification as read:', await response.json());
                showFlashMessage('Failed to mark notification as read.', 'error');
            }
        } catch (error) {
            console.error('Network error marking notification as read:', error);
            showFlashMessage('Network error marking notification as read.', 'error');
        } finally {
            setIsNotificationMenuOpen(false); // Close notification menu
        }
    }, [currentUser, fetchNotifications, showFlashMessage, navigateTo]);


    /**
     * Returns Tailwind CSS classes for flash message styling based on type.
     * @param {string} type - The type of flash message.
     * @returns {string} Tailwind CSS classes.
     */
    const getStatusClasses = (type) => {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'info': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // mainContentMarginClass is no longer directly used for styling, but for context
    // The actual margin will be driven by Framer Motion's `marginLeft` property.
    // const mainContentMarginClass = isSidebarExpanded ? 'ml-56' : 'ml-16';

    return (
        // Removed overflow-hidden from the main container to allow scrolling
        <div className="flex min-h-screen bg-gray-100 font-inter"> {/* Main flex container (row) */}

            {/* Left Side Menu (always visible when logged in) */}
            {currentUser && (
                <motion.nav
                    ref={sidebarMenuRef}
                    initial={false}
                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                    variants={sidebarVariants}
                    className="fixed top-0 left-0 bg-gray-800 text-white flex flex-col p-3 shadow-lg flex-shrink-0 overflow-y-auto h-screen z-50"
                    onMouseEnter={() => setIsSidebarExpanded(true)} // Expand on hover
                    onMouseLeave={() => setIsSidebarExpanded(false)} // Retract on mouse leave
                >
                    {/* The 3-bar menu button and its containing div were removed previously. */}
                    {/* The logo is also removed from here, it resides only in the header now. */}

                    {/* Removed mt-3 to move menu items up and align with logo */}
                    <ul className="space-y-2"> {/* Menu items moved up */}
                        {/* Support User Specific Menu Items - MODIFIED: Now includes admin role */}
                        {(currentUser.role === 'support' || currentUser.role === 'admin') && (
                            <>
                                <li>
                                        <button onClick={() => navigateTo('dashboard')} className={`relative flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'dashboard' ? 'font-bold border-b-2 border-blue-500' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                            <LayoutDashboard size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                            <motion.span
                                                variants={textVariants}
                                                animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                className="whitespace-nowrap overflow-hidden"
                                            >
                                                Dashboard
                                            </motion.span>
                                            {!isSidebarExpanded && (
                                                <span className="sidebar-count-badge absolute top-0 right-0 text-blue-300 text-xs rounded-full h-4 w-4 flex items-center justify-center -mt-1 -mr-1 font-normal">
                                                    {ticketCounts.total_tickets}
                                                </span>
                                            )}
                                            {isSidebarExpanded && (
                                                <span className="ml-2 text-blue-300 text-xs font-normal">
                                                    ({ticketCounts.total_tickets})
                                                </span>
                                            )}
                                        </button>
                                </li>
                                <li>
                                    <button onClick={() => navigateTo('allTickets')} className={`relative flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'allTickets' ? 'font-bold border-b-2 border-red-500' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        <List size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                        <motion.span
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="whitespace-nowrap overflow-hidden"
                                        >
                                            All Tickets
                                        </motion.span>
                                        {!isSidebarExpanded && (
                                            <span className="sidebar-count-badge absolute top-0 right-0 text-red-300 text-xs rounded-full h-4 w-4 flex items-center justify-center -mt-1 -mr-1">
                                                {ticketCounts.active_tickets}
                                            </span>
                                        )}
                                        {isSidebarExpanded && (
                                            <span className="ml-2 text-red-300 text-xs">
                                                ({ticketCounts.active_tickets})
                                            </span>
                                        )}
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => navigateTo('assignedToMe')} className={`relative flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'assignedToMe' ? 'font-bold border-b-2 border-green-600' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        <Tag size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                        <motion.span
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="whitespace-nowrap overflow-hidden"
                                        >
                                            Assigned to Me
                                        </motion.span>
                                        {!isSidebarExpanded && (
                                            <span className="sidebar-count-badge absolute top-0 right-0 text-green-300 text-xs rounded-full h-4 w-4 flex items-center justify-center -mt-1 -mr-1">
                                                {ticketCounts.assigned_to_me}
                                            </span>
                                        )}
                                        {isSidebarExpanded && (
                                            <span className="ml-2 text-green-300 text-xs">
                                                ({ticketCounts.assigned_to_me})
                                            </span>
                                        )}
                                    </button>
                                </li>
                            </>
                        )}
                        {/* Common Menu Item for All Users */}
                        <li>
                            <button onClick={() => navigateTo('myTickets')} className={`flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'myTickets' ? 'font-bold border-b-2 border-white' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                <ClipboardCheck size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                <motion.span
                                    variants={textVariants}
                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    My Tickets
                                </motion.span>
                            </button>
                        </li>
                        {/* Add Create Ticket Here if desired */}
                        <li>
                            <button onClick={() => navigateTo('createTicket')} className={`flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'createTicket' ? 'font-bold border-b-2 border-white' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                <PlusCircle size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                <motion.span
                                    variants={textVariants}
                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    Create Ticket
                                </motion.span>
                            </button>
                        </li>
                        {/* NEW: Admin Specific Menu Item */}
                        {currentUser.role === 'admin' && (
                            <li>
                                <button onClick={() => navigateTo('userManagement')} className={`flex items-center w-full px-3 py-2 rounded-lg text-left transition-colors duration-300 text-base ${currentPage === 'userManagement' ? 'font-bold border-b-2 border-white' : 'hover:bg-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                    <Users size={20} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-2' : ''}`} />
                                    <motion.span
                                        variants={textVariants}
                                        animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                        className="whitespace-nowrap overflow-hidden"
                                    >
                                        User Management
                                    </motion.span>
                                </button>
                            </li>
                        )}
                    </ul>
                </motion.nav>
            )}

            {/* Right Content Area (Header + Main Content + Footer - flex column) */}
            {/* NOW USING MOTION.DIV FOR SMOOTH MARGIN TRANSITION */}
            <motion.div
                className={`flex flex-col flex-1`}
                initial={false}
                animate={currentUser ? (isSidebarExpanded ? "expanded" : "collapsed") : { marginLeft: 0 }} // Animate margin only when logged in
                variants={mainContentVariants}
            >
                {/* Top Banner Header - no longer fixed, part of flow */}
                <header className="bg-white text-grey p-3 flex items-center justify-between shadow-md flex-shrink-0 w-full z-40">
                    <div className="flex items-center">
                        {/* Kriasol Logo - Remains in header only */}
                        <div className="flex-shrink-0">
                            <img
                                src={KriasolLogo}
                                alt="Kriasol Logo"
                                className="h-8 cursor-pointer"
                                onClick={() => navigateTo('allTickets')}
                            />
                        </div>
                    </div>

                    {/* Search Bar with External Search Button Only */}
                    {currentUser && currentPage !== 'login' && currentPage !== 'register' && (
                        <div className="flex items-center flex-1 max-w-md mx-4">
                            <form onSubmit={handleSearchSubmit} className="flex-1">
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={handleSearchChange}
                                    placeholder="Search tickets..."
                                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </form>
                            {/* Standalone Search Button */}
                            <button
                                onClick={handleSearchSubmit}
                                className="ml-2 p-2 text-gray-800 hover:text-blue-600 transition-colors duration-200 focus:outline-none"
                                aria-label="Search"
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    )}

                    {/* User Profile and Notification Menu (visible when logged in) */}
                    {currentUser && (
                        <div className="flex items-center space-x-4">
                            {/* Notification Button */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsNotificationMenuOpen(!isNotificationMenuOpen); }}
                                    className="relative flex items-center text-gray-800 hover:text-blue-600 transition duration-200 text-sm p-2 rounded-full hover:bg-gray-100"
                                    aria-label="Notifications"
                                >
                                    <Bell size={20} />
                                    {hasNewNotifications && (
                                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-600 animate-pulse"></span>
                                    )}
                                </button>
                                {isNotificationMenuOpen && (
                                    <div ref={notificationMenuRef} className="absolute right-0 mt-2 w-1/2 md:w-96 bg-white rounded-md shadow-lg py-1 z-50 max-h-96 overflow-y-auto notification-scroll-area">
                                        <h3 className="text-sm font-semibold px-4 py-2 text-gray-700 border-b border-gray-200">Notifications</h3>
                                        {notifications.length > 0 ? (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    // Make the container relative for absolute positioning of the button
                                                    className={`relative flex items-start px-4 py-4 border-b border-gray-300 hover:bg-orange-100 cursor-pointer last:border-b-0 ${!notification.read ? 'bg-blue-50 font-xs' : ''}`}
                                                    onClick={() => markNotificationAsRead(notification.id, notification.ticketId)}
                                                >
                                                    <div className="flex-shrink-0 mt-1">
                                                        {!notification.read ? <Info size={16} className="text-blue-500" /> : <CheckCircle size={16} className="text-gray-400" />}
                                                    </div>
                                                    <div className="ml-3 text-sm flex-1">
                                                        <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: formatNotificationMessage(notification.message) }}></p>
                                                        <p className="text-gray-500 text-xs mt-1">
                                                            {new Date(notification.timestamp).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    {!notification.read && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notification.id); }}
                                                            // Absolute positioning for dynamic placement
                                                            className="absolute top-2 right-2 text-grey-500 hover:text-red-700 text-xs flex-shrink-0 px-2 py-1 rounded hover:bg-blue-100"
                                                        >
                                                            Mark Read
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="px-4 py-3 text-sm text-gray-500">No new notifications.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* User Profile Menu */}
                            <div className="relative">
                                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center text-gray-800 hover:text-blue-600 transition duration-200 text-sm">
                                    <User size={16} className="mr-1" />
                                    <span>{currentUser.email}</span>
                                    <ChevronDown size={16} className="ml-1" />
                                </button>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                        <button
                                            onClick={() => { navigateTo('profile'); setIsProfileMenuOpen(false); }}
                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <User size={16} className="mr-2" /> Profile
                                        </button>
                                        <button
                                            onClick={() => { navigateTo('changePassword'); setIsProfileMenuOpen(false); }} // Link to ChangePasswordComponent
                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <ClipboardCheck size={16} className="mr-2" /> Change Password
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                        >
                                            <LogOut size={16} className="mr-2" /> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </header>

                {/* Flash Message Display (adjust positioning since header is no longer fixed) */}
                {flashMessage && (
                    <div className={`p-3 text-xs rounded-none flex items-center justify-between ${getStatusClasses(flashType)}`} role="alert">
                        <div className="flex items-center">
                            {flashType === 'success' && <CheckCircle size={16} className="mr-1" />}
                            {flashType === 'error' && <XCircle size={16} className="mr-1" />}
                            {flashType === 'info' && <Info size={16} className="mr-1" />}
                            {flashType === 'warning' && <AlertTriangle size={16} className="mr-1" />}
                            <div className="text-sm">{flashMessage}</div>
                        </div>
                        <button onClick={() => setFlashMessage(null)} className="text-current hover:opacity-75">
                            <XCircle size={16} />
                        </button>
                    </div>
                )}

                {/* Main Content Canvas Area */}
                <section className={`flex-1 bg-gray-100 flex flex-col min-w-0`}>
                    {/* Conditional Rendering of Components based on currentPage and currentUser */}
                    {(() => {
                        if (!currentUser) {
                            // If no user is logged in, show Login or Register components
                            return currentPage === 'register' ? (
                                <RegisterComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                            ) : (
                                <LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                            );
                        } else {
                            // If a user is logged in, render components based on currentPage and user role
                            switch (currentPage) {
                                case 'dashboard':
                                    if (currentUser.role !== 'support' && currentUser.role !== 'admin') { // Admin can also see dashboard
                                        return <AccessDeniedComponent />;
                                    }
                                    return <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
                                case 'allTickets':
                                    if (currentUser.role !== 'support' && currentUser.role !== 'admin') { // Admin can also see all tickets
                                        return <AccessDeniedComponent />;
                                    }
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} isSidebarExpanded={isSidebarExpanded} />;
                                case 'assignedToMe':
                                    if (currentUser.role !== 'support' && currentUser.role !== 'admin') { // Admin can also see assigned tickets
                                        return <AccessDeniedComponent />;
                                    }
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} isSidebarExpanded={isSidebarExpanded} />;
                                case 'ticketDetail':
                                    return <TicketDetailComponent key={selectedTicketId} ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
                                case 'createTicket':
                                    return (
                                        <div className="flex flex-col items-center justify-center p-4">
                                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative border border-gray-200">
                                                <CreateTicketComponent
                                                    user={currentUser}
                                                    showFlashMessage={showFlashMessage}
                                                    onTicketCreated={handleTicketCreated}
                                                    navigateTo={navigateTo}
                                                />
                                            </div>
                                        </div>
                                    );
                                case 'profile':
                                    return <ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />;
                                case 'changePassword': // NEW: Case for Change Password page
                                    return <ChangePasswordComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />;
                                case 'userManagement': // NEW: Admin User Management page
                                    if (currentUser.role !== 'admin') {
                                        return <AccessDeniedComponent />;
                                    }
                                    return <UserManagementComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />;
                                default:
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />;
                            }
                        }
                    })()}
                </section>

                {/* Footer */}
                <footer className={`text-red-800 text-center p-2 w-full shadow-inner text-xs flex-shrink-0`}>
                    <p>&copy; {new Date().getFullYear()} Kriasol. All rights reserved.</p>
                </footer>
            </motion.div>
        </div>
    );
}

export default App;
