import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import CustomDropdown from '../common/CustomDropdown';
import CustomButton from '../common/CustomButton';
import ClientActionDropdown from '../common/ClientActionDropdown';
import TooltipBubble from '../common/TooltipBubble';
import {
    Button, Chip, TextField, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Snackbar, Alert, Typography, Popover, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, useMediaQuery, Card, CardContent, CardActions, Grid, CircularProgress,
    FormControl, InputLabel, OutlinedInput, FormHelperText, Tooltip, TablePagination, Badge, Divider, Tabs, Tab, Autocomplete, InputAdornment, Switch, FormControlLabel, Avatar, Stack
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Add as AddIcon, 
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
import { useTheme } from '@mui/material/styles';
import SmartCacheManager from '../../utils/smartCacheManager';
// For Material-UI v5 and above
import Checkbox from '@mui/material/Checkbox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

// Helper for deep comparison
const areUsersEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
        const user1 = arr1[i];
        const user2 = arr2[i];
        
        if (!user1 || !user2) return false;
        
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
            return false;
        }
    }
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

function generatePassword(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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


const UserManagementComponent = ({ user, showFlashMessage }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(false);
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

    const handleToggleClientCollapse = (client) => {
      setCollapsedClients(prev => ({ ...prev, [client]: !prev[client] }));
    };

    const handleToggleActionsColumn = (clientName) => {
        setShowActionsColumn(prev => ({
            ...prev,
            [clientName]: !prev[clientName]
        }));
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const clientId = urlParams.get('clientId');
        
        if (clientId && clients.length > 0) {
            const client = clients.find(c => c.id === clientId);
            if (client) {
                setClientFilter(client.companyName);
                setHighlightedClient(client.companyName);
                navigate('/user-management', { replace: true });
            }
        }
    }, [location.search, clients, navigate]);


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

    const fetchClients = useCallback(async () => {
        try {
            if (!user || !user.firebaseUser) {
                console.error("User not authenticated");
                return;
            }
            
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
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, [user]);

    // Remove this useEffect as fetchClients is called in the main useEffect

    // Load initial data from cache if available - optimized for performance
    useEffect(() => {
        if (!user || !user.firebaseUser) return;
        
        const cacheKey = user.role === 'site_admin' ? 
            `userManagement_cache_${user.role}_${user.companyName}` : 
            `userManagement_cache_${user.role}`;
        const cacheTimeKey = `${cacheKey}_time`;
        
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(cacheTimeKey);
        
        if (cachedData && cacheTime) {
            const cacheAge = Date.now() - parseInt(cacheTime);
            const cacheValidDuration = 10 * 60 * 1000; // 10 minutes - longer cache for better performance
            
            if (cacheAge < cacheValidDuration) {
                console.log("Loading initial users from cache...");
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
            }
        }
    }, [user?.uid, user?.role, user?.companyName]);

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
                // Fetch clients first if not available
                if (previousClientsRef.current.length === 0) {
                    await fetchClients();
                }
                
                // Use Firestore real-time listener for all user roles
                // READ OPTIMIZATION: Filtered queries reduce Firebase read consumption
                // - site_admin: Only reads users from their company (very efficient)
                // - admin/super_admin: Only reads relevant roles (excludes inactive/deleted users)
                const usersRef = collection(db, 'users');
                console.log("Setting up Firestore listener for real-time updates...");
                
                // Create query based on user role with optimizations
                let usersQuery;
                if (user.role === 'site_admin') {
                    // For site_admin, filter by company (most efficient)
                    usersQuery = query(
                        usersRef,
                        where('client_name', '==', user.companyName),
                        where('role', 'in', ['user', 'site_admin'])
                    );
                } else {
                    // For admin and super_admin, filter by relevant roles only
                    // This reduces reads significantly compared to getting ALL users
                    usersQuery = query(
                        usersRef,
                        where('role', 'in', ['user', 'site_admin', 'support', 'admin', 'super_admin'])
                    );
                }
                
                unsubscribe = onSnapshot(usersQuery, 
                    async (snapshot) => {
                        try {
                            console.log("🔥 Firestore real-time update received, snapshot size:", snapshot.size, "users count:", users.length);
                            
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
                            
                            // Only update state if data actually changed
                                if (!areUsersEqual(previousUsersRef.current, usersWithClientDetails)) {
                                console.log("🔄 UPDATING users state with real-time data - this will cause a re-render", {
                                    previousCount: previousUsersRef.current.length,
                                        newCount: usersWithClientDetails.length,
                                    timestamp: new Date().toISOString()
                                });
                                    setUsers(usersWithClientDetails);
                                    previousUsersRef.current = usersWithClientDetails;
                                
                                // Update cache with real-time data
                                const currentTime = Date.now();
                                    const cacheKey = `userManagement_cache_${user.role}`;
                                const cacheTimeKey = `${cacheKey}_time`;
                                    localStorage.setItem(cacheKey, JSON.stringify(usersWithClientDetails));
                                localStorage.setItem(cacheTimeKey, currentTime.toString());
                                setLastFetchTime(currentTime);
                            } else {
                                console.log("✅ Users data unchanged, no state update needed");
                            }
                            
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
                        console.error("Error in real-time users listener:", error);
                        setError(`Listener error: ${error.message}`);
                        setLoading(false);
                    }
                );
                
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
    }, [user?.uid, user?.role, user?.companyName]); // Removed db dependency as it's stable

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData(initialUserState);
        setEditRowId(null);
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
        return users.some(user => 
            user.employeeId === employeeId && 
            (!excludeUid || user.uid !== excludeUid)
        );
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
        
        if (checkDuplicateEmployeeId(addRowData.employeeId)) {
            setSnackbar({ open: true, message: 'Employee ID already exists. Please use a unique Employee ID.', severity: 'error' });
            return;
        }
        
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
        navigate(`/user-management/user-detail/${user.uid}?edit=true`);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSave = async (uid) => {
        try {
            if (checkDuplicateEmployeeId(editRowData.employeeId, uid)) {
                setSnackbar({ open: true, message: 'Employee ID already exists. Please use a unique Employee ID.', severity: 'error' });
                return;
            }
            
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
        navigate(`/user-management/user-detail/${user.uid}`);
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
            
            // Show inline notification for this specific user
            setPasswordChangeNotifications(prev => ({
              ...prev,
              [uid]: {
                message: 'delete-success',
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

    // Update addUserData when selectedClientForAction changes
    useEffect(() => {
        if (selectedClientForAction && addUserModalOpen) {
            setAddUserData(prev => ({
                ...prev,
                companyName: selectedClientForAction
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
      
      if (checkDuplicateEmployeeId(addUserData.employeeId)) {
        setAddUserError('Employee ID already exists. Please use a unique Employee ID.');
        return;
      }
      
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
          body: JSON.stringify({ password: newPassword, mustChangePassword: true }),
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to change password');
        }
        
        // If email checkbox is checked, send the password email
        if (emailSent) {
          try {
            const userData = users.find(u => u.uid === pwdUserId);
            if (userData) {
              const emailRes = await fetch(`${API_BASE_URL}/api/users/${pwdUserId}/send-password-email`, {
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${idToken}`,
                  'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                  password: newPassword,
                  userEmail: userData.email,
                  userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || 'User',
                  companyName: userData.clientname || userData.companyName || 'Company',
                  loginUrl: FRONTEND_URL
                }),
              });
              
              if (emailRes.ok) {
                setPasswordResetStatus('Password reset and email sent successfully!');
              } else {
                setPasswordResetStatus('Password reset successful, but email failed to send.');
              }
            }
          } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
            setPasswordResetStatus('Password reset successful, but email failed to send.');
          }
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

    const handleDownloadTemplate = () => {
      // Create dynamic headers based on user role
      let templateHeaders = [...USER_TEMPLATE_HEADERS];
      
      console.log('User role:', user?.role);
      console.log('Original headers:', templateHeaders);
      
      // Add company column for super_admin only
      if (user && user.role === 'super_admin') {
        templateHeaders.splice(2, 0, 'companyName'); // Insert after employeeId
        console.log('Added companyName for super_admin');
      }
      
      console.log('Final headers:', templateHeaders);
      
      // Create CSV content with headers and sample row
      const csvContent = [
        templateHeaders.join(','),
        // Add sample row with empty values, but pre-fill companyName if client is selected
        templateHeaders.map(header => {
          if (header === 'companyName' && selectedClientForAction) {
            return selectedClientForAction;
          }
          return '';
        }).join(',')
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', selectedClientForAction ? `${selectedClientForAction}_user_template.csv` : 'user_import_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleImportFile = (e) => {
      setImportError('');
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          let json = [];
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            const csvText = evt.target.result;
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Create expected headers based on user role
            let expectedHeaders = [...USER_TEMPLATE_HEADERS];
            if (user && user.role === 'super_admin') {
              expectedHeaders.splice(2, 0, 'companyName'); // Insert after employeeId
            }
            
            const missingCols = expectedHeaders.filter(h => !headers.includes(h));
            if (missingCols.length > 0) {
              setImportError('Missing columns: ' + missingCols.join(', '));
              setImportedUsers([]);
              setImportedPasswords([]);
              return;
            }
            
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                  row[header] = values[index] || '';
                });
                if (row.email && row.email !== 'email') {
                  json.push(row);
                }
              }
            }
          } else {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Create expected headers based on user role
            let expectedHeaders = [...USER_TEMPLATE_HEADERS];
            if (user && user.role === 'super_admin') {
              expectedHeaders.splice(2, 0, 'companyName'); // Insert after employeeId
            }
            
            json = XLSX.utils.sheet_to_json(worksheet, { header: expectedHeaders, defval: '' });
            json = json.filter(row => row.email && row.email !== 'email');
          }
          
          if (json.length === 0) {
            setImportError('No valid user data found in the file.');
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
        } catch (err) {
          setImportError('Failed to parse file. Please use the provided template.');
          setImportedUsers([]);
          setImportedPasswords([]);
        }
      };
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file);
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

            // Create CSV content
            const headers = ['Email', 'First Name', 'Last Name', 'Employee ID', 'Contact Number', 'Role', 'Active'];
            const csvContent = [
                headers.join(','),
                ...clientUsers.map(user => [
                    user.email || '',
                    user.firstName || '',
                    user.lastName || '',
                    user.employeeId || '',
                    user.contactNumber || '',
                    user.role || '',
                    user.active !== false ? 'Yes' : 'No'
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
                                                <ClientActionDropdown
                                                    clientName={clientName}
                                                    onAddUser={() => handleClientAddUser(clientName)}
                                                    onImportUsers={() => handleClientImportUsers(clientName)}
                                                    onExportUsers={() => handleClientExportUsers(clientName)}
                                                />
      <div
          onClick={() => handleToggleActionsColumn(clientName)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ease-in-out cursor-pointer ${
              showActionsColumn[clientName]
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
          }`}
      >
          <AdminIcon sx={{ fontSize: '16px' }} />
          {showActionsColumn[clientName] ? 'Cancel' : 'Manage'}
      </div>
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
                                                            <tr key={u.uid} className="user-row">
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
                                        Select .csv file to import
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
                
                {/* Snackbar */}
                <Snackbar 
                    open={snackbar.open} 
                    autoHideDuration={3000} 
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    sx={{ 
                        top: '80px !important', // Position below the header/tabs
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