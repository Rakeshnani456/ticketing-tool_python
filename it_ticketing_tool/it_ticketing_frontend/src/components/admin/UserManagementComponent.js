// src/components/admin/UserManagementComponent.js

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Snackbar, Alert, Typography, Popover, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, useMediaQuery, Card, CardContent, CardActions, Grid, CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Clear as ClearIcon, VpnKey as VpnKeyIcon, LockReset as LockResetIcon, Save as SaveIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css';
import { useNavigate } from 'react-router-dom';
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
            user1.designation !== user2.designation) {
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
  'companyName',
  'firstName',
  'lastName',
  'email',
  'contactNumber',
  'managerEmail',
  'employmentType',
  'designation',
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
    const fileInputRef = useRef();

    // Add at the top, after other useState hooks
    const [collapsedClients, setCollapsedClients] = useState({});
    const handleToggleClientCollapse = (client) => {
      setCollapsedClients(prev => ({ ...prev, [client]: !prev[client] }));
    };

    // Add ref to track previous users state to prevent infinite loops
    const previousUsersRef = useRef([]);
    const previousClientsRef = useRef([]);

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

    // Fetch users from backend API
    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);

            try {
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
                    if (previousUsersRef.current.length === 0) {
                        setUsers([]);
                        previousUsersRef.current = [];
                    } else {
                        console.log("Keeping existing users data to prevent table from vanishing");
                    }
                }
                
                setLoading(false);
                setError(null);
            } catch (error) {
                console.error("Error fetching users:", error);
                setError('Could not load users.');
                setUsers([]);
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user, fetchClients]); // Depend on user and fetchClients

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
        if (!addRowData.name) {
             setSnackbar({ open: true, message: 'User Name is required.', severity: 'error' });
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

        try {
            const email = `${addRowData.emailPrefix.trim()}@${addRowData.domain.trim()}`;
            const payload = {
              name: addRowData.name,
              email,
              password: addRowData.password,
              role: 'user',
              asset_id: addRowData.asset_id,
              joined_date: new Date().toISOString(),
              client_name: addRowData.clientname,
              domain: addRowData.domain, // <-- Add this line
              isSiteAdmin: false, // <-- Always false from user management
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
            // Always send all editable fields (except password, which is only sent if changed)
            const updatePayload = {
                firstName: editRowData.firstName,
                lastName: editRowData.lastName,
                contactNumber: editRowData.contactNumber,
                managerEmail: editRowData.managerEmail,
                employmentType: editRowData.employmentType,
                designation: editRowData.designation,
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

    const filteredUsers = useMemo(() => {
        console.log("filteredUsers useMemo triggered with:", { usersLength: users.length, search, userRole: user?.role });
        
        let filtered = users.filter(u =>
            (u.role === 'user' || u.role === 'site_admin') &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             u.clientname.toLowerCase().includes(search.toLowerCase()) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) ||
             (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
             (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase()))
            )
        );
        
        console.log("After initial filtering:", filtered.length);
        
        // If the logged-in user is a site_admin, only show users from their company/client
        if (user && user.role === 'site_admin' && user.companyName) {
            const beforeSiteAdminFilter = filtered.length;
            filtered = filtered.filter(u => u.clientname === user.companyName || u.companyName === user.companyName);
            console.log("After site admin filtering:", { before: beforeSiteAdminFilter, after: filtered.length, userCompanyName: user.companyName });
        }
        
        console.log("Final filtered users:", filtered.length);
        return filtered;
    }, [users, search, user]);

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
      setAddUserData({ ...initialUserState, password: generatePassword() });
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
      if (!addUserData.companyName || !addUserData.firstName || !addUserData.lastName || !addUserData.email || !addUserData.contactNumber || !addUserData.managerEmail || !addUserData.employmentType || !addUserData.designation) {
        setSnackbar({ open: true, message: 'All fields are required.', severity: 'error' });
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
          role: 'user',
          // Assuming client_name is derived from companyName for the backend
          client_name: addUserData.companyName,
        };
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
            editRowData.designation !== (originalUser.designation || '')
        );
    };

    // Define column widths for tableLayout: 'fixed' to prevent shifts
    const FIXED_COLUMN_WIDTHS = {
        companyName: '15%',
        firstName: '10%',
        lastName: '10%',
        email: '20%',
        contactNumber: '10%',
        managerEmail: '15%',
        employmentType: '10%',
        designation: '10%',
        actions: '10%', // Adjust as needed
    };

    // Excel template download
    const handleDownloadTemplate = () => {
      const ws = XLSX.utils.aoa_to_sheet([
        USER_TEMPLATE_HEADERS,
        // Optionally, add a sample row:
        ['Acme Corp', 'John', 'Doe', 'john.doe@acme.com', '1234567890', 'manager@acme.com', 'permanent', 'Engineer']
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'UsersTemplate');
      XLSX.writeFile(wb, 'user_import_template.xlsx');
    };

    // Handle file upload and parse
    const handleImportFile = (e) => {
      setImportError('');
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: USER_TEMPLATE_HEADERS, defval: '' });
          // Remove header row if present
          const users = json.filter(row => row.email && row.email !== 'email');
          // Validate columns
          const missingCols = USER_TEMPLATE_HEADERS.filter(h => !Object.keys(users[0] || {}).includes(h));
          if (missingCols.length > 0) {
            setImportError('Missing columns: ' + missingCols.join(', '));
            setImportedUsers([]);
            setImportedPasswords([]);
            return;
          }
          // Auto-generate password for each user
          const usersWithPasswords = users.map(row => ({ ...row, password: generatePassword() }));
          setImportedUsers(usersWithPasswords);
          setImportedPasswords(usersWithPasswords.map(u => ({ email: u.email, password: u.password })));
        } catch (err) {
          setImportError('Failed to parse file. Please use the provided template.');
          setImportedUsers([]);
          setImportedPasswords([]);
        }
      };
      reader.readAsArrayBuffer(file);
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    // Confirm import: send to backend
    const handleConfirmImport = async () => {
      setImportError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: importedUsers }),
        });
        const data = await res.json();
        if (!res.ok) {
          setImportError(data.error || 'Bulk import failed.');
          setImportResults(null);
        } else {
          setImportResults(data.results);
          // Only keep passwords for successfully imported users
          setImportedPasswords(importedPasswords.filter(pw => data.results.some(r => r.email === pw.email && r.success)));
          setImportedUsers([]);
        }
      } catch (err) {
        setImportError('Bulk import failed.');
        setImportResults(null);
      }
    };

    // Download passwords as Excel
    const handleDownloadPasswords = () => {
      if (!importedPasswords.length) return;
      const ws = XLSX.utils.json_to_sheet(importedPasswords);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Passwords');
      XLSX.writeFile(wb, 'imported_user_passwords.xlsx');
    };

    return (
        // Removed 'container', 'mx-auto', and all 'p-*' classes to eliminate external gaps
        // Added 'w-full' to ensure it takes full width
        <div className="w-full bg-white animate-fade-in">
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
                            placeholder="Search by email, client, or asset ID..."
                            size="small"
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
                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                        inputProps={{ ...params.inputProps, style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                        placeholder="Client Name"
                                        sx={{ minWidth: 125, maxWidth: 150, height: 48, flexShrink: 0 }} /* Modified */
                                    />
                                )}
                            />
                            <TextField
                                className="compact-ui"
                                label="User Name"
                                name="name"
                                value={addRowData.name}
                                onChange={handleAddChange}
                                required
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' }}} /* Modified */
                                placeholder="User Name"
                                sx={{ flex: 1, height: 48, '.MuiInputBase-root': { height: 48 } }} /* Modified */
                            />
                            <TextField
                                className="compact-ui"
                                label="Domain Name"
                                name="domain"
                                value={addRowData.domain}
                                onChange={handleAddChange}
                                required
                                size="small"
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
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 48, minHeight: 48, maxHeight: 48, padding: '12px 6px' } }} /* Modified */
                                placeholder="Asset ID"
                                sx={{ minWidth: 80, maxWidth: 120, height: 48, '.MuiInputBase-root': { height: 48 }, flexShrink: 0 }} /* Modified */
                            />
                    </Box>
                </Box>
            </Collapse> {/* End Collapse component */}

            {/* New Add User Modal */}
            <Dialog open={addUserModalOpen} onClose={closeAddUserModal} maxWidth="xs" fullWidth>
              <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Create User</DialogTitle>
              <form onSubmit={handleAddUserSave}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
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
                  <Box display="flex" gap={1}>
                    <TextField
                      label="First Name"
                      name="firstName"
                      value={addUserData.firstName}
                      onChange={handleAddUserChange}
                      required
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Last Name"
                      name="lastName"
                      value={addUserData.lastName}
                      onChange={handleAddUserChange}
                      required
                      size="small"
                      fullWidth
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
                  />
                  <TextField
                    label="Password"
                    name="password"
                    value={addUserData.password}
                    InputProps={{ readOnly: true }}
                    size="small"
                    fullWidth
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
            <Dialog open={importModalOpen} onClose={closeImportModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Import Users from Excel</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                    <Button onClick={handleDownloadTemplate} variant="outlined" size="small" sx={{ mb: 1, width: 'fit-content' }}>
                        Download Template
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportFile}
                        style={{ marginBottom: 8 }}
                    />
                    {importError && <Alert severity="error">{importError}</Alert>}
                    {importedUsers.length > 0 && (
                        <Box sx={{ maxHeight: 250, overflow: 'auto', border: '1px solid #eee', borderRadius: 1, mt: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {USER_TEMPLATE_HEADERS.map(h => (
                                            <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {importedUsers.map((row, idx) => (
                                        <TableRow key={idx}>
                                            {USER_TEMPLATE_HEADERS.map(h => (
                                                <TableCell key={h}>{row[h]}</TableCell>
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
                            <Alert severity="success" sx={{ mb: 1 }}>Default Passwords for Imported Users</Alert>
                            <Button onClick={handleDownloadPasswords} variant="contained" size="small" sx={{ mb: 1 }}>
                                Download Passwords
                            </Button>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Password</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {importedPasswords.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>{row.password}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ py: 1, px: 2 }}>
                    <Button onClick={closeImportModal} size="small" color="error">{importResults ? 'Close' : 'Cancel'}</Button>
                    <Button onClick={handleConfirmImport} variant="contained" color="primary" size="small" disabled={importedUsers.length === 0 || !!importResults}>Confirm Import</Button>
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
                                            fontSize: '0.68rem',
                                            padding: '2px 6px',
                                            height: 28, // Ensure consistent row height
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            minWidth: 0,
                                            maxWidth: '100%',
                                        },
                                        '& .MuiTableRow-root': { height: 28 }, // Explicit row height
                                        borderCollapse: 'separate',
                                        borderSpacing: 0,
                                    }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.companyName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Company Name</TableCell>
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.firstName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>First Name</TableCell>
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.lastName, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Last Name</TableCell>
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.email, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Email</TableCell>
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.contactNumber, borderRight: (!isXs && !isSm) ? '1px solid #e0e0e0' : undefined, whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Contact Number</TableCell>
                                                {!isXs && !isSm && <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.managerEmail, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Manager Email</TableCell>}
                                                {!isXs && !isSm && <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.employmentType, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Employment Type</TableCell>}
                                                {!isXs && !isSm && <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.designation, borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Designation</TableCell>}
                                                <TableCell sx={{ width: FIXED_COLUMN_WIDTHS.actions, whiteSpace: 'normal', wordBreak: 'break-word', fontWeight: 700, fontSize: '1rem', color: '#174ea6', letterSpacing: 0.5 }}>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {groupedUsers[client].map((u, i) => (
                                                <TableRow key={u.uid}>
                                                    {editRowId === u.uid ? (
                                                        // In Edit Mode
                                                        <>
                                                            {/* Company Name (read-only) */}
                                                            <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                <TextField
                                                                    value={editRowData.companyName || ''}
                                                                    size="small"
                                                                    variant="standard"
                                                                    InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none' } }}
                                                                    sx={{ width: '100%', height: '100%' }}
                                                                    fullWidth
                                                                />
                                                            </TableCell>
                                                            {/* First Name (read-only) */}
                                                            <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                <TextField
                                                                    value={editRowData.firstName || ''}
                                                                    size="small"
                                                                    variant="standard"
                                                                    InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none' } }}
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
                                                                    InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none' } }}
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
                                                                    InputProps={{ readOnly: true, disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none' } }}
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
                                                                    InputProps={{ disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
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
                                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
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
                                                                        sx={{ fontSize: '0.68rem', height: '100%', padding: 0, background: 'none', boxShadow: 'none', border: 'none', width: '100%', outline: '2px solid #1976d2', '.MuiSelect-select': { padding: '2px 0 2px 6px', minHeight: 0, lineHeight: 'normal' } }}
                                                                        MenuProps={{ PaperProps: { sx: { fontSize: '0.68rem' } } }}
                                                                        fullWidth
                                                                    >
                                                                        {EMPLOYMENT_TYPES.map(opt => (
                                                                            <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.68rem' }}>{opt.label}</MenuItem>
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
                                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.68rem', height: '100%', padding: '2px 0 2px 6px', background: 'none', border: 'none', outline: '2px solid #1976d2' } }}
                                                                        sx={{ width: '100%', height: '100%' }}
                                                                        fullWidth
                                                                    />
                                                                </TableCell>
                                                            )}
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
                                                            <TableCell sx={{ borderRight: '1px solid #e0e0e0', whiteSpace: 'normal', wordBreak: 'break-word' }}>{u.companyName || u.client_name || '-'}</TableCell>
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
                                                            <TableCell sx={{ whiteSpace: 'normal', wordBreak: 'break-word', minWidth: 120, p: 0 }}>
                                                                <IconButton size="small" onClick={() => openChangePwdModal(u.uid)} title="Change Password" sx={{ p: 0.5, minWidth: 28, height: 28 }}>
                                                                    <LockResetIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                </IconButton>
                                                                <IconButton size="small" onClick={() => handleEditClick(u)} title="Edit" sx={{ p: 0.5, minWidth: 28, height: 28 }}>
                                                                    <EditIcon fontSize="inherit" style={{ fontSize: 18 }} />
                                                                </IconButton>
                                                                <IconButton size="small" onClick={(e) => handleDeleteClick(e, u.uid, u.email)} title="Delete" color="error" sx={{ p: 0.5, minWidth: 28, height: 28 }}>
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
        </div>
    );
};

export default UserManagementComponent;