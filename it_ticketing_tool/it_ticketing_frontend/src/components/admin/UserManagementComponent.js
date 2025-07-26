// src/components/admin/UserManagementComponent.js

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Snackbar, Alert, Typography, Popover, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, useMediaQuery, Card, CardContent, CardActions, Grid, CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Clear as ClearIcon, VpnKey as VpnKeyIcon, LockReset as LockResetIcon, Save as SaveIcon, Group as GroupIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../../config/firebase';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme } from '@mui/material/styles';
import * as XLSX from 'xlsx';

// Helper for deep comparison (simple for this case, but can be replaced with a library like lodash.isequal)
const areUsersEqual = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        console.warn("areUsersEqual: One or both arguments are not arrays:", { arr1, arr2 });
        return false;
    }
    
    if (arr1.length !== arr2.length) {
        console.log("areUsersEqual: Array lengths differ:", { arr1Length: arr1.length, arr2Length: arr2.length });
        return false;
    }
    
    for (let i = 0; i < arr1.length; i++) {
        const user1 = arr1[i];
        const user2 = arr2[i];
        
        if (!user1 || !user2) {
            console.warn("areUsersEqual: One or both users are null/undefined at index", i);
            return false;
        }
        
        // Compare relevant properties instead of stringifying the whole object for robustness
        if (user1.uid !== user2.uid ||
            user1.clientname !== user2.clientname ||
            user1.name !== user2.name ||
            user1.email !== user2.email ||
            user1.asset_id !== user2.asset_id ||
            user1.domain !== user2.domain ||
            user1.firstName !== user2.firstName || // Added new fields
            user1.lastName !== user2.lastName ||
            user1.contactNumber !== user2.contactNumber ||
            user1.managerEmail !== user2.managerEmail ||
            user1.employmentType !== user2.employmentType ||
            user1.designation !== user2.designation ||
            user1.employeeId !== user2.employeeId) { // Add employee ID comparison
            console.log("areUsersEqual: Users differ at index", i, { user1, user2 });
            return false;
        }
    }
    return true;
};

// 1. Update initialUserState to include all fields for clarity and completeness
const initialUserState = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '', // This will be composed from emailPrefix and domain
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
  employeeId: '', // Add employee ID field
  // Fields for the add form that aren't directly part of initialUserState for existing users
  emailPrefix: '',
  domain: '',
  asset_id: '',
  clientname: '', // For the add form client selection
};

const EMPLOYMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'intern', label: 'Intern' },
  { value: 'freelance', label: 'Freelance' },
];

function generatePassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const USER_TEMPLATE_HEADERS = [
  'firstName',
  'lastName',
  'email',
  'contactNumber',
  'managerEmail',
  'employmentType',
  'designation',
  'employeeId', // Add employee ID to template headers
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
    // Update editRowData to include all editable fields from initialUserState
    const [editRowData, setEditRowData] = useState({ ...initialUserState, showPasswordField: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();
    const location = useLocation();
    const db = getFirestore(app);
    const [addUserModalOpen, setAddUserModalOpen] = useState(false);
    const [addUserData, setAddUserData] = useState(initialUserState); // Used for the new modal
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isXs = useMediaQuery(theme.breakpoints.only('xs'));
    const isSm = useMediaQuery(theme.breakpoints.only('sm'));

    // State for the custom confirmation Popover
    const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
    const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
    const userToDeleteUidRef = useRef(null);
    const anchorEl = useRef(null);

    // State for Change Password Modal
    const [changePwdModalOpen, setChangePwdModalOpen] = useState(false);
    const [pwdUserId, setPwdUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Import Excel modal state
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importedUsers, setImportedUsers] = useState([]);
    const [importError, setImportError] = useState('');
    const [importResults, setImportResults] = useState(null); // <-- new state
    const [importedPasswords, setImportedPasswords] = useState([]); // <-- new state for passwords
    const [credentialsDownloaded, setCredentialsDownloaded] = useState(false); // Track if credentials were downloaded
    const [showCloseConfirmation, setShowCloseConfirmation] = useState(false); // Custom confirmation dialog
    const [importProgress, setImportProgress] = useState({ show: false, current: 0, total: 0, status: '' }); // Import progress state
    const [uploadedRows, setUploadedRows] = useState(new Set()); // Track which rows have been uploaded
    const fileInputRef = useRef();

    // Add at the top, after other useState hooks
    const [collapsedClients, setCollapsedClients] = useState({});
    const handleToggleClientCollapse = (client) => {
      setCollapsedClients(prev => ({ ...prev, [client]: !prev[client] }));
    };

    // Add ref to track previous users state to prevent infinite loops
    const previousUsersRef = useRef([]);
    const previousClientsRef = useRef([]);

    // Handle URL parameters for client filtering
    const [clientFilter, setClientFilter] = useState('');
    const [highlightedClient, setHighlightedClient] = useState('');

    // Check for clientId in URL parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const clientId = urlParams.get('clientId');
        
        if (clientId && clients.length > 0) {
            const client = clients.find(c => c.id === clientId);
            if (client) {
                setClientFilter(client.companyName);
                setHighlightedClient(client.companyName);
                // Clear the URL parameter after setting the filter
                navigate('/user-management', { replace: true });
            }
        }
    }, [location.search, clients, navigate]);

    // Filter users based on client filter and search
    const filteredUsers = useMemo(() => {
        console.log("filteredUsers useMemo triggered with:", { usersLength: users.length, search, clientFilter, userRole: user?.role });
        
        let filtered = users.filter(u =>
            (u.role === 'user' || u.role === 'site_admin') &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             u.clientname.toLowerCase().includes(search.toLowerCase()) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) ||
             (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
             (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
             (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase())) // Add employee ID to search
            )
        );
        
        console.log("After initial filtering:", filtered.length);
        
        // Apply client filter if set
        if (clientFilter) {
            const beforeClientFilter = filtered.length;
            filtered = filtered.filter(user => 
                user.client_name === clientFilter || 
                user.companyName === clientFilter ||
                user.clientname === clientFilter
            );
            console.log("After client filtering:", { before: beforeClientFilter, after: filtered.length, clientFilter });
        }
        
        // If the logged-in user is a site_admin, only show users from their company/client
        if (user && user.role === 'site_admin' && user.companyName) {
            const beforeSiteAdminFilter = filtered.length;
            filtered = filtered.filter(u => u.clientname === user.companyName || u.companyName === user.companyName);
            console.log("After site admin filtering:", { before: beforeSiteAdminFilter, after: filtered.length, userCompanyName: user.companyName });
        }
        
        console.log("Final filtered users:", filtered.length);
        return filtered;
    }, [users, search, clientFilter, user]);

    // Clear client filter
    const clearClientFilter = () => {
        setClientFilter('');
        setHighlightedClient('');
    };

    // Fetch clients
    const fetchClients = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients`);
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            // Deep comparison for clients to prevent unnecessary re-renders if content is same
            if (JSON.stringify(previousClientsRef.current) !== JSON.stringify(data)) {
                setClients(data);
                previousClientsRef.current = data;
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, []); // Remove clients dependency

    // Fetch clients independently
    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    // Real-time users listener with Firestore (with API fallback)
    useEffect(() => {
        if (!user || !user.firebaseUser) {
            console.log("No user or firebaseUser available, skipping listener setup");
            return;
        }

        setLoading(true);
        setError(null);

        console.log("Setting up real-time users listener...");

        // Fallback function to use API if Firestore fails
        const fetchUsersFromAPI = async () => {
            try {
                console.log("Falling back to API method...");
                
                // First, fetch clients if not already available
                if (previousClientsRef.current.length === 0) {
                    await fetchClients();
                }

                // Get user's ID token for authentication
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
                console.log("Fetched users from API:", fetchedUsers.length);

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
                        employeeId: u.employeeId || '', // Add employee ID mapping
                    };
                });

                console.log("Processed users with client details:", usersWithClientDetails.length);

                if (usersWithClientDetails.length > 0) {
                    if (!areUsersEqual(previousUsersRef.current, usersWithClientDetails)) {
                        console.log("Updating users state with new data");
                        setUsers(usersWithClientDetails);
                        previousUsersRef.current = usersWithClientDetails;
                    } else {
                        console.log("Users data unchanged, skipping update");
                    }
                } else {
                    console.log("No users found, setting empty array");
                    setUsers([]);
                    previousUsersRef.current = [];
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

        try {
            // Create real-time listener for users collection
            const usersRef = collection(db, 'users');
            console.log("Created users collection reference:", usersRef);
            
            const unsubscribe = onSnapshot(usersRef, 
                async (snapshot) => {
                    try {
                        console.log("Real-time update received, snapshot size:", snapshot.size);
                        
                        // First, fetch clients if not already available
                        if (previousClientsRef.current.length === 0) {
                            await fetchClients();
                        }

                        const fetchedUsers = [];
                        snapshot.forEach((doc) => {
                            const userData = doc.data();
                            console.log("Processing user document:", doc.id, userData);
                            fetchedUsers.push({
                                uid: doc.id,
                                ...userData
                            });
                        });

                        console.log("Fetched users from Firestore:", fetchedUsers.length);

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
                                employeeId: u.employeeId || '', // Add employee ID mapping
                            };
                        });

                        console.log("Processed users with client details:", usersWithClientDetails.length);

                        // Always update users if we have data, but use comparison to prevent unnecessary updates
                        if (usersWithClientDetails.length > 0) {
                            if (!areUsersEqual(previousUsersRef.current, usersWithClientDetails)) {
                                console.log("Updating users state with new data");
                                setUsers(usersWithClientDetails);
                                previousUsersRef.current = usersWithClientDetails;
                            } else {
                                console.log("Users data unchanged, skipping update");
                            }
                        } else {
                            console.log("No users found, setting empty array");
                            setUsers([]);
                            previousUsersRef.current = [];
                        }
                        
                        setLoading(false);
                        setError(null);
                    } catch (error) {
                        console.error("Error processing real-time users update:", error);
                        setError(`Error processing users: ${error.message}`);
                        setUsers([]);
                        setLoading(false);
                    }
                },
                (error) => {
                    console.error("Error in real-time users listener:", error);
                    console.log("Falling back to API method due to Firestore error");
                    fetchUsersFromAPI();
                }
            );

            // Cleanup function to unsubscribe when component unmounts
            return () => {
                console.log("Cleaning up real-time users listener...");
                unsubscribe();
            };
        } catch (error) {
            console.error("Error setting up Firestore listener:", error);
            console.log("Falling back to API method due to setup error");
            fetchUsersFromAPI();
        }
    }, [user, fetchClients, db]); // Depend on user, fetchClients, and db

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData(initialUserState);
        setEditRowId(null);
    };

    // 3. Update handleAddClientChange to auto-fill domain if possible
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

    // Helper function to check for duplicate employee ID
    const checkDuplicateEmployeeId = (employeeId, excludeUid = null) => {
        return users.some(user => 
            user.employeeId === employeeId && 
            (!excludeUid || user.uid !== excludeUid)
        );
    };

    // 4. Update handleAddSave to construct email from prefix and domain
    const handleAddSave = async (e) => {
        e.preventDefault();
        if (!addRowData.password) {
            setSnackbar({ open: true, message: 'Password is required.', severity: 'error' });
            return;
        }
        if (!addRowData.emailPrefix) {
            setSnackbar({ open: true, message: 'Email prefix is required.', severity: 'error' });
            return;
        }
        if (!addRowData.domain) {
            setSnackbar({ open: true, message: 'Domain name is required.', severity: 'error' });
            return;
        }
        if (!addRowData.asset_id) {
             setSnackbar({ open: true, message: 'Asset ID is required.', severity: 'error' });
            return;
        }
        if (!addRowData.clientname) { // Ensure clientname is also validated
             setSnackbar({ open: true, message: 'Client Name is required.', severity: 'error' });
            return;
        }
        if (!addRowData.employeeId) { // Add employee ID validation
             setSnackbar({ open: true, message: 'Employee ID is required.', severity: 'error' });
            return;
        }
        if (!addRowData.firstName) {
             setSnackbar({ open: true, message: 'First Name is required.', severity: 'error' });
            return;
        }
        if (!addRowData.lastName) {
             setSnackbar({ open: true, message: 'Last Name is required.', severity: 'error' });
            return;
        }
        if (!addRowData.contactNumber) {
             setSnackbar({ open: true, message: 'Contact Number is required.', severity: 'error' });
            return;
        }
        if (!addRowData.managerEmail) {
             setSnackbar({ open: true, message: 'Manager Email is required.', severity: 'error' });
            return;
        }
        if (!addRowData.employmentType) {
             setSnackbar({ open: true, message: 'Employment Type is required.', severity: 'error' });
            return;
        }
        if (!addRowData.designation) {
             setSnackbar({ open: true, message: 'Designation is required.', severity: 'error' });
            return;
        }

        // Check for duplicate employee ID
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
        // Populate editRowData with ALL fields from the selected user
        setEditRowId(user.uid);
        setEditRowData({
            ...user, // Spread all existing user data
            showPasswordField: false,
            password: '', // Clear password field for security
            // Ensure emailPrefix and domain are correctly derived for display if needed in edit,
            // though for existing users we typically don't edit email prefix/domain directly.
            // If email is directly editable, this logic would need to change.
            emailPrefix: user.email ? user.email.split('@')[0] : '',
            domain: user.email ? user.email.split('@')[1] : (user.domain || ''),
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({ ...prev, [name]: value }));
    };

    const handleTogglePasswordField = () => {
        setEditRowData(prev => ({ ...prev, showPasswordField: !prev.showPasswordField, password: '' }));
    };

    const handleEditSave = async (uid) => {
        try {
            // Check for duplicate employee ID (excluding current user)
            if (checkDuplicateEmployeeId(editRowData.employeeId, uid)) {
                setSnackbar({ open: true, message: 'Employee ID already exists. Please use a unique Employee ID.', severity: 'error' });
                return;
            }
            
            // Always send all editable fields (except password, which is only sent if changed)
            const updatePayload = {
                firstName: editRowData.firstName,
                lastName: editRowData.lastName,
                contactNumber: editRowData.contactNumber,
                managerEmail: editRowData.managerEmail,
                employmentType: editRowData.employmentType,
                designation: editRowData.designation,
                employeeId: editRowData.employeeId, // Add employee ID to update payload
                companyName: editRowData.companyName,
                client_name: editRowData.companyName, // For backend compatibility
                name: editRowData.name,
                asset_id: editRowData.asset_id,
            };
            // Password handling (only if changed and showPasswordField is true)
            if (editRowData.showPasswordField && editRowData.password) {
                updatePayload.password = editRowData.password;
            }

            // Remove undefined fields (in case any are missing)
            Object.keys(updatePayload).forEach(key => {
                if (updatePayload[key] === undefined) {
                    delete updatePayload[key];
                }
            });

            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update user');
            }
            setEditRowId(null);
            setEditRowData({ ...initialUserState, showPasswordField: false }); // Reset edit state
            setSnackbar({ open: true, message: 'User updated successfully.', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ ...initialUserState, showPasswordField: false });
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
            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to delete user');
            }
            setSnackbar({ open: true, message: 'User deleted successfully.', severity: 'success' });
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

    const handleGoToClientPage = (type, value) => {
        if (type === 'domain') {
            navigate(`/admin/clients?domain=${encodeURIComponent(value)}`);
        } else if (type === 'client') {
            navigate(`/admin/clients?client=${encodeURIComponent(value)}`);
        }
    };

    const groupedUsers = useMemo(() => {
        console.log("groupedUsers useMemo triggered with filteredUsers:", filteredUsers.length);
        
        const result = filteredUsers.reduce((acc, user) => {
            const client = user.companyName || user.clientname || 'Unknown Client'; // Prioritize companyName
            if (!acc[client]) acc[client] = [];
            acc[client].push(user);
            return acc;
        }, {});
        
        console.log("groupedUsers result:", Object.keys(result).length, "clients");
        return result;
    }, [filteredUsers]);

    const clientOrder = useMemo(() => Object.keys(groupedUsers).sort(), [groupedUsers]);

    const openAddUserModal = () => {
      // Auto-fill company name for site admin
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
      // Validation (basic)
      if (!addUserData.companyName || !addUserData.firstName || !addUserData.lastName || !addUserData.email || !addUserData.contactNumber || !addUserData.managerEmail || !addUserData.employmentType || !addUserData.designation || !addUserData.employeeId) {
        setSnackbar({ open: true, message: 'All fields are required.', severity: 'error' });
        return;
      }
      
      // Check for duplicate employee ID
      if (checkDuplicateEmployeeId(addUserData.employeeId)) {
        setSnackbar({ open: true, message: 'Employee ID already exists. Please use a unique Employee ID.', severity: 'error' });
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
          employeeId: addUserData.employeeId, // Add employee ID to payload
          role: 'user',
          // Assuming client_name is derived from companyName for the backend
          client_name: addUserData.companyName,
        };
        
        // For site admin, ensure the company name is set correctly
        if (user && user.role === 'site_admin' && user.companyName) {
          payload.companyName = user.companyName;
          payload.client_name = user.companyName;
        }
        
        const res = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to create user');
        }
        setAddUserModalOpen(false);
        setSnackbar({ open: true, message: 'User created successfully.', severity: 'success' });
      } catch (err) {
        setSnackbar({ open: true, message: err.message, severity: 'error' });
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
    };
    const handleChangePassword = async (e) => {
      e.preventDefault();
      if (!newPassword || newPassword.length < 6) {
        setSnackbar({ open: true, message: 'Password must be at least 6 characters.', severity: 'error' });
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${pwdUserId}/password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword, mustChangePassword: true }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to change password');
        }
        setSnackbar({ open: true, message: 'Password updated successfully.', severity: 'success' });
        closeChangePwdModal();
      } catch (err) {
        setSnackbar({ open: true, message: err.message, severity: 'error' });
      }
    };

    // Helper to check if there are unsaved changes in editable fields
    const hasUnsavedChanges = (editRowData, originalUser) => {
        return (
            editRowData.managerEmail !== (originalUser.managerEmail || '') ||
            editRowData.employmentType !== (originalUser.employmentType || '') ||
            editRowData.contactNumber !== (originalUser.contactNumber || '') ||
            editRowData.designation !== (originalUser.designation || '') ||
            editRowData.employeeId !== (originalUser.employeeId || '') // Add employee ID comparison
        );
    };

    // Define column widths for tableLayout: 'fixed' to prevent shifts
    const FIXED_COLUMN_WIDTHS = {
        companyName: '12%',
        firstName: '8%',
        lastName: '8%',
        email: '18%',
        contactNumber: '8%',
        managerEmail: '12%',
        employmentType: '8%',
        designation: '8%',
        employeeId: '8%', // Add employee ID column width
        actions: '10%', // Adjust as needed
    };

    // Adjust column widths when company name is hidden for site admin
    const getAdjustedColumnWidths = () => {
        if (user && user.role === 'site_admin') {
            return {
                firstName: '10%',
                lastName: '10%',
                email: '22%',
                contactNumber: '10%',
                managerEmail: '15%',
                employmentType: '10%',
                designation: '10%',
                employeeId: '10%', // Add employee ID column width
                actions: '13%',
            };
        }
        return FIXED_COLUMN_WIDTHS;
    };

    const adjustedColumnWidths = getAdjustedColumnWidths();

    // Helper function to check if site admin is trying to modify their own row
    const isOwnRow = (userRow) => {
        return user && user.role === 'site_admin' && user.uid === userRow.uid;
    };

    // CSV template download
    const handleDownloadTemplate = () => {
      // Create CSV content with headers only
      const csvContent = USER_TEMPLATE_HEADERS.join(',');
      
      // Create blob and download
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

    // Handle file upload and parse
    const handleImportFile = (e) => {
      setImportError('');
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          let json = [];
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // Handle CSV file
            const csvText = evt.target.result;
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Validate headers
            const missingCols = USER_TEMPLATE_HEADERS.filter(h => !headers.includes(h));
            if (missingCols.length > 0) {
              setImportError('Missing columns: ' + missingCols.join(', '));
              setImportedUsers([]);
              setImportedPasswords([]);
              return;
            }
            
            // Parse CSV data
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
            // Handle Excel file
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            json = XLSX.utils.sheet_to_json(worksheet, { header: USER_TEMPLATE_HEADERS, defval: '' });
            // Remove header row if present
            json = json.filter(row => row.email && row.email !== 'email');
          }
          
          // Validate that we have data
          if (json.length === 0) {
            setImportError('No valid user data found in the file.');
            setImportedUsers([]);
            setImportedPasswords([]);
            return;
          }
          
          // Auto-generate password for each user
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
    // Confirm import: send to backend with live progress
    const handleConfirmImport = async () => {
      setImportError('');
      setImportProgress({ 
        show: true, 
        current: 0, 
        total: importedUsers.length, 
        status: 'Starting import...' 
      });
      setUploadedRows(new Set()); // Reset uploaded rows
      
      try {
        // Add company name to all imported users if user is site admin
        const usersWithCompany = importedUsers.map(userData => ({
          ...userData,
          companyName: user && user.role === 'site_admin' ? user.companyName : userData.companyName || ''
        }));
        
        setImportProgress(prev => ({ ...prev, status: 'Preparing data for import...' }));
        
        // Simulate individual user uploads with row highlighting
        for (let i = 0; i < usersWithCompany.length; i++) {
          const currentUser = usersWithCompany[i];
          
          // Update progress and mark row as uploaded
          setImportProgress(prev => ({ 
            ...prev, 
            current: i + 1, 
            status: `Uploading: ${currentUser.firstName} ${currentUser.lastName} (${currentUser.email})` 
          }));
          
          // Mark this row as uploaded (turn green)
          setUploadedRows(prev => new Set([...prev, i]));
          
          // Small delay to show the visual effect
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        setImportProgress(prev => ({ ...prev, status: 'Sending data to server...' }));
        
        const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            users: usersWithCompany,
            // Pass site admin's company name if applicable
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
          
          // Small delay to show completion
          setTimeout(() => {
            setImportProgress({ show: false, current: 0, total: 0, status: '' });
            setImportResults(data.results);
            // Only keep passwords for successfully imported users
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

    // Download user credentials as CSV
    const handleDownloadCredentials = () => {
      if (!importedPasswords.length) return;
      
      // Create CSV content with user details
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
      
      // Create blob and download automatically
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'imported_user_credentials.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      // Mark as downloaded
      setCredentialsDownloaded(true);
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
                `}
            </style>
            <Box sx={{ p: 2, maxWidth: '100%', overflowX: 'auto' }}>
                <h2 className="user-mgmt-title compact-ui" style={{ marginBottom: 0, padding: '16px 24px 0' }}>User Management</h2> {/* Added padding here */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                        px: 3,
                        py: 2,
                        mb: 1,
                    }}
                >
                    {/* Search Bar */}
                    <Box sx={{ flex: 1, mb: { xs: 1, sm: 0 }, maxWidth: { xs: '100%', sm: 350 } }}>
                        {!addMode && (
                            <TextField
                                className="compact-ui"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by email, client, asset ID, or employee ID..."
                                size="small"
                                data-field-type="search"
                                sx={{ width: '100%', minWidth: 220, height: 32, '.MuiInputBase-root': { height: 32 }, '.MuiInputBase-input': { height: 20, padding: '0 8px', display: 'flex', alignItems: 'center' } }}
                                InputProps={{
                                    endAdornment: (
                                        <>
                                            <IconButton size="small" onClick={() => {/* Optionally trigger search logic here */}} sx={{ fontSize: 16, p: 0.25 }}>
                                                <SearchIcon fontSize="inherit" />
                                            </IconButton>
                                            {search ? (
                                                <IconButton size="small" onClick={() => setSearch('')} sx={{ fontSize: 16, p: 0.25 }}>
                                                    <ClearIcon fontSize="inherit" />
                                                </IconButton>
                                            ) : null}
                                        </>
                                    ),
                                    style: { height: 32, display: 'flex', alignItems: 'center' },
                                    inputProps: { style: { height: 20, padding: '0 8px', display: 'flex', alignItems: 'center' } }
                                }}
                            />
                        )}
                    </Box>
                    
                    {/* Client Filter Indicator */}
                    {clientFilter && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1, 
                            mt: 1, 
                            py: 0.5,
                            px: 1,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: 1,
                            border: '1px solid #5a67d8',
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
                            position: 'relative',
                            overflow: 'hidden',
                            animation: 'slideIn 0.3s ease-out',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                animation: 'shimmer 2s infinite'
                            }
                        }}>
                            <GroupIcon sx={{ 
                                color: 'white', 
                                fontSize: '1rem',
                                animation: 'pulse 2s infinite'
                            }} />
                            <Typography variant="body2" sx={{ 
                                fontSize: '0.7rem', 
                                color: 'white', 
                                fontWeight: 600,
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}>
                                Filtered by Client: <strong>{clientFilter}</strong>
                            </Typography>
                            <Button
                                size="small"
                                onClick={clearClientFilter}
                                sx={{ 
                                    fontSize: '0.6rem', 
                                    minWidth: 'auto', 
                                    px: 0.75, 
                                    py: 0.125,
                                    color: 'white',
                                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: 0.75,
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    ml: 'auto',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': { 
                                        bgcolor: 'rgba(255, 255, 255, 0.25)',
                                        border: '1px solid rgba(255, 255, 255, 0.5)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }
                                }}
                            >
                                Clear
                            </Button>
                        </Box>
                    )}
                    
                    {/* Buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, minWidth: { xs: '100%', sm: 'auto' } }}>
                        {!addMode ? (
                            <>
                                <Button
                                    className="compact-ui"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                    onClick={openAddUserModal}
                                    size="small"
                                    sx={{ fontSize: '0.6rem', minHeight: 26, height: 26, px: 1.2, borderRadius: 1, lineHeight: 1, minWidth: 80 }}
                                >
                                    Add User
                                </Button>
                                <Button
                                    className="compact-ui"
                                    variant="outlined"
                                    color="primary"
                                    onClick={openImportModal}
                                    size="small"
                                    sx={{ fontSize: '0.6rem', minHeight: 26, height: 26, px: 1.2, borderRadius: 1, lineHeight: 1, minWidth: 80 }}
                                >
                                    Import
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    className="compact-ui"
                                    onClick={handleAddCancel}
                                    color="inherit"
                                    size="small"
                                    sx={{ height: 26, minWidth: 48, px: 0.8, fontSize: '0.6rem', lineHeight: 1, boxShadow: 'none', flexShrink: 0 }}
                                >
                                    CANCEL
                                </Button>
                                <Button
                                    className="compact-ui"
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    onClick={handleAddSave}
                                    sx={{ height: 26, minWidth: 48, px: 0.8, fontSize: '0.6rem', lineHeight: 1, boxShadow: 2, flexShrink: 0 }}
                                >
                                    SAVE
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Collapse component wraps the add user form */}
                <Collapse in={addMode} timeout={400} unmountOnExit>
                    <Box mb={1} p={1} className="compact-ui" sx={{ margin: '0 24px' }}> {/* Added horizontal margin here */}
                        {/* Removed form tag from here as SAVE button is moved out */}
                        {/* Changed flexWrap to 'wrap' for better responsiveness to prevent overflow if content is too long */}
                        <Box display="flex" gap={0.5} alignItems="center" flexWrap="wrap" width="100%">
                                <Autocomplete
                                    className="compact-ui"
                                    options={previousClientsRef.current.map(c => c['Client name'])}
                                    value={addRowData.clientname || ''}
                                    onChange={handleAddClientChange}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Client Name" required size="small"
                                            data-field-type="company"
                                            InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                            inputProps={{ ...params.inputProps, style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                            placeholder="Client Name"
                                            sx={{ minWidth: 125, maxWidth: 150, height: 48, flexShrink: 0 }} /* Modified */
                                        />
                                    )}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Domain Name"
                                    name="domain"
                                    value={addRowData.domain}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="company"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                    placeholder="Domain Name"
                                    sx={{ minWidth: 60, maxWidth: 90, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }} /* Modified */
                                    disabled={!!addRowData.domain} // Disable if domain is autofilled
                                />
                                <TextField
                                    className="compact-ui"
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
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                    placeholder="Email Prefix"
                                    sx={{ flex: 1, height: 48, '.MuiInputBase-root': { height: 48 } }} /* Modified */
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end" className="email-suffix-adornment">
                                                <span style={{ fontSize: '0.65rem' }}>@{addRowData.domain || 'domain.com'}</span>
                                            </InputAdornment>
                                        )
                                    }}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Password"
                                    name="password"
                                    type="password"
                                    value={addRowData.password}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="password"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                    placeholder="Password"
                                    sx={{ flex: 1, height: 48, '.MuiInputBase-root': { height: 48 } }} /* Modified */
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Asset ID"
                                    name="asset_id"
                                    value={addRowData.asset_id}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="name"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                    placeholder="Asset ID"
                                    sx={{ minWidth: 80, maxWidth: 120, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }} /* Modified */
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Employee ID"
                                    name="employeeId"
                                    value={addRowData.employeeId}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="name"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                    placeholder="Employee ID"
                                    sx={{ minWidth: 80, maxWidth: 120, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }} /* Modified */
                                    error={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId)}
                                    helperText={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId) ? 'Employee ID already exists' : ''}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="First Name"
                                    name="firstName"
                                    value={addRowData.firstName}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="name"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }}
                                    placeholder="First Name"
                                    sx={{ minWidth: 80, maxWidth: 120, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Last Name"
                                    name="lastName"
                                    value={addRowData.lastName}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="name"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }}
                                    placeholder="Last Name"
                                    sx={{ minWidth: 80, maxWidth: 120, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Contact Number"
                                    name="contactNumber"
                                    value={addRowData.contactNumber}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="contact"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }}
                                    placeholder="Contact Number"
                                    sx={{ minWidth: 100, maxWidth: 140, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }}
                                />
                                <TextField
                                    className="compact-ui"
                                    label="Manager Email"
                                    name="managerEmail"
                                    value={addRowData.managerEmail}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="email"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }}
                                    placeholder="Manager Email"
                                    sx={{ minWidth: 120, maxWidth: 160, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }}
                                />
                                <Select
                                    className="compact-ui"
                                    name="employmentType"
                                    value={addRowData.employmentType || ''}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    displayEmpty
                                    sx={{ minWidth: 100, maxWidth: 140, height: 48, '.MuiSelect-select': { fontSize: '0.65rem', height: 48, padding: '12px 6px' } }}
                                    inputProps={{ style: { fontSize: '0.65rem' } }}
                                >
                                    <MenuItem value="" disabled sx={{ fontSize: '0.65rem' }}>Employment Type</MenuItem>
                                    {EMPLOYMENT_TYPES.map(opt => (
                                        <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.65rem' }}>{opt.label}</MenuItem>
                                    ))}
                                </Select>
                                <TextField
                                    className="compact-ui"
                                    label="Designation"
                                    name="designation"
                                    value={addRowData.designation}
                                    onChange={handleAddChange}
                                    required
                                    size="small"
                                    data-field-type="name"
                                    InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                    inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }}
                                    placeholder="Designation"
                                    sx={{ minWidth: 100, maxWidth: 140, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }}
                                />
                        </Box>
                    </Box>
                </Collapse> {/* End Collapse component */}

                {/* New Add User Modal */}
                <Dialog open={addUserModalOpen} onClose={closeAddUserModal} maxWidth="xs" fullWidth>
                  <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Create User</DialogTitle>
                  <form onSubmit={handleAddUserSave}>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                      {user && user.role === 'site_admin' ? (
                        <TextField
                          label="Company Name"
                          name="companyName"
                          value={addUserData.companyName}
                          InputProps={{ readOnly: true }}
                          required
                          size="small"
                          fullWidth
                          data-field-type="company"
                          sx={{ mb: 1 }}
                          helperText="Auto-filled from your company"
                        />
                      ) : (
                        <Select
                          name="companyName"
                          value={addUserData.companyName}
                          onChange={handleAddUserChange}
                          required
                          displayEmpty
                          size="small"
                          sx={{ mb: 1 }}
                        >
                          <MenuItem value="" disabled>Select Company</MenuItem>
                          {previousClientsRef.current.map(c => (
                            <MenuItem key={c['Client name'] || c.companyName || c.id} value={c['Client name'] || c.companyName}>{c['Client name'] || c.companyName}</MenuItem>
                          ))}
                        </Select>
                      )}
                      <Box display="flex" gap={1}>
                        <TextField
                          label="First Name"
                          name="firstName"
                          value={addUserData.firstName}
                          onChange={handleAddUserChange}
                          required
                          size="small"
                          fullWidth
                          data-field-type="name"
                        />
                        <TextField
                          label="Last Name"
                          name="lastName"
                          value={addUserData.lastName}
                          onChange={handleAddUserChange}
                          required
                          size="small"
                          fullWidth
                          data-field-type="name"
                        />
                      </Box>
                      <TextField
                        label="Email"
                        name="email"
                        value={addUserData.email}
                        onChange={handleAddUserChange}
                        required
                        size="small"
                        fullWidth
                        data-field-type="email"
                      />
                      <TextField
                        label="Password"
                        name="password"
                        value={addUserData.password}
                        InputProps={{ readOnly: true }}
                        size="small"
                        fullWidth
                        data-field-type="password"
                        helperText="Auto-generated password"
                      />
                      <TextField
                        label="Contact Number"
                        name="contactNumber"
                        value={addUserData.contactNumber}
                        onChange={handleAddUserChange}
                        required
                        size="small"
                        fullWidth
                        data-field-type="contact"
                      />
                      <TextField
                        label="Manager Email"
                        name="managerEmail"
                        value={addUserData.managerEmail}
                        onChange={handleAddUserChange}
                        required
                        size="small"
                        fullWidth
                      />
                      <Select
                        name="employmentType"
                        value={addUserData.employmentType}
                        onChange={handleAddUserChange}
                        required
                        displayEmpty
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        <MenuItem value="" disabled>Select Employment Type</MenuItem>
                        {EMPLOYMENT_TYPES.map(opt => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </Select>
                      <TextField
                        label="Designation"
                        name="designation"
                        value={addUserData.designation}
                        onChange={handleAddUserChange}
                        required
                        size="small"
                        fullWidth
                      />
                      <TextField
                        label="Employee ID"
                        name="employeeId"
                        value={addUserData.employeeId}
                        onChange={handleAddUserChange}
                        required
                        size="small"
                        fullWidth
                        data-field-type="name"
                        error={addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId)}
                        helperText={addUserData.employeeId && checkDuplicateEmployeeId(addUserData.employeeId) ? 'Employee ID already exists' : ''}
                      />
                    </DialogContent>
                    <DialogActions sx={{ py: 1, px: 2 }}>
                      <Button onClick={closeAddUserModal} size="small">Cancel</Button>
                      <Button type="submit" variant="contained" color="primary" size="small">Create</Button>
                    </DialogActions>
                  </form>
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
                    </DialogContent>
                    <DialogActions sx={{ py: 1, px: 2 }}>
                      <Button onClick={closeChangePwdModal} size="small">Cancel</Button>
                      <Button type="submit" variant="contained" color="primary" size="small">Update</Button>
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
                        
                        {/* Import Progress Bar */}
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
                        {/* Show import results if present */}
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

                {/* Responsive: Table for md+, Card for xs/sm */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <Typography color="error">{error}</Typography>
                    </Box>
                ) : isMobile ? (
                    <Box sx={{ width: '100%', px: 1 }}>
                        {clientOrder.length === 0 && !loading && !error && (
                            <Typography variant="body1" color="textSecondary" sx={{ mt: 2, px: 1 }}>
                                No user profiles found.
                            </Typography>
                        )}
                        {clientOrder.map((client) => (
                            <Box key={client} mb={2}>
                                <Typography variant="subtitle2" sx={{ color: '#174ea6', fontStyle: 'italic', fontWeight: 300, fontSize: '0.95rem', letterSpacing: 0.5, mb: 0.5, px: 1 }}>
                                    {client} ({groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''})
                                </Typography>
                                <Grid container spacing={2}>
                                    {groupedUsers[client].map((u, i) => (
                                        <Grid item xs={12} key={u.uid}>
                                            <Card variant="outlined" sx={{ width: '100%' }}>
                                                <CardContent sx={{ p: 2 }}>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={6}><b>Company Name:</b> {u.companyName || u.client_name || '-'}</Grid>
                                                        <Grid item xs={6}><b>First Name:</b> {u.firstName || '-'}</Grid>
                                                        <Grid item xs={6}><b>Last Name:</b> {u.lastName || '-'}</Grid>
                                                        <Grid item xs={12}><b>Email:</b> {u.email}</Grid>
                                                        <Grid item xs={12}><b>Contact Number:</b> {u.contactNumber || '-'}</Grid>
                                                        <Grid item xs={12}><b>Manager Email:</b> {u.managerEmail || '-'}</Grid>
                                                        <Grid item xs={6}><b>Employment Type:</b> {u.employmentType || '-'}</Grid>
                                                        <Grid item xs={6}><b>Designation:</b> {u.designation || '-'}</Grid>
                                                        <Grid item xs={6}><b>Employee ID:</b> {u.employeeId || '-'}</Grid>
                                                    </Grid>
                                                </CardContent>
                                                <CardActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
                                                    <IconButton size="small" onClick={() => openChangePwdModal(u.uid)} title="Change Password">
                                                        <LockResetIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleEditClick(u)} title="Edit">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </CardActions>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        ))}
                    </Box>
                ) : (
                    // Existing table rendering (as previously fixed, with tableLayout: 'fixed', no x-scroll)
                    <>
                        {clientOrder.length === 0 && !loading && !error && (
                            <Typography variant="body1" color="textSecondary" sx={{ mt: 2, px: 3 }}> {/* Added horizontal padding here */}
                                No user profiles found.
                            </Typography>
                        )}
                        {clientOrder.map((client) => (
                            <Box key={client} mb={3} sx={{ px: 3 }}> {/* Added horizontal padding here */}
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="subtitle2" sx={{ color: '#174ea6', fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', letterSpacing: 0.5 }}>
                                        {client} ({groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''})
                                    </Typography>
                                    <Button
                                        size="small"
                                        variant="text"
                                        onClick={() => handleToggleClientCollapse(client)}
                                        sx={{ minWidth: 0, fontSize: '1.1rem', color: '#2563eb', fontWeight: 700 }}
                                        aria-label={collapsedClients[client] ? 'Expand' : 'Collapse'}
                                    >
                                        {collapsedClients[client] ? '+' : '–'}
                                    </Button>
                                </Box>
                                {collapsedClients[client] ? (
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: 2, px: 2, py: 1, minHeight: 40, boxShadow: 'none', border: '1px solid #e0e0e0', mt: 1, mb: 2
                                    }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#174ea6', fontSize: '1rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {client}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#2563eb', fontWeight: 400, fontSize: '0.95rem', ml: 2 }}>
                                            {groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: 'none', mt: 2, mb: 2, width: '100%', overflowX: 'auto' }}>
                                        <Table size="small" sx={{
                                            width: '100%',
                                            tableLayout: 'fixed', // Crucial for fixed layout
                                            minWidth: 0,
                                            '& .MuiTableCell-root': {
                                                fontSize: '0.8rem',
                                                padding: '2px 8px',
                                                height: 24, // Reduced row height for tighter spacing
                                                whiteSpace: 'normal',
                                                wordBreak: 'break-word',
                                                minWidth: 0,
                                                maxWidth: '100%',
                                            },
                                            '& .MuiTableRow-root': { height: 24 }, // Reduced explicit row height
                                            borderCollapse: 'separate',
                                            borderSpacing: 0,
                                        }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: '50px', borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>No.</TableCell>
                                                    {!(user && user.role === 'site_admin') && (
                                                        <TableCell sx={{ width: adjustedColumnWidths.companyName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Company Name</TableCell>
                                                    )}
                                                    <TableCell sx={{ width: adjustedColumnWidths.firstName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>First Name</TableCell>
                                                    <TableCell sx={{ width: adjustedColumnWidths.lastName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Last Name</TableCell>
                                                    <TableCell sx={{ width: adjustedColumnWidths.email, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Email</TableCell>
                                                    <TableCell sx={{ width: adjustedColumnWidths.contactNumber, borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Contact Number</TableCell>
                                                    {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.managerEmail, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Manager Email</TableCell>}
                                                    {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.employmentType, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Employment Type</TableCell>}
                                                    {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.designation, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Designation</TableCell>}
                                                    <TableCell sx={{ width: adjustedColumnWidths.employeeId, borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Employee ID</TableCell>
                                                    <TableCell sx={{ width: adjustedColumnWidths.actions, whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '0.9rem', color: '#174ea6', letterSpacing: 0.5 }}>Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {groupedUsers[client].map((u, i) => (
                                                    <TableRow 
                                                        key={u.uid}
                                                        sx={{
                                                            backgroundColor: isOwnRow(u) ? '#f8f9fa' : 'inherit',
                                                            borderLeft: isOwnRow(u) ? '3px solid #1976d2' : 'none',
                                                            '&:hover': {
                                                                backgroundColor: isOwnRow(u) ? '#e3f2fd' : '#f5f5f5'
                                                            }
                                                        }}
                                                    >
                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>
                                                            {i + 1}
                                                        </TableCell>
                                                        {editRowId === u.uid ? (
                                                            // In Edit Mode
                                                            <>
                                                                {/* Company Name (read-only) - Hidden for site admin */}
                                                                {!(user && user.role === 'site_admin') && (
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                        <TextField
                                                                            value={editRowData.companyName || ''}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none' } }}
                                                                            sx={{ width: '100%', height: '100%' }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                )}
                                                                {/* First Name (read-only) */}
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <TextField
                                                                        value={editRowData.firstName || ''}
                                                                        size="small"
                                                                        variant="standard"
                                                                        InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none' } }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                                {/* Last Name (read-only) */}
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <TextField
                                                                        value={editRowData.lastName || ''}
                                                                        size="small"
                                                                        variant="standard"
                                                                        InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none' } }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                                {/* Email (read-only) */}
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <TextField
                                                                        value={editRowData.email || ''}
                                                                        size="small"
                                                                        variant="standard"
                                                                        InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none' } }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                                {/* Contact Number (editable, blue outline) */}
                                                                <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <TextField
                                                                        name="contactNumber"
                                                                        value={editRowData.contactNumber || ''}
                                                                        onChange={handleEditChange}
                                                                        size="small"
                                                                        variant="standard"
                                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                                {/* Manager Email (editable, blue outline) */}
                                                                {!isXs && !isSm && (
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                        <TextField
                                                                            name="managerEmail"
                                                                            value={editRowData.managerEmail || ''}
                                                                            onChange={handleEditChange}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
                                                                            sx={{ width: '100%', height: '100%' }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                )}
                                                                {/* Employment Type (editable, blue outline) */}
                                                                {!isXs && !isSm && (
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                        <Select
                                                                            name="employmentType"
                                                                            value={editRowData.employmentType || ''}
                                                                            onChange={handleEditChange}
                                                                            size="small"
                                                                            variant="standard"
                                                                            disableUnderline
                                                                            sx={{ fontSize: '0.8rem', height: '100%', padding: 0, background: 'none', boxShadow: 'none', border: 'none', width: '100%', outline: '2px solid #1976d2', '.MuiSelect-select': { padding: '4px 0 4px 8px', minHeight: 0, lineHeight: 'normal' } }}
                                                                            MenuProps={{ PaperProps: { sx: { fontSize: '0.8rem' } } }}
                                                                            fullWidth
                                                                        >
                                                                            {EMPLOYMENT_TYPES.map(opt => (
                                                                                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
                                                                            ))}
                                                                        </Select>
                                                                    </TableCell>
                                                                )}
                                                                {/* Designation (editable, blue outline) */}
                                                                {!isXs && !isSm && (
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                        <TextField
                                                                            name="designation"
                                                                            value={editRowData.designation || ''}
                                                                            onChange={handleEditChange}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', height: '100%', padding: '4px 0 4px 8px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
                                                                            sx={{ width: '100%', height: '100%' }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                )}
                                                                {/* Employee ID (editable, blue outline) */}
                                                                <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <TextField
                                                                        name="employeeId"
                                                                        value={editRowData.employeeId || ''}
                                                                        onChange={handleEditChange}
                                                                        size="small"
                                                                        variant="standard"
                                                                        InputProps={{ 
                                                                            disableUnderline: true, 
                                                                            style: { 
                                                                                fontSize: '0.8rem', 
                                                                                height: '100%', 
                                                                                padding: '4px 0 4px 8px', 
                                                                                background: 'none', 
                                                                                border: 'none', 
                                                                                outline: checkDuplicateEmployeeId(editRowData.employeeId, u.uid) ? '2px solid #d32f2f' : '2px solid #1976d2' 
                                                                            } 
                                                                        }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                                {/* Actions */}
                                                                <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120, p: 0 }}>
                                                                    <IconButton size="small" onClick={() => handleEditSave(u.uid)} title="Save" sx={{ p: 0.5, minWidth: 28, height: 28 }}>
                                                                        <SaveIcon fontSize="inherit" color={hasUnsavedChanges(editRowData, u) ? 'primary' : 'inherit'} style={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                    <IconButton size="small" onClick={handleEditCancel} title="Cancel" color="error" sx={{ p: 0.5, minWidth: 28, height: 28 }}>
                                                                        <ClearIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </>
                                                        ) : (
                                                            // Display Mode
                                                            <>
                                                                {!(user && user.role === 'site_admin') && (
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.companyName || u.client_name || '-'}</TableCell>
                                                                )}
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.firstName || '-'}</TableCell>
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.lastName || '-'}</TableCell>
                                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        {u.email}
                                                                        {u.isSiteAdmin && (
                                                                            <span style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                width: '1.2em',
                                                                                height: '1.2em',
                                                                                borderRadius: '50%',
                                                                                background: '#2563eb',
                                                                                color: '#fff',
                                                                                fontWeight: 600,
                                                                                fontSize: '1em',
                                                                                marginLeft: 4,
                                                                                lineHeight: '1.2em',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle',
                                                                                padding: 0,
                                                                            }}
                                                                                title="Site Admin"
                                                                            >s</span>
                                                                        )}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.contactNumber || '-'}</TableCell>
                                                                {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.managerEmail || '-'}</TableCell>}
                                                                {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.employmentType || '-'}</TableCell>}
                                                                {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.designation || '-'}</TableCell>}
                                                                <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.employeeId || '-'}</TableCell>
                                                                <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120, p: 0 }}>
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={() => openChangePwdModal(u.uid)} 
                                                                        title={isOwnRow(u) ? "Cannot change your own password" : "Change Password"}
                                                                        disabled={isOwnRow(u)}
                                                                        sx={{ 
                                                                            p: 0.5, 
                                                                            minWidth: 28, 
                                                                            height: 28,
                                                                            opacity: isOwnRow(u) ? 0.5 : 1,
                                                                            '&:hover': {
                                                                                opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                            }
                                                                        }}
                                                                    >
                                                                        <LockResetIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={() => handleEditClick(u)} 
                                                                        title={isOwnRow(u) ? "Cannot edit your own profile" : "Edit"}
                                                                        disabled={isOwnRow(u)}
                                                                        sx={{ 
                                                                            p: 0.5, 
                                                                            minWidth: 28, 
                                                                            height: 28,
                                                                            opacity: isOwnRow(u) ? 0.5 : 1,
                                                                            '&:hover': {
                                                                                opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                            }
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                    <IconButton 
                                                                        size="small" 
                                                                        onClick={(e) => handleDeleteClick(e, u.uid, u.email)} 
                                                                        title={isOwnRow(u) ? "Cannot delete your own account" : "Delete"}
                                                                        disabled={isOwnRow(u)}
                                                                        color="error" 
                                                                        sx={{ 
                                                                            p: 0.5, 
                                                                            minWidth: 28, 
                                                                            height: 28,
                                                                            opacity: isOwnRow(u) ? 0.5 : 1,
                                                                            '&:hover': {
                                                                                opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                            }
                                                                        }}
                                                                    >
                                                                        <DeleteIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Box>
                        ))}
                    </>
                )}
                <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>

                <Popover
                    open={openConfirmPopover}
                    anchorEl={anchorEl.current}
                    onClose={handleCancelDelete}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    PaperProps={{
                        sx: {
                            p: 0.5,
                            minWidth: 160,
                            maxWidth: 220,
                            boxShadow: 3,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                        }
                    }}
                >
                    <Box sx={{ p: 0.5 }}>
                        <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.7rem', lineHeight: 1.2 }}>
                            Delete "<strong>{currentUserEmailToDelete}</strong>"? This cannot be undone.
                        </Typography>
                        <Box display="flex" justifyContent="flex-end" gap={0.5}>
                            <Button onClick={handleCancelDelete} size="small" variant="outlined" color="primary"
                                sx={{ fontSize: '0.6rem', padding: '2px 5px', minWidth: 'auto' }}>
                                No
                            </Button>
                            <Button onClick={handleConfirmDelete} size="small" variant="contained" color="primary" autoFocus
                                sx={{ fontSize: '0.6rem', padding: '2px 5px', minWidth: 'auto' }}>
                                Yes
                            </Button>
                        </Box>
                    </Box>
                </Popover>
            </Box>
        </div>
    );
};

export default UserManagementComponent;