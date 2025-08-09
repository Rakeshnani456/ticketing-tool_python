// src/components/admin/EngineerManagementComponent.js
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Snackbar, Alert, Typography, Popover, MenuItem, Tooltip, TablePagination, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  Clear as ClearIcon, 
  LockReset as LockResetIcon, 
  Search as SearchIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Phone as PhoneIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  AdminPanelSettings as AdminIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/constants';
import { useNavigate } from 'react-router-dom';

const initialUserState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
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
  const [editRowData, setEditRowData] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    contactNumber: '', 
    managerEmail: '', 
    employmentType: '', 
    designation: '', 
    employeeid: '', 
    role: 'support' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const [openConfirmPopover, setOpenConfirmPopover] = useState(false);
  const [currentUserEmailToDelete, setCurrentUserEmailToDelete] = useState('');
  const [userToDeleteUid, setUserToDeleteUid] = useState(null);
  const anchorEl = useRef(null);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [changePwdModalOpen, setChangePwdModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [passwordChangeNotifications, setPasswordChangeNotifications] = useState({});
  const [actionNotifications, setActionNotifications] = useState({});
  const [changePwdError, setChangePwdError] = useState('');

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
        setError('Could not load engineers. Please check if the backend server is running and Firebase is configured.');
        setUsers([]);
        setLoading(false);
      }
    };
    
    fetchEngineers();
  }, [fetchClients, user]);

  function generatePassword(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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

  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddRowData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSave = async (e) => {
    e.preventDefault();
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'contactNumber', 'managerEmail', 'employmentType', 'designation', 'employeeid'];
    
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
        employeeId: addRowData.employeeid,
        designation: addRowData.designation,
        contactNumber: addRowData.contactNumber,
        managerEmail: addRowData.managerEmail,
        employmentType: addRowData.employmentType,
        firstName: addRowData.firstName,
        lastName: addRowData.lastName,
        role: 'support',
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
        throw new Error(errData.error || 'Failed to add engineer');
      }
      
      const newEngineerData = await res.json();
      setAddMode(false);
      setSnackbar({ open: true, message: 'Engineer added successfully.', severity: 'success' });
      
      // Show inline notification for the new engineer
      if (newEngineerData && newEngineerData.uid) {
        showActionNotification(newEngineerData.uid, 'Engineer created successfully', 'success');
      }
      
      // Refresh engineers list
      const fetchEngineers = async () => {
        try {
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
      employeeid: userToEdit.employeeId || userToEdit.employeeid || '',
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
      if (editRowData.employeeid !== (originalUser?.employeeId || originalUser?.employeeid || '')) {
        payload.employeeId = editRowData.employeeid;
      }
      
      if (Object.keys(payload).length === 0) {
        setEditRowId(null);
        setSnackbar({ open: true, message: 'No changes to save.', severity: 'info' });
        return;
      }
      
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
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication failed. Please try again.');
        }
        throw new Error(errData.error || 'Failed to update engineer');
      }
      
      setEditRowId(null);
      setEditRowData({ 
        firstName: '', 
        lastName: '', 
        email: '', 
        contactNumber: '', 
        managerEmail: '', 
        employmentType: '', 
        designation: '', 
        employeeid: '', 
        role: 'support' 
      });
      
      // Show inline notification for this specific user
      showActionNotification(uid, 'Engineer updated successfully', 'success');
      
      // Refresh engineers list
      const fetchEngineers = async () => {
        try {
          const idToken = await user.firebaseUser.getIdToken();
          
          const res = await fetch(`${API_BASE_URL}/api/users`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!res.ok) {
            const errData = await res.json();
            if (res.status === 401 || res.status === 403) {
              throw new Error('Authentication failed. Please try again.');
            }
            throw new Error('Failed to fetch users');
          }
          
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
    setEditRowData({ 
      firstName: '', 
      lastName: '', 
      email: '', 
      contactNumber: '', 
      managerEmail: '', 
      employmentType: '', 
      designation: '', 
      employeeid: '', 
      role: 'support' 
    });
  };

  const handleDeleteClick = (event, uid, email) => {
    setUserToDeleteUid(uid);
    setCurrentUserEmailToDelete(email);
    anchorEl.current = event.currentTarget;
    setOpenConfirmPopover(true);
  };

  const handleConfirmDelete = async () => {
    setOpenConfirmPopover(false);
    const uid = userToDeleteUid;
    
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
        if (res.status === 401 || res.status === 403) {
          throw new Error('Authentication failed. Please try again.');
        }
        throw new Error(errData.error || 'Failed to delete engineer');
      }
      
      // Show inline notification for this specific user
      showActionNotification(uid, 'Engineer deleted successfully', 'success');
      setUserToDeleteUid(null);
      setCurrentUserEmailToDelete('');
      
      // Refresh engineers list
      const fetchEngineers = async () => {
        try {
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
    setUserToDeleteUid(null);
    setCurrentUserEmailToDelete('');
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
  };

  const isAlphanumeric = (str) => /^[a-zA-Z0-9]+$/.test(str);

  const showActionNotification = (uid, message, type = 'success') => {
    setActionNotifications(prev => ({
      ...prev,
      [uid]: {
        message,
        type,
        timestamp: Date.now()
      }
    }));
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setActionNotifications(prev => {
        const newState = { ...prev };
        delete newState[uid];
        return newState;
      });
    }, 5000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePwdError && setChangePwdError('');
    if (!newPassword || newPassword.length < 6) {
      setSnackbar({ open: true, message: 'Password must be at least 6 characters.', severity: 'error' });
      return;
    }
    if (!isAlphanumeric(newPassword)) {
      setSnackbar({ open: true, message: 'Password must contain only alphabets and numbers.', severity: 'error' });
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
      
      // Show inline notification for this specific user
      showActionNotification(pwdUserId, 'Password reset successfully', 'success');
      
      closeChangePwdModal();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to change password', severity: 'error' });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.role === 'support' &&
      (u.email.toLowerCase().includes(search.toLowerCase()) ||
       (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
       ((u.employeeId || u.employeeid) && (u.employeeId || u.employeeid).toLowerCase().includes(search.toLowerCase())) ||
       (u.designation && u.designation.toLowerCase().includes(search.toLowerCase())))
    );
  }, [users, search]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div className="engineer-management" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                 <Typography variant="h6" component="h1" sx={{ fontWeight: 500, color: '#2c3e50' }}>
           Engineer Management
         </Typography>
      </Box>
      
      <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
        <TextField
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search engineers..."
          size="small"
          sx={{
            width: 300,
            '& .MuiOutlinedInput-root': {
              borderRadius: '6px',
              '& fieldset': { borderColor: '#e0e0e0' },
              '&:hover fieldset': { borderColor: '#bdbdbd' },
              '&.Mui-focused fieldset': { borderColor: '#90caf9' },
            },
            '& .MuiInputBase-input': { py: 1, fontSize: '0.85rem' }
          }}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ color: '#9e9e9e', mr: 1, fontSize: '1.1rem' }} />
            ),
            endAdornment: search && (
              <IconButton 
                size="small" 
                onClick={() => setSearch('')} 
                sx={{ p: 0.3, mr: 0.5 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            )
          }}
        />
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="textSecondary">
            Loading engineers...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}
      
      {!loading && !error && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              size="small"
              sx={{
                borderRadius: '6px',
                textTransform: 'none',
                boxShadow: 'none',
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5
              }}
            >
              Add Engineer
            </Button>
          </Box>
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: '8px', 
              overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}
          >
                     <TableContainer>
             <Table size="small" sx={{ minWidth: 700, borderCollapse: 'collapse' }}>
              <TableHead sx={{ bgcolor: '#ffffff' }}>
                <TableRow>
                                     <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     #
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Name
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Employee ID
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Designation
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Email
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Contact
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Manager
                   </TableCell>
                   <TableCell sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                     Role
                   </TableCell>
                   <TableCell align="right" sx={{ py: 0.4, px: 2, fontWeight: 600, color: '#455a64', fontSize: '0.8rem' }}>
                     Actions
                   </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="textSecondary">
                        No engineer profiles found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                                 ) : (
                   filteredUsers
                     .slice(filteredUsers.length > 10 ? page * rowsPerPage : 0, filteredUsers.length > 10 ? page * rowsPerPage + rowsPerPage : filteredUsers.length)
                     .sort((a, b) => a.email.localeCompare(b.email))
                     .map((u, i) => (
                      <TableRow 
                        key={u.id || u.uid} 
                        hover
                        sx={{ 
                          bgcolor: '#ffffff',
                          '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                      >
                                                 <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {filteredUsers.length > 10 ? page * rowsPerPage + i + 1 : i + 1}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                             <Typography variant="body2" sx={{ fontWeight: 500 }}>
                               {u.firstName || (u.name ? u.name.split(' ')[0] : '')}
                             </Typography>
                             <Typography variant="body2" color="textSecondary">
                               {u.lastName || (u.name ? u.name.split(' ').slice(1).join(' ') : '')}
                             </Typography>
                           </Box>
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {u.employeeId || u.employeeid}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {u.designation}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {u.email}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {u.contactNumber}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           {u.managerEmail}
                         </TableCell>
                         <TableCell sx={{ py: 0.4, px: 2, fontSize: '0.8rem', borderRight: '1px solid #e0e0e0' }}>
                           <Chip 
                             label={u.role} 
                             size="small" 
                             color={u.role === 'admin' ? 'primary' : u.role === 'support' ? 'secondary' : 'default'} 
                             sx={{ 
                               fontSize: '0.7rem', 
                               height: 22,
                               fontWeight: 500,
                               '&.MuiChip-colorPrimary': { bgcolor: '#e3f2fd', color: '#1976d2' },
                               '&.MuiChip-colorSecondary': { bgcolor: '#e8f5e9', color: '#388e3c' }
                             }} 
                           />
                         </TableCell>
                         <TableCell align="right" sx={{ py: 0.4, px: 2 }}>
                          {actionNotifications[u.uid] ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.7rem',
                                color: actionNotifications[u.uid].type === 'success' ? '#2e7d32' : '#d32f2f',
                                fontWeight: 500,
                                textAlign: 'right',
                                py: 0.5
                              }}
                            >
                              {actionNotifications[u.uid].message}
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
                                  onClick={(event) => handleDeleteClick(event, u.id || u.uid, u.email)} 
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
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
                     {filteredUsers.length > 10 && (
             <TablePagination
               rowsPerPageOptions={[5, 10, 25]}
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
        </Paper>
        </>
      )}
      
      {/* Add Engineer Modal */}
      <Dialog
        open={addMode}
        onClose={handleAddCancel}
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
          className="flex justify-between items-center text-white px-5 py-4 border-b border-gray-200"
          sx={{
            background: '#283149',
            minHeight: '50px',
          }}
        >
          <Typography variant="h6" component="div" className="font-semibold" sx={{ fontSize: '1rem' }}>
            Add Engineer
          </Typography>
          <IconButton onClick={handleAddCancel} className="text-white hover:bg-white hover:bg-opacity-10 transition-colors">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="p-4 sm:p-5 bg-gray-50">
          <Box component="form" onSubmit={handleAddSave} className="space-y-4" autoComplete="off">
            {/* Hidden password field to trick Chrome autofill */}
            <input type="password" style={{ display: 'none' }} autoComplete="new-password" />

            {/* Engineer Information Section */}
            <Box className="bg-white p-4 border border-gray-200">
              <div className="flex items-center mb-3">
                <PersonIcon className="text-gray-600 mr-2" fontSize="small" />
                <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>Engineer Information</Typography>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField 
                  label="Employee ID" 
                  name="employeeid" 
                  value={addRowData.employeeid} 
                  onChange={handleAddChange} 
                  required 
                  size="small"
                  fullWidth
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
                  value={addRowData.firstName} 
                  onChange={handleAddChange} 
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
                  value={addRowData.lastName} 
                  onChange={handleAddChange} 
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
                  value={addRowData.email} 
                  onChange={handleAddChange} 
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
                  value={addRowData.password} 
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
                  value={addRowData.contactNumber} 
                  onChange={handleAddChange} 
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
                  value={addRowData.managerEmail} 
                  onChange={handleAddChange} 
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
                  value={addRowData.employmentType} 
                  onChange={handleAddChange} 
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
                  <MenuItem value="contract" sx={{ fontSize: '0.85rem' }}>Contract</MenuItem>
                  <MenuItem value="permanent" sx={{ fontSize: '0.85rem' }}>Permanent</MenuItem>
                  <MenuItem value="intern" sx={{ fontSize: '0.85rem' }}>Intern</MenuItem>
                </TextField>
                
                <TextField 
                  label="Designation" 
                  name="designation" 
                  value={addRowData.designation} 
                  onChange={handleAddChange} 
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
              </div>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleAddCancel} 
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
            onClick={handleAddSave}
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
            Add Engineer
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit Engineer Modal */}
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
          className="flex justify-between items-center text-white px-5 py-4 border-b border-gray-200"
          sx={{
            background: '#283149',
            minHeight: '50px',
          }}
        >
          <Typography variant="h6" component="div" className="font-semibold" sx={{ fontSize: '1rem' }}>
            Edit Engineer
          </Typography>
          <IconButton onClick={handleEditCancel} className="text-white hover:bg-white hover:bg-opacity-10 transition-colors">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="p-4 sm:p-5 bg-gray-50">
          <Box component="form" onSubmit={(e) => {
            e.preventDefault();
            handleEditSave(editRowId);
          }} className="space-y-4" autoComplete="off">
            {/* Engineer Information Section */}
            <Box className="bg-white p-4 border border-gray-200">
              <div className="flex items-center mb-3">
                <PersonIcon className="text-gray-600 mr-2" fontSize="small" />
                <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>Engineer Information</Typography>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField 
                  label="Employee ID *" 
                  name="employeeid" 
                  value={editRowData.employeeid || ''} 
                  onChange={handleEditChange} 
                  required 
                  size="small"
                  fullWidth
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
                  label="Email *" 
                  name="email" 
                  value={editRowData.email || ''} 
                  onChange={handleEditChange} 
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
                  label="Contact Number *" 
                  name="contactNumber" 
                  value={editRowData.contactNumber || ''} 
                  onChange={handleEditChange} 
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
                  label="Manager Email *" 
                  name="managerEmail" 
                  value={editRowData.managerEmail || ''} 
                  onChange={handleEditChange} 
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
                  label="Employment Type *" 
                  name="employmentType" 
                  value={editRowData.employmentType || ''} 
                  onChange={handleEditChange} 
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
                  <MenuItem value="contract" sx={{ fontSize: '0.85rem' }}>Contract</MenuItem>
                  <MenuItem value="permanent" sx={{ fontSize: '0.85rem' }}>Permanent</MenuItem>
                  <MenuItem value="intern" sx={{ fontSize: '0.85rem' }}>Intern</MenuItem>
                </TextField>
                
                <TextField 
                  label="Designation *" 
                  name="designation" 
                  value={editRowData.designation || ''} 
                  onChange={handleEditChange} 
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
              </div>
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={handleEditCancel} 
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
            onClick={(e) => {
              e.preventDefault();
              handleEditSave(editRowId);
            }}
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
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Password Reset Modal */}
      <Dialog
        open={changePwdModalOpen}
        onClose={closeChangePwdModal}
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
          className="flex justify-between items-center text-white px-5 py-4 border-b border-gray-200"
          sx={{
            background: '#283149',
            minHeight: '50px',
          }}
        >
          <Typography variant="h6" component="div" className="font-semibold" sx={{ fontSize: '1rem' }}>
            Reset Password
          </Typography>
          <IconButton onClick={closeChangePwdModal} className="text-white hover:bg-white hover:bg-opacity-10 transition-colors">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="p-4 sm:p-5 bg-gray-50">
          <Box component="form" onSubmit={(e) => {
            e.preventDefault();
            handleChangePassword(e);
          }} className="space-y-4" autoComplete="off">
            {/* Password Reset Section */}
            <Box className="bg-white p-4 border border-gray-200">
              <div className="flex items-center mb-3">
                <LockIcon className="text-gray-600 mr-2" fontSize="small" />
                <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>New Password</Typography>
              </div>
              <TextField 
                label="New Password *" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                }}
                InputLabelProps={{ 
                  shrink: true, 
                  sx: { 
                    fontSize: '0.8rem',
                    color: '#1976d2',
                    fontWeight: 600,
                    '&.Mui-focused': {
                      color: '#1565c0'
                    }
                  } 
                }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
              />
              {changePwdError && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>{changePwdError}</Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ py: 2, px: 3, bgcolor: '#f8f9fa', borderTop: '1px solid #e0e0e0' }}>
          <Button 
            onClick={closeChangePwdModal} 
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
            onClick={(e) => {
              e.preventDefault();
              handleChangePassword(e);
            }}
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
            Reset Password
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
          className="flex justify-between items-center text-white px-5 py-4 border-b border-gray-200"
          sx={{
            background: '#d32f2f',
            minHeight: '50px',
          }}
        >
          <Typography variant="h6" component="div" className="font-semibold" sx={{ fontSize: '1rem' }}>
            ⚠️ Delete Engineer
          </Typography>
          <IconButton onClick={handleCancelDelete} className="text-white hover:bg-white hover:bg-opacity-10 transition-colors">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent className="p-4 sm:p-5 bg-gray-50">
          <Box className="bg-white p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>
                Confirm Deletion
              </Typography>
            </div>
            <Typography variant="body2" sx={{ mb: 2, fontSize: '0.85rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{currentUserEmailToDelete}</strong>? 
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#d32f2f', fontWeight: 500 }}>
              ⚠️ This action cannot be undone and will permanently remove the engineer from the system.
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
            Delete Engineer
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%', fontSize: '0.85rem' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default EngineerManagementComponent;