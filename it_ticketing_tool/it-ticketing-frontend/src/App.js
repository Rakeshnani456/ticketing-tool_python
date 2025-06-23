import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, LogIn, LogOut, PlusCircle, List, LayoutDashboard, MessageSquareText, FilePenLine, ChevronDown, Settings, Monitor, CheckCircle, XCircle, Info, AlertTriangle, Tag, CalendarDays, ClipboardCheck, Send, Loader2, ListFilter, Clock, Users, KeyRound, Eye, EyeOff, Search, FileUp, Download, Link, X } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updatePassword
} from 'firebase/auth';
import KriasolLogo from './logo/logo.png';
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
const CreateTicketComponent = ({ user, onClose, showFlashMessage, onTicketCreated, navigateTo }) => {
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
    const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle', 'creating', 'success', 'error'
    const [createdTicketId, setCreatedTicketId] = useState(null); // This will store the actual DB ID for navigation
    const [createdTicketDisplayId, setCreatedTicketDisplayId] = useState(null); // New state for display ID
    const [errorMessage, setErrorMessage] = useState('');

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
        // Reset status message when user starts typing again
        setSubmissionStatus('idle');
        setErrorMessage('');
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
        setSubmissionStatus('creating');
        setErrorMessage(''); // Clear previous errors

        try {
            // 1. Upload attachments first
            const uploadedAttachmentUrls = await uploadAttachments();
            // If attachments were selected but not all uploaded successfully, prevent ticket creation
            if (attachmentFiles.length > uploadedAttachmentUrls.length && attachmentFiles.length > 0) {
                // Some files might have failed validation or upload.
                // If there are valid files uploaded, proceed, otherwise show error.
                if (uploadedAttachmentUrls.length === 0) {
                    setErrorMessage('No attachments were uploaded successfully. Ticket not created.');
                    setSubmissionStatus('error');
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
                setSubmissionStatus('success');
                // Corrected: Backend now sends 'id', so data.id is correct
                setCreatedTicketId(data.id); // Store actual DB ID for navigation
                setCreatedTicketDisplayId(data.display_id); // Store display ID for message
                setFormData({ // Reset form fields
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
            } else {
                setSubmissionStatus('error');
                setErrorMessage(data.error || 'Failed to create ticket.');
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            setSubmissionStatus('error');
            setErrorMessage('Network error or server unreachable during ticket creation.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewTicket = () => {
        // Corrected: Ensure createdTicketId is passed to navigateTo
        navigateTo('ticketDetail', createdTicketId);
    };

    const handleGoToMyTickets = () => {
        navigateTo('myTickets');
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
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormSelect
                    id="category"
                    label="*Category"
                    value={formData.category}
                    onChange={handleChange}
                    options={categories}
                    required
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
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
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormTextarea
                    id="long_description"
                    label="Long Description"
                    value={formData.long_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Provide detailed information about the issue"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <div>
                    <label htmlFor="attachments" className="block text-gray-700 text-sm font-semibold mb-1">Attachments (PDF, JPG, PNG, Word - max 10MB per file):</label>
                    <input
                        type="file"
                        id="attachments"
                        multiple
                        onChange={handleFileChange}
                        className="w-full text-gray-700 text-sm bg-white border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
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
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormSelect
                    id="priority"
                    label="*Priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={priorities}
                    required
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormInput
                    id="hostname_asset_id"
                    label="*Hostname / LaptopID / AssetID"
                    type="text"
                    value={formData.hostname_asset_id}
                    onChange={handleChange}
                    required
                    placeholder="e.g., LPT-XYZ-001, Server-ABC"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />

                {/* Submission Status Message */}
                {submissionStatus === 'creating' && (
                    <div className="flex items-center justify-center p-3 text-sm text-blue-800 bg-blue-50 rounded-md animate-pulse">
                        <Loader2 size={16} className="animate-spin mr-2" />
                        <span>Creating ticket...</span>
                    </div>
                )}

                {submissionStatus === 'success' && (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-green-800 bg-green-50 rounded-md border border-green-200">
                        <CheckCircle size={24} className="text-green-600 mb-2" />
                        <p className="font-semibold text-base">
                            Ticket <span onClick={handleViewTicket} className="text-blue-600 hover:underline cursor-pointer">
                                {createdTicketDisplayId}
                            </span> created successfully!
                        </p>
                        <div className="flex space-x-3 mt-4">
                            <PrimaryButton onClick={handleViewTicket} Icon={Eye} className="w-auto px-4 py-1.5 bg-green-600 hover:bg-green-700">
                                View Ticket
                            </PrimaryButton>
                            <SecondaryButton onClick={handleGoToMyTickets} className="w-auto px-4 py-1.5">
                                Go to My Tickets
                            </SecondaryButton>
                        </div>
                    </div>
                )}

                {submissionStatus === 'error' && errorMessage && (
                    <div className="flex items-center justify-center p-3 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                        <XCircle size={16} className="mr-2" />
                        <span>Error: {errorMessage}</span>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-3">
                    {submissionStatus !== 'success' && ( // Hide cancel/submit buttons after success
                        <>
                            <SecondaryButton onClick={onClose} className="w-auto px-4 py-1.5" disabled={loading}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton type="submit" loading={loading || uploadingAttachments ? (uploadingAttachments ? "Uploading Files..." : "Creating Ticket...") : null} Icon={Send} className="w-auto px-4 py-1.5" disabled={loading}>
                                Submit Ticket
                            </PrimaryButton>
                        </>
                    )}
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


   /* if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading tickets...</span></div>;*/
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
    // New state to manage button feedback text and icon
    const [saveButtonState, setSaveButtonState] = useState('save'); // 'save', 'saving', 'success', 'error'
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    // Removed uploadingAttachments state as it's now handled by the main 'loading' state

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

    // useCallback is good practice for functions passed as dependencies to useEffect
    const loadTicket = useCallback(async () => {
        console.log('TicketDetailComponent useEffect: ticketId prop changed to:', ticketId);

        if (!ticketId || !user?.firebaseUser) {
            console.log('TicketDetailComponent: Skipping fetch inside useEffect. ticketId:', ticketId, 'user:', user);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        console.log(`TicketDetailComponent: Attempting to fetch ticket with ID: ${ticketId}`);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            console.log('TicketDetailComponent: Firebase ID Token acquired.');
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            console.log('TicketDetailComponent: Raw response received:', response);

            if (response.ok) {
                const data = await response.json();
                console.log('TicketDetailComponent: Ticket data received:', data);
                setTicket(data);
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
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (parseError) {
                    console.error('TicketDetailComponent: Error parsing error response:', parseError);
                    errorData.message = 'Could not parse error response from server.';
                }
                console.error('TicketDetailComponent: Fetch failed. Status:', response.status, 'Error Data:', errorData);

                if (response.status === 404) {
                    setError(`Ticket with ID ${ticketId} not found.`);
                    showFlashMessage(`Ticket with ID ${ticketId} not found.`, 'error');
                } else {
                    setError(errorData.error || errorData.message || 'Failed to fetch ticket details.');
                    showFlashMessage(errorData.error || 'Failed to fetch ticket details.', 'error');
                }

            }
        } catch (err) {
            console.error('TicketDetailComponent: Critical error during loadTicket:', err);
            setError(err.message || 'Network error or server unreachable.');
            showFlashMessage(err.message || 'Network error or server unreachable.', 'error');
        } finally {
            setLoading(false);
            console.log('TicketDetailComponent: Loading state set to false after loadTicket completion.');
        }
    }, [ticketId, user, showFlashMessage]); // Dependencies for useCallback

    useEffect(() => {
        loadTicket();
    }, [loadTicket]); // useEffect now depends on the memoized loadTicket

    const isTicketClosedOrResolved = ticket && ['Resolved', 'Closed'].includes(ticket.status);
    // Determine if user can edit: is support OR is reporter AND ticket is not closed/resolved
    const canEdit = isSupportUser || (ticket && ticket.reporter_id === user?.firebaseUser.uid && !isTicketClosedOrResolved);
    const canAddComments = !isTicketClosedOrResolved;
    const canAddAttachments = !isTicketClosedOrResolved;

    // Check if any editable field has changed from its original value
    const hasChanges = () => {
        if (!ticket) return false;
        return (
            editableFields.request_for_email !== ticket.request_for_email ||
            editableFields.short_description !== ticket.short_description ||
            editableFields.long_description !== ticket.long_description ||
            editableFields.contact_number !== ticket.contact_number ||
            editableFields.priority !== ticket.priority ||
            editableFields.status !== ticket.status ||
            editableFields.assigned_to_email !== ticket.assigned_to_email
        );
    };

    const handleEditChange = (e) => {
        const { id, value } = e.target;
        setEditableFields(prev => ({ ...prev, [id]: value }));
        // Reset button state if changes are made after an error or success
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
    };

    const handleUpdateTicket = async () => {
        setUpdateLoading(true);
        setSaveButtonState('saving'); // Change button state to saving

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
                setSaveButtonState('success'); // Change button state to success
                showFlashMessage('Ticket updated successfully!', 'success');
                // Re-fetch to get latest data, important after updates
                setTicket(null); // Clear ticket state to force re-fetch and show loading spinner again
                setError(null); // Clear any previous errors
                setLoading(true); // Manually set loading to true to show spinner
                setTimeout(() => {
                    setIsEditing(false); // Go back to view mode
                    setSaveButtonState('save'); // Reset button state for next edit cycle
                }, 1500); // Display "Success!" for 1.5 seconds
            } else {
                setSaveButtonState('error'); // Change button state to error
                showFlashMessage(data.error || 'Failed to update ticket.', 'error'); // Keep flash message for errors
                setTimeout(() => {
                    setSaveButtonState('save'); // Reset button state after error
                }, 2000); // Display "Error!" for 2 seconds
            }
        } catch (error) {
            console.error('Update ticket error:', error);
            setSaveButtonState('error'); // Change button state to error
            showFlashMessage('Network error or server unreachable during update.', 'error'); // Keep flash message for network errors
            setTimeout(() => {
                setSaveButtonState('save'); // Reset button state after error
            }, 2000); // Display "Error!" for 2 seconds
        } finally {
            setUpdateLoading(false); // This will re-enable the button after the timeout if needed, but setIsEditing handles overall state
        }
    };

    const handleCancelEdit = () => {
        // Reset editable fields to original ticket values
        setEditableFields({
            request_for_email: ticket.request_for_email || '',
            short_description: ticket.short_description || '',
            long_description: ticket.long_description || '',
            contact_number: ticket.contact_number || '',
            priority: ticket.priority || '',
            status: ticket.status || '',
            assigned_to_email: ticket.assigned_to_email || ''
        });
        setIsEditing(false);
        setSaveButtonState('save'); // Ensure button state is reset on cancel
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
                
                setCommentText('');
                loadTicket(ticketId)
                // Re-fetch to get latest comments
                
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
        showFlashMessage('Uploading attachments...', 'info');
        // We'll use the main 'loading' state for the spinner now.
        setLoading(true); // Indicate overall component loading during upload and re-fetch

        const uploadedUrls = [];

        // Use Promise.all to upload files concurrently for better performance
        const uploadPromises = attachmentFiles.map(async (file) => {
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
                        return data.files[0].url; // Return the URL
                    }
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
            }
            return null; // Return null for failed uploads
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(url => {
            if (url) {
                uploadedUrls.push(url);
            }
        });

        if (uploadedUrls.length > 0) {
            try {
                const idToken = await user.firebaseUser.getIdToken();
                // Patch the ticket to add new attachment URLs.
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
                    loadTicket(ticketId); // Re-fetch the ticket to get updated attachments
                    // Force re-fetch the ticket to show the updated attachments
                    setTicket(null); // Clear ticket state to force re-fetch
                    setError(null); // Clear any previous errors
                    // setLoading(true); // Already set to true at the start of the function
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to update ticket with attachments: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Update ticket with attachments error:', error);
                showFlashMessage('Network error during updating ticket with attachments.', 'error');
            }
        } else if (attachmentFiles.length > 0) {
            // This condition means files were selected but none uploaded successfully
            showFlashMessage('No attachments were successfully uploaded to add to the ticket.', 'error');
        }
        // setLoading(false) will be handled by the loadTicket function after re-fetching
        // No need to setUploadingAttachments(false) anymore.
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed':
            case 'Resolved': return 'bg-gray-100 text-gray-800';
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
        <div className="p-4 bg-gray-100 min-h-screen flex-1 overflow-auto font-sans">
            {/* Header section with back button, ticket number, and EDIT/SAVE/CANCEL buttons */}
            <div className="flex items-center bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigateTo(user?.role === 'support' ? 'allTickets' : 'myTickets')} className="text-gray-500 hover:text-gray-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-800 flex-grow">TASK{ticket.display_id} (Portal view)</h1>

                {/* Edit/Save/Cancel Buttons - Moved to the header */}
                <div className="flex space-x-2">
                    {canEdit && !isEditing && !isTicketClosedOrResolved && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                        >
                            Edit Ticket
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                disabled={updateLoading} // Disable cancel during update
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTicket}
                                disabled={updateLoading || !hasChanges()} // Disable save if no changes or updating
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex items-center justify-center
                                ${saveButtonState === 'saving'
                                        ? 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                        : saveButtonState === 'success'
                                            ? 'bg-green-500 text-white'
                                            : saveButtonState === 'error'
                                                ? 'bg-red-500 text-white'
                                                : hasChanges()
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                    }`}
                            >
                                {saveButtonState === 'saving' && <Loader2 className="animate-spin mr-2" size={16} />}
                                {saveButtonState === 'success' && <CheckCircle className="mr-2" size={16} />}
                                {saveButtonState === 'error' && <XCircle className="mr-2" size={16} />}
                                {saveButtonState === 'saving' && 'Saving...'}
                                {saveButtonState === 'success' && 'Success!'}
                                {saveButtonState === 'error' && 'Error!'}
                                {saveButtonState === 'save' && 'Save'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto mt-4 border border-gray-200">
                {/* Top Section: Number, Customer, Request, Due date, Short description (original UI fields) */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    {/* Left Column */}
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Number:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.display_id}</span>
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Customer:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_for_email}</span>
                            {/* Icon next to Customer name - placeholder */}

                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Request:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_item_id || 'N/A'}</span>
                            {/* Icon next to Request - placeholder */}

                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Request Item:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_item_id || 'RITM000000'}</span> {/* Placeholder */}
                            {/* Icon next to Request Item - placeholder */}

                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Due date:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Priority:</label>
                            {isEditing && canEdit ? (
                                <FormSelect
                                    id="priority"
                                    value={editableFields.priority}
                                    onChange={handleEditChange}
                                    options={priorities}
                                    disabled={!canEdit || isTicketClosedOrResolved}
                                    className="flex-1 max-w-xs" // Adjusted width for input
                                    label=""
                                />
                            ) : (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)} flex-1 max-w-fit`}>
                                    {ticket.priority}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Status:</label>
                            {isEditing && isSupportUser ? (
                                <FormSelect
                                    id="status"
                                    value={editableFields.status}
                                    onChange={handleEditChange}
                                    options={statuses}
                                    disabled={!isSupportUser}
                                    className="flex-1 max-w-xs" // Adjusted width for input
                                    label=""
                                />
                            ) : (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)} flex-1 max-w-fit`}>
                                    {ticket.status}
                                </span>
                            )}
                        </div>
                        {isSupportUser && (
                            <div className="flex items-center">
                                <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Assignment group:</label>
                                {/* This field is not in editableFields, so keep it read-only for now */}
                                <span className="text-gray-900 text-sm font-medium flex-1">{ticket.assignment_group || 'ITS-FieldSupport.CentralCampus'}</span> {/* Placeholder based on image */}

                            </div>
                        )}
                        {isSupportUser && (
                            <div className="flex items-center">
                                <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Assigned to:</label>
                                {isEditing && isSupportUser ? (
                                    <FormInput
                                        id="assigned_to_email"
                                        type="email"
                                        value={editableFields.assigned_to_email || ''}
                                        onChange={handleEditChange}
                                        placeholder="Enter email to assign"
                                        disabled={!isSupportUser || isTicketClosedOrResolved}
                                        className="flex-1 max-w-xs" // Adjusted width for input
                                        label=""
                                    />
                                ) : (
                                    <span className="text-gray-900 text-sm font-medium flex-1">{ticket.assigned_to_email || 'Unassigned'}</span>
                                )}

                            </div>
                        )}
                    </div>
                </div>

                {/* Short Description */}
                <div className="mb-6 border-t border-gray-200 pt-6"> {/* Added border-top for separation */}
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 text-sm font-semibold w-36 shrink-0">Short description:</label>
                        {isEditing && canEdit ? (
                            <FormTextarea
                                id="short_description"
                                value={editableFields.short_description}
                                onChange={handleEditChange}
                                rows={2}
                                maxLength={250}
                                disabled={!canEdit || isTicketClosedOrResolved}
                                className="flex-1"
                                label=""
                            />
                        ) : (
                            <span className="text-gray-900 text-sm bg-gray-50 p-2 rounded-sm border border-gray-200 flex-1">{ticket.short_description}</span>
                        )}
                    </div>
                    <div className="flex justify-end text-xs text-gray-500 mt-1">
                        Characters left: {isEditing && canEdit ? 250 - editableFields.short_description.length : ticket.short_description.length ? 250 - ticket.short_description.length : 250}
                    </div>
                </div>

                {/* Description */}
                <div className="mb-6">
                    <div className="flex items-start mb-2"> {/* Align top for textarea */}
                        <label className="text-gray-700 text-sm font-semibold w-36 shrink-0 pt-2">Description:</label> {/* Added pt-2 to align with textarea */}
                        {isEditing && canEdit ? (
                            <FormTextarea
                                id="long_description"
                                value={editableFields.long_description}
                                onChange={handleEditChange}
                                rows={6}
                                disabled={!canEdit || isTicketClosedOrResolved}
                                className="flex-1"
                                label=""
                            />
                        ) : (
                            <span className="text-gray-900 text-sm bg-gray-50 p-2 rounded-sm border border-gray-200 whitespace-pre-wrap flex-1">{ticket.long_description || 'No long description provided.'}</span>
                        )}
                    </div>
                    <div className="flex justify-end text-xs text-gray-500 mt-1">
                        Characters left: {isEditing && canEdit ? 4000 - editableFields.long_description.length : ticket.long_description.length ? 4000 - ticket.long_description.length : 4000} {/* Assuming 4000 char limit */}
                    </div>
                </div>

                {/* Additional Details (from your original component, structured to fit) */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 border-t border-gray-200 pt-6">
                    <div className="flex items-center">
                        <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Reporter Email:</label>
                        <span className="text-gray-900 text-sm font-medium flex-1">{ticket.reporter_email}</span>
                    </div>
                    <div className="flex items-center">
                        <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Category:</label>
                        <span className="text-gray-900 text-sm font-medium flex-1">{ticket.category}</span>
                    </div>
                    {/* Add other fields from your original snippet here if needed, following the same pattern */}
                </div>

                {/* Comments Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Comments</h3>
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {ticket.comments && ticket.comments.length > 0 ? (
                            ticket.comments.map((comment, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <p className="text-gray-800 text-sm mb-1">{comment.comment_text}</p>
                                    <p className="text-xs text-gray-500">
                                        Added by <span className="font-medium">{comment.commenter_name || 'Unknown'}</span> on {new Date(comment.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm">No comments yet.</p>
                        )}
                    </div>
                    {canAddComments && (
                        <form onSubmit={handleAddComment} className="mt-4 flex flex-col sm:flex-row gap-2">
                            <FormTextarea
                                id="commentText"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                rows={2}
                                className="flex-1"
                                label=""
                                disabled={commentLoading}
                            />
                            <button
                                type="submit"
                                disabled={commentLoading || !commentText.trim()}
                                className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium self-end sm:self-start min-w-[100px] flex items-center justify-center
                                    ${commentLoading || !commentText.trim()
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                            >
                                {commentLoading && <Loader2 className="animate-spin mr-2" size={16} />}
                                Add Comment
                            </button>
                        </form>
                    )}
                </div>

                {/* Attachments Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Attachments</h3>
                    <div className="space-y-2 mb-4">
                        {ticket.attachments && ticket.attachments.length > 0 ? (
                            ticket.attachments.map((attachmentUrl, index) => (
                                <div key={index} className="flex items-center text-sm text-blue-700 hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-paperclip mr-2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" /></svg>
                                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="truncate">
                                        {attachmentUrl.split('/').pop()} {/* Display just the filename */}
                                    </a>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm">No attachments yet.</p>
                        )}
                    </div>
                    {canAddAttachments && (
                        <div className="flex flex-col gap-3">
                            <label htmlFor="attachmentUpload" className="block text-gray-700 text-sm font-medium">Upload New Attachments (PDF, JPG, PNG, Word up to 10MB):</label>
                            <input
                                type="file"
                                id="attachmentUpload"
                                multiple
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                disabled={loading} // Disable if main ticket loading
                            />
                            {attachmentFiles.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Selected files: {attachmentFiles.map(file => file.name).join(', ')}
                                </div>
                            )}
                            <button
                                onClick={handleAddAttachmentsToTicket}
                                disabled={attachmentFiles.length === 0 || loading} // Disable if no files selected or main ticket loading
                                className={`px-4 py-2 rounded-md transition-colors duration-200 text-sm font-medium self-start flex items-center justify-center
                                    ${attachmentFiles.length === 0 || loading
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {loading ? ( // Use the main 'loading' state for the button
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={16} />
                                        Uploading...
                                    </>
                                ) : (
                                    'Add Attachments'
                                )}
                            </button>
                        </div>
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
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [ticketCounts, setTicketCounts] = useState({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 });

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
                        fetchTicketCounts(userProfile);
                        if (data.user.role === 'support') {
                            setCurrentPage('allTickets');
                        } else {
                            setCurrentPage('myTickets');
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
                setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 });
            }
        });
        return () => unsubscribe();
    }, [fetchTicketCounts]);

    const handleLoginSuccess = (user) => {
        setCurrentUser(user);
        fetchTicketCounts(user);
        if (user.role === 'support') {
            setCurrentPage('allTickets');
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
            setIsProfileMenuOpen(false);
            setTicketCounts({ active_tickets: 0, assigned_to_me: 0, total_tickets: 0 });
        }
    };

    const navigateTo = (page, id = null) => {
        console.log(`App: Navigating to page: ${page}, with ID: ${id}`);
        setCurrentPage(page);
        setSelectedTicketId(id);
        setSearchKeyword('');
        setTicketListRefreshKey(prev => prev + 1);
        if (currentUser) {
            fetchTicketCounts(currentUser);
        }
        setIsProfileMenuOpen(false);
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
        setTicketListRefreshKey(prev => prev + 1);
        if (currentUser) {
            fetchTicketCounts(currentUser);
        }
    };

    const handleSearchChange = (e) => {
        setSearchKeyword(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setTicketListRefreshKey(prev => prev + 1);
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
            <header className="bg-white text-white p-3 flex items-center justify-between shadow-md flex-shrink-0 fixed top-0 w-full z-50">
                {/* Replaced h1 with img tag for the logo */}
                <div className="flex-shrink-0">
                    <img src={KriasolLogo} alt="Kriasol Logo" className="h-8" /> {/* Adjust h-8 (height) as needed */}
                </div>

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
                        </ul>
                    </nav>
                )}

                {/* Main Content Canvas */}
                <section className={`flex-1 bg-blue flex flex-col min-w-0 ${currentUser ? 'ml-56 pt-16' : ''}`}>
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
                                    return <AllTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} initialFilterAssignment="assigned_to_me" showFilters={false} />;
                                case 'ticketDetail':
                                    console.log(`App: Rendering TicketDetailComponent with selectedTicketId: ${selectedTicketId}`);
                                    return <TicketDetailComponent key={selectedTicketId} ticketId={selectedTicketId} navigateTo={navigateTo} user={currentUser} showFlashMessage={showFlashMessage} />;
                                case 'createTicket':
                                    return (
                                        <div className="flex flex-col items-center justify-center p-4">
                                            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative border border-gray-200">
                                                <h2 className="text-xl font-extrabold text-gray-800 mb-4 text-center">Create New Ticket</h2>
                                                <CreateTicketComponent
                                                    user={currentUser}
                                                    onClose={() => navigateTo('myTickets')}
                                                    showFlashMessage={showFlashMessage}
                                                    onTicketCreated={handleTicketCreated}
                                                    navigateTo={navigateTo}
                                                />
                                            </div>
                                        </div>
                                    );
                                case 'profile':
                                    return <ProfileComponent user={currentUser} showFlashMessage={showFlashMessage} navigateTo={navigateTo} handleLogout={handleLogout} />;
                                default:
                                    return <MyTicketsComponent user={currentUser} navigateTo={navigateTo} showFlashMessage={showFlashMessage} searchKeyword={searchKeyword} refreshKey={ticketListRefreshKey} />;
                            }
                        }
                    })()}
                </section>
            </main>

            <footer className="bg-gray-800 text-white text-center p-2 w-full shadow-inner text-xs flex-shrink-0">
                <p>&copy; {new Date().getFullYear()} IT Help Desk. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;


