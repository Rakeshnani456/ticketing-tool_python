// src/components/admin/UserManagementComponent.js

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Snackbar, Alert, Typography, Popover,
    Collapse // Import Collapse component
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Clear as ClearIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../../config/firebase';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

// Helper for deep comparison (simple for this case, but can be replaced with a library like lodash.isequal)
const areUsersEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        const user1 = arr1[i];
        const user2 = arr2[i];
        // Compare relevant properties instead of stringifying the whole object for robustness
        if (user1.uid !== user2.uid ||
            user1.clientname !== user2.clientname ||
            user1.name !== user2.name ||
            user1.email !== user2.email ||
            user1.asset_id !== user2.asset_id ||
            user1.domain !== user2.domain) {
            return false;
        }
    }
    return true;
};

// 1. Update initialUserState to include domain and emailPrefix
const initialUserState = {
  clientname: '', // Added clientname to initial state for the Autocomplete
  name: '',
  domain: '',
  emailPrefix: '',
  password: '',
  asset_id: '',
  role: 'user',
  joined_date: '',
};

const UserManagementComponent = ({ user, showFlashMessage }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [addMode, setAddMode] = useState(false);
    const [addRowData, setAddRowData] = useState(initialUserState);
    const [editRowId, setEditRowId] = useState(null);
    // Update editRowData to include all editable fields
    const [editRowData, setEditRowData] = useState({ clientname: '', name: '', domain: '', emailPrefix: '', password: '', asset_id: '', showPasswordField: false });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();
    const db = getFirestore(app);

    // State for the custom confirmation Popover
    const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
    const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
    const userToDeleteUidRef = useRef(null);
    const anchorEl = useRef(null);

    // Fetch clients
    const fetchClients = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients`);
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            // Deep comparison for clients to prevent unnecessary re-renders if content is same
            if (JSON.stringify(clients) !== JSON.stringify(data)) {
                setClients(data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, [clients]); // Dependency on 'clients' state for comparison

    // Fetch users (live snapshot)
    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchClients();

        const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

            const usersWithClientDetails = fetchedUsers.map(u => {
                const clientMatch = clients.find(c => c['Client name'] === u.client_name);
                return {
                    ...u,
                    asset_id: u.asset_id || u.assetid || '',
                    domain: clientMatch ? clientMatch.Domain : (u.domain || ''),
                    clientname: clientMatch ? clientMatch['Client name'] : (u.client_name || 'Unknown Client'),
                };
            });

            // Use the improved areUsersEqual for more robust comparison
            if (!areUsersEqual(users, usersWithClientDetails)) {
                setUsers(usersWithClientDetails);
            }
            setLoading(false);
        }, (err) => {
            setError('Could not load users.');
            setUsers([]);
            setLoading(false);
        });

        return () => unsub();
    }, [db, clients, fetchClients, users]); // Added 'users' to dependencies for areUsersEqual check

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData(initialUserState);
        setEditRowId(null);
    };

    // 3. Update handleAddClientChange to auto-fill domain if possible
    const handleAddClientChange = (event, value) => {
        const selectedClient = clients.find(c => c['Client name'] === value);
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

    const handleEditClick = (userToEdit) => {
        // Split email into prefix and domain
        let emailPrefix = '';
        let domain = '';
        if (userToEdit.email && userToEdit.email.includes('@')) {
            [emailPrefix, domain] = userToEdit.email.split('@');
        }
        setEditRowId(userToEdit.uid);
        setEditRowData({
            clientname: userToEdit.clientname || '',
            name: userToEdit.name || '',
            domain: domain || userToEdit.domain || '',
            emailPrefix: emailPrefix || '',
            password: '',
            asset_id: userToEdit.asset_id || userToEdit.assetid || '',
            showPasswordField: false,
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
            const currentUser = users.find(u => u.uid === uid);
            const updatePayload = {};
            if (editRowData.name && editRowData.name !== currentUser.name) updatePayload.name = editRowData.name;
            if (editRowData.asset_id && editRowData.asset_id !== currentUser.asset_id) updatePayload.asset_id = editRowData.asset_id;
            if (editRowData.showPasswordField && editRowData.password) updatePayload.password = editRowData.password;
            // Optionally allow updating joined_date or role if needed
            if (Object.keys(updatePayload).length === 0) {
                setSnackbar({ open: true, message: 'No changes to update.', severity: 'info' });
                return;
            }
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
            setEditRowData({ clientname: '', name: '', domain: '', emailPrefix: '', password: '', asset_id: '', showPasswordField: false });
            setSnackbar({ open: true, message: 'User updated successfully.', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ clientname: '', name: '', domain: '', emailPrefix: '', password: '', asset_id: '', showPasswordField: false });
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
        return users.filter(u =>
            u.role === 'user' &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             u.clientname.toLowerCase().includes(search.toLowerCase()) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())))
        );
    }, [users, search]);

    const groupedUsers = useMemo(() => {
        return filteredUsers.reduce((acc, user) => {
            const client = user.clientname || 'Unknown Client';
            if (!acc[client]) acc[client] = [];
            acc[client].push(user);
            return acc;
        }, {});
    }, [filteredUsers]);

    const clientOrder = useMemo(() => Object.keys(groupedUsers).sort(), [groupedUsers]);

    return (
        // Removed 'container', 'mx-auto', and all 'p-*' classes to eliminate external gaps
        // Added 'w-full' to ensure it takes full width
        <div className="w-full bg-white shadow-sm rounded-lg animate-fade-in">
            <h2 className="user-mgmt-title compact-ui" style={{ marginBottom: 0, padding: '16px 24px 0' }}>User Management</h2> {/* Added padding here */}
            <Box display="flex" alignItems="center" gap={1} mb={0} className="compact-ui" justifyContent="flex-end" sx={{ padding: '0 24px 16px' }}> {/* Added padding here */}
                {!addMode && (
                    <TextField
                        className="compact-ui"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by email, client, or asset ID..."
                        size="small"
                        sx={{ minWidth: 220, height: 32, mt: '-4px', '.MuiInputBase-root': { height: 32 }, '.MuiInputBase-input': { height: 20, padding: '0 8px', display: 'flex', alignItems: 'center' } }}
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
                <Box sx={{ width: 110, display: 'flex', justifyContent: 'flex-end' }}>
                    {!addMode ? (
                        <Button
                            className="compact-ui"
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                            onClick={handleAdd}
                            size="small"
                            sx={{ fontSize: '0.6rem', minHeight: 20, height: 20, px: 1, py: 0, borderRadius: 1, lineHeight: 1, width: '100%' }}
                        >
                            Add User
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="compact-ui"
                                onClick={handleAddCancel}
                                color="inherit"
                                size="small"
                                sx={{
                                    height: 24,
                                    minWidth: 32,
                                    px: 0.5,
                                    py: 0,
                                    fontSize: '0.6rem',
                                    lineHeight: 1,
                                    boxShadow: 'none',
                                    flexShrink: 0,
                                    // Removed ml: 'auto' as it's now alongside SAVE
                                }}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="compact-ui"
                                type="submit" // Keep type submit if form is wrapped around it
                                variant="contained"
                                color="primary"
                                size="small"
                                onClick={handleAddSave} // Manually trigger save
                                sx={{
                                    height: 24,
                                    minWidth: 32,
                                    px: 0.5,
                                    py: 0,
                                    fontSize: '0.6rem',
                                    lineHeight: 1,
                                    boxShadow: 2,
                                    flexShrink: 0
                                }}
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
                                options={clients.map(c => c['Client name'])}
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

            {clientOrder.length === 0 && !loading && !error && (
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2, px: 3 }}> {/* Added horizontal padding here */}
                    No user profiles found.
                </Typography>
            )}
            {clientOrder.map((client) => (
                <Box key={client} mb={3} sx={{ px: 3 }}> {/* Added horizontal padding here */}
                    <Typography variant="subtitle2" sx={{ color: '#174ea6', fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', letterSpacing: 0.5, mb: 0.5 }}>
                        {client} ({groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''})
                    </Typography>
                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: 'none', marginTop: 0 }}>
                        <Table
                            size="small"
                            sx={{
                                // Changed to border-collapse: collapse for better border alignment
                                borderCollapse: 'collapse',
                                '& .MuiTableCell-root': {
                                    fontSize: '0.68rem',
                                    padding: '6px 8px', // Slightly increased padding for better readability
                                    border: '1px solid #e0e0e0', // Apply border to all cells
                                    // Remove individual borderRight, borderBottom to rely on collapse
                                    height: 'auto', // Let height be determined by content and padding
                                    verticalAlign: 'middle', // Align content vertically in the middle
                                },
                                '& .MuiTableRow-root': {
                                    height: 'auto', // Let row height adjust
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ width: 36, minWidth: 36, maxWidth: 36, textAlign: 'center' }}>#</TableCell>
                                    <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>Client Name</TableCell>
                                    <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>User Name</TableCell>
                                    <TableCell sx={{ width: 180, minWidth: 140, maxWidth: 220 }}>Email</TableCell>
                                    <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140 }}>Password</TableCell>
                                    <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140 }}>Asset ID</TableCell>
                                    <TableCell align="right" sx={{ width: 90, minWidth: 70, maxWidth: 120 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groupedUsers[client].sort((a, b) => a.email.localeCompare(b.email)).map((u, i) => (
                                    <TableRow key={u.uid}>
                                        <TableCell sx={{ textAlign: 'center', fontWeight: 500, color: '#888', width: 36, minWidth: 36, maxWidth: 36 }}>
                                            {i + 1}
                                        </TableCell>
                                        {editRowId === u.uid ? (
                                            <>
                                                {/* Client Name - Disabled/Read-only */}
                                                <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>
                                                    <TextField
                                                        className="compact-ui"
                                                        value={editRowData.clientname || u.clientname}
                                                        disabled // Disable editing
                                                        variant="standard"
                                                        size="small"
                                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.65rem', padding: '0' } }} // Adjusted padding
                                                        sx={{ width: '100%', '.MuiInputBase-input': { padding: '0' } }} // Ensure no extra padding from MUI defaults
                                                    />
                                                </TableCell>
                                                {/* User Name - Editable */}
                                                <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>
                                                    <TextField
                                                        className="compact-ui"
                                                        name="name"
                                                        value={editRowData.name || u.name}
                                                        disabled={false} // Make editable
                                                        variant="standard"
                                                        size="small"
                                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.65rem', padding: '0' } }} // Adjusted padding
                                                        sx={{ width: '100%', '.MuiInputBase-input': { padding: '0' } }}
                                                    />
                                                </TableCell>
                                                {/* Email - Disabled/Read-only */}
                                                <TableCell sx={{ width: 180, minWidth: 140, maxWidth: 220 }}>
                                                    <Box display="flex" alignItems="center">
                                                        <TextField
                                                            className="compact-ui"
                                                            name="emailPrefix"
                                                            value={editRowData.emailPrefix || u.email.split('@')[0]}
                                                            disabled // Disable editing
                                                            variant="standard"
                                                            size="small"
                                                            InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.65rem', padding: '0' } }} // Adjusted padding
                                                            sx={{ flexGrow: 1, '.MuiInputBase-input': { padding: '0' } }}
                                                        />
                                                        <span style={{ fontSize: '0.65rem', marginLeft: 2, flexShrink: 0 }}>@{editRowData.domain || u.email.split('@')[1] || 'domain.com'}</span>
                                                    </Box>
                                                </TableCell>
                                                {/* Password column in EDIT mode */}
                                                <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140, backgroundColor: editRowData.showPasswordField ? '#f0faff' : 'inherit', textAlign: 'center' }}>
                                                    {!editRowData.showPasswordField ? (
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            onClick={handleTogglePasswordField}
                                                            startIcon={<VpnKeyIcon sx={{ fontSize: '1rem', color: '#1976d2' }} />}
                                                            sx={{ fontSize: '0.6rem', height: 20, minWidth: 'auto', padding: '2px 4px', color: '#1976d2' }}
                                                        >
                                                            Change
                                                        </Button>
                                                    ) : (
                                                        <TextField
                                                            name="password"
                                                            label="New Password"
                                                            type="password"
                                                            value={editRowData.password}
                                                            onChange={handleEditChange}
                                                            size="small"
                                                            variant="standard"
                                                            InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                            InputProps={{ disableUnderline: true, style: { fontSize: '0.65rem', padding: '0' } }} // Adjusted padding
                                                            sx={{ width: '100%', '.MuiInputBase-input': { padding: '0' } }}
                                                            placeholder="Enter new password"
                                                        />
                                                    )}
                                                </TableCell>
                                                {/* Asset ID - Editable */}
                                                <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140 }}>
                                                    <TextField
                                                        className="compact-ui"
                                                        name="asset_id"
                                                        value={editRowData.asset_id}
                                                        onChange={handleEditChange}
                                                        required
                                                        size="small"
                                                        variant="standard"
                                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                        InputProps={{ disableUnderline: true, style: { fontSize: '0.65rem', padding: '0' } }} // Adjusted padding
                                                        placeholder="Asset ID"
                                                        sx={{ width: '100%', '.MuiInputBase-input': { padding: '0' } }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ width: 90, minWidth: 70, maxWidth: 120 }} align="right">
                                                    <IconButton onClick={() => handleEditSave(u.uid)} size="small"><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                    <IconButton onClick={handleEditCancel} size="small"><ClearIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>{u.clientname}</TableCell>
                                                <TableCell sx={{ width: 140, minWidth: 100, maxWidth: 180 }}>{u.name}</TableCell>
                                                <TableCell sx={{ width: 180, minWidth: 140, maxWidth: 220 }}>{u.email}</TableCell>
                                                {/* Password column in VIEW mode */}
                                                <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140, textAlign: 'center' }}>
                                                    <IconButton
                                                        onClick={() => handleEditClick(u)}
                                                        size="small"
                                                        sx={{ color: '#9e9e9e' }} // Ash color
                                                        disabled={true} // Disable click in normal mode
                                                    >
                                                        <VpnKeyIcon sx={{ fontSize: '1rem' }} />
                                                    </IconButton>
                                                </TableCell>
                                                <TableCell sx={{ width: 100, minWidth: 80, maxWidth: 140 }}>{u.asset_id || u.assetid}</TableCell>
                                                <TableCell align="right" sx={{ width: 90, minWidth: 70, maxWidth: 120 }}>
                                                    <IconButton onClick={() => handleEditClick(u)} size="small"><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                    <IconButton
                                                        onClick={(event) => handleDeleteClick(event, u.uid, u.email)}
                                                        size="small"
                                                    >
                                                        <DeleteIcon sx={{ fontSize: '1rem' }} />
                                                    </IconButton>
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            ))}
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