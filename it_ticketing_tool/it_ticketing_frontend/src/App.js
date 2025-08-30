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
    CheckCircle2,
    XCircle,
    Info,
    AlertTriangle,
    Bell,
    ClipboardCheck, // Ensure this is imported for use in JSX
    Book,           // Ensure this is imported for use in JSX
    Users,
    Shield,
    Pin,

    ChevronUp,
    Home,
    FileText,
    Settings,
    HelpCircle,
    TrendingUp,
    Briefcase,
    UserCheck,
    Building,
    Zap,
    Loader2,
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
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import Menu from '@mui/material/Menu'; // Import Material-UI Menu
import MenuItem from '@mui/material/MenuItem'; // Import Material-UI MenuItem
import NotificationModal from './components/common/NotificationModal';
import { BellRing } from './components/common/BellRing';
import { createPortal } from 'react-dom';


// Import Firebase auth client and dbClient
import { authClient, dbClient } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase authentication methods
import { collection, query, onSnapshot, where, doc, getDoc } from 'firebase/firestore'; // Firestore imports and 'where'

// Import API Base URL from constants
import { API_BASE_URL } from './config/constants';

// Import local logo image
import KriasolLogo from './assets/logo/logo.png';
import FabLogo from './assets/logo/FabLogo.png';

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
import InitialPasswordChangeComponent from './components/auth/InitialPasswordChangeComponent';
import UserManagementComponent from './components/admin/UserManagementComponent';
import Modal from './components/common/Modal';
import AdminManagementComponent from './components/admin/AdminManagementComponent';
import ClientManagementComponent from './components/admin/ClientManagementComponent';
import EngineerManagementComponent from './components/admin/EngineerManagementComponent';
import ReportsComponent from './components/ReportsComponent';



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




function TooltipBubble({ title, children }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 2, // nudge up by 2px (moved down from -4)
        left: rect.right + 8, // 8px gap from icon
      });
    }
  }, [show]);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      ref={iconRef}
    >
      {children}
      {show && createPortal(
        <div
          className="scale-up-center-normal"
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            background: '#000000', // black background
            color: '#ffffff', // white text
            borderRadius: 8,
            padding: '3px 8px', // reduced padding
            fontSize: 11, // smaller font
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {title}
        </div>,
        document.body
      )}
    </div>
  );
}

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
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
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

    // NEW: Add loading state for authentication
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // State for ticket creation success popup
    const [ticketSubmissionStatus, setTicketSubmissionStatus] = useState('idle'); // 'idle', 'submitting', 'success', 'error'
    const [createdTicketInfo, setCreatedTicketInfo] = useState(null);

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
    // Set the expanded sidebar width to 184px for a slimmer look (reduced by 8% total)
    const sidebarVariants = {
        expanded: { width: 184, transition: { type: "spring", stiffness: 300, damping: 30, duration: 0.35, ease: "easeInOut" } },
        collapsed: { width: 56, transition: { type: "spring", stiffness: 300, damping: 30, duration: 0.35, ease: "easeInOut" } }
    };

    // Define variants for Framer Motion animation for the sidebar text
    const textVariants = {
        expanded: {
            opacity: 1,
            width: "auto",
            x: 0,
            transition: {
                delay: 0.1,
                duration: 0.2,
                ease: "easeOut"
            }
        },
        collapsed: {
            opacity: 0,
            width: 0,
            x: -10,
            transition: {
                duration: 0.15,
                ease: "easeIn"
            }
        }
    };

    // Define variants for Framer Motion animation for the main content's width
    const mainContentVariants = {
        expanded: { left: 184, width: 'calc(100% - 184px)', transition: { type: "spring", stiffness: 300, damping: 30 } },
        collapsed: { left: 56, width: 'calc(100% - 56px)', transition: { type: "spring", stiffness: 300, damping: 30 } }
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
                        let userProfile = { firebaseUser, role: data.user.role, email: firebaseUser.email, uid: firebaseUser.uid };
                        
                        // For site_admin users, fetch complete profile from Firestore to get client_name
                        if (data.user.role === 'site_admin') {
                            try {
                                const userDocRef = doc(dbClient, 'users', firebaseUser.uid);
                                const userDoc = await getDoc(userDocRef);
                                if (userDoc.exists()) {
                                    const userData = userDoc.data();
                                    console.log("Site admin user data:", userData);
                                    userProfile = {
                                        ...userProfile,
                                        client_name: userData.client_name || userData.companyName,
                                        companyName: userData.client_name || userData.companyName
                                    };
                                    console.log("Site admin profile after enhancement:", userProfile);
                                } else {
                                    console.error("Site admin user document not found in Firestore");
                                }
                            } catch (error) {
                                console.error('Error fetching site admin profile:', error);
                            }
                        }
                        
                        setCurrentUser(userProfile);
                        fetchNotifications(userProfile); // Fetch notifications for logged-in user

                        // OPTIMIZED: Reduced polling frequency from 30s to 2 minutes
                        if (notificationPollingIntervalRef.current) {
                            clearInterval(notificationPollingIntervalRef.current);
                        }
                        notificationPollingIntervalRef.current = setInterval(() => {
                            fetchNotifications(userProfile);
                        }, 120000); // Poll every 2 minutes instead of 30 seconds

                        // OPTIMIZED: Set up Firestore listener for ticket counts with caching
                        const ticketsCollectionRef = collection(dbClient, 'tickets');
                        let ticketsQuery;

                        // Adjust the Firestore query based on user role to match security rules
                        if (userProfile.role === 'support' || userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'site_admin') {
                            // Admins and Support can read all tickets (as per your rules)
                            ticketsQuery = query(ticketsCollectionRef);
                        } else {
                            // Regular users can only read their own tickets
                            ticketsQuery = query(ticketsCollectionRef, where('reporter_id', '==', userProfile.uid));
                        }

                        // OPTIMIZED: Check cache before setting up listener
                        const cacheKey = `ticket_counts_${userProfile.uid}`;
                        const cachedCounts = localStorage.getItem(cacheKey);
                        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
                        const now = Date.now();
                        
                        // Use cached data if it's less than 5 minutes old
                        if (cachedCounts && cacheTime && (now - parseInt(cacheTime)) < 300000) {
                            try {
                                const parsedCounts = JSON.parse(cachedCounts);
                                setTicketCounts(parsedCounts);
                            } catch (e) {
                                console.warn('Failed to parse cached ticket counts:', e);
                            }
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

                            const newCounts = {
                                total_tickets: totalTickets,
                                active_tickets: activeTickets,
                                assigned_to_me: assignedToMeTickets
                            };

                            setTicketCounts(newCounts);
                            
                            // Cache the counts for 5 minutes
                            localStorage.setItem(cacheKey, JSON.stringify(newCounts));
                            localStorage.setItem(`${cacheKey}_time`, now.toString());
                        }, (err) => {
                            console.error("Firestore onSnapshot error for ticket counts:", err);
                            // Optionally show a flash message for count errors
                        });

                        // Navigate based on user role
                        // Note: React Router handles the initial page load based on URL.
                        // This `Maps` call ensures a default route upon successful login if the current path isn't ideal.
                        if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/') {
                             if (data.user.role === 'support' || data.user.role === 'admin' || data.user.role === 'super_admin' || data.user.role === 'site_admin') {
                                 navigate('/dashboard');
                             } else {
                                 navigate('/my-tickets');
                             }
                        }
                        // Don't navigate if user is on password change route - let them complete the process
                        
                        // Set loading to false after successful authentication
                        setIsAuthLoading(false);
                        
                        return () => { // Cleanup for tickets listener if auth state changes again
                           unsubscribeTickets();
                        };
                    } else if (response.status === 403 && data.mustChangePassword) {
                        // Password change required - allow user to stay on password change route
                        console.log("Password change required for user:", firebaseUser.email);
                        
                        // If user is already on the password change route, don't sign them out
                        if (location.pathname === '/initial-password-change') {
                            setCurrentUser(null);
                            setIsAuthLoading(false);
                            // Don't navigate - let them stay on password change page
                        } else {
                            // If they're on any other route, sign them out and redirect to login
                            authClient.signOut();
                            setCurrentUser(null);
                            setIsAuthLoading(false);
                            navigate('/login');
                        }
                    } else {
                        // If backend verification fails, show error and log out from Firebase
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        setIsAuthLoading(false);
                        navigate('/login'); // Redirect to login
                    }
                } catch (error) {
                    // Handle network or other errors during auth state change processing
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    setIsAuthLoading(false);
                    navigate('/login'); // Redirect to login
                }
            } else {
                // If no Firebase user is logged in, clear currentUser state and go to login page
                setCurrentUser(null);
                setIsAuthLoading(false);
                // Ensure we are on a public route if no user is logged in
                if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/initial-password-change') {
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
    // useEffect(() => {
    //     const handleClickOutside = (event) => {
    //         // If the notification menu is open and the click is outside of it, close it
    //         if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target) && isNotificationMenuOpen) {
    //             setIsNotificationMenuOpen(false);
    //         }
    //     };

    //     // Add event listener when component mounts
    //     document.addEventListener('mousedown', handleClickOutside);
    //     return () => {
    //         // Clean up the event listener when component unmounts
    //         document.removeEventListener('mousedown', handleClickOutside);
    //     };
    // }, [isNotificationMenuOpen]);

    // Real-time notification polling for live bell animation
    useEffect(() => {
        if (!currentUser || !currentUser.firebaseUser) {
            return;
        }

        // Initial fetch
        fetchNotifications(currentUser);

        // Set up polling interval (every 10 seconds)
        const intervalId = setInterval(() => {
            fetchNotifications(currentUser);
        }, 10000);

        // Cleanup interval on unmount or when user changes
        return () => {
            clearInterval(intervalId);
        };
    }, [currentUser, fetchNotifications]);

    // Animate bell when a new unread notification arrives
    const prevUnreadCountRef = useRef(0);
    useEffect(() => {
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadCount > prevUnreadCountRef.current) {
            setHasNewNotifications(true);
            const timeout = setTimeout(() => setHasNewNotifications(false), 1000);
            return () => clearTimeout(timeout);
        }
        prevUnreadCountRef.current = unreadCount;
    }, [notifications]);


    /**
     * Callback function for successful login.
     * Sets the current user and navigates to the appropriate page based on role.
     * @param {object} user - The user object returned from the login process.
     * @returns {void}
     */
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
        fetchNotifications(user); // Fetch notifications on login
        if (user.role === 'support' || user.role === 'admin' || user.role === 'super_admin' || user.role === 'site_admin') {
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
            setIsAuthLoading(false);
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
    const navigateTo = useCallback((path, id = null, options = {}) => {
        // console.log(`App: Navigating to path: ${path}, with ID: ${id}`); // Debugging
        if (id) {
            navigate(`${path}/${id}`, options); // Append ID to path for detail pages
        } else {
            navigate(path, options);
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

    const handleTicketSuccessStateChange = (isSuccess, ticketInfo = null) => {
        if (isSuccess && ticketInfo) {
            setCreatedTicketInfo(ticketInfo);
            setTicketSubmissionStatus('success');
        }
    };

    const handleTicketSubmissionStart = () => {
        setTicketSubmissionStatus('submitting');
    };

    const handleTicketSubmissionError = (error) => {
        setTicketSubmissionStatus('error');
        showFlashMessage(error || 'Failed to create ticket', 'error');
    };

    const handleCloseTicketPopup = () => {
        setTicketSubmissionStatus('idle');
        setCreatedTicketInfo(null);
    };

    const handleViewCreatedTicket = () => {
        if (createdTicketInfo) {
            setTicketSubmissionStatus('idle');
            setCreatedTicketInfo(null);
            navigateTo(`/tickets/${createdTicketInfo.id}`);
        }
    };

    const handleGoToMyTickets = () => {
        setTicketSubmissionStatus('idle');
        setCreatedTicketInfo(null);
        navigateTo('myTickets');
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
        <div className="flex min-h-screen bg-white font-inter"> {/* Main flex container (row) */}
            {/* Global Flash Message */}
            {flashMessage && (
                <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded shadow-lg transition-all duration-300 ${flashType === 'error' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'}`}
                     style={{ minWidth: 280, maxWidth: 480, textAlign: 'center', fontWeight: 500, fontSize: '1rem' }}>
                    {flashMessage}
                </div>
            )}

            {/* Create Ticket Modal - Rendered at root level */}
            {currentUser && location.pathname === '/create-ticket' && (
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
                        onSuccessStateChange={handleTicketSuccessStateChange}
                        onTicketSubmissionStart={handleTicketSubmissionStart}
                        onTicketSubmissionError={handleTicketSubmissionError}
                        onCloseTicketPopup={handleCloseTicketPopup}
                        onViewCreatedTicket={handleViewCreatedTicket}
                        onGoToMyTickets={handleGoToMyTickets}
                    />
                </Modal>
            )}

            {/* Ticket Status Popup - Shows both submission and success states */}
            {(ticketSubmissionStatus === 'submitting' || ticketSubmissionStatus === 'success') && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-60 backdrop-blur-md flex items-center justify-center p-4 z-[99999] fast-fade-in">
                    <div className={`bg-white rounded-lg shadow-lg w-full text-center p-6 fast-zoom-in ${
                        ticketSubmissionStatus === 'submitting' 
                            ? 'max-w-sm border border-blue-200' 
                            : 'max-w-md border border-green-200'
                    }`}>
                        {ticketSubmissionStatus === 'submitting' ? (
                            <>
                                <Loader2 className="text-blue-600 mx-auto mb-4 animate-spin" size={48} />
                                <h2 className="text-xl font-bold text-blue-800 mb-3">Submitting Ticket...</h2>
                                <p className="text-base text-gray-600">Please wait while your ticket is being submitted.</p>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
                                <h2 className="text-xl font-bold text-green-800 mb-3">Ticket Created Successfully!</h2>
                                <p className="mb-6 text-base">Your ticket <span className="font-mono font-semibold text-blue-700">{createdTicketInfo?.display_id}</span> has been submitted successfully!</p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        className="px-6 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 transition w-full sm:w-auto"
                                        onClick={handleViewCreatedTicket}
                                    >
                                        View Ticket
                                    </button>
                                    <button
                                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300 transition w-full sm:w-auto"
                                        onClick={handleGoToMyTickets}
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Top Banner Header - make it fixed and full width */}
            {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (
                <header
                    className="fixed top-0 flex items-center justify-between shadow-sm border-b border-gray-200/60 flex-shrink-0 z-50 transition-all duration-300 ease-in-out"
                    style={{
                        height: '50.4px',
                        minHeight: '50.4px',
                        padding: '0 16px',
                        left: isSidebarExpanded ? 184 : 56,
                        width: `calc(100% - ${(isSidebarExpanded ? 184 : 56)}px)`,
                        backgroundColor: '#e85c34',
                        color: '#FFFFFF'
                    }}
                >
                {/* Left side: Dashboard and Manage buttons with search bar */}
                <div className={`flex items-center gap-3 ${
                    !(['admin', 'site_admin', 'super_admin'].includes(currentUser.role) || ['super_admin', 'admin'].includes(currentUser.role)) 
                    ? 'pl-4' 
                    : ''
                }`}>
                    {/* Dashboard button */}
                    {currentUser && (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) && (
                        <Link to="/dashboard" className={`flex items-center px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:text-white ${location.pathname === '/dashboard' ? 'bg-white/30 text-white' : 'text-white'}`} style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}> 
                            Dashboard
                        </Link>
                    )}
                    {/* Management Dropdown (right of Dashboard) - Now using Material-UI Menu */}
                    {currentUser && (['super_admin', 'admin'].includes(currentUser.role)) && (
                        <div className="relative">
                            <button
                                onClick={handleClick} // Use handleClick to open the MUI Menu
                                className="flex items-center px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:bg-white/20 hover:text-white text-white cursor-pointer"
                                aria-controls={managementOpen ? 'management-menu' : undefined} // ARIA attributes
                                aria-haspopup="true"
                                aria-expanded={managementOpen ? 'true' : undefined}
                                style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}
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
                                        borderRadius: '12px', // Rounded corners to match sidebar
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
                                    </>
                                )}
                            </Menu>
                        </div>
                    )}
                    
                    {/* Search bar - positioned to the right of Dashboard/Manage buttons, or to the left if no menu options */}
                    {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (
                        <form onSubmit={handleSearchSubmit} className="flex items-center">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={handleSearchChange}
                                    placeholder="Search..."
                                    className="pl-9 pr-3 py-1 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-100 text-gray-900 placeholder-gray-500"
                                    style={{ width: 220, minHeight: 28 }}
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </div>
                        </form>
                    )}
                </div>
                
                <div className="flex-1" />
                {/* Display mobile number and email for user and site_admin roles */}
                {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (currentUser.role === 'user' || currentUser.role === 'site_admin') && (
                    <div className="flex items-center gap-4 mr-4">
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 group cursor-pointer">
                                <PhoneIcon sx={{ fontSize: '0.9rem', color: '#FFFFFF' }} />
                                <span className="text-white font-semibold text-xs tracking-wide group-hover:text-white/80 transition-colors duration-200" style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}>{'+91 9391930393'}</span>
                            </div>
                            <div className="w-px h-5 bg-white/30"></div>
                            <div className="flex items-center gap-2 group cursor-pointer">
                                <EmailIcon sx={{ fontSize: '0.9rem', color: '#FFFFFF' }} />
                                <span className="text-white font-semibold text-xs tracking-wide group-hover:text-white/80 transition-colors duration-200" style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}>{'HelloIT@finstackk.com'}</span>
                            </div>
                        </div>
                    </div>
                )}
                {/* Notification bell and profile dropdown on the right side */}
                {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (
                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative inline-block">
                            <button 
                                className="p-2 hover:bg-white/20 transition-all duration-200"
                                onClick={() => setIsNotificationMenuOpen(true)}
                            >
                                <BellRing
                                    width={20}
                                    height={20}
                                    stroke="#FFFFFF"
                                    strokeWidth={1.5}
                                    unreadCount={notifications.filter(n => !n.read).length}
                                    animateBell={hasNewNotifications}
                                />
                            </button>
                            <NotificationModal
                                isOpen={isNotificationMenuOpen}
                                onClose={() => setIsNotificationMenuOpen(false)}
                                notifications={notifications.map(n => ({
                                    ...n,
                                    title: getNotificationTitleAndBody(n).title,
                                    body: getNotificationTitleAndBody(n).body,
                                }))}
                                onClearAll={clearAllNotifications}
                                onMarkRead={markNotificationAsRead}
                                onViewTicket={viewTicket}
                                containerRef={notificationMenuRef}
                                className={isNotificationMenuOpen ? "scale-up-tr-normal" : ""}
                            />
                        </div>
                        {/* Profile Section */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-3 p-2 hover:bg-white/20 transition-all duration-200 rounded-lg"
                            >
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-700 font-bold text-xs border-2 border-white/60 shadow-md hover:bg-gray-50 transition-all duration-200">
                                    {currentUser.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-xs font-medium text-white truncate" style={{ textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}>
                                        {currentUser.email}
                                    </p>
                                    <p className={`text-xs capitalize truncate ${
                                        currentUser.role === 'super_admin' ? 'text-yellow-200 font-bold' :
                                        currentUser.role === 'admin' ? 'text-blue-200 font-semibold' :
                                        currentUser.role === 'site_admin' ? 'text-green-200 font-semibold' :
                                        currentUser.role === 'engineer' ? 'text-purple-200 font-medium' :
                                        currentUser.role === 'support' ? 'text-orange-200 font-medium' :
                                        'text-white/90 font-normal'
                                    }`} style={{ fontSize: '0.65rem', textShadow: '0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000' }}>
                                        {currentUser.role?.replace('_', ' ')}
                                    </p>
                                </div>
                            </button>
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <Link
                                        to="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4 inline mr-2" />
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4 inline mr-2" />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>
            )}

            {/* Left Side Menu (always visible when logged in) */}
            {currentUser && !isAuthLoading && location.pathname !== '/login' && (
                <motion.nav
                    ref={sidebarMenuRef}
                    initial={false}
                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                    variants={sidebarVariants}
                    className="sidebar-glass fixed left-0 text-gray-700 flex flex-col flex-shrink-0 overflow-y-auto h-screen z-50 bg-white/95 backdrop-blur-sm border-r-2 border-gray-400"
                    style={{ top: 0, height: '100vh', overflow: 'hidden' }}
                >
                    {/* Logo at the top of the sidebar */}
                    <div className={`flex ${isSidebarExpanded ? 'justify-center px-3 py-2' : 'justify-center pt-2 pb-1'}`}>
                        <Link to={currentUser ? (['site_admin', 'super_admin', 'engineer', 'support', 'admin'].includes(currentUser.role) ? '/dashboard' : '/my-tickets') : '/login'} className="flex items-center">
                            <img 
                                src={isSidebarExpanded ? KriasolLogo : FabLogo} 
                                alt="Logo" 
                                className={`transition-all duration-300 ease-in-out ${
                                    isSidebarExpanded 
                                        ? 'h-12 w-auto max-w-full' 
                                        : 'h-10 w-10'
                                }`}
                                style={{
                                    objectFit: 'contain',
                                    maxHeight: isSidebarExpanded ? '40px' : '40px'
                                }}
                            />
                        </Link>
                    </div>

                    {/* Navigation Menu */}
                    <div className="flex-1 px-3 py-2 flex flex-col space-y-1">
                        {/* Main Navigation */}
                        <div className="space-y-1 flex-1">
                            {(currentUser.role === 'super_admin') ? (
                                <>
                                    {/* Activity Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                                        >
                                            Activity
                                        </motion.div>
                                    )}
                                    
                                    <Link to="/all-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/all-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <FileText size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">All Tickets</motion.span>
                                    </Link>
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/my-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <CheckCircle2 size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <CheckCircle2 size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">My Tickets</motion.span>
                                    </Link>

                                    {/* Organisation Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6"
                                        >
                                            Organisation
                                        </motion.div>
                                    )}
                                    
                                    <Link to="/clients" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/clients' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="Clients">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Building size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Building size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Clients</motion.span>
                                    </Link>


                                    
                                    {/* Reports Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6"
                                        >
                                            Reports
                                        </motion.div>
                                    )}
                                    
                                    <Link to="/reports" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/reports' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="Reports">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <TrendingUp size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <TrendingUp size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>Reports & Analytics</span>
                                    </Link>
                                    
                                </>
                            ) : currentUser.role === 'admin' ? (
                                <>
                                    <Link to="/all-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/all-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <FileText size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>All Tickets</span>
                                    </Link>
                                    

                                </>
                            ) : currentUser.role === 'site_admin' ? (
                                <>
                                    <Link to="/all-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/all-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <FileText size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">All Tickets</motion.span>
                                    </Link>
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/my-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <UserCheck size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <UserCheck size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">My Tickets</motion.span>
                                    </Link>
                                    
                                    <Link to="/user-management" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/user-management' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="Users">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Users size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Users size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Users</motion.span>
                                    </Link>
                                    
                                    <Link to="/create-ticket" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-green-50 hover:text-green-700 ${location.pathname === '/create-ticket' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="Create Ticket">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Zap size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Zap size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Create Ticket</motion.span>
                                    </Link>
                                    
                                    {/* Reports Group - Only for super_admin and admin */}
                                    {(['super_admin', 'admin'].includes(currentUser.role)) && (
                                        <>
                                            {isSidebarExpanded && (
                                                <motion.div
                                                    variants={textVariants}
                                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                    className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6"
                                                >
                                                    Reports
                                                </motion.div>
                                            )}
                                            
                                            <Link to="/reports" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/reports' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                                { !isSidebarExpanded ? (
                                                    <TooltipBubble title="Reports & Analytics">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <TrendingUp size={23} className="flex-shrink-0" />
                                                        </div>
                                                    </TooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <TrendingUp size={18} className="flex-shrink-0" />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Reports & Analytics</motion.span>
                                            </Link>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Only show Dashboard in sidebar for support and other non-admin roles */}
                                    {(['support', 'admin', 'site_admin'].includes(currentUser.role)) && (
                                        <>
                                            <Link to="/dashboard" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/dashboard' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                                { !isSidebarExpanded ? (
                                                    <TooltipBubble title="Dashboard">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <Home size={23} className="flex-shrink-0" />
                                                        </div>
                                                    </TooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <Home size={18} className="flex-shrink-0" />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Dashboard</motion.span>
                                            </Link>
                                            
                                            <Link to="/all-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/all-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                                { !isSidebarExpanded ? (
                                                    <TooltipBubble title="All Tickets">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <FileText size={23} className="flex-shrink-0" />
                                                        </div>
                                                    </TooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <FileText size={18} className="flex-shrink-0" />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">All Tickets</motion.span>
                                            </Link>
                                        </>
                                    )}
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/my-tickets' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <UserCheck size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <UserCheck size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">My Tickets</motion.span>
                                    </Link>
                                    
                                    <Link to="/create-ticket" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-green-50 hover:text-green-700 ${location.pathname === '/create-ticket' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <TooltipBubble title="Create Ticket">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Zap size={23} className="flex-shrink-0" />
                                                </div>
                                            </TooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Zap size={18} className="flex-shrink-0" />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Create Ticket</motion.span>
                                    </Link>
                                    

                                </>
                            )}
                        </div>

                        {/* Bottom Menu Items */}
                        <div className={`${isSidebarExpanded ? 'pt-4 border-t border-gray-100' : 'absolute bottom-0 left-0 right-0'}`}>
                            <div className="space-y-0.5">
                                    <Link to="/knowledge-base" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/knowledge-base' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                    { !isSidebarExpanded ? (
                                        <TooltipBubble title="Help & Info">
                                            <div className="flex items-center justify-center w-7 h-7">
                                                <HelpCircle size={23} className="flex-shrink-0" />
                                            </div>
                                        </TooltipBubble>
                                    ) : (
                                        <div className="flex items-center justify-center w-5 h-5 mr-3">
                                            <HelpCircle size={18} className="flex-shrink-0" />
                                        </div>
                                    )}
                                    <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Help & Info</motion.span>
                                </Link>
                                
                                    <Link to="/settings" className={`group flex items-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 ${location.pathname === '/settings' ? ' text-orange-700' : 'text-gray-700'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                    { !isSidebarExpanded ? (
                                        <TooltipBubble title="Settings">
                                            <div className="flex items-center justify-center w-7 h-7">
                                                <Settings size={23} className="flex-shrink-0" />
                                            </div>
                                        </TooltipBubble>
                                    ) : (
                                        <div className="flex items-center justify-center w-5 h-5 mr-3">
                                            <Settings size={18} className="flex-shrink-0" />
                                        </div>
                                    )}
                                    <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate">Settings</motion.span>
                                </Link>

                                {/* Expand/Collapse Arrow - Only show when collapsed */}
                                {!isSidebarExpanded && (
                                    <div className="flex w-full justify-center">
                                        <TooltipBubble title="Expand view">
                                            <button
                                                onClick={() => setIsSidebarExpanded(true)}
                                                className="group flex items-center justify-center px-3 py-2  text-sm font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 text-gray-700"
                                            >
                                                <ChevronRight size={23} className="flex-shrink-0" />
                                            </button>
                                        </TooltipBubble>
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* Expand/Collapse Arrow - Only show when expanded, positioned at bottom right */}
                        {isSidebarExpanded && (
                            <button
                                onClick={() => setIsSidebarExpanded(false)}
                                className="absolute bottom-4 right-3 p-2 rounded-full hover:bg-orange-50 transition-all duration-200 z-50 group"
                                title="Collapse sidebar"
                            >
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-600 rotate-180" />
                            </button>
                        )}
                    </div>
                </motion.nav>
            )}

            {/* Right Content Area (Header + Main Content + Footer - flex column) */}
            <motion.div
                className={`flex flex-col flex-1`}
                initial={false}
                animate={currentUser && !isAuthLoading ? (isSidebarExpanded ? "expanded" : "collapsed") : { width: '100%' }}
                variants={mainContentVariants}
                style={currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' ? { 
                    position: 'fixed',
                    top: 48,
                    height: 'calc(100vh - 48px)',
                    overflowY: 'auto',
                    zIndex: 40
                } : { 
                    left: 0, 
                    position: 'relative',
                    marginTop: 0,
                    width: '100%'
                }}
            >
            {/* Main Content Canvas Area */}
            <section className={`flex-1 bg-white flex flex-col min-w-0 w-full`}>
                {isAuthLoading ? (
                    // Show loading spinner while checking authentication
                    <div className="flex items-center justify-center min-h-screen">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="text-gray-600 text-sm">Loading...</p>
                        </div>
                    </div>
                ) : (
                    <Routes> {/* Define your routes here */}
                        {/* Public Routes (Login/Register) */}
                        <Route path="/login" element={<LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />
                        <Route path="/register" element={<RegisterComponent currentUser={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />
                        <Route path="/initial-password-change" element={<InitialPasswordChangeComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />

                        {/* Protected Routes (require currentUser) */}
                        {currentUser ? (
                            <>
                                {/* Default route for logged-in users, redirect based on role */}
                                <Route path="/" element={
                                    ['support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role) ?
                                        <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                        <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />
                                } />

                                <Route path="/dashboard" element={
                                    (['support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/all-tickets" element={
                                    (['support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} isSidebarExpanded={isSidebarExpanded} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/assigned-to-me" element={
                                    (['engineer', 'support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} isSidebarExpanded={isSidebarExpanded} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/my-tickets" element={<MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />} />
                                <Route path="/create-ticket" element={
                                    // Modal is now rendered at root level, so just show a placeholder
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-gray-500">Loading create ticket form...</div>
                                    </div>
                                } />
                                {/* Dynamic route for Ticket Detail */}
                                <Route path="/tickets/:ticketId" element={<TicketDetailComponent navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />} />

                                <Route path="/profile" element={<ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />} />
                                <Route path="/change-password" element={<ChangePasswordComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />} />
                                <Route path="/user-management" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
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
                                <Route path="/client-management" element={['admin', 'site_admin', 'super_admin'].includes(currentUser.role) ? <ClientManagementComponent user={currentUser} /> : <AccessDeniedComponent />} />
                                <Route path="/siteadmin-management" element={['admin', 'site_admin', 'super_admin'].includes(currentUser.role) ? <SiteAdminManagementComponent /> : <AccessDeniedComponent />} />
                                <Route path="/engineer-management" element={(['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ? <EngineerManagementComponent user={currentUser} showFlashMessage={showFlashMessage} /> : <AccessDeniedComponent />} />
                                
                                <Route path="/reports" element={
                                    (['admin', 'super_admin'].includes(currentUser.role)) ?
                                        <ReportsComponent user={currentUser} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                
                                <Route path="/clients" element={currentUser.role === 'super_admin' ? <ClientManagementComponent user={currentUser} /> : <AccessDeniedComponent />} />

                                {/* Catch-all for logged-in users if no other route matches */}
                                {/* This ensures that if they go to an invalid path, they are redirected to their default view */}
                                <Route path="*" element={
                                    ['support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role) ?
                                        <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                        <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />
                                } />
                            </>
                        ) : (
                            // If not logged in, redirect any unmatched route to login
                            <Route path="*" element={<LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />} />
                        )}
                    </Routes>
                )}
            </section>

            {/* Footer */}
            {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (
                <footer className="bg-white text-gray-500 text-center p-2 w-full text-xs flex-shrink-0">
                    <p>&copy; {new Date().getFullYear()} Kriasol. All rights reserved.</p>
                </footer>
            )}
        </motion.div>
    </div>
);
}

export default App;
