import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
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
    Refresh as RefreshIcon,
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
    Settings as SettingsIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { app } from '../../config/firebase';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [addMode, setAddMode] = useState(false);
    const [addRowData, setAddRowData] = useState(initialUserState);
    const [editRowId, setEditRowId] = useState(null);
    const [editRowData, setEditRowData] = useState({ ...initialUserState, showPasswordField: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();
    const location = useLocation();
    const db = getFirestore(app);
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
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
    const [activeTab, setActiveTab] = useState(0);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole] = useState('all');
    const [filtersChanged, setFiltersChanged] = useState(false);
 
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [userStats, setUserStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        siteAdmins: 0,
        regularUsers: 0
    });

    const handleToggleClientCollapse = (client) => {
      setCollapsedClients(prev => ({ ...prev, [client]: !prev[client] }));
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
            
            // Apply status filter
            const matchesStatus = filterStatus === 'all' || 
                (filterStatus === 'active' && u.active) ||
                (filterStatus === 'inactive' && !u.active);
            
            // Apply role filter
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            
            return matchesSearch && matchesClient && matchesStatus && matchesRole;
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
    }, [users, search, clientFilter, filterStatus, filterRole]);

    // Group users by client for card view and table view
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
                
                return { clientName, users: sortedUsers };
            })
            .sort((a, b) => a.clientName.localeCompare(b.clientName));
        
        return {
            clientGroups
        };
    }, [filteredUsers]);

    const clearClientFilter = () => {
        setClientFilter('');
        setHighlightedClient('');
    };

    const fetchClients = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients`);
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            if (JSON.stringify(previousClientsRef.current) !== JSON.stringify(data)) {
                setClients(data);
                previousClientsRef.current = data;
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, []);

    // Load initial data from cache if available
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
            const cacheValidDuration = 5 * 60 * 1000; // 5 minutes
            
            if (cacheAge < cacheValidDuration) {
                console.log("Loading initial users from cache...");
                const cachedUsers = JSON.parse(cachedData);
                setUsers(cachedUsers);
                previousUsersRef.current = cachedUsers;
                setLastFetchTime(parseInt(cacheTime));
                setLoading(false);
            }
        }
    }, [user]);

    // Calculate user statistics
    useEffect(() => {
        if (users.length > 0) {
            const stats = {
                total: users.length,
                active: users.filter(u => u.active !== false).length,
                inactive: users.filter(u => u.active === false).length,
                siteAdmins: users.filter(u => u.role === 'site_admin').length,
                regularUsers: users.filter(u => u.role === 'user').length
            };
            setUserStats(stats);
        }
    }, [users]);

    useEffect(() => {
        if (!user || !user.firebaseUser) {
            console.log("No user or firebaseUser available, skipping listener setup");
            return;
        }
        
        console.log("Setting up users data fetching...");
        setLoading(true);
        setError(null);
        
        let unsubscribe = null;
        
        const setupRealTimeListener = async () => {
            try {
                // Fetch clients first if not available
                if (previousClientsRef.current.length === 0) {
                    await fetchClients();
                }
                
                // For site_admin, use API polling instead of Firestore listener
                if (user.role === 'site_admin') {
                    console.log("Setting up API polling for site admin...");
                    
                    // Initial fetch
                    await fetchUsersFromAPI();
                    
                    // Set up polling interval
                    const pollInterval = setInterval(async () => {
                        try {
                            await fetchUsersFromAPI();
                        } catch (error) {
                            console.error("Error in API polling:", error);
                        }
                    }, 5000); // Poll every 5 seconds
                    
                    unsubscribe = () => clearInterval(pollInterval);
                    
                } else {
                    // For other admin roles, use Firestore real-time listener
                    const usersRef = collection(db, 'users');
                    console.log("Setting up Firestore listener for real-time updates...");
                    
                    unsubscribe = onSnapshot(usersRef, 
                        async (snapshot) => {
                            try {
                                console.log("Real-time update received, snapshot size:", snapshot.size);
                                
                                const fetchedUsers = [];
                                snapshot.forEach((doc) => {
                                    const userData = doc.data();
                                    // Only include users and site_admins
                                    if (userData.role === 'user' || userData.role === 'site_admin') {
                                        fetchedUsers.push({
                                            uid: doc.id,
                                            ...userData
                                        });
                                    }
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
                                
                                if (!areUsersEqual(previousUsersRef.current, usersWithClientDetails)) {
                                    console.log("Updating users state with real-time data");
                                    setUsers(usersWithClientDetails);
                                    previousUsersRef.current = usersWithClientDetails;
                                    
                                    // Update cache with real-time data
                                    const currentTime = Date.now();
                                    const cacheKey = `userManagement_cache_${user.role}`;
                                    const cacheTimeKey = `${cacheKey}_time`;
                                    localStorage.setItem(cacheKey, JSON.stringify(usersWithClientDetails));
                                    localStorage.setItem(cacheTimeKey, currentTime.toString());
                                    setLastFetchTime(currentTime);
                                }
                                
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
        };
    }, [user, db, fetchClients]);

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
            
            const res = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        setEditRowId(user.uid);
        setEditRowData({
            ...user,
            emailPrefix: user.email ? user.email.split('@')[0] : '',
            domain: user.email ? user.email.split('@')[1] : (user.domain || ''),
        });
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
            
            // Force refresh the users list to show the updated user
            if (user.role === 'site_admin') {
              await fetchUsersFromAPI(true);
            }
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ ...initialUserState });
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
            
            // Force refresh the users list to remove the deleted user
            if (user.role === 'site_admin') {
              await fetchUsersFromAPI(true);
            }
            
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
      const initialData = { ...initialUserState, password: generatePassword() };
      if (user && user.role === 'site_admin' && user.companyName) {
        initialData.companyName = user.companyName;
      }
      setAddUserData(initialData);
      setAddUserModalOpen(true);
    };

    const closeAddUserModal = () => {
      setAddUserModalOpen(false);
      setAddUserData(initialUserState);
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
        
        // Force refresh the users list to show the new user
        if (user.role === 'site_admin') {
          await fetchUsersFromAPI(true);
        }
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
        
        setPasswordResetStatus('Password reset successfully!');
        
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
        
        // Force refresh the users list to show the updated user
        if (user.role === 'site_admin') {
          await fetchUsersFromAPI(true);
        }
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
      const csvContent = templateHeaders.join(',');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'user_import_template.csv');
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
        
        const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

    const fetchUsersFromAPI = async (forceRefresh = false) => {
        try {
            // Check cache first (unless force refresh is requested)
            if (!forceRefresh) {
                const cacheKey = user.role === 'site_admin' ? 
                    `userManagement_cache_${user.role}_${user.companyName}` : 
                    `userManagement_cache_${user.role}`;
                const cacheTimeKey = `${cacheKey}_time`;
                
                const cachedData = localStorage.getItem(cacheKey);
                const cacheTime = localStorage.getItem(cacheTimeKey);
                
                if (cachedData && cacheTime) {
                    const cacheAge = Date.now() - parseInt(cacheTime);
                    const cacheValidDuration = 5 * 60 * 1000; // 5 minutes
                    
                    if (cacheAge < cacheValidDuration) {
                        console.log("Loading users from cache...");
                        const cachedUsers = JSON.parse(cachedData);
                        setUsers(cachedUsers);
                        previousUsersRef.current = cachedUsers;
                        setLastFetchTime(parseInt(cacheTime));
                        setLoading(false);
                        setError(null);
                        return;
                    } else {
                        console.log("Cache expired, fetching fresh data...");
                    }
                }
            }
            
            console.log("Fetching users from API...", { userRole: user.role, userCompanyName: user.companyName });
            
            if (previousClientsRef.current.length === 0) {
                await fetchClients();
            }
            
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const fetchedUsers = await response.json();
            console.log("Fetched users from API:", fetchedUsers.length, "users");
            
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
            
            // For site_admin, filter users to only show their company's users
            let filteredUsers = usersWithClientDetails;
            if (user.role === 'site_admin' && user.companyName) {
                const beforeFilter = filteredUsers.length;
                filteredUsers = usersWithClientDetails.filter(u => 
                    u.clientname === user.companyName || 
                    u.companyName === user.companyName
                );
                console.log(`Site admin filtering: ${beforeFilter} -> ${filteredUsers.length} users for company ${user.companyName}`);
            }
            
            if (!areUsersEqual(previousUsersRef.current, filteredUsers)) {
                console.log("Updating users state with API data");
                setUsers(filteredUsers);
                previousUsersRef.current = filteredUsers;
                
                // Cache the data with role-specific keys
                const currentTime = Date.now();
                const cacheKey = user.role === 'site_admin' ? 
                    `userManagement_cache_${user.role}_${user.companyName}` : 
                    `userManagement_cache_${user.role}`;
                const cacheTimeKey = `${cacheKey}_time`;
                localStorage.setItem(cacheKey, JSON.stringify(filteredUsers));
                localStorage.setItem(cacheTimeKey, currentTime.toString());
                setLastFetchTime(currentTime);
            }
            
            setLoading(false);
            setError(null);
        } catch (error) {
            console.error("Error fetching users from API:", error);
            setError(`API error: ${error.message}`);
            setUsers([]);
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        console.log("Manual refresh requested...");
        setLoading(true);
        
        if (user.role === 'site_admin') {
            // For site admin, force refresh from API
            await fetchUsersFromAPI(true);
        } else {
            // For other roles, clear cache and let Firestore listener handle it
            const cacheKey = `userManagement_cache_${user.role}`;
            const cacheTimeKey = `${cacheKey}_time`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(cacheTimeKey);
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
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
            
            // Force refresh the users list
            if (user.role === 'site_admin') {
                await fetchUsersFromAPI(true);
            }
        } catch (err) {
            setSnackbar({ open: true, message: `Bulk action failed: ${err.message}`, severity: 'error' });
        }
    };



    const clearAllFilters = () => {
        setSearch('');
        setClientFilter('');
        setFilterStatus('all');
        setFilterRole('all');
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
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, 
                        gap: 1, 
                        mt: { xs: 2, sm: 0 }
                    }}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon sx={{ fontSize: '0.75rem' }} />}
                            onClick={openAddUserModal}
                            size="small"
                            sx={{
                                borderRadius: 0.5,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                px: 1.25,
                                py: 0.2,
                                minHeight: '24px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                '&:hover': {
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                }
                            }}
                        >
                            Add User
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={openImportModal}
                            size="small"
                            sx={{
                                borderRadius: 0.5,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                px: 1.25,
                                py: 0.2,
                                minHeight: '24px',
                                borderWidth: 1,
                                '&:hover': {
                                    borderWidth: 1.5,
                                }
                            }}
                        >
                            Import Users
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleRefresh}
                            disabled={loading}
                            startIcon={<RefreshIcon sx={{ fontSize: '0.75rem' }} />}
                            size="small"
                            sx={{
                                borderRadius: 0.5,
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                px: 1.25,
                                py: 0.2,
                                minHeight: '24px',
                                borderWidth: 1,
                                '&:hover': {
                                    borderWidth: 1.5,
                                }
                            }}
                        >
                            Refresh
                        </Button>
                    </Box>
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
                    <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: '#4caf50', mr: 1.5, width: 32, height: 32 }}>
                                    <CheckCircleIcon sx={{ fontSize: '1rem' }} />
                            </Avatar>
                            <Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Active Users</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{userStats.active}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                    <Card sx={{ borderRadius: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: '#f44336', mr: 1.5, width: 32, height: 32 }}>
                                    <ErrorIcon sx={{ fontSize: '1rem' }} />
                            </Avatar>
                            <Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>Inactive Users</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{userStats.inactive}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
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
                
                {/* Tabs and Filters */}
                <Box sx={{ mb: 2 }}>
                    <Tabs 
                        value={activeTab} 
                        onChange={handleTabChange} 
                        sx={{ 
                            borderBottom: 1, 
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                minHeight: '40px',
                            }
                        }}
                    >
                        <Tab label="All Users" />
                        <Tab label="Active Users" />
                        <Tab label="Inactive Users" />
                        <Tab label="Site Admins" />
                    </Tabs>
                    
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
                            width: { xs: '100%', sm: 'auto' },
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
                                    width: { xs: '100%', sm: 250 },
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
                                <FormControl size="small" sx={{ minWidth: 120, maxWidth: 150 }}>
                                    <InputLabel sx={{ fontSize: '0.8rem' }}>Client</InputLabel>
                                    <Select
                                        value={clientFilter}
                                        onChange={e => {
                                            setClientFilter(e.target.value);
                                            setFiltersChanged(true);
                                        }}
                                        label="Client"
                                        sx={{ 
                                            height: '35px',
                                            '& .MuiSelect-select': { 
                                                fontSize: '0.8rem',
                                                py: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                height: '35px'
                                            },
                                            '& .MuiOutlinedInput-root': {
                                                height: '35px'
                                            }
                                        }}
                                    >
                                        <MenuItem value="" sx={{ fontSize: '0.8rem' }}>All Clients</MenuItem>
                                        {clients.map(client => (
                                            <MenuItem key={client.id} value={client['Client name'] || client.companyName} sx={{ fontSize: '0.8rem' }}>
                                                {client['Client name'] || client.companyName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            
                            <FormControl size="small" sx={{ minWidth: 100, maxWidth: 120 }}>
                                <InputLabel sx={{ fontSize: '0.8rem' }}>Status</InputLabel>
                                <Select
                                    value={filterStatus}
                                    onChange={e => {
                                        setFilterStatus(e.target.value);
                                        setFiltersChanged(true);
                                    }}
                                    label="Status"
                                    sx={{ 
                                        height: '35px',
                                        '& .MuiSelect-select': { 
                                            fontSize: '0.8rem',
                                            py: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            height: '35px'
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            height: '35px'
                                        }
                                    }}
                                >
                                    <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All</MenuItem>
                                    <MenuItem value="active" sx={{ fontSize: '0.8rem' }}>Active</MenuItem>
                                    <MenuItem value="inactive" sx={{ fontSize: '0.8rem' }}>Inactive</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <FormControl size="small" sx={{ minWidth: 100, maxWidth: 120 }}>
                                <InputLabel sx={{ fontSize: '0.8rem' }}>Role</InputLabel>
                                <Select
                                    value={filterRole}
                                    onChange={e => {
                                        setFilterRole(e.target.value);
                                        setFiltersChanged(true);
                                    }}
                                    label="Role"
                                    sx={{ 
                                        height: '35px',
                                        '& .MuiSelect-select': { 
                                            fontSize: '0.8rem',
                                            py: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            height: '35px'
                                        },
                                        '& .MuiOutlinedInput-root': {
                                            height: '35px'
                                        }
                                    }}
                                >
                                    <MenuItem value="all" sx={{ fontSize: '0.8rem' }}>All Roles</MenuItem>
                                    <MenuItem value="user" sx={{ fontSize: '0.8rem' }}>User</MenuItem>
                                    <MenuItem value="site_admin" sx={{ fontSize: '0.8rem' }}>Site Admin</MenuItem>
                                </Select>
                            </FormControl>
                            
                            {filtersChanged && (
                            <Button
                                variant="outlined"
                                size="small"
                                    onClick={() => {
                                        clearAllFilters();
                                        setFiltersChanged(false);
                                    }}
                                sx={{
                                        height: '35px',
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                        fontSize: '0.7rem',
                                    px: 1.5,
                                    borderWidth: 1,
                                        color: '#d32f2f',
                                        borderColor: '#d32f2f',
                                    '&:hover': {
                                        borderWidth: 1.5,
                                            borderColor: '#b71c1c',
                                            color: '#b71c1c',
                                        }
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            )}
                            <Button
                                variant={showCheckboxes ? "contained" : "outlined"}
                                size="small"
                                onClick={() => {
                                    setShowCheckboxes(!showCheckboxes);
                                    if (!showCheckboxes) {
                                        setSelectedUsers([]); // Clear selections when hiding
                                    }
                                }}
                                sx={{
                                    height: '35px',
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                    px: 1.5,
                                    borderWidth: 1,
                                    ...(showCheckboxes && {
                                        bgcolor: '#d32f2f',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: '#b71c1c',
                                        }
                                    }),
                                    '&:hover': {
                                        borderWidth: 1.5,
                                    }
                                }}
                            >
                                {showCheckboxes ? 'Cancel Select' : 'Select'}
                            </Button>
                        </Box>
                        
                        {/* View Toggle and Bulk Actions */}
                        <Box sx={{ 
                            display: 'flex', 
                            gap: 1,
                            alignItems: 'center'
                        }}>
                            {showCheckboxes && selectedUsers.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => openBulkActionModal('resetPassword')}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            px: 1.5,
                                            py: 0.5,
                                            minHeight: '32px',
                                            borderWidth: 1,
                                            '&:hover': {
                                                borderWidth: 1.5,
                                            }
                                        }}
                                    >
                                        Reset Passwords ({selectedUsers.length})
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => openBulkActionModal('delete')}
                                        sx={{
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            fontWeight: 500,
                                            fontSize: '0.75rem',
                                            px: 1.5,
                                            py: 0.5,
                                            minHeight: '32px',
                                            borderWidth: 1,
                                            '&:hover': {
                                                borderWidth: 1.5,
                                            }
                                        }}
                                    >
                                        Delete ({selectedUsers.length})
                                    </Button>
                                </Box>
                            )}
                            
                            <Box sx={{ display: 'flex', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setViewMode('table')}
                                    color={viewMode === 'table' ? 'primary' : 'default'}
                                    sx={{ borderRadius: 0 }}
                                >
                                    <ViewListIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    onClick={() => setViewMode('cards')}
                                    color={viewMode === 'cards' ? 'primary' : 'default'}
                                    sx={{ borderRadius: 0 }}
                                >
                                    <ViewModuleIcon fontSize="small" />
                                </IconButton>
                            </Box>
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
                        {filterStatus !== 'all' && (
                            <Chip
                                label={`Status: ${filterStatus}`}
                                onDelete={() => setFilterStatus('all')}
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
                                error={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId)}
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
                            borderRadius: 2, 
                            backgroundColor: '#ffffff',
                            border: '1px solid #e0e0e0',
                            overflow: 'hidden'
                        }}
                    >
                        {filteredUsers.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body1" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                                    No user profiles found.
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                {/* Card View */}
                                {viewMode === 'cards' && user && (user.role === 'super_admin' || user.role === 'admin') && groupedUsersByClient && (
                                    <Box sx={{ width: '100%', m: 0, p: 0 }}>
                                        {groupedUsersByClient.clientGroups.length > 0 && (
                                            groupedUsersByClient.clientGroups.map(({ clientName, users }, index) => (
                                                <Box key={clientName} sx={{ mb: 3 }}>
                                                    <Box 
                                                        sx={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            p: 1.5, 
                                                            bgcolor: '#f5f5f5', 
                                                            borderRadius: 1,
                                                            cursor: 'pointer',
                                                            '&:hover': { bgcolor: '#eeeeee' }
                                                        }}
                                                        onClick={() => handleToggleClientCollapse(clientName)}
                                                    >
                                                        <BusinessIcon sx={{ mr: 1, color: '#1976d2' }} />
                                                        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
                                                            {clientName}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ mr: 2 }}>
                                                            {users.length} users
                                                        </Typography>
                                                        <IconButton size="small">
                                                            {collapsedClients[clientName] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                                                        </IconButton>
                                                    </Box>
                                                    
                                                    <Collapse in={!collapsedClients[clientName]} timeout="auto" unmountOnExit>
                                                        <Grid container spacing={2} sx={{ p: 2 }}>
                                                            {users.map(user => (
                                                                <Grid item xs={12} sm={6} md={4} lg={3} key={user.uid}>
                                                                    <Card className="user-card" sx={{ height: '100%' }}>
                                                                        <CardContent sx={{ pb: 1 }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                                                <Avatar sx={{ mr: 1, bgcolor: '#1976d2' }}>
                                                                                    {user.firstName ? user.firstName.charAt(0) : user.email.charAt(0)}
                                                                                </Avatar>
                                                                                <Box>
                                                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                                                        {user.firstName} {user.lastName}
                                                                                    </Typography>
                                                                                    <Typography variant="body2" color="textSecondary">
                                                                                        {user.email}
                                                                                    </Typography>
                                                                                </Box>
                                                                            </Box>
                                                                            
                                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                                                                <Chip 
                                                                                    label={user.role === 'user' ? 'User' : user.role === 'site_admin' ? 'Site Admin' : user.role}
                                                                                    size="small"
                                                                                    className={`role-badge role-${user.role}`}
                                                                                />
                                                                                <Chip 
                                                                                    label={user.employmentType || 'N/A'}
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                />
                                                                            </Box>
                                                                            
                                                                            <Divider sx={{ my: 1 }} />
                                                                            
                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                <Typography variant="body2">
                                                                                    <strong>Employee ID:</strong> {user.employeeId || 'N/A'}
                                                                                </Typography>
                                                                                <Typography variant="body2">
                                                                                    <strong>Designation:</strong> {user.designation || 'N/A'}
                                                                                </Typography>
                                                                                <Typography variant="body2">
                                                                                    <strong>Contact:</strong> {user.contactNumber || 'N/A'}
                                                                                </Typography>
                                                                                <Typography variant="body2">
                                                                                    <strong>Manager:</strong> {user.managerEmail || 'N/A'}
                                                                                </Typography>
                                                                            </Box>
                                                                        </CardContent>
                                                                        <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                                                                            <Tooltip title="Reset Password">
                                                                                <IconButton 
                                                                                    onClick={() => openChangePwdModal(user.uid)} 
                                                                                    size="small" 
                                                                                    sx={{ 
                                                                                        p: 0.7,
                                                                                        color: '#607d8b',
                                                                                        '&:hover': { color: '#455a64', bgcolor: 'rgba(96, 125, 139, 0.1)' }
                                                                                    }}
                                                                                >
                                                                                    <LockResetIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Edit">
                                                                                <IconButton 
                                                                                    onClick={() => handleEditClick(user)} 
                                                                                    size="small" 
                                                                                    sx={{ 
                                                                                        p: 0.7,
                                                                                        color: '#607d8b',
                                                                                        '&:hover': { color: '#455a64', bgcolor: 'rgba(96, 125, 139, 0.1)' }
                                                                                    }}
                                                                                >
                                                                                    <EditIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                            <Tooltip title="Delete">
                                                                                <IconButton 
                                                                                    onClick={(event) => handleDeleteClick(event, user.uid, user.email)} 
                                                                                    size="small" 
                                                                                    sx={{ 
                                                                                        p: 0.7,
                                                                                        color: '#e57373',
                                                                                        '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' }
                                                                                    }}
                                                                                >
                                                                                    <DeleteIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </CardActions>
                                                                    </Card>
                                                                </Grid>
                                                            ))}
                                                        </Grid>
                                                    </Collapse>
                                                </Box>
                                            ))
                                        )}
                                    </Box>
                                )}
                                
                                {/* Table View */}
                                {(viewMode === 'table' || !user || user.role === 'site_admin') && (
                                    <Box sx={{ width: '100%' }}>
                                        {filteredUsers.length === 0 ? (
                                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                                <Typography variant="body2" color="textSecondary">
                                                    No user profiles found.
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {/* Client Groups */}
                                                {groupedUsersByClient.clientGroups.map(({ clientName, users }, groupIndex) => (
    <Box key={clientName} sx={{ mb: 2 }}>
        <Box 
            sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1.5, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1,
                cursor: 'pointer',
                border: '1px solid #e0e0e0',
                '&:hover': { bgcolor: '#eeeeee' }
            }}
            onClick={() => handleToggleClientCollapse(clientName)}
        >
            <BusinessIcon sx={{ mr: 1, color: '#1976d2' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 500 }}>
                {clientName}
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
                {users.length} users
            </Typography>
            <IconButton size="small">
                {collapsedClients[clientName] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
            </IconButton>
        </Box>
        
        <Collapse in={!collapsedClients[clientName]} timeout="auto" unmountOnExit>
            <TableContainer sx={{ 
                maxHeight: 400,
                '&::-webkit-scrollbar': {
                    width: '6px !important',
                    height: '6px !important',
                },
                '&::-webkit-scrollbar-track': {
                    background: '#f1f1f1 !important',
                    borderRadius: '3px !important',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#c1c1c1 !important',
                    borderRadius: '3px !important',
                    '&:hover': {
                        background: '#a8a8a8 !important',
                    },
                },
            }}>
                <Table size="small" sx={{ minWidth: 700, borderCollapse: 'collapse' }}>
                    <TableHead sx={{ bgcolor: '#ffffff' }}>
                        <TableRow>
                            {showCheckboxes && (
                            <TableCell padding="checkbox">
                                <Checkbox
                                        checked={users.length > 0 && users.every(u => selectedUsers.includes(u.uid))}
                                        indeterminate={users.some(u => selectedUsers.includes(u.uid)) && !users.every(u => selectedUsers.includes(u.uid))}
                                    onChange={() => {
                                            const currentUserIds = users.map(u => u.uid);
                                            const allSelected = users.every(u => selectedUsers.includes(u.uid));
                                            
                                            if (allSelected) {
                                                // Deselect all users in this group
                                                setSelectedUsers(selectedUsers.filter(id => !currentUserIds.includes(id)));
                                        } else {
                                                // Select all users in this group
                                                const newSelectedUsers = [...selectedUsers];
                                                currentUserIds.forEach(id => {
                                                    if (!newSelectedUsers.includes(id)) {
                                                        newSelectedUsers.push(id);
                                                    }
                                                });
                                                setSelectedUsers(newSelectedUsers);
                                        }
                                    }}
                                />
                            </TableCell>
                            )}
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: '5%' }}>
                                #
                            </TableCell>
                            {!(user && user.role === 'site_admin') && (
                                <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.companyName }}>
                                    Company Name
                                </TableCell>
                            )}
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.firstName }}>
                                First Name
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.lastName }}>
                                Last Name
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.employeeId }}>
                                Employee ID
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.email }}>
                                Email
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.designation }}>
                                Designation
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.contactNumber }}>
                                Contact
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.managerEmail }}>
                                Manager Email
                            </TableCell>
                            <TableCell sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.employmentType }}>
                                Employment Type
                            </TableCell>
                            <TableCell align="right" sx={{ py: 0.5, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', width: adjustedColumnWidths.actions }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((u, i) => (
                            <TableRow 
                                key={u.uid}
                                hover
                                sx={{ 
                                    bgcolor: '#ffffff',
                                    '&:hover': { bgcolor: '#f5f5f5' }
                                }}
                            >
                                {showCheckboxes && (
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedUsers.includes(u.uid)}
                                        onChange={() => handleSelectUser(u.uid)}
                                    />
                                </TableCell>
                                )}
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: '5%' }}>
                                    {i + 1}
                                </TableCell>
                                {!(user && user.role === 'site_admin') && (
                                    <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.companyName }}>
                                        {u.companyName || u.client_name || '-'}
                                    </TableCell>
                                )}
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.firstName }}>
                                    {u.firstName || (u.name ? u.name.split(' ')[0] : '')}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.lastName }}>
                                    {u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : '')}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.employeeId }}>
                                    {u.employeeId || '-'}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.email }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                            {u.email}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {u.role && (
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    fontSize: '0.7rem',
                                                        color: u.role === 'site_admin' ? '#f57c00' : u.role === 'user' ? '#1976d2' : '#666',
                                                    fontWeight: 600
                                                }}
                                            >
                                                    ({u.role === 'user' ? 'User' : u.role === 'site_admin' ? 'Site Admin' : u.role})
                                            </Typography>
                                            )}
                                            {u.active === false && (
                                                <Chip 
                                                    label="Inactive" 
                                                    size="small" 
                                                    sx={{ 
                                                        fontSize: '0.6rem', 
                                                        height: '18px', 
                                                        bgcolor: '#ffebee', 
                                                        color: '#d32f2f' 
                                                    }} 
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.designation }}>
                                    {u.designation || '-'}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.contactNumber }}>
                                    {u.contactNumber || '-'}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.managerEmail }}>
                                    {u.managerEmail || '-'}
                                </TableCell>
                                <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0', width: adjustedColumnWidths.employmentType }}>
                                    {u.employmentType || '-'}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 0.4, px: 2, width: adjustedColumnWidths.actions }}>
                                    {passwordChangeNotifications[u.uid] ? (
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                fontSize: '0.7rem',
                                                color: passwordChangeNotifications[u.uid].message.includes('success') ? '#2e7d32' : '#d32f2f',
                                                fontWeight: 500,
                                                textAlign: 'right',
                                                py: 0.5
                                            }}
                                        >
                                            {passwordChangeNotifications[u.uid].message}
                                        </Typography>
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Tooltip title="Reset Password">
                                                <IconButton 
                                                    onClick={() => openChangePwdModal(u.uid)} 
                                                    size="small" 
                                                    sx={{ 
                                                        p: 0.7,
                                                        color: '#607d8b',
                                                        '&:hover': { color: '#455a64', bgcolor: 'rgba(96, 125, 139, 0.1)' }
                                                    }}
                                                >
                                                    <LockResetIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <IconButton 
                                                    onClick={() => handleEditClick(u)} 
                                                    size="small" 
                                                    sx={{ 
                                                        p: 0.7,
                                                        color: '#607d8b',
                                                        '&:hover': { color: '#455a64', bgcolor: 'rgba(96, 125, 139, 0.1)' }
                                                    }}
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton 
                                                    onClick={(event) => handleDeleteClick(event, u.uid, u.email)} 
                                                    size="small" 
                                                    sx={{ 
                                                        p: 0.7,
                                                        color: '#e57373',
                                                        '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' }
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Collapse>
    </Box>
))}
                                   
                                               

                                            </Box>
                                        )}
                                    </Box>
                                )}
                                {filteredUsers.length > 10 && (
                                    <TablePagination
                                        rowsPerPageOptions={[5, 10, 25, 50]}
                                        component="div"
                                        count={filteredUsers.length}
                                        rowsPerPage={rowsPerPage}
                                        page={page}
                                        onPageChange={handleChangePage}
                                        onRowsPerPageChange={handleChangeRowsPerPage}
                                        sx={{
                                            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                                                fontSize: '0.8rem'
                                            },
                                            '.MuiTablePagination-toolbar': {
                                                minHeight: '40px'
                                            }
                                        }}
                                    />
                                )}
                            </>
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
                            Add User
                        </Typography>
                        <IconButton onClick={closeAddUserModal} sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: '#f5f5f5' }}>
                        <Box component="form" onSubmit={handleAddUserSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} autoComplete="off">
                            {/* Hidden password field to trick Chrome autofill */}
                            <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
                            
                            {/* User Information Section */}
                            <Box sx={{ bgcolor: 'white', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                    <PersonIcon sx={{ color: '#666', mr: 1 }} fontSize="small" />
                                    <Typography variant="subtitle1" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>User Information</Typography>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
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
                                                    fontSize: '1rem',
                                                    color: '#1976d2',
                                                    fontWeight: 600,
                                                    '&.Mui-focused': {
                                                        color: '#1565c0'
                                                    }
                                                } 
                                            }}
                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                            InputProps={{
                                                startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                            }}
                                            InputLabelProps={{ 
                                                shrink: true, 
                                                sx: { 
                                                    fontSize: '1rem',
                                                    color: '#1976d2',
                                                    fontWeight: 600,
                                                    '&.Mui-focused': {
                                                        color: '#1565c0'
                                                    }
                                                } 
                                            }}
                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                        error={addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId)}
                                        helperText={addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId) ? 'Employee ID already exists' : ''}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                                        }}
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                    />
                                    
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
                                        helperText="Auto-generated password"
                                        InputLabelProps={{ 
                                            shrink: true, 
                                            sx: { 
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                    />
                                    
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                    >
                                        <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Employment Type</MenuItem>
                                        {EMPLOYMENT_TYPES.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.85rem' }}>{opt.label}</MenuItem>
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    </DialogContent>
                    
                    <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
                        <Button 
                            onClick={closeAddUserModal} 
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
                            type="submit" 
                            variant="contained" 
                            color="primary" 
                            size="small"
                            onClick={handleAddUserSave}
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
                            Add User
                        </Button>
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
                                                    fontSize: '1rem',
                                                    color: '#1976d2',
                                                    fontWeight: 600,
                                                    '&.Mui-focused': {
                                                        color: '#1565c0'
                                                    }
                                                } 
                                            }}
                                            sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                                                fontSize: '1rem',
                                                color: '#1976d2',
                                                fontWeight: 600,
                                                '&.Mui-focused': {
                                                    color: '#1565c0'
                                                }
                                            } 
                                        }}
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
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
                        <Button onClick={handleEditCancel} variant="outlined" size="small">
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => handleEditSave(editRowId)} 
                            variant="contained" 
                            color="primary" 
                            size="small"
                        >
                            Save Changes
                        </Button>
                    </DialogActions>
                </Dialog>
                
                {/* Change Password Modal */}
                <Dialog open={changePwdModalOpen} onClose={closeChangePwdModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Change Password</DialogTitle>
                    <form onSubmit={handleChangePassword}>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                            <TextField
                                label="New Password"
                                name="newPassword"
                                value={newPassword}
                                InputProps={{ readOnly: true }}
                                required
                                size="small"
                                fullWidth
                                type="text"
                                helperText="Auto-generated password. Copy and share with the user."
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
                                disabled={isPasswordResetting}
                                startIcon={isPasswordResetting ? <CircularProgress size={16} /> : null}
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
                                    <Button onClick={handleDownloadTemplate} variant="outlined" size="small" sx={{ mb: 1, width: 'fit-content' }}>
                                        Download CSV Template
                                    </Button>
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
                                <Button 
                                    onClick={() => setShowCloseConfirmation(true)} 
                                    size="small" 
                                    color="error"
                                >
                                    Close Anyway
                                </Button>
                                <Button 
                                    onClick={handleDownloadCredentials} 
                                    variant="contained" 
                                    color="primary" 
                                    size="small"
                                >
                                    Download User Credentials
                                </Button>
                            </>
                        ) : importResults && importedPasswords.length > 0 && credentialsDownloaded ? (
                            <>
                                <Button onClick={closeImportModal} size="small" color="primary">
                                    Close
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={closeImportModal} size="small" color="error">
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleConfirmImport} 
                                    variant="contained" 
                                    color="primary" 
                                    size="small" 
                                    disabled={importedUsers.length === 0 || !!importResults}
                                >
                                    Confirm Import
                                </Button>
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
                        <Button 
                            onClick={closeBulkActionModal} 
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
                            onClick={handleBulkAction} 
                            variant="contained" 
                            color={bulkAction === 'delete' ? 'error' : 'primary'} 
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
                            {bulkAction === 'delete' ? 'Delete Users' : 'Reset Passwords'}
                        </Button>
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

export default UserManagementComponent;