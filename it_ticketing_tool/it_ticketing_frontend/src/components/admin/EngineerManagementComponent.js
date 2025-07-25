// src/components/admin/EngineerManagementComponent.js

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Snackbar, Alert, Typography, Popover,
    MenuItem
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Clear as ClearIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { API_BASE_URL } from '../../config/constants';
import './UserManagementComponent.css'; // Keep existing CSS if it doesn't conflict
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';

const initialUserState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
  asset_id: '',
  employeeid: '',
  role: 'support',
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
    const [editRowData, setEditRowData] = useState({ firstName: '', lastName: '', email: '', contactNumber: '', managerEmail: '', employmentType: '', designation: '', asset_id: '', employeeid: '', role: 'support' });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const navigate = useNavigate();

    const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
    const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
    const userToDeleteUidRef = useRef(null);
    const anchorEl = useRef(null);

    // Add state for password reset modal
    const [pwdUserId, setPwdUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [changePwdModalOpen, setChangePwdModalOpen] = useState(false);

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

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchClients();
        const fetchEngineers = async () => {
            try {
                // Get user's ID token for authentication
                const idToken = await user.firebaseUser.getIdToken();
                
                const res = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch users');
                const data = await res.json();
                setUsers(data.filter(u => u.role === 'support'));
                setLoading(false);
            } catch (err) {
                console.error('Error fetching engineers:', err);
                // For testing, you can uncomment the next line to show mock data
                // setUsers([{ uid: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', role: 'support', designation: 'Engineer', employeeid: 'EMP001', asset_id: 'AST001', contactNumber: '1234567890', managerEmail: 'manager@example.com' }]);
                setError('Could not load engineers. Please check if the backend server is running and Firebase is configured.');
                setUsers([]);
                setLoading(false);
            }
        };
        fetchEngineers();
    }, [fetchClients, user]);

    function generatePassword(length = 10) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    const handleAdd = () => {
        setAddMode(true);
        setAddRowData({ ...initialUserState, password: generatePassword() });
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
        const requiredFields = ['firstName', 'lastName', 'email', 'password', 'contactNumber', 'managerEmail', 'employmentType', 'designation', 'asset_id', 'employeeid'];
        for (const field of requiredFields) {
            if (!addRowData[field]) {
                setSnackbar({ open: true, message: 'All fields are required.', severity: 'error' });
                return;
            }
        }
        try {
            const payload = {
                name: `${addRowData.firstName} ${addRowData.lastName}`.trim(),
                email: addRowData.email,
                password: addRowData.password,
                asset_id: addRowData.asset_id,
                employeeid: addRowData.employeeid,
                designation: addRowData.designation,
                contactNumber: addRowData.contactNumber,
                managerEmail: addRowData.managerEmail,
                employmentType: addRowData.employmentType,
                firstName: addRowData.firstName,
                lastName: addRowData.lastName,
                role: 'support',
            };
            // Get user's ID token for authentication
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
                throw new Error(errData.error || 'Failed to add engineer');
            }
            setAddMode(false);
            setSnackbar({ open: true, message: 'Engineer added successfully.', severity: 'success' });
            const fetchEngineers = async () => {
                try {
                    // Get user's ID token for authentication
                    const idToken = await user.firebaseUser.getIdToken();
                    
                    const res = await fetch(`${API_BASE_URL}/api/users`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
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
        setEditRowData({
            firstName: userToEdit.firstName || (userToEdit.name ? userToEdit.name.split(' ')[0] : ''),
            lastName: userToEdit.lastName || (userToEdit.name ? userToEdit.name.split(' ').slice(1).join(' ') : ''),
            email: userToEdit.email || '',
            contactNumber: userToEdit.contactNumber || '',
            managerEmail: userToEdit.managerEmail || '',
            employmentType: userToEdit.employmentType || '',
            designation: userToEdit.designation || '',
            asset_id: userToEdit.asset_id || '',
            employeeid: userToEdit.employeeid || '',
            role: userToEdit.role || 'support'
        });
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditRowData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSave = async (uid) => {
        try {
            const payload = {};
            const originalUser = users.find(u => u.uid === uid);

            // Check for changes in each field
            if (editRowData.firstName !== (originalUser?.firstName || '')) {
                payload.firstName = editRowData.firstName;
            }
            if (editRowData.lastName !== (originalUser?.lastName || '')) {
                payload.lastName = editRowData.lastName;
            }
            if (editRowData.email !== (originalUser?.email || '')) {
                payload.email = editRowData.email;
            }
            if (editRowData.contactNumber !== (originalUser?.contactNumber || '')) {
                payload.contactNumber = editRowData.contactNumber;
            }
            if (editRowData.managerEmail !== (originalUser?.managerEmail || '')) {
                payload.managerEmail = editRowData.managerEmail;
            }
            if (editRowData.employmentType !== (originalUser?.employmentType || '')) {
                payload.employmentType = editRowData.employmentType;
            }
            if (editRowData.designation !== (originalUser?.designation || '')) {
                payload.designation = editRowData.designation;
            }
            if (editRowData.asset_id !== (originalUser?.asset_id || '')) {
                payload.asset_id = editRowData.asset_id;
            }
            if (editRowData.employeeid !== (originalUser?.employeeid || '')) {
                payload.employeeid = editRowData.employeeid;
            }

            if (Object.keys(payload).length === 0) {
                setEditRowId(null);
                setSnackbar({ open: true, message: 'No changes to save.', severity: 'info' });
                return;
            }

            // Get user's ID token for authentication
            const idToken = await user.firebaseUser.getIdToken();
            
            const res = await fetch(`${API_BASE_URL}/api/users/${uid}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update engineer');
            }
            setEditRowId(null);
            setEditRowData({ firstName: '', lastName: '', email: '', contactNumber: '', managerEmail: '', employmentType: '', designation: '', asset_id: '', employeeid: '', role: 'support' });
            setSnackbar({ open: true, message: 'Engineer updated successfully.', severity: 'success' });
            const fetchEngineers = async () => {
                try {
                    // Get user's ID token for authentication
                    const idToken = await user.firebaseUser.getIdToken();
                    
                    const res = await fetch(`${API_BASE_URL}/api/users`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
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
        setEditRowData({ firstName: '', lastName: '', email: '', contactNumber: '', managerEmail: '', employmentType: '', designation: '', asset_id: '', employeeid: '', role: 'support' });
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
            // Get user's ID token for authentication
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
                throw new Error(errData.error || 'Failed to delete engineer');
            }
            setSnackbar({ open: true, message: 'Engineer deleted successfully.', severity: 'success' });
            userToDeleteUidRef.current = null;
            setCurrentUserEmailToDelete('');
            const fetchEngineers = async () => {
                try {
                    // Get user's ID token for authentication
                    const idToken = await user.firebaseUser.getIdToken();
                    
                    const res = await fetch(`${API_BASE_URL}/api/users`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
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
            // Get user's ID token for authentication
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
            setSnackbar({ open: true, message: 'Password updated successfully.', severity: 'success' });
            closeChangePwdModal();
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.role === 'support' &&
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
             (u.employeeid && u.employeeid.toLowerCase().includes(search.toLowerCase())) ||
             (u.designation && u.designation.toLowerCase().includes(search.toLowerCase())) ||
             (u.asset_id && u.asset_id.toLowerCase().includes(search.toLowerCase())) ||
             (u.joined_date && u.joined_date.toLowerCase().includes(search.toLowerCase())))
        );
    }, [users, search]);

    return (
        <div className="w-full h-full rounded-lg animate-fade-in" style={{ width: '100%', boxSizing: 'border-box' }}>
            <h2 className="user-mgmt-title compact-ui">Engineer Management</h2>
            
            {loading && (
                <Typography variant="body1" color="textSecondary" align="center" sx={{ mt: 4 }}>
                    Loading engineers...
                </Typography>
            )}
            
            {error && (
                <Typography variant="body1" color="error" align="center" sx={{ mt: 4 }}>
                    {error}
                </Typography>
            )}
            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1} mb={2} px={2}>
                <Box>
                    <TextField
                        className="compact-ui"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search engineers..."
                        size="small"
                        sx={{ width: 260, minWidth: 180, minHeight: 24 }}
                        InputProps={{
                            endAdornment: (
                                <>
                                    <IconButton size="small" onClick={() => {}} sx={{ fontSize: 16, p: 0.25 }}>
                                        <SearchIcon fontSize="inherit" />
                                    </IconButton>
                                    {search ? (
                                        <IconButton size="small" onClick={() => setSearch('')} sx={{ fontSize: 16, p: 0.25 }}>
                                            <ClearIcon fontSize="inherit" />
                                        </IconButton>
                                    ) : null}
                                </>
                            ),
                            style: { height: 32, display: 'flex', alignItems: 'center', minHeight: 24, lineHeight: 1, fontSize: '0.65rem' },
                            inputProps: { style: { height: 24, padding: '0 8px', display: 'flex', alignItems: 'center', minHeight: 24, lineHeight: 1, fontSize: '0.65rem' } }
                        }}
                    />
                </Box>
                <Box>
                    <Button
                        className="compact-ui"
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleAdd}
                        size="small"
                        sx={{ fontSize: '0.65rem', minHeight: 24, px: 1, borderRadius: 1, lineHeight: 1, minWidth: 90 }}
                    >
                        Add Engineer
                    </Button>
                </Box>
            </Box>
            <Modal isOpen={addMode} onClose={handleAddCancel} title="Add Engineer">
                <form onSubmit={handleAddSave}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2} p={2}>
                        <TextField label="First Name" name="firstName" value={addRowData.firstName} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Last Name" name="lastName" value={addRowData.lastName} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Email" name="email" value={addRowData.email} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Password" name="password" value={addRowData.password} InputProps={{ readOnly: true }} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Contact Number" name="contactNumber" value={addRowData.contactNumber} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Manager Email" name="managerEmail" value={addRowData.managerEmail} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField select label="Employment Type" name="employmentType" value={addRowData.employmentType} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        >
                            <MenuItem value="contract">Contract</MenuItem>
                            <MenuItem value="permanent">Permanent</MenuItem>
                            <MenuItem value="intern">Intern</MenuItem>
                        </TextField>
                        <TextField label="Designation" name="designation" value={addRowData.designation} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Asset ID" name="asset_id" value={addRowData.asset_id} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Employee ID" name="employeeid" value={addRowData.employeeid} onChange={handleAddChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                    </Box>
                    <Box display="flex" justifyContent="flex-end" gap={1} p={2}>
                        <Button onClick={handleAddCancel} color="inherit" size="small" variant="text" sx={{ fontSize: '0.75rem' }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary" size="small" sx={{ fontSize: '0.75rem' }}>
                            Save
                        </Button>
                    </Box>
                </form>
            </Modal>
            {!loading && !error && (
                <TableContainer
                    component={Paper}
                    sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        boxShadow: 'none',
                        my: 2,
                        mx: 'auto',
                        width: 'calc(100% - 32px)', // Adjusted width for better spacing
                        maxWidth: '1200px',
                        overflowX: 'auto',
                    }}
                >
                    <Table
                        size="small"
                        sx={{
                            '& .MuiTableCell-root': { fontSize: '0.75rem', padding: '6px 8px', height: 32 },
                            '& .MuiTableRow-root': { height: 32 },
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            tableLayout: 'auto',
                            minWidth: '800px',
                        }}
                    >
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', textAlign: 'center', width: '4%' }}>#</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>First Name</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Last Name</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Employee ID</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '12%' }}>Designation</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '20%' }}>Email</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Contact Number</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Manager Email</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '8%' }}>Role</TableCell>
                                <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', width: '10%' }}>Asset ID</TableCell>
                                <TableCell align="right" sx={{ borderBottom: '1px solid #e0e0e0', width: '10%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No engineer profiles found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.sort((a, b) => a.email.localeCompare(b.email)).map((u, i) => (
                                    <TableRow key={u.id || u.uid} sx={{ '&:last-child td, &:last-child th': { borderBottom: 0 } }}>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0', textAlign: 'center', fontWeight: 500, color: '#888' }}>{i + 1}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.firstName || (u.name ? u.name.split(' ')[0] : '')}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : '')}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.employeeid}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.designation}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.email}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.contactNumber}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.managerEmail}</TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                            <Chip label={u.role} size="small" color={u.role === 'admin' ? 'primary' : u.role === 'support' ? 'secondary' : 'default'} sx={{ fontSize: '0.7rem', height: 20 }} />
                                        </TableCell>
                                        <TableCell sx={{ borderRight: '1px solid #e0e0e0', borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>{u.asset_id}</TableCell>
                                        <TableCell align="right" sx={{ borderBottom: i === filteredUsers.length - 1 ? '0' : '1px solid #e0e0e0' }}>
                                            <IconButton onClick={() => openChangePwdModal(u.uid)} size="small" title="Reset Password"><LockResetIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                            <IconButton onClick={() => handleEditClick(u)} size="small" sx={{ p: 0.5 }}><EditIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                            <IconButton onClick={(event) => handleDeleteClick(event, u.id || u.uid, u.email)} size="small" sx={{ p: 0.5 }}><DeleteIcon sx={{ fontSize: '1rem' }} /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
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
                        p: 1,
                        minWidth: 180,
                        maxWidth: 240,
                        boxShadow: 3,
                        borderRadius: 1,
                    }
                }}
            >
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Delete "<strong>{currentUserEmailToDelete}</strong>"? This cannot be undone.
                </Typography>
                <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button onClick={handleCancelDelete} size="small" variant="outlined" color="inherit" sx={{ fontSize: '0.7rem' }}>
                        No
                    </Button>
                    <Button onClick={handleConfirmDelete} size="small" variant="contained" color="primary" autoFocus sx={{ fontSize: '0.7rem' }}>
                        Yes
                    </Button>
                </Box>
            </Popover>
            {/* Edit Engineer Modal */}
            <Modal isOpen={editRowId !== null} onClose={handleEditCancel} title="Edit Engineer">
                <form onSubmit={(e) => handleEditSave(editRowId)}>
                    <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2} p={2}>
                        <TextField label="First Name" name="firstName" value={editRowData.firstName || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Last Name" name="lastName" value={editRowData.lastName || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Email" name="email" value={editRowData.email || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Contact Number" name="contactNumber" value={editRowData.contactNumber || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Manager Email" name="managerEmail" value={editRowData.managerEmail || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField select label="Employment Type" name="employmentType" value={editRowData.employmentType || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        >
                            <MenuItem value="contract">Contract</MenuItem>
                            <MenuItem value="permanent">Permanent</MenuItem>
                            <MenuItem value="intern">Intern</MenuItem>
                        </TextField>
                        <TextField label="Designation" name="designation" value={editRowData.designation || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Asset ID" name="asset_id" value={editRowData.asset_id || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <TextField label="Employee ID" name="employeeid" value={editRowData.employeeid || ''} onChange={handleEditChange} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                    </Box>
                    <Box display="flex" justifyContent="flex-end" gap={1} p={2}>
                        <Button onClick={handleEditCancel} color="inherit" size="small" variant="text" sx={{ fontSize: '0.75rem' }}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" color="primary" size="small" sx={{ fontSize: '0.75rem' }}>
                            Save
                        </Button>
                    </Box>
                </form>
            </Modal>
            {/* Password Reset Modal */}
            <Modal isOpen={changePwdModalOpen} onClose={closeChangePwdModal} title="Reset Password">
                <form onSubmit={handleChangePassword}>
                    <Box display="flex" flexDirection="column" gap={2} p={2}>
                        <TextField label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required size="small" fullWidth
                            InputLabelProps={{ style: { fontSize: '0.75rem' } }}
                            inputProps={{ style: { fontSize: '0.75rem', height: 28, padding: '2px 6px' } }}
                        />
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                            <Button onClick={closeChangePwdModal} color="inherit" size="small" variant="text" sx={{ fontSize: '0.75rem' }}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="contained" color="primary" size="small" sx={{ fontSize: '0.75rem' }}>
                                Save
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Modal>
        </div>
    );
};

export default EngineerManagementComponent;