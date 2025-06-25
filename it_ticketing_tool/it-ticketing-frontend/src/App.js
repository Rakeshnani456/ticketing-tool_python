// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogOut, ChevronDown, Search, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react'; // Lucide icons used in App.js directly

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
                        const userProfile = { firebaseUser, role: data.user.role, email: firebaseUser.email };
                        setCurrentUser(userProfile);
                        fetchTicketCounts(userProfile); // Fetch ticket counts for logged-in user
                        // Navigate based on user role
                        if (data.user.role === 'support') {
                            setCurrentPage('dashboard'); // Support users go to dashboard
                        } else {
                            setCurrentPage('myTickets'); // Regular users go to their tickets
                        }
                    } else {
                        // If backend verification fails, show error and log out from Firebase
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        setCurrentPage('login'); // Redirect to login
                    }
                } catch (error) {
                    // Handle network or other errors during auth state change processing
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    setCurrentPage('login'); // Redirect to login
                }
            } else {
                // If no Firebase user is logged in, clear currentUser state and go to login page
                setCurrentUser(null);
                setCurrentPage('login');
                setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Reset counts
            }
        });
        return () => unsubscribe(); // Cleanup the auth state listener on component unmount
    }, [fetchTicketCounts]); // `fetchTicketCounts` is a dependency here

    /**
     * Callback function for successful login.
     * Sets the current user and navigates to the appropriate page based on role.
     * @param {object} user - The user object returned from the login process.
     * @returns {void}
     */
    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        fetchTicketCounts(user);
        if (user.role === 'support') {
            setCurrentPage('dashboard');
        } else {
            setCurrentPage('myTickets');
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
            navigateTo('login'); // Navigate to login page
        } catch (error) {
            console.error('Logout error:', error);
            showFlashMessage('Failed to log out.', 'error');
        } finally {
            setIsProfileMenuOpen(false); // Close profile menu
            setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Reset counts
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
        }
        setIsProfileMenuOpen(false); // Close profile menu on navigation
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
     * Triggers a refresh of ticket lists and counts.
     * @returns {void}
     */
    const handleTicketCreated = () => {
        setTicketListRefreshKey(prev => prev + 1); // Refresh ticket lists
        if (currentUser) {
            fetchTicketCounts(currentUser); // Refresh ticket counts
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

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 font-inter overflow-hidden">
            {/* Top Banner Header */}
            <header className="bg-white text-white p-3 flex items-center justify-between shadow-md flex-shrink-0 fixed top-0 w-full z-50">
                {/* Kriasol Logo */}
                <div className="flex-shrink-0">
                    <img src={KriasolLogo} alt="Kriasol Logo" className="h-8" /> {/* Adjust height as needed */}
                </div>

                {/* Search Bar (visible only when logged in and not on login/register pages) */}
                {currentUser && currentPage !== 'login' && currentPage !== 'register' && (
                    <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 max-w-md mx-auto">
                        <FormInput
                            id="search"
                            type="text"
                            value={searchKeyword}
                            onChange={handleSearchChange}
                            placeholder="Search by Ticket ID (e.g., TICKET-00001)"
                            className="flex-1"
                            icon={Search}
                            label="" // Hide label as placeholder is used
                        />
                        <PrimaryButton type="submit" Icon={Search} className="w-auto px-3 py-1.5">
                            Search
                        </PrimaryButton>
                    </form>
                )}

                {/* User Profile Menu (visible when logged in) */}
                {currentUser && (
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
                )}
            </header>

            {/* Main Content Area: Left Menu + Main Canvas */}
            <main className="flex flex-1 overflow-hidden pt-16"> {/* Add pt-16 to offset fixed header */}
                {/* Left Side Menu (visible when logged in) */}
                {currentUser && (
                    <nav className="w-56 bg-gray-800 text-white flex flex-col p-3 shadow-lg flex-shrink-0 overflow-y-auto fixed h-full top-0 left-0 z-40 pt-16"> {/* Add pt-16 */}
                        <ul className="space-y-2 mt-3">
                            {/* Support User Specific Menu Items */}
                            {currentUser.role === 'support' && (
                                <>
                                    <li>
                                        <button onClick={() => navigateTo('dashboard')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-dashboard mr-2"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg> Dashboard
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('allTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'allTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list mr-2"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg> All Tickets ({ticketCounts.active_tickets})
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('assignedToMe')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'assignedToMe' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag mr-2"><path d="M12.59 2.59c-.39-.39-1.02-.39-1.41 0L2.59 10c-.39.39-.39 1.02 0 1.41l9 9c.39.39 1.02.39 1.41 0l7.41-7.41c.39-.39.39-1.02 0-1.41L12.59 2.59Z" /><path d="M7 7h.01" /></svg> Assigned to Me ({ticketCounts.assigned_to_me})
                                        </button>
                                    </li>
                                </>
                            )}
                            {/* Common Menu Item for All Users */}
                            <li>
                                <button onClick={() => navigateTo('myTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'myTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-check mr-2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></svg> My Tickets (Home)
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}

                {/* Main Content Canvas Area */}
                <section className={`flex-1 bg-gray-100 flex flex-col min-w-0 ${currentUser ? 'ml-56' : ''}`}> {/* Adjust left margin if menu is present */}
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
                                    // Pass all relevant props to AllTicketsComponent
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
                                                <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">Create New Ticket</h2>
                                                <CreateTicketComponent
                                                    user={currentUser}
                                                    onClose={() => navigateTo('myTickets')} // Close action navigates to myTickets
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
