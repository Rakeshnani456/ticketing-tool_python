// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogOut, ChevronDown, Search, CheckCircle, XCircle, Info, AlertTriangle, Bell, Menu, LayoutDashboard, List, Tag, ClipboardCheck, PlusCircle } from 'lucide-react'; // Added Menu icon and specific icons

// Import Firebase auth client
import { authClient } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase authentication methods

// Import API Base URL from constants
import { API_BASE_URL } from './config/constants';

// Import local logo image
import KriasolLogo from './assets/logo/logo.png'; // Assuming logo is in src/assets/logo/logo.png

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
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const sidebarMenuRef = useRef(null);
    // The menuButtonRef is now only needed to prevent closing the notification menu if clicking this button
    // It does not control `isMenuOpen` anymore.


    /**
     * Fetches summary counts for tickets (active, assigned to me, total).
     * Used to update sidebar badges for support users.
     * @param {object} user - The current authenticated user object.
     * @returns {void}
     */
    const fetchTicketCounts = useCallback(async (user) => {
        if (!user || !user.firebaseUser) return; // Only fetch if a Firebase user is present
        try {
            const idToken = await user.firebaseUser.getIdToken(); // Get ID token for authorization
            const response = await fetch(`${API_BASE_URL}/tickets/summary-counts`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTicketCounts(data); // Update ticket counts state
            } else {
                console.error("Failed to fetch ticket counts:", await response.json());
            }
        } catch (error) {
            console.error("Network error fetching ticket counts:", error);
        }
    }, []); // Empty dependency array means this function is created once and doesn't change

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
        const unsubscribe = onAuthStateChanged(authClient, async (firebaseUser) => {
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
                        fetchTicketCounts(userProfile); // Fetch ticket counts for logged-in user
                        fetchNotifications(userProfile); // Fetch notifications for logged-in user

                        // Start polling for notifications
                        if (notificationPollingIntervalRef.current) {
                            clearInterval(notificationPollingIntervalRef.current);
                        }
                        notificationPollingIntervalRef.current = setInterval(() => {
                            fetchNotifications(userProfile);
                        }, 30000); // Poll every 30 seconds

                        // Navigate based on user role
                        if (data.user.role === 'support') {
                            setCurrentPage('dashboard'); // Support users go to dashboard
                        } else {
                            setCurrentPage('myTickets'); // Regular users go to their tickets
                        }
                        setIsSidebarExpanded(false); // Start with sidebar collapsed (icons only)
                    } else {
                        // If backend verification fails, show error and log out from Firebase
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        setCurrentPage('login'); // Redirect to login
                        setIsSidebarExpanded(false); // Ensure sidebar is collapsed
                    }
                } catch (error) {
                    // Handle network or other errors during auth state change processing
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    setCurrentPage('login'); // Redirect to login
                    setIsSidebarExpanded(false); // Ensure sidebar is collapsed
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
                setIsSidebarExpanded(false); // Ensure sidebar is collapsed
            }
        });
        return () => {
            unsubscribe(); // Cleanup the auth state listener on component unmount
            if (notificationPollingIntervalRef.current) {
                clearInterval(notificationPollingIntervalRef.current); // Clear polling on unmount
            }
        };
    }, [fetchTicketCounts, fetchNotifications]); // `fetchTicketCounts` and `fetchNotifications` are dependencies here

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
    }, [isNotificationMenuOpen]); // Re-run effect when `isNotificationMenuOpen` changes


    /**
     * Callback function for successful login.
     * Sets the current user and navigates to the appropriate page based on role.
     * @param {object} user - The user object returned from the login process.
     * @returns {void}
     */
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        fetchTicketCounts(user);
        fetchNotifications(user); // Fetch notifications on login
        if (user.role === 'support') {
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
        setTicketListRefreshKey(prev => prev + 1); // Increment key to force ticket list refresh
        if (currentUser) {
            fetchTicketCounts(currentUser); // Re-fetch counts on navigation
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
            fetchTicketCounts(currentUser); // Refresh ticket counts
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

    // Determine the left margin for the main content based on sidebar state
    const mainContentMarginClass = currentUser
        ? (isSidebarExpanded ? 'ml-56' : 'ml-16') // 56 (224px) for expanded, 16 (64px) for collapsed
        : 'ml-0'; // No margin when sidebar is hidden (e.g., login page)


    return (
        <div className="flex flex-col min-h-screen bg-gray-100 font-inter overflow-hidden">
            {/* Top Banner Header */}
            <header className="bg-white text-grey p-3 flex items-center justify-between shadow-md flex-shrink-0 fixed top-0 w-full z-50">
                <div className="flex items-center">
                    {/* Menu Button (now only toggles sidebar expansion) */}
                    {currentUser && (
                        <button
                            onClick={() => setIsSidebarExpanded(prev => !prev)} // Toggle sidebar expanded state
                            className="p-2 mr-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                            aria-label="Toggle Menu"
                        >
                            <Menu size={24} className="text-gray-800" />
                        </button>
                    )}
                    {/* Kriasol Logo */}
                    <div className="flex-shrink-0">
                        <img
                            src={KriasolLogo}
                            alt="Kriasol Logo"
                            className="h-8 cursor-pointer" // Added cursor-pointer for visual feedback
                            onClick={() => navigateTo('allTickets')} // Navigate to 'allTickets' on click
                        /> {/* Adjust height as needed */}
                    </div>
                </div>

                {/* Search Bar (visible only when logged in and not on login/register pages) */}
                {currentUser && currentPage !== 'login' && currentPage !== 'register' && (
                    <form onSubmit={handleSearchSubmit} className="flex items-center text-grey-800 space-x-2 flex-1 max-w-md mx-auto">
                        <FormInput
                            id="search"
                            type="text"
                            value={searchKeyword}
                            onChange={handleSearchChange}
                            placeholder="Search by TicketID/Name"
                            className="flex-1"
                            icon={Search}
                            label="" // Hide label as placeholder is used
                        />
                        <PrimaryButton type="submit" Icon={Search} className="w-auto px-3 py-1.5">
                            Search
                        </PrimaryButton>
                    </form>
                )}

                {/* User Profile and Notification Menu (visible when logged in) */}
                {currentUser && (
                    <div className="flex items-center space-x-4">
                        {/* Notification Button */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsNotificationMenuOpen(!isNotificationMenuOpen); }} // NEW: Stop propagation
                                className="relative flex items-center text-gray-800 hover:text-blue-600 transition duration-200 text-sm p-2 rounded-full hover:bg-gray-100"
                                aria-label="Notifications"
                            >
                                <Bell size={20} />
                                {hasNewNotifications && (
                                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-600 animate-pulse"></span>
                                )}
                            </button>
                            {isNotificationMenuOpen && (
                                <div ref={notificationMenuRef} className="absolute right-0 mt-2 w-1/2 md:w-96 bg-white rounded-md shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                                    <h3 className="text-sm font-semibold px-4 py-2 text-gray-700 border-b border-gray-200">Notifications</h3>
                                    {notifications.length > 0 ? (
                                        notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                className={`flex items-start px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50 font-medium' : ''}`}
                                                onClick={() => markNotificationAsRead(notification.id, notification.ticketId)}
                                            >
                                                <div className="flex-shrink-0 mt-1">
                                                    {!notification.read ? <Info size={16} className="text-blue-500" /> : <CheckCircle size={16} className="text-gray-400" />}
                                                </div>
                                                <div className="ml-3 text-sm flex-1">
                                                    {/* Modified line to display bold text with blue color */}
                                                    <p className="text-gray-800" dangerouslySetInnerHTML={{ __html: formatNotificationMessage(notification.message) }}></p>
                                                    <p className="text-gray-500 text-xs mt-1">
                                                        {new Date(notification.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markNotificationAsRead(notification.id); }}
                                                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs flex-shrink-0"
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

            {/* Main Content Area: Left Menu + Main Canvas */}
            <main className="flex flex-1 overflow-hidden pt-16"> {/* Add pt-16 to offset fixed header */}
                {/* Left Side Menu (always visible when logged in) */}
                {currentUser && (
                    <nav
                        ref={sidebarMenuRef}
                        className={`bg-gray-800 text-white flex flex-col p-3 shadow-lg flex-shrink-0 overflow-y-auto fixed h-full top-0 z-40 pt-16
                            transition-all duration-500 ease-in-out /* Changed from duration-300 to duration-500 */
                            ${isSidebarExpanded ? 'w-56' : 'w-16'}
                        `}
                        onMouseEnter={() => setIsSidebarExpanded(true)} // Always expand on hover
                        onMouseLeave={() => setIsSidebarExpanded(false)} // Always collapse on mouse leave
                    >
                        <ul className="space-y-2 mt-3">
                            {/* Support User Specific Menu Items */}
                            {currentUser.role === 'support' && (
                                <>
                                    <li>
                                        <button onClick={() => navigateTo('dashboard')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <LayoutDashboard size={16} className="flex-shrink-0 mr-2" />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                                Dashboard
                                            </span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('allTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'allTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <List size={16} className="flex-shrink-0 mr-2" />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                                All Tickets ({ticketCounts.active_tickets})
                                            </span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('assignedToMe')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'assignedToMe' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <Tag size={16} className="flex-shrink-0 mr-2" />
                                            <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                                Assigned to Me ({ticketCounts.assigned_to_me})
                                            </span>
                                        </button>
                                    </li>
                                </>
                            )}
                            {/* Common Menu Item for All Users */}
                            <li>
                                <button onClick={() => navigateTo('myTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'myTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    <ClipboardCheck size={16} className="flex-shrink-0 mr-2" />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                        My Tickets
                                    </span>
                                </button>
                            </li>
                            {/* Add Create Ticket Here if desired */}
                            <li>
                                <button onClick={() => navigateTo('createTicket')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'createTicket' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    <PlusCircle size={16} className="flex-shrink-0 mr-2" />
                                    <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                        Create Ticket
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}

                {/* Main Content Canvas Area */}
                <section className={`flex-1 bg-gray-100 flex flex-col min-w-0 ${mainContentMarginClass} transition-all duration-300 ease-in-out`}> {/* Adjust left margin based on menu open state */}
                    {/* Flash Message Display */}
                    {flashMessage && (
                        <div className={`fixed top-16 left-0 right-0 z-40 p-3 text-xs rounded-none flex items-center justify-between ${getStatusClasses(flashType)}`} role="alert">
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
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    return <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
                                case 'allTickets':
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    // Pass all relevant props to AllTicketsComponent, remove initialFilterAssignment
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} />;
                                case 'assignedToMe':
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    // Pass initialFilterAssignment to AllTicketsComponent for specific view
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} />;
                                case 'ticketDetail':
                                    // console.log(`App: Rendering TicketDetailComponent with selectedTicketId: ${selectedTicketId}`); // Debugging
                                    return <TicketDetailComponent key={selectedTicketId} ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
                                case 'createTicket':
                                    return (
                                        <div className="flex flex-col items-center justify-center p-4">
                                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative border border-gray-200">
                                                <CreateTicketComponent
                                                    user={currentUser}
                                                    showFlashMessage={showFlashMessage}
                                                    onTicketCreated={handleTicketCreated} // Callback for successful ticket creation
                                                    navigateTo={navigateTo}
                                                />
                                            </div>
                                        </div>
                                    );
                                case 'profile':
                                    return <ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />;
                                default:
                                    // Default page for logged-in users is MyTicketsComponent
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                            }
                        }
                    })()}
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-800 text-white text-center p-2 w-full shadow-inner text-xs flex-shrink-0">
                <p>&copy; {new Date().getFullYear()} Kriasol. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;