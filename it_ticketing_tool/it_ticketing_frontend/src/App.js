// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import Routes, Route, Link, useNavigate, useLocation from react-router-dom (BrowserRouter is now in index.js)
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    User,
    LogOut,
    ChevronDown,
    ChevronRight,
    Search,
    CheckCircle,
    XCircle,
    Info,
    AlertTriangle,
    Bell,
    ClipboardCheck, // Ensure this is imported for use in JSX
    Book,           // Ensure this is imported for use in JSX
    Users,
    Shield,
    Pin,
    BarChart2,
    ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineEye } from 'react-icons/ai'; // Or choose another icon library like 'fa' for Font Awesome
import { X } from 'lucide-react'; // Assuming you have lucide-react for X (for closing flash messages)
import 'animate.css'; // Make sure Animate.css is imported for animation classes
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import Menu from '@mui/material/Menu'; // Import Material-UI Menu
import MenuItem from '@mui/material/MenuItem'; // Import Material-UI MenuItem


// Import Firebase auth client and dbClient
import { authClient, dbClient } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase authentication methods
import { collection, query, onSnapshot, where } from 'firebase/firestore'; // Firestore imports and 'where'

// Import API Base URL from constants
import { API_BASE_URL } from './config/constants';

// Import local logo image
import KriasolLogo from './assets/logo/logo.png';

// SVG imports (ensure these paths are correct and icons exist)
import { ReactComponent as UsersIconSvg } from './assets/icons/UsersIcon.svg';
import { ReactComponent as LayoutDashboardIcon } from './assets/icons/LayoutDashboardIcon.svg';
import { ReactComponent as MenuIconSvg } from './assets/icons/MenuIcon.svg';
import { ReactComponent as MyTicketsIcon } from './assets/icons/MyTicketsIcon.svg';
import { ReactComponent as AssignedToMeIcon } from './assets/icons/AssignedToMeIcon.svg';
import { ReactComponent as CreateTicketIcon } from './assets/icons/CreateTicketIcon.svg';
import { ReactComponent as SettingsIconSvg } from './assets/icons/SettingsIconSvg.svg';


// Import feature components
import LoginComponent from './components/auth/LoginComponent';
import RegisterComponent from './components/auth/RegisterComponent';
import CreateTicketComponent from './components/tickets/CreateTicketComponent';
import MyTicketsComponent from './components/tickets/MyTicketsComponent';
import AllTicketsComponent from './components/tickets/AllTicketsComponent';
import TicketDetailComponent from './components/tickets/TicketDetailComponent'; // TicketDetailComponent will use useParams
import DashboardComponent from './components/DashboardComponent';
import ProfileComponent from './components/ProfileComponent';
import AccessDeniedComponent from './components/AccessDeniedComponent';
import ChangePasswordComponent from './components/ChangePasswordComponent';
import UserManagementComponent from './components/admin/UserManagementComponent';
import Modal from './components/common/Modal';
import AdminManagementComponent from './components/admin/AdminManagementComponent';
import ClientManagementComponent from './components/admin/ClientManagementComponent';
import EngineerManagementComponent from './components/admin/EngineerManagementComponent';


// Placeholder components for new pages mentioned in sidebar
const SettingsComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Settings Page (Placeholder)</h2>
        <p>Content for settings will go here.</p>
    </div>
);

const KnowledgeBaseComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Knowledge Base Page (Placeholder)</h2>
        <p>Content for knowledge base will go here.</p>
    </div>
);

// NEW: Placeholder components for admin sidebar
const SiteAdminManagementComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Siteadmin Management (Placeholder)</h2>
        <p>Manage site admins here.</p>
    </div>
);

const ReportsComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Reports (Placeholder)</h2>
        <p>Reports content goes here.</p>
    </div>
);
const InsightsComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Insights (Placeholder)</h2>
        <p>Insights content goes here.</p>
    </div>
);

/**
 * Main application component.
 * Manages user authentication state, global navigation, flash messages, and renders
 * the appropriate page based on the current route and user role.
 */
const App = () => {
    // State for the current authenticated user (Firebase user + custom role)
    const [currentUser, setCurrentUser] = useState(null);
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

    // Add pin state
    const [isSidebarPinned, setIsSidebarPinned] = useState(false);

    // React Router hooks
    const navigate = useNavigate(); // For programmatic navigation
    const location = useLocation(); // To get current path for active link highlighting

    // Popup notification state
    const [popupNotification, setPopupNotification] = useState(null);
    const popupTimeoutRef = useRef(null);
    const lastPopupNotificationId = useRef(null);

    // State for Material-UI "Manage" dropdown menu
    const [anchorEl, setAnchorEl] = useState(null);
    const managementOpen = Boolean(anchorEl); // Material-UI's Menu uses a boolean for its 'open' prop

    // Handlers for Material-UI "Manage" dropdown
    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMenuItemClick = (path) => {
        navigate(path); // Use navigate to go to the path
        handleClose(); // Close the menu after clicking a menu item
    };


    // Show popup only for truly new notifications (one-time)
    useEffect(() => {
        if (!notifications || notifications.length === 0) return;
        // Find the most recent unread notification
        const latestUnread = notifications.find(n => !n.read);
        if (
            latestUnread &&
            latestUnread.id !== lastPopupNotificationId.current
        ) {
            setPopupNotification(latestUnread);
            lastPopupNotificationId.current = latestUnread.id;
            if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
            popupTimeoutRef.current = setTimeout(() => setPopupNotification(null), 3000);
        }
    }, [notifications]);

    // Manual close for popup
    const handleClosePopup = () => {
        setPopupNotification(null);
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };

    // Define variants for Framer Motion animation for the sidebar
    // w-56 is 224px, w-16 is 64px
    const sidebarVariants = {
        expanded: { width: 180, transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { width: 52, transition: { type: "spring", stiffness: 300, damping: 30 } }
    };

    // Define variants for Framer Motion animation for the sidebar text
    const textVariants = {
        expanded: {
            opacity: 1,
            width: "auto",
            x: 0, // Text ends at its natural position (0 translation)
            transition: {
                delay: 0.05, // Slightly less delay for a smoother start
                duration: 0.2,
                ease: "easeOut" // Use an easing function for smoother motion
            }
        },
        collapsed: {
            opacity: 0,
            width: 0,
            x: -20, // Text moves 20px to the left and fades out
            transition: {
                duration: 0.2,
                ease: "easeIn" // Use an easing function for smoother motion
            }
        }
    };

    // Define variants for Framer Motion animation for the main content's left margin
    const mainContentVariants = {
        expanded: { marginLeft: 180, transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { marginLeft: 52, transition: { type: "spring", stiffness: 300, damping: 30 } }
    };

    // Helper for relative time
    const getRelativeTime = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000); // seconds
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        return date.toLocaleDateString();
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

    // Add helper function above the render:
    const getNotificationTitleAndBody = (n) => {
        if (n.title && n.message && n.title !== n.message) {
            return { title: n.title, body: n.message };
        }
        if (n.message) {
            const match = n.message.match(/^(.+?)[.:]\s*(.*)$/);
            if (match) {
                return { title: match[1], body: match[2] };
            }
            return { title: 'Notification', body: '' };
        }
        return { title: 'Notification', body: '' };
    };

    // Add this helper for generic notification formatting
    const formatGenericNotificationMessage = (type, message) => {
        // Highlight ticket number (TTxxxx) and key info for specific types
        let formatted = message;
        // Highlight ticket number
        formatted = formatted.replace(/(TT\d{4})/g, '<strong class="text-blue-600">$1</strong>');
        // Highlight status (for status update types)
        if (type.includes('status_update') || type.includes('reopened') || type.includes('cancelled')) {
            formatted = formatted.replace(/(marked as|re\-opened to|has been|cancelled|assigned to you|unassigned from you|reassigned from you|by [^:]+|on assigned ticket [^ ]+)/gi, '<span class="text-blue-600 font-semibold">$1</span>');
        }
        // Highlight commenter for comments
        if (type.includes('comment')) {
            formatted = formatted.replace(/by ([^\.]+)\./, 'by <span class="text-blue-600 font-semibold">$1</span>.');
        }
        return formatted;
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
                        let ticketsQuery;

                        // Adjust the Firestore query based on user role to match security rules
                        if (userProfile.role === 'support' || userProfile.role === 'admin') {
                            // Admins and Support can read all tickets (as per your rules)
                            ticketsQuery = query(ticketsCollectionRef);
                        } else {
                            // Regular users can only read their own tickets
                            ticketsQuery = query(ticketsCollectionRef, where('reporter_id', '==', userProfile.uid));
                        }


                        const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
                            const fetchedTickets = snapshot.docs.map(doc => ({
                                id: doc.id,
                                ...doc.data() // Get raw data; no need to format timestamps for counts
                            }));

                            // These counts are now based on the tickets the *current user is allowed to see*
                            const totalTickets = fetchedTickets.length;
                            const activeTickets = fetchedTickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length;
                            const assignedToMeTickets = fetchedTickets.filter(t => t.assigned_to_id === userProfile.uid && !['Closed', 'Resolved'].includes(t.status)).length;

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
                        // Note: React Router handles the initial page load based on URL.
                        // This `Maps` call ensures a default route upon successful login if the current path isn't ideal.
                        if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/') {
                             if (data.user.role === 'support' || data.user.role === 'admin') {
                                 navigate('/dashboard');
                             } else {
                                 navigate('/my-tickets');
                             }
                        }
                        return () => { // Cleanup for tickets listener if auth state changes again
                           unsubscribeTickets();
                        };
                    } else {
                        // If backend verification fails, show error and log out from Firebase
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        navigate('/login'); // Redirect to login
                    }
                } catch (error) {
                    // Handle network or other errors during auth state change processing
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    navigate('/login'); // Redirect to login
                }
            } else {
                // If no Firebase user is logged in, clear currentUser state and go to login page
                setCurrentUser(null);
                // Ensure we are on a public route if no user is logged in
                if (location.pathname !== '/login' && location.pathname !== '/register') {
                    navigate('/login');
                }
                setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Reset counts
                setNotifications([]); // Clear notifications
                setHasNewNotifications(false); // Clear new notification flag
                if (notificationPollingIntervalRef.current) {
                    clearInterval(notificationPollingIntervalRef.current); // Stop polling
                }
            }
        });
        return () => {
            unsubscribeAuth(); // Cleanup the auth state listener on component unmount
            if (notificationPollingIntervalRef.current) {
                clearInterval(notificationPollingIntervalRef.current); // Clear polling on unmount
            }
            // No need to clean up ticket listener here, it's handled within the if (firebaseUser) block
        };
    }, [fetchNotifications, navigate, location.pathname]); // Added navigate and location.pathname to dependency array

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
        if (user.role === 'support' || user.role === 'admin') {
            navigate('/dashboard'); // Use navigate hook
        } else {
            navigate('/my-tickets'); // Use navigate hook
        }
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
            navigate('/login'); // Navigate to login page
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
        }
    };

    /**
     * Global navigation function.
     * Updates the current page and selected ticket ID, and triggers data refreshes.
     * Now primarily a wrapper for `Maps` from react-router-dom, also handles other UI resets.
     * @param {string} path - The path to navigate to.
     * @param {string|null} [id=null] - Optional ID for detail pages (e.g., ticket ID).
     * @returns {void}
     */
    const navigateTo = useCallback((path, id = null) => {
        // console.log(`App: Navigating to path: ${path}, with ID: ${id}`); // Debugging
        if (id) {
            navigate(`${path}/${id}`); // Append ID to path for detail pages
        } else {
            navigate(path);
        }
        setSearchKeyword(''); // Clear search keyword on page change
        setTicketListRefreshKey(prev => prev + 1); // Increment key to force ticket list refresh
        if (currentUser) {
            fetchNotifications(currentUser); // Re-fetch notifications on navigation
        }
        setIsProfileMenuOpen(false); // Close profile menu on navigation
        setIsNotificationMenuOpen(false); // Close notification menu on navigation
    }, [navigate, currentUser, fetchNotifications]);


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
                fetchNotifications(currentUser); // Refresh notifications after marking read
                // Do NOT navigate to ticket here
            } else {
                console.error('Failed to mark notification as read:', await response.json());
                showFlashMessage('Failed to mark notification as read.', 'error');
            }
        } catch (error) {
            console.error('Network error marking notification as read:', error);
            showFlashMessage('Network error marking notification as read.', 'error');
        }
    }, [currentUser, fetchNotifications, showFlashMessage]);

    /**
     * Navigates to the ticket detail page.
     * @param {string} ticketId - The ID of the ticket to view.
     */
    const viewTicket = useCallback((ticketId) => {
        navigateTo(`/tickets/${ticketId}`);
        setIsNotificationMenuOpen(false); // Close notification menu after navigating
    }, [navigateTo]);

    /**
     * Clears a single notification from the list and from the backend.
     * @param {string} notificationId - The ID of the notification to clear.
     */
    const [removingNotificationIds, setRemovingNotificationIds] = useState([]);
    const clearNotification = useCallback((notificationId) => {
        setRemovingNotificationIds(prev => [...prev, notificationId]);
    }, []);

    /**
     * Clears all notifications for the current user from the backend.
     */
    const clearAllNotifications = useCallback(async () => {
        try {
            const idToken = await currentUser.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                showFlashMessage('All notifications cleared.', 'success');
                setNotifications([]); // Immediately clear local state for responsiveness
                setHasNewNotifications(false);
                setIsNotificationMenuOpen(false); // Close the menu
            } else {
                console.error('Failed to clear all notifications:', await response.json());
                showFlashMessage('Failed to clear all notifications.', 'error');
            }
        } catch (error) {
            console.error('Network error clearing all notifications:', error);
            showFlashMessage('Network error clearing all notifications.', 'error');
        }
    }, [currentUser, showFlashMessage]);


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

    // Add this style at the top of the file (or in your global CSS):
    // <style>
    // .notification-highlight { color: #111827 !important; font-weight: 600 !important; }
    // </style>
    //
    // In the notificationContent rendering, after using dangerouslySetInnerHTML, add a useEffect to replace any <strong> or <span style="color:..."></span> with class="notification-highlight".
    //
    // Example:
    // useEffect(() => {
    //   document.querySelectorAll('.notification-content strong, .notification-content span[style*="color"]').forEach(el => {
    //     el.classList.add('notification-highlight');
    //     el.removeAttribute('style');
    //   });
    // }, [notifications]);
    //
    // Also, in the backend, if possible, use <span class="notification-highlight">...</span> for highlights instead of blue.

    // Removed managementOpen state and managementMenuRef as Material-UI Menu handles this.
    // const [managementOpen, setManagementOpen] = useState(false);
    // const managementMenuRef = useRef(null);

    // Add refs for profile dropdowns
    const profileMenuRef = useRef(null);

    // Add useEffect for closing Management dropdown on outside click - No longer needed for MUI Menu
    // useEffect(() => {
    //     if (!managementOpen) return;
    //     function handleClickOutside(event) {
    //         if (managementMenuRef.current && !managementMenuRef.current.contains(event.target)) {
    //             setManagementOpen(false);
    //         }
    //     }
    //     document.addEventListener('mousedown', handleClickOutside);
    //     return () => document.removeEventListener('mousedown', handleClickOutside);
    // }, [managementOpen]);

    // Add useEffect for closing Profile dropdown on outside click
    useEffect(() => {
        if (!isProfileMenuOpen) return;
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileMenuOpen]);

    // Suppress ResizeObserver loop error in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const suppressedErrors = [
            'ResizeObserver loop completed with undelivered notifications.',
            'ResizeObserver loop limit exceeded'
        ];
        const realConsoleError = console.error;
        console.error = (...args) => {
            if (typeof args[0] === 'string' && suppressedErrors.some(e => args[0].includes(e))) {
                return;
            }
            realConsoleError(...args);
        };
    }

    return (
        // No BrowserRouter here, it's in index.js now.
        <div className="flex min-h-screen bg-gray-100 font-inter"> {/* Main flex container (row) */}
            {/* Top Banner Header - make it fixed and full width */}
            <header className="fixed top-0 left-0 w-full bg-white text-grey flex items-center justify-between shadow-md flex-shrink-0 z-50" style={{height: '48px', minHeight: '48px', padding: '0 12px'}}>
                <div className="flex-shrink-0 flex items-center">
                    <Link to={currentUser ? '/my-tickets' : '/login'}>
                        <img src={KriasolLogo} alt="Kriasol Logo" className="h-5 cursor-pointer" />
                    </Link>
                    {currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                        <Link to="/dashboard" className={`ml-2 flex items-center px-2 py-1 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-blue-100 ${location.pathname === '/dashboard' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-700'}`}> 
                            Dashboard
                        </Link>
                    )}
                    {/* Management Dropdown (right of Dashboard) - Now using Material-UI Menu */}
                    {currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                        <div className="relative ml-2">
                            <button
                                onClick={handleClick} // Use handleClick to open the MUI Menu
                                className="flex items-center px-2 py-1 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-blue-100 text-gray-700 cursor-pointer"
                                aria-controls={managementOpen ? 'management-menu' : undefined} // ARIA attributes
                                aria-haspopup="true"
                                aria-expanded={managementOpen ? 'true' : undefined}
                            >
                                Manage
                                {managementOpen ? (
                                    <ChevronUp className="ml-1 w-4 h-4" />
                                ) : (
                                    <ChevronDown className="ml-1 w-4 h-4" />
                                )}
                            </button>
                            <Menu
                                id="management-menu"
                                anchorEl={anchorEl}
                                open={managementOpen}
                                onClose={handleClose}
                                MenuListProps={{
                                    'aria-labelledby': 'manage-button',
                                }}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'center', // Center horizontally with respect to button
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'center', // Center horizontally with respect to button
                                }}
                                disablePortal
                                PaperProps={{
                                    elevation: 8, // Adds shadow
                                    sx: {
                                        borderRadius: '8px', // Rounded corners
                                        minWidth: 120,
                                        width: 'auto',
                                        fontSize: '0.75rem',
                                        padding: 0,
                                        overflow: 'hidden', // Ensures rounded corners are applied to content
                                        marginTop: 0.5, // Slightly offset menu so it doesn't cover the button
                                    },
                                }}
                            >
                                {currentUser.role === 'super_admin' && (
                                    <>
                                        <MenuItem onClick={() => handleMenuItemClick('/admin-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <Users width={16} height={16} className="mr-2" /> Admins
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/engineer-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <PeopleIcon fontSize="small" sx={{ fontSize: 16, marginRight: '8px' }} /> Engineers
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/user-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <User width={16} height={16} className="mr-2" /> Users
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/siteadmin-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <Shield width={16} height={16} className="mr-2" /> Site Admins
                                        </MenuItem>
                                    </>
                                )}
                                {currentUser.role === 'admin' && (
                                    <>
                                        <MenuItem onClick={() => handleMenuItemClick('/engineer-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <PeopleIcon fontSize="small" sx={{ fontSize: 16, marginRight: '8px' }} /> Engineers
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/client-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <Users width={16} height={16} className="mr-2" /> Clients
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/user-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <User width={16} height={16} className="mr-2" /> Users
                                        </MenuItem>
                                        <MenuItem onClick={() => handleMenuItemClick('/siteadmin-management')} sx={{ fontSize: '0.75rem', minHeight: 22 }}>
                                            <Shield width={16} height={16} className="mr-2" /> Site Admins
                                        </MenuItem>
                                    </>
                                )}
                            </Menu>
                        </div>
                    )}
                </div>
                <div className="flex-1" />
                {/* Move search bar, notification bell, and profile dropdown to the far right */}
                {currentUser && location.pathname !== '/login' && location.pathname !== '/register' && (
                    <div className="flex items-center gap-2">
                        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xs">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={handleSearchChange}
                                placeholder="Search..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </form>
                        {/* Notification Bell */}
                        <div className="relative">
                            <button
                                className="relative p-1 rounded-full hover:bg-gray-100 focus:outline-none text-sm"
                                onClick={() => setIsNotificationMenuOpen(open => !open)}
                                aria-label="Notifications"
                            >
                                <Bell size={16} className="text-gray-700" />
                                {hasNewNotifications && (
                                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
                                )}
                            </button>
                            {isNotificationMenuOpen && (
                                <div ref={notificationMenuRef} className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-sm">
                                    <div className="p-4 border-b font-semibold text-gray-700 flex items-center justify-between">
                                        Notifications
                                        <button onClick={clearAllNotifications} className="text-xs text-blue-600 hover:underline">Clear All</button>
                                    </div>
                                    <ul className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <li className="p-4 text-gray-500 text-sm">No notifications</li>
                                        ) : notifications.map(n => {
                                            const { title, body } = getNotificationTitleAndBody(n);
                                            return (
                                                <li key={n.id} className={`px-4 py-3 border-b last:border-b-0 flex items-start space-x-2 ${!n.read ? 'bg-blue-50' : ''}`}>
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800 text-sm">{title}</div>
                                                        {body && <div className="text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: formatNotificationMessage(body) }} />}
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-1">
                                                        {!n.read && (
                                                            <button onClick={() => markNotificationAsRead(n.id)} className="text-xs text-blue-600 hover:underline">Mark as read</button>
                                                        )}
                                                        {n.ticket_id && (
                                                            <button onClick={() => viewTicket(n.ticket_id)} className="text-xs text-gray-500 hover:underline">View</button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                className="flex items-center px-2 py-1 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-blue-100 text-gray-700"
                                onClick={() => setIsProfileMenuOpen(open => !open)}
                                aria-label="Profile"
                            >
                                <User className="w-4 h-4" />
                                <ChevronDown className="ml-1 w-3 h-3" />
                            </button>
                            {isProfileMenuOpen && (
                                <ul className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-sm">
                                    <li className="px-4 py-2 text-xs text-gray-500 border-b">{currentUser.email}</li>
                                    <li>
                                        <Link to="/profile" className="flex items-center px-4 py-2 hover:bg-gray-100">Profile</Link>
                                    </li>
                                    <li>
                                        <Link to="/change-password" className="flex items-center px-4 py-2 hover:bg-gray-100">Change Password</Link>
                                    </li>
                                    <li>
                                        <button onClick={handleLogout} className="flex items-center px-4 py-2 w-full text-left hover:bg-gray-100">Logout</button>
                                    </li>
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Left Side Menu (always visible when logged in) */}
            {currentUser && (
                <motion.nav
                    ref={sidebarMenuRef}
                    initial={false}
                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                    variants={sidebarVariants}
                    className="sidebar-glass fixed left-0 text-blue-900 flex flex-col p-3 shadow-lg flex-shrink-0 overflow-y-auto h-[calc(100vh-48px)] z-50"
                    style={{top: '48px'}}
                    onMouseEnter={() => { if (!isSidebarPinned) setIsSidebarExpanded(true); }}
                    onMouseLeave={() => { if (!isSidebarPinned) setIsSidebarExpanded(false); }}
                >
                    {/* Pin icon at bottom right when expanded */}
                    {isSidebarExpanded && (
                        <button
                            className="absolute bottom-4 right-2 p-1 rounded hover:bg-gray-200 transition-colors z-50"
                            title={isSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                            onClick={() => setIsSidebarPinned(pin => !pin)}
                        >
                            <Pin size={16} className={isSidebarPinned ? 'text-blue-600' : 'text-gray-400'} fill={isSidebarPinned ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    {/* Top Menu Items */}
                    <ul className="space-y-2">
                        {(currentUser.role === 'super_admin') ? (
                            <>
                                {/* Activity Group */}
                                {isSidebarExpanded && (
                                    <div className="mt-2 mb-1 px-2 text-[11px] font-semibold tracking-wider text-gray-400">Activity</div>
                                )}
                                <li>
                                    <Link to="/all-tickets" className={`menu-item relative flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/all-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <MenuIconSvg width={18} height={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Tickets</motion.span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/my-tickets" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/my-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <AssignedToMeIcon height={18} width={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">My Tickets</motion.span>
                                    </Link>
                                </li>
                                {/* My org Group */}
                                {isSidebarExpanded && (
                                    <div className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wider text-gray-400">My Organization</div>
                                )}
                                <li>
                                    <Link to="/clients" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/clients' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <Users className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} width={18} height={18} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Clients</motion.span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/site-admin-access" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/site-admin-access' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <Shield className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} width={18} height={18} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Site Admin</motion.span>
                                    </Link>
                                </li>
                                {/* Planning Group */}
                                {isSidebarExpanded && (
                                    <div className="mt-4 mb-1 px-2 text-[11px] font-semibold tracking-wider text-gray-400">Planning</div>
                                )}
                                <li>
                                    <Link to="/insights" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/insights' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <BarChart2 width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Insights</motion.span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/reports" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/reports' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <Info width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Reports</motion.span>
                                    </Link>
                                </li>
                            </>
                        ) : currentUser.role === 'admin' ? (
                            <>
                                {/* Admin Sidebar Menu - Only show tickets, reports, insights */}
                                <li>
                                    <Link to="/all-tickets" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/all-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <MenuIconSvg width={18} height={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Tickets</motion.span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/reports" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/reports' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <Info width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Reports</motion.span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/insights" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/insights' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        <BarChart2 width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Insights</motion.span>
                                    </Link>
                                </li>
                            </>
                        ) : (
                            <>
                            {/* Only show Dashboard in sidebar for support and other non-admin roles */}
                            {(currentUser.role === 'support') && (
                                <>
                                    
                                    <li>
                                        <Link to="/dashboard" className={`menu-item relative flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/dashboard' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                            <LayoutDashboardIcon width={18} height={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                            <motion.span
                                                variants={textVariants}
                                                animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                className="whitespace-nowrap overflow-hidden"
                                            >
                                                Dashboard
                                            </motion.span>
                                            {!isSidebarExpanded && (
                                                <span className="sidebar-count-badge absolute top-0 right-0 text-xs rounded-full h-4 w-4 flex items-center justify-center -mt-1 -mr-1">
                                                    {ticketCounts.active_tickets}
                                                </span>
                                            )}
                                            {isSidebarExpanded && (
                                                <span className="ml-2 text-xs">
                                                    ({ticketCounts.active_tickets})
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/all-tickets" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/all-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                            <MenuIconSvg width={18} height={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                            <motion.span
                                                variants={textVariants}
                                                animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                className="whitespace-nowrap overflow-hidden"
                                            >
                                                All Tickets
                                            </motion.span>
                                        </Link>
                                    </li>
                                </>
                            )}
                        <li>
                            <Link to="/my-tickets" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/my-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                <AssignedToMeIcon height={18} width={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                <motion.span
                                    variants={textVariants}
                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    My Tickets
                                </motion.span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/create-ticket" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/create-ticket' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                <CreateTicketIcon height={18} width={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                <motion.span
                                    variants={textVariants}
                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                    className="whitespace-nowrap overflow-hidden"
                                >
                                    Create Ticket
                                </motion.span>
                            </Link>
                        </li>
                        {/* Remove 'Assigned to Me' from sidebar for admin */}
                        {currentUser.role === 'admin' && false && (
                            <li>
                                <Link to="/user-management" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/user-management' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                    <UsersIconSvg width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                    <motion.span
                                        variants={textVariants}
                                        animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                        className="whitespace-nowrap overflow-hidden"
                                    >
                                        User Management
                                    </motion.span>
                                </Link>
                            </li>
                        )}
                            </>
                        )}
                    </ul>
                    {/* Bottom Menu Items */}
                    <div className="mt-auto pt-4 border-t border-gray-200">
                        <ul className="space-y-2">
                            <li>
                                <Link to="/knowledge-base" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/knowledge-base' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                    <Book size={18} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} />
                                    <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Knowledge Base</motion.span>
                                </Link>
                            </li>
                            <li>
                                <Link to="/settings" className={`menu-item flex items-center w-full px-2 py-1 rounded-lg text-left transition-colors duration-300 text-sm ${location.pathname === '/settings' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                    <SettingsIconSvg width={16} height={16} className={`flex-shrink-0 ${isSidebarExpanded ? 'mr-1.5' : ''}`} fill="currentColor" />
                                    <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden">Settings</motion.span>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </motion.nav>
            )}

            {/* Right Content Area (Header + Main Content + Footer - flex column) */}
            <motion.div
                className={`flex flex-col flex-1`}
                initial={false}
                animate={currentUser ? (isSidebarExpanded ? "expanded" : "collapsed") : { marginLeft: 0 }}
                variants={mainContentVariants}
            >
                <div style={{height: '48px'}} /> {/* Spacer for fixed header */}
            {/* Main Content Canvas Area */}
            <section className={`flex-1 bg-gray-100 flex flex-col min-w-0`}>
                <Routes> {/* Define your routes here */}
                    {/* Public Routes (Login/Register) */}
                    <Route path="/login" element={<LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />
                                <Route path="/register" element={<RegisterComponent currentUser={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />

                    {/* Protected Routes (require currentUser) */}
                    {currentUser ? (
                        <>
                            {/* Default route for logged-in users, redirect based on role */}
                            <Route path="/" element={
                                currentUser.role === 'support' || currentUser.role === 'admin' || currentUser.role === 'super_admin' ?
                                    <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                    <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />
                            } />

                            <Route path="/dashboard" element={
                                (["support", "admin", "super_admin", "site_admin"].includes(currentUser.role)) ?
                                    <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                    <AccessDeniedComponent />
                            } />
                            <Route path="/all-tickets" element={
                                (currentUser.role === 'support' || currentUser.role === 'admin' || currentUser.role === 'super_admin') ?
                                    <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} isSidebarExpanded={isSidebarExpanded} /> :
                                    <AccessDeniedComponent />
                            } />
                            <Route path="/assigned-to-me" element={
                                (currentUser.role === 'support' || currentUser.role === 'admin' || currentUser.role === 'super_admin') ?
                                    <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} isSidebarExpanded={isSidebarExpanded} /> :
                                    <AccessDeniedComponent />
                            } />
                            <Route path="/my-tickets" element={<MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />} />
                            <Route path="/create-ticket" element={
                                <Modal
                                    isOpen={true}
                                    onClose={() => navigate(-1)}
                                    title="Create Ticket"
                                >
                                    <CreateTicketComponent
                                        user={currentUser}
                                        showFlashMessage={showFlashMessage}
                                        onTicketCreated={handleTicketCreated}
                                        navigateTo={navigateTo}
                                        onClose={() => navigate(-1)}
                                    />
                                </Modal>
                            } />
                            {/* Dynamic route for Ticket Detail */}
                            <Route path="/tickets/:ticketId" element={<TicketDetailComponent navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />} />

                            <Route path="/profile" element={<ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />} />
                            <Route path="/change-password" element={<ChangePasswordComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />} />
                            <Route path="/user-management" element={
                                (currentUser.role === 'admin' || currentUser.role === 'super_admin') ?
                                    <UserManagementComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} /> :
                                    <AccessDeniedComponent />
                            } />
                            <Route path="/settings" element={<SettingsComponent />} />
                            <Route path="/knowledge-base" element={<KnowledgeBaseComponent />} />
                            <Route path="/admin-management" element={
                                currentUser.role === 'super_admin' ?
                                    <AdminManagementComponent currentUser={currentUser} showFlashMessage={showFlashMessage} /> :
                                    <AccessDeniedComponent />
                            } />
                            {/* Admin-only routes */}
                            <Route path="/client-management" element={currentUser.role === 'admin' ? <ClientManagementComponent /> : <AccessDeniedComponent />} />
                            <Route path="/siteadmin-management" element={currentUser.role === 'admin' ? <SiteAdminManagementComponent /> : <AccessDeniedComponent />} />
                            <Route path="/engineer-management" element={(currentUser.role === 'admin' || currentUser.role === 'super_admin') ? <EngineerManagementComponent /> : <AccessDeniedComponent />} />
                            <Route path="/reports" element={currentUser.role === 'admin' ? <ReportsComponent /> : <AccessDeniedComponent />} />
                            <Route path="/insights" element={currentUser.role === 'admin' ? <InsightsComponent /> : <AccessDeniedComponent />} />
                            <Route path="/clients" element={currentUser.role === 'super_admin' ? <ClientManagementComponent /> : <AccessDeniedComponent />} />

                            {/* Catch-all for logged-in users if no other route matches */}
                            {/* This ensures that if they go to an invalid path, they are redirected to their default view */}
                            <Route path="*" element={
                                currentUser.role === 'support' || currentUser.role === 'admin' || currentUser.role === 'super_admin' ?
                                    <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                    <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />
                            } />
                        </>
                    ) : (
                        // If not logged in, redirect any unmatched route to login
                        <Route path="*" element={<LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />
                    )}
                </Routes>
            </section>

            {/* Footer */}
            <footer className={`text-white-500 text-center p-2 w-full shadow-inner text-xs flex-shrink-0`}>
                <p>&copy; {new Date().getFullYear()} Kriasol. All rights reserved.</p>
            </footer>
        </motion.div>
    </div>
);
}

export default App;
