// App.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine } from 'lucide-react';

// Import the functions you need from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";


// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase project configuration
// You can find this in your Firebase project settings -> "General" -> "Your apps" -> "Web app"
const firebaseConfig = {
  apiKey: "AIzaSyDZVwd_WHUw8RzUfkVklT7_9U6Mc-FNL-o",
  authDomain: "it-ticketing-tool-dd679.firebaseapp.com",
  projectId: "it-ticketing-tool-dd679",
  storageBucket: "it-ticketing-tool-dd679.firebasestorage.app",
  messagingSenderId: "919553361675",
  appId: "1:919553361675:web:55bfeb860ebef1b886840e",
  measurementId: "G-H6M4JBS3TL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


// Main App component for the IT Ticketing Tool
function App() {
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null); 
  const [selectedTicketId, setSelectedTicketId] = useState(null); 
  const [flashMessage, setFlashMessage] = useState({ message: '', type: '' });
  const [isFlashMessageVisible, setIsFlashMessageVisible] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

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
        // Only navigate to myTickets if a user is truly logged in (i.e., session is active or token is valid)
        // For simplicity, we assume storedUser means logged in for now, but a real app would verify.
        setCurrentView('myTickets'); 
        console.log("Found stored user:", user);
      } else {
        console.log("No stored user found, defaulting to login.");
        setCurrentView('login');
      }
    } catch (error) {
      console.error("Failed to parse stored user from localStorage:", error);
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      setCurrentView('login');
    }
  }, []);

  // Flash message visibility timer
  useEffect(() => {
    if (flashMessage.message) {
      setIsFlashMessageVisible(true);
      const timer = setTimeout(() => {
        setIsFlashMessageVisible(false);
        setFlashMessage({ message: '', type: '' }); // Clear message after fading out
      }, 5000); // Message visible for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [flashMessage]);

  // Handle clicks outside the profile menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuRef]);

  const showFlashMessage = useCallback((message, type) => {
    setFlashMessage({ message, type });
  }, []);

  const navigateTo = useCallback((view, ticketId = null) => {
    setCurrentView(view);
    setSelectedTicketId(ticketId);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      // Sign out from Firebase client-side
      await firebaseSignOut(auth); 
      // Inform backend to clear its session (if using server-side sessions)
      const response = await fetch(`${API_BASE_URL}/api/logout`, { method: 'POST' });
      if (!response.ok) {
        console.error('Failed to clear server session:', await response.text());
      }
      localStorage.removeItem('currentUser');
      setCurrentUser(null);
      navigateTo('login');
      showFlashMessage('You have been logged out.', 'info');
    } catch (error) {
      console.error('Error during logout:', error);
      showFlashMessage('Logout failed.', 'error');
    }
  }, [navigateTo, showFlashMessage, API_BASE_URL]);


  // --- Components for different views ---

  function LoginComponent({ navigateTo, showFlashMessage, setCurrentUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        // Authenticate with Firebase on the client-side
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Get Firebase ID Token
        const idToken = await user.getIdToken();

        // Send ID Token to Flask backend for verification and session creation
        const response = await fetch(`${API_BASE_URL}/api/login`, { // <--- New API endpoint
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No need to send password here, only the securely obtained ID token
          },
          body: JSON.stringify({ idToken: idToken }), // Send ID token
        });

        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          setCurrentUser(data.user);
          navigateTo('myTickets');
          showFlashMessage('Login successful!', 'success');
        } else {
          showFlashMessage(data.error || 'Login failed', 'error');
        }
      } catch (error) {
        console.error('Firebase authentication error:', error);
        let message = 'Login failed. Please check your credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          message = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
          message = 'Invalid email address format.';
        } else if (error.code === 'auth/too-many-requests') {
          message = 'Too many failed login attempts. Please try again later.';
        }
        showFlashMessage(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Login</h2>
        <form onSubmit={handleLogin} className="auth-form">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="input-field"
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="input-field"
          />

          <button type="submit" className="button submit-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link mt-4 text-center">
          Don't have an account? <a href="#" onClick={() => navigateTo('register')} className="text-blue-600 hover:underline">Register here</a>.
        </p>
      </div>
    );
  }

  function RegisterComponent({ navigateTo, showFlashMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        // Create user in Firebase Authentication client-side
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Immediately get ID token after registration to send to backend for role storage
        const idToken = await user.getIdToken();

        // Send registration data (including role and token) to Flask backend
        const response = await fetch(`${API_BASE_URL}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, role, idToken }), // Send token and role
        });

        const data = await response.json();
        if (response.ok) {
          showFlashMessage(data.message, 'success');
          navigateTo('login');
        } else {
          showFlashMessage(data.error || 'Registration failed', 'error');
        }
      } catch (error) {
        console.error('Firebase registration error:', error);
        let message = 'Registration failed.';
        if (error.code === 'auth/email-already-in-use') {
          message = 'Email already registered. Please log in.';
        } else if (error.code === 'auth/invalid-email') {
          message = 'Invalid email address format.';
        } else if (error.code === 'auth/weak-password') {
          message = 'Password is too weak. It must be at least 6 characters.';
        }
        showFlashMessage(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="auth-container">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Register New User</h2>
        <form onSubmit={handleRegister} className="auth-form">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="input-field"
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="input-field"
          />

          <label htmlFor="role">Select Role:</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field"
          >
            <option value="user">User</option>
            <option value="support">Support Associate</option>
          </select>

          <button type="submit" className="button submit-button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link mt-4 text-center">
          Already have an account? <a href="#" onClick={() => navigateTo('login')} className="text-blue-600 hover:underline">Log in here</a>.
        </p>
      </div>
    );
  }

  // Helper component for displaying tickets (replaces MyTicketsComponent and AllTicketsComponent logic)
  function TicketsDisplayComponent({ user, navigateTo, showFlashMessage, fetchUrl, pageTitle }) {
    const [tickets, setTickets] = useState([]);
    const [counts, setCounts] = useState({});
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAssignment, setFilterAssignment] = useState('');
    const [filterDue, setFilterDue] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchTickets = useCallback(async () => {
      setLoading(true);
      try {
        let url = `${API_BASE_URL}${fetchUrl}`;
        const params = new URLSearchParams();
        if (filterStatus) params.append('status', filterStatus);
        if (filterAssignment) params.append('assignment', filterAssignment);
        if (filterDue) params.append('due', filterDue);

        // Include userId for myTickets endpoint if applicable
        if (fetchUrl === '/tickets/my' && user && user.id) {
          params.append('userId', user.id);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log("Fetching tickets from:", url); // Debugging line

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch tickets');
        }
        const data = await response.json();
        setTickets(data.tickets);
        setCounts(data.counts);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        showFlashMessage(error.message || 'Error fetching tickets.', 'error');
        setTickets([]);
        setCounts({
          'open_tickets': 0, 'assigned_to_me': 0, 'assigned_to_others': 0,
          'unassigned': 0, 'overdue': 0, 'closed_tickets': 0, 'total_tickets': 0
        });
      } finally {
        setLoading(false);
      }
    }, [fetchUrl, filterStatus, filterAssignment, filterDue, showFlashMessage, user]);

    useEffect(() => {
      fetchTickets();
    }, [fetchTickets]);

    const handleTicketClick = (ticketId) => {
      navigateTo('ticketDetail', ticketId);
    };

    if (loading) {
      return <div className="text-center mt-8 text-xl text-gray-600">Loading tickets...</div>;
    }

    return (
      <div className="main-content-area">
        <div className="main-content-header">
          <h2 className="text-2xl font-bold text-gray-800">{pageTitle}</h2>
          {pageTitle === "My Tickets" && (
            <button 
              onClick={() => navigateTo('createTicket')} 
              className="button primary-button add-new-ticket"
            >
              <PlusCircle className="inline-block mr-2" size={20} /> Create New Ticket
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="status-filters flex flex-wrap justify-center gap-2 mb-6">
          <div 
            className={`filter-item ${!filterStatus && !filterAssignment && !filterDue ? 'active' : ''}`}
            onClick={() => { setFilterStatus(''); setFilterAssignment(''); setFilterDue(''); }}
          >
            All Tickets <span>{counts.total_tickets || 0}</span>
          </div>
          <div 
            className={`filter-item ${filterStatus === 'Open' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); setFilterDue(''); }}
          >
            Open <span>{counts.open_tickets || 0}</span>
          </div>
          {user && user.role === 'support' && (
            <>
              <div 
                className={`filter-item ${filterAssignment === 'assigned_to_me' ? 'active' : ''}`}
                onClick={() => { setFilterAssignment('assigned_to_me'); setFilterStatus(''); setFilterDue(''); }}
              >
                Assigned to Me <span>{counts.assigned_to_me || 0}</span>
              </div>
              <div 
                className={`filter-item ${filterAssignment === 'unassigned' ? 'active' : ''}`}
                onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); setFilterDue(''); }}
              >
                Unassigned <span>{counts.unassigned || 0}</span>
              </div>
              <div 
                className={`filter-item ${filterAssignment === 'assigned_to_others' ? 'active' : ''}`}
                onClick={() => { setFilterAssignment('assigned_to_others'); setFilterStatus(''); setFilterDue(''); }}
              >
                Assigned to Others <span>{counts.assigned_to_others || 0}</span>
              </div>
            </>
          )}
          <div 
            className={`filter-item ${filterDue === 'overdue' ? 'active' : ''}`}
            onClick={() => { setFilterDue('overdue'); setFilterStatus(''); setFilterAssignment(''); }}
          >
            Overdue <span>{counts.overdue || 0}</span>
          </div>
          <div 
            className={`filter-item ${filterStatus === 'Closed' ? 'active' : ''}`}
            onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); setFilterDue(''); }}
          >
            Closed <span>{counts.closed_tickets || 0}</span>
          </div>
        </div>

        {tickets.length > 0 ? (
          <div className="ticket-table-container overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleTicketClick(ticket.id)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-label="ID">#{ticket.id.substring(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800" data-label="Title">{ticket.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Status">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        ticket.status === 'On Hold' ? 'bg-purple-100 text-purple-800' :
                        ticket.status === 'Waiting reply' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" data-label="Priority">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.priority === 'Low' ? 'bg-green-100 text-green-800' :
                        ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                        ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Assigned To">{ticket.assigned_to_email || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Due Date">
                      {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Created By">{ticket.creator_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="Created On">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-600 mt-8 text-lg">No tickets found.</p>
        )}
      </div>
    );
  }


  function MyTicketsComponent({ user, navigateTo, showFlashMessage }) {
    return (
      <TicketsDisplayComponent 
        user={user}
        navigateTo={navigateTo}
        showFlashMessage={showFlashMessage}
        fetchUrl={`/tickets/my`} // My tickets
        pageTitle="My Tickets"
      />
    );
  }

  function AllTicketsComponent({ navigateTo, showFlashMessage }) {
    const user = JSON.parse(localStorage.getItem('currentUser')); // Assuming currentUser is always available for support
    return (
      <TicketsDisplayComponent 
        user={user} // Pass user to allow support-specific filters
        navigateTo={navigateTo}
        showFlashMessage={showFlashMessage}
        fetchUrl={`/tickets/all`} // All tickets
        pageTitle="All Tickets"
      />
    );
  }


  function CreateTicketComponent({ user, navigateTo, showFlashMessage }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [reporter, setReporter] = useState('');
    const [status, setStatus] = useState('Open');
    const [priority, setPriority] = useState('Low');
    const [assignedToEmail, setAssignedToEmail] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Set reporter and creator_email from logged-in user if available
        if (user) {
            setReporter(user.email.split('@')[0]); // Use part of email as default reporter name
        }
        // Calculate and set default due date (10 days from now)
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 10);
        setDueDate(defaultDueDate.toISOString().split('T')[0]); // Format to YYYY-MM-DD
    }, [user]);


    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            title, 
            description, 
            reporter, 
            status, 
            priority,
            assigned_to_email: assignedToEmail,
            due_date: dueDate,
            creator_uid: user.id, // Send current user's UID
            creator_email: user.email // Send current user's email
          }),
        });
        const data = await response.json();
        if (response.ok) {
          showFlashMessage('Ticket created successfully!', 'success');
          navigateTo('myTickets');
        } else {
          showFlashMessage(data.error || 'Failed to create ticket', 'error');
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        showFlashMessage('Network error or server unavailable', 'error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="form-container">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Create New Ticket</h2>
        <form onSubmit={handleSubmit} className="ticket-form">
          <label htmlFor="title">Title:</label>
          <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />

          <label htmlFor="description">Description:</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required className="input-field min-h-[100px]"></textarea>

          <label htmlFor="reporter">Reporter Name:</label>
          <input type="text" id="reporter" value={reporter} onChange={(e) => setReporter(e.target.value)} required className="input-field" />

          <label htmlFor="status">Status:</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Resolved">Resolved</option>
            <option value="On Hold">On Hold</option>
            <option value="Waiting reply">Waiting reply</option>
          </select>

          <label htmlFor="priority">Priority:</label>
          <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <label htmlFor="assignedToEmail">Assigned To (Email):</label>
          <input type="email" id="assignedToEmail" value={assignedToEmail} onChange={(e) => setAssignedToEmail(e.target.value)} className="input-field" />

          <label htmlFor="dueDate">Due Date:</label>
          <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
          
          <button type="submit" className="button submit-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
          <button type="button" onClick={() => navigateTo('myTickets')} className="button secondary-button mt-4">
            Cancel
          </button>
        </form>
      </div>
    );
  }

  function TicketDetailComponent({ ticketId, navigateTo, user, showFlashMessage }) {
    const [ticket, setTicket] = useState(null);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [assignedToEmail, setAssignedToEmail] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [updatingTicket, setUpdatingTicket] = useState(false);


    const fetchTicketDetails = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch ticket details');
        }
        const data = await response.json();
        setTicket(data);
        setComments(data.comments || []);
        setStatus(data.status);
        setPriority(data.priority);
        setAssignedToEmail(data.assigned_to_email || '');
        // Format date from ISO string to YYYY-MM-DD for input type="date"
        setDueDate(data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '');
      } catch (error) {
        console.error("Error fetching ticket details:", error);
        showFlashMessage(error.message || 'Error fetching ticket details.', 'error');
        setTicket(null);
        navigateTo('myTickets'); // Go back to list if ticket not found/error
      } finally {
        setLoading(false);
      }
    }, [ticketId, navigateTo, showFlashMessage]);

    useEffect(() => {
      if (ticketId) {
        fetchTicketDetails();
      }
    }, [ticketId, fetchTicketDetails]);


    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        setUpdatingTicket(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    status, 
                    priority,
                    assigned_to_email: assignedToEmail,
                    due_date: dueDate // Send date in YYYY-MM-DD format, backend will parse
                }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage('Ticket updated successfully!', 'success');
                fetchTicketDetails(); // Re-fetch to get latest data including updated_at
            } else {
                showFlashMessage(data.error || 'Failed to update ticket', 'error');
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            showFlashMessage('Network error or server unavailable', 'error');
        } finally {
            setUpdatingTicket(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        setSubmittingComment(true);
        if (!newCommentText.trim()) {
            showFlashMessage('Comment cannot be empty!', 'error');
            setSubmittingComment(false);
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    comment_text: newCommentText,
                    commenter_name: user.email // Use current user's email as commenter
                }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage('Comment added successfully!', 'success');
                setNewCommentText('');
                fetchTicketDetails(); // Re-fetch to get latest comments
            } else {
                showFlashMessage(data.error || 'Failed to add comment', 'error');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            showFlashMessage('Network error or server unavailable', 'error');
        } finally {
            setSubmittingComment(false);
        }
    };


    if (loading) {
      return <div className="text-center mt-8 text-xl text-gray-600">Loading ticket details...</div>;
    }

    if (!ticket) {
      return <div className="text-center text-red-600 mt-8 text-2xl font-bold">Ticket not found or access denied.</div>;
    }

    // Determine if the current user can edit the ticket
    const canEdit = user && (user.role === 'support' || user.id === ticket.creator_uid);


    return (
      <div className="ticket-detail-container max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">Ticket: {ticket.title}</h2>

        <div className="ticket-details-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <p><strong>Tracking ID:</strong> <span className="text-blue-700 font-mono">{ticket.id ? ticket.id.substring(0, 10).toUpperCase() : 'N/A'}</span></p>
            <p><strong>Reporter:</strong> {ticket.reporter}</p>
            <p><strong>Created by:</strong> {ticket.creator_email}</p>
            <p><strong>Assigned To:</strong> {ticket.assigned_to_email || 'Unassigned'}</p>
            <p><strong>Due Date:</strong> {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'N/A'}</p>
            <p>
              <strong>Current Status:</strong> 
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                ticket.status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                ticket.status === 'On Hold' ? 'bg-purple-100 text-purple-800' :
                ticket.status === 'Waiting reply' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {ticket.status}
              </span>
            </p>
            <p>
              <strong>Current Priority:</strong> 
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                ticket.priority === 'Low' ? 'bg-green-100 text-green-800' :
                ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {ticket.priority}
              </span>
            </p>
            <p><strong>Created On:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
            <p><strong>Last Updated:</strong> {new Date(ticket.updated_at).toLocaleString()}</p>
        </div>

        <div className="description-section mb-8 p-4 bg-gray-50 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold mb-3 text-gray-700">Description</h3>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {canEdit && (
            <div className="update-ticket-section mb-8 p-6 bg-blue-50 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4 text-blue-800">Update Ticket Details</h3>
                <form onSubmit={handleUpdateTicket} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                        <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-full">
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Closed">Closed</option>
                            <option value="Resolved">Resolved</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Waiting reply">Waiting reply</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority:</label>
                        <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field w-full">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                    {user.role === 'support' && ( // Only support can update assigned_to_email and due_date
                        <>
                            <div>
                                <label htmlFor="assignedToEmail" className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Email):</label>
                                <input type="email" id="assignedToEmail" value={assignedToEmail} onChange={(e) => setAssignedToEmail(e.target.value)} className="input-field w-full" placeholder="e.g., support@example.com" />
                            </div>
                            <div>
                                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">Due Date:</label>
                                <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field w-full" />
                            </div>
                        </>
                    )}
                    <div className="md:col-span-2 text-center mt-4">
                        <button type="submit" className="button submit-button update-button" disabled={updatingTicket}>
                            {updatingTicket ? 'Updating...' : 'Update Ticket'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        <div className="comments-section mb-8 p-6 bg-gray-50 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Comments</h3>
            {comments.length > 0 ? (
                <ul className="comment-list space-y-4">
                    {comments.map((comment, index) => (
                        <li key={index} className="comment-item border-b pb-4 last:pb-0 last:border-b-0">
                            <p className="comment-text text-gray-800 leading-snug">{comment.text}</p>
                            <span className="comment-meta text-sm text-gray-500 block mt-1">
                                By <span className="font-medium text-gray-700">{comment.commenter}</span> on {new Date(comment.timestamp).toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="no-comments-message text-gray-600 italic">No comments yet.</p>
            )}

            <form onSubmit={handleAddComment} className="comment-form mt-6">
                <label htmlFor="new_comment_text" className="block text-sm font-medium text-gray-700 mb-1">Add a new comment:</label>
                <textarea 
                    id="new_comment_text" 
                    value={newCommentText} 
                    onChange={(e) => setNewCommentText(e.target.value)} 
                    rows="4" 
                    required 
                    className="input-field w-full min-h-[80px]"
                    placeholder="Type your comment here..."
                ></textarea>
                <button type="submit" className="button submit-button comment-button mt-3" disabled={submittingComment}>
                    {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
            </form>
        </div>

        <div className="text-center">
            <button onClick={() => navigateTo(user.role === 'support' ? 'allTickets' : 'myTickets')} className="button back-button">
                Back to Tickets
            </button>
        </div>
      </div>
    );
  }


  return (
    <div className="app-container flex flex-col min-h-screen">
      <header className="bg-gray-800 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            <a href="#" onClick={() => currentUser ? navigateTo('myTickets') : navigateTo('login')} className="hover:text-gray-300">IT Help Desk</a>
          </h1>
          <nav>
            <ul className="flex items-center space-x-6">
              {currentUser && (
                <>
                  <li>
                    <a href="#" onClick={() => navigateTo('myTickets')} className={`hover:text-gray-300 flex items-center ${currentView === 'myTickets' ? 'text-blue-300' : ''}`}>
                      <LayoutDashboard className="mr-2" size={20} />My Tickets
                    </a>
                  </li>
                  {currentUser.role === 'support' && (
                    <li>
                      <a href="#" onClick={() => navigateTo('allTickets')} className={`hover:text-gray-300 flex items-center ${currentView === 'allTickets' ? 'text-blue-300' : ''}`}>
                        <List className="mr-2" size={20} />All Tickets
                      </a>
                    </li>
                  )}
                  <li className="relative" ref={profileMenuRef}>
                    <button 
                      className="flex items-center focus:outline-none hover:text-gray-300"
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    >
                      <User className="mr-2" size={20} />
                      <span>{currentUser.email}</span>
                      <svg className={`ml-2 w-4 h-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                        <div className="block px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                          Role: <span className="font-semibold capitalize">{currentUser.role}</span>
                        </div>
                        <button 
                          onClick={handleLogout} 
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <LogOut className="mr-2" size={16} />Logout
                        </button>
                      </div>
                    )}
                  </li>
                </>
              )}
              {!currentUser && (
                <>
                  <li>
                    <a href="#" onClick={() => navigateTo('login')} className={`hover:text-gray-300 flex items-center ${currentView === 'login' ? 'text-blue-300' : ''}`}>
                      <LogIn className="mr-2" size={20} />Login
                    </a>
                  </li>
                  <li>
                    <a href="#" onClick={() => navigateTo('register')} className={`hover:text-gray-300 flex items-center ${currentView === 'register' ? 'text-blue-300' : ''}`}>
                      <FilePenLine className="mr-2" size={20} />Register
                    </a>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main className="container mx-auto mt-8 p-4 flex-grow bg-white rounded-lg shadow-lg">
        {isFlashMessageVisible && flashMessage.message && (
          <div className={`flash-message ${flashMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} p-3 rounded-md mb-4 text-center`}>
            {flashMessage.message}
          </div>
        )}

        {(() => {
          if (!currentUser) {
            if (currentView === 'register') {
              return <RegisterComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
            } else {
              return <LoginComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} setCurrentUser={setCurrentUser} />;
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
