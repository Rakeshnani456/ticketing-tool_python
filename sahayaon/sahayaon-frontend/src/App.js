// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import Routes, Route, Link, useNavigate, useLocation from react-router-dom (BrowserRouter is now in index.js)
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import AdvancedSearchComponent from './components/common/AdvancedSearchComponent';
import TooltipBubble, { LeftMenuTooltipBubble } from './components/common/TooltipBubble';
import FlexibleHeader from './components/common/FlexibleHeader';
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
    Key,
    Plus,

    ChevronUp,
    Home,
    FileText,
    HelpCircle,
    TrendingUp,
    Briefcase,
    UserCheck,
    Building,
    Zap,
    Loader2,
    UserCog,
    Wrench,
    Handshake,
    Settings,
} from 'lucide-react';
import writingIcon from './assets/icons/writing.png';
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
// Notification UI removed
import plusImg from './assets/icons/plus.png';
import mailImg from './assets/icons/mail.png';
import phoneImg from './assets/icons/phone.png';
import CustomNotification from './components/common/CustomNotification';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { createPortal } from 'react-dom';
import ReactDOM from 'react-dom';


// Import Firebase auth client and dbClient
import { authClient, dbClient } from './config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Firebase authentication methods
import { collection, query, where, doc, getDoc } from 'firebase/firestore'; // Firestore imports and 'where'

// Import centralized data management
import { DataManager } from './utils/firebaseOptimizer';
import websocketClient from './utils/websocketClient';
import { useTicketCounts, useNotifications } from './hooks/useDataManager';
import { useResponsiveSearchWidth, useScreenWidth } from './hooks/useResponsiveSearchWidth';

// Import API Base URL from constants
import { API_BASE_URL } from './config/constants';

// Import cookie management
import cookieManager from './utils/cookieManager';
import CookieConsentBanner from './components/common/CookieConsentBanner';

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


// Import feature components
import LoginComponent from './components/auth/LoginComponent';
import RegisterComponent from './components/auth/RegisterComponent';
import CreateTicketComponent from './components/tickets/CreateTicketComponent';
import CreateTicketPage from './components/tickets/CreateTicketPage';
import MyTicketsComponent from './components/tickets/MyTicketsComponent';
import AllTicketsComponent from './components/tickets/AllTicketsComponent';
import MyQueueComponent from './components/tickets/MyQueueComponent';
import TicketDetailComponent from './components/tickets/TicketDetailComponent'; // TicketDetailComponent will use useParams
import DashboardComponent from './components/DashboardComponent';
import ProfileComponent from './components/ProfileComponent';
import AccessDeniedComponent from './components/AccessDeniedComponent';
import ChangePasswordComponent from './components/ChangePasswordComponent';
import InitialPasswordChangeComponent from './components/auth/InitialPasswordChangeComponent';
import UserManagementComponent from './components/admin/UserManagementComponent';
import CreateUserPage from './components/admin/CreateUserPage';
import ClientImportPage from './components/admin/ClientImportPage';
import UserDetailView from './components/admin/UserDetailView';
import Modal from './components/common/Modal';
import AdminManagementComponent from './components/admin/AdminManagementComponent';
import ClientManagementComponent from './components/admin/ClientManagementComponent';
import CreateClientPage from './components/admin/CreateClientPage';
import EditClientPage from './components/admin/EditClientPage';
import ClientDetailView from './components/admin/ClientDetailView';
import KnowledgeBaseComponent from './components/KnowledgeBaseComponent';
import EngineerManagementComponent from './components/admin/EngineerManagementComponent';
import CreateEngineerPage from './components/admin/CreateEngineerPage';
import EngineerDetailView from './components/admin/EngineerDetailView';
import ReportsComponent from './components/ReportsComponent';
import PersonalNotesComponent from './components/PersonalNotesComponent';
import NoteDetailComponent from './components/NoteDetailComponent';
import SettingsComponent from './components/SettingsComponent';
import PrivacyPolicyPage from './components/legal/PrivacyPolicyPage';
import TermsOfServicePage from './components/legal/TermsOfServicePage';





// NEW: Placeholder components for admin sidebar
const SiteAdminManagementComponent = () => (
    <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Siteadmin Management (Placeholder)</h2>
        <p>Manage site admins here.</p>
    </div>
);





// Specialized TooltipBubble for create button - positions underneath
  function CreateButtonTooltipBubble({ title, children, id }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef(null);

  useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 200; // Approximate tooltip width
      const tooltipHeight = 40; // Approximate tooltip height
      
      // Calculate optimal position
      let topPosition = rect.bottom + 8;
      let leftPosition = rect.left + (rect.width / 4) - (tooltipWidth / 5); // Center the tooltip under the element
      
      // Check if tooltip would go off the bottom of viewport
      if (topPosition + tooltipHeight > viewportHeight - 10) {
        // Position above the element instead
        topPosition = rect.top - tooltipHeight - 8;
        // Keep the same centered positioning for above placement
        leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      }
      
      // Ensure tooltip doesn't go off-screen to the right
      if (leftPosition + tooltipWidth > viewportWidth - 10) {
        leftPosition = viewportWidth - tooltipWidth - 10;
      }
      
      // Ensure tooltip doesn't go off-screen to the left
      if (leftPosition < 10) {
        leftPosition = 10;
      }
      
      setCoords({
        top: topPosition,
        left: leftPosition,
      });
    }
  }, [show]);

  return (
        <div
          style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          ref={iconRef}
        >
      {children}
      {show && createPortal(
        <div
          className="fade-in"
          data-tooltip-id={id || 'create-tooltip'}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            background: '#000000',
            color: '#ffffff',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            pointerEvents: 'none',
            // No transform needed - positioned directly under text
          }}
        >
          {/* Arrow pointing up */}
          <div
            style={{
              position: 'absolute',
              top: '0px',

              transform: 'translateX(500%)', // Center the arrow
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #000000',
            }}
          />
          {title}
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * Main application content component that uses notification context
 */
const AppContent = () => {
    const { showSuccess, showError, showWarning, showInfo } = useNotification();
    // State for the current authenticated user (Firebase user + custom role)
    const [currentUser, setCurrentUser] = useState(null);
    // Key to force refresh of ticket lists (e.g., after creating a new ticket)
    const [ticketListRefreshKey, setTicketListRefreshKey] = useState(0);
    // State for the global search keyword
    const [searchKeyword, setSearchKeyword] = useState('');
    // State to control the visibility of the user profile dropdown menu
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    // State to control the visibility of the support dropdown menu
    const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
    // Use centralized data management for ticket counts
    const { data: ticketCountsData, loading: ticketCountsLoading, error: ticketCountsError } = useTicketCounts(currentUser?.uid, currentUser?.role, currentUser?.client_name);
    
    // Update ticket counts state when data changes
    const [ticketCounts, setTicketCounts] = useState({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0, my_tickets: 0 });
    
    useEffect(() => {
        if (ticketCountsData) {
            console.log('[App] Received ticket counts data:', ticketCountsData);
            // Ensure my_tickets field exists (for compatibility with old cached data)
            setTicketCounts({
                ...ticketCountsData,
                my_tickets: ticketCountsData.my_tickets ?? ticketCountsData.assigned_to_me ?? 0,
                assigned_to_me: ticketCountsData.assigned_to_me ?? 0
            });
        }
    }, [ticketCountsData]);

    // NEW STATES FOR NOTIFICATIONS
    const [notifications, setNotifications] = useState([]);
    const [hasNewNotifications, setHasNewNotifications] = useState(false);
    const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
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
    
    // State for ticket display ID in breadcrumb
    const [ticketDisplayId, setTicketDisplayId] = useState(null);
    const [ticketDisplayIdLoading, setTicketDisplayIdLoading] = useState(false);
    
    // Function to fetch ticket display ID
    const fetchTicketDisplayId = useCallback(async (ticketId) => {
        if (!ticketId || !currentUser?.firebaseUser) return;
        
        setTicketDisplayIdLoading(true);
        try {
            const ticketDocRef = doc(dbClient, 'tickets', ticketId);
            const ticketDoc = await getDoc(ticketDocRef);
            
            if (ticketDoc.exists()) {
                const ticketData = ticketDoc.data();
                setTicketDisplayId(ticketData.display_id || ticketId);
            } else {
                setTicketDisplayId(ticketId); // Fallback to document ID
            }
        } catch (error) {
            console.warn('Failed to fetch ticket display ID:', error);
            setTicketDisplayId(ticketId); // Fallback to document ID
        } finally {
            setTicketDisplayIdLoading(false);
        }
    }, [currentUser?.firebaseUser]);
    
    // Effect to fetch ticket display ID when on ticket detail page
    useEffect(() => {
        if (location.pathname.startsWith('/tickets/')) {
            const ticketId = location.pathname.split('/')[2];
            if (ticketId) {
                fetchTicketDisplayId(ticketId);
            }
        } else {
            setTicketDisplayId(null); // Clear when not on ticket page
            setTicketDisplayIdLoading(false);
        }
    }, [location.pathname, fetchTicketDisplayId]);

    // Responsive search width hooks
    const screenWidth = useScreenWidth();
    const searchWidths = useResponsiveSearchWidth(currentUser?.role, screenWidth);

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
    // Use compact width (170px) that fits content without excess space
    const sidebarVariants = {
        expanded: { width: 170, transition: { type: "spring", stiffness: 300, damping: 30, duration: 0.35, ease: "easeInOut" } },
        collapsed: { width: 56, transition: { type: "spring", stiffness: 300, damping: 30, duration: 0.35, ease: "easeInOut" } }
    };

    // Define variants for Framer Motion animation for the sidebar text
    const textVariants = {
        expanded: {
            opacity: 1,
            width: "auto",
            x: 0,
            scale: 1, // Explicitly prevent scaling
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
            scale: 1, // Explicitly prevent scaling
            transition: {
                duration: 0.15,
                ease: "easeIn"
            }
        }
    };

    // Define variants for Framer Motion animation for the main content's width
    // Adjust to match compact sidebar width (170px expanded, 56px collapsed)
    const mainContentVariants = {
        expanded: { left: 170, width: 'calc(100% - 170px)', transition: { type: "spring", stiffness: 300, damping: 30 } },
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

    // fetchNotifications function removed - now using centralized data management via useNotifications hook

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

    // Initialize DataManager and WebSocket on component mount
    useEffect(() => {
        // Initialize DataManager with WebSocket client
        DataManager.initialize(websocketClient);
        
        // Connect WebSocket when user is authenticated
        if (currentUser && currentUser.firebaseUser) {
            const connectWebSocket = async () => {
                try {
                    const idToken = await currentUser.firebaseUser.getIdToken();
                    websocketClient.connect(idToken, currentUser);
                } catch (error) {
                    console.error('Failed to get ID token for WebSocket:', error);
                }
            };
            connectWebSocket();
        }
        
        return () => {
            // Cleanup on unmount
            websocketClient.disconnect();
        };
    }, [currentUser]);

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
                        
                        // Store user session in cookies
                        cookieManager.setUserSession(userProfile);
                        
                        setCurrentUser(userProfile);

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
            }
        });
        return () => {
            unsubscribeAuth(); // Cleanup the auth state listener on component unmount
        };
    }, [navigate, location.pathname]); // Removed fetchNotifications from dependency array

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

    // Use centralized data management for notifications
    const { data: notificationsData, loading: notificationsLoading, error: notificationsError } = useNotifications(currentUser?.uid);
    
    // Update notifications state when data changes
    useEffect(() => {
        if (notificationsData) {
            setNotifications(notificationsData);
        }
    }, [notificationsData]);

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
        // Notifications are now handled by centralized data management
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
            cookieManager.clearUserSession(); // Clear user session from cookies
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
        }
    };

    // Alias for FlexibleHeader component
    const handleSignOut = handleLogout;

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
        // Notifications are now handled by centralized data management
        setIsProfileMenuOpen(false); // Close profile menu on navigation
        setIsNotificationMenuOpen(false); // Close notification menu on navigation
    }, [navigate, currentUser]);


    /**
     * Displays a temporary flash message to the user using the new notification system.
     * @param {string} message - The message content.
     * @param {'info'|'success'|'error'|'warning'} [type='info'] - The type of message for styling.
     * @param {number} [duration=2000] - Duration in milliseconds before the message hides.
     * @returns {void}
     */
    const showFlashMessage = useCallback((message, type = 'info', duration = 2000) => {
        // Use the new notification system
        switch (type) {
            case 'success':
                showSuccess(message, { duration });
                break;
            case 'error':
                showError(message, { duration });
                break;
            case 'warning':
                showWarning(message, { duration });
                break;
            case 'info':
            default:
                showInfo(message, { duration });
                break;
        }
    }, [showSuccess, showError, showWarning, showInfo]);

    /**
     * Callback function for when a new ticket is successfully created.
     * Triggers a refresh of ticket lists and counts, and new notification fetch.
     * @returns {void}
     */
    const handleTicketCreated = () => {
        setTicketListRefreshKey(prev => prev + 1); // Refresh ticket lists
        // Notifications are now handled by centralized data management
        // Invalidate AllTicketsComponent cache
        if (window.refreshAllTicketsCache) {
            window.refreshAllTicketsCache();
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
     * @param {string} searchTerm - The search term from the advanced search component.
     * @returns {void}
     */
    const handleSearchSubmit = (searchTerm) => {
        setSearchKeyword(searchTerm);
        setTicketListRefreshKey(prev => prev + 1); // Force re-render of ticket lists with new search keyword
        // Invalidate AllTicketsComponent cache for fresh search results
        if (window.refreshAllTicketsCache) {
            window.refreshAllTicketsCache();
        }
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
                // Notifications are now handled by centralized data management
                // Do NOT navigate to ticket here
            } else {
                console.error('Failed to mark notification as read:', await response.json());
                showFlashMessage('Failed to mark notification as read.', 'error');
            }
        } catch (error) {
            console.error('Network error marking notification as read:', error);
            showFlashMessage('Network error marking notification as read.', 'error');
        }
    }, [currentUser, showFlashMessage]);

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
    const managementMenuRef = useRef(null);
    const supportMenuRef = useRef(null);

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

    // Add useEffect for closing Support dropdown on outside click
    useEffect(() => {
        if (!isSupportMenuOpen) return;
        function handleClickOutside(event) {
            if (supportMenuRef.current && !supportMenuRef.current.contains(event.target)) {
                setIsSupportMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSupportMenuOpen]);

    // Add useEffect for closing Management dropdown on outside click
    useEffect(() => {
        if (!managementOpen) return;
        function handleClickOutside(event) {
            if (managementMenuRef.current && !managementMenuRef.current.contains(event.target)) {
                handleClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [managementOpen]);

    // Add custom CSS for the blended dropdown animation
    useEffect(() => {
        const fadeInDownStyle = `
            @keyframes fadeInDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
            
            .fade-in {
                animation: fadeIn 0.3s ease-in-out;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = fadeInDownStyle;
        document.head.appendChild(style);
        
        return () => {
            document.head.removeChild(style);
        };
    }, []);

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

    // Force prevent scaling on sidebar menu items - only prevent scale, allow other transforms
    useEffect(() => {
        const preventMenuScaling = (e) => {
            if (!e) return;
            const target = e.target;
            const menuItem = target.closest('.menu-item');
            if (!menuItem) return;

            // Get all children of the menu item
            const children = menuItem.querySelectorAll('*');
            children.forEach(element => {
                const inlineStyle = element.style.transform;
                const computedStyle = window.getComputedStyle(element);
                const computedTransform = computedStyle.transform;

                // Only modify if there's a scale transform that's not scale(1)
                if (inlineStyle && inlineStyle.includes('scale') && !inlineStyle.includes('scale(1)')) {
                    // Preserve other transforms, only fix scale
                    const newTransform = inlineStyle.replace(/scale\([^)]+\)/g, 'scale(1)');
                    element.style.setProperty('transform', newTransform, 'important');
                } else if (computedTransform && computedTransform.includes('scale')) {
                    // Check computed style for scale
                    const matrixMatch = computedTransform.match(/matrix\(([^)]+)\)/);
                    if (matrixMatch) {
                        const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
                        // matrix(a, b, c, d, tx, ty) - a and d are scaleX and scaleY
                        if (Math.abs(values[0] - 1) > 0.01 || Math.abs(values[3] - 1) > 0.01) {
                            // Scale is not 1, force it to 1 while preserving translation
                            const newTransform = `matrix(1, 0, 0, 1, ${values[4] || 0}, ${values[5] || 0})`;
                            element.style.setProperty('transform', newTransform, 'important');
                        }
                    }
                }
                // Always ensure transform-origin is center
                element.style.setProperty('transform-origin', 'center center', 'important');
            });
        };

        // Run on hover over menu items
        const handleMouseEnter = (e) => {
            requestAnimationFrame(() => preventMenuScaling(e));
        };

        const sidebar = document.querySelector('.sidebar-glass');
        if (sidebar) {
            // Use event delegation on the sidebar
            sidebar.addEventListener('mouseenter', handleMouseEnter, true);
            sidebar.addEventListener('mouseover', handleMouseEnter, true);
        }

        return () => {
            if (sidebar) {
                sidebar.removeEventListener('mouseenter', handleMouseEnter, true);
                sidebar.removeEventListener('mouseover', handleMouseEnter, true);
            }
        };
    }, [location.pathname]); // Re-run when route changes

    

    return (
        <div className="flex min-h-screen bg-white font-inter"> {/* Main flex container (row) */}


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
                                <p className="mb-6 text-base">
                                    Ticket <span className="font-mono font-semibold text-blue-700">{createdTicketInfo?.display_id}</span> has been created successfully.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        className="px-6 py-2 bg-green-600 text-white rounded-md text-base font-semibold hover:bg-green-700 transition w-full sm:w-auto"
                                        onClick={handleViewCreatedTicket}
                                    >
                                        View Ticket
                                    </button>
                                    <button
                                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md text-base font-semibold hover:bg-gray-300 transition w-full sm:w-auto"
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

            {/* Flexible Header */}
            {currentUser && !isAuthLoading && location.pathname !== '/login' && location.pathname !== '/register' && (
                <FlexibleHeader
                    currentUser={currentUser}
                    onSearchSubmit={handleSearchSubmit}
                    navigateTo={navigateTo}
                    searchWidths={searchWidths}
                    ticketDisplayId={ticketDisplayId}
                    ticketDisplayIdLoading={ticketDisplayIdLoading}
                    onSignOut={handleSignOut}
                />
            )}


            {/* Left Side Menu (always visible when logged in) */}
            {currentUser && !isAuthLoading && location.pathname !== '/login' && (
                <motion.nav
                    ref={sidebarMenuRef}
                    initial={false}
                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                    variants={sidebarVariants}
                    className="sidebar-glass fixed left-0 flex flex-col flex-shrink-0 overflow-y-auto h-screen z-50 border-r border-gray-700"
                    style={{ 
                        backgroundColor: '#182c25',
                        color: '#d1d5db',
                        top: '48px', 
                        height: 'calc(100vh - 48px)'
                    }}
                >

                    {/* Navigation Menu */}
                    <div className="flex-1 px-1 py-1 flex flex-col space-y-1.5">
                        {/* Main Navigation */}
                        <div className="space-y-2 flex-1">
                            {(currentUser.role === 'super_admin') ? (
                                <>
                                    {/* Activity Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                             className="sidebar-section-header px-3 py-2.5 text-xs font-semibold text-gray-400 tracking-wider"
                                        >
                                            Activity
                                        </motion.div>
                                    )}

                                    {/* Dashboard Button */}
                                    <Link to="/dashboard" className={`menu-item group flex items-center px-3 py-2.5 text-sm font-semibold hover:bg-gray-700 hover:text-white ${location.pathname === '/dashboard' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Dashboard">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Home size={23} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Home size={19} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }}>Dashboard</motion.span>
                                    </Link>
                                    
                                    <Link to="/all-tickets" className={`menu-item group flex items-center px-3 py-2.5 text-sm font-semibold hover:bg-gray-700 hover:text-white ${location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <FileText size={23} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.total_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.total_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={19} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }}>
                                            All Tickets {isSidebarExpanded && ticketCounts.total_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.total_tickets})</span>)}
                                        </motion.span>
                                    </Link>
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/my-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <CheckCircle2 size={23} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.my_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.my_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <CheckCircle2 size={19} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }}>
                                            My Tickets {isSidebarExpanded && ticketCounts.my_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.my_tickets})</span>)}
                                        </motion.span>
                                    </Link>

                                    {/* My Queue - for support roles */}
                                    <Link to="/assigned-to-me" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/assigned-to-me' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Queue">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '23px', height: '23px' }} />
                                                    {ticketCounts.assigned_to_me > 0 && (
                                                        <span className="sidebar-count-badge text-xs font-medium">
                                                            {ticketCounts.assigned_to_me}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '19px', height: '19px' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db' }}>
                                            My Queue {isSidebarExpanded && ticketCounts.assigned_to_me > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.assigned_to_me})</span>)}
                                        </motion.span>
                                    </Link>

                                    {/* Organisation Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="sidebar-section-header px-3 py-2.5 text-xs font-semibold text-gray-500 tracking-wider mt-6"
                                        >
                                            Organisation
                                        </motion.div>
                                    )}

                                    {/* Clients */}
                                    <Link to="/clients" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/clients' || location.pathname.startsWith('/clients/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Clients">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Handshake size={23} className="flex-shrink-0" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Handshake size={19} className="flex-shrink-0" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }}>Clients</motion.span>
                                    </Link>
                                    
                                    {/* Users */}
                                    <Link to="/user-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/user-management' || location.pathname.startsWith('/user-management/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Users">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Users size={23} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Users size={19} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }}>Users</motion.span>
                                    </Link>

                                    {/* Management Group */}
                                    {isSidebarExpanded && (
                                        <motion.div
                                            variants={textVariants}
                                            animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                            className="sidebar-section-header px-3 py-2.5 text-xs font-semibold text-gray-500 tracking-wider mt-6"
                                        >
                                            Management
                                        </motion.div>
                                    )}

                                    {/* Admins Management */}
                                    <Link to="/admin-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/admin-management' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Admins">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <UserCog size={23} className="flex-shrink-0" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <UserCog size={19} className="flex-shrink-0" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }}>Admins</motion.span>
                                    </Link>

                                    {/* Engineers Management */}
                                    <Link to="/engineer-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/engineer-management' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Engineers">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Wrench size={23} className="flex-shrink-0" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Wrench size={19} className="flex-shrink-0" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }}>Engineers</motion.span>
                                    </Link>

                                    {/* Personal Notes */}
                                    <Link to="/personal-notes" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/personal-notes' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Notes">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <img src={writingIcon} alt="My Notes" className="w-6 h-6 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <img src={writingIcon} alt="My Notes" className="w-5 h-5 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/personal-notes' ? '#ffffff' : '#d1d5db' }}>My Notes</motion.span>
                                    </Link>

                                    {/* Settings - HIDDEN FOR NOW */}
                                    {/* <Link to="/settings" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/settings' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Settings">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Settings size={23} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Settings size={19} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }}>Settings</motion.span>
                                    </Link> */}
                                    
                                </>
                            ) : currentUser.role === 'admin' ? (
                                <>
                                    <Link to="/all-tickets" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <FileText size={23} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.total_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.total_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={19} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`} style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }}>
                                            All Tickets {isSidebarExpanded && ticketCounts.total_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.total_tickets})</span>)}
                                        </span>
                                    </Link>

                                    {/* My Queue */}
                                    <Link to="/assigned-to-me" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/assigned-to-me' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Queue">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '23px', height: '23px' }} />
                                                    {ticketCounts.assigned_to_me > 0 && (
                                                        <span className="sidebar-count-badge text-xs font-medium">
                                                            {ticketCounts.assigned_to_me}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '19px', height: '19px' }} />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`} style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db' }}>
                                            My Queue {isSidebarExpanded && ticketCounts.assigned_to_me > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.assigned_to_me})</span>)}
                                        </span>
                                    </Link>
                                    
                                    {/* Personal Notes */}
                                    <Link to="/personal-notes" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/personal-notes' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Notes">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <img src={writingIcon} alt="My Notes" className="w-6 h-6 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <img src={writingIcon} alt="My Notes" className="w-5 h-5 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap overflow-hidden ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`} style={{ color: location.pathname === '/personal-notes' ? '#ffffff' : '#d1d5db' }}>My Notes</span>
                                    </Link>

                                    {/* Settings - HIDDEN FOR NOW */}
                                    {/* <Link to="/settings" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/settings' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Settings">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Settings size={23} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Settings size={19} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <span className={`whitespace-nowrap overflow-hidden ${isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`} style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }}>Settings</span>
                                    </Link> */}

                                </>
                            ) : currentUser.role === 'site_admin' ? (
                                <>
                                    {/* Dashboard Button for Site Admin */}
                                    <Link to="/dashboard" className={`menu-item group flex items-center px-4 py-3 text-base font-semibold hover:bg-gray-700 hover:text-white ${location.pathname === '/dashboard' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Dashboard">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Home size={23} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Home size={19} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }}>Dashboard</motion.span>
                                    </Link>

                                    <Link to="/all-tickets" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="All Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <FileText size={23} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.total_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.total_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <FileText size={19} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }}>
                                            All Tickets {isSidebarExpanded && ticketCounts.total_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.total_tickets})</span>)}
                                        </motion.span>
                                    </Link>
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/my-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <UserCheck size={23} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.my_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.my_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <UserCheck size={19} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }}>
                                            My Tickets {isSidebarExpanded && ticketCounts.my_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.my_tickets})</span>)}
                                        </motion.span>
                                    </Link>
                                    
                                    <Link
                                        to="/create-ticket"
                                        className={`group flex items-center px-3 py-2.5 text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/create-ticket' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
                                    > 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Create Ticket">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Zap size={23} className="flex-shrink-0" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Zap size={19} className="flex-shrink-0" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }}>Create Ticket</motion.span>
                                    </Link>
                                    
                                    {/* Users - Site Admin can see their company users */}
                                    <Link to="/user-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/user-management' || location.pathname.startsWith('/user-management/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Users">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Users size={23} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Users size={19} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }}>Users</motion.span>
                                    </Link>
                                    
                                    {/* Personal Notes */}
                                    <Link to="/personal-notes" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/personal-notes' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Notes">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <img src={writingIcon} alt="My Notes" className="w-6 h-6 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <img src={writingIcon} alt="My Notes" className="w-5 h-5 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/personal-notes' ? '#ffffff' : '#d1d5db' }}>My Notes</motion.span>
                                    </Link>

                                    {/* Settings - HIDDEN FOR NOW */}
                                    {/* <Link to="/settings" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/settings' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Settings">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Settings size={23} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Settings size={19} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }}>Settings</motion.span>
                                    </Link> */}
                                    
                                    {/* Reports Group - Only for super_admin and admin */}
                                    {(['super_admin', 'admin'].includes(currentUser.role)) && (
                                        <>
                                            {isSidebarExpanded && (
                                                <motion.div
                                                    variants={textVariants}
                                                    animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                    className="sidebar-section-header px-3 py-2.5 text-xs font-semibold text-gray-500 tracking-wider mt-6"
                                                >
                                                    Reports
                                                </motion.div>
                                            )}
                                            
                                            <Link to="/reports" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/reports' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Analytics">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <TrendingUp size={23} className="flex-shrink-0" style={{ color: location.pathname === '/reports' ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <TrendingUp size={19} className="flex-shrink-0" style={{ color: location.pathname === '/reports' ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/reports' ? '#ffffff' : '#d1d5db' }}>Analytics</motion.span>
                                            </Link>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Only show Dashboard in sidebar for admin role */}
                                    {(currentUser.role === 'admin') && (
                                        <>
                                            <Link to="/dashboard" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/dashboard' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Dashboard">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <Home size={23} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <Home size={19} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }}>Dashboard</motion.span>
                                            </Link>

                                            {/* Management Group for admin and site_admin roles */}
                                            {isSidebarExpanded && (
                                                <>
                                                    <div className="mx-3 my-4 border-t border-gray-700"></div>
                                                    <motion.div
                                                        variants={textVariants}
                                                        animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                        className="sidebar-section-header px-3 py-2 text-xs font-bold text-gray-400 tracking-widest mb-1 uppercase"
                                                    >
                                                        Management
                                                    </motion.div>
                                                </>
                                            )}

                                            {/* Admins Management */}
                                            <Link to="/admin-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/admin-management' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Admins">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <UserCog size={23} className="flex-shrink-0" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <UserCog size={19} className="flex-shrink-0" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/admin-management' ? '#ffffff' : '#d1d5db' }}>Admins</motion.span>
                                            </Link>

                                            {/* Engineers Management */}
                                            <Link to="/engineer-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/engineer-management' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Engineers">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <Wrench size={23} className="flex-shrink-0" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <Wrench size={19} className="flex-shrink-0" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/engineer-management' ? '#ffffff' : '#d1d5db' }}>Engineers</motion.span>
                                            </Link>
                                        </>
                                    )}

                                    {/* Organisation Group for admin and site_admin roles */}
                                    {(['admin', 'site_admin'].includes(currentUser.role)) && (
                                        <>
                                            {isSidebarExpanded && (
                                                <>
                                                    <div className="mx-3 my-4 border-t border-gray-700"></div>
                                                    <motion.div
                                                        variants={textVariants}
                                                        animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                        className="sidebar-section-header px-3 py-2 text-xs font-bold text-gray-400 tracking-widest mb-1 uppercase"
                                                    >
                                                        Organisation
                                                    </motion.div>
                                                </>
                                            )}

                                            {/* Clients for admin and site_admin roles */}
                                            <Link to="/clients" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/clients' || location.pathname.startsWith('/clients/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Clients">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <Handshake size={23} className="flex-shrink-0" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <Handshake size={19} className="flex-shrink-0" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: (location.pathname === '/clients' || location.pathname.startsWith('/clients/')) ? '#ffffff' : '#d1d5db' }}>Clients</motion.span>
                                            </Link>
                                            
                                            {/* Users for admin and site_admin roles */}
                                            <Link to="/user-management" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/user-management' || location.pathname.startsWith('/user-management/') ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                                { !isSidebarExpanded ? (
                                                    <LeftMenuTooltipBubble title="Users">
                                                        <div className="flex items-center justify-center w-7 h-7">
                                                            <Users size={23} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                                        </div>
                                                    </LeftMenuTooltipBubble>
                                                ) : (
                                                    <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                        <Users size={19} className="flex-shrink-0" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                )}
                                                <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: (location.pathname === '/user-management' || location.pathname.startsWith('/user-management/')) ? '#ffffff' : '#d1d5db' }}>Users</motion.span>
                                            </Link>
                                        </>
                                    )}
                                    
                                    {/* ACTIVITY Section - only show for admin, super_admin, and site_admin roles (exclude support and engineer roles) */}
                                    {isSidebarExpanded && ['admin', 'super_admin', 'site_admin'].includes(currentUser.role) && (
                                        <>
                                            <div className="mx-3 my-4 border-t border-gray-700"></div>
                                            <motion.div
                                                variants={textVariants}
                                                animate={isSidebarExpanded ? "expanded" : "collapsed"}
                                                className="sidebar-section-header px-3 py-2 text-xs font-bold text-gray-400 tracking-widest mb-1 uppercase"
                                            >
                                                Activity
                                            </motion.div>
                                        </>
                                    )}

                                    {/* Dashboard - hidden for 'user' role */}
                                    {currentUser.role !== 'user' && (
                                        <Link to="/dashboard" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/dashboard' ? 'active' : 'text-black'} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                            { !isSidebarExpanded ? (
                                                <LeftMenuTooltipBubble title="Dashboard">
                                                    <div className="flex items-center justify-center w-7 h-7">
                                                        <Home size={23} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                    </div>
                                                </LeftMenuTooltipBubble>
                                            ) : (
                                                <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                    <Home size={19} className="flex-shrink-0" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            )}
                                            <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/dashboard' ? '#ffffff' : '#d1d5db' }}>Dashboard</motion.span>
                                        </Link>
                                    )}

                                    {/* All Tickets - visible only for admin/support/super_admin/site_admin roles */}
                                    {(['admin', 'support', 'super_admin', 'site_admin'].includes(currentUser.role)) && (
                                        <Link to="/all-tickets" className={`group flex items-center px-3 py-2.5 text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/all-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}>
                                            { !isSidebarExpanded ? (
                                                <LeftMenuTooltipBubble title="All Tickets">
                                                    <div className="flex items-center justify-center w-7 h-7 relative">
                                                        <FileText size={23} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                                        {ticketCounts.total_tickets > 0 && (
                                                            <span className="sidebar-count-badge text-xs font-medium">
                                                                {ticketCounts.total_tickets}
                                                            </span>
                                                        )}
                                                    </div>
                                                </LeftMenuTooltipBubble>
                                            ) : (
                                                <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                    <FileText size={19} className="flex-shrink-0" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            )}
                                            <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/all-tickets' || location.pathname.startsWith('/tickets/') ? '#ffffff' : '#d1d5db' }}>
                                                All Tickets {isSidebarExpanded && ticketCounts.total_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.total_tickets})</span>)}
                                            </motion.span>
                                        </Link>
                                    )}
                                    
                                    {/* My Queue - visible for support/admin/engineer roles (not site_admin) */}
                                    {(['admin', 'support', 'super_admin', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'].includes(currentUser.role)) && (
                                        <Link to="/assigned-to-me" className={`group flex items-center px-3 py-2.5 text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/assigned-to-me' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                            { !isSidebarExpanded ? (
                                                <LeftMenuTooltipBubble title="My Queue">
                                                    <div className="flex items-center justify-center w-7 h-7 relative">
                                                        <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '23px', height: '23px' }} />
                                                        {ticketCounts.assigned_to_me > 0 && (
                                                            <span className="sidebar-count-badge text-xs font-medium">
                                                                {ticketCounts.assigned_to_me}
                                                            </span>
                                                        )}
                                                    </div>
                                                </LeftMenuTooltipBubble>
                                            ) : (
                                                <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                    <AssignedToMeIcon className="flex-shrink-0" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db', width: '19px', height: '19px' }} />
                                                </div>
                                            )}
                                            <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/assigned-to-me' ? '#ffffff' : '#d1d5db' }}>
                                                My Queue {isSidebarExpanded && ticketCounts.assigned_to_me > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.assigned_to_me})</span>)}
                                            </motion.span>
                                        </Link>
                                    )}
                                    
                                    <Link to="/my-tickets" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/my-tickets' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="My Tickets">
                                                <div className="flex items-center justify-center w-7 h-7 relative">
                                                    <UserCheck size={23} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                                    {ticketCounts.my_tickets > 0 && (
                                                        <span className="sidebar-count-badge sidebar-count-badge-orange text-xs font-medium">
                                                            {ticketCounts.my_tickets}
                                                        </span>
                                                    )}
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <UserCheck size={19} className="flex-shrink-0" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap" style={{ color: location.pathname === '/my-tickets' ? '#ffffff' : '#d1d5db' }}>
                                            My Tickets {isSidebarExpanded && ticketCounts.my_tickets > 0 && (<span style={{ color: '#f97316' }}>({ticketCounts.my_tickets})</span>)}
                                        </motion.span>
                                    </Link>
                                    
                                    {/* Create Ticket - visible for all users */}
                                    <Link
                                        to="/create-ticket"
                                        className={`group flex items-center px-3 py-2.5 text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/create-ticket' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}
                                    > 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Create Ticket">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Zap size={23} className="flex-shrink-0" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Zap size={19} className="flex-shrink-0" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/create-ticket' ? '#ffffff' : '#d1d5db' }}>Create Ticket</motion.span>
                                    </Link>
                                    
                                    {/* Personal Notes - hidden for 'user' role */}
                                    {currentUser.role !== 'user' && (
                                        <Link to="/personal-notes" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/personal-notes' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                            { !isSidebarExpanded ? (
                                                <LeftMenuTooltipBubble title="My Notes">
                                                    <div className="flex items-center justify-center w-7 h-7">
                                                        <img src={writingIcon} alt="My Notes" className="w-6 h-6 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                                    </div>
                                                </LeftMenuTooltipBubble>
                                            ) : (
                                                <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                    <img src={writingIcon} alt="My Notes" className="w-5 h-5 flex-shrink-0" style={{ filter: location.pathname === '/personal-notes' ? 'brightness(0) invert(1)' : 'brightness(0) saturate(100%) invert(84%) sepia(8%) saturate(239%) hue-rotate(169deg) brightness(95%) contrast(88%)' }} />
                                                </div>
                                            )}
                                            <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/personal-notes' ? '#ffffff' : '#d1d5db' }}>My Notes</motion.span>
                                        </Link>
                                    )}

                                    {/* Settings - HIDDEN FOR NOW */}
                                    {/* <Link to="/settings" className={`group flex items-center px-3 py-2.5  text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white ${location.pathname === '/settings' ? 'active' : ''} ${isSidebarExpanded ? 'justify-start' : 'justify-center'}`}> 
                                        { !isSidebarExpanded ? (
                                            <LeftMenuTooltipBubble title="Settings">
                                                <div className="flex items-center justify-center w-7 h-7">
                                                    <Settings size={23} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                                </div>
                                            </LeftMenuTooltipBubble>
                                        ) : (
                                            <div className="flex items-center justify-center w-5 h-5 mr-3">
                                                <Settings size={19} className="flex-shrink-0" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }} />
                                            </div>
                                        )}
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: location.pathname === '/settings' ? '#ffffff' : '#d1d5db' }}>Settings</motion.span>
                                    </Link> */}

                                </>
                            )}
                        </div>


                        {/* Bottom Menu Items - Collapse/Expand Button */}
                        <div className="mt-auto pt-4">
                            <div className="space-y-1">
                                {/* Collapse Button - Only show when expanded */}
                                {isSidebarExpanded && (
                                    <button
                                        onClick={() => setIsSidebarExpanded(false)}
                                        className={`menu-item group flex items-center px-3 py-2.5 text-sm font-semibold hover:bg-gray-700 hover:text-white ${isSidebarExpanded ? 'justify-start' : 'justify-center'} w-full`}
                                        title="Collapse sidebar"
                                        style={{ textAlign: 'left' }}
                                    >
                                        <div className="flex items-center justify-center w-5 h-5 mr-3">
                                            <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon max-md:hidden flex-shrink-0" style={{ color: '#d1d5db' }}>
                                                <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                                            </svg>
                                        </div>
                                        <motion.span variants={textVariants} animate={isSidebarExpanded ? "expanded" : "collapsed"} className="whitespace-nowrap overflow-hidden truncate" style={{ color: '#d1d5db' }}>Collapse</motion.span>
                                    </button>
                                )}

                                {/* Expand Button - Only show when collapsed */}
                                {!isSidebarExpanded && (
                                    <LeftMenuTooltipBubble title="Expand sidebar">
                                        <button
                                            onClick={() => setIsSidebarExpanded(true)}
                                            className="group flex items-center justify-center px-3 py-2.5 text-sm font-semibold menu-item hover:bg-gray-700 hover:text-white w-full focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                        >
                                            <div className="flex items-center justify-center w-7 h-7">
                                                <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" data-rtl-flip="" className="icon max-md:hidden" style={{ color: '#d1d5db' }}>
                                                    <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                                                </svg>
                                            </div>
                                        </button>
                                    </LeftMenuTooltipBubble>
                                )}
                            </div>
                        </div>



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
                            <p className="text-gray-600 text-base">Loading...</p>
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
                                {/* Default route for logged-in users - redirect users to /my-tickets, others to dashboard */}
                                <Route path="/" element={
                                    currentUser.role === 'user' ? (
                                        <Navigate to="/my-tickets" replace />
                                    ) : (
                                        <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                                    )
                                } />

                                <Route path="/dashboard" element={
                                    currentUser.role === 'user' ? (
                                        <Navigate to="/my-tickets" replace />
                                    ) : (
                                        <DashboardComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                                    )
                                } />
                                <Route path="/all-tickets" element={
                                    (['support', 'admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} showFilters={true} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/assigned-to-me" element={
                                    (['support', 'admin', 'super_admin', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'].includes(currentUser.role)) ?
                                        <MyQueueComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/my-tickets" element={<MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} isSidebarExpanded={isSidebarExpanded} />} />
                                <Route path="/create-ticket" element={
                                    <CreateTicketComponent 
                                        user={currentUser} 
                                        showFlashMessage={showFlashMessage} 
                                        onTicketCreated={handleTicketCreated}
                                        navigateTo={navigateTo}
                                        onSuccessStateChange={handleTicketSuccessStateChange}
                                        onTicketSubmissionStart={handleTicketSubmissionStart}
                                        onTicketSubmissionError={handleTicketSubmissionError}
                                        onClose={() => navigateTo('/my-tickets')}
                                    />
                                } />
                                {/* Dynamic route for Ticket Detail */}
                                <Route path="/tickets/:ticketId" element={<TicketDetailComponent navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />} />

                                <Route path="/profile" element={<ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />} />
                                <Route path="/change-password" element={<ChangePasswordComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />} />
                                <Route path="/settings" element={<SettingsComponent navigateTo={navigateTo} />} />
                                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                                <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                                <Route path="/user-management" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <UserManagementComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/user-management/create-user" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <CreateUserPage user={currentUser} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/user-management/import" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <ClientImportPage user={currentUser} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/user-management/user-detail/:userId" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <UserDetailView user={currentUser} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/knowledge-base" element={<KnowledgeBaseComponent currentUser={currentUser} showFlashMessage={showFlashMessage} />} />
                                <Route path="/admin-management" element={
                                    currentUser.role === 'super_admin' ?
                                        <AdminManagementComponent currentUser={currentUser} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                {/* Admin-only routes */}
                                <Route path="/client-management" element={<Navigate to="/clients" replace />} />
                                <Route path="/siteadmin-management" element={['admin', 'site_admin', 'super_admin'].includes(currentUser.role) ? <SiteAdminManagementComponent /> : <AccessDeniedComponent />} />
                                <Route path="/engineer-management" element={(['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ? <EngineerManagementComponent user={currentUser} showFlashMessage={showFlashMessage} /> : <AccessDeniedComponent />} />
                                <Route path="/engineer-management/create-engineer" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <CreateEngineerPage user={currentUser} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/engineer-management/engineer-detail/:engineerId" element={
                                    (['admin', 'site_admin', 'super_admin'].includes(currentUser.role)) ?
                                        <EngineerDetailView user={currentUser} /> :
                                        <AccessDeniedComponent />
                                } />
                                
                                
                                <Route path="/reports" element={
                                    (['admin', 'super_admin'].includes(currentUser.role)) ?
                                        <ReportsComponent user={currentUser} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/personal-notes" element={
                                    (['user', 'support', 'admin', 'super_admin', 'site_admin'].includes(currentUser.role)) ?
                                        <PersonalNotesComponent user={currentUser} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                <Route path="/notes/:noteId" element={
                                    (['user', 'support', 'admin', 'super_admin', 'site_admin'].includes(currentUser.role)) ?
                                        <NoteDetailComponent user={currentUser} showFlashMessage={showFlashMessage} /> :
                                        <AccessDeniedComponent />
                                } />
                                
                                <Route path="/clients" element={currentUser.role === 'super_admin' ? <ClientManagementComponent user={currentUser} /> : <AccessDeniedComponent />} />
                                <Route path="/clients/create-client" element={currentUser.role === 'super_admin' ? <CreateClientPage user={currentUser} /> : <AccessDeniedComponent />} />
                                <Route path="/clients/edit-client/:clientId" element={currentUser.role === 'super_admin' ? <EditClientPage user={currentUser} /> : <AccessDeniedComponent />} />
                                <Route path="/clients/client-detail/:clientId" element={currentUser.role === 'super_admin' ? <ClientDetailView user={currentUser} /> : <AccessDeniedComponent />} />

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
                <footer className="bg-white border-t border-gray-200 text-gray-500 p-4 w-full text-xs flex-shrink-0">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
                            {/* Copyright */}
                            <p className="text-center md:text-left">
                                &copy; 2025 Kriasol Technologies LLP. All rights reserved.
                            </p>
                            
                            {/* Legal Links */}
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                                <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">
                                    Privacy Policy
                                </Link>
                                <span className="hidden md:inline text-gray-300">|</span>
                                <Link to="/terms-of-service" className="hover:text-blue-600 transition-colors">
                                    Terms of Service
                                </Link>
                            </div>
                        </div>
                    </div>
                </footer>
            )}

        </motion.div>
    </div>
);
}

/**
 * Main application component with notification provider
 */
const App = () => {
    return (
        <NotificationProvider>
            <AppContent />
            <CookieConsentBanner />
        </NotificationProvider>
    );
};

export default App;
