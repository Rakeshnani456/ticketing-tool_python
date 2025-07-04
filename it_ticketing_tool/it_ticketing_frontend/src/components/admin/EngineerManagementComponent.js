// src/components/admin/EngineerManagementComponent.js

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Snackbar, Alert, Typography, Popover,
    Collapse
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css'; // Keep existing CSS if it doesn't conflict
import { useNavigate } from 'react-router-dom';
import InputAdornment from '@mui/material/InputAdornment';

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
  name: '',
  employeeid: '',
  designation: '',
  email: '',
  emailPrefix: '',
  password: '',
  role: 'support',
  asset_id: '',
  joined_date: '',
};

const EngineerManagementComponent = ({ user, showFlashMessage }) => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [addMode, setAddMode] = useState(false);
    const [addRowData, setAddRowData] = useState(initialUserState);
    const [editRowId, setEditRowId] = useState(null);
    const [editRowData, setEditRowData] = useState({ name: '', asset_id: '', joined_date: '', role: '' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();

    const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
    const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
    const userToDeleteUidRef = useRef(null);
    const anchorEl = useRef(null);

    const fetchClients = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/clients`);
            if (!res.ok) throw new Error('Failed to fetch clients');
            const data = await res.json();
            // Only update if data is different to prevent unnecessary re-renders
            if (JSON.stringify(clients) !== JSON.stringify(data)) {
                setClients(data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    }, [clients]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchClients();
        const fetchEngineers = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/users`);
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                // Only keep users with role 'support'
                setUsers(data.filter(u => u.role === 'support'));
                setLoading(false);
            } catch (err) {
                setError('Could not load engineers.');
                setUsers([]);
                setLoading(false);
            }
        };
        fetchEngineers();
    }, [fetchClients]);

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
        if (!addRowData.name || !addRowData.employeeid || !addRowData.designation || !addRowData.emailPrefix || !addRowData.asset_id || !addRowData.joined_date) {
            setSnackbar({ open: true, message: 'All fields are required.', severity: 'error' });
            return;
        }
        let email = `${addRowData.emailPrefix.trim()}@kriasol.com`;
        try {
            const payload = {
                name: addRowData.name,
                employeeid: addRowData.employeeid,
                designation: addRowData.designation,
                email,
                password: addRowData.password,
                role: 'support',
                asset_id: addRowData.asset_id,
                joined_date: addRowData.joined_date,
            };
            const res = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to add engineer');
            }
            setAddMode(false);
            setSnackbar({ open: true, message: 'Engineer added successfully.', severity: 'success' });
            // Re-fetch engineers to update the table
            const fetchEngineers = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users`);
                    if (!res.ok) throw new Error('Failed to fetch users');
                    const data = await res.json();
                    setUsers(data.filter(u => u.role === 'support'));
                } catch (err) {
                    setError('Could not load engineers after add.');
                    setUsers([]);
                }
            };
            fetchEngineers();
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
        // Initialize editRowData with current user's values
        setEditRowData({
            name: userToEdit.name || '',
            asset_id: userToEdit.asset_id || '', // Note: use 'asset_id' from fetched data
            joined_date: userToEdit.joined_date || '', // Note: use 'joined_date' from fetched data
            role: userToEdit.role || 'support',
            // Do not pre-fill password for security
            password: '',
            showPasswordField: false // Control visibility of password field
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
            const payload = {};
            const originalUser = users.find(u => u.uid === uid);

            // Compare and add to payload only if changed
            if (editRowData.name !== (originalUser?.name || '')) {
                payload.name = editRowData.name;
            }
            if (editRowData.asset_id !== (originalUser?.asset_id || '')) {
                payload.asset_id = editRowData.asset_id; // Backend expects 'asset_id'
            }
            if (editRowData.joined_date !== (originalUser?.joined_date || '')) {
                payload.joined_date = editRowData.joined_date; // Backend expects 'joined_date'
            }
            if (editRowData.showPasswordField && editRowData.password) {
                payload.password = editRowData.password;
            }

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
                throw new Error(errData.error || 'Failed to update engineer');
            }
            setEditRowId(null);
            setEditRowData({ name: '', asset_id: '', joined_date: '', role: '', password: '', showPasswordField: false }); // Reset edit data
            setSnackbar({ open: true, message: 'Engineer updated successfully.', severity: 'success' });
            // Re-fetch engineers to reflect changes
            const fetchEngineers = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users`);
                    if (!res.ok) throw new Error('Failed to fetch users');
                    const data = await res.json();
                    setUsers(data.filter(u => u.role === 'support'));
                } catch (err) {
                    setError('Could not load engineers after update.');
                    setUsers([]);
                }
            };
            fetchEngineers();
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const handleEditCancel = () => {
        setEditRowId(null);
        setEditRowData({ name: '', asset_id: '', joined_date: '', role: '', password: '', showPasswordField: false });
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
                throw new Error(errData.error || 'Failed to delete engineer');
            }
            setSnackbar({ open: true, message: 'Engineer deleted successfully.', severity: 'success' });
            userToDeleteUidRef.current = null;
            setCurrentUserEmailToDelete('');
            // Re-fetch engineers to reflect deletion
            const fetchEngineers = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users`);
                    if (!res.ok) throw new Error('Failed to fetch users');
                    const data = await res.json();
                    setUsers(data.filter(u => u.role === 'support'));
                } catch (err) {
                    setError('Could not load engineers after deletion.');
                    setUsers([]);
                }
            };
            fetchEngineers();
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
            u.role === 'support' &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
             (u.employeeid && u.employeeid.toLowerCase().includes(search.toLowerCase())) ||
             (u.designation && u.designation.toLowerCase().includes(search.toLowerCase())) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) || // Use u.asset_id
             (u.joined_date && u.joined_date.toLowerCase().includes(search.toLowerCase()))) // Use u.joined_date
        );
    }, [users, search]);

    return (
        // Main container div for full width and height, with overflow-y to allow page scroll
        <div className="w-full h-full rounded-lg animate-fade-in"
            style={{
                width: '100%',
                // Removed maxWidth and margin: '0 auto' from here
                boxSizing: 'border-box',
                 // Add this to allow horizontal scroll for the whole component if needed
            }}
        >
            <h2 className="user-mgmt-title compact-ui" style={{ marginBottom: 0, }}>Engineer Management</h2>
            {/* The search and add button bar needs to be centered as well,
                so we'll wrap it in a Box with maxWidth and margin: auto. */}
            <Box
                display="flex"
                alignItems="center"
                gap={1}
                mb={0}
                className="compact-ui"
                justifyContent="flex-end"
                sx={{
                    px: 2,
                    pt: 2,
                    width: '100%',
                    maxWidth: '1000px', // Apply maxWidth here to match the table
                    margin: '0 auto',   // Center this Box
                }}
            >
                {!addMode && (
                    <TextField
                        className="compact-ui"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search engineers..."
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
                            startIcon={<AddIcon sx={{ fontSize: 10 }} />}
                            onClick={handleAdd}
                            size="small"
                            sx={{
                                fontSize: '0.30rem !important',
                                minHeight: 10,
                                height: 10,
                                px: 0.6,
                                py: 0,
                                borderRadius: 1,
                                lineHeight: 1,
                                width: '100%',
                                whiteSpace: 'nowrap', // Keep text on one line
                                letterSpacing: 0.01
                            }}
                        >
                            Add Engineer
                        </Button>
                    ) : (
                        <Button
                            className="compact-ui"
                            variant="contained"
                            size="small"
                            sx={{
                                fontSize: '0.30rem !important',
                                minHeight: 10,
                                height: 10,
                                px: 0.6,
                                py: 0,
                                borderRadius: 1,
                                lineHeight: 1,
                                width: '100%',
                                whiteSpace: 'nowrap', // Keep text on one line
                                letterSpacing: 0.01
                            }}
                            disabled
                        >
                            Add Engineer
                        </Button>
                    )}
                </Box>
            </Box>
            {/* Collapse component wraps the add engineer form */}
            <Collapse in={addMode} timeout={400} unmountOnExit>
                <Box
                    mb={1}
                    p={1}
                    borderRadius={2}
                    border={1}
                    borderColor="grey.200"
                    bgcolor="grey.50"
                    className="compact-ui"
                    sx={{
                        width: '100%',
                        maxWidth: '1000px', // Apply maxWidth here to match the table
                        margin: '0 auto',   // Center this Box
                        px: 2, // Keep padding inside the centered box
                    }}
                >
                    <form onSubmit={handleAddSave}>
                        {/* Changed flexWrap to 'wrap' to allow items to wrap onto the next line if space is limited */}
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="space-between">
                            <TextField
                                className="compact-ui"
                                label="Name"
                                name="name"
                                value={addRowData.name}
                                onChange={handleAddChange}
                                required
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Name"
                                sx={{ flex: '1 1 auto', minWidth: '120px', maxWidth: { xs: '100%', sm: 'calc(33% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
                            />
                            <TextField
                                className="compact-ui"
                                label="Employee ID"
                                name="employeeid"
                                value={addRowData.employeeid}
                                onChange={handleAddChange}
                                required
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Employee ID"
                                sx={{ flex: '1 1 auto', minWidth: '100px', maxWidth: { xs: '100%', sm: 'calc(33% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
                            />
                            <TextField
                                className="compact-ui"
                                label="Designation"
                                name="designation"
                                value={addRowData.designation}
                                onChange={handleAddChange}
                                required
                                size="small"
                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Designation"
                                sx={{ flex: '1 1 auto', minWidth: '100px', maxWidth: { xs: '100%', sm: 'calc(33% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
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
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Email Prefix"
                                sx={{ flex: '1 1 auto', minWidth: '140px', maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end" className="email-suffix-adornment">
                                            <Typography variant="caption" sx={{ fontSize: '0.45rem', whiteSpace: 'nowrap', pr: 0.5 }}>
                                                @kriasol.com
                                            </Typography>
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
                                sx={{ flex: '1 1 auto', minWidth: '120px', maxWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
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
                                sx={{ flex: '1 1 auto', minWidth: '80px', maxWidth: { xs: '100%', sm: 'calc(33% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
                            />
                            <TextField
                                className="compact-ui"
                                label="Joined Date"
                                name="joined_date"
                                type="date"
                                value={addRowData.joined_date}
                                onChange={handleAddChange}
                                required
                                size="small"
                                InputLabelProps={{ shrink: true, style: { fontSize: '0.65rem' } }}
                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                placeholder="Joined Date"
                                sx={{ flex: '1 1 auto', minWidth: '120px', maxWidth: { xs: '100%', sm: 'calc(33% - 8px)', md: 'calc(20% - 8px)' }, height: 28, '.MuiInputBase-root': { height: 28 } }}
                            />
                            <Button
                                className="compact-ui"
                                onClick={handleAddCancel}
                                color="inherit"
                                size="small"
                                sx={{
                                    height: 24,
                                    minWidth: 'auto', // Adjusted from 32
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
                                    minWidth: 'auto', // Adjusted from 32
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
            </Collapse>
            {/* Single table for all engineers */}
            {filteredUsers.length === 0 && !loading && !error && (
                <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{
                        mt: 2,
                        px: 2,
                        width: '100%',
                        maxWidth: '1000px', // Apply maxWidth here to match the table
                        margin: '0 auto',   // Center this Typography
                    }}
                >
                    No engineer profiles found.
                </Typography>
            )}
            {filteredUsers.length > 0 && (
                // Added overflowX: 'auto' to ensure horizontal scroll when content overflows
                <TableContainer
                    component={Paper}
                    sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        boxShadow: 'none',
                        mt: 2, // Changed from marginTop: 0 to mt: 2
                        margin: '0 auto', // This will center the TableContainer
                        mb: 2,
                        width: '100%',
                        maxWidth: '1000px', // Set desired max width for the table
                        overflowX: 'auto',
                    }}
                >
                    <Table
                        size="small"
                        sx={{
                            '& .MuiTableCell-root': { fontSize: '0.68rem', padding: '2px 6px', height: 28 },
                            '& .MuiTableRow-root': { height: 28 },
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            tableLayout: 'auto', // Changed to 'auto' to allow columns to adjust
                            width: '100%',
                            minWidth: '700px', // A minimum width for the table to prevent excessive squishing
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', textAlign: 'center', width: '4%' }}>#</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '14%' }}>Name</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '12%' }}>Employee ID</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '12%' }}>Designation</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '18%' }}>Email</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '8%' }}>Role</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Asset ID</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Joined Date</TableCell>
                                <TableCell align="right" sx={{ borderBottom: '1px solid #e0e0e0', width: '12%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.sort((a, b) => a.email.localeCompare(b.email)).map((u, i) => (
                                <TableRow key={u.id || u.uid} sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0', textAlign: 'center', fontWeight: 500, color: '#888' }}>
                                        {i + 1}
                                    </TableCell>
                                    {editRowId === u.uid ? (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                            <TextField
                                                className="compact-ui"
                                                label="Name"
                                                name="name"
                                                value={editRowData.name}
                                                onChange={handleEditChange}
                                                required
                                                size="small"
                                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                                placeholder="Name"
                                                sx={{ width: '100%', '.MuiInputBase-root': { height: 28 } }}
                                            />
                                        </TableCell>
                                    ) : (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.name}</TableCell>
                                    )}
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.employeeid}</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.designation}</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.email}</TableCell>
                                    <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                        <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : u.role === 'support' ? 'secondary' : 'default'} sx={{ fontSize: '0.68rem', height: 20 }} />
                                    </TableCell>
                                    {editRowId === u.uid ? (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                            <TextField
                                                className="compact-ui"
                                                label="Asset ID"
                                                name="asset_id"
                                                value={editRowData.asset_id}
                                                onChange={handleEditChange}
                                                size="small"
                                                InputLabelProps={{ style: { fontSize: '0.65rem' } }}
                                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                                placeholder="Asset ID"
                                                sx={{ width: '100%', '.MuiInputBase-root': { height: 28 } }}
                                            />
                                        </TableCell>
                                    ) : (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.asset_id}</TableCell>
                                    )}
                                    {editRowId === u.uid ? (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                            <TextField
                                                className="compact-ui"
                                                label="Joined Date"
                                                name="joined_date"
                                                type="date"
                                                value={editRowData.joined_date}
                                                onChange={handleEditChange}
                                                required
                                                size="small"
                                                InputLabelProps={{ shrink: true, style: { fontSize: '0.65rem' } }}
                                                inputProps={{ style: { fontSize: '0.65rem', height: 28, minHeight: 28, maxHeight: 28, padding: '2px 6px' } }}
                                                placeholder="Joined Date"
                                                sx={{ width: '100%', '.MuiInputBase-root': { height: 28 } }}
                                            />
                                        </TableCell>
                                    ) : (
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.joined_date}</TableCell>
                                    )}
                                    <TableCell align="right" sx={{ borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                        {editRowId === u.uid ? (
                                            <Box display="flex" justifyContent="flex-end" gap={0.5}>
                                                <Button
                                                    onClick={() => handleEditSave(u.uid)}
                                                    size="small"
                                                    variant="contained"
                                                    color="primary"
                                                    sx={{ fontSize: '0.6rem', padding: '2px 5px', minWidth: 'auto' }}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    onClick={handleEditCancel}
                                                    size="small"
                                                    variant="outlined"
                                                    color="inherit"
                                                    sx={{ fontSize: '0.6rem', padding: '2px 5px', minWidth: 'auto' }}
                                                >
                                                    Cancel
                                                </Button>
                                            </Box>
                                        ) : (
                                            <>
                                                <IconButton onClick={() => handleEditClick(u)} size="small"><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                                <IconButton
                                                    onClick={(event) => handleDeleteClick(event, u.id || u.uid, u.email)}
                                                    size="small"
                                                >
                                                    <DeleteIcon sx={{ fontSize: '1rem' }} />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
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

export default EngineerManagementComponent;