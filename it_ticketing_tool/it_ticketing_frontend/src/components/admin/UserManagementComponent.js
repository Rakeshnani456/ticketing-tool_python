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

// Helper for deep comparison
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
            console.log("areUsersEqual: Users differ at index", i, { user1, user2 });
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
  'employeeId',
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
        console.log("filteredUsers useMemo triggered with:", { usersLength: users.length, search, clientFilter, userRole: user?.role });
        
        let filtered = users.filter(u =>
            (u.role === 'user' || u.role === 'site_admin') &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             u.clientname.toLowerCase().includes(search.toLowerCase()) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) ||
             (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
             (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
             (u.employeeId && u.employeeId.toLowerCase().includes(search.toLowerCase()))
            )
        );
        
        console.log("After initial filtering:", filtered.length);
        
        if (clientFilter) {
            const beforeClientFilter = filtered.length;
            filtered = filtered.filter(user => 
                user.client_name === clientFilter || 
                user.companyName === clientFilter ||
                user.clientname === clientFilter
            );
            console.log("After client filtering:", { before: beforeClientFilter, after: filtered.length, clientFilter });
        }
        
        if (user && user.role === 'site_admin' && user.companyName) {
            const beforeSiteAdminFilter = filtered.length;
            filtered = filtered.filter(u => u.clientname === user.companyName || u.companyName === user.companyName);
            console.log("After site admin filtering:", { before: beforeSiteAdminFilter, after: filtered.length, userCompanyName: user.companyName });
        }
        
        console.log("Final filtered users:", filtered.length);
        return filtered;
    }, [users, search, clientFilter, user]);

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
    }, [fetchClients]);

    useEffect(() => {
        if (!user || !user.firebaseUser) {
            console.log("No user or firebaseUser available, skipping listener setup");
            return;
        }
        setLoading(true);
        setError(null);
        console.log("Setting up real-time users listener...");
        
        const fetchUsersFromAPI = async () => {
            try {
                console.log("Falling back to API method...");
                
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
                        employeeId: u.employeeId || '',
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
            const usersRef = collection(db, 'users');
            console.log("Created users collection reference:", usersRef);
            
            const unsubscribe = onSnapshot(usersRef, 
                async (snapshot) => {
                    try {
                        console.log("Real-time update received, snapshot size:", snapshot.size);
                        
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
                                employeeId: u.employeeId || '',
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
            
            return () => {
                console.log("Cleaning up real-time users listener...");
                unsubscribe();
            };
        } catch (error) {
            console.error("Error setting up Firestore listener:", error);
            console.log("Falling back to API method due to setup error");
            fetchUsersFromAPI();
        }
    }, [user, fetchClients, db]);

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
        if (!addRowData.clientname) {
             setSnackbar({ open: true, message: 'Client Name is required.', severity: 'error' });
            return;
        }
        if (!addRowData.employeeId) {
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
            showPasswordField: false,
            password: '',
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
            
            if (editRowData.showPasswordField && editRowData.password) {
                updatePayload.password = editRowData.password;
            }
            
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
            setEditRowData({ ...initialUserState, showPasswordField: false });
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
            const client = user.companyName || user.clientname || 'Unknown Client';
            if (!acc[client]) acc[client] = [];
            acc[client].push(user);
            return acc;
        }, {});
        
        console.log("groupedUsers result:", Object.keys(result).length, "clients");
        return result;
    }, [filteredUsers]);

    const clientOrder = useMemo(() => Object.keys(groupedUsers).sort(), [groupedUsers]);

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
      if (!addUserData.companyName || !addUserData.firstName || !addUserData.lastName || !addUserData.email || !addUserData.contactNumber || !addUserData.managerEmail || !addUserData.employmentType || !addUserData.designation || !addUserData.employeeId) {
        setSnackbar({ open: true, message: 'All fields are required.', severity: 'error' });
        return;
      }
      
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
          employeeId: addUserData.employeeId,
          role: 'user',
          client_name: addUserData.companyName,
        };
        
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
        email: '18%',
        contactNumber: '8%',
        managerEmail: '12%',
        employmentType: '8%',
        designation: '8%',
        employeeId: '8%',
        actions: '10%',
    };

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
                employeeId: '10%',
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
      const csvContent = USER_TEMPLATE_HEADERS.join(',');
      
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
            
            const missingCols = USER_TEMPLATE_HEADERS.filter(h => !headers.includes(h));
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
            json = XLSX.utils.sheet_to_json(worksheet, { header: USER_TEMPLATE_HEADERS, defval: '' });
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
            <Box sx={{ 
                p: { xs: 2, sm: 3 }, 
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
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid #e0e0e0'
                }}>
                    <Box>
                        <Typography 
                            variant="h4" 
                            component="h1" 
                            sx={{ 
                                fontWeight: 600, 
                                color: '#1976d2',
                                mb: 0.5
                            }}
                        >
                            User Management
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Manage user accounts and permissions
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
                            startIcon={<AddIcon />}
                            onClick={openAddUserModal}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                '&:hover': {
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                }
                            }}
                        >
                            Add User
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={openImportModal}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                borderWidth: 1.5,
                                '&:hover': {
                                    borderWidth: 2,
                                }
                            }}
                        >
                            Import Users
                        </Button>
                    </Box>
                </Box>

                {/* Search and Filter Section */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2, 
                        mb: 3, 
                        borderRadius: 2, 
                        backgroundColor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        alignItems: 'center'
                    }}
                >
                    <TextField
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by email, client, asset ID, or employee ID..."
                        size="small"
                        fullWidth
                        sx={{ 
                            maxWidth: { sm: 400 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="disabled" />
                                </InputAdornment>
                            ),
                            endAdornment: search && (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    
                    {clientFilter && (
                        <Chip
                            icon={<GroupIcon />}
                            label={`Filtered by: ${clientFilter}`}
                            onDelete={clearClientFilter}
                            color="primary"
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                fontWeight: 500,
                                '& .MuiChip-deleteIcon': {
                                    color: '#1976d2',
                                }
                            }}
                        />
                    )}
                </Paper>

                {/* Add User Form */}
                <Collapse in={addMode} timeout="auto" unmountOnExit>
                    <Paper 
                        elevation={0} 
                        sx={{ 
                            p: 3, 
                            mb: 3, 
                            borderRadius: 2, 
                            backgroundColor: '#ffffff',
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                            Add New User
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={2}>
                            <Autocomplete
                                options={previousClientsRef.current.map(c => c['Client name'])}
                                value={addRowData.clientname || ''}
                                onChange={handleAddClientChange}
                                renderInput={(params) => (
                                    <TextField {...params} label="Client Name" required size="small"
                                        data-field-type="company"
                                        InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                        inputProps={{ ...params.inputProps, style: { fontSize: '0.8rem' } }}
                                        placeholder="Client Name"
                                        sx={{ minWidth: 200, flex: 1 }}
                                    />
                                )}
                            />
                            <TextField
                                label="Domain Name"
                                name="domain"
                                value={addRowData.domain}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="company"
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Domain Name"
                                sx={{ minWidth: 150, flex: 1 }}
                                disabled={!!addRowData.domain}
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
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
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
                                label="Password"
                                name="password"
                                type="password"
                                value={addRowData.password}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="password"
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Password"
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="Asset ID"
                                name="asset_id"
                                value={addRowData.asset_id}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Asset ID"
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
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Employee ID"
                                sx={{ minWidth: 150, flex: 1 }}
                                error={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId)}
                                helperText={addRowData.employeeId && checkDuplicateEmployeeId(addRowData.employeeId) ? 'Employee ID already exists' : ''}
                            />
                            <TextField
                                label="First Name"
                                name="firstName"
                                value={addRowData.firstName}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
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
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Last Name"
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
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
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
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
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
                                label="Designation"
                                name="designation"
                                value={addRowData.designation}
                                onChange={handleAddChange}
                                required
                                size="small"
                                data-field-type="name"
                                InputLabelProps={{ style: { fontSize: '0.8rem' } }}
                                inputProps={{ style: { fontSize: '0.8rem' } }}
                                placeholder="Designation"
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

                {/* Users Table */}
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
                        {clientOrder.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                                <Typography variant="body1" color="textSecondary">
                                    No user profiles found.
                                </Typography>
                            </Box>
                        ) : (
                            clientOrder.map((client) => (
                                <Box key={client} sx={{ mb: 3 }}>
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            backgroundColor: '#f5f5f5',
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            borderBottom: '1px solid #e0e0e0'
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                            {client} ({groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''})
                                        </Typography>
                                        <Button
                                            size="small"
                                            onClick={() => handleToggleClientCollapse(client)}
                                            sx={{ minWidth: 0, p: 1 }}
                                        >
                                            {collapsedClients[client] ? <AddIcon /> : <ClearIcon />}
                                        </Button>
                                    </Box>
                                    
                                    {collapsedClients[client] ? (
                                        <Box sx={{ p: 2, textAlign: 'center', backgroundColor: '#fafafa' }}>
                                            <Typography variant="body2" color="textSecondary">
                                                Collapsed - {groupedUsers[client].length} users
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ width: '50px', borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>No.</TableCell>
                                                        {!(user && user.role === 'site_admin') && (
                                                            <TableCell sx={{ width: adjustedColumnWidths.companyName, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Company Name</TableCell>
                                                        )}
                                                        <TableCell sx={{ width: adjustedColumnWidths.firstName, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>First Name</TableCell>
                                                        <TableCell sx={{ width: adjustedColumnWidths.lastName, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Last Name</TableCell>
                                                        <TableCell sx={{ width: adjustedColumnWidths.email, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Email</TableCell>
                                                        <TableCell sx={{ width: adjustedColumnWidths.contactNumber, borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Contact Number</TableCell>
                                                        {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.managerEmail, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Manager Email</TableCell>}
                                                        {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.employmentType, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Employment Type</TableCell>}
                                                        {!isXs && !isSm && <TableCell sx={{ width: adjustedColumnWidths.designation, borderRight: '1px solid #e0e0e0', fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Designation</TableCell>}
                                                        <TableCell sx={{ width: adjustedColumnWidths.employeeId, borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Employee ID</TableCell>
                                                        <TableCell sx={{ width: adjustedColumnWidths.actions, fontWeight: 700, fontSize: '0.9rem', color: '#1976d2' }}>Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {groupedUsers[client].map((u, i) => (
                                                        <TableRow 
                                                            key={u.uid}
                                                            hover
                                                            sx={{ 
                                                                '&:hover': { backgroundColor: '#f5f5f5' },
                                                                backgroundColor: isOwnRow(u) ? '#e3f2fd' : 'inherit'
                                                            }}
                                                        >
                                                            <TableCell sx={{ borderRight: '1px solid #e0e0e0', fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>
                                                                {i + 1}
                                                            </TableCell>
                                                            {editRowId === u.uid ? (
                                                                <>
                                                                    {!(user && user.role === 'site_admin') && (
                                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                value={editRowData.companyName || ''}
                                                                                size="small"
                                                                                variant="standard"
                                                                                InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem' } }}
                                                                                fullWidth
                                                                            />
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                        <TextField
                                                                            value={editRowData.firstName || ''}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem' } }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                        <TextField
                                                                            value={editRowData.lastName || ''}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem' } }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                        <TextField
                                                                            value={editRowData.email || ''}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.8rem' } }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined }}>
                                                                        <TextField
                                                                            name="contactNumber"
                                                                            value={editRowData.contactNumber || ''}
                                                                            onChange={handleEditChange}
                                                                            size="small"
                                                                            variant="standard"
                                                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', outline: '2px solid #1976d2' } }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                    {!isXs && !isSm && (
                                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                name="managerEmail"
                                                                                value={editRowData.managerEmail || ''}
                                                                                onChange={handleEditChange}
                                                                                size="small"
                                                                                variant="standard"
                                                                                InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', outline: '2px solid #1976d2' } }}
                                                                                fullWidth
                                                                            />
                                                                        </TableCell>
                                                                    )}
                                                                    {!isXs && !isSm && (
                                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                            <Select
                                                                                name="employmentType"
                                                                                value={editRowData.employmentType || ''}
                                                                                onChange={handleEditChange}
                                                                                size="small"
                                                                                variant="standard"
                                                                                disableUnderline
                                                                                sx={{ fontSize: '0.8rem', outline: '2px solid #1976d2' }}
                                                                                fullWidth
                                                                            >
                                                                                {EMPLOYMENT_TYPES.map(opt => (
                                                                                    <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
                                                                                ))}
                                                                            </Select>
                                                                        </TableCell>
                                                                    )}
                                                                    {!isXs && !isSm && (
                                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                name="designation"
                                                                                value={editRowData.designation || ''}
                                                                                onChange={handleEditChange}
                                                                                size="small"
                                                                                variant="standard"
                                                                                InputProps={{ disableUnderline: true, style: { fontSize: '0.8rem', outline: '2px solid #1976d2' } }}
                                                                                fullWidth
                                                                            />
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined }}>
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
                                                                                    outline: checkDuplicateEmployeeId(editRowData.employeeId, u.uid) ? '2px solid #f44336' : '2px solid #1976d2' 
                                                                                } 
                                                                            }}
                                                                            fullWidth
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell sx={{ minWidth: 120, p: 0 }}>
                                                                        <IconButton size="small" onClick={() => handleEditSave(u.uid)} title="Save" sx={{ p: 0.5 }}>
                                                                            <SaveIcon fontSize="inherit" color={hasUnsavedChanges(editRowData, u) ? 'primary' : 'inherit'} />
                                                                        </IconButton>
                                                                        <IconButton size="small" onClick={handleEditCancel} title="Cancel" color="error" sx={{ p: 0.5 }}>
                                                                            <ClearIcon fontSize="inherit" />
                                                                        </IconButton>
                                                                    </TableCell>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {!(user && user.role === 'site_admin') && (
                                                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.companyName || u.client_name || '-'}</TableCell>
                                                                    )}
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.firstName || '-'}</TableCell>
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.lastName || '-'}</TableCell>
                                                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
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
                                                                                    background: '#1976d2',
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
                                                                    <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined }}>{u.contactNumber || '-'}</TableCell>
                                                                    {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.managerEmail || '-'}</TableCell>}
                                                                    {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.employmentType || '-'}</TableCell>}
                                                                    {!isXs && !isSm && <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>{u.designation || '-'}</TableCell>}
                                                                    <TableCell sx={{ borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined }}>{u.employeeId || '-'}</TableCell>
                                                                    <TableCell sx={{ minWidth: 120, p: 0 }}>
                                                                        <IconButton 
                                                                            size="small" 
                                                                            onClick={() => openChangePwdModal(u.uid)} 
                                                                            title={isOwnRow(u) ? "Cannot change your own password" : "Change Password"}
                                                                            disabled={isOwnRow(u)}
                                                                            sx={{ 
                                                                                p: 0.5,
                                                                                opacity: isOwnRow(u) ? 0.5 : 1,
                                                                                '&:hover': {
                                                                                    opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                                }
                                                                            }}
                                                                        >
                                                                            <LockResetIcon fontSize="inherit" />
                                                                        </IconButton>
                                                                        <IconButton 
                                                                            size="small" 
                                                                            onClick={() => handleEditClick(u)} 
                                                                            title={isOwnRow(u) ? "Cannot edit your own profile" : "Edit"}
                                                                            disabled={isOwnRow(u)}
                                                                            sx={{ 
                                                                                p: 0.5,
                                                                                opacity: isOwnRow(u) ? 0.5 : 1,
                                                                                '&:hover': {
                                                                                    opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                                }
                                                                            }}
                                                                        >
                                                                            <EditIcon fontSize="inherit" />
                                                                        </IconButton>
                                                                        <IconButton 
                                                                            size="small" 
                                                                            onClick={(e) => handleDeleteClick(e, u.uid, u.email)} 
                                                                            title={isOwnRow(u) ? "Cannot delete your own account" : "Delete"}
                                                                            disabled={isOwnRow(u)}
                                                                            color="error" 
                                                                            sx={{ 
                                                                                p: 0.5,
                                                                                opacity: isOwnRow(u) ? 0.5 : 1,
                                                                                '&:hover': {
                                                                                    opacity: isOwnRow(u) ? 0.5 : 0.8
                                                                                }
                                                                            }}
                                                                        >
                                                                            <DeleteIcon fontSize="inherit" />
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
                            ))
                        )}
                    </Paper>
                )}

                {/* Add User Modal */}
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

                {/* Delete Confirmation Popover */}
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

                {/* Snackbar */}
                <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </div>
    );
};

export default UserManagementComponent;