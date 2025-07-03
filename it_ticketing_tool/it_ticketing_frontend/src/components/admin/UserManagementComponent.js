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
        if (JSON.stringify(user1) !== JSON.stringify(user2)) {
            return false;
        }
    }
    return true;
};

const initialUserState = {
  email: '',
  password: '',
  role: 'user',
  domain: '',
  clientname: '',
  asset_id: '',
  emailPrefix: '',
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
    const [editRowData, setEditRowData] = useState({ password: '', asset_id: '', showPasswordField: false });
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
            if (JSON.stringify(clients) !== JSON.stringify(data)) {
                setClients(data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, [clients]);

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
                    domain: clientMatch ? clientMatch.Domain : (u.domain || ''),
                    clientname: clientMatch ? clientMatch['Client name'] : (u.client_name || 'Unknown Client'),
                };
            });

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
    }, [db, clients, fetchClients, users]);

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData(initialUserState);
        setEditRowId(null);
    };

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

    const handleAddSave = async (e) => {
        e.preventDefault();
        if (!addRowData.password) {
            setSnackbar({ open: true, message: 'Password is required.', severity: 'error' });
            return;
        }
        if (!addRowData.emailPrefix || !addRowData.domain) {
            setSnackbar({ open: true, message: 'Email prefix and client name are required (which derives domain).', severity: 'error' });
            return;
        }
        const email = `${addRowData.emailPrefix}@${addRowData.domain}`;
        if (!addRowData.clientname) {
             setSnackbar({ open: true, message: 'Client Name is required.', severity: 'error' });
            return;
        }

        try {
            const payload = {
                email,
                password: addRowData.password,
                role: addRowData.role,
                client_name: addRowData.clientname,
                asset_id: addRowData.asset_id,
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
        setEditRowId(userToEdit.uid);
        setEditRowData({ password: '', asset_id: userToEdit.asset_id || '', showPasswordField: false });
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
            const payload = {};
            if (editRowData.showPasswordField && editRowData.password) payload.password = editRowData.password;
            if (editRowData.asset_id !== undefined) payload.asset_id = editRowData.asset_id;

            if (Object.keys(payload).length === 0) {
                setEditRowId(null);
                setSnackbar({ open: true, message: 'No changes to save.', severity: 'info' });
                return;
            }

            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update user');
            }
            setEditRowId(null);
            setEditRowData({ password: '', asset_id: '', showPasswordField: false });
            setSnackbar({ open: true, message: 'User updated successfully.', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ password: '', asset_id: '', showPasswordField: false });
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
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-white shadow-sm rounded-lg animate-fade-in">
            <h2 className="user-mgmt-title compact-ui" style={{ marginBottom: 0 }}>User Management</h2>
            <Box display="flex" alignItems="center" gap={1} mb={0} className="compact-ui" justifyContent="flex-end">
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
                        <Button
                            className="compact-ui"
                            variant="contained"
                            size="small"
                            sx={{ fontSize: '0.6rem', minHeight: 20, height: 20, px: 1, py: 0, borderRadius: 1, lineHeight: 1, width: '100%', visibility: 'hidden' }}
                            disabled
                        >
                            Add User
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Collapse component wraps the add user form */}
            <Collapse in={addMode} timeout={400} unmountOnExit> {/* cite: 1, 4 */}
                <Box mb={1} p={1} borderRadius={2} border={1} borderColor="grey.200" bgcolor="grey.50" className="compact-ui">
                    <form onSubmit={handleAddSave}>
                        <Box display="flex" gap={1} alignItems="center" flexWrap="nowrap" justifyContent="space-between">
                            <Autocomplete
                                options={clients.map(c => c['Client name'])}
                                value={addRowData.clientname || null}
                                onChange={handleAddClientChange}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Client Name"
                                        size="small"
                                        required
                                        sx={{ minWidth: 80, maxWidth: 140, height: 28, flex: 1, '.MuiInputBase-root': { height: 28, minHeight: 28, maxHeight: 28, p: 0 }, '.MuiInputBase-input': { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                        inputProps={{ ...params.inputProps, style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                        placeholder="Client Name"
                                    />
                                )}
                                sx={{ minWidth: 80, maxWidth: 140, height: 28, flex: 1, p: 0, m: 0, alignItems: 'center', display: 'flex' }}
                                slotProps={{
                                    popper: { sx: { '& .MuiAutocomplete-option': { fontSize: '0.65rem', minHeight: 28, height: 28 } } }
                                }}
                            />
                            <TextField
                                className="compact-ui"
                                label="Email"
                                name="emailPrefix"
                                value={addRowData.emailPrefix || ''}
                                onChange={e => setAddRowData(prev => ({ ...prev, emailPrefix: e.target.value }))}
                                required
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Email Prefix"
                                sx={{ minWidth: 120, maxWidth: 180, height: 28, flex: 1, '.MuiInputBase-root': { height: 28 } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end" sx={{ fontSize: '0.65rem', color: '#888', ml: 0 }}>
                                            <span style={{ fontSize: '0.65rem' }}>{addRowData.domain ? `@${addRowData.domain}` : '@xyz.com'}</span>
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
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Password"
                                sx={{ minWidth: 80, maxWidth: 140, height: 28, flex: 1, '.MuiInputBase-root': { height: 28 } }}
                            />
                            <TextField
                                className="compact-ui"
                                label="Asset ID"
                                name="asset_id"
                                value={addRowData.asset_id}
                                onChange={handleAddChange}
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Asset ID"
                                sx={{ minWidth: 80, maxWidth: 140, height: 28, flex: 1, '.MuiInputBase-root': { height: 28 } }}
                            />

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
                                    ml: 'auto'
                                }}
                            >
                                CANCEL
                            </Button>
                            <Button
                                className="compact-ui"
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="small"
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
                        </Box>
                    </form>
                </Box>
            </Collapse> {/* End Collapse component */}

            {clientOrder.length === 0 && !loading && !error && (
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                    No user profiles found.
                </Typography>
            )}
            {clientOrder.map((client) => (
                <Box key={client} mb={3}>
                    <Typography variant="subtitle2" sx={{ color: '#174ea6', fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', letterSpacing: 0.5, mb: 0.5 }}>
                        {client} ({groupedUsers[client].length} user{groupedUsers[client].length !== 1 ? 's' : ''})
                    </Typography>
                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, boxShadow: 'none', marginTop: 0 }}>
                        <Table
                            size="small"
                            sx={{
                                '& .MuiTableCell-root': { fontSize: '0.68rem', padding: '2px 6px', height: 28 },
                                '& .MuiTableRow-root': { height: 28 },
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                            }}
                        >
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 36, minWidth: 36, maxWidth: 36, textAlign: 'center' }}>#</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 180, minWidth: 140, maxWidth: 220 }}>Email</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 70, minWidth: 60, maxWidth: 90 }}>Role</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 120, minWidth: 100, maxWidth: 160 }}>Domain</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 140, minWidth: 100, maxWidth: 180 }}>Client Name</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 100, minWidth: 80, maxWidth: 140 }}>Password</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: 100, minWidth: 80, maxWidth: 140 }}>Asset ID</TableCell>
                                    <TableCell align="right" sx={{ borderBottom: '1px solid #e0e0e0', width: 90, minWidth: 70, maxWidth: 120 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {groupedUsers[client].sort((a, b) => a.email.localeCompare(b.email)).map((u, i) => (
                                    <TableRow key={u.uid} sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', textAlign: 'center', fontWeight: 500, color: '#888', width: 36, minWidth: 36, maxWidth: 36 }}>
                                            {i + 1}
                                        </TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 180, minWidth: 140, maxWidth: 220 }}>{u.email}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 70, minWidth: 60, maxWidth: 90 }}>
                                            <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : u.role === 'support' ? 'secondary' : 'default'} sx={{ fontSize: '0.68rem', height: 20 }} />
                                        </TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 120, minWidth: 100, maxWidth: 160 }}>
                                            <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleGoToClientPage('domain', u.domain)} title={`Go to client management filtered by domain: ${u.domain}`}>{u.domain}</span>
                                        </TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 140, minWidth: 100, maxWidth: 180 }}>
                                            <span style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => handleGoToClientPage('client', u.clientname)} title={`Go to client management filtered by client: ${u.clientname}`}>{u.clientname}</span>
                                        </TableCell>
                                        {editRowId === u.uid ? (
                                            <>
                                                <TableCell
                                                    sx={{
                                                        borderRight: '1px solid #e0e0e0',
                                                        borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0',
                                                        width: 100,
                                                        minWidth: 80,
                                                        maxWidth: 140,
                                                        backgroundColor: editRowData.showPasswordField ? '#f0faff' : 'inherit',
                                                    }}
                                                >
                                                    {!editRowData.showPasswordField ? (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={handleTogglePasswordField}
                                                            startIcon={<VpnKeyIcon sx={{ fontSize: '0.8rem' }} />}
                                                            sx={{ fontSize: '0.6rem', height: 20, minWidth: 'auto', padding: '2px 4px' }}
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
                                                            sx={{ width: '100%' }}
                                                            placeholder="Enter new password"
                                                            InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                            inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    sx={{
                                                        borderRight: '1px solid #e0e0e0',
                                                        borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0',
                                                        width: 100,
                                                        minWidth: 80,
                                                        maxWidth: 140,
                                                        backgroundColor: editRowId === u.uid ? '#f0faff' : 'inherit',
                                                    }}
                                                >
                                                    <TextField
                                                        name="asset_id"
                                                        label="Asset ID"
                                                        value={editRowData.asset_id}
                                                        onChange={handleEditChange}
                                                        size="small"
                                                        sx={{ width: '100%' }}
                                                        InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                        inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 90, minWidth: 70, maxWidth: 120 }}>
                                                    <IconButton onClick={() => handleEditSave(u.uid)} size="small"><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                    <IconButton onClick={handleEditCancel} size="small"><ClearIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 100, minWidth: 80, maxWidth: 140 }}>••••••</TableCell>
                                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 100, minWidth: 80, maxWidth: 140 }}>{u.asset_id}</TableCell>
                                                <TableCell align="right" sx={{ borderBottom: i === groupedUsers[client].length - 1 ? '0' : '1px solid #e0e0e0', width: 90, minWidth: 70, maxWidth: 120 }}>
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