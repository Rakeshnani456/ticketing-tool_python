import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine, ChevronDown, Settings, Monitor, CheckCircle, XCircle, Info, AlertTriangle, Tag, CalendarDays, ClipboardCheck, Send, Loader2, ListFilter, Clock, Users, KeyRound, Eye, EyeOff, Search, FileUp, Download, Link, X } from 'lucide-react';

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
const firebaseConfig = {
    apiKey: "AIzaSyDZVwd_WHUw8RzUfkVklT7_9U6Mc-FNL-o",
    authDomain: "it-ticketing-tool-dd679.firebaseapp.com",
    projectId: "it-ticketing-tool-dd679",
    storageBucket: "it-ticketing-tool-dd679.firebasestorage.app",
    messagingSenderId: "919553361675",
    appId: "1:919553361675:web:ae1be7140926013786840e",
    measurementId: "G-HCVXC67K86"
};

const app = initializeApp(firebaseConfig);
const authClient = getAuth(app);

// --- API Base URL for your Node.js Backend ---
const API_BASE_URL = 'http://localhost:5000';


// --- Shared Components for consistent UI ---

const FormInput = ({ id, label, type, value, onChange, required, error, onFocus, placeholder, disabled, icon: Icon, showPasswordToggle = false, maxLength }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
        <div>
            {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
            <div className="relative">
                <input
                    type={inputType}
                    id={id}
                    className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200 pr-9
                    ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={maxLength}
                />
                {showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
                {Icon && !showPasswordToggle && (
                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <Icon size={16} className="text-gray-400" />
                    </span>
                )}
            </div>
        </div>
    );
};

const FormTextarea = ({ id, label, value, onChange, required, rows, placeholder, disabled, maxLength }) => (
    <div>
        {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
        <textarea
            id={id}
            className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-200 bg-white'}`}
            rows={rows}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
        ></textarea>
    </div>
);

const FormSelect = ({ id, label, value, onChange, options, required, disabled }) => (
    <div>
        {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
        <select
            id={id}
            className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-200 bg-white'}`}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
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
        className={`w-full bg-blue-600 text-white py-2 px-3 rounded-md font-bold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01] ${className}`}
        disabled={loading || disabled}
    >
        {loading ? (
            <>
                <Loader2 size={16} className="animate-spin" />
                <span>{typeof loading === 'string' ? loading : 'Loading...'}</span>
            </>
        ) : (
            <>
                {Icon && <Icon size={16} />}
                <span>{children}</span>
            </>
        )}
    </button>
);

const SecondaryButton = ({ children, onClick, Icon, className = '', type = 'button', disabled }) => (
    <button
        onClick={onClick}
        type={type}
        className={`bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold text-sm hover:bg-gray-300 transition duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        disabled={disabled}
    >
        {Icon && <Icon size={18} />}
        <span>{children}</span>
    </button>
);

const LinkButton = ({ children, onClick, className = '' }) => (
    <button
        type="button"
        onClick={onClick}
        className={`text-blue-600 hover:underline font-semibold text-sm transition duration-200 ${className}`}
    >
        {children}
    </button>
);

// Modal Component for popups
const Modal = ({ children, title, onClose, isOpen }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>
                {title && <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">{title}</h2>}
                {children}
            </div>
        </div>
    );
};

// Login Component
const LoginComponent = ({ onLoginSuccess, navigateTo, showFlashMessage }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            showFlashMessage(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordFocus = () => {
        setPasswordError(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-offwhite p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-200 animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-5 text-center">Welcome Back!</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
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
                </form>
                <p className="text-center mt-4 text-gray-600 text-xs">
                    Don't have an account?{' '}
                    <LinkButton onClick={() => navigateTo('register')}>
                        Register here
                    </LinkButton>
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
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-offwhite p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm border border-gray-200 animate-fade-in">
                <h2 className="text-2xl font-extrabold text-gray-800 mb-5 text-center">Join Us</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
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
                </form>
                <p className="text-center mt-4 text-gray-600 text-xs">
                    Already have an account?{' '}
                    <LinkButton onClick={() => navigateTo('login')}>
                        Log In
                    </LinkButton>
                </p>
            </div>
        </div>
    );
};

// --- New Component: CreateTicketComponent ---
const CreateTicketComponent = ({ user, onClose, showFlashMessage, onTicketCreated }) => {
    const [formData, setFormData] = useState({
        request_for_email: user?.email || '',
        category: '',
        short_description: '',
        long_description: '',
        contact_number: '',
        priority: '',
        hostname_asset_id: '',
        attachments: []
    });
    const [loading, setLoading] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);

    const categories = [
        { value: '', label: 'Select Category' },
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'troubleshoot', label: 'Troubleshoot' },
    ];
    const priorities = [
        { value: '', label: 'Select Priority' },
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, request_for_email: user.email }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        let totalSize = 0;

        for (const file of files) {
            // Check file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PDF, JPG, PNG, Word.`, 'error');
                continue;
            }
            // Check file size (max 10MB per file)
            if (file.size > 10 * 1024 * 1024) {
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue;
            }
            totalSize += file.size;
            validFiles.push(file);
        }

        // You might want a total upload limit as well, e.g., 50MB
        if (totalSize > 50 * 1024 * 1024) { // Example: 50MB total limit
            showFlashMessage('Total attachment size exceeds 50MB. Please select fewer files.', 'error');
            setAttachmentFiles([]); // Clear selection if total size is too large
        } else {
            setAttachmentFiles(validFiles);
        }
    };


    const uploadAttachments = async () => {
        if (attachmentFiles.length === 0) return [];

        setUploadingAttachments(true);
        const uploadedUrls = [];
        for (const file of attachmentFiles) {
            const formData = new FormData();
            formData.append('attachment', file);

            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.files && data.files.length > 0) {
                        uploadedUrls.push(data.files[0].url);
                    }
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
            }
        }
        setUploadingAttachments(false);
        return uploadedUrls;
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        showFlashMessage('Creating ticket...', 'info');

        try {
            // 1. Upload attachments first
            const uploadedAttachmentUrls = await uploadAttachments();
            // If attachments were selected but not all uploaded successfully, prevent ticket creation
            if (attachmentFiles.length > uploadedAttachmentUrls.length) {
                // Some files might have failed validation or upload.
                // If there are valid files uploaded, proceed, otherwise show error.
                if (uploadedAttachmentUrls.length === 0 && attachmentFiles.length > 0) {
                    showFlashMessage('No attachments were uploaded successfully. Ticket not created.', 'error');
                    setLoading(false);
                    return;
                }
            }

            // 2. Create ticket with attachment URLs
            const idToken = await user.firebaseUser.getIdToken();
            const payload = {
                ...formData,
                attachments: uploadedAttachmentUrls // Pass the URLs of successfully uploaded attachments
            };

            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Ticket created successfully!', 'success');
                setFormData({ // Reset form
                    request_for_email: user?.email || '',
                    category: '',
                    short_description: '',
                    long_description: '',
                    contact_number: '',
                    priority: '',
                    hostname_asset_id: '',
                    attachments: []
                });
                setAttachmentFiles([]); // Clear selected files
                onTicketCreated(); // Notify parent to refresh ticket list
                onClose(); // Close the modal
            } else {
                showFlashMessage(data.error || 'Failed to create ticket.', 'error');
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            showFlashMessage('Network error or server unreachable during ticket creation.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-2">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                    id="request_for_email"
                    label="*Request for (Email)"
                    type="email"
                    value={formData.request_for_email}
                    onChange={handleChange}
                    required
                    placeholder="e.g., user@company.com"
                />
                <FormSelect
                    id="category"
                    label="*Category"
                    value={formData.category}
                    onChange={handleChange}
                    options={categories}
                    required
                />
                <FormInput
                    id="short_description"
                    label="*Short Description (max 250 characters)"
                    type="text"
                    value={formData.short_description}
                    onChange={handleChange}
                    required
                    maxLength={250}
                    placeholder="Brief summary of the issue"
                />
                <FormTextarea
                    id="long_description"
                    label="Long Description"
                    value={formData.long_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Provide detailed information about the issue"
                />
                <div>
                    <label htmlFor="attachments" className="block text-gray-700 text-sm font-semibold mb-1">Attachments (PDF, JPG, PNG, Word - max 10MB per file):</label>
                    <input
                        type="file"
                        id="attachments"
                        multiple
                        onChange={handleFileChange}
                        className="w-full text-gray-700 text-sm bg-white border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {attachmentFiles.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                            Selected files: {attachmentFiles.map(file => file.name).join(', ')}
                        </div>
                    )}
                </div>
                <FormInput
                    id="contact_number"
                    label="*Contact Number"
                    type="text"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                    placeholder="e.g., +91-9876543210"
                />
                <FormSelect
                    id="priority"
                    label="*Priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={priorities}
                    required
                />
                <FormInput
                    id="hostname_asset_id"
                    label="*Hostname / LaptopID / AssetID"
                    type="text"
                    value={formData.hostname_asset_id}
                    onChange={handleChange}
                    required
                    placeholder="e.g., LPT-XYZ-001, Server-ABC"
                />
                <div className="flex justify-end space-x-3 pt-3">
                    <SecondaryButton onClick={onClose} className="w-auto px-4 py-1.5">
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton type="submit" loading={loading || uploadingAttachments ? (uploadingAttachments ? "Uploading Files..." : "Creating Ticket...") : null} Icon={Send} className="w-auto px-4 py-1.5">
                        Submit Ticket
                    </PrimaryButton>
                </div>
            </form>
        </div>
    );
};


// --- MyTickets Component (Refactored for list view and clickable ID) ---
const MyTicketsComponent = ({ user, navigateTo, showFlashMessage, searchKeyword, refreshKey }) => {
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
    }, [user, showFlashMessage, searchKeyword, refreshKey]);

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchMyTickets();
        }
    }, [user, fetchMyTickets, refreshKey]);

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': return 'bg-red-100 text-red-800';
            case 'Critical': return 'bg-red-200 text-red-900 border border-red-500';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading your tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-extrabold text-gray-800">My Tickets (Home)</h2> {/* Updated label */}
                <LinkButton onClick={() => navigateTo('createTicket')} className="text-sm flex items-center space-x-1">
                    <PlusCircle size={16} /> <span>Create Ticket</span> {/* Link style for Create Ticket */}
                </LinkButton>
            </div>
            {tickets.length === 0 ? (
                <div className="text-center text-gray-600 text-sm p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <p className="mb-2">{searchKeyword ? `No tickets found matching "${searchKeyword}".` : "You haven't created any tickets yet."}</p>
                    {!searchKeyword && <p className="font-semibold">Click "Create Ticket" to get started!</p>}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.display_id}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.short_description}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.category}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A'}
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

// --- AllTickets Component (for support users) ---
const AllTicketsComponent = ({ navigateTo, showFlashMessage, user, searchKeyword, refreshKey, initialFilterAssignment = '', showFilters = true }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAssignment, setFilterAssignment] = useState(initialFilterAssignment);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchAllTickets = useCallback(async () => {
        const firebaseUser = user?.firebaseUser;
        if (!firebaseUser) {
            setLoading(false);
            showFlashMessage('You must be logged in to view tickets.', 'info');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const idToken = await firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (filterStatus) queryParams.append('status', filterStatus);
            if (filterAssignment) queryParams.append('assignment', filterAssignment);
            if (searchKeyword) queryParams.append('keyword', searchKeyword);

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
            setTickets(data);
        } catch (err) {
            setError(err.message || 'Failed to fetch tickets. Please try again.');
            showFlashMessage(err.message || 'Failed to fetch tickets.', 'error');
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage, filterStatus, filterAssignment, searchKeyword, refreshKey]);

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchAllTickets();
        }
    }, [user, fetchAllTickets, refreshKey]);

    // Reset filters when initialFilterAssignment changes (e.g., navigating from All Tickets to Assigned To Me)
    useEffect(() => {
        setFilterAssignment(initialFilterAssignment);
        setFilterStatus(''); // Clear status filter when changing assignment filter
    }, [initialFilterAssignment]);


    const handleExport = async () => {
        setLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);

            const response = await fetch(`${API_BASE_URL}/tickets/export?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showFlashMessage('Tickets exported successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(`Export failed: ${errorData.error || 'Server error'}`, 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            showFlashMessage('Network error during export.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': return 'bg-red-100 text-red-800';
            case 'Critical': return 'bg-red-200 text-red-900 border border-red-500';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    const counts = {
        total_tickets: tickets.length,
        open_tickets: tickets.filter(t => t.status === 'Open').length,
        in_progress_tickets: tickets.filter(t => t.status === 'In Progress').length,
        hold_tickets: tickets.filter(t => t.status === 'Hold').length,
        closed_resolved_tickets: tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved').length,
        unassigned: tickets.filter(t => !t.assigned_to_email).length,
        assigned_to_me: tickets.filter(t => t.assigned_to_id === user.firebaseUser.uid).length
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading tickets...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4">{initialFilterAssignment === 'assigned_to_me' ? `Tickets Assigned to Me (${counts.assigned_to_me})` : `All Tickets`}</h2>

            {/* Informational message for filter behavior (only if filters are shown) */}
            {showFilters && (
                <p className="text-sm text-gray-600 mb-4 p-2 bg-blue-50 rounded-md border border-blue-200">
                    This view shows all tickets. Use the filters below or search by Ticket ID to refine the list.
                </p>
            )}

            {/* Filter and Export Section (Conditional Rendering) */}
            {showFilters && (
                <div className="mb-4 p-3 bg-gray-50 rounded-md shadow-inner border border-gray-100 flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-semibold text-gray-700 flex items-center"><ListFilter className="mr-1" size={16} /> Filter By:</span>
                    {/* Filter buttons for status */}
                    <button onClick={() => { setFilterStatus(''); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${!filterStatus && !filterAssignment ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > All ({counts.total_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Open' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > Open ({counts.open_tickets}) </button>
                    <button onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'In Progress' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > In Progress ({counts.in_progress_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Hold' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > On Hold ({counts.hold_tickets}) </button>
                    <button onClick={() => { setFilterStatus('Closed'); setFilterAssignment(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterStatus === 'Closed' ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > Closed/Resolved ({counts.closed_resolved_tickets}) </button>
                    
                    {/* Filter buttons for assignment */}
                    <button onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'unassigned' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > Unassigned ({counts.unassigned}) </button>
                    <button onClick={() => { setFilterAssignment('assigned_to_me'); setFilterStatus(''); }} className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 shadow-sm ${filterAssignment === 'assigned_to_me' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-300' }`} > Assigned to Me ({counts.assigned_to_me}) </button>

                    <div className="flex items-center space-x-2 ml-auto">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-1 border border-gray-300 rounded-md text-xs" />
                        <span className="text-sm">to</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-1 border border-gray-300 rounded-md text-xs" />
                        <PrimaryButton onClick={handleExport} Icon={Download} className="w-auto px-3 py-1 text-xs" disabled={loading}>
                            Export
                        </PrimaryButton>
                    </div>
                </div>
            )}

            {tickets.length === 0 ? (
                <p className="text-gray-600 text-sm text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    {searchKeyword ? `No tickets found matching "${searchKeyword}".` : "No tickets found matching the criteria."}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 bg-white">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Description</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Raised by</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Last Updated</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time Spent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets.map(ticket => (
                                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors duration-150 odd:bg-white even:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-blue-700 hover:underline font-medium cursor-pointer" onClick={() => navigateTo('ticketDetail', ticket.id)}>
                                        {ticket.display_id}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.short_description}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800 flex items-center"><User size={12} className="mr-1" />{ticket.reporter_email}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.category}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-800">
                                        {ticket.time_spent_minutes !== null ? `${ticket.time_spent_minutes} mins` : 'N/A'}
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

// --- Profile Component ---
const ProfileComponent = ({ user, showFlashMessage, navigateTo, handleLogout }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const fetchProfile = useCallback(async () => {
        if (!user || !user.firebaseUser) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/profile/${user.firebaseUser.uid}`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setProfile(data);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Failed to fetch profile.');
                showFlashMessage(errorData.error || 'Failed to fetch profile.', 'error');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Network error or server unreachable.');
            showFlashMessage('Network error or server unreachable.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showFlashMessage]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            showFlashMessage('New password and confirm password do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters long.');
            showFlashMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        setPasswordChangeLoading(true);
        try {
            await updatePassword(user.firebaseUser, newPassword);
            showFlashMessage('Password updated successfully!', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Password change error:', err);
            let errorMessage = 'Failed to update password.';
            if (err.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log in again to update your password.';
            } else {
                errorMessage = err.message;
            }
            setPasswordError(errorMessage);
            showFlashMessage(errorMessage, 'error');
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading profile...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;
    if (!profile) return <div className="text-center text-gray-600 mt-8 text-base">No profile data available.</div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">My Profile</h2>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl mx-auto border border-gray-200">
                <div className="mb-6 space-y-3">
                    <p className="text-sm text-gray-700 flex items-center"><User size={16} className="mr-2 text-blue-500" /> <span className="font-semibold">Email:</span> {profile.email}</p>
                    <p className="text-sm text-gray-700 flex items-center"><KeyRound size={16} className="mr-2 text-purple-500" /> <span className="font-semibold">Role:</span> <span className="capitalize">{profile.role}</span></p>
                </div>

                <h3 className="text-lg font-bold text-gray-800 mb-3">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
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
                        showPasswordToggle={true}
                        error={!!passwordError}
                    />
                    {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    <PrimaryButton type="submit" loading={passwordChangeLoading ? "Updating..." : null} Icon={FilePenLine} className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-300">
                        Update Password
                    </PrimaryButton>
                </form>
                {/* Logout button moved here */}
                <div className="mt-6 border-t pt-4 border-gray-200">
                    <PrimaryButton onClick={handleLogout} Icon={LogOut} className="bg-red-600 hover:bg-red-700 focus:ring-red-300">
                        Log Out
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
};


// --- TicketDetail Component ---
const TicketDetailComponent = ({ ticketId, navigateTo, user, showFlashMessage }) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);

    // Editable fields state
    const [editableFields, setEditableFields] = useState({
        request_for_email: '',
        short_description: '',
        long_description: '',
        contact_number: '',
        priority: '',
        status: '',
        assigned_to_email: ''
    });

    const isSupportUser = user?.role === 'support';

    const categories = [
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'troubleshoot', label: 'Troubleshoot' },
    ];

    const priorities = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    const statuses = [
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Hold', label: 'On Hold' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Closed', label: 'Closed' },
    ];

    const fetchTicketDetails = useCallback(async () => {
        if (!ticketId || !user?.firebaseUser) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTicket(data);
                // Initialize editable fields with current ticket data
                setEditableFields({
                    request_for_email: data.request_for_email || '',
                    short_description: data.short_description || '',
                    long_description: data.long_description || '',
                    contact_number: data.contact_number || '',
                    priority: data.priority || '',
                    status: data.status || '',
                    assigned_to_email: data.assigned_to_email || ''
                });
            } else {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message}`);
            }
        } catch (err) {
            console.error('Error fetching ticket details:', err);
            setError(err.message || 'Failed to fetch ticket details.');
            showFlashMessage(err.message || 'Failed to fetch ticket details.', 'error');
        } finally {
            setLoading(false);
        }
    }, [ticketId, user, showFlashMessage]);

    useEffect(() => {
        fetchTicketDetails();
    }, [fetchTicketDetails]);


    const isTicketClosedOrResolved = ticket && ['Resolved', 'Closed'].includes(ticket.status);
    // Determine if user can edit: is support OR is reporter AND ticket is not closed/resolved
    const canEdit = isSupportUser || (ticket && ticket.reporter_id === user?.firebaseUser.uid && !isTicketClosedOrResolved);
    const canAddComments = !isTicketClosedOrResolved;
    const canAddAttachments = !isTicketClosedOrResolved;


    const handleEditChange = (e) => {
        const { id, value } = e.target;
        setEditableFields(prev => ({ ...prev, [id]: value }));
    };

    const handleUpdateTicket = async () => {
        setUpdateLoading(true);
        showFlashMessage('Updating ticket...', 'info');
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const payload = {
                ...editableFields
            };

            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Ticket updated successfully!', 'success');
                setIsEditing(false);
                fetchTicketDetails(); // Re-fetch to get latest data
            } else {
                showFlashMessage(data.error || 'Failed to update ticket.', 'error');
            }
        } catch (error) {
            console.error('Update ticket error:', error);
            showFlashMessage('Network error or server unreachable during update.', 'error');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showFlashMessage('Comment text cannot be empty.', 'error');
            return;
        }
        setCommentLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ comment_text: commentText, commenter_name: user?.email }),
            });
            const data = await response.json();
            if (response.ok) {
                showFlashMessage(data.message || 'Comment added!', 'success');
                setCommentText('');
                fetchTicketDetails(); // Re-fetch to get latest comments
            } else {
                showFlashMessage(data.error || 'Failed to add comment.', 'error');
            }
        } catch (error) {
            console.error('Add comment error:', error);
            showFlashMessage('Network error or server unreachable during comment addition.', 'error');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PDF, JPG, PNG, Word.`, 'error');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue;
            }
            validFiles.push(file);
        }
        setAttachmentFiles(validFiles);
    };

    const handleAddAttachmentsToTicket = async () => {
        if (attachmentFiles.length === 0) {
            showFlashMessage('No files selected for upload.', 'info');
            return;
        }
        setUploadingAttachments(true);
        showFlashMessage('Uploading attachments...', 'info');
        const uploadedUrls = [];
        for (const file of attachmentFiles) {
            const formData = new FormData();
            formData.append('attachment', file);

            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` },
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.files && data.files.length > 0) {
                        uploadedUrls.push(data.files[0].url);
                    }
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
            }
        }

        if (uploadedUrls.length > 0) {
            try {
                const idToken = await user.firebaseUser.getIdToken();
                // Patch the ticket to add new attachment URLs.
                // The backend uses arrayUnion, so this will add to existing attachments.
                const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ attachments: uploadedUrls }), // Send only the new URLs to be added
                });
                if (response.ok) {
                    showFlashMessage('Attachments added to ticket successfully!', 'success');
                    setAttachmentFiles([]); // Clear selected files after successful upload and update
                    fetchTicketDetails(); // Re-fetch to show new attachments
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to update ticket with attachments: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Update ticket with attachments error:', error);
                showFlashMessage('Network error during updating ticket with attachments.', 'error');
            }
        } else if (attachmentFiles.length > 0) {
             showFlashMessage('No attachments were successfully uploaded to add to the ticket.', 'error');
        }
        setUploadingAttachments(false);
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': return 'bg-red-100 text-red-800';
            case 'Critical': return 'bg-red-200 text-red-900 border border-red-500';
            default: return 'bg-purple-100 text-purple-800';
        }
    };


    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading ticket details...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;
    if (!ticket) return <div className="text-center text-gray-600 mt-8 text-base">Ticket not found.</div>;

    return (
        <div className="p-4 bg-offwhite flex-1 overflow-auto">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">Ticket: {ticket.display_id}</h2>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto border border-gray-200">
                {/* Ticket Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mb-6">
                    <div>
                        <p className="text-gray-600 text-sm mb-1"><strong>Requested For:</strong> {isEditing && (canEdit || isSupportUser) ? (
                            <FormInput
                                id="request_for_email"
                                type="email"
                                value={editableFields.request_for_email}
                                onChange={handleEditChange}
                                disabled={!canEdit && !isSupportUser || isTicketClosedOrResolved}
                                className="inline-block w-auto"
                                label="" // Label is already in strong tag
                            />
                        ) : ticket.request_for_email}</p>
                        <p className="text-gray-600 text-sm mb-1"><strong>Category:</strong> {ticket.category}</p>
                        <p className="text-gray-600 text-sm mb-1"><strong>Contact No:</strong> {isEditing && canEdit ? (
                            <FormInput
                                id="contact_number"
                                type="text"
                                value={editableFields.contact_number}
                                onChange={handleEditChange}
                                disabled={!canEdit || isTicketClosedOrResolved}
                                className="inline-block w-auto"
                                label="" // Label is already in strong tag
                            />
                        ) : ticket.contact_number}</p>
                        <p className="text-gray-600 text-sm mb-1"><strong>Hostname/Asset ID:</strong> {ticket.hostname_asset_id}</p>
                        <p className="text-gray-600 text-sm mb-1">
                            <strong>Priority:</strong> {isEditing && canEdit ? (
                                <FormSelect
                                    id="priority"
                                    value={editableFields.priority}
                                    onChange={handleEditChange}
                                    options={priorities}
                                    disabled={!canEdit || isTicketClosedOrResolved}
                                    className="inline-block w-auto"
                                    label="" // Label is already in strong tag
                                />
                            ) : (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>
                                    {ticket.priority}
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600 text-sm mb-1"><strong>Status:</strong> {isEditing && isSupportUser ? (
                            <FormSelect
                                id="status"
                                value={editableFields.status}
                                onChange={handleEditChange}
                                options={statuses}
                                disabled={!isSupportUser}
                                className="inline-block w-auto"
                                label="" // Label is already in strong tag
                            />
                        ) : (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>
                                {ticket.status}
                            </span>
                        )}</p>
                        {isSupportUser && (
                            <p className="text-gray-600 text-sm mb-1">
                                <strong>Assigned To:</strong> {isEditing && isSupportUser ? (
                                    <FormInput
                                        id="assigned_to_email"
                                        type="email"
                                        value={editableFields.assigned_to_email || ''}
                                        onChange={handleEditChange}
                                        placeholder="Enter email to assign"
                                        disabled={!isSupportUser || isTicketClosedOrResolved}
                                        className="inline-block w-auto"
                                        label="" // Label is already in strong tag
                                    />
                                ) : (ticket.assigned_to_email || 'Unassigned')}
                            </p>
                        )}
                        <p className="text-gray-600 text-sm mb-1"><strong>Reporter Email:</strong> {ticket.reporter_email}</p>
                        <p className="text-gray-600 text-sm mb-1"><strong>Created At:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                        <p className="text-gray-600 text-sm mb-1"><strong>Last Updated:</strong> {new Date(ticket.updated_at).toLocaleString()}</p>
                        {ticket.resolved_at && (
                            <p className="text-gray-600 text-sm mb-1"><strong>Resolved At:</strong> {new Date(ticket.resolved_at).toLocaleString()}</p>
                        )}
                        {ticket.time_spent_minutes !== null && (
                            <p className="text-gray-600 text-sm mb-1"><strong>Time Spent:</strong> {ticket.time_spent_minutes} minutes</p>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Short Description:</h3>
                    {isEditing && canEdit ? (
                        <FormTextarea
                            id="short_description"
                            value={editableFields.short_description}
                            onChange={handleEditChange}
                            rows={2}
                            maxLength={250}
                            disabled={!canEdit || isTicketClosedOrResolved}
                            label="" // Label is already in strong tag
                        />
                    ) : (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md border border-gray-200">{ticket.short_description}</p>
                    )}
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Long Description:</h3>
                    {isEditing && canEdit ? (
                        <FormTextarea
                            id="long_description"
                            value={editableFields.long_description}
                            onChange={handleEditChange}
                            rows={6}
                            disabled={!canEdit || isTicketClosedOrResolved}
                            label="" // Label is already in strong tag
                        />
                    ) : (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md border border-gray-200 whitespace-pre-wrap">{ticket.long_description || 'No long description provided.'}</p>
                    )}
                </div>

                {/* Attachments Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Attachments:</h3>
                    {ticket.attachments && ticket.attachments.length > 0 ? (
                        <ul className="list-disc pl-5 text-blue-700 text-sm">
                            {ticket.attachments.map((url, index) => (
                                <li key={index} className="mb-1">
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                        <Link size={14} className="mr-1" />
                                        {url.substring(url.lastIndexOf('/') + 1)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600 text-sm">No attachments for this ticket.</p>
                    )}

                    {canAddAttachments && ( // Only show if ticket is not closed/resolved
                        <div className="mt-3 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
                            <label htmlFor="addAttachments" className="block text-gray-700 text-sm font-semibold mb-1">Add More Attachments:</label>
                            <input
                                type="file"
                                id="addAttachments"
                                multiple
                                onChange={handleFileChange}
                                className="w-full text-gray-700 text-sm bg-white border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {attachmentFiles.length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                    Selected for upload: {attachmentFiles.map(file => file.name).join(', ')}
                                </div>
                            )}
                            <PrimaryButton onClick={handleAddAttachmentsToTicket} Icon={FileUp} className="mt-3 w-auto px-4 py-1.5" disabled={uploadingAttachments || attachmentFiles.length === 0}>
                                {uploadingAttachments ? 'Uploading...' : 'Upload Attachments'}
                            </PrimaryButton>
                        </div>
                    )}
                </div>


                {/* Edit/Update Buttons */}
                <div className="flex justify-end space-x-3 mb-6">
                    {canEdit && !isEditing && !isTicketClosedOrResolved && ( // Only allow editing if not closed/resolved
                        <SecondaryButton onClick={() => setIsEditing(true)} Icon={FilePenLine} className="px-4 py-1.5">
                            Edit Ticket
                        </SecondaryButton>
                    )}
                    {isEditing && (
                        <>
                            <SecondaryButton onClick={() => setIsEditing(false)} disabled={updateLoading} className="px-4 py-1.5">
                                Cancel Edit
                            </SecondaryButton>
                            <PrimaryButton onClick={handleUpdateTicket} loading={updateLoading ? "Updating..." : null} Icon={CheckCircle} className="px-4 py-1.5">
                                Save Changes
                            </PrimaryButton>
                        </>
                    )}
                </div>


                {/* Comments Section */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Comments</h3>
                    <div className="space-y-3 mb-4">
                        {ticket.comments && ticket.comments.length > 0 ? (
                            [...ticket.comments].reverse().map((comment, index) => ( // Display in reverse chronological order
                                <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <p className="text-gray-800 text-sm mb-1">{comment.text}</p>
                                    <p className="text-gray-500 text-xs text-right">
                                        — {comment.commenter} at {new Date(comment.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-600 text-sm">No comments yet.</p>
                        )}
                    </div>

                    {canAddComments && ( // Only show if ticket is not closed/resolved
                        <form onSubmit={handleAddComment} className="space-y-3">
                            <FormTextarea
                                id="comment"
                                label="Add a Comment"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                rows={3}
                                placeholder="Type your comment here..."
                                disabled={commentLoading}
                            />
                            <PrimaryButton type="submit" loading={commentLoading ? "Adding Comment..." : null} Icon={MessageSquareText} className="w-auto px-4 py-1.5">
                                Add Comment
                            </PrimaryButton>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('myTickets');
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [flashMessage, setFlashMessage] = useState(null);
    const [flashType, setFlashType] = useState('info');
    const flashMessageTimeoutRef = useRef(null);
    const [ticketListRefreshKey, setTicketListRefreshKey] = useState(0);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); // State for profile dropdown
    const [ticketCounts, setTicketCounts] = useState({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // New state for counts

    const fetchTicketCounts = useCallback(async (user) => {
        if (!user || !user.firebaseUser) return;
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/tickets/summary-counts`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTicketCounts(data);
            } else {
                console.error("Failed to fetch ticket counts:", await response.json());
            }
        } catch (error) {
            console.error("Network error fetching ticket counts:", error);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(authClient, async (firebaseUser) => {
            if (firebaseUser) {
                try {
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
                        const userProfile = { firebaseUser, role: data.user.role, email: firebaseUser.email };
                        setCurrentUser(userProfile);
                        fetchTicketCounts(userProfile); // Fetch counts on successful login
                        if (data.user.role === 'support') {
                             setCurrentPage('allTickets'); // Support defaults to All Tickets
                        } else {
                            setCurrentPage('myTickets'); // User defaults to My Tickets
                        }
                    } else {
                        console.error("Backend login verification failed:", data.error);
                        showFlashMessage(data.error || "Authentication failed during login.", 'error');
                        authClient.signOut();
                        setCurrentUser(null);
                        setCurrentPage('login');
                    }
                } catch (error) {
                    console.error("Error during authentication state change:", error);
                    showFlashMessage("Network error during re-authentication. Please log in again.", 'error');
                    authClient.signOut();
                    setCurrentUser(null);
                    setCurrentPage('login');
                }
            } else {
                setCurrentUser(null);
                setCurrentPage('login');
                setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Clear counts on logout
            }
        });
        return () => unsubscribe();
    }, [fetchTicketCounts]); // Dependency on fetchTicketCounts


    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        fetchTicketCounts(user); // Fetch counts on successful login
        if (user.role === 'support') {
            setCurrentPage('allTickets'); // Support defaults to All Tickets
        } else {
            setCurrentPage('myTickets');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(authClient);
            setCurrentUser(null);
            showFlashMessage('Logged out successfully.', 'success');
            navigateTo('login');
        } catch (error) {
            console.error('Logout error:', error);
            showFlashMessage('Failed to log out.', 'error');
        } finally {
            setIsProfileMenuOpen(false); // Close dropdown on logout
            setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 }); // Clear counts on logout
        }
    };

    const navigateTo = (page, id = null) => {
        if (page === 'createTicket') {
            setShowCreateTicketModal(true);
        } else {
            setCurrentPage(page);
            setSelectedTicketId(id);
            setSearchKeyword(''); // Clear search on navigation
            setTicketListRefreshKey(prev => prev + 1); // Trigger refresh
            setShowCreateTicketModal(false); // Ensure modal is closed if navigating away
            if (currentUser) {
                fetchTicketCounts(currentUser); // Refresh counts on navigation
            }
        }
        setIsProfileMenuOpen(false); // Close profile dropdown on navigation
    };

    const showFlashMessage = useCallback((message, type = 'info', duration = 3000) => {
        if (flashMessageTimeoutRef.current) {
            clearTimeout(flashMessageTimeoutRef.current);
        }
        setFlashMessage(message);
        setFlashType(type);
        flashMessageTimeoutRef.current = setTimeout(() => {
            setFlashMessage(null);
        }, duration);
    }, []);

    const handleTicketCreated = () => {
        setTicketListRefreshKey(prev => prev + 1); // Refresh ticket list after creation
        setShowCreateTicketModal(false);
        if (currentUser) {
            fetchTicketCounts(currentUser); // Refresh counts after ticket creation
        }
    };

    const handleSearchChange = (e) => {
        setSearchKeyword(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setTicketListRefreshKey(prev => prev + 1); // Trigger refresh of current view with search keyword
        // Note: The backend handles direct search by Ticket ID which bypasses status filters.
        // For general text search on descriptions, additional backend logic would be needed.
    };

    const getStatusClasses = (type) => {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'info': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const AccessDeniedComponent = () => (
        <div className="text-center text-red-600 mt-8 text-base font-bold p-6 bg-white rounded-lg shadow-md border border-red-200">Access Denied. You do not have permission to view this page.</div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 font-inter overflow-hidden">
            {/* Top Banner */}
            <header className="bg-blue-800 text-white p-3 flex items-center justify-between shadow-md flex-shrink-0 fixed top-0 w-full z-50">
                <h1 className="text-xl font-bold flex-shrink-0">IT Help Desk</h1>

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
                            label=""
                        />
                        <PrimaryButton type="submit" Icon={Search} className="w-auto px-3 py-1.5">
                            Search
                        </PrimaryButton>
                    </form>
                )}

                {currentUser && (
                    <div className="relative">
                        <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center text-white hover:text-blue-200 transition duration-200 text-sm">
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
                                    onClick={handleLogout} // Calls the main handleLogout function
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
            <main className="flex flex-1 overflow-hidden">
                {/* Left Side Menu */}
                {currentUser && (
                    <nav className="w-56 bg-gray-800 text-white flex flex-col p-3 shadow-lg flex-shrink-0 overflow-y-auto fixed h-full top-0 left-0 z-40 pt-16">
                        <ul className="space-y-2 mt-3">
                            {currentUser.role === 'support' && (
                                <>
                                    <li>
                                        <button onClick={() => navigateTo('dashboard')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <LayoutDashboard size={16} className="mr-2" /> Dashboard
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('allTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'allTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <List size={16} className="mr-2" /> All Tickets ({ticketCounts.active_tickets})
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => navigateTo('assignedToMe')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'assignedToMe' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                            <Tag size={16} className="mr-2" /> Assigned to Me ({ticketCounts.assigned_to_me})
                                        </button>
                                    </li>
                                </>
                            )}
                            <li>
                                <button onClick={() => navigateTo('myTickets')} className={`flex items-center w-full p-2 rounded-md text-left transition duration-200 text-sm ${currentPage === 'myTickets' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
                                    <ClipboardCheck size={16} className="mr-2" /> My Tickets (Home)
                                </button>
                            </li>
                            {/* Create Ticket button moved to MyTicketsComponent only */}
                        </ul>
                    </nav>
                )}

                {/* Main Content Canvas */}
                <section className={`flex-1 bg-offwhite flex flex-col min-w-0 ${currentUser ? 'ml-56 pt-16' : ''}`}>
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
                    {(() => {
                        if (!currentUser) {
                            return currentPage === 'register' ? (
                                <RegisterComponent navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                            ) : (
                                <LoginComponent onLoginSuccess={handleLoginSuccess} navigateTo={navigateTo} showFlashMessage={showFlashMessage} />
                            );
                        } else {
                            switch (currentPage) {
                                case 'dashboard':
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    // Dashboard can be a specific view or just All Tickets by default
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} />;
                                case 'allTickets':
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} showFilters={true} />;
                                case 'assignedToMe':
                                    if (currentUser.role !== 'support') {
                                        return <AccessDeniedComponent />;
                                    }
                                    // Filter by assigned_to_me for this specific view, hide filters
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} />;
                                case 'ticketDetail':
                                    return <TicketDetailComponent ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
                                case 'profile':
                                    return <ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />;
                                default: // 'myTickets' is default home for users and primary for support's reported tickets
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                            }
                        }
                    })()}
                </section>
            </main>

            <footer className="bg-gray-800 text-white text-center p-2 w-full shadow-inner text-xs flex-shrink-0">
                <p>&copy; {new Date().getFullYear()} IT Help Desk. All rights reserved.</p>
            </footer>

            {/* Create Ticket Modal */}
            <Modal
                isOpen={showCreateTicketModal}
                onClose={() => setShowCreateTicketModal(false)}
                title="Create New Ticket"
            >
                <CreateTicketComponent
                    user={currentUser}
                    onClose={() => setShowCreateTicketModal(false)}
                    showFlashMessage={showFlashMessage}
                    onTicketCreated={handleTicketCreated}
                />
            </Modal>
        </div>
    );
}

export default App;
