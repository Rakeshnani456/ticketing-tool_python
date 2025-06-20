// App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine } from 'lucide-react';

// Import Firebase (make sure you've installed it: npm install firebase)
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'; // Import getAuth and signInWithEmailAndPassword

// --- Firebase Client-Side Configuration ---
// IMPORTANT: Replace with your actual Firebase project configuration!
// You can find this in your Firebase Console -> Project settings -> General -> Your apps -> Firebase SDK snippet (choose 'Config')
const firebaseConfig = {
  apiKey: "AIzaSyDZVwd_WHUw8RzUfkVklT7_9U6Mc-FNL-o",
  authDomain: "it-ticketing-tool-dd679.firebaseapp.com",
  projectId: "it-ticketing-tool-dd679",
  storageBucket: "it-ticketing-tool-dd679.firebasestorage.app",
  messagingSenderId: "919553361675",
  appId: "1:919553361675:web:55bfeb860ebef1b886840e",
  measurementId: "G-H6M4JBS3TL"// <--- REPLACE THIS
};

// Initialize Firebase App for client-side use
const app = initializeApp(firebaseConfig);
// Get the Auth service instance from the initialized app for client-side operations
const authClient = getAuth(app);


// Main App component for the IT Ticketing Tool
function App() {
  // State to manage the current view (simulating routing without a router library)
  // Possible values: 'login', 'register', 'myTickets', 'allTickets', 'createTicket', 'ticketDetail'
  const [currentView, setCurrentView] = useState('login');
  // Stores logged-in user data { id, email, role }
  const [currentUser, setCurrentUser] = useState(null);
  // For viewing a specific ticket
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [flashMessage, setFlashMessage] = useState({ message: '', type: '' }); // For showing messages
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); // State to control profile dropdown visibility
  const profileMenuRef = useRef(null); // Ref for the profile dropdown container

  // --- API Base URL ---
  const API_BASE_URL = 'http://127.0.0.1:5000';

  // --- Effects and Handlers ---

  // Check for stored user on app load
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setCurrentView('myTickets'); // Navigate to myTickets if logged in
        console.log("Found stored user:", user);
      } else {
        console.log("No stored user found, defaulting to login.");
        setCurrentView('login');
      }
    } catch (error) {
      console.error("Failed to parse stored user from localStorage:", error);
      localStorage.removeItem('currentUser'); // Clear invalid data
      setCurrentUser(null);
      setCurrentView('login');
    }
  }, []); // Run only once on component mount

  // Effect to close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuRef]); // Only re-run if profileMenuRef changes (it won't)


  // Function to show a flash message
  const showFlashMessage = useCallback((message, type = 'info') => { // Memoize showFlashMessage
    setFlashMessage({ message, type });
    setTimeout(() => {
      setFlashMessage({ message: '', type: '' }); // Clear message after 5 seconds
    }, 5000);
  }, []); // showFlashMessage has no dependencies that change during component lifecycle

  const handleLoginSuccess = useCallback((userData) => { // Memoize handleLoginSuccess
    setCurrentUser(userData);
    localStorage.setItem('currentUser', JSON.stringify(userData)); // Store user in localStorage
    setCurrentView('myTickets');
    showFlashMessage('Login successful!', 'success');
  }, [showFlashMessage]); // Depends on showFlashMessage

  const handleLogout = useCallback(() => { // Memoize handleLogout
    setCurrentUser(null);
    localStorage.removeItem('currentUser'); // Remove user from localStorage
    setIsProfileMenuOpen(false); // Close menu on logout
    showFlashMessage('You have been logged out.', 'info');
    console.log("User logged out.");
    // Optional: Sign out from Firebase client-side as well
    authClient.signOut().then(() => {
        console.log("Firebase client-side logout successful.");
    }).catch((error) => {
        console.error("Error signing out from Firebase client:", error);
    });
    setCurrentView('login'); // Redirect to login after logout
  }, [showFlashMessage]); // Depends on showFlashMessage

  const navigateTo = useCallback((view, ticketId = null) => { // Memoize navigateTo
    setCurrentView(view);
    setSelectedTicketId(ticketId);
    setFlashMessage({ message: '', type: '' }); // Clear messages on navigation
    setIsProfileMenuOpen(false); // Close profile menu on navigation
  }, []); // navigateTo has no dependencies that change during component lifecycle

  // --- View Components ---

  // Login Component
  const LoginComponent = ({ onLoginSuccess, navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false); // New loading state for login button

    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage(''); // Clear previous messages
      setLoading(true); // Set loading to true
      try {
        // 1. Authenticate with Firebase Client SDK
        // This is where the password verification happens securely against Firebase Auth
        const userCredential = await signInWithEmailAndPassword(authClient, email, password);
        const user = userCredential.user; // The Firebase User object
        const idToken = await user.getIdToken(); // Get the Firebase ID token (JWT)
        console.log("Firebase client login successful. ID Token obtained.");

        // 2. Send the ID Token to your Flask backend for verification and role retrieval
        // The Flask backend will use Firebase Admin SDK to verify this token
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Send the ID token in the Authorization header for backend verification
            'Authorization': `Bearer ${idToken}`
          },
          // We can send email or not, the backend will verify using the ID token's UID
          body: JSON.stringify({ email: user.email }),
        });

        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          // If backend verification is successful, proceed with login success
          onLoginSuccess(data.user); // Pass user data (including role from backend) to App component
        } else {
          // If backend verification fails (e.g., role not found, or other backend issue)
          setMessage(data.error || 'Login failed after token verification.');
          showFlashMessage(data.error || 'Login failed after token verification.', 'error');
          // Optional: If backend fails, consider signing out from client-side Firebase Auth as well
          authClient.signOut();
        }
      } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed.';
        // Handle specific Firebase Auth errors returned by signInWithEmailAndPassword
        if (error.code) {
          switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
              errorMessage = 'Invalid email or password.';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Invalid email format.';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'Too many failed login attempts. Please try again later.';
              break;
            case 'auth/network-request-failed':
              errorMessage = 'Network error. Please check your internet connection.';
              break;
            default:
              errorMessage = error.message; // Fallback to Firebase's default error message
          }
        } else {
          // General network or unexpected errors
          errorMessage = 'An unexpected network error occurred or server is unreachable.';
        }
        setMessage(errorMessage);
        showFlashMessage(errorMessage, 'error');
      } finally {
        setLoading(false); // Always reset loading state
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4 rounded-lg">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
          <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Login</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">Email:</label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105"
              disabled={loading} // Disable button while loading
            >
              {loading ? 'Logging In...' : 'Log In'}
            </button>
            {message && <p className="text-center mt-4 text-sm text-red-500">{message}</p>}
          </form>
          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{' '}
            <button onClick={() => navigateTo('register')} className="text-indigo-600 hover:underline font-semibold transition duration-200">
              Register here
            </button>
          </p>
        </div>
      </div>
    );
  };

  // Register Component (unchanged for now, but will leverage Firebase Admin SDK for user creation)
  const RegisterComponent = ({ navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user'); // Default role
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage('Registering...');
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        });
        const data = await response.json();
        if (response.ok) {
          setMessage(data.message);
          showFlashMessage(data.message || 'Registration successful! Please log in.', 'success');
          navigateTo('login');
        } else {
          setMessage(data.error || 'Registration failed.');
          showFlashMessage(data.error || 'Registration failed.', 'error');
        }
      } catch (error) {
        console.error('Registration error:', error);
        setMessage('Network error or server unreachable.');
        showFlashMessage('Network error or server unreachable.', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4 rounded-lg">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
          <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Register</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-gray-700 text-sm font-semibold mb-2">Email:</label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700 text-sm font-semibold mb-2">Password:</label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-gray-700 text-sm font-semibold mb-2">Role:</label>
              <select
                id="role"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="support">Support Associate</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
            {message && <p className="text-center mt-4 text-sm text-green-500">{message}</p>}
          </form>
          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <button onClick={() => navigateTo('login')} className="text-indigo-600 hover:underline font-semibold transition duration-200">
              Log In
            </button>
          </p>
        </div>
      </div>
    );
  };


  // MyTickets Component
  const MyTicketsComponent = ({ user, navigateTo, showFlashMessage }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMyTickets = useCallback(async () => { // Wrapped with useCallback
      setLoading(true);
      setError(null);
      try {
        // Pass userId as a query parameter
        const response = await fetch(`${API_BASE_URL}/tickets/my?userId=${user.id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTickets(data);
      } catch (err) {
        setError('Failed to fetch tickets. Please try again.');
        showFlashMessage('Failed to fetch your tickets.', 'error');
        console.error('Error fetching my tickets:', err);
      } finally {
        setLoading(false);
      }
    }, [user, showFlashMessage]); // Dependencies: user, showFlashMessage

    useEffect(() => {
      if (user && user.id) {
        fetchMyTickets();
      }
    }, [user, fetchMyTickets]); // Added fetchMyTickets to dependencies

    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl">Loading your tickets...</div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl">Error: {error}</div>;

    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-indigo-700">My Tickets</h2>
          <button
            onClick={() => navigateTo('createTicket')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition duration-300 flex items-center space-x-2"
          >
            <PlusCircle size={20} />
            <span>Create New Ticket</span>
          </button>
        </div>
        {tickets.length === 0 ? (
          <p className="text-gray-600 text-lg text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">You haven't created any tickets yet. Click "Create New Ticket" to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tickets.map(ticket => (
              <div key={ticket.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition duration-300 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-indigo-800 mb-2">{ticket.title}</h3>
                  {/* Using ticket.id directly as Flask API now returns 'id' for Firestore doc ID */}
                  <p className="text-gray-700 mb-1 flex items-center"><LayoutDashboard className="mr-2" size={16} /> <span className="font-semibold">ID:</span> {ticket.id.substring(0,8).toUpperCase()}</p>
                  <p className="text-gray-700 mb-1"><span className="font-semibold">Reporter:</span> {ticket.reporter}</p>
                  <p className="text-gray-700 mb-1 flex items-center">
                    <span className="font-semibold mr-2">Status:</span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </p>
                  <p className="text-gray-700 mb-4 flex items-center">
                    <span className="font-semibold mr-2">Priority:</span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                        ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </p>
                </div>
                {/* Using ticket.id directly */}
                <button
                  onClick={() => navigateTo('ticketDetail', ticket.id)}
                  className="mt-4 bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <List size={18} />
                  <span>View Details</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // AllTickets Component (for support users)
  const AllTicketsComponent = ({ navigateTo, showFlashMessage }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAssignment, setFilterAssignment] = useState('');
    const [filterDue, setFilterDue] = useState('');

    const fetchAllTickets = useCallback(async () => { // Wrapped with useCallback
      setLoading(true);
      setError(null);
      let url = `${API_BASE_URL}/tickets/all`;
      const params = new URLSearchParams();

      if (filterStatus) params.append('status', filterStatus);
      if (filterAssignment) params.append('assignment', filterAssignment);
      if (filterDue) params.append('due', filterDue);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTickets(data);
      } catch (err) {
        setError('Failed to fetch all tickets. Please try again.');
        showFlashMessage('Failed to fetch all tickets.', 'error');
        console.error('Error fetching all tickets:', err);
      } finally {
        setLoading(false);
      }
    }, [filterStatus, filterAssignment, filterDue, showFlashMessage]); // Dependencies for fetchAllTickets

    useEffect(() => {
      fetchAllTickets();
    }, [fetchAllTickets]); // Now depends on memoized fetchAllTickets

    // Dummy counts for now - In a real app, these would come from a separate API endpoint or be calculated client-side from all fetched tickets
    const counts = {
      total_tickets: tickets.length,
      open_tickets: tickets.filter(t => t.status === 'Open').length,
      in_progress_tickets: tickets.filter(t => t.status === 'In Progress').length,
      closed_tickets: tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length,
      unassigned: tickets.filter(t => !t.assigned_to_email).length,
      // For assigned_to_me and assigned_to_others, we'd need current user email, which would come from currentUser context
      // For overdue, would need proper date comparison
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl">Loading all tickets...</div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl">Error: {error}</div>;

    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6">All Tickets</h2>

        {/* Filter Section */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
          <button
            onClick={() => { setFilterStatus(''); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              !filterStatus && !filterAssignment && !filterDue ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All Tickets ({counts.total_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              filterStatus === 'Open' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Open ({counts.open_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              filterStatus === 'In Progress' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            In Progress ({counts.in_progress_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              filterStatus === 'Closed' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Closed ({counts.closed_tickets})
          </button>
          <button
            onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); setFilterDue(''); }}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
              filterAssignment === 'unassigned' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Unassigned ({counts.unassigned})
          </button>
          {/* Add more filter buttons as needed based on your Flask API capabilities */}
        </div>

        {tickets.length === 0 ? (
          <p className="text-gray-600 text-lg text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">No tickets found matching the criteria.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tracking ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Reporter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150"> {/* Using ticket.id here */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}> {/* Using ticket.id here */}
                      {ticket.id.substring(0, 10).toUpperCase()} {/* Using ticket.id here */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(ticket.updated_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.reporter}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:underline cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}> {/* Using ticket.id here */}
                      {ticket.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                          ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                          ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                      }`}>
                        {ticket.priority}
                      </span>
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

  // CreateTicket Component
  const CreateTicketComponent = ({ user, navigateTo, showFlashMessage }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // Pre-fill reporter with user's email if available, otherwise allow input
    const [reporter, setReporter] = useState(user?.email || '');
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Low');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            reporter,
            status,
            priority,
            creator_uid: user.id, // Send user ID
            creator_email: user.email // Send user email
          }),
        });
        const data = await response.json();
        if (response.ok) {
          showFlashMessage(data.message || 'Ticket created successfully!', 'success');
          navigateTo('myTickets');
        } else {
          showFlashMessage(data.error || 'Failed to create ticket.', 'error');
        }
      } catch (error) {
        console.error('Create ticket error:', error);
        showFlashMessage('Network error or server unreachable.', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4 rounded-lg">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
          <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Create New Ticket</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-gray-700 text-sm font-semibold mb-2">Title:</label>
              <input type="text" id="title" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="description" className="block text-gray-700 text-sm font-semibold mb-2">Description:</label>
              <textarea id="description" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" rows="5" value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
            </div>
            <div>
              <label htmlFor="reporter" className="block text-gray-700 text-sm font-semibold mb-2">Reporter Name:</label>
              <input type="text" id="reporter" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={reporter} onChange={(e) => setReporter(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="status" className="block text-gray-700 text-sm font-semibold mb-2">Status:</label>
              <select id="status" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-gray-700 text-sm font-semibold mb-2">Priority:</label>
              <select id="priority" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105" disabled={loading}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // TicketDetail Component
  const TicketDetailComponent = ({ ticketId, navigateTo, user, showFlashMessage }) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [updateStatus, setUpdateStatus] = useState('');
    const [updatePriority, setUpdatePriority] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);


    const fetchTicket = useCallback(async () => { // Wrapped with useCallback
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Ensure comments exist and are an array
        if (!data.comments) data.comments = [];
        setTicket(data);
        setUpdateStatus(data.status);
        setUpdatePriority(data.priority);
      } catch (err) {
        setError('Failed to fetch ticket details. Please try again.');
        showFlashMessage('Failed to fetch ticket details.', 'error');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    }, [ticketId, showFlashMessage]); // Dependencies for fetchTicket

    useEffect(() => {
      if (ticketId) {
        fetchTicket();
      }
    }, [ticketId, fetchTicket]); // Now depends on memoized fetchTicket

    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: updateStatus, priority: updatePriority }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Ticket updated successfully!', 'success');
                // Re-fetch ticket to get latest details including updated_at
                fetchTicket();
            } else {
                showFlashMessage(data.error || 'Failed to update ticket.', 'error');
            }
        } catch (error) {
            console.error('Update ticket error:', error);
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        setCommentLoading(true);
        if (!newComment.trim()) {
            showFlashMessage('Comment cannot be empty.', 'error');
            setCommentLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_text: newComment, commenter_name: user.email }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Comment added successfully!', 'success');
                setNewComment('');
                // Re-fetch ticket to get latest comments and updated_at
                fetchTicket();
            } else {
                showFlashMessage(data.error || 'Failed to add comment.', 'error');
            }
        } catch (error) {
            console.error('Add comment error:', error);
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setCommentLoading(false);
        }
    };

    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl">Loading ticket details...</div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl">Error: {error}</div>;
    if (!ticket) return <div className="text-center text-gray-600 mt-8 text-xl">Ticket not found.</div>;

    // Check if the current user is the creator or a support associate
    const canUpdateOrComment = user.role === 'support' || user.id === ticket.creator_uid;


    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4 rounded-lg">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
          <h2 className="text-3xl font-bold text-indigo-700 mb-6 text-center">
            {/* Ensure ticket.id is available before calling substring */}
            Ticket #{ticket.id ? ticket.id.substring(0,10).toUpperCase() : 'N/A'}: {ticket.title}
          </h2>

          <div className="space-y-4 mb-8 text-lg">
            <p className="text-gray-700 flex items-center"><User className="mr-2" size={18} /><span className="font-semibold">Reporter:</span> {ticket.reporter}</p>
            <p className="text-gray-700 flex items-center">
              <List className="mr-2" size={18} /><span className="font-semibold">Status:</span>
              <span className={`ml-2 px-3 py-1 text-base font-semibold rounded-full ${
                  ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
              }`}>
                {ticket.status}
              </span>
            </p>
            <p className="text-gray-700 flex items-center">
              <LayoutDashboard className="mr-2" size={18} /><span className="font-semibold">Priority:</span>
              <span className={`ml-2 px-3 py-1 text-base font-semibold rounded-full ${
                  ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                  ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                  ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                  'bg-purple-100 text-purple-800'
              }`}>
                {ticket.priority}
              </span>
            </p>
            <p className="text-gray-700 flex items-center"><FilePenLine className="mr-2" size={18} /><span className="font-semibold">Created:</span> {new Date(ticket.created_at).toLocaleString()}</p>
            <p className="text-gray-700 flex items-center"><FilePenLine className="mr-2" size={18} /><span className="font-semibold">Last Updated:</span> {new Date(ticket.updated_at).toLocaleString()}</p>
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 shadow-inner">
              <h4 className="text-xl font-semibold text-blue-800 mb-2">Description:</h4>
              <p className="text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {canUpdateOrComment && ( // Render update section only if user has permissions
            <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-2xl font-semibold text-indigo-700 mb-4 text-center">Update Ticket</h3>
              <form onSubmit={handleUpdateTicket} className="space-y-4">
                <div>
                  <label htmlFor="updateStatus" className="block text-gray-700 text-sm font-semibold mb-2">Update Status:</label>
                  <select id="updateStatus" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Closed">Closed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="updatePriority" className="block text-gray-700 text-sm font-semibold mb-2">Update Priority:</label>
                  <select id="updatePriority" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" value={updatePriority} onChange={(e) => setUpdatePriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105" disabled={updateLoading}>
                  {updateLoading ? 'Updating...' : 'Update Ticket'}
                </button>
              </form>
            </div>
          )}

          <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-2xl font-semibold text-indigo-700 mb-4 text-center">Comments</h3>
            {ticket.comments && ticket.comments.length > 0 ? (
              <ul className="space-y-4">
                {ticket.comments.map((comment, index) => (
                  <li key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-gray-800 text-base mb-2 whitespace-pre-wrap flex items-center"><MessageSquareText className="mr-2" size={16} />{comment.text}</p>
                    <p className="text-gray-600 text-xs text-right">By <span className="font-semibold">{comment.commenter}</span> on {new Date(comment.timestamp).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 text-lg text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">No comments yet.</p>
            )}

            {canUpdateOrComment && ( // Render comment form only if user has permissions
              <form onSubmit={handleAddComment} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="newComment" className="block text-gray-700 text-sm font-semibold mb-2">Add New Comment:</label>
                  <textarea id="newComment" className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-200" rows="4" value={newComment} onChange={(e) => setNewComment(e.target.value)} required></textarea>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105" disabled={commentLoading}>
                  {commentLoading ? 'Adding...' : 'Add Comment'}
                </button>
              </form>
            )}
          </div>

          <button
            onClick={() => navigateTo(user.role === 'support' ? 'allTickets' : 'myTickets')}
            className="w-full bg-gray-500 text-white py-3 px-4 rounded-md font-semibold text-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  };

  // --- Main App Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 antialiased flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center flex-wrap">
        <h1 className="text-3xl font-bold">IT Help Desk</h1>
        <nav>
          <ul className="flex space-x-6 items-center">
            {currentUser ? (
              <>
                <li>
                  <button onClick={() => navigateTo('myTickets')} className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200">
                    <List size={18} />
                    <span>My Tickets</span>
                  </button>
                </li>
                {currentUser.role === 'support' && (
                  <li>
                    <button onClick={() => navigateTo('allTickets')} className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200">
                      <LayoutDashboard size={18} />
                      <span>All Tickets</span>
                    </button>
                  </li>
                )}
                <li>
                  {/* The profile menu container */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <User size={20} />
                      <span className="font-semibold">{currentUser.email}</span>
                    </button>
                    {/* Conditional rendering and classes based on isProfileMenuOpen state */}
                    <div className={`absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg py-1 z-10
                      ${isProfileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                      <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-100">Role: <span className="font-semibold">{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button onClick={() => navigateTo('login')} className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200">
                    <LogIn size={18} />
                    <span>Login</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('register')} className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-indigo-600 transition-colors duration-200">
                    <User size={18} />
                    <span>Register</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>

      {/* Flash Message Display */}
      {flashMessage.message && (
        <div className={`relative px-4 py-3 leading-normal rounded-lg mb-4 mx-auto w-11/12 max-w-4xl mt-4 text-center
          ${flashMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            flashMessage.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
          {flashMessage.message}
        </div>
      )}

      <main className="flex-grow container mx-auto p-4">
        {(() => { // Using an IIFE for switch-case equivalent in JSX
          if (!currentUser) {
            switch (currentView) {
              case 'register':
                return <RegisterComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
              case 'login':
              default:
                // Pass authClient to LoginComponent if needed, though direct import is fine for now
                return <LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
            }
          } else {
            switch (currentView) {
              case 'myTickets':
                return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
              case 'allTickets':
                // Only allow support role to access all tickets
                if (currentUser.role === 'support') {
                  return <AllTicketsComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
                } else {
                  return <div className="text-center text-red-600 mt-8 text-2xl font-bold">Access Denied. You do not have permission to view all tickets.</div>;
                }
              case 'createTicket':
                return <CreateTicketComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
              case 'ticketDetail':
                return <TicketDetailComponent ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
              default:
                return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
            }
          }
        })()}
      </main>

      <footer className="bg-gray-800 text-white text-center p-4 mt-8 w-full">
        <p>&copy; {new Date().getFullYear()} IT Ticketing Tool. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
