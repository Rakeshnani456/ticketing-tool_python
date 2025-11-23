import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import CustomDropdown from '../common/CustomDropdown';
import CustomButton from '../common/CustomButton';
import TooltipBubble from '../common/TooltipBubble';
import {
    Button, Chip, TextField, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Snackbar, Alert, Typography, Popover, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, useMediaQuery, Card, CardContent, CardActions, Grid, CircularProgress,
    FormControl, InputLabel, OutlinedInput, FormHelperText, Tooltip, TablePagination, Badge, Divider, Tabs, Tab, Autocomplete, InputAdornment, Switch, FormControlLabel, Avatar, Stack
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Clear as ClearIcon, 
    VpnKey as VpnKeyIcon, 
    LockReset as LockResetIcon, 
    Save as SaveIcon, 
    Group as GroupIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Info as InfoIcon,
    Phone as PhoneIcon,
    SupervisorAccount as SupervisorAccountIcon,
    Work as WorkIcon,
    Badge as BadgeIcon,
    Close as CloseIcon,
    AdminPanelSettings as AdminIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    FilterList as FilterIcon,
    ViewModule as ViewModuleIcon,
    ViewList as ViewListIcon,
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    MoreVert as MoreVertIcon,
    Settings as SettingsIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { API_BASE_URL, FRONTEND_URL } from '../../config/constants';
import './UserManagementComponent.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { app } from '../../config/firebase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { useTheme } from '@mui/material/styles';
import SmartCacheManager from '../../utils/smartCacheManager';
// For Material-UI v5 and above
import Checkbox from '@mui/material/Checkbox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { motion } from 'framer-motion';
import FaviconIcon from '../common/FaviconIcon';

// Helper for deep comparison
const areUsersEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        console.log("🔍 areUsersEqual: One or both arrays are not arrays", { arr1: Array.isArray(arr1), arr2: Array.isArray(arr2) });
        return false;
    }
    if (arr1.length !== arr2.length) {
        console.log("🔍 areUsersEqual: Array lengths differ", { arr1Length: arr1.length, arr2Length: arr2.length });
        return false;
    }
    
    for (let i = 0; i < arr1.length; i++) {
        const user1 = arr1[i];
        const user2 = arr2[i];
        
        if (!user1 || !user2) {
            console.log("🔍 areUsersEqual: One user is null/undefined at index", i, { user1: !!user1, user2: !!user2 });
            return false;
        }
        
        if (user1.uid !== user2.uid ||
            user1.clientname !== user2.clientname ||
            user1.name !== user2.name ||
            user1.email !== user2.email ||
            user1.asset_id !== user2.asset_id ||
            user1.domain !== user2.domain ||
            user1.firstName !== user2.firstName ||
            user1.lastName !== user2.lastName ||
            user1.contactNumber !== user2.contactNumber ||
            user1.managerEmail !== user2.managerEmail ||
            user1.employmentType !== user2.employmentType ||
            user1.designation !== user2.designation ||
            user1.employeeId !== user2.employeeId) {
            console.log("🔍 areUsersEqual: Users differ at index", i, {
                uid: { user1: user1.uid, user2: user2.uid },
                name: { user1: user1.name, user2: user2.name },
                email: { user1: user1.email, user2: user2.email },
                designation: { user1: user1.designation, user2: user2.designation }
            });
            return false;
        }
    }
    console.log("🔍 areUsersEqual: All users are equal");
    return true;
};

const initialUserState = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
  employeeId: '',
  emailPrefix: '',
  domain: '',
  asset_id: '',
  clientname: '',
};

const EMPLOYMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'intern', label: 'Intern' },
  { value: 'freelance', label: 'Freelance' },
];

function generatePassword() {
  // 8 characters: 4 from "Sahayaon" letters + 4 random characters (numbers or alphabets)
  const sahayaonLetters = ['S', 'a', 'h', 'y', 'o', 'n'];
  const randomChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Pick 4 random letters from "Sahayaon"
  let password = '';
  const selectedLetters = [];
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * sahayaonLetters.length);
    selectedLetters.push(sahayaonLetters[randomIndex]);
  }
  
  // Add 4 random characters (numbers or alphabets)
  for (let i = 0; i < 4; i++) {
    selectedLetters.push(randomChars.charAt(Math.floor(Math.random() * randomChars.length)));
  }
  
  // Shuffle the array to mix letters and random chars
  for (let i = selectedLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selectedLetters[i], selectedLetters[j]] = [selectedLetters[j], selectedLetters[i]];
  }
  
  return selectedLetters.join('');
}

const USER_TEMPLATE_HEADERS = [
  'firstName',
  'lastName',
  'employeeId',
  'email',
  'designation',
  'contactNumber',
  'managerEmail',
  'employmentType',
];

// Friendly display names for Excel template headers
const USER_TEMPLATE_DISPLAY_NAMES = [
  'First Name',
  'Last Name',
  'Employee ID',
  'Email',
  'Designation',
  'Contact Number',
  'Manager Email',
  'Employment Type'
];

// Map display names back to field names for processing
const HEADER_NAME_MAP = {
  'First Name': 'firstName',
  'Last Name': 'lastName',
  'Employee ID': 'employeeId',
  'Email': 'email',
  'Designation': 'designation',
  'Contact Number': 'contactNumber',
  'Manager Email': 'managerEmail',
  'Employment Type': 'employmentType',
  'Company Name': 'companyName'
};

// UserCard component for grid view (similar to AssetCard)
const UserCard = ({ user, onClick }) => {
    const getRoleColor = (role) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'admin': return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'site_admin': return 'bg-green-100 text-green-800 border-green-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className="bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            onClick={onClick}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <PersonIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate text-sm">
                                {user.firstName && user.lastName 
                                    ? `${user.firstName} ${user.lastName}`
                                    : user.name || user.email?.split('@')[0] || 'Unnamed User'}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                                {user.employeeId || user.email?.split('@')[0] || 'N/A'}
                            </p>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md border text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role === 'user' ? 'User' : user.role === 'site_admin' ? 'Site Admin' : user.role || 'User'}
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {user.email && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <EmailIcon className="w-3 h-3" />
                            <span className="truncate" title={user.email}>{user.email}</span>
                        </div>
                    )}
                    {user.contactNumber && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <PhoneIcon className="w-3 h-3" />
                            <span className="truncate">{user.contactNumber}</span>
                        </div>
                    )}
                    {user.designation && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <WorkIcon className="w-3 h-3" />
                            <span className="truncate">{user.designation}</span>
                        </div>
                    )}
                    {user.employmentType && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <BadgeIcon className="w-3 h-3" />
                            <span className="truncate">{user.employmentType}</span>
                        </div>
                    )}
                </div>

                {/* Footer Badges */}
                <div className="mt-3 flex flex-wrap gap-1">
                    {user.client_name && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {user.client_name}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const UserManagementComponent = ({ user, showFlashMessage, preFilterClient }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [clientsLoading, setClientsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [addMode, setAddMode] = useState(false);
    const [addRowData, setAddRowData] = useState(initialUserState);
    const [editRowId, setEditRowId] = useState(null);
    const [editRowData, setEditRowData] = useState({ ...initialUserState, showPasswordField: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();
    const location = useLocation();
    const db = useMemo(() => getFirestore(app), []);
    
    // Create stable reference for user's client name to prevent unnecessary re-renders
    // Only recompute when role or the actual client name values change
    const userClientName = useMemo(() => {
        if (user?.role === 'site_admin') {
            return user?.client_name || user?.companyName || '';
        }
        return null;
    }, [user?.role, user?.client_name, user?.companyName]);
    
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [addUserData, setAddUserData] = useState(initialUserState);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isXs = useMediaQuery(theme.breakpoints.only('xs'));
    const isSm = useMediaQuery(theme.breakpoints.only('sm'));
    const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
    const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
    const userToDeleteUidRef = useRef(null);
    const anchorEl = useRef(null);
    const [changePwdModalOpen, setChangePwdModalOpen] = useState(false);
    const [pwdUserId, setPwdUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [passwordCopied, setPasswordCopied] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importedUsers, setImportedUsers] = useState([]);
    const [importError, setImportError] = useState('');
    
    const [importResults, setImportResults] = useState(null);
    const [importedPasswords, setImportedPasswords] = useState([]);
    const [credentialsDownloaded, setCredentialsDownloaded] = useState(false);
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
    const [importProgress, setImportProgress] = useState({ show: false, current: 0, total: 0, status: '' });
    const [uploadedRows, setUploadedRows] = useState(new Set());
    const fileInputRef = useRef();
    const [collapsedClients, setCollapsedClients] = useState({});
    const [showActionsColumn, setShowActionsColumn] = useState({});
    const previousUsersRef = useRef([]);
    const previousClientsRef = useRef([]);
    const [clientFilter, setClientFilter] = useState('');
    const [highlightedClient, setHighlightedClient] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [lastFetchTime, setLastFetchTime] = useState(null);
    const [passwordChangeNotifications, setPasswordChangeNotifications] = useState({});
    const [addUserError, setAddUserError] = useState('');
    const [changePwdError, setChangePwdError] = useState('');
    const [passwordResetStatus, setPasswordResetStatus] = useState('');
    const [isPasswordResetting, setIsPasswordResetting] = useState(false);
    const [filterRole, setFilterRole] = useState('all');
    const [filtersChanged, setFiltersChanged] = useState(false);
 
    const [selectedUsers, setSelectedUsers] = useState([]);
    
    // Debug logging to identify re-render causes
    console.log('🔄 UserManagementComponent RENDER', { 
        userId: user?.uid, 
        userRole: user?.role, 
        userCompany: user?.companyName,
        usersCount: users?.length || 0,
        loading,
        timestamp: new Date().toISOString(),
        showFlashMessageType: typeof showFlashMessage
    });
    const [bulkAction, setBulkAction] = useState('');
    const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [selectedClientForAction, setSelectedClientForAction] = useState(null);
    const [importClientModalOpen, setImportClientModalOpen] = useState(false);
    const [exportClientModalOpen, setExportClientModalOpen] = useState(false);
    const [selectedImportClient, setSelectedImportClient] = useState('');
    const [selectedExportClients, setSelectedExportClients] = useState([]);
    
    // New state for super_admin users page revamp
    const [selectedClientForUsers, setSelectedClientForUsers] = useState(null);
    const [clientUsers, setClientUsers] = useState([]);
    const [assets, setAssets] = useState([]);

    const handleToggleClientCollapse = (client) => {
      setCollapsedClients(prev => ({ ...prev, [client]: !prev[client] }));
    };

    const handleToggleActionsColumn = (clientName) => {
        setShowActionsColumn(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    // Handle preFilterClient prop (from route parameter)
    useEffect(() => {
        if (preFilterClient) {
            setClientFilter(preFilterClient);
            setHighlightedClient(preFilterClient);
            // Expand the client section when filter is applied
            setCollapsedClients(prev => ({
                ...prev,
                [preFilterClient]: false
            }));
            
            // For super_admin, also set selectedClientForUsers to show users view instead of client grid
            if (user?.role === 'super_admin') {
                if (clients.length > 0) {
                    // Try to find exact match first
                    let client = clients.find(c => 
                        c.companyName === preFilterClient || 
                        c['Client name'] === preFilterClient ||
                        (c.companyName && c.companyName.toLowerCase() === preFilterClient.toLowerCase()) ||
                        (c['Client name'] && c['Client name'].toLowerCase() === preFilterClient.toLowerCase())
                    );
                    
                    // If not found, create a minimal client object to enable the users view
                    if (!client) {
                        client = {
                            companyName: preFilterClient,
                            'Client name': preFilterClient
                        };
                    }
                    
                    setSelectedClientForUsers(client);
                } else {
                    // If clients not loaded yet, create a minimal client object to enable users view
                    // This will be updated when clients load
                    setSelectedClientForUsers({
                        companyName: preFilterClient,
                        'Client name': preFilterClient
                    });
                }
            }
        }
    }, [preFilterClient, clients, user?.role]);
    
    // Update selectedClientForUsers with full client object when clients load (if we had a minimal one)
    useEffect(() => {
        if (preFilterClient && user?.role === 'super_admin' && selectedClientForUsers && clients.length > 0) {
            // Check if we have a minimal client object (only has companyName, no id)
            if (!selectedClientForUsers.id) {
                const fullClient = clients.find(c => 
                    c.companyName === preFilterClient || 
                    c['Client name'] === preFilterClient ||
                    (c.companyName && c.companyName.toLowerCase() === preFilterClient.toLowerCase()) ||
                    (c['Client name'] && c['Client name'].toLowerCase() === preFilterClient.toLowerCase())
                );
                if (fullClient) {
                    setSelectedClientForUsers(fullClient);
                }
            }
        }
    }, [preFilterClient, clients, selectedClientForUsers, user?.role]);
    
    // Update clientUsers when preFilterClient is set and users/clients are available
    useEffect(() => {
        if (preFilterClient && user?.role === 'super_admin' && selectedClientForUsers && users.length > 0) {
            const filteredUsers = users.filter(u => 
                (u.client_name || u.companyName || u.clientname) === preFilterClient ||
                ((u.client_name || u.companyName || u.clientname) && 
                 (u.client_name || u.companyName || u.clientname).toLowerCase() === preFilterClient.toLowerCase())
            );
            setClientUsers(filteredUsers);
        }
    }, [preFilterClient, selectedClientForUsers, users, user?.role]);

    useEffect(() => {
        // Only handle URL params if preFilterClient is not set
        if (preFilterClient) return;
        
        const urlParams = new URLSearchParams(location.search);
        const clientParam = urlParams.get('client');
        const clientId = urlParams.get('clientId');
        
        // Handle new 'client' parameter (company name) - redirect to route-based URL
        if (clientParam) {
            const decodedClientName = decodeURIComponent(clientParam);
            // Redirect to route-based URL format
            navigate(`/user-management/client/${encodeURIComponent(decodedClientName)}`, { replace: true });
            return;
        }
        // Handle legacy 'clientId' parameter for backward compatibility - redirect to route-based URL
        else if (clientId && clients.length > 0) {
            const client = clients.find(c => c.id === clientId);
            if (client && client.companyName) {
                // Redirect to route-based URL format
                navigate(`/user-management/client/${encodeURIComponent(client.companyName)}`, { replace: true });
                return;
            }
        }
    }, [location.search, clients, navigate, preFilterClient]);


    const filteredUsers = useMemo(() => {
        let filtered = users.filter(u => {
            // Apply search filter
            const matchesSearch = search === '' || 
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                u.clientname.toLowerCase().includes(search.toLowerCase()) ||
                (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) ||
                (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
                (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
                (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()));
            
            // Apply client filter
            const matchesClient = clientFilter === '' || 
                u.client_name === clientFilter || 
                u.companyName === clientFilter ||
                u.clientname === clientFilter;
            
            // Apply role filter
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            
            return matchesSearch && matchesClient && matchesRole;
        });
        
        // Sort users: site admins first, then by client name, then by email
        return filtered.sort((a, b) => {
            // Site admins always come first
            if (a.role === 'site_admin' && b.role !== 'site_admin') return -1;
            if (a.role !== 'site_admin' && b.role === 'site_admin') return 1;
            
            // For non-site admins, group by client name
            const clientA = a.clientname || a.client_name || a.companyName || 'Unknown Client';
            const clientB = b.clientname || b.client_name || b.companyName || 'Unknown Client';
            
            if (clientA !== clientB) {
                return clientA.localeCompare(clientB);
            }
            
            // Within same client, sort by email
            return a.email.localeCompare(b.email);
        });
    }, [users, search, clientFilter, filterRole]);


    // Group users by client for display
    const groupedUsersByClient = useMemo(() => {
        const grouped = {};
        
        filteredUsers.forEach(user => {
            const clientName = user.clientname || user.client_name || user.companyName || 'Unknown Client';
            if (!grouped[clientName]) {
                grouped[clientName] = [];
            }
            grouped[clientName].push(user);
        });
        
        // Convert to array and sort by client name, with site admins first within each group
        const clientGroups = Object.entries(grouped)
            .map(([clientName, users]) => {
                // Sort users within each client: site admins first, then by email
                const sortedUsers = users.sort((a, b) => {
                    if (a.role === 'site_admin' && b.role !== 'site_admin') return -1;
                    if (a.role !== 'site_admin' && b.role === 'site_admin') return 1;
                    return a.email.localeCompare(b.email);
                });
                
                return {
                    clientName,
                    users: sortedUsers
                };
            })
            .sort((a, b) => a.clientName.localeCompare(b.clientName));
        
        return clientGroups;
    }, [filteredUsers]);

    const clearClientFilter = () => {
        setClientFilter('');
        setHighlightedClient('');
    };

    const fetchClients = useCallback(async (forceRefresh = false) => {
        try {
            if (!user || !user.firebaseUser) {
                console.error("User not authenticated");
                return;
            }
            
            // Check cache first unless force refresh is requested
            if (!forceRefresh) {
                const cacheKey = `clients_data_${user?.role || 'anonymous'}`;
                const cachedData = localStorage.getItem(cacheKey);
                const cacheTime = localStorage.getItem(`${cacheKey}_time`);
                const now = Date.now();
                const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (clients don't change often)
                
                if (cachedData && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
                    console.log('📦 Using cached clients data');
                    try {
                        const clientsData = JSON.parse(cachedData);
                        // Only update if data is different to prevent unnecessary re-renders
                        if (JSON.stringify(previousClientsRef.current) !== JSON.stringify(clientsData)) {
                            setClients(clientsData);
                            previousClientsRef.current = clientsData;
                        }
                        setClientsLoading(false); // Ensure loading is false when using cache
                        // If cache is more than 5 minutes old, refresh in background (but don't wait)
                        const cacheAge = now - parseInt(cacheTime);
                        if (cacheAge > 5 * 60 * 1000) {
                            // Fetch fresh data in background without blocking
                            fetchClients(true).catch(err => console.error('Background clients fetch failed:', err));
                        }
                        return;
                    } catch (parseError) {
                        console.error("Error parsing cached clients:", parseError);
                        // Clear invalid cache
                        localStorage.removeItem(cacheKey);
                        localStorage.removeItem(`${cacheKey}_time`);
                    }
                }
            }
            
            // Only show loading spinner if we don't have cached data
            if (previousClientsRef.current.length === 0) {
                setClientsLoading(true);
            }
            console.log('🔄 Fetching fresh clients data');
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            if (JSON.stringify(previousClientsRef.current) !== JSON.stringify(data)) {
                setClients(data);
                previousClientsRef.current = data;
                
                // Cache the data
                const cacheKey = `clients_data_${user?.role || 'anonymous'}`;
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
            }
            setClientsLoading(false);
        } catch (err) {
            console.error("Error fetching clients:", err);
            setClientsLoading(false);
        }
    }, [user]);

    // Fetch assets for user counts (similar to ClientGridManagement)
    const fetchAssets = useCallback(async () => {
        try {
            if (!user || !user.firebaseUser) {
                return;
            }
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/assets`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch assets');
            const data = await res.json();
            setAssets(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching assets:", err);
            setAssets([]);
        }
    }, [user]);

    // Calculate user counts per client
    const userCounts = useMemo(() => {
        const counts = {};
        users.forEach(user => {
            const clientName = user.client_name || user.companyName;
            if (clientName) {
                counts[clientName] = (counts[clientName] || 0) + 1;
            }
        });
        return counts;
    }, [users]);

    // Calculate asset counts per client
    const assetCounts = useMemo(() => {
        const counts = {};
        assets.forEach(asset => {
            const clientName = asset.client_name;
            if (clientName) {
                if (!counts[clientName]) {
                    counts[clientName] = { total: 0, hardware: 0, software: 0 };
                }
                counts[clientName].total += 1;
                if (asset.asset_type === 'hardware') {
                    counts[clientName].hardware += 1;
                } else if (asset.asset_type === 'software') {
                    counts[clientName].software += 1;
                }
            }
        });
        return counts;
    }, [assets]);

    // Handle client selection for super_admin
    const handleClientClick = useCallback((client) => {
        const clientName = client.companyName || client['Client name'];
        const filteredUsers = users.filter(u => (u.client_name || u.companyName) === clientName);
        setSelectedClientForUsers(client);
        setClientUsers(filteredUsers);
        // Navigate to client-specific URL
        navigate(`/user-management/client/${encodeURIComponent(clientName)}`, { replace: false });
    }, [users, navigate]);

    // Update clientUsers when users change and a client is selected
    useEffect(() => {
        if (selectedClientForUsers && user?.role === 'super_admin') {
            const clientName = selectedClientForUsers.companyName || selectedClientForUsers['Client name'];
            const filteredUsers = users.filter(u => (u.client_name || u.companyName) === clientName);
            setClientUsers(filteredUsers);
        }
    }, [users, selectedClientForUsers, user?.role]);

    // Handle back to clients list
    const handleBackToClients = useCallback(() => {
        setSelectedClientForUsers(null);
        setClientUsers([]);
        // Navigate back to main user management
        navigate('/user-management', { replace: false });
    }, [navigate]);

    // Handle add user for specific client
    const handleAddUserForClient = useCallback((client) => {
        const clientName = client.companyName || client['Client name'];
        navigate(`/user-management/create-user?client=${encodeURIComponent(clientName)}`);
    }, [navigate]);

    // Handle import users for specific client
    const handleImportUsersForClient = useCallback((client) => {
        const clientName = client.companyName || client['Client name'];
        setSelectedImportClient(clientName);
        setImportClientModalOpen(true);
    }, []);

    // Remove this useEffect as fetchClients is called in the main useEffect

    // Load initial data from cache if available - optimized for performance
    useEffect(() => {
        if (!user || !user.firebaseUser) return;
        
        // Load clients from cache first (needed for user mapping)
        const clientsCacheKey = `clients_data_${user?.role || 'anonymous'}`;
        const clientsCacheData = localStorage.getItem(clientsCacheKey);
        const clientsCacheTime = localStorage.getItem(`${clientsCacheKey}_time`);
        const now = Date.now();
        const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
        
        if (clientsCacheData && clientsCacheTime && (now - parseInt(clientsCacheTime)) < CACHE_DURATION) {
            console.log('✅ Loading initial clients from cache');
            try {
                const cachedClients = JSON.parse(clientsCacheData);
                if (JSON.stringify(previousClientsRef.current) !== JSON.stringify(cachedClients)) {
                    setClients(cachedClients);
                    previousClientsRef.current = cachedClients;
                }
                setClientsLoading(false); // No loading spinner when using cache
            } catch (error) {
                console.error("Error parsing cached clients:", error);
                localStorage.removeItem(clientsCacheKey);
                localStorage.removeItem(`${clientsCacheKey}_time`);
                setClientsLoading(true); // Show loading if cache is invalid
            }
        } else {
            // No cache or expired - will need to fetch, show loading
            setClientsLoading(true);
        }
        
        // Load users from cache
        const cacheKey = user.role === 'site_admin' ? 
            `userManagement_cache_${user.role}_${userClientName}` : 
            `userManagement_cache_${user.role}`;
        const cacheTimeKey = `${cacheKey}_time`;
        
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        
        if (cachedData && cacheTime) {
            const cacheAge = Date.now() - parseInt(cacheTime);
            const cacheValidDuration = 10 * 60 * 1000; // 10 minutes - longer cache for better performance
            
            if (cacheAge < cacheValidDuration) {
                console.log("✅ Loading initial users from cache, no spinner needed!");
                try {
                    const cachedUsers = JSON.parse(cachedData);
                    // Only update if data is different to prevent unnecessary re-renders
                    if (!areUsersEqual(previousUsersRef.current, cachedUsers)) {
                        setUsers(cachedUsers);
                        previousUsersRef.current = cachedUsers;
                        setLastFetchTime(parseInt(cacheTime));
                    }
                    // If we have cached data, we're not loading anymore
                    console.log("✅ Cache loaded, setting loading to false");
                    setLoading(false);
                } catch (error) {
                    console.error("Error parsing cached users:", error);
                    // Clear invalid cache
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(cacheTimeKey);
                }
            } else {
                console.log("⏱️ Cache expired, will show spinner while fetching fresh data");
            }
        } else {
            console.log("📭 No cache available, will show spinner on first load");
        }
    }, [user?.uid, user?.role, userClientName]);

    // Calculate user statistics - memoized for performance
    const userStats = useMemo(() => {
        if (users.length > 0) {
            return {
                total: users.length,
                siteAdmins: users.filter(u => u.role === 'site_admin').length,
                regularUsers: users.filter(u => u.role === 'user').length,
                totalClients: clients.length
            };
        }
        return {
            total: 0,
            siteAdmins: 0,
            regularUsers: 0,
            totalClients: 0
        };
    }, [users, clients]);

    useEffect(() => {
        if (!user || !user.firebaseUser) {
            console.log("No user or firebaseUser available, skipping listener setup");
            return;
        }
        
        console.log("Setting up users data fetching...");
        // Only set loading if we have absolutely no data
        if (users.length === 0 && !previousUsersRef.current.length) {
            console.log("🔄 Setting loading to true - no data available");
            setLoading(true);
        } else {
            console.log("✅ Not setting loading - data available", { 
                usersLength: users.length, 
                previousUsersLength: previousUsersRef.current.length 
            });
        }
        setError(null);
        
        let unsubscribe = null;
        let websocketCleanup = null;
        
        const setupRealTimeListener = async () => {
            try {
                // Fetch clients first if not available (will use cache if available)
                if (previousClientsRef.current.length === 0) {
                    await fetchClients(false); // false = use cache first
                } else {
                    // Refresh clients in background to ensure fresh data
                    fetchClients(false); // Check cache first, fetch in background if needed
                }
                
                // Use Firestore real-time listener for all user roles
                // READ OPTIMIZATION: Filtered queries reduce Firebase read consumption
                // - site_admin: Only reads users from their company (very efficient)
                // - admin/super_admin: Only reads relevant roles (excludes inactive/deleted users)
                const usersRef = collection(db, 'users');
                console.log("Setting up Firestore listener for real-time updates...");
                console.log("🔧 User context:", { uid: user?.uid, role: user?.role, companyName: user?.companyName });
                
                // Create query based on user role with optimizations
                let usersQuery;
                if (user.role === 'site_admin') {
                    // For site_admin, filter by company (most efficient)
                    // Use the stable userClientName reference
                    if (!userClientName) {
                        console.error("❌ Site admin has no client name, cannot create query");
                        setError("Cannot load users: No company information available");
                        setLoading(false);
                        return;
                    }
                    usersQuery = query(
                        usersRef,
                        where('client_name', '==', userClientName),
                        where('role', 'in', ['user', 'site_admin']),
                        orderBy('firstName', 'asc')
                    );
                    console.log("🔍 Site admin query created:", { clientName: userClientName });
                } else {
                    // For admin and super_admin, filter by relevant roles only
                    // Exclude engineer roles - engineers are managed separately, not as users
                    // Engineer roles: 'support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'
                    usersQuery = query(
                        usersRef,
                        where('role', 'in', ['user', 'site_admin', 'admin', 'super_admin']),
                        orderBy('firstName', 'asc')
                    );
                    console.log("🔍 Admin/Super admin query created (excluding engineers)");
                }
                
                console.log("🔍 Query setup complete, setting up onSnapshot listener...");
                
                console.log("🔍 About to call onSnapshot with query:", usersQuery);
                
                unsubscribe = onSnapshot(usersQuery, 
                    async (snapshot) => {
                        try {
                            console.log("🔥 Firestore real-time update received, snapshot size:", snapshot.size, "users count:", users.length);
                            console.log("📊 Snapshot changes:", snapshot.docChanges().map(change => ({
                                type: change.type,
                                docId: change.doc.id,
                                data: change.doc.data()
                            })));
                            
                            const fetchedUsers = [];
                            snapshot.forEach((doc) => {
                                const userData = doc.data();
                                // Since we're using filtered queries, all users in snapshot are already filtered
                                fetchedUsers.push({
                                    uid: doc.id,
                                    ...userData
                                });
                            });
                            
                            const usersWithClientDetails = fetchedUsers.map(u => {
                                const clientMatch = previousClientsRef.current.find(c => c['Client name'] === u.client_name);
                                return {
                                    ...u,
                                    asset_id: u.asset_id || u.assetid || '',
                                    domain: clientMatch ? clientMatch.Domain : (u.domain || ''),
                                    clientname: clientMatch ? clientMatch['Client name'] : (u.client_name || 'Unknown Client'),
                                    companyName: u.client_name || u.companyName || 'Unknown Company',
                                    firstName: u.firstName || '',
                                    lastName: u.lastName || '',
                                    contactNumber: u.contactNumber || '',
                                    managerEmail: u.managerEmail || '',
                                    employmentType: u.employmentType || '',
                                    designation: u.designation || '',
                                    employeeId: u.employeeId || '',
                                };
                            });
                            
                            // Always update state when snapshot arrives to ensure real-time UI reflect changes
                            setUsers(usersWithClientDetails);
                            previousUsersRef.current = usersWithClientDetails;
                            
                            // Update cache with real-time data using consistent key format
                            const currentTime = Date.now();
                            const cacheKey = user.role === 'site_admin' ? 
                                `userManagement_cache_${user.role}_${userClientName}` : 
                                `userManagement_cache_${user.role}`;
                            const cacheTimeKey = `${cacheKey}_time`;
                            localStorage.setItem(cacheKey, JSON.stringify(usersWithClientDetails));
                            localStorage.setItem(cacheTimeKey, currentTime.toString());
                            setLastFetchTime(currentTime);
                            console.log("💾 Cache saved with key:", cacheKey);
                            
                            // Set loading to false when we get data
                            console.log("✅ Firestore data received, setting loading to false");
                            setLoading(false);
                            setError(null);
                        } catch (error) {
                            console.error("Error processing real-time users update:", error);
                            setError(`Real-time update error: ${error.message}`);
                            setLoading(false);
                        }
                    },
                    (error) => {
                        console.error("❌ Error in real-time users listener:", error);
                        console.error("❌ Error details:", { 
                            code: error.code, 
                            message: error.message, 
                            stack: error.stack 
                        });
                        setError(`Listener error: ${error.message}`);
                        setLoading(false);
                    }
                );
                
                console.log("✅ onSnapshot listener set up successfully");
                
                // Set up WebSocket for additional real-time updates
                try {
                    const { default: websocketClient } = await import('../../utils/websocketClient');
                    
                    const handleUserUpdate = (data) => {
                        console.log('👤 WebSocket user update received:', data);
                        // WebSocket updates are handled by Firestore listener, no need for additional processing
                    };
                    
                    websocketClient.addListener('user_update', handleUserUpdate);
                    websocketCleanup = () => {
                        websocketClient.removeListener('user_update', handleUserUpdate);
                    };
                } catch (wsError) {
                    console.log("WebSocket not available, using Firestore only:", wsError.message);
                }
                
            } catch (error) {
                console.error("Error setting up data fetching:", error);
                setError(`Setup error: ${error.message}`);
                setLoading(false);
            }
        };
        
        setupRealTimeListener();
            
        return () => {
            console.log("Cleaning up users data fetching...");
            if (unsubscribe) {
                unsubscribe();
            }
            if (websocketCleanup) {
                websocketCleanup();
            }
        };
    }, [user?.uid, user?.role, userClientName]); // Use stable userClientName to prevent unnecessary re-renders

    // Fetch assets for super_admin
    useEffect(() => {
        if (user?.role === 'super_admin' && user?.firebaseUser) {
            fetchAssets();
        }
    }, [user?.role, user?.firebaseUser, fetchAssets]);

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData(initialUserState);
        setEditRowId(null);
    };

    // Debug function to test real-time updates
    const handleDebugRefresh = () => {
        console.log("🔧 Manual debug refresh triggered");
        console.log("Current users state:", users.length, "users");
        console.log("Previous users ref:", previousUsersRef.current.length, "users");
        
        // Force a re-render by updating a dummy state
        setUsers([...users]);
        
        // Test if we can trigger a Firestore update
        console.log("🔧 Testing Firestore connection...");
        console.log("🔧 DB instance:", db);
        console.log("🔧 Users collection exists:", !!db);
    };

    const handleAddClientChange = (event, value) => {
        const selectedClient = previousClientsRef.current.find(c => c['Client name'] === value);
        setAddRowData(prev => ({
            ...prev,
            clientname: value || '',
            domain: selectedClient ? selectedClient.Domain : '',
        }));
    };

    const handleAddChange = (e) => {
        const { name, value } = e.target;
        setAddRowData(prev => ({ ...prev, [name]: value }));
    };

    const checkDuplicateEmployeeId = (employeeId, excludeUid = null) => {
        // Duplicates allowed: always return false
        return false;
    };

    const handleAddSave = async (e) => {
        e.preventDefault();
        
        // Validation
        const requiredFields = [
            { field: 'password', message: 'Password is required.' },
            { field: 'emailPrefix', message: 'Email prefix is required.' },
            { field: 'domain', message: 'Domain name is required.' },
            { field: 'asset_id', message: 'Asset ID is required.' },
            { field: 'clientname', message: 'Client Name is required.' },
            { field: 'employeeId', message: 'Employee ID is required.' },
            { field: 'firstName', message: 'First Name is required.' },
            { field: 'lastName', message: 'Last Name is required.' },
            { field: 'contactNumber', message: 'Contact Number is required.' },
            { field: 'managerEmail', message: 'Manager Email is required.' },
            { field: 'employmentType', message: 'Employment Type is required.' },
            { field: 'designation', message: 'Designation is required.' },
        ];
        
        for (const { field, message } of requiredFields) {
            if (!addRowData[field]) {
                setSnackbar({ open: true, message, severity: 'error' });
                return;
            }
        }
        
        // Allow duplicate Employee IDs per new policy
        
        try {
            const email = `${addRowData.emailPrefix.trim()}@${addRowData.domain.trim()}`;
            
            const payload = {
              companyName: addRowData.clientname,
              firstName: addRowData.firstName,
              lastName: addRowData.lastName,
              email: email,
              password: addRowData.password,
              contactNumber: addRowData.contactNumber,
              managerEmail: addRowData.managerEmail,
              employmentType: addRowData.employmentType,
              designation: addRowData.designation,
              employeeId: addRowData.employeeId,
              role: 'user',
              asset_id: addRowData.asset_id,
              joined_date: new Date().toISOString(),
              client_name: addRowData.clientname,
              domain: addRowData.domain,
              isSiteAdmin: false,
            };
            
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload),
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to add user');
            }
            
            setAddMode(false);
            setSnackbar({ open: true, message: 'User added successfully.', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleAddCancel = () => {
        setAddMode(false);
        setAddRowData(initialUserState);
    };

    const handleEditClick = (user) => {
        // If viewing a specific client, include client name in URL
        if (selectedClientForUsers) {
            const clientName = selectedClientForUsers.companyName || selectedClientForUsers['Client name'];
            navigate(`/user-management/client/${encodeURIComponent(clientName)}/user-detail/${user.uid}?edit=true`);
        } else {
            navigate(`/user-management/user-detail/${user.uid}?edit=true`);
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSave = async (uid) => {
        try {
            // Allow duplicate Employee IDs per new policy
            
            const updatePayload = {
                firstName: editRowData.firstName,
                lastName: editRowData.lastName,
                contactNumber: editRowData.contactNumber,
                managerEmail: editRowData.managerEmail,
                employmentType: editRowData.employmentType,
                designation: editRowData.designation,
                employeeId: editRowData.employeeId,
                companyName: editRowData.companyName,
                client_name: editRowData.companyName,
                name: editRowData.name,
                asset_id: editRowData.asset_id,
            };
            
            Object.keys(updatePayload).forEach(key => {
                if (updatePayload[key] === undefined) {
                    delete updatePayload[key];
                }
            });
            
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(updatePayload),
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update user');
            }
            
            setEditRowId(null);
            setEditRowData({ ...initialUserState, showPasswordField: false });
            
            // Show inline notification for this specific user
            setPasswordChangeNotifications(prev => ({
              ...prev,
              [uid]: {
                message: 'edit-success',
                timestamp: Date.now()
              }
            }));
            
            // Auto-hide the notification after 5 seconds
            setTimeout(() => {
              setPasswordChangeNotifications(prev => {
                const newState = { ...prev };
                delete newState[uid];
                return newState;
              });
            }, 5000);
            
            // Real-time updates will be handled by Firestore listener
            console.log("User updated, real-time listener will handle refresh");
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ ...initialUserState });
    };

    const handleViewUser = (user) => {
        // If viewing a specific client, include client name in URL
        if (selectedClientForUsers) {
            const clientName = selectedClientForUsers.companyName || selectedClientForUsers['Client name'];
            navigate(`/user-management/client/${encodeURIComponent(clientName)}/user-detail/${user.uid}`);
        } else {
            navigate(`/user-management/user-detail/${user.uid}`);
        }
    };

    const handleDeleteClick = (event, uid, email) => {
        userToDeleteUidRef.current = uid;
        setCurrentUserEmailToDelete(email);
        anchorEl.current = event.currentTarget;
        setOpenConfirmPopover(true);
    };

    const handleConfirmDelete = async () => {
        setOpenConfirmPopover(false);
        const uid = userToDeleteUidRef.current;
        if (!uid) return;
        
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to delete user');
            }
            
            // Immediately remove from clientUsers if we're viewing a client's users
            if (selectedClientForUsers) {
                setClientUsers(prev => prev.filter(u => u.uid !== uid));
            }
            
            // Show success message
            setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
            
            // Real-time updates will be handled by Firestore listener
            console.log("User deleted, real-time listener will handle refresh");
            
            userToDeleteUidRef.current = null;
            setCurrentUserEmailToDelete('');
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleCancelDelete = () => {
        setOpenConfirmPopover(false);
        userToDeleteUidRef.current = null;
        setCurrentUserEmailToDelete('');
    };

    const openAddUserModal = () => {
      navigate('/user-management/create-user');
    };

    // Update addUserData when selectedClientForAction changes and generate password when modal opens
    useEffect(() => {
        if (addUserModalOpen) {
            // Generate password when modal opens
            const generatedPassword = generatePassword();
            setAddUserData(prev => ({
                ...prev,
                password: generatedPassword,
                ...(selectedClientForAction && { companyName: selectedClientForAction })
            }));
        }
    }, [selectedClientForAction, addUserModalOpen]);

    const closeAddUserModal = () => {
      setAddUserModalOpen(false);
      setAddUserData(initialUserState);
      setSelectedClientForAction(null);
    };

    const handleAddUserChange = (e) => {
      const { name, value } = e.target;
      setAddUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUserSave = async (e) => {
      e.preventDefault();
      setAddUserError('');
      
      // Validation
      const requiredFields = [
        { field: 'companyName', message: 'Company Name is required.' },
        { field: 'firstName', message: 'First Name is required.' },
        { field: 'lastName', message: 'Last Name is required.' },
        { field: 'email', message: 'Email is required.' },
        { field: 'contactNumber', message: 'Contact Number is required.' },
        { field: 'managerEmail', message: 'Manager Email is required.' },
        { field: 'employmentType', message: 'Employment Type is required.' },
        { field: 'designation', message: 'Designation is required.' },
        { field: 'employeeId', message: 'Employee ID is required.' },
      ];
      
      for (const { field, message } of requiredFields) {
        if (!addUserData[field]) {
          setAddUserError(message);
          return;
        }
      }
      
      // Allow duplicate Employee IDs per new policy
      
      try {
        const payload = {
          companyName: addUserData.companyName,
          firstName: addUserData.firstName,
          lastName: addUserData.lastName,
          email: addUserData.email,
          password: addUserData.password,
          contactNumber: addUserData.contactNumber,
          managerEmail: addUserData.managerEmail,
          employmentType: addUserData.employmentType,
          designation: addUserData.designation,
          employeeId: addUserData.employeeId,
          role: 'user',
          client_name: addUserData.companyName,
        };
        
        if (user && user.role === 'site_admin' && user.companyName) {
          payload.companyName = user.companyName;
          payload.client_name = user.companyName;
        }
        
        const idToken = await user.firebaseUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const errData = await res.json();
          setAddUserError(errData.error || 'Failed to create user');
          return;
        }
        
        setAddUserModalOpen(false);
        setSnackbar({ open: true, message: 'User created successfully.', severity: 'success' });
        
        // Real-time updates will be handled by Firestore listener
        console.log("User created, real-time listener will handle refresh");
      } catch (err) {
        setAddUserError(err.message || 'Failed to create user');
      }
    };

    const openChangePwdModal = (uid) => {
      setPwdUserId(uid);
      const generated = generatePassword();
      setNewPassword(generated);
      setChangePwdModalOpen(true);
    };

    const closeChangePwdModal = () => {
      setChangePwdModalOpen(false);
      setPwdUserId(null);
      setNewPassword('');
      setPasswordCopied(false);
      setEmailSent(false);
      setChangePwdError('');
      setPasswordResetStatus('');
      setIsPasswordResetting(false);
    };

    const isAlphanumeric = (str) => /^[a-zA-Z0-9]+$/.test(str);
    const handleChangePassword = async (e) => {
      e.preventDefault();
      setChangePwdError('');
      setPasswordResetStatus('');
      setIsPasswordResetting(true);
      setPasswordResetStatus('Password reset in progress...');
      
      if (!newPassword || newPassword.length < 8) {
        setChangePwdError('Password must be at least 8 characters.');
        setIsPasswordResetting(false);
        setPasswordResetStatus('');
        return;
      }
      if (!isAlphanumeric(newPassword)) {
        setChangePwdError('Password must contain only alphabets and numbers (no special characters).');
        setIsPasswordResetting(false);
        setPasswordResetStatus('');
        return;
      }
      
      try {
        // First, update the password
        const idToken = await user.firebaseUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/${pwdUserId}/password`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
          password: newPassword, 
          mustChangePassword: true,
          sendEmail: emailSent 
        }),
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to change password');
        }
        
        // Email is now sent automatically by the backend when sendEmail is true
        const responseData = await res.json();
        if (responseData.emailSent) {
          setPasswordResetStatus('Password reset and email sent successfully!');
        } else if (emailSent) {
          setPasswordResetStatus('Password reset successful, but email failed to send.');
        } else {
          setPasswordResetStatus('Password reset successfully!');
        }
        
        // Show inline notification for this specific user
        setPasswordChangeNotifications(prev => ({
          ...prev,
          [pwdUserId]: {
            message: 'password reset-success',
            timestamp: Date.now()
          }
        }));
        
        // Auto-hide the notification after 5 seconds
        setTimeout(() => {
          setPasswordChangeNotifications(prev => {
            const newState = { ...prev };
            delete newState[pwdUserId];
            return newState;
          });
        }, 5000);
         
        // Close modal after 2 seconds to show success message
        setTimeout(() => {
        closeChangePwdModal();
          setIsPasswordResetting(false);
          setPasswordResetStatus('');
        }, 2000);
        
        // Real-time updates will be handled by Firestore listener
        console.log("Password changed, real-time listener will handle refresh");
      } catch (err) {
        setPasswordResetStatus('Password reset failed!');
        setChangePwdError(err.message || 'Failed to change password');
        setIsPasswordResetting(false);
        
        // Clear error status after 3 seconds
        setTimeout(() => {
          setPasswordResetStatus('');
        }, 3000);
      }
    };



    const hasUnsavedChanges = (editRowData, originalUser) => {
        return (
            editRowData.managerEmail !== (originalUser.managerEmail || '') ||
            editRowData.employmentType !== (originalUser.employmentType || '') ||
            editRowData.contactNumber !== (originalUser.contactNumber || '') ||
            editRowData.designation !== (originalUser.designation || '') ||
            editRowData.employeeId !== (originalUser.employeeId || '')
        );
    };

    const FIXED_COLUMN_WIDTHS = {
        companyName: '12%',
        firstName: '8%',
        lastName: '8%',
        employeeId: '8%',
        email: '18%',
        designation: '8%',
        contactNumber: '8%',
        managerEmail: '12%',
        employmentType: '8%',
        actions: '10%',
    };

    const getAdjustedColumnWidths = () => {
        if (user && user.role === 'site_admin') {
            return {
                firstName: '10%',
                lastName: '10%',
                employeeId: '10%',
                email: '22%',
                designation: '10%',
                contactNumber: '10%',
                managerEmail: '15%',
                employmentType: '10%',
                actions: '13%',
            };
        }
        return FIXED_COLUMN_WIDTHS;
    };

    const adjustedColumnWidths = getAdjustedColumnWidths();

    const isOwnRow = (userRow) => {
        return user && user.role === 'site_admin' && user.uid === userRow.uid;
    };

    const handleDownloadTemplate = async () => {
      // Employment type options for dropdown
      const employmentTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Other'];
      
      // Create dynamic headers based on user role
      let templateHeaders = [...USER_TEMPLATE_HEADERS];
      let displayHeaders = [...USER_TEMPLATE_DISPLAY_NAMES];
      
      // Add company column for super_admin only
      if (user && user.role === 'super_admin') {
        templateHeaders.splice(2, 0, 'companyName'); // Insert after employeeId
        displayHeaders.splice(2, 0, 'Company Name'); // Insert after Employee ID
      }
      
      // Create ExcelJS workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users');
      
      // Add header row with friendly display names
      worksheet.addRow(displayHeaders);
      
      // Add sample row with empty values, but pre-fill companyName if client is selected
      const sampleRow = templateHeaders.map(header => {
        if (header === 'companyName' && selectedClientForAction) {
          return selectedClientForAction;
        }
        return '';
      });
      worksheet.addRow(sampleRow);
      
      // Set column widths
      displayHeaders.forEach((header, index) => {
        worksheet.getColumn(index + 1).width = 20;
      });
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Find employmentType column index (1-based for ExcelJS)
      // Use display names since that's what we're showing in the template
      const employmentTypeIndex = displayHeaders.indexOf('Employment Type') + 1;
      
      // Add data validation dropdown to employmentType column
      if (employmentTypeIndex > 0) {
        // Create the list formula string - must be in format: "Option1,Option2,Option3"
        // The double quotes are important for Excel to recognize it as a list
        const listFormula = `"${employmentTypeOptions.join(',')}"`;
        
        // Apply data validation to cells in the employmentType column (rows 2 to 500)
        // ExcelJS applies validation to individual cells
        for (let row = 2; row <= 500; row++) {
          const cell = worksheet.getCell(row, employmentTypeIndex);
          
          // Set data validation with dropdown list
          cell.dataValidation = {
            type: 'list',
            allowBlank: true, // Allow blank for flexibility
            formulae: [listFormula],
            showInputMessage: true,
            promptTitle: 'Employment Type',
            prompt: 'Please select an employment type from the dropdown',
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Value',
            error: 'Please select a value from the dropdown list: ' + employmentTypeOptions.join(', ')
          };
        }
      }
      
      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedClientForAction ? `${selectedClientForAction}_user_template.xlsx` : 'user_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    const handleImportFile = (e) => {
      setImportError('');
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          let json = [];
          
          // Use XLSX library for both CSV and Excel files for better parsing
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Parse CSV using XLSX library for proper handling of quoted fields and commas
            const csvText = evt.target.result;
            const workbook = XLSX.read(csvText, { type: 'string', raw: false });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON - CSV will have friendly header names
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
            
            // Check if headers match either field names or display names
            let expectedHeaders = [...USER_TEMPLATE_HEADERS];
            let expectedDisplayNames = [...USER_TEMPLATE_DISPLAY_NAMES];
            if (user && user.role === 'super_admin') {
              expectedHeaders.splice(2, 0, 'companyName');
              expectedDisplayNames.splice(2, 0, 'Company Name');
            }
            
            // Get headers from first row if available
            const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })[0] || [];
            const headers = firstRow.map(h => String(h).trim());
            
            // Check for missing columns (accept either display names or field names)
            const missingCols = expectedDisplayNames.filter(h => 
              !headers.includes(h) && !headers.includes(HEADER_NAME_MAP[h])
            );
            if (missingCols.length > 0) {
              setImportError('Missing columns: ' + missingCols.join(', ') + '. Please use the provided template.');
              setImportedUsers([]);
              setImportedPasswords([]);
              return;
            }
            
            json = jsonData
              .filter(row => {
                // Check if email exists (using either friendly name or field name)
                const email = row['Email'] || row['email'] || row.email;
                return email && email.trim() !== '' && email.toLowerCase() !== 'email';
              })
              .map(row => {
                // Map friendly names to field names
                const mappedRow = {};
                Object.keys(HEADER_NAME_MAP).forEach(displayName => {
                  const fieldName = HEADER_NAME_MAP[displayName];
                  const value = row[displayName] || row[fieldName] || '';
                  mappedRow[fieldName] = typeof value === 'string' ? value.trim() : value;
                });
                // Also handle companyName if it exists
                if (row['Company Name'] || row['companyName']) {
                  mappedRow.companyName = (row['Company Name'] || row['companyName'] || '').trim();
                }
                return mappedRow;
              });
          } else {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON - Excel will have friendly header names
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
            
            // Map friendly header names back to field names
            let expectedHeaders = [...USER_TEMPLATE_HEADERS];
            if (user && user.role === 'super_admin') {
              expectedHeaders.splice(2, 0, 'companyName'); // Insert after employeeId
            }
            
            json = jsonData
              .filter(row => {
                // Check if email exists (using either friendly name or field name)
                const email = row['Email'] || row['email'] || row.email;
                return email && email.trim() !== '' && email.toLowerCase() !== 'email';
              })
              .map(row => {
                // Map friendly names to field names
                const mappedRow = {};
                Object.keys(HEADER_NAME_MAP).forEach(displayName => {
                  const fieldName = HEADER_NAME_MAP[displayName];
                  const value = row[displayName] || row[fieldName] || '';
                  mappedRow[fieldName] = typeof value === 'string' ? value.trim() : value;
                });
                // Also handle companyName if it exists in the row
                if (row['Company Name'] || row['companyName']) {
                  mappedRow.companyName = (row['Company Name'] || row['companyName'] || '').trim();
                }
                return mappedRow;
              });
          }
          
          if (json.length === 0) {
            setImportError('No valid user data found in the file. Please ensure the file contains at least one row with an email address.');
            setImportedUsers([]);
            setImportedPasswords([]);
            return;
          }
          
          const usersWithPasswords = json.map(row => ({ ...row, password: generatePassword() }));
          setImportedUsers(usersWithPasswords);
          setImportedPasswords(usersWithPasswords.map(u => ({ 
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            password: u.password || '',
            contactNumber: u.contactNumber || ''
          })));
          
          // Reset file input to allow selecting the same file again if needed
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (err) {
          console.error('Error parsing file:', err);
          setImportError('Failed to parse file. Please ensure you are using the provided template format. Error: ' + (err.message || 'Unknown error'));
          setImportedUsers([]);
          setImportedPasswords([]);
          
          // Reset file input on error too
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsArrayBuffer(file);
      }
    };

    const openImportModal = () => {
      setImportModalOpen(true);
      setImportedUsers([]);
      setImportError('');
    };

    const closeImportModal = () => {
      setImportModalOpen(false);
      setImportedUsers([]);
      setImportError('');
      setImportResults(null);
      setImportedPasswords([]);
      setCredentialsDownloaded(false);
      setShowCloseConfirmation(false);
      setImportProgress({ show: false, current: 0, total: 0, status: '' });
      setUploadedRows(new Set());
      setSelectedClientForAction(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmImport = async () => {
      setImportError('');
      setImportProgress({ 
        show: true, 
        current: 0, 
        total: importedUsers.length, 
        status: 'Starting import...' 
      });
      setUploadedRows(new Set());
      
      try {
        const usersWithCompany = importedUsers.map(userData => ({
          ...userData,
          companyName: user && user.role === 'site_admin' ? user.companyName : userData.companyName || ''
        }));
        
        setImportProgress(prev => ({ ...prev, status: 'Preparing data for import...' }));
        
        for (let i = 0; i < usersWithCompany.length; i++) {
          const currentUser = usersWithCompany[i];
          
          setImportProgress(prev => ({ 
            ...prev, 
            current: i + 1, 
            status: `Uploading: ${currentUser.firstName} ${currentUser.lastName} (${currentUser.email})` 
          }));
          
          setUploadedRows(prev => new Set([...prev, i]));
          
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        setImportProgress(prev => ({ ...prev, status: 'Sending data to server...' }));
        
        const idToken = await user.firebaseUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            users: usersWithCompany,
            siteAdminCompany: user && user.role === 'site_admin' ? user.companyName : null
          }),
        });
        
        setImportProgress(prev => ({ ...prev, status: 'Processing server response...' }));
        
        const data = await res.json();
        if (!res.ok) {
          setImportError(data.error || 'Bulk import failed.');
          setImportResults(null);
          setImportProgress({ show: false, current: 0, total: 0, status: '' });
        } else {
          setImportProgress(prev => ({ 
            ...prev, 
            current: importedUsers.length, 
            status: 'Import completed successfully!' 
          }));
          
          setTimeout(() => {
            setImportProgress({ show: false, current: 0, total: 0, status: '' });
            setImportResults(data.results);
            setImportedPasswords(importedPasswords.filter(pw => data.results.some(r => r.email === pw.email && r.success)));
            setImportedUsers([]);
          }, 1000);
        }
      } catch (err) {
        setImportError('Bulk import failed.');
        setImportResults(null);
        setImportProgress({ show: false, current: 0, total: 0, status: '' });
      }
    };

    const handleDownloadCredentials = () => {
      if (!importedPasswords.length) return;
      
      const headers = ['firstName', 'lastName', 'email', 'password', 'contactNumber'];
      const csvContent = [
        headers.join(','),
        ...importedPasswords.map(user => [
          user.firstName || '',
          user.lastName || '',
          user.email || '',
          user.password || '',
          user.contactNumber || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'imported_user_credentials.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setCredentialsDownloaded(true);
    };


    const handleChangePage = (event, newPage) => {
      setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };




    const handleSelectUser = (userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleSelectAllUsers = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(user => user.uid));
        }
    };

    const openBulkActionModal = (action) => {
        setBulkAction(action);
        setBulkActionModalOpen(true);
    };

    const closeBulkActionModal = () => {
        setBulkActionModalOpen(false);
        setBulkAction('');
    };

    const handleBulkAction = async () => {
        if (selectedUsers.length === 0) return;
        
        try {
            const idToken = await user.firebaseUser.getIdToken();
            
            if (bulkAction === 'delete') {
                // Bulk delete
                const deletePromises = selectedUsers.map(uid => 
                    fetch(`${API_BASE_URL}/api/users/${uid}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    })
                );
                
                await Promise.all(deletePromises);
                setSnackbar({ open: true, message: `${selectedUsers.length} users deleted successfully.`, severity: 'success' });
            } else if (bulkAction === 'resetPassword') {
                // Bulk password reset
                const resetPromises = selectedUsers.map(uid => {
                    const newPassword = generatePassword();
                    return fetch(`${API_BASE_URL}/api/users/${uid}/password`, {
                        method: 'PUT',
                        headers: { 
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({ password: newPassword, mustChangePassword: true }),
                    });
                });
                
                await Promise.all(resetPromises);
                setSnackbar({ open: true, message: `Passwords reset for ${selectedUsers.length} users.`, severity: 'success' });
            }
            
            setSelectedUsers([]);
            closeBulkActionModal();
            
            // Real-time updates will be handled by Firestore listener
            console.log("Bulk action completed, real-time listener will handle refresh");
        } catch (err) {
            setSnackbar({ open: true, message: `Bulk action failed: ${err.message}`, severity: 'error' });
        }
    };



    const clearAllFilters = () => {
        setSearch('');
        setClientFilter('');
        setFilterRole('all');
    };

    // Client-specific action handlers
    const handleClientAddUser = (clientName) => {
        // Navigate to create-user page with client name as URL parameter
        navigate(`/user-management/create-user?client=${encodeURIComponent(clientName)}`);
    };


    const handleClientImportUsers = (clientName) => {
        navigate(`/user-management/import?client=${encodeURIComponent(clientName)}`);
    };

    const handleClientExportUsers = async (clientName) => {
        try {
            // Filter users for the specific client
            const clientUsers = users.filter(user => 
                user.clientname === clientName || 
                user.client_name === clientName || 
                user.companyName === clientName
            );

            if (clientUsers.length === 0) {
                showFlashMessage('No users found for this client.', 'warning');
                return;
            }

            // Helper function to escape CSV fields
            const escapeCSV = (field) => {
                if (field === null || field === undefined) return '';
                const str = String(field);
                // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Create CSV content
            const headers = ['Email', 'First Name', 'Last Name', 'Employee ID', 'Contact Number', 'Role', 'Status'];
            const csvContent = [
                headers.join(','),
                ...clientUsers.map(user => [
                    escapeCSV(user.email || ''),
                    escapeCSV(user.firstName || ''),
                    escapeCSV(user.lastName || ''),
                    escapeCSV(user.employeeId || ''),
                    escapeCSV(user.contactNumber || ''),
                    escapeCSV(user.role || ''),
                    escapeCSV((user.status || 'active') === 'active' ? 'Active' : 'Inactive')
                ].join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${clientName}_users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showFlashMessage(`Exported ${clientUsers.length} users for ${clientName}`, 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showFlashMessage('Export failed. Please try again.', 'error');
        }
    };

    // Handle toggle client status
    const handleToggleClientStatus = async (client) => {
        const newStatus = (client.status || 'active') === 'active' ? 'inactive' : 'active';
        
        try {
            const token = user?.firebaseUser ? await user.firebaseUser.getIdToken() : await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/clients/${client.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update client status');
            }

            const responseData = await response.json();
            showFlashMessage(responseData.message || `Client status updated to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating client status:', error);
            showFlashMessage(error.message || 'Failed to update client status', 'error');
        }
    };

    // Handle toggle user status
    const handleToggleUserStatus = async (userItem) => {
        const currentStatus = userItem.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        try {
            const token = user?.firebaseUser ? await user.firebaseUser.getIdToken() : await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users/${userItem.uid}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update user status');
            }

            showFlashMessage(`User status updated to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating user status:', error);
            showFlashMessage(error.message || 'Failed to update user status', 'error');
        }
    };

    // Get unique client names
    const uniqueClients = useMemo(() => {
        const clientSet = new Set();
        users.forEach(user => {
            const clientName = user.clientname || user.client_name || user.companyName;
            if (clientName) {
                // For site_admin, only include their own company
                if (user.role === 'site_admin') {
                    if (user.client_name || user.companyName) {
                        clientSet.add(user.client_name || user.companyName);
                    }
                } else {
                    // For other roles, include all clients
                    clientSet.add(clientName);
                }
            }
        });
        // If user is site_admin and they have a company, use that
        if (user?.role === 'site_admin' && user?.companyName) {
            return [user.companyName];
        }
        return Array.from(clientSet).sort();
    }, [users, user]);

    // Handle open import modal with client selection
    const handleOpenImportModal = () => {
        console.log('handleOpenImportModal called', { userRole: user?.role, companyName: user?.companyName });
        // For site_admin, open import modal directly (no client selection needed)
        if (user && user.role === 'site_admin') {
            console.log('Opening import modal directly for site_admin');
            openImportModal();
        } else {
            // For other roles, show client selection modal
            console.log('Opening client selection modal');
            setSelectedImportClient('');
            setImportClientModalOpen(true);
        }
    };

    // Handle open export modal with client selection
    const handleOpenExportModal = () => {
        setSelectedExportClients([]);
        setExportClientModalOpen(true);
    };

    // Handle Escape key and body scroll lock for modals
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (importClientModalOpen) {
                    setImportClientModalOpen(false);
                }
                if (exportClientModalOpen) {
                    setExportClientModalOpen(false);
                }
            }
        };
        
        if (importClientModalOpen || exportClientModalOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
            if (!importClientModalOpen && !exportClientModalOpen) {
                document.body.style.overflow = '';
            }
        };
    }, [importClientModalOpen, exportClientModalOpen]);

    // Handle import with selected client
    const handleImportWithClient = () => {
        if (!selectedImportClient) {
            showFlashMessage('Please select a client for import.', 'warning');
            return;
        }
        setImportClientModalOpen(false);
        navigate(`/user-management/import?client=${encodeURIComponent(selectedImportClient)}`);
    };

    // Handle export with selected clients
    const handleExportWithClients = async () => {
        if (selectedExportClients.length === 0) {
            showFlashMessage('Please select at least one client for export.', 'warning');
            return;
        }

        try {
            // Filter users for selected clients
            const clientsToExport = selectedExportClients;
            const usersToExport = users.filter(user => {
                const userClient = user.clientname || user.client_name || user.companyName;
                return clientsToExport.includes(userClient) && user.role !== 'site_admin';
            });

            if (usersToExport.length === 0) {
                showFlashMessage('No users found for selected clients.', 'warning');
                return;
            }

            // Create CSV content
            const headers = ['Email', 'First Name', 'Last Name', 'Employee ID', 'Contact Number', 'Role', 'Company Name', 'Active'];
            const csvContent = [
                headers.join(','),
                ...usersToExport.map(user => [
                    user.email || '',
                    user.firstName || '',
                    user.lastName || '',
                    user.employeeId || '',
                    user.contactNumber || '',
                    user.role || '',
                    user.clientname || user.client_name || user.companyName || '',
                    user.active !== false ? 'Yes' : 'No'
                ].join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const clientNames = selectedExportClients.length === 1 
                ? selectedExportClients[0] 
                : `${selectedExportClients.length}_clients`;
            link.href = url;
            link.download = `${clientNames}_users_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showFlashMessage(`Exported ${usersToExport.length} users from ${selectedExportClients.length} client(s)`, 'success');
            setExportClientModalOpen(false);
            setSelectedExportClients([]);
        } catch (error) {
            console.error('Export failed:', error);
            showFlashMessage('Export failed. Please try again.', 'error');
        }
    };

    return (
        <div className="user-management-container">
            <style>
                {`
                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 100%; }
                    }
                    @keyframes slideIn {
                        0% { 
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        100% { 
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    .user-card {
                        transition: all 0.3s ease;
                        border-left: 4px solid transparent;
                    }
                    .user-card:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
                        border-left-color: #1976d2;
                    }
                    .status-active {
                        color: #4caf50;
                    }
                    .status-inactive {
                        color: #f44336;
                    }
                    .role-badge {
                        font-size: 0.7rem;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-weight: 600;
                    }
                    .role-user {
                        background-color: #e3f2fd;
                        color: #1976d2;
                    }
                    .role-admin {
                        background-color: #e8f5e9;
                        color: #388e3c;
                    }
                    .role-site_admin {
                        background-color: #fff3e0;
                        color: #f57c00;
                    }
                    
                    /* Table Styles */
                    .table-container {
                        width: 100%;
                        border-radius: 8px;
                        background: white;
                    }
                    
                    .table-wrapper {
                        width: 100%;
                        overflow-x: auto;
                        border-radius: 8px;
                        border: 1px solid #e0e0e0;
                        background: white;
                    }
                    
                    .user-table {
                        width: 100%;
                        min-width: 750px;
                        border-collapse: collapse;
                        font-size: 0.8rem;
                        table-layout: fixed;
                    }
                    
                    .user-table th {
                        background-color: #f8f9fa;
                        padding: 8px 12px;
                        text-align: left;
                        font-weight: 600;
                        color: #455a64;
                        border-bottom: 2px solid #e0e0e0;
                        border-right: 1px solid #e0e0e0;
                        white-space: nowrap;
                    }
                    
                    .user-table th:first-child { width: 30px; } /* Checkbox */
                    .user-table th:nth-child(2) { width: 40px; } /* # */
                    .user-table th:nth-child(3) { width: 200px; } /* Name - wider for full names */
                    .user-table th:nth-child(4) { width: 180px; } /* Email - compact but readable */
                    .user-table th:nth-child(5) { width: 100px; } /* Contact - compact for phone numbers */
                    .user-table th:nth-child(6) { width: 80px; } /* Role - compact for role badges */
                    .user-table th:last-child { width: 140px; border-right: none; } /* Actions - wider for buttons */
                    
                    .user-table td {
                        padding: 8px 12px;
                        border-bottom: 1px solid #e0e0e0;
                        border-right: 1px solid #e0e0e0;
                        vertical-align: middle;
                        max-width: 0;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    
                    .user-table td:last-child {
                        border-right: none;
                        overflow: visible;
                        white-space: normal;
                    }
                    
                    /* Name column - allow wrapping for long names */
                    .user-table td:nth-child(3) {
                        white-space: normal;
                        overflow: visible;
                        max-width: none;
                    }
                    
                    /* Email column - allow wrapping for long emails */
                    .user-table td:nth-child(4) {
                        white-space: normal;
                        overflow: visible;
                        max-width: none;
                    }
                    
                    .user-row:hover {
                        background-color: #f5f5f5;
                    }
                    
                    .user-row:nth-child(even) {
                        background-color: #fafafa;
                    }
                    
                    .user-name {
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .user-name-primary {
                        font-weight: 500;
                        color: #1e293b;
                    }
                    
                    .user-name-secondary {
                        font-size: 0.75rem;
                        color: #64748b;
                    }
                    
                    .clickable-name {
                        transition: all 0.2s ease;
                    }
                    
                    .clickable-name:hover {
                        color: #1976d2;
                        text-decoration: underline;
                    }
                    
                    .action-buttons {
                        display: flex;
                        gap: 4px;
                        justify-content: center;
                    }
                    
                    .action-btn {
                        background: none;
                        border: none;
                        padding: 6px;
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s;
                    }
                    
                    .action-btn:hover {
                        background-color: rgba(0, 0, 0, 0.1);
                    }
                    
                    .action-btn.reset-password {
                        color: #607d8b;
                    }
                    
                    .action-btn.reset-password:hover {
                        color: #455a64;
                        background-color: rgba(96, 125, 139, 0.1);
                    }
                    
                    .action-btn.view {
                        color: #4caf50;
                    }
                    
                    .action-btn.view:hover {
                        color: #388e3c;
                        background-color: rgba(76, 175, 80, 0.1);
                    }
                    
                    .action-btn.edit {
                        color: #607d8b;
                    }
                    
                    .action-btn.edit:hover {
                        color: #455a64;
                        background-color: rgba(96, 125, 139, 0.1);
                    }
                    
                    .action-btn.delete {
                        color: #e57373;
                    }
                    
                    .action-btn.delete:hover {
                        color: #f44336;
                        background-color: rgba(244, 67, 54, 0.1);
                    }
                    
                    .password-notification {
                        font-size: 0.7rem;
                        font-weight: 500;
                        color: #2e7d32;
                    }
                    
                    .checkbox {
                        width: 16px;
                        height: 16px;
                        cursor: pointer;
                    }
                    
                    /* Client Group Styles */
                    .client-group {
                        margin-bottom: 16px;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        overflow: hidden;
                        background: white;
                    }
                    
                    .client-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        background-color: #f8f9fa;
                        border-bottom: 1px solid #e0e0e0;
                        transition: background-color 0.2s;
                    }
                    
                    .client-header:hover {
                        background-color: #eeeeee;
                    }
                    
                    .client-actions {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .client-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .client-icon {
                        color: #1976d2;
                        font-size: 1rem;
                    }
                    
                    .client-name {
                        font-weight: 600;
                        font-size: 1.1rem;
                        color: #1976d2;
                    }
                    
                    .user-count {
                        font-size: 0.8rem;
                        color: #64748b;
                        margin-left: 8px;
                    }
                    
                    .client-toggle {
                        display: flex;
                        align-items: center;
                        color: #64748b;
                    }
                `}
            </style>
            <Box sx={{ 
                p: 2, 
                maxWidth: '100%', 
                overflowX: 'auto',
                backgroundColor: '#f8f9fa',
                minHeight: '100vh'
            }}>
                {/* For super_admin: Show clients grid first, then users grid when client is selected */}
                {user?.role === 'super_admin' && !selectedClientForUsers ? (
                    // Clients Grid View (same as ClientGridManagement)
                    <div className="client-management-page">
                        <style>{`
                            .client-management-page {
                                padding: 1rem;
                                background-color: #f8fafc;
                                min-height: 100vh;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                            }
                            
                            .page-header {
                                margin-bottom: 1rem;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                            }
                            
                            .page-header h1 {
                                font-size: 1.5rem;
                                font-weight: 600;
                                color: #1e293b;
                                margin: 0;
                            }
                            
                            .search-filters-card {
                                background: white;
                                border-radius: 0.5rem;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                                margin-bottom: 0.75rem;
                                padding: 0.75rem;
                            }
                            
                            .data-table-card {
                                background: white;
                                border-radius: 0.5rem;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                                margin-bottom: 1rem;
                                overflow: hidden;
                            }
                            
                            .data-table {
                                width: 100%;
                                border-collapse: collapse;
                            }
                            
                            .data-table th {
                                background-color: #f8fafc;
                                padding: 0.75rem;
                                text-align: left;
                                font-weight: 600;
                                color: #374151;
                                border-bottom: 1px solid #e5e7eb;
                                font-size: 0.875rem;
                            }
                            
                            .data-table td {
                                padding: 0.75rem;
                                border-bottom: 1px solid #f3f4f6;
                                font-size: 0.875rem;
                            }
                            
                            .data-table tr:hover {
                                background-color: #f8fafc;
                            }
                            
                            .client-info {
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            }
                            
                            .action-buttons {
                                display: flex;
                                gap: 0.25rem;
                                justify-content: center;
                            }
                            
                            .action-btn {
                                width: 2rem;
                                height: 2rem;
                                border: none;
                                background: none;
                                cursor: pointer;
                                border-radius: 0.25rem;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 0.875rem;
                                color: #374151;
                            }
                            
                            .action-btn:hover {
                                background-color: #f3f4f6;
                                color: #1f2937;
                            }
                            
                            .action-btn svg {
                                width: 16px;
                                height: 16px;
                            }
                        `}</style>
                        <div className="page-header">
                            <h1>User Management</h1>
                        </div>
                        <div className="search-filters-card">
                            <TextField
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search clients..."
                                size="small"
                                sx={{ width: '100%', maxWidth: '400px' }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </div>
                        <div className="data-table-card">
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Company Name</th>
                                            <th>Location</th>
                                            <th>Contact</th>
                                            <th style={{ textAlign: 'center' }}>Users</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clientsLoading ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                                    <CircularProgress size={24} style={{ marginRight: '8px' }} />
                                                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading clients...</span>
                                                </td>
                                            </tr>
                                        ) : clients.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                                    No clients found
                                                </td>
                                            </tr>
                                        ) : (
                                            clients
                                                .filter(client => {
                                                    const clientName = client.companyName || client['Client name'];
                                                    return !search || clientName?.toLowerCase().includes(search.toLowerCase());
                                                })
                                                .map((client) => {
                                                const clientName = client.companyName || client['Client name'];
                                                const userCount = userCounts[clientName] || 0;
                                                return (
                                                    <tr
                                                        key={client.id || clientName}
                                                        onClick={() => handleClientClick(client)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td>
                                                            <div className="client-info">
                                                                <FaviconIcon 
                                                                    websiteUrl={client.website} 
                                                                    size="28px"
                                                                    alt={`${clientName} favicon`}
                                                                />
                                                                <div>
                                                                    <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6' }}>
                                                                        {clientName}
                                                                    </h4>
                                                                    {client.website && (
                                                                        <a 
                                                                            href={client.website} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ fontSize: '0.75rem', color: '#6b7280' }}
                                                                        >
                                                                            {client.website}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{client.location || 'N/A'}</td>
                                                        <td>{client.clientContactNumber || 'N/A'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{
                                                                display: 'inline-block',
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '0.25rem',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 500,
                                                                backgroundColor: userCount > 0 ? '#eff6ff' : '#fef2f2',
                                                                color: userCount > 0 ? '#2563eb' : '#dc2626',
                                                                border: `1px solid ${userCount > 0 ? '#bfdbfe' : '#fecaca'}`
                                                            }}>
                                                                {userCount} {userCount === 1 ? 'user' : 'users'}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {['admin', 'site_admin', 'super_admin'].includes(user?.role) ? (
                                                                <span
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        padding: '0.25rem 0.5rem',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 500,
                                                                        backgroundColor: (client.status || 'active') === 'active' ? '#d1fae5' : '#fee2e2',
                                                                        color: (client.status || 'active') === 'active' ? '#065f46' : '#991b1b',
                                                                        border: `1px solid ${(client.status || 'active') === 'active' ? '#10b981' : '#ef4444'}`,
                                                                    }}
                                                                    title="Click to toggle status"
                                                                >
                                                                    {(client.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        padding: '0.25rem 0.5rem',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 500,
                                                                        backgroundColor: (client.status || 'active') === 'active' ? '#d1fae5' : '#fee2e2',
                                                                        color: (client.status || 'active') === 'active' ? '#065f46' : '#991b1b',
                                                                        border: `1px solid ${(client.status || 'active') === 'active' ? '#10b981' : '#ef4444'}`,
                                                                    }}
                                                                >
                                                                    {(client.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    className="action-btn"
                                                                    onClick={() => handleAddUserForClient(client)}
                                                                    data-tooltip="Add User"
                                                                    title="Add User"
                                                                >
                                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    className="action-btn"
                                                                    onClick={() => handleImportUsersForClient(client)}
                                                                    data-tooltip="Import Users"
                                                                    title="Import Users"
                                                                >
                                                                    <UploadIcon style={{ fontSize: '16px' }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : user?.role === 'super_admin' && selectedClientForUsers ? (
                    // Users Table View (similar to AssetTable)
                    <div className="p-6 space-y-4 bg-gray-100 min-h-screen">
                        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow border border-gray-300">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBackToClients}
                                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Back to Clients"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">
                                        {selectedClientForUsers.companyName || selectedClientForUsers['Client name']}
                                    </h1>
                                    <p className="text-sm text-gray-600 mt-0.5">
                                        {clientUsers.length} {clientUsers.length === 1 ? 'user' : 'users'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAddUserForClient(selectedClientForUsers)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"/>
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                    </svg>
                                    <span>Add User</span>
                                </button>
                                <button
                                    onClick={() => {
                                        const clientName = selectedClientForUsers?.companyName || selectedClientForUsers?.['Client name'];
                                        if (clientName) {
                                            navigate(`/user-management/import?client=${encodeURIComponent(clientName)}`);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-md text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-300"
                                >
                                    <UploadIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                                    <span>Import Users</span>
                                </button>
                                <button
                                    onClick={() => {
                                        const clientName = selectedClientForUsers?.companyName || selectedClientForUsers?.['Client name'];
                                        if (clientName) {
                                            handleClientExportUsers(clientName);
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <DownloadIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                                    <span>Export Users</span>
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50 border-b-2 border-gray-300">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                User
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Employee ID
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Contact
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Designation
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {clientUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-12 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <PersonIcon style={{ fontSize: '48px', color: '#9ca3af' }} />
                                                        <p className="text-sm font-medium text-gray-600 mt-2">No users found for this client</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            clientUsers.map((userItem) => (
                                                <tr
                                                    key={userItem.uid}
                                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                    onClick={() => handleViewUser(userItem)}
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                                                                {userItem.firstName?.[0] || userItem.name?.[0] || userItem.email?.[0]?.toUpperCase() || 'U'}
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {userItem.firstName && userItem.lastName 
                                                                        ? `${userItem.firstName} ${userItem.lastName}`
                                                                        : userItem.name || userItem.email?.split('@')[0] || 'Unnamed User'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-sm text-gray-700">{userItem.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {userItem.employeeId || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-sm text-gray-700">{userItem.contactNumber || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {userItem.designation || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                                            {userItem.role || 'user'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span
                                                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
                                                            style={{
                                                                backgroundColor: (userItem.status || 'active') === 'active' ? '#dcfce7' : '#fee2e2',
                                                                color: (userItem.status || 'active') === 'active' ? '#166534' : '#991b1b',
                                                            }}
                                                        >
                                                            {(userItem.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Original view for non-super_admin users
                    <div>
                {/* Header Section */}
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' }, 
                    justifyContent: 'space-between', 
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <Box>
                        <Typography 
                            variant="h6" 
                            component="h1" 
                            sx={{ 
                                fontWeight: 500, 
                                color: '#2c3e50',
                                mb: 0.5
                            }}
                        >
                            User Management
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                            Manage user accounts and permissions
                            {user.role === 'site_admin' && lastFetchTime && (
                                <span style={{ marginLeft: '8px', color: '#666' }}>
                                    • Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
                                </span>
                            )}
                        </Typography>
                    </Box>
                    
                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '8px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        marginTop: '0'
                    }}
                    >
                        <button
                            onClick={openAddUserModal}
                            className="px-3 py-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline rounded transition-colors duration-200 ease-in-out focus:outline-none"
                        >
                            Add
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try {
                                    handleOpenImportModal();
                                } catch (error) {
                                    console.error('Error opening import modal:', error);
                                    if (showFlashMessage) {
                                        showFlashMessage('Failed to open import dialog. Please try again.', 'error');
                                    } else {
                                        setSnackbar({ open: true, message: 'Failed to open import dialog. Please try again.', severity: 'error' });
                                    }
                                }
                            }}
                            disabled={!user || (user.role !== 'site_admin' && uniqueClients.length === 0)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#374151',
                                backgroundColor: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: (!user || (user.role !== 'site_admin' && uniqueClients.length === 0)) ? 'not-allowed' : 'pointer',
                                height: '28px',
                                opacity: (!user || (user.role !== 'site_admin' && uniqueClients.length === 0)) ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (user && (user.role === 'site_admin' || uniqueClients.length > 0)) {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.borderColor = '#9ca3af';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (user && (user.role === 'site_admin' || uniqueClients.length > 0)) {
                                    e.target.style.backgroundColor = 'white';
                                    e.target.style.borderColor = '#d1d5db';
                                }
                            }}
                        >
                            <UploadIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                            Import
                        </button>
                        <button
                            onClick={handleOpenExportModal}
                            disabled={uniqueClients.length === 0}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                color: '#374151',
                                backgroundColor: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: uniqueClients.length === 0 ? 'not-allowed' : 'pointer',
                                height: '28px',
                                opacity: uniqueClients.length === 0 ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (uniqueClients.length > 0) {
                                    e.target.style.backgroundColor = '#f9fafb';
                                    e.target.style.borderColor = '#9ca3af';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (uniqueClients.length > 0) {
                                    e.target.style.backgroundColor = 'white';
                                    e.target.style.borderColor = '#d1d5db';
                                }
                            }}
                        >
                            <DownloadIcon style={{ fontSize: '14px', width: '14px', height: '14px' }} />
                            Export
                        </button>
                    </div>
                </Box>
                
                {/* Stats Cards */}
                <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
                        gap: 1.5, 
                        mb: 2 
                }}>
                    <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: '#1976d2', mr: 1.5, width: 32, height: 32 }}>
                                    <GroupIcon sx={{ fontSize: '1rem' }} />
                            </Avatar>
                            <Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Total Users</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{userStats.total}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                    {/* Hide Total Clients card for site_admin - they shouldn't see client-based information */}
                    {user.role !== 'site_admin' && (
                    <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: '#9c27b0', mr: 1.5, width: 32, height: 32 }}>
                                    <GroupIcon sx={{ fontSize: '1rem' }} />
                            </Avatar>
                            <Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Total Clients</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{userStats.totalClients}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                    )}
                    <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: '#ff9800', mr: 1.5, width: 32, height: 32 }}>
                                    <AdminIcon sx={{ fontSize: '1rem' }} />
                            </Avatar>
                            <Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Site Admins</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{userStats.siteAdmins}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
                
                {/* Filters */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, 
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        mt: 1,
                        gap: 1
                    }}>
                        {/* Search and Filters */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1, 
                            width: '100%',
                            flexGrow: 1,
                            height: '35px'
                        }}>
                            <TextField
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setFiltersChanged(true);
                                }}
                                placeholder="Search by email, name, employee ID..."
                                size="small"
                                sx={{ 
                                    flexGrow: 1,
                                    minWidth: 200,
                                    '& .MuiOutlinedInput-root': {
                                        height: '35px',
                                        fontSize: '0.75rem',
                                        borderRadius: 1
                                    }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="disabled" sx={{ fontSize: '1rem' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: search && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearch('')}>
                                                <ClearIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            
                            {user?.role !== 'site_admin' && (
                                <Box sx={{ minWidth: 150, maxWidth: 200 }}>
                                    <CustomDropdown
                                        value={clientFilter}
                                        onChange={(value) => {
                                            setClientFilter(value);
                                            setFiltersChanged(true);
                                        }}
                                        options={[
                                            { value: '', label: 'All Clients' },
                                            ...clients.map(client => ({
                                                value: client['Client name'] || client.companyName,
                                                label: client['Client name'] || client.companyName
                                            }))
                                        ]}
                                        placeholder="Select Client"
                                        size="sm"
                                    />
                                </Box>
                            )}
                            
                            
                            <Box sx={{ minWidth: 120, maxWidth: 150 }}>
                                <CustomDropdown
                                    value={filterRole}
                                    onChange={(value) => {
                                        setFilterRole(value);
                                        setFiltersChanged(true);
                                    }}
                                    options={[
                                        { value: 'all', label: 'All Roles' },
                                        { value: 'user', label: 'User' },
                                        { value: 'site_admin', label: 'Site Admin' }
                                    ]}
                                    placeholder="Select Role"
                                    size="sm"
                                />
                            </Box>
                            
                            {filtersChanged && (
                                <CustomButton
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => {
                                        clearAllFilters();
                                        setFiltersChanged(false);
                                    }}
                                >
                                    Clear Filters
                                </CustomButton>
                            )}
                            <CustomButton
                                variant={showCheckboxes ? "danger" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setShowCheckboxes(!showCheckboxes);
                                    if (!showCheckboxes) {
                                        setSelectedUsers([]); // Clear selections when hiding
                                    }
                                }}
                            >
                                {showCheckboxes ? 'Cancel Select' : 'Select'}
                            </CustomButton>
                        </Box>
                        
                        {/* View Toggle and Bulk Actions */}
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1,
                            alignItems: 'center'
                        }}>
                            {showCheckboxes && selectedUsers.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <CustomButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openBulkActionModal('resetPassword')}
                                    >
                                        Reset Passwords ({selectedUsers.length})
                                    </CustomButton>
                                    <CustomButton
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => openBulkActionModal('delete')}
                                    >
                                        Delete ({selectedUsers.length})
                                    </CustomButton>
                                </Box>
                            )}
                            
                        </Box>
                    </Box>
                    

                    
                    {/* Active Filters */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {search && (
                            <Chip
                                label={`Search: ${search}`}
                                onDelete={() => setSearch('')}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        {clientFilter && (
                            <Chip
                                icon={<GroupIcon />}
                                label={`Client: ${clientFilter}`}
                                onDelete={clearClientFilter}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        {filterRole !== 'all' && (
                            <Chip
                                label={`Role: ${filterRole}`}
                                onDelete={() => setFilterRole('all')}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                    </Box>
                </Box>
                
                {/* Add User Form */}
                <Collapse in={addMode} timeout="auto" unmountOnExit>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 2, 
                            mb: 2, 
                            borderRadius: 1, 
                            backgroundColor: '#ffffff',
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 500, fontSize: '1rem' }}>
                            Add New User
                        </Typography>
                        {addUserError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {addUserError}
                          </Alert>
                        )}
                        <Box display="flex" flexWrap="wrap" gap={2}>
                            {!(user && user.role === 'site_admin') && (
                            <Autocomplete
                                options={previousClientsRef.current.map(c => c['Client name'])}
                                value={addRowData.clientname || ''}
                                onChange={handleAddClientChange}
                                renderInput={(params) => (
                                        <TextField {...params} label="Company Name" required size="small"
                                        data-field-type="company"
                                        InputLabelProps={{ style: { fontSize: '1rem' } }}
                                        inputProps={{ ...params.inputProps, style: { fontSize: '0.8rem' } }}
                                            placeholder="Company Name"
                                        sx={{ minWidth: 200, flex: 1 }}
                                    />
                                )}
                            />
                            )}
                            <TextField
                                label="First Name"
                                name="firstName"
                                value={addRowData.firstName}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="First Name"
                                sx={{ minWidth: 150, flex: 1 }}
                            />
                            <TextField
                                label="Last Name"
                                name="lastName"
                                value={addRowData.lastName}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Last Name"
                                sx={{ minWidth: 150, flex: 1 }}
                            />
                            <TextField
                                label="Employee ID"
                                name="employeeId"
                                value={addRowData.employeeId}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Employee ID"
                                sx={{ minWidth: 150, flex: 1 }}
                                error={!!(addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId))}
                                helperText={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId) ? 'Employee ID already exists' : ''}
                            />
                            <TextField
                                label="Email"
                                name="emailPrefix"
                                value={addRowData.emailPrefix || ''}
                                onChange={e => {
                                    let value = e.target.value;
                                    if (value.includes('@')) {
                                        value = value.split('@')[0];
                                    }
                                    setAddRowData(prev => ({ ...prev, emailPrefix: value }));
                                }}
                                required
                                size="small"
                                data-field-type="email"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Email Prefix"
                                sx={{ flex: 2 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end" className="email-suffix-adornment">
                                            <span style={{ fontSize: '0.8rem' }}>@{addRowData.domain || 'domain.com'}</span>
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <TextField
                                label="Designation"
                                name="designation"
                                value={addRowData.designation}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Designation"
                                sx={{ minWidth: 150, flex: 1 }}
                            />
                            <TextField
                                label="Contact Number"
                                name="contactNumber"
                                value={addRowData.contactNumber}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="contact"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Contact Number"
                                sx={{ minWidth: 150, flex: 1 }}
                            />
                            <TextField
                                label="Manager Email"
                                name="managerEmail"
                                value={addRowData.managerEmail}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="email"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Manager Email"
                                sx={{ minWidth: 200, flex: 1 }}
                            />
                            <Select
                                name="employmentType"
                                value={addRowData.employmentType || ''}
                                onChange={handleAddChange}
                                required
                                size="small"
                                displayEmpty
                                sx={{ minWidth: 150, flex: 1 }}
                            >
                                <MenuItem value="" disabled sx={{ fontSize: '0.8rem' }}>Employment Type</MenuItem>
                                {EMPLOYMENT_TYPES.map(opt => (
                                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
                                ))}
                            </Select>
                            <TextField
                                label="Password"
                                name="password"
                                type="password"
                                value={addRowData.password}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="password"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Password"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Domain Name"
                                name="domain"
                                value={addRowData.domain}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="company"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Domain Name"
                                sx={{ minWidth: 150, flex: 1 }}
                                disabled={!!addRowData.domain}
                            />
                            <TextField
                                label="Asset ID"
                                name="asset_id"
                                value={addRowData.asset_id}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '1rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Asset ID"
                                sx={{ minWidth: 150, flex: 1 }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={handleAddCancel}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleAddSave}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                }}
                            >
                                Save User
                            </Button>
                        </Box>
                    </Paper>
                </Collapse>
                
                {/* Users Table/Card View */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
                ) : (
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            borderRadius: '8px', 
                            overflow: 'hidden',
                            border: '1px solid #e0e0e0',
                            width: '100%'
                        }}
                    >
                        {filteredUsers.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body1" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                                    No user profiles found.
                                </Typography>
                            </Box>
                        ) : (
                            <div className="table-container">
                                {groupedUsersByClient.map(({ clientName, users }, groupIndex) => (
                                    <div key={clientName} className="client-group">
                                        <div className="client-header">
                                            <div className="client-info" onClick={() => handleToggleClientCollapse(clientName)}>
                                                <span className="client-name">{clientName}</span>
                                                <span className="user-count">{users.length} users</span>
                                            </div>
                                            <div className="client-actions">
                                                <div className="client-toggle" onClick={() => handleToggleClientCollapse(clientName)}>
                                                    {collapsedClients[clientName] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {!collapsedClients[clientName] && (
                                            <div className="table-wrapper">
                                                <table className="user-table">
                                                    <thead>
                                                        <tr>
                            {showCheckboxes && (
                                                                <th style={{ width: '30px', minWidth: '30px', maxWidth: '30px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="checkbox"
                                        checked={users.length > 0 && users.every(u => selectedUsers.includes(u.uid))}
                                    onChange={() => {
                                                                            if (users.every(u => selectedUsers.includes(u.uid))) {
                                                                                setSelectedUsers(selectedUsers.filter(id => !users.map(u => u.uid).includes(id)));
                                        } else {
                                                                                setSelectedUsers([...selectedUsers, ...users.map(u => u.uid)]);
                                        }
                                    }}
                                />
                                                                </th>
                                                            )}
                                                            <th style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>#</th>
                                                            <th style={{ 
                                                                width: showActionsColumn[clientName] ? '160px' : '200px', 
                                                                minWidth: showActionsColumn[clientName] ? '160px' : '200px' 
                                                            }}>Name</th>
                                                            <th style={{ 
                                                                width: showActionsColumn[clientName] ? '140px' : '180px', 
                                                                minWidth: showActionsColumn[clientName] ? '140px' : '180px' 
                                                            }}>Email</th>
                                                            <th style={{ 
                                                                width: showActionsColumn[clientName] ? '80px' : '100px', 
                                                                minWidth: showActionsColumn[clientName] ? '80px' : '100px',
                                                                maxWidth: showActionsColumn[clientName] ? '80px' : '100px'
                                                            }}>Contact</th>
                                                            <th style={{ 
                                                                width: showActionsColumn[clientName] ? '60px' : '80px', 
                                                                minWidth: showActionsColumn[clientName] ? '60px' : '80px',
                                                                maxWidth: showActionsColumn[clientName] ? '60px' : '80px'
                                                            }}>Role</th>
                                                            {showActionsColumn[clientName] && (
                                                                <th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Actions</th>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                        {users.map((u, i) => (
                                                            <tr 
                                                                key={u.uid} 
                                                                className="user-row"
                                                                style={{
                                                                    backgroundColor: user && (user.uid === u.uid || user.email === u.email) 
                                                                        ? 'rgba(76, 175, 80, 0.08)' 
                                                                        : 'transparent'
                                                                }}
                                                            >
                                {showCheckboxes && (
                                                                    <td style={{ width: '30px', minWidth: '30px', maxWidth: '30px' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            className="checkbox"
                                        checked={selectedUsers.includes(u.uid)}
                                        onChange={() => handleSelectUser(u.uid)}
                                    />
                                                                    </td>
                                                                )}
                                                                <td style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>{i + 1}</td>
                                                                <td style={{ 
                                                                    width: showActionsColumn[clientName] ? '160px' : '200px', 
                                                                    minWidth: showActionsColumn[clientName] ? '160px' : '200px' 
                                                                }}>
                                                                    <div 
                                                                        className="user-name clickable-name" 
                                                                        onClick={() => handleViewUser(u)}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div className="user-name-primary" style={{ 
                                                                                    overflow: 'hidden', 
                                                                                    textOverflow: 'ellipsis', 
                                                                                    whiteSpace: 'nowrap' 
                                                                                }}>
                                                    {u.firstName || (u.name ? u.name.split(' ')[0] : '')}
                                                                                </div>
                                                                                <div className="user-name-secondary" style={{ 
                                                                                    overflow: 'hidden', 
                                                                                    textOverflow: 'ellipsis', 
                                                                                    whiteSpace: 'nowrap' 
                                                                                }}>
                                                    {u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : '')}
                                                                                </div>
                                                                            </div>
                                                                            {user && (user.uid === u.uid || user.email === u.email) && (
                                                                                <span style={{
                                                                                    display: 'inline-block',
                                                                                    fontSize: '10px',
                                                                                    fontWeight: '600',
                                                                                    padding: '2px 6px',
                                                                                    borderRadius: '4px',
                                                                                    backgroundColor: '#4CAF50',
                                                                                    color: 'white',
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    You
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ 
                                                                    width: showActionsColumn[clientName] ? '140px' : '180px', 
                                                                    minWidth: showActionsColumn[clientName] ? '140px' : '180px' 
                                                                }}>
                                                                    <div style={{ 
                                                                        overflow: 'hidden', 
                                                                        textOverflow: 'ellipsis', 
                                                                        whiteSpace: 'nowrap' 
                                                                    }} title={u.email}>
                                                                        {u.email}
                                                                    </div>
                                                                </td>
                                                                <td style={{ 
                                                                    width: showActionsColumn[clientName] ? '80px' : '100px', 
                                                                    minWidth: showActionsColumn[clientName] ? '80px' : '100px',
                                                                    maxWidth: showActionsColumn[clientName] ? '80px' : '100px'
                                                                }}>
                                                                    <div style={{ 
                                                                        overflow: 'hidden', 
                                                                        textOverflow: 'ellipsis', 
                                                                        whiteSpace: 'nowrap' 
                                                                    }} title={u.contactNumber || '-'}>
                                                                        {u.contactNumber || '-'}
                                                                    </div>
                                                                </td>
                                                                <td style={{ 
                                                                    width: showActionsColumn[clientName] ? '60px' : '80px', 
                                                                    minWidth: showActionsColumn[clientName] ? '60px' : '80px',
                                                                    maxWidth: showActionsColumn[clientName] ? '60px' : '80px'
                                                                }}>
                                                                    <span className={`role-badge role-${u.role}`} style={{ 
                                                                        fontSize: showActionsColumn[clientName] ? '10px' : '12px',
                                                                        padding: showActionsColumn[clientName] ? '2px 6px' : '4px 8px'
                                                                    }}>
                                                                        {u.role === 'user' ? 'User' : u.role === 'site_admin' ? 'Site Admin' : u.role || 'User'}
                                                                    </span>
                                                                </td>
                                                                {showActionsColumn[clientName] && (
                                                                    <td style={{ 
                                                                        width: '120px', 
                                                                        minWidth: '120px',
                                                                        textAlign: 'center'
                                                                    }}>
                                        {passwordChangeNotifications[u.uid] ? (
                                                                            <span className="password-notification">
                                                {passwordChangeNotifications[u.uid].message}
                                                                            </span>
                                                                        ) : (
                                                                            <div className="action-buttons">
                                                                                <TooltipBubble title="View User">
                                                                                    <button
                                                                                        className="action-btn view"
                                                        onClick={() => handleViewUser(u)} 
                                                                                    >
                                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                                                            <circle cx="12" cy="12" r="3"/>
                                                                                        </svg>
                                                                                    </button>
                                                                                </TooltipBubble>
                                                                                <TooltipBubble title="Edit User">
                                                                                    <button
                                                                                        className="action-btn edit"
                                                        onClick={() => handleEditClick(u)} 
                                                                                    >
                                                                                        <EditIcon fontSize="small" />
                                                                                    </button>
                                                                                </TooltipBubble>
                                                                                <TooltipBubble title="Delete User">
                                                                                    <button
                                                                                        className="action-btn delete"
                                                        onClick={(event) => handleDeleteClick(event, u.uid, u.email)} 
                                                                                    >
                                                                                        <DeleteIcon fontSize="small" />
                                                                                    </button>
                                                                                </TooltipBubble>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Paper>
                )}
                
                {/* Add User Modal */}
                <Dialog
                    open={addUserModalOpen}
                    onClose={closeAddUserModal}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 0,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            bgcolor: '#ffffff',
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                            minHeight: '60px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white',
                            px: 3,
                            py: 2
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ 
                                p: 1, 
                                bgcolor: 'rgba(255,255,255,0.2)', 
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <PersonIcon sx={{ fontSize: '1.2rem' }} />
                            </Box>
                            <Box>
                                <Typography variant="body2" sx={{ fontSize: '1rem', opacity: 0.9 }}>
                                    Create a new user profile
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton onClick={closeAddUserModal} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8f9fa' }}>
                        <Box component="form" onSubmit={handleAddUserSave} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} autoComplete="off">
                            {/* Hidden password field to trick Chrome autofill */}
                            <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
                            
                            {/* Contact Information Section */}
                            <Box sx={{ bgcolor: 'white', p: 2.5, border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ width: 3, height: 20, bgcolor: '#ff6b35', borderRadius: 1.5, mr: 1.5 }} />
                                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600, color: '#666' }}>
                                        Contact Information
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                    {user && user.role === 'site_admin' ? (
                                        <TextField
                                            label="Company Name" 
                                            name="companyName"
                                            value={addUserData.companyName}
                                            InputProps={{ 
                                                readOnly: true,
                                                startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                            }} 
                                            required
                                            size="small"
                                            fullWidth
                                            helperText="Auto-filled from your company"
                                            InputLabelProps={{ 
                                                shrink: true, 
                                                sx: { 
                                                    fontSize: '0.9rem',
                                                    color: '#666',
                                                    fontWeight: 500,
                                                    '&.Mui-focused': {
                                                        color: '#333'
                                                    }
                                                } 
                                            }}
                                            sx={{ 
                                                '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#ff6b35',
                                                    }
                                                }
                                            }}
                                        />
                                    ) : (
                                        <TextField 
                                            select
                                            label="Company Name" 
                                            name="companyName"
                                            value={addUserData.companyName}
                                            onChange={handleAddUserChange}
                                            required
                                            size="small"
                                            fullWidth
                                            disabled={!!selectedClientForAction}
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                            }}
                                            InputLabelProps={{ 
                                                shrink: true, 
                                                sx: { 
                                                    fontSize: '0.9rem',
                                                    color: '#666',
                                                    fontWeight: 500,
                                                    '&.Mui-focused': {
                                                        color: '#333'
                                                    }
                                                } 
                                            }}
                                            sx={{ 
                                                '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#ff6b35',
                                                    }
                                                }
                                            }}
                                            helperText={selectedClientForAction ? `Pre-filled for ${selectedClientForAction}` : ''}
                                        >
                                            <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Company</MenuItem>
                                            {previousClientsRef.current.map(c => (
                                                <MenuItem key={c['Client name'] || c.companyName || c.id} value={c['Client name'] || c.companyName} sx={{ fontSize: '0.85rem' }}>
                                                    {c['Client name'] || c.companyName}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                    
                                    <TextField
                                        label="Employee ID" 
                                        name="employeeId" 
                                        value={addUserData.employeeId} 
                                        onChange={handleAddUserChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        error={!!(addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId))}
                                        helperText={addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId) ? 'Employee ID already exists' : ''}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="First Name" 
                                        name="firstName"
                                        value={addUserData.firstName}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField
                                        label="Last Name" 
                                        name="lastName"
                                        value={addUserData.lastName}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField
                                        label="Email" 
                                        name="email"
                                        value={addUserData.email}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    
                                    <TextField
                                        label="Contact Number" 
                                        name="contactNumber"
                                        value={addUserData.contactNumber}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField
                                        label="Manager Email" 
                                        name="managerEmail"
                                        value={addUserData.managerEmail}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><SupervisorAccountIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                </Box>
                            </Box>

                            {/* Professional Information Section */}
                            <Box sx={{ bgcolor: 'white', p: 2.5, border: '1px solid #e0e0e0', borderRadius: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ width: 3, height: 20, bgcolor: '#ff6b35', borderRadius: 1.5, mr: 1.5 }} />
                                    <Typography variant="subtitle1" sx={{ fontSize: '1rem', fontWeight: 600, color: '#666' }}>
                                        Professional Information
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                                    <TextField 
                                        select 
                                        label="Employment Type" 
                                        name="employmentType"
                                        value={addUserData.employmentType}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><WorkIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    >
                                        <MenuItem value="" disabled sx={{ fontSize: '0.9rem' }}>Select Employment Type</MenuItem>
                                        {EMPLOYMENT_TYPES.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.9rem' }}>{opt.label}</MenuItem>
                                        ))}
                                    </TextField>
                                    
                                    <TextField
                                        label="Designation" 
                                        name="designation"
                                        value={addUserData.designation}
                                        onChange={handleAddUserChange}
                                        required
                                        size="small"
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><AdminIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <TextField
                                            label="Password" 
                                            name="password"
                                            value={addUserData.password}
                                            InputProps={{ 
                                                readOnly: true,
                                                startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                            }} 
                                            required 
                                            size="small"
                                            fullWidth
                                            InputLabelProps={{ 
                                                shrink: true, 
                                                sx: { 
                                                    fontSize: '0.9rem',
                                                    color: '#666',
                                                    fontWeight: 500
                                                } 
                                            }}
                                            sx={{ 
                                                '& .MuiInputBase-input': { 
                                                    fontSize: '0.9rem',
                                                    bgcolor: '#f5f5f5',
                                                    color: '#666'
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': {
                                                        borderColor: '#e0e0e0',
                                                    }
                                                }
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#666', ml: 1 }}>
                                            Auto-generated password
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
                        <CustomButton 
                            onClick={closeAddUserModal} 
                            variant="outline" 
                            size="sm"
                        >
                            Cancel
                        </CustomButton>
                        <CustomButton 
                            type="submit" 
                            variant="primary" 
                            size="sm"
                            onClick={handleAddUserSave}
                            startIcon={<PersonIcon />}
                        >
                            Add User
                        </CustomButton>
                    </DialogActions>
                </Dialog>
                
                {/* Edit User Modal */}
                <Dialog
                    open={editRowId !== null}
                    onClose={handleEditCancel}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 0,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            bgcolor: '#ffffff',
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: '#283149',
                            minHeight: '50px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white',
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid #e0e0e0'
                        }}
                    >
                        <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            Edit User
                        </Typography>
                        <IconButton onClick={handleEditCancel} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <ClearIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#f5f5f5' }}>
                        <Box component="form" onSubmit={(e) => {
                            e.preventDefault();
                            handleEditSave(editRowId);
                        }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} autoComplete="off">
                            {/* User Information Section */}
                            <Box sx={{ bgcolor: 'white', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                    <PersonIcon sx={{ color: '#666', mr: 1 }} fontSize="small" />
                                    <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>User Information</Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                                    {!(user && user.role === 'site_admin') && (
                                        <TextField
                                            label="Company Name *" 
                                            name="companyName" 
                                            value={editRowData.companyName || ''} 
                                            onChange={handleEditChange} 
                                            required 
                                            size="small"
                                            fullWidth
                                            InputLabelProps={{ 
                                                shrink: true, 
                                                sx: { 
                                                    fontSize: '0.9rem',
                                                    color: '#666',
                                                    fontWeight: 500,
                                                    '&.Mui-focused': {
                                                        color: '#333'
                                                    }
                                                } 
                                            }}
                                            sx={{ 
                                                '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#ff6b35',
                                                    }
                                                }
                                            }}
                                        />
                                    )}
                                    
                                    <TextField 
                                        label="First Name *" 
                                        name="firstName" 
                                        value={editRowData.firstName || ''} 
                                        onChange={handleEditChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="Last Name *" 
                                        name="lastName" 
                                        value={editRowData.lastName || ''} 
                                        onChange={handleEditChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="Employee ID *" 
                                        name="employeeId"
                                        value={editRowData.employeeId || ''} 
                                        onChange={handleEditChange} 
                                        required
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="Email" 
                                        name="email" 
                                        value={editRowData.email || ''} 
                                        InputProps={{ readOnly: true }}
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '1rem',
                                                color: '#666',
                                                fontWeight: 600
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                        helperText="Email cannot be changed"
                                    />
                                    
                                    <TextField 
                                        label="Designation *" 
                                        name="designation" 
                                        value={editRowData.designation || ''} 
                                        onChange={handleEditChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="Contact Number *" 
                                        name="contactNumber" 
                                        value={editRowData.contactNumber || ''} 
                                        onChange={handleEditChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <TextField 
                                        label="Manager Email *" 
                                        name="managerEmail" 
                                        value={editRowData.managerEmail || ''} 
                                        onChange={handleEditChange} 
                                        required 
                                        size="small"
                                        fullWidth
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '0.9rem',
                                                color: '#666',
                                                fontWeight: 500,
                                                '&.Mui-focused': {
                                                    color: '#333'
                                                }
                                            } 
                                        }}
                                        sx={{ 
                                            '& .MuiInputBase-input': { fontSize: '0.9rem' },
                                            '& .MuiOutlinedInput-root': {
                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                    borderColor: '#ff6b35',
                                                }
                                            }
                                        }}
                                    />
                                    
                                    <FormControl fullWidth size="small" required>
                                        <InputLabel 
                                            sx={{ 
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            }}
                                        >
                                            Employment Type *
                                        </InputLabel>
                                        <Select
                                            name="employmentType"
                                            value={editRowData.employmentType || ''}
                                            onChange={handleEditChange}
                                            required
                                            displayEmpty
                                            label="Employment Type *"
                                            sx={{ '& .MuiSelect-select': { fontSize: '0.85rem' } }}
                                        >
                                            <MenuItem value="" disabled sx={{ fontSize: '0.8rem' }}>Select Employment Type</MenuItem>
                                            {EMPLOYMENT_TYPES.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f5f5f5' }}>
                        <CustomButton onClick={handleEditCancel} variant="outline" size="sm">
                            Cancel
                        </CustomButton>
                        <CustomButton 
                            onClick={() => handleEditSave(editRowId)} 
                            variant="primary" 
                            size="sm"
                        >
                            Save Changes
                        </CustomButton>
                    </DialogActions>
                </Dialog>
                
                {/* Change Password Modal */}
                <Dialog open={changePwdModalOpen} onClose={closeChangePwdModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Change Password</DialogTitle>
                    <form onSubmit={handleChangePassword}>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                            <Box sx={{ 
                                bgcolor: '#f8f9fa', 
                                p: 2, 
                                borderRadius: 1, 
                                border: '1px solid #e0e0e0',
                                mb: 1
                            }}>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#1976d2' }}>
                                    Generated Password:
                                </Typography>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    bgcolor: 'white',
                                    p: 1.5,
                                    borderRadius: 1,
                                    border: '1px solid #e0e0e0'
                                }}>
                                    <Typography 
                                        variant="body1" 
                                        sx={{ 
                                            fontFamily: 'monospace', 
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: '#2c3e50',
                                            flex: 1,
                                            letterSpacing: '0.1em'
                                        }}
                                    >
                                        {newPassword}
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={passwordCopied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                                        onClick={() => {
                                            navigator.clipboard.writeText(newPassword);
                                            setPasswordCopied(true);
                                            showFlashMessage('Password copied to clipboard!', 'success');
                                        }}
                                        disabled={passwordCopied}
                                        size="small"
                                        sx={{ 
                                            bgcolor: passwordCopied ? '#6c757d' : '#28a745',
                                            '&:hover': { 
                                                bgcolor: passwordCopied ? '#5a6268' : '#218838' 
                                            },
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            opacity: passwordCopied ? 0.7 : 1,
                                            cursor: passwordCopied ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {passwordCopied ? 'Copied!' : 'Copy'}
                                    </Button>
                                    
                                </Box>
                                
                                {/* Email Checkbox */}
                                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                                    <Tooltip title="When checked, the password will be automatically sent to the user via email when you click Update">
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={emailSent}
                                                    onChange={(e) => setEmailSent(e.target.checked)}
                                                    disabled={isPasswordResetting}
                                                    sx={{
                                                        color: '#007bff',
                                                        '&.Mui-checked': {
                                                            color: '#007bff',
                                                        },
                                                    }}
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <EmailIcon fontSize="small" sx={{ color: '#007bff' }} />
                                                    <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                                        Send password via email to user
                                                    </Typography>
                                                </Box>
                                            }
                                            sx={{ 
                                                margin: 0,
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: '0.9rem',
                                                    color: '#333'
                                                }
                                            }}
                                        />
                                    </Tooltip>
                                </Box>
                                <Typography variant="caption" sx={{ color: '#6c757d', mt: 1, display: 'block' }}>
                                    Copy this password and share it securely with the user. The user will be required to change it on login.
                                </Typography>
                                {!passwordCopied && !emailSent && (
                                    <Typography variant="caption" sx={{ color: '#dc3545', mt: 1, display: 'block', fontWeight: 500 }}>
                                        ⚠️ You must either copy the password or check the email option before proceeding with the update.
                                    </Typography>
                                )}
                                {passwordCopied && (
                                    <Typography variant="caption" sx={{ color: '#28a745', mt: 1, display: 'block', fontWeight: 500 }}>
                                        ✅ Password copied! You can now proceed with the update.
                                    </Typography>
                                )}
                                {emailSent && (
                                    <Typography variant="caption" sx={{ color: '#28a745', mt: 1, display: 'block', fontWeight: 500 }}>
                                        ✅ Email option selected! Password will be sent via email when you update.
                                    </Typography>
                                )}
                            </Box>
                            
                            <TextField
                                label="New Password"
                                name="newPassword"
                                value={newPassword}
                                InputProps={{ readOnly: true }}
                                required
                                size="small"
                                fullWidth
                                type="text"
                                sx={{ display: 'none' }}
                            />
                            {changePwdError && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {changePwdError}
                                </Alert>
                            )}
                            {passwordResetStatus && (
                                <Alert 
                                    severity={passwordResetStatus.includes('successfully') ? 'success' : 
                                             passwordResetStatus.includes('failed') ? 'error' : 'info'} 
                                    sx={{ mb: 2 }}
                                >
                                    {passwordResetStatus}
                                </Alert>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ py: 1, px: 2 }}>
                            <Button 
                                onClick={closeChangePwdModal} 
                                size="small"
                                disabled={isPasswordResetting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                variant="contained" 
                                color="primary" 
                                size="small"
                                disabled={isPasswordResetting || (!passwordCopied && !emailSent)}
                                startIcon={isPasswordResetting ? <CircularProgress size={16} /> : null}
                                sx={{
                                    opacity: (!passwordCopied && !emailSent) ? 0.6 : 1,
                                    cursor: (!passwordCopied && !emailSent) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isPasswordResetting ? 'Updating...' : 'Update'}
                            </Button>
                        </DialogActions>
                    </form>
                </Dialog>
                
                {/* Import Excel Modal */}
                <Dialog open={importModalOpen} onClose={closeImportModal} maxWidth="lg" fullWidth sx={{ '& .MuiDialog-paper': { minHeight: '80vh' } }}>
                    <DialogTitle sx={{ fontSize: 18, py: 1.5, textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>Import Users from Excel</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                        {!importResults && !importedUsers.length && (
                            <>
                                <Box sx={{ mt: 2 }}>
                                    <CustomButton onClick={handleDownloadTemplate} variant="outline" size="sm" className="mb-1 w-fit">
                                        Download CSV Template
                                    </CustomButton>
                                </Box>
                                <Box sx={{ 
                                    border: '2px dashed #ccc', 
                                    borderRadius: 2, 
                                    p: 2, 
                                    textAlign: 'center',
                                    backgroundColor: '#fafafa',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        borderColor: '#1976d2',
                                        backgroundColor: '#f0f8ff'
                                    }
                                }}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleImportFile}
                                        style={{ 
                                            display: 'none'
                                        }}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            border: '1px solid #1976d2',
                                            color: '#1976d2',
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            px: 2,
                                            py: 1,
                                            fontSize: '0.8rem',
                                            '&:hover': {
                                                backgroundColor: '#1976d2',
                                                color: 'white'
                                            }
                                        }}
                                    >
                                        Choose File
                                    </Button>
                                    <Typography variant="body2" sx={{ mt: 1, color: '#666', fontSize: '0.75rem' }}>
                                        Select .xlsx, .xls, or .csv file to import
                                    </Typography>
                                </Box>
                            </>
                        )}
                        {importError && <Alert severity="error">{importError}</Alert>}
                        
                        {importProgress.show && (
                            <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#fafafa' }}>
                                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: '#1976d2' }}>
                                    {importProgress.status}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ flex: 1, bgcolor: '#e0e0e0', borderRadius: 1, height: 8 }}>
                                        <Box
                                            sx={{
                                                width: `${(importProgress.current / importProgress.total) * 100}%`,
                                                height: '100%',
                                                bgcolor: '#1976d2',
                                                borderRadius: 1,
                                                transition: 'width 0.3s ease',
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" sx={{ minWidth: 60, textAlign: 'right' }}>
                                        {importProgress.current}/{importProgress.total}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        
                        {importedUsers.length > 0 && (
                            <Box sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1, mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', width: '50px' }}>No.</TableCell>
                                            {USER_TEMPLATE_HEADERS.map(h => (
                                                <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importedUsers.map((row, idx) => (
                                            <TableRow 
                                                key={idx}
                                                sx={{
                                                    backgroundColor: uploadedRows.has(idx) ? '#e8f5e8' : 'inherit',
                                                    transition: 'background-color 0.3s ease',
                                                    '&:hover': {
                                                        backgroundColor: uploadedRows.has(idx) ? '#d4edda' : '#f5f5f5'
                                                    }
                                                }}
                                            >
                                                <TableCell sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#666' }}>
                                                    {idx + 1}
                                                </TableCell>
                                                {USER_TEMPLATE_HEADERS.map(h => (
                                                    <TableCell key={h} sx={{ fontSize: '0.65rem' }}>{row[h]}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                        
                        {importResults && (
                            <Box sx={{ mt: 2 }}>
                                <Alert severity="info" sx={{ mb: 1 }}>Import Results</Alert>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Error</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importResults.map((r, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{r.email}</TableCell>
                                                <TableCell>{r.success ? 'Success' : 'Failed'}</TableCell>
                                                <TableCell>{r.error || ''}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                        
                        {importResults && importedPasswords.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                {!credentialsDownloaded ? (
                                    <Alert severity="warning" sx={{ mb: 1 }}>
                                        ⚠️ Important: Download the user credentials before closing this window!
                                    </Alert>
                                ) : (
                                    <Alert severity="success" sx={{ mb: 1 }}>
                                        ✅ Credentials downloaded successfully!
                                    </Alert>
                                )}
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>First Name</TableCell>
                                            <TableCell>Last Name</TableCell>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Password</TableCell>
                                            <TableCell>Contact Number</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importedPasswords.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{row.firstName || '-'}</TableCell>
                                                <TableCell>{row.lastName || '-'}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.password}</TableCell>
                                                <TableCell>{row.contactNumber || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions sx={{ py: 1, px: 2 }}>
                        {importResults && importedPasswords.length > 0 && !credentialsDownloaded ? (
                            <>
                                <CustomButton 
                                    onClick={() => setShowCloseConfirmation(true)} 
                                    size="sm" 
                                    variant="danger"
                                >
                                    Close Anyway
                                </CustomButton>
                                <CustomButton 
                                    onClick={handleDownloadCredentials} 
                                    variant="primary" 
                                    size="sm"
                                >
                                    Download User Credentials
                                </CustomButton>
                            </>
                        ) : importResults && importedPasswords.length > 0 && credentialsDownloaded ? (
                            <>
                                <CustomButton onClick={closeImportModal} size="sm" variant="primary">
                                    Close
                                </CustomButton>
                            </>
                        ) : (
                            <>
                                <CustomButton onClick={closeImportModal} size="sm" variant="danger">
                                    Cancel
                                </CustomButton>
                                <CustomButton 
                                    onClick={handleConfirmImport} 
                                    variant="primary" 
                                    size="sm" 
                                    disabled={importedUsers.length === 0 || !!importResults}
                                >
                                    Confirm Import
                                </CustomButton>
                            </>
                        )}
                    </DialogActions>
                </Dialog>
                
                {/* Bulk Action Modal */}
                <Dialog
                    open={bulkActionModalOpen}
                    onClose={closeBulkActionModal}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 0,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            bgcolor: '#ffffff',
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: bulkAction === 'delete' ? '#d32f2f' : '#1976d2',
                            minHeight: '50px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white',
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid #e0e0e0'
                        }}
                    >
                        <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            {bulkAction === 'delete' ? 'Delete Users' : 'Reset Passwords'}
                        </Typography>
                        <IconButton onClick={closeBulkActionModal} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#f5f5f5' }}>
                        <Box sx={{ bgcolor: 'white', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                {bulkAction === 'delete' 
                                    ? `Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`
                                    : `Are you sure you want to reset passwords for ${selectedUsers.length} users? New passwords will be generated and users will be required to change them on next login.`
                                }
                            </Typography>
                            <Alert severity={bulkAction === 'delete' ? 'error' : 'warning'}>
                                {bulkAction === 'delete' 
                                    ? 'Deleting users will permanently remove all their data from the system.'
                                    : 'Users will be logged out of all active sessions and will need to use their new password to log in again.'
                                }
                            </Alert>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
                        <CustomButton 
                            onClick={closeBulkActionModal} 
                            variant="outline" 
                            size="sm"
                        >
                            Cancel
                        </CustomButton>
                        <CustomButton 
                            onClick={handleBulkAction} 
                            variant={bulkAction === 'delete' ? 'danger' : 'primary'} 
                            size="sm"
                        >
                            {bulkAction === 'delete' ? 'Delete Users' : 'Reset Passwords'}
                        </CustomButton>
                    </DialogActions>
                </Dialog>
                
                {/* Import Client Selection Modal */}
                {importClientModalOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1300,
                            padding: '20px'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setImportClientModalOpen(false);
                            }
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                width: '100%',
                                maxWidth: '500px',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                                overflow: 'hidden'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                                    minHeight: '60px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: 'white',
                                    padding: '16px 24px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <UploadIcon style={{ fontSize: '20px', width: '20px', height: '20px' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                        Select Client for Import
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setImportClientModalOpen(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <CloseIcon style={{ fontSize: '20px', width: '20px', height: '20px' }} />
                                </button>
                            </div>
                            {/* Content */}
                            <div
                                style={{
                                    padding: '24px',
                                    backgroundColor: '#f8f9fa',
                                    flex: 1,
                                    overflowY: 'auto'
                                }}
                            >
                                <div
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '20px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '12px'
                                    }}
                                >
                                    <p style={{ marginBottom: '16px', color: '#666', fontSize: '0.875rem', marginTop: 0 }}>
                                        Please select a client to import users for:
                                    </p>
                                    <select
                                        value={selectedImportClient}
                                        onChange={(e) => setSelectedImportClient(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '0.875rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            backgroundColor: 'white',
                                            color: '#374151',
                                            cursor: 'pointer',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#3b82f6';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#d1d5db';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    >
                                        <option value="">Select Client</option>
                                        {uniqueClients.map((clientName) => (
                                            <option key={clientName} value={clientName}>
                                                {clientName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {/* Footer */}
                            <div
                                style={{
                                    padding: '16px 24px',
                                    backgroundColor: '#f8f9fa',
                                    borderTop: '1px solid #e0e0e0',
                                    display: 'flex',
                                    gap: '8px',
                                    justifyContent: 'flex-end'
                                }}
                            >
                                <button
                                    onClick={() => setImportClientModalOpen(false)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 16px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151',
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        height: '32px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.borderColor = '#9ca3af';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.borderColor = '#d1d5db';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportWithClient}
                                    disabled={!selectedImportClient}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 16px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: 'white',
                                        backgroundColor: !selectedImportClient ? '#9ca3af' : '#f59e0b',
                                        border: `1px solid ${!selectedImportClient ? '#9ca3af' : '#f59e0b'}`,
                                        borderRadius: '4px',
                                        cursor: !selectedImportClient ? 'not-allowed' : 'pointer',
                                        height: '32px',
                                        opacity: !selectedImportClient ? 0.6 : 1,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedImportClient) {
                                            e.target.style.backgroundColor = '#f97316';
                                            e.target.style.borderColor = '#f97316';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedImportClient) {
                                            e.target.style.backgroundColor = '#f59e0b';
                                            e.target.style.borderColor = '#f59e0b';
                                        }
                                    }}
                                >
                                    <UploadIcon style={{ fontSize: '16px', width: '16px', height: '16px' }} />
                                    Import Users
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Export Client Selection Modal */}
                {exportClientModalOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1300,
                            padding: '20px'
                        }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setExportClientModalOpen(false);
                            }
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                width: '100%',
                                maxWidth: '500px',
                                maxHeight: '90vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                                overflow: 'hidden'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    minHeight: '60px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    color: 'white',
                                    padding: '16px 24px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <DownloadIcon style={{ fontSize: '20px', width: '20px', height: '20px' }} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                                        Select Clients for Export
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setExportClientModalOpen(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '4px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <CloseIcon style={{ fontSize: '20px', width: '20px', height: '20px' }} />
                                </button>
                            </div>
                            {/* Content */}
                            <div
                                style={{
                                    padding: '24px',
                                    backgroundColor: '#f8f9fa',
                                    flex: 1,
                                    overflowY: 'auto'
                                }}
                            >
                                <div
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '20px',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '12px'
                                    }}
                                >
                                    <p style={{ marginBottom: '16px', color: '#666', fontSize: '0.875rem', marginTop: 0 }}>
                                        Select one or more clients to export users from:
                                    </p>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {uniqueClients.map((clientName) => (
                                            <label
                                                key={clientName}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '8px 0',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    color: '#374151'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedExportClients.includes(clientName)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedExportClients([...selectedExportClients, clientName]);
                                                        } else {
                                                            setSelectedExportClients(selectedExportClients.filter(c => c !== clientName));
                                                        }
                                                    }}
                                                    style={{
                                                        width: '16px',
                                                        height: '16px',
                                                        marginRight: '8px',
                                                        cursor: 'pointer',
                                                        accentColor: '#10b981'
                                                    }}
                                                />
                                                {clientName}
                                            </label>
                                        ))}
                                    </div>
                                    {selectedExportClients.length > 0 && (
                                        <p style={{ marginTop: '16px', color: '#10b981', fontSize: '0.75rem', marginBottom: 0 }}>
                                            {selectedExportClients.length} client(s) selected
                                        </p>
                                    )}
                                </div>
                            </div>
                            {/* Footer */}
                            <div
                                style={{
                                    padding: '16px 24px',
                                    backgroundColor: '#f8f9fa',
                                    borderTop: '1px solid #e0e0e0',
                                    display: 'flex',
                                    gap: '8px',
                                    justifyContent: 'flex-end'
                                }}
                            >
                                <button
                                    onClick={() => {
                                        setExportClientModalOpen(false);
                                        setSelectedExportClients([]);
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 16px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: '#374151',
                                        backgroundColor: 'white',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        height: '32px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = '#f9fafb';
                                        e.target.style.borderColor = '#9ca3af';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'white';
                                        e.target.style.borderColor = '#d1d5db';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExportWithClients}
                                    disabled={selectedExportClients.length === 0}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 16px',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: 'white',
                                        backgroundColor: selectedExportClients.length === 0 ? '#9ca3af' : '#10b981',
                                        border: `1px solid ${selectedExportClients.length === 0 ? '#9ca3af' : '#10b981'}`,
                                        borderRadius: '4px',
                                        cursor: selectedExportClients.length === 0 ? 'not-allowed' : 'pointer',
                                        height: '32px',
                                        opacity: selectedExportClients.length === 0 ? 0.6 : 1,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedExportClients.length > 0) {
                                            e.target.style.backgroundColor = '#059669';
                                            e.target.style.borderColor = '#059669';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedExportClients.length > 0) {
                                            e.target.style.backgroundColor = '#10b981';
                                            e.target.style.borderColor = '#10b981';
                                        }
                                    }}
                                >
                                    <DownloadIcon style={{ fontSize: '16px', width: '16px', height: '16px' }} />
                                    Export Users ({selectedExportClients.length > 0 ? selectedExportClients.length : 0})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Close Confirmation Dialog */}
                <Dialog 
                    open={showCloseConfirmation} 
                    onClose={() => setShowCloseConfirmation(false)} 
                    maxWidth="xs" 
                    fullWidth
                >
                    <DialogTitle sx={{ fontSize: 16, py: 1.5, textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                        ⚠️ Warning
                    </DialogTitle>
                    <DialogContent sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>
                            Are you sure you want to close? You will not be able to see these login credentials later.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ py: 1, px: 2, justifyContent: 'center' }}>
                        <Button 
                            onClick={() => setShowCloseConfirmation(false)} 
                            size="small" 
                            variant="outlined"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={closeImportModal} 
                            size="small" 
                            variant="contained" 
                            color="error"
                        >
                            Close Anyway
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={openConfirmPopover}
                    onClose={handleCancelDelete}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 0,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                            bgcolor: '#ffffff',
                        }
                    }}
                >
                    <DialogTitle
                        sx={{
                            background: '#d32f2f',
                            minHeight: '50px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            color: 'white',
                            px: 2.5,
                            py: 2,
                            borderBottom: '1px solid #e0e0e0'
                        }}
                    >
                        <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                            ⚠️ Delete User
                        </Typography>
                        <IconButton onClick={handleCancelDelete} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#f5f5f5' }}>
                        <Box sx={{ bgcolor: 'white', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
                                    Confirm Deletion
                                </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem', lineHeight: 1.5 }}>
                                Are you sure you want to delete <strong>{currentUserEmailToDelete}</strong>? 
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#d32f2f', fontWeight: 500 }}>
                                ⚠️ This action cannot be undone and will permanently remove the user from the system.
                            </Typography>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
                        <Button 
                            onClick={handleCancelDelete} 
                            variant="outlined" 
                            size="small"
                            sx={{ 
                                textTransform: 'none', 
                                fontSize: '0.85rem',
                                borderRadius: 1,
                                px: 2
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleConfirmDelete} 
                            variant="contained" 
                            color="error" 
                            size="small"
                            autoFocus
                            sx={{ 
                                textTransform: 'none', 
                                fontSize: '0.85rem',
                                borderRadius: 1,
                                px: 2,
                                boxShadow: 'none',
                                '&:hover': {
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }
                            }}
                        >
                            Delete User
                        </Button>
                    </DialogActions>
                </Dialog>
                    </div>
                )}
                
                {/* Snackbar - outside conditional rendering */}
                <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={3000} 
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    sx={{ 
                        top: '80px !important',
                        '& .MuiAlert-root': {
                            minWidth: '300px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }
                    }}
                >
                    <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </div>
    );
};

UserManagementComponent.displayName = 'UserManagementComponent';

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    // Only re-render if user ID, role, or company name changes
    // Ignore showFlashMessage as it's recreated on every parent render
    return (
        prevProps.user?.uid === nextProps.user?.uid &&
        prevProps.user?.role === nextProps.user?.role &&
        prevProps.user?.companyName === nextProps.user?.companyName
    );
};

export default React.memo(UserManagementComponent, arePropsEqual);