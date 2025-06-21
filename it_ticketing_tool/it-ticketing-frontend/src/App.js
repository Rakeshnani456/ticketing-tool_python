import React, { useState, useEffect, useCallback, useRef } from 'react';
// Updated Lucide React imports for new icons and spinner
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine, ChevronDown, Settings, Monitor, CheckCircle, XCircle, Info, AlertTriangle, Tag, CalendarDays, ClipboardCheck, Send, Loader2, ListFilter, Clock, Users } from 'lucide-react'; // Added Users icon

// Import Firebase (make sure you've installed it: npm install firebase)
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut, // Import signOut for logout functionality
  onAuthStateChanged, // Import onAuthStateChanged for persistent login
  createUserWithEmailAndPassword // Import for registration
} from 'firebase/auth';

// --- Firebase Client-Side Configuration ---
// IMPORTANT: Replace with your actual Firebase project configuration!
// You can find this in your Firebase Console -> Project settings -> General -> Your apps -> Firebase SDK snippet (choose 'Config')
const firebaseConfig = {
    apiKey: "AIzaSyDZVwd_WHUw8RzUfkVklT7_9U6Mc-FNL-o",
  authDomain: "it-ticketing-tool-dd679.firebaseapp.com",
  projectId: "it-ticketing-tool-dd679",
  storageBucket: "it-ticketing-tool-dd679.firebasestorage.app",
  messagingSenderId: "919553361675",
  appId: "1:919553361675:web:ae1be7140926013786840e",
  measurementId: "G-HCVXC67K86"
};

// Initialize Firebase App for client-side use
const app = initializeApp(firebaseConfig);
// Get the Auth service instance from the initialized app for client-side operations
const authClient = getAuth(app);


// --- API Base URL for your Node.js Backend ---
// IMPORTANT: Ensure this matches the port your Node.js server is running on.
const API_BASE_URL = 'http://localhost:5000';

// --- Helper type for currentUser state to explicitly include firebaseUser object ---
// This ensures that methods like .getIdToken() are available.
// type AppUser = {
//   firebaseUser: firebase.User; // The original Firebase User object
//   role: string; // Role fetched from your backend
//   // Add any other user-specific data from your backend if needed
// };


// --- Component Definitions (These were previously in separate files, now included here for full code) ---

// Login Component
const LoginComponent = ({ onLoginSuccess, navigateTo, showFlashMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setPasswordError(false);
    setLoading(true);
    try {
      // 1. Authenticate with Firebase Client SDK (handles password verification)
      const userCredential = await signInWithEmailAndPassword(authClient, email, password);
      const firebaseUser = userCredential.user; // The original Firebase User object
      const idToken = await firebaseUser.getIdToken(); // Get the Firebase ID token (JWT)
      console.log("Firebase client login successful. ID Token obtained.");

      // 2. Send the ID Token to your Node.js backend for verification and role retrieval
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Send the ID token for backend verification
        },
        body: JSON.stringify({ email: firebaseUser.email }), // Send email for logging/matching on backend
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.message);
        // Pass the original firebaseUser object and role from backend to App component
        onLoginSuccess({ firebaseUser, role: data.user.role });
      } else {
        setMessage(data.error || 'Login failed after token verification.');
        showFlashMessage(data.error || 'Login failed after token verification.', 'error');
        authClient.signOut(); // Force client-side logout if backend fails
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed.';
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            errorMessage = 'Invalid email or password.';
            setPasswordError(true);
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
            errorMessage = error.message;
        }
      } else {
        errorMessage = 'An unexpected network error occurred or server is unreachable.';
      }
      setMessage(errorMessage);
      showFlashMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordFocus = () => {
    setPasswordError(false);
    setMessage('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
        <h2 className="text-4xl font-extrabold text-indigo-800 mb-8 text-center">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-800 text-base font-semibold mb-2">Email Address:</label>
            <input
              type="email"
              id="email"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-800 text-base font-semibold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              className={`w-full px-5 py-3 border rounded-lg focus:outline-none focus:ring-3 transition duration-200
                ${passwordError ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300'}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handlePasswordFocus}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-indigo-700 focus:outline-none focus:ring-3 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Logging In...</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>Log In</span>
              </>
            )}
          </button>
          {message && <p className="text-center mt-4 text-sm text-red-600 font-medium">{message}</p>}
        </form>
        <p className="text-center mt-8 text-gray-600 text-base">
          Don't have an account?{' '}
          <button onClick={() => navigateTo('register')} className="text-indigo-700 hover:underline font-bold transition duration-200">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
};


// Register Component
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
      // No client-side Firebase Auth user creation here, as per your Flask `app.py` logic.
      // Firebase Auth user creation is handled on the Node.js backend.
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <h2 className="text-4xl font-extrabold text-indigo-800 mb-8 text-center">Register</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-800 text-base font-semibold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-800 text-base font-semibold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-gray-800 text-base font-semibold mb-2">Role:</label>
            <select
              id="role"
              className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="support">Support Associate</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-green-700 focus:outline-none focus:ring-3 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Registering...</span>
                </>
            ) : (
                <>
                    <User size={20} />
                    <span>Register</span>
                </>
            )}
          </button>
          {message && <p className="text-center mt-4 text-sm text-green-600 font-medium">{message}</p>}
        </form>
        <p className="text-center mt-8 text-gray-600 text-base">
          Already have an account?{' '}
          <button onClick={() => navigateTo('login')} className="text-indigo-700 hover:underline font-bold transition duration-200">
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};


// MyTickets Component - **FIXED for getIdToken**
const MyTicketsComponent = ({ user, navigateTo, showFlashMessage }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyTickets = useCallback(async () => {
    // Access the original Firebase User object from the 'user' prop
    const firebaseUser = user?.firebaseUser;

    if (!firebaseUser) {
      setLoading(false);
      // Optional: show a message if no user is logged in
      showFlashMessage('Please log in to view your tickets.', 'info');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
      const idToken = await firebaseUser.getIdToken();
      console.log("Fetching tickets for UID:", firebaseUser.uid, "with ID Token (first 30 chars):", idToken.substring(0, 30) + '...');

      const response = await fetch(`${API_BASE_URL}/tickets/my?userId=${firebaseUser.uid}`, { // Use firebaseUser.uid
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN TO YOUR NODE.JS BACKEND
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
      }

      const data = await response.json();
      setTickets(data);
      // showFlashMessage('Tickets loaded successfully!', 'success'); // Only show if user explicitly triggers fetch
    } catch (err) {
      console.error('Error fetching my tickets:', err);
      setError(err.message || 'Failed to fetch tickets. Please try again.');
      showFlashMessage(err.message || 'Failed to fetch your tickets.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showFlashMessage]); // Dependencies: user, showFlashMessage

  useEffect(() => {
    // Fetch tickets when the component mounts or when the user object changes
    // This ensures data is fetched once the user is confirmed and ready
    if (user?.firebaseUser) {
        fetchMyTickets();
    }
  }, [user, fetchMyTickets]);

  if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading your tickets...</span></div>;
  if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h2 className="text-4xl font-extrabold text-indigo-800">My Tickets</h2>
        <button
          onClick={() => navigateTo('createTicket')}
          className="bg-indigo-600 text-white px-7 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition duration-300 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <PlusCircle size={22} />
          <span>Create New Ticket</span>
        </button>
      </div>
      {tickets.length === 0 ? (
        <div className="text-center text-gray-700 text-xl p-12 border-4 border-dashed border-gray-300 rounded-2xl bg-gray-50">
          <p className="mb-4">You haven't created any tickets yet.</p>
          <p className="font-semibold">Click "Create New Ticket" to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white p-7 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-indigo-800 mb-3 leading-tight">{ticket.title}</h3>
                <p className="text-gray-700 mb-2 flex items-center"><ClipboardCheck className="mr-3 text-indigo-500" size={18} /> <span className="font-semibold text-gray-800">ID:</span> {ticket.display_id}</p>
                <p className="text-gray-700 mb-2 flex items-center"><User className="mr-3 text-indigo-500" size={18} /><span className="font-semibold text-gray-800">Reporter:</span> {ticket.reporter}</p>
                <p className="text-gray-700 mb-2 flex items-center">
                  <span className="font-semibold mr-3 text-gray-800">Status:</span>
                  <span className={`px-4 py-1 text-sm font-semibold rounded-full ${
                      ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                    {ticket.status}
                  </span>
                </p>
                <p className="text-gray-700 mb-4 flex items-center">
                  <span className="font-semibold mr-3 text-gray-800">Priority:</span>
                  <span className={`px-4 py-1 text-sm font-semibold rounded-full ${
                      ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                      ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                      ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                  }`}>
                    {ticket.priority}
                  </span>
                </p>
              </div>
              <button
                onClick={() => navigateTo('ticketDetail', ticket.id)}
                className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 font-semibold shadow-md"
              >
                <List size={20} />
                <span>View Details</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// AllTickets Component (for support users) - **FIXED for getIdToken**
const AllTicketsComponent = ({ navigateTo, showFlashMessage, user }) => {
  const [rawTickets, setRawTickets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('');
  const [filterDue, setFilterDue] = useState('');

  const fetchAllTickets = useCallback(async () => {
    // Access the original Firebase User object from the 'user' prop
    const firebaseUser = user?.firebaseUser;

    if (!firebaseUser) {
        setLoading(false);
        showFlashMessage('You must be logged in to view all tickets.', 'info');
        return;
    }

    setLoading(true);
    setError(null);
    try {
        // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
        const idToken = await firebaseUser.getIdToken();

        const response = await fetch(`${API_BASE_URL}/tickets/all`, { // Always fetch all tickets
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN
            }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
        }
        const data = await response.json();
        setRawTickets(data); // Store the full list
      } catch (err) {
        setError(err.message || 'Failed to fetch all tickets. Please try again.');
        showFlashMessage(err.message || 'Failed to fetch all tickets.', 'error');
        console.error('Error fetching all tickets:', err);
      } finally {
        setLoading(false);
      }
    }, [user, showFlashMessage]); // Depend on user and showFlashMessage

    useEffect(() => {
        if (user?.firebaseUser) { // Ensure firebaseUser exists before fetching
            fetchAllTickets();
        }
    }, [user, fetchAllTickets]);

    // Effect to filter tickets whenever rawTickets or filter states change
    useEffect(() => {
      let filtered = [...rawTickets]; // Start with the full list

      if (filterStatus) {
        filtered = filtered.filter(ticket => ticket.status === filterStatus);
      }
      if (filterAssignment === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assigned_to_email);
      }
      // Add more filtering logic here for other filters (e.g., filterDue)

      setTickets(filtered); // Update the displayed tickets
    }, [rawTickets, filterStatus, filterAssignment, filterDue]);

    // Calculate counts based on the unfiltered rawTickets
    const counts = {
      total_tickets: rawTickets.length,
      open_tickets: rawTickets.filter(t => t.status === 'Open').length,
      in_progress_tickets: rawTickets.filter(t => t.status === 'In Progress').length,
      closed_tickets: rawTickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length,
      unassigned: rawTickets.filter(t => !t.assigned_to_email).length,
      // For assigned_to_me and assigned_to_others, you'd need current user email, which would come from currentUser context
      // For overdue, would need proper date comparison
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading all tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;

    return (
      <div className="p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-4xl font-extrabold text-indigo-800 mb-8">All Tickets</h2>

        {/* Filter Section */}
        <div className="flex flex-wrap gap-4 mb-8 p-5 bg-gray-50 rounded-xl shadow-inner border border-gray-100">
          <span className="text-lg font-semibold text-gray-700 flex items-center mr-2"><ListFilter className="mr-2" size={20} /> Filter By:</span>
          <button
            onClick={() => { setFilterStatus(''); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-5 py-2 rounded-full text-base font-semibold transition-colors duration-200 shadow-sm
              ${!filterStatus && !filterAssignment && !filterDue ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            All ({counts.total_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-5 py-2 rounded-full text-base font-semibold transition-colors duration-200 shadow-sm
              ${filterStatus === 'Open' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Open ({counts.open_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-5 py-2 rounded-full text-base font-semibold transition-colors duration-200 shadow-sm
              ${filterStatus === 'In Progress' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            In Progress ({counts.in_progress_tickets})
          </button>
          <button
            onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); setFilterDue(''); }}
            className={`px-5 py-2 rounded-full text-base font-semibold transition-colors duration-200 shadow-sm
              ${filterStatus === 'Closed' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Closed ({counts.closed_tickets})
          </button>
          <button
            onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); setFilterDue(''); }}
            className={`px-5 py-2 rounded-full text-base font-semibold transition-colors duration-200 shadow-sm
              ${filterAssignment === 'unassigned' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Unassigned ({counts.unassigned})
          </button>
          {/* Add more filter buttons as needed based on your Flask API capabilities */}
        </div>

        {tickets.length === 0 ? (
          <p className="text-gray-700 text-xl text-center p-12 border-4 border-dashed border-gray-300 rounded-2xl bg-gray-50">No tickets found matching the criteria.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Title</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Raised by</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                    {ticket.display_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                    {ticket.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 flex items-center"><User size={16} className="mr-2 text-gray-500" />{ticket.reporter}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                        ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                        ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                        ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 flex items-center">
                    <Users size={16} className="mr-2 text-gray-500" />
                    {ticket.assigned_to_email || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 flex items-center">
                    <CalendarDays size={16} className="mr-2 text-gray-500" />
                    {new Date(ticket.updated_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Add your action buttons/links here */}
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

  // CreateTicket Component - **FIXED for getIdToken**
  const CreateTicketComponent = ({ user, navigateTo, showFlashMessage }) => {
    // Access the original Firebase User object
    const firebaseUser = user?.firebaseUser;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    // Pre-fill reporter with user's email if available, otherwise allow input
    const [reporter, setReporter] = useState(firebaseUser?.email || '');
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Low');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!firebaseUser) {
          showFlashMessage('You must be logged in to create a ticket.', 'error');
          return;
      }
      setLoading(true);
      try {
        // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
        const idToken = await firebaseUser.getIdToken();

        const response = await fetch(`${API_BASE_URL}/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN
          },
          body: JSON.stringify({
            title,
            description,
            reporter,
            status,
            priority,
            creator_uid: firebaseUser.uid, // Use firebaseUser.uid
            creator_email: firebaseUser.email // Use firebaseUser.email
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
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
          <h2 className="text-4xl font-extrabold text-indigo-800 mb-8 text-center">Create New Ticket</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-gray-800 text-base font-semibold mb-2">Title:</label>
              <input type="text" id="title" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="description" className="block text-gray-800 text-base font-semibold mb-2">Description:</label>
              <textarea id="description" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200" rows="5" value={description} onChange={(e) => setDescription(e.target.value)} required></textarea>
            </div>
            <div>
              <label htmlFor="reporter" className="block text-gray-800 text-base font-semibold mb-2">Reporter Name:</label>
              <input type="text" id="reporter" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200" value={reporter} onChange={(e) => setReporter(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="status" className="block text-gray-800 text-base font-semibold mb-2">Status:</label>
              <select id="status" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200 bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-gray-800 text-base font-semibold mb-2">Priority:</label>
              <select id="priority" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200 bg-white" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-green-700 focus:outline-none focus:ring-3 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading}>
              {loading ? (
                  <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Creating...</span>
                  </>
              ) : (
                  <>
                      <PlusCircle size={20} />
                      <span>Create Ticket</span>
                  </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // TicketDetail Component - **FIXED for getIdToken**
  const TicketDetailComponent = ({ ticketId, navigateTo, user, showFlashMessage }) => {
    // Access the original Firebase User object
    const firebaseUser = user?.firebaseUser;

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [updateStatus, setUpdateStatus] = useState('');
    const [updatePriority, setUpdatePriority] = useState('');
    const [assignedToEmail, setAssignedToEmail] = useState('');
    const [updateLoading, setUpdateLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);


    const fetchTicket = useCallback(async () => {
      if (!ticketId || !firebaseUser) { // Ensure firebaseUser exists
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
        const idToken = await firebaseUser.getIdToken();

        const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
        }
        const data = await response.json();
        // Ensure comments exist and are an array
        if (!data.comments) data.comments = [];
        setTicket(data);
        setUpdateStatus(data.status);
        setUpdatePriority(data.priority);
        setAssignedToEmail(data.assigned_to_email || '');
      } catch (err) {
        setError(err.message || 'Failed to fetch ticket details. Please try again.');
        showFlashMessage(err.message || 'Failed to fetch ticket details.', 'error');
        console.error('Error fetching ticket:', err);
      } finally {
        setLoading(false);
      }
    }, [ticketId, firebaseUser, showFlashMessage]); // Dependencies for fetchTicket

    useEffect(() => {
      if (ticketId) {
        fetchTicket();
      }
    }, [ticketId, fetchTicket]);

    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
            const idToken = await firebaseUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/update`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN
                },
                body: JSON.stringify({
                  status: updateStatus,
                  priority: updatePriority,
                  assigned_to_email: assignedToEmail
                }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Ticket updated successfully!', 'success');
                fetchTicket(); // Re-fetch to get latest details including updated_at
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
            // --- CRUCIAL FIX: Call getIdToken() on the original firebaseUser object ---
            const idToken = await firebaseUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}` // <<< THIS SENDS THE TOKEN
                },
                body: JSON.stringify({ comment_text: newComment, commenter_name: firebaseUser.email }), // Use firebaseUser.email
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Comment added successfully!', 'success');
                setNewComment('');
                fetchTicket(); // Re-fetch to get latest comments and updated_at
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

    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading ticket details...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;
    if (!ticket) return <div className="text-center text-gray-600 mt-8 text-xl">Ticket not found.</div>;

    // Check if the current user is the creator or a support associate
    const canUpdateOrComment = user.role === 'support' || firebaseUser.uid === ticket.creator_uid; // Use firebaseUser.uid
    // Only support users can edit the assigned_to field
    const canEditAssignedTo = user.role === 'support';


    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl border border-gray-100">
        <h2 className="text-4xl font-extrabold text-indigo-800 mb-2 text-center leading-tight">
          Ticket #{ticket.display_id ? ticket.display_id : 'N/A'}
        </h2>


        <p className="text-2xl font-semibold text-gray-700 mb-8 text-center px-4">
          {ticket.title}
        </p>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-10 text-lg">
          <p className="text-gray-700 flex items-center"><User className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Reporter:</span> {ticket.reporter}</p>
          <p className="text-gray-700 flex items-center">
            <CalendarDays className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Created:</span> {new Date(ticket.created_at).toLocaleString()}
          </p>
          <p className="text-gray-700 flex items-center">
            <ClipboardCheck className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Status:</span>
            <span className={`ml-2 px-4 py-1 text-base font-semibold rounded-full ${
                ticket.status === 'Open' ? 'bg-green-100 text-green-800' :
                ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
            }`}>
              {ticket.status}
            </span>
          </p>
          <p className="text-gray-700 flex items-center">
            <Clock className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Last Updated:</span> {new Date(ticket.updated_at).toLocaleString()}
          </p>
          <p className="text-gray-700 flex items-center">
            <Tag className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Priority:</span>
            <span className={`ml-2 px-4 py-1 text-base font-semibold rounded-full ${
                ticket.priority === 'Low' ? 'bg-blue-100 text-blue-800' :
                ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                ticket.priority === 'High' || ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                'bg-purple-100 text-purple-800'
            }`}>
              {ticket.priority}
            </span>
          </p>
          <p className="text-gray-700 flex items-center">
            <Users className="mr-3 text-indigo-500" size={20} /><span className="font-bold text-gray-800">Assigned To:</span> {ticket.assigned_to_email || 'Unassigned'}
          </p>
        </div>

        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-inner mb-10">
          <h4 className="text-2xl font-bold text-blue-800 mb-4 flex items-center"><FilePenLine className="mr-3" size={24} />Description:</h4>
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">{ticket.description}</p>
        </div>

        {canUpdateOrComment && ( // Render update section only if user has permissions
          <div className="mb-10 p-7 bg-gray-50 rounded-xl shadow-md border border-gray-200">
            <h3 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Update Ticket</h3>
            <form onSubmit={handleUpdateTicket} className="space-y-6">
              <div>
                <label htmlFor="updateStatus" className="block text-gray-700 text-base font-semibold mb-2">Update Status:</label>
                <select id="updateStatus" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200 bg-white" value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label htmlFor="updatePriority" className="block text-gray-700 text-base font-semibold mb-2">Update Priority:</label>
                <select id="updatePriority" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200 bg-white" value={updatePriority} onChange={(e) => setUpdatePriority(e.target.value)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              {/* New: Assigned To field - visible to all, editable only by support */}
              <div>
                <label htmlFor="assignedToEmail" className="block text-gray-700 text-base font-semibold mb-2">Assigned To (Email):</label>
                <input
                  type="email"
                  id="assignedToEmail"
                  className={`w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200
                    ${!canEditAssignedTo ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  value={assignedToEmail}
                  onChange={(e) => setAssignedToEmail(e.target.value)}
                  disabled={!canEditAssignedTo} // Disabled if not a support user
                  placeholder="Enter support email or leave empty for unassigned"
                />
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-blue-700 focus:outline-none focus:ring-3 focus:ring-blue-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed" disabled={updateLoading}>
                {updateLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Updating...</span>
                    </>
                ) : (
                    <>
                        <FilePenLine size={20} />
                        <span>Update Ticket</span>
                    </>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="p-7 bg-gray-50 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-3xl font-bold text-indigo-700 mb-6 text-center">Comments</h3>
          {ticket.comments && ticket.comments.length > 0 ? (
            <ul className="space-y-5">
              {ticket.comments.map((comment, index) => (
                <li key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                  <p className="text-gray-800 text-base mb-2 whitespace-pre-wrap flex items-start"><MessageSquareText className="mr-3 text-indigo-500 flex-shrink-0" size={18} />{comment.text}</p>
                  <p className="text-gray-600 text-xs text-right mt-2">By <span className="font-semibold text-gray-700">{comment.commenter}</span> on <span className="font-medium">{new Date(comment.timestamp).toLocaleString()}</span></p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700 text-lg text-center p-10 border-4 border-dashed border-gray-300 rounded-2xl bg-gray-100">No comments yet. Be the first to provide additional comments!</p>
          )}

          {canUpdateOrComment && ( // Render comment form only if user has permissions
            <form onSubmit={handleAddComment} className="mt-8 space-y-6">
              <div>
                <label htmlFor="newComment" className="block text-gray-700 text-base font-semibold mb-2">Add New Comment:</label>
                <textarea id="newComment" className="w-full px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-3 focus:ring-indigo-300 transition duration-200" rows="5" value={newComment} onChange={(e) => setNewComment(e.target.value)} required></textarea>
              </div>
              <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-green-700 focus:outline-none focus:ring-3 focus:ring-green-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed" disabled={commentLoading}>
                {commentLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>Adding...</span>
                    </>
                ) : (
                    <>
                        <Send size={20} />
                        <span>Add Comment</span>
                    </>
                )}
              </button>
            </form>
          )}
        </div>

        <button
          onClick={() => navigateTo(user.role === 'support' ? 'allTickets' : 'myTickets')}
          className="mt-8 w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-gray-600 focus:outline-none focus:ring-3 focus:ring-gray-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
        >
          <List size={20} />
          <span>Back to Tickets</span>
        </button>
      </div>
      </div>
    );
  };

// --- Main App Component ---
function App() {
  // currentUser now stores an object: { firebaseUser: firebase.User, role: string }
  // firebaseUser holds the original Firebase User object with its methods.
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading for Firebase auth state
  const [currentView, setCurrentView] = useState('login'); // Default view
  const [selectedTicketId, setSelectedTicketId] = useState(null); // For viewing a specific ticket
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); // State to control profile dropdown visibility
  const profileMenuRef = useRef(null); // Ref for the profile dropdown container

  // Flash Message state
  const [flashMessage, setFlashMessage] = useState({ type: '', message: '' });
  const flashMessageTimeoutRef = useRef(null);

  // Function to show flash message (memoized)
  const showFlashMessage = useCallback((type, message) => {
    setFlashMessage({ type, message });
    if (flashMessageTimeoutRef.current) {
      clearTimeout(flashMessageTimeoutRef.current);
    }
    flashMessageTimeoutRef.current = setTimeout(() => {
      setFlashMessage({ type: '', message: '' });
    }, 5000); // Message disappears after 5 seconds
  }, []);

  // Handler for successful login, updates currentUser state (memoized)
  const handleLoginSuccess = useCallback((userWithRoleData) => {
    // userWithRoleData is expected to be { firebaseUser: firebase.User, role: string }
    setCurrentUser(userWithRoleData);
    // Optionally persist to localStorage if needed for specific use cases, but onAuthStateChanged is more reliable
    // localStorage.setItem('currentUser', JSON.stringify(userWithRoleData)); // Note: firebaseUser is not directly JSON.stringify-able
    setCurrentView('myTickets');
    showFlashMessage('Login successful!', 'success');
  }, [showFlashMessage]);

  // Effect to listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authClient, async (user) => {
      if (user) {
        // User is signed in. Fetch their role from your backend.
        try {
          const idToken = await user.getIdToken(); // This 'user' is the original Firebase User object
          const response = await fetch(`${API_BASE_URL}/login`, { // Using /login to fetch role from backend
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            }
          });
          if (!response.ok) {
            // Handle error if backend fails to verify token or retrieve role
            const errorData = await response.json();
            console.error('Backend role fetch failed:', errorData.error);
            showFlashMessage('error', 'Failed to retrieve user role. Please try logging in again.');
            setCurrentUser(null); // Clear user if role fetch fails
            signOut(authClient); // Force logout if role cannot be confirmed
          } else {
            const backendLoginData = await response.json();
            // Store the original Firebase User object AND the role
            setCurrentUser({ firebaseUser: user, role: backendLoginData.user.role });
            setCurrentView('myTickets'); // Navigate to tickets dashboard
          }
        } catch (error) {
          console.error("Error fetching user role on auth state change:", error);
          showFlashMessage('error', 'Authentication error. Please re-login.');
          setCurrentUser(null);
          signOut(authClient);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setCurrentView('login'); // Redirect to login page
      }
      setLoading(false); // Authentication state loaded
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [showFlashMessage]); // Add showFlashMessage to dependencies

  // Navigation handler (memoized)
  const navigateTo = useCallback((view, ticketId = null) => {
    setCurrentView(view);
    setSelectedTicketId(ticketId);
    setFlashMessage({ message: '', type: '' }); // Clear messages on navigation
    setIsProfileMenuOpen(false); // Close profile menu on navigation
  }, []);

  // Logout handler (memoized)
  const handleLogout = useCallback(async () => {
    try {
      await signOut(authClient);
      showFlashMessage('Logged out successfully!', 'info');
      // The onAuthStateChanged listener will handle clearing currentUser and navigating to login
    } catch (error) {
      console.error("Logout failed:", error);
      showFlashMessage('error', 'Logout failed. Please try again.');
    }
  }, [showFlashMessage]);

  // Effect to close profile menu when clicking outside (memoized)
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
  }, []); // No dependencies for ref

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="ml-4 text-xl text-gray-700">Loading application...</p>
      </div>
    );
  }

  // --- Main App Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 antialiased flex flex-col">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white p-4 shadow-xl flex justify-between items-center flex-wrap">
        <div className="flex items-center space-x-3">
          <Monitor className="text-indigo-200" size={30} />
          <h1 className="text-3xl font-extrabold tracking-tight">IT Help Desk</h1>
        </div>
        <nav>
          <ul className="flex space-x-6 items-center flex-wrap justify-center sm:justify-end gap-y-2">
            {currentUser ? (
              <>
                <li>
                  <button onClick={() => navigateTo('myTickets')} className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-200">
                    <List size={20} />
                    <span>My Tickets</span>
                  </button>
                </li>
                {currentUser.role === 'support' && (
                  <li>
                    <button onClick={() => navigateTo('allTickets')} className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-200">
                      <LayoutDashboard size={20} />
                      <span>All Tickets</span>
                    </button>
                  </li>
                )}
                {/* Note: Create Ticket button is now within MyTicketsComponent */}

                <li>
                  {/* The profile menu container */}
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300
                        ${isProfileMenuOpen ? 'bg-indigo-600' : 'hover:bg-indigo-600'}`}
                    >
                      <User size={20} />
                      {/* Display email from firebaseUser */}
                      <span className="font-semibold">{currentUser.firebaseUser.email}</span>
                      <ChevronDown size={16} className={`ml-1 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {/* Conditional rendering and classes based on isProfileMenuOpen state */}
                    <div className={`absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl py-1 z-10 origin-top-right transform transition-all duration-200 ease-out
                      ${isProfileMenuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
                      <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-100">Role: <span className="font-bold text-indigo-700">{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
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
                  <button onClick={() => navigateTo('login')} className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-200">
                    <LogIn size={20} />
                    <span>Login</span>
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('register')} className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-200">
                    <User size={20} />
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
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 ease-out transform
          ${flashMessage.type === 'success' ? 'bg-green-500 text-white' :
            flashMessage.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          {flashMessage.type === 'success' && <CheckCircle size={20} />}
          {flashMessage.type === 'error' && <XCircle size={20} />}
          {flashMessage.type === 'info' && <Info size={20} />}
          {flashMessage.type === 'warning' && <AlertTriangle size={20} />}
          <p className="font-semibold">{flashMessage.message}</p>
          <button onClick={() => setFlashMessage({ message: '', type: '' })} className="ml-auto text-white opacity-70 hover:opacity-100 focus:outline-none">
            <XCircle size={16} />
          </button>
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
                return <LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
            }
          } else {
            switch (currentView) {
              case 'myTickets':
                return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
              case 'allTickets':
                // Only allow support role to access all tickets
                if (currentUser.role === 'support') {
                  return <AllTicketsComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} user={currentUser} />;
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
        <p>&copy; {new Date().getFullYear()} IT Help Desk. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
