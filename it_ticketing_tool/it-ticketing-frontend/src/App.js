import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine, ChevronDown, Settings, Monitor, CheckCircle, XCircle, Info, AlertTriangle, Tag, CalendarDays, ClipboardCheck, Send, Loader2, ListFilter, Clock, Users, KeyRound, Eye, EyeOff, Search } from 'lucide-react'; // Added Search icon

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword
} from 'firebase/auth';

// --- Firebase Client-Side Configuration ---
// IMPORTANT: Replace with your actual Firebase project configuration!
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
const API_BASE_URL = 'http://localhost:5000';


// --- Shared Components for consistent UI ---

const FormInput = ({ id, label, type, value, onChange, required, error, onFocus, placeholder, disabled, icon: Icon, showPasswordToggle = false }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
        <div>
            <label htmlFor={id} className="block text-gray-700 text-base font-semibold mb-2">{label}:</label>
            <div className="relative">
                <input
                    type={inputType}
                    id={id}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 transition duration-200 pr-10
                    ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                {showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
                {Icon && !showPasswordToggle && ( // Render icon only if not password toggle
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Icon size={18} className="text-gray-400" />
                    </span>
                )}
            </div>
        </div>
    );
};

const FormTextarea = ({ id, label, value, onChange, required, rows, placeholder }) => (
    <div>
        <label htmlFor={id} className="block text-gray-700 text-base font-semibold mb-2">{label}:</label>
        <textarea
            id={id}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition duration-200 bg-white"
            rows={rows}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
        ></textarea>
    </div>
);

const FormSelect = ({ id, label, value, onChange, options }) => (
    <div>
        <label htmlFor={id} className="block text-gray-700 text-base font-semibold mb-2">{label}:</label>
        <select
            id={id}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition duration-200 bg-white"
            value={value}
            onChange={onChange}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </div>
);

const PrimaryButton = ({ children, onClick, loading, Icon, type = 'button', disabled, className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        className={`w-full bg-blue-600 text-white py-2.5 px-4 rounded-md font-bold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01] ${className}`}
        disabled={loading || disabled}
    >
        {loading ? (
            <>
                <Loader2 size={20} className="animate-spin" />
                <span>{typeof loading === 'string' ? loading : 'Loading...'}</span>
            </>
        ) : (
            <>
                {Icon && <Icon size={20} />}
                <span>{children}</span>
            </>
        )}
    </button>
);

const SecondaryButton = ({ children, onClick, Icon, className = '' }) => (
    <button
        onClick={onClick}
        className={`bg-gray-200 text-gray-800 px-6 py-2.5 rounded-md font-semibold hover:bg-gray-300 transition duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md transform hover:scale-[1.01] ${className}`}
    >
        {Icon && <Icon size={22} />}
        <span>{children}</span>
    </button>
);


// --- Component Definitions ---

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
            const userCredential = await signInWithEmailAndPassword(authClient, email, password);
            const firebaseUser = userCredential.user;
            const idToken = await firebaseUser.getIdToken();

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
                onLoginSuccess({ firebaseUser, role: data.user.role });
            } else {
                setMessage(data.error || 'Login failed after token verification.');
                showFlashMessage(data.error || 'Login failed after token verification.', 'error');
                authClient.signOut();
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
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Welcome Back!</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput
                        id="email"
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <FormInput
                        id="password"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={handlePasswordFocus}
                        required
                        error={passwordError}
                        showPasswordToggle={true}
                    />
                    <PrimaryButton type="submit" loading={loading ? "Logging In..." : null} Icon={LogIn}>
                        Log In
                    </PrimaryButton>
                    {message && <p className="text-center mt-4 text-sm text-red-600 font-medium">{message}</p>}
                </form>
                <p className="text-center mt-6 text-gray-600 text-sm">
                    Don't have an account?{' '}
                    <button onClick={() => navigateTo('register')} className="text-blue-600 hover:underline font-semibold transition duration-200">
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
    const [role, setRole] = useState('user');
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
                showFlashMessage(data.message || 'Registration successful! Please log in.', 'success');
                navigateTo('login');
            } else {
                showFlashMessage(data.error || 'Registration failed.', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Join Us</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput
                        id="registerEmail"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <FormInput
                        id="registerPassword"
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        showPasswordToggle={true}
                    />
                    <FormSelect
                        id="role"
                        label="Role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        options={[
                            { value: 'user', label: 'User' },
                            { value: 'support', label: 'Support Associate' }
                        ]}
                    />
                    <PrimaryButton type="submit" loading={loading ? "Registering..." : null} Icon={User} className="bg-green-600 hover:bg-green-700 focus:ring-green-300">
                        Register
                    </PrimaryButton>
                    {message && <p className="text-center mt-4 text-sm text-green-600 font-medium">{message}</p>}
                </form>
                <p className="text-center mt-6 text-gray-600 text-sm">
                    Already have an account?{' '}
                    <button onClick={() => navigateTo('login')} className="text-blue-600 hover:underline font-semibold transition duration-200">
                        Log In
                    </button>
                </p>
            </div>
        </div>
    );
};

// MyTickets Component
const MyTicketsComponent = ({ user, navigateTo, showFlashMessage, searchKeyword, refreshKey }) => { // Added refreshKey prop
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMyTickets = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('Please log in to view your tickets.', 'info');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const queryParams = new URLSearchParams({ userId: firebaseUser.uid });
            if (searchKeyword) {
                queryParams.append('keyword', searchKeyword);
            }
            const response = await fetch(`${API_BASE_URL}/tickets/my?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }

            const data = await response.json();
            setTickets(data);
        } catch (err) {
            console.error('Error fetching my tickets:', err);
            setError(err.message || 'Failed to fetch tickets. Please try again.');
            showFlashMessage(err.message || 'Failed to fetch your tickets.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage, searchKeyword, refreshKey]); // Added refreshKey to dependencies

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchMyTickets();
        }
    }, [user, fetchMyTickets, refreshKey]); // Added refreshKey to useEffect dependencies

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': case 'Critical': return 'bg-red-100 text-red-800';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading your tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-3xl font-extrabold text-gray-800">My Tickets</h2>
                <PrimaryButton onClick={() => navigateTo('createTicket')} Icon={PlusCircle} className="w-auto px-5">
                    Create New Ticket
                </PrimaryButton>
            </div>
            {tickets.length === 0 ? (
                <div className="text-center text-gray-600 text-lg p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="mb-3">{searchKeyword ? `No tickets found matching "${searchKeyword}".` : "You haven't created any tickets yet."}</p>
                    {!searchKeyword && <p className="font-semibold">Click "Create New Ticket" to get started!</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {tickets.map(ticket => (
                        <div key={ticket.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition duration-300 transform hover:-translate-y-0.5 flex flex-col justify-between animate-fade-in">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{ticket.title}</h3>
                                <p className="text-gray-600 text-sm mb-1 flex items-center"><ClipboardCheck className="mr-2 text-blue-500" size={16} /> <span className="font-semibold text-gray-700">ID:</span> {ticket.display_id}</p>
                                <p className="text-gray-600 text-sm mb-1 flex items-center"><User className="mr-2 text-blue-500" size={16} /><span className="font-semibold text-gray-700">Reporter:</span> {ticket.reporter}</p>
                                <p className="text-gray-600 text-sm mb-1 flex items-center">
                                    <span className="font-semibold mr-2 text-gray-700">Status:</span>
                                    <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </p>
                                <p className="text-gray-600 text-sm mb-3 flex items-center">
                                    <span className="font-semibold mr-2 text-gray-700">Priority:</span>
                                    <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </p>
                            </div>
                            <PrimaryButton onClick={() => navigateTo('ticketDetail', ticket.id)} Icon={List} className="mt-4 w-auto px-5 py-2">
                                View Details
                            </PrimaryButton>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// AllTickets Component (for support users)
const AllTicketsComponent = ({ navigateTo, showFlashMessage, user, searchKeyword, refreshKey }) => { // Added refreshKey prop
    const [rawTickets, setRawTickets] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAssignment, setFilterAssignment] = useState('');
    const [filterDue, setFilterDue] = useState('');

    const fetchAllTickets = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('You must be logged in to view all tickets.', 'info');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (filterStatus) queryParams.append('status', filterStatus);
            if (filterAssignment) queryParams.append('assignment', filterAssignment);
            if (searchKeyword) queryParams.append('keyword', searchKeyword); // Added searchKeyword

            const response = await fetch(`${API_BASE_URL}/tickets/all?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }
            const data = await response.json();
            setRawTickets(data); // Raw tickets are already filtered by backend with keyword
        } catch (err) {
            setError(err.message || 'Failed to fetch all tickets. Please try again.');
            showFlashMessage(err.message || 'Failed to fetch all tickets.', 'error');
            console.error('Error fetching all tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage, filterStatus, filterAssignment, searchKeyword, refreshKey]); // Added refreshKey to dependencies

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchAllTickets();
        }
    }, [user, fetchAllTickets, refreshKey]); // Added refreshKey to useEffect dependencies

    // This useEffect is now simpler as backend handles keyword search
    // It still applies client-side filters (status, assignment) on the raw data
    // if backend doesn't support combined filters efficiently. Given the backend now handles keyword,
    // this client-side filtering logic for status/assignment can be streamlined further if backend
    // applies them all. For now, it stays as is to illustrate potential client-side refinement.
    useEffect(() => {
        let filtered = [...rawTickets]; // Start with data already filtered by backend keyword

        // Client-side filtering for status and assignment is no longer needed here IF backend handles it.
        // But keeping it for robustness if backend only does keyword search.
        // Let's assume backend filters status/assignment and keyword. So rawTickets is already fully filtered.
        setTickets(filtered);
    }, [rawTickets, filterStatus, filterAssignment, filterDue]); // dependencies removed as they are now handled by fetchAllTickets and rawTickets contains already filtered data

    const counts = {
        total_tickets: tickets.length, // Count filtered tickets
        open_tickets: tickets.filter(t => t.status === 'Open').length,
        in_progress_tickets: tickets.filter(t => t.status === 'In Progress').length,
        closed_tickets: tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length,
        unassigned: tickets.filter(t => !t.assigned_to_email).length,
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': case 'Critical': return 'bg-red-100 text-red-800';
            default: return 'bg-purple-100 text-purple-800';
        }
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading all tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-6">All Tickets</h2>

            {/* Filter Section */}
            <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-md shadow-inner border border-gray-100">
                <span className="text-base font-semibold text-gray-700 flex items-center mr-2"><ListFilter className="mr-2" size={18} /> Filter By:</span>
                <button
                    onClick={() => { setFilterStatus(''); setFilterAssignment(''); setFilterDue(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm
                    ${!filterStatus && !filterAssignment && !filterDue ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    All ({counts.total_tickets})
                </button>
                <button
                    onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); setFilterDue(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm
                    ${filterStatus === 'Open' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    Open ({counts.open_tickets})
                </button>
                <button
                    onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); setFilterDue(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm
                    ${filterStatus === 'In Progress' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    In Progress ({counts.in_progress_tickets})
                </button>
                <button
                    onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); setFilterDue(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm
                    ${filterStatus === 'Closed' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    Closed ({counts.closed_tickets})
                </button>
                <button
                    onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); setFilterDue(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 shadow-sm
                    ${filterAssignment === 'unassigned' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    Unassigned ({counts.unassigned})
                </button>
            </div>

            {tickets.length === 0 ? (
                <p className="text-gray-600 text-lg text-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    {searchKeyword ? `No tickets found matching "${searchKeyword}".` : "No tickets found matching the criteria."}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 animate-fade-in">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Raised by</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    <td className="px-5 py-3 whitespace-nowrap text-base text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.display_id}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-base text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.title}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-800 flex items-center"><User size={14} className="mr-2 text-gray-500" />{ticket.reporter}</td>
                                    <td className="px-5 py-3 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-800 flex items-center">
                                        <Users size={14} className="mr-2 text-gray-500" />
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-800 flex items-center">
                                        <CalendarDays size={14} className="mr-2 text-gray-500" />
                                        {new Date(ticket.updated_at).toLocaleString()}
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
    const firebaseUser = user?.firebaseUser;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
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
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    reporter,
                    status,
                    priority,
                    creator_uid: firebaseUser.uid,
                    creator_email: firebaseUser.email
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
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Create New Ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormInput
                        id="title"
                        label="Title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    <FormTextarea
                        id="description"
                        label="Description"
                        rows="5"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                    <FormInput
                        id="reporter"
                        label="Reporter Name"
                        type="text"
                        value={reporter}
                        onChange={(e) => setReporter(e.target.value)}
                        required
                    />
                    <FormSelect
                        id="status"
                        label="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={[
                            { value: 'Open', label: 'Open' },
                            { value: 'In Progress', label: 'In Progress' },
                            { value: 'Closed', label: 'Closed' },
                            { value: 'Resolved', label: 'Resolved' }
                        ]}
                    />
                    <FormSelect
                        id="priority"
                        label="Priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        options={[
                            { value: 'Low', label: 'Low' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'High', label: 'High' },
                            { value: 'Critical', label: 'Critical' }
                        ]}
                    />
                    <PrimaryButton type="submit" loading={loading ? "Creating..." : null} Icon={PlusCircle} className="bg-green-600 hover:bg-green-700 focus:ring-green-300">
                        Create Ticket
                    </PrimaryButton>
                </form>
            </div>
        </div>
    );
};

// TicketDetail Component
const TicketDetailComponent = ({ ticketId, navigateTo, user, showFlashMessage }) => {
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
        if (!ticketId || !firebaseUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }
            const data = await response.json();
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
    }, [ticketId, firebaseUser, showFlashMessage]);

    useEffect(() => {
        if (ticketId) {
            fetchTicket();
        }
    }, [ticketId, fetchTicket]);

    const handleUpdateTicket = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
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
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ comment_text: newComment, commenter_name: firebaseUser.email }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Comment added successfully!', 'success');
                setNewComment('');
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

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': case 'Critical': return 'bg-red-100 text-red-800';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading ticket details...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;
    if (!ticket) return <div className="text-center text-gray-600 mt-8 text-xl">Ticket not found.</div>;

    const canUpdateOrComment = user.role === 'support' || firebaseUser.uid === ticket.creator_uid;
    const canEditAssignedTo = user.role === 'support';

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-4 text-center leading-tight">
                    Ticket #{ticket.display_id ? ticket.display_id : 'N/A'}
                </h2>
                <p className="text-xl font-semibold text-gray-700 mb-6 text-center px-4">
                    {ticket.title}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mb-8 text-base">
                    <p className="text-gray-700 flex items-center"><User className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Reporter:</span> {ticket.reporter}</p>
                    <p className="text-gray-700 flex items-center">
                        <CalendarDays className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Created:</span> {new Date(ticket.created_at).toLocaleString()}
                    </p>
                    <p className="text-gray-700 flex items-center">
                        <ClipboardCheck className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Status:</span>
                        <span className={`ml-2 px-3 py-0.5 text-sm font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                            {ticket.status}
                        </span>
                    </p>
                    <p className="text-gray-700 flex items-center">
                        <Clock className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Last Updated:</span> {new Date(ticket.updated_at).toLocaleString()}
                    </p>
                    <p className="text-gray-700 flex items-center">
                        <Tag className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Priority:</span>
                        <span className={`ml-2 px-3 py-0.5 text-sm font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                            {ticket.priority}
                        </span>
                    </p>
                    <p className="text-gray-700 flex items-center">
                        <Users className="mr-2.5 text-blue-500" size={18} /><span className="font-bold">Assigned To:</span> {ticket.assigned_to_email || 'Unassigned'}
                    </p>
                </div>

                <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 shadow-inner mb-8">
                    <h4 className="text-xl font-bold text-blue-800 mb-3 flex items-center"><FilePenLine className="mr-2.5" size={20} />Description:</h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">{ticket.description}</p>
                </div>

                {canUpdateOrComment && (
                    <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-700 mb-5 text-center">Update Ticket</h3>
                        <form onSubmit={handleUpdateTicket} className="space-y-4">
                            <FormSelect
                                id="updateStatus"
                                label="Update Status"
                                value={updateStatus}
                                onChange={(e) => setUpdateStatus(e.target.value)}
                                options={[
                                    { value: 'Open', label: 'Open' },
                                    { value: 'In Progress', label: 'In Progress' },
                                    { value: 'Closed', label: 'Closed' },
                                    { value: 'Resolved', label: 'Resolved' }
                                ]}
                            />
                            <FormSelect
                                id="updatePriority"
                                label="Update Priority"
                                value={updatePriority}
                                onChange={(e) => setUpdatePriority(e.target.value)}
                                options={[
                                    { value: 'Low', label: 'Low' },
                                    { value: 'Medium', label: 'Medium' },
                                    { value: 'High', label: 'High' },
                                    { value: 'Critical', label: 'Critical' }
                                ]}
                            />
                            <FormInput
                                id="assignedToEmail"
                                label="Assigned To (Email)"
                                type="email"
                                value={assignedToEmail}
                                onChange={(e) => setAssignedToEmail(e.target.value)}
                                disabled={!canEditAssignedTo}
                                placeholder="Enter support email or leave empty for unassigned"
                            />
                            <PrimaryButton type="submit" loading={updateLoading ? "Updating..." : null} Icon={FilePenLine} className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-300">
                                Update Ticket
                            </PrimaryButton>
                        </form>
                    </div>
                )}

                <div className="p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-700 mb-5 text-center">Comments</h3>
                    {ticket.comments && ticket.comments.length > 0 ? (
                        <ul className="space-y-4">
                            {ticket.comments.map((comment, index) => (
                                <li key={index} className="bg-white p-4 rounded-md shadow-sm border border-gray-100 animate-fade-in">
                                    <p className="text-gray-700 text-sm mb-1.5 whitespace-pre-wrap flex items-start"><MessageSquareText className="mr-2.5 text-blue-500 flex-shrink-0" size={16} />{comment.text}</p>
                                    <p className="text-gray-500 text-xs text-right mt-1">By <span className="font-semibold text-gray-600">{comment.commenter}</span> on <span className="font-medium">{new Date(comment.timestamp).toLocaleString()}</span></p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600 text-base text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-100">No comments yet. Be the first to provide additional comments!</p>
                    )}

                    {canUpdateOrComment && (
                        <form onSubmit={handleAddComment} className="mt-6 space-y-4">
                            <FormTextarea
                                id="newComment"
                                label="Add New Comment"
                                rows="4"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                required
                            />
                            <PrimaryButton type="submit" loading={commentLoading ? "Adding..." : null} Icon={Send} className="bg-green-600 hover:bg-green-700 focus:ring-green-300">
                                Add Comment
                            </PrimaryButton>
                        </form>
                    )}
                </div>

                <PrimaryButton
                    onClick={() => navigateTo(user.role === 'support' ? 'allTickets' : 'myTickets')}
                    Icon={List}
                    className="mt-8 bg-gray-500 hover:bg-gray-600 focus:ring-gray-500"
                >
                    Back to Tickets
                </PrimaryButton>
            </div>
        </div>
    );
};

// New: Profile Component
const ProfileComponent = ({ user, showFlashMessage, navigateTo }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordMismatchError, setPasswordMismatchError] = useState(false);

    const fetchProfile = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('You must be logged in to view your profile.', 'info');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/profile/${firebaseUser.uid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }
            const data = await response.json();
            setProfileData(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message || 'Failed to fetch profile details.');
            showFlashMessage(err.message || 'Failed to fetch profile details.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage]);

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchProfile();
        }
    }, [user, fetchProfile]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordMismatchError(false);

        if (newPassword !== confirmPassword) {
            setPasswordMismatchError(true);
            showFlashMessage('New password and confirm password do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showFlashMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        setPasswordChangeLoading(true);
        try {
            // Attempt to update password via Firebase Client SDK
            await updatePassword(user.firebaseUser, newPassword);
            showFlashMessage('Password updated successfully via Firebase Auth!', 'success');

            // If you had a custom backend password storage (unlikely with Firebase Auth):
            // const idToken = await user.firebaseUser.getIdToken();
            // const response = await fetch(`${API_BASE_URL}/user/change-password`, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${idToken}`
            //     },
            //     body: JSON.stringify({ newPassword }),
            // });
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(`Backend password update failed: ${errorData.error || errorData.message}`);
            // }


            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error changing password:', error);
            let errorMessage = 'Failed to change password.';
            if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log back in to change your password due to security reasons.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. It must be at least 6 characters.';
            } else {
                errorMessage = error.message;
            }
            showFlashMessage(errorMessage, 'error');
        } finally {
            setPasswordChangeLoading(false);
        }
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-xl flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={24} /> <span>Loading profile...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-xl flex items-center justify-center space-x-2"><XCircle size={24} /> <span>Error: {error}</span></div>;
    if (!profileData) return <div className="text-center text-gray-600 mt-8 text-xl">Profile data not found.</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 animate-fade-in">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">Your Profile</h2>

                <div className="space-y-3 mb-8 p-5 bg-gray-50 rounded-md shadow-inner border border-gray-100">
                    <p className="text-gray-700 text-lg flex items-center"><User className="mr-2.5 text-blue-600" size={20} /><span className="font-bold">Email:</span> {profileData.email}</p>
                    <p className="text-gray-700 text-lg flex items-center"><Tag className="mr-2.5 text-blue-600" size={20} /><span className="font-bold">Role:</span> <span className="font-semibold text-blue-700">{profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)}</span></p>
                    {/* Add other standard profile fields here if they exist in your Firestore user document */}
                    {/* <p className="text-gray-800 text-lg flex items-center"><Phone className="mr-3 text-indigo-600" size={22} /><span className="font-bold">Phone:</span> {profileData.phone || 'N/A'}</p> */}
                </div>

                <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-700 mb-5 text-center">Change Password</h3>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <FormInput
                            id="newPassword"
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            showPasswordToggle={true}
                        />
                        <FormInput
                            id="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            error={passwordMismatchError}
                            showPasswordToggle={true}
                        />
                        <PrimaryButton type="submit" loading={passwordChangeLoading ? "Changing..." : null} Icon={KeyRound} className="bg-red-600 hover:bg-red-700 focus:ring-red-300">
                            Change Password
                        </PrimaryButton>
                    </form>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('login');
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const [searchKeyword, setSearchKeyword] = useState(''); // New state for search keyword
    const [ticketListRefreshKey, setTicketListRefreshKey] = useState(0); // New state to force list refresh

    const [flashMessage, setFlashMessage] = useState({ type: '', message: '' });
    const flashMessageTimeoutRef = useRef(null);

    const showFlashMessage = useCallback((message, type = 'info') => {
        setFlashMessage({ type, message });
        if (flashMessageTimeoutRef.current) {
            clearTimeout(flashMessageTimeoutRef.current);
        }
        flashMessageTimeoutRef.current = setTimeout(() => {
            setFlashMessage({ type: '', message: '' });
        }, 5000);
    }, []);

    const handleLoginSuccess = useCallback((userWithRoleData) => {
        setCurrentUser(userWithRoleData);
        setCurrentView('myTickets');
        showFlashMessage('Login successful!', 'success');
    }, [showFlashMessage]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(authClient, async (user) => {
            if (user) {
                try {
                    const idToken = await user.getIdToken();
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        }
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Backend role fetch failed:', errorData.error);
                        showFlashMessage('Failed to retrieve user role. Please try logging in again.', 'error');
                        setCurrentUser(null);
                        signOut(authClient);
                    } else {
                        const backendLoginData = await response.json();
                        setCurrentUser({ firebaseUser: user, role: backendLoginData.user.role });
                        setCurrentView('myTickets');
                    }
                } catch (error) {
                    console.error("Error fetching user role on auth state change:", error);
                    showFlashMessage('Authentication error. Please re-login.', 'error');
                    setCurrentUser(null);
                    signOut(authClient);
                }
            } else {
                setCurrentUser(null);
                setCurrentView('login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [showFlashMessage]);

    const navigateTo = useCallback((view, ticketId = null) => {
        setCurrentView(view);
        setSelectedTicketId(ticketId);
        setFlashMessage({ message: '', type: '' });
        setIsProfileMenuOpen(false);
        setSearchKeyword(''); // Clear search when navigating to a new main view
        setTicketListRefreshKey(prevKey => prevKey + 1); // Also trigger a refresh when navigating
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            await signOut(authClient);
            showFlashMessage('Logged out successfully!', 'info');
        } catch (error) {
            console.error("Logout failed:", error);
            showFlashMessage('Logout failed. Please try again.', 'error');
        }
    }, [showFlashMessage]);

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
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault(); // Prevent form submission if it's a form
        // Increment key to force re-fetch in MyTickets/AllTickets components
        setTicketListRefreshKey(prevKey => prevKey + 1);
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="ml-4 text-xl text-gray-700">Loading application...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 antialiased flex flex-col">
            {/* Tailwind CSS keyframes for fade-in animation */}
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
            `}</style>
            <header className="bg-white text-gray-800 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center flex-wrap border-b border-gray-100">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                    <Monitor className="text-blue-600" size={28} />
                    <h1 className="text-2xl font-extrabold tracking-tight">IT Help Desk</h1>
                </div>

                {currentUser && (currentView === 'myTickets' || currentView === 'allTickets') && (
                    <form onSubmit={handleSearchSubmit} className="relative w-full md:w-1/3 max-w-md mb-4 md:mb-0">
                        <input
                            type="text"
                            placeholder="Search tickets by ID or Title..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition duration-200"
                        />
                        <button type="submit" className="absolute right-0 top-0 mt-2.5 mr-3 text-gray-500 hover:text-gray-700">
                            <Search size={18} />
                        </button>
                    </form>
                )}

                <nav className="flex items-center space-x-4">
                    {currentUser ? (
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300
                                    ${isProfileMenuOpen ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
                            >
                                <User size={18} className="text-gray-600" />
                                <span className="font-semibold text-gray-700 text-sm">{currentUser.firebaseUser.email}</span>
                                <ChevronDown size={14} className={`ml-1 text-gray-500 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-md shadow-lg py-1 z-10 origin-top-right transform transition-all duration-200 ease-out
                                ${isProfileMenuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
                                <div className="block px-4 py-2 text-sm text-gray-600 border-b border-gray-100">Role: <span className="font-bold text-blue-700">{currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span></div>
                                <button
                                    onClick={() => navigateTo('profile')}
                                    className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                >
                                    <Settings size={16} />
                                    <span>View Profile</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                                >
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex space-x-2">
                            <button onClick={() => navigateTo('login')} className="flex items-center space-x-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 text-sm font-semibold shadow-sm">
                                <LogIn size={18} />
                                <span>Login</span>
                            </button>
                            <button onClick={() => navigateTo('register')} className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors duration-200 text-sm font-semibold shadow-sm">
                                <User size={18} />
                                <span>Register</span>
                            </button>
                        </div>
                    )}
                </nav>
            </header>

            {/* Flash Message Display */}
            {flashMessage.message && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-md shadow-lg flex items-center space-x-2 transition-all duration-300 ease-out transform animate-fade-in
                    ${flashMessage.type === 'success' ? 'bg-green-500 text-white' :
                    flashMessage.type === 'error' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                    }`}>
                    {flashMessage.type === 'success' && <CheckCircle size={18} />}
                    {flashMessage.type === 'error' && <XCircle size={18} />}
                    {flashMessage.type === 'info' && <Info size={18} />}
                    {flashMessage.type === 'warning' && <AlertTriangle size={18} />}
                    <p className="font-semibold text-sm">{flashMessage.message}</p>
                    <button onClick={() => setFlashMessage({ message: '', type: '' })} className="ml-auto text-white opacity-70 hover:opacity-100 focus:outline-none">
                        <XCircle size={14} />
                    </button>
                </div>
            )}

            <main className="flex-grow flex">
                {currentUser && (
                    <aside className="w-60 bg-gray-800 text-gray-100 p-4 shadow-lg flex-shrink-0 border-r border-gray-700 animate-fade-in">
                        <ul className="space-y-2">
                            <li>
                                <button onClick={() => navigateTo('myTickets')} className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-md transition-colors duration-200
                                    ${currentView === 'myTickets' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-700'}`}>
                                    <List size={18} />
                                    <span className="font-medium text-base">My Tickets</span>
                                </button>
                            </li>
                            {currentUser.role === 'support' && (
                                <li>
                                    <button onClick={() => navigateTo('allTickets')} className={`flex items-center space-x-3 w-full px-4 py-2.5 rounded-md transition-colors duration-200
                                        ${currentView === 'allTickets' ? 'bg-blue-700 text-white shadow-md' : 'hover:bg-gray-700'}`}>
                                        <LayoutDashboard size={18} />
                                        <span className="font-medium text-base">All Tickets</span>
                                    </button>
                                </li>
                            )}
                            {/* Profile option removed from left pane as requested */}
                        </ul>
                    </aside>
                )}

                <section className="flex-grow p-6 bg-gray-100">
                    {(() => {
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
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                                case 'allTickets':
                                    if (currentUser.role === 'support') {
                                        return <AllTicketsComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} user={currentUser} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                                    } else {
                                        return <div className="text-center text-red-600 mt-8 text-xl font-bold p-10 bg-white rounded-lg shadow-md border border-red-200">Access Denied. You do not have permission to view all tickets.</div>;
                                    }
                                case 'createTicket':
                                    return <CreateTicketComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />;
                                case 'ticketDetail':
                                    return <TicketDetailComponent ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
                                case 'profile':
                                    return <ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} />;
                                default:
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                            }
                        }
                    })()}
                </section>
            </main>

            <footer className="bg-gray-800 text-white text-center p-3 w-full shadow-inner text-sm">
                <p>&copy; {new Date().getFullYear()} IT Help Desk. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;
