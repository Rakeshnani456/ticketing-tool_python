import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  Button, Chip, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Snackbar, Alert, Typography, Popover, MenuItem, Tooltip, TablePagination, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Skeleton
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
import SmartCacheManager from '../../utils/smartCacheManager';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { app } from '../../config/firebase';

// Custom Tooltip Component
const CustomTooltip = ({ children, title, position = 'top' }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg whitespace-nowrap ${
            position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          } left-1/2 transform -translate-x-1/2`}
        >
          {title}
          <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
            position === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1'
          } left-1/2 -translate-x-1/2`}></div>
        </div>
      )}
    </div>
  );
};

// Custom Badge Component
const CustomBadge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Custom Icon Button Component
const CustomIconButton = ({ children, onClick, className = '', tooltip, ...props }) => {
  const button = (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
  
  if (tooltip) {
    return <CustomTooltip title={tooltip}>{button}</CustomTooltip>;
  }
  
  return button;
};

// Memoized table row component for better performance
const EngineerTableRow = memo(({ user, showActionsColumn, onViewClick, onEditClick, onDeleteClick }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-150">
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <div className="flex items-center space-x-2 min-w-0">
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <PersonIcon className="w-3 h-3 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onViewClick(user)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150 truncate block w-full text-left"
            title={`${user.firstName} ${user.lastName}`}
          >
            {user.firstName} {user.lastName}
          </button>
          <p className="text-xs text-gray-500 mt-0.5 truncate" title={user.contactNumber}>
            {user.contactNumber}
          </p>
        </div>
      </div>
    </td>
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <div className="flex items-center space-x-2 min-w-0">
        <EmailIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-900 truncate" title={user.email}>
          {user.email}
        </span>
      </div>
    </td>
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <span className="text-sm text-gray-900 truncate block" title={user.employeeId || user.employeeid || 'N/A'}>
        {user.employeeId || user.employeeid || 'N/A'}
      </span>
    </td>
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <span className="text-sm text-gray-900 truncate block" title={user.designation || 'N/A'}>
        {user.designation || 'N/A'}
      </span>
    </td>
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <CustomBadge variant="primary" size="sm" className="truncate">
        {user.role || 'Engineer'}
      </CustomBadge>
    </td>
    <td className={`px-4 py-3 ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
      <CustomBadge variant="success" size="sm">
        Active
      </CustomBadge>
    </td>
    {showActionsColumn && (
      <td className="px-4 py-3 text-center w-1/6">
        <div className="flex items-center justify-center space-x-1">
          <CustomIconButton
            onClick={() => onViewClick(user)}
            tooltip="View"
            className="w-7 h-7 text-green-600 hover:text-green-700 hover:bg-green-50 focus:ring-green-500"
          >
            <PersonIcon className="w-3.5 h-3.5" />
          </CustomIconButton>
          <CustomIconButton
            onClick={() => onEditClick(user)}
            tooltip="Edit"
            className="w-7 h-7 text-gray-600 hover:text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
          >
            <EditIcon className="w-3.5 h-3.5" />
          </CustomIconButton>
          <CustomIconButton
            onClick={(event) => onDeleteClick(event, user.uid, user.email)}
            tooltip="Delete"
            className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 focus:ring-red-500"
          >
            <DeleteIcon className="w-3.5 h-3.5" />
          </CustomIconButton>
        </div>
      </td>
    )}
  </tr>
));

const EngineerManagementComponent = ({ user, showFlashMessage }) => {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
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
  const [showActionsColumn, setShowActionsColumn] = useState(false);
  const db = getFirestore(app);


  const fetchClients = useCallback(async () => {
    // Only fetch clients for super_admin, site_admin should not access clients
    if (user.role !== 'super_admin') {
      setClients([]);
      return;
    }
    
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  }, [user.role, user.firebaseUser]);

  useEffect(() => {
    if (!user || !user.firebaseUser) {
      console.log("No user or firebaseUser available, skipping listener setup");
      return;
    }
    
    console.log("Setting up engineers data fetching with real-time listeners...");
    setLoading(true);
    setError(null);
    
    let unsubscribe = null;
    
    const setupRealTimeListener = async () => {
      try {
        // Fetch clients first if not available
        if (clients.length === 0) {
          await fetchClients();
        }
        
        // Use Firestore real-time listener for engineers
        const usersRef = collection(db, 'users');
        console.log("Setting up Firestore listener for real-time engineer updates...");
        
        // Create query for engineers only
        const engineersQuery = query(
          usersRef,
          where('role', 'in', ['engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer', 'support'])
        );
        
        unsubscribe = onSnapshot(engineersQuery, 
          async (snapshot) => {
            try {
              console.log("🔥 Firestore real-time update received for engineers, snapshot size:", snapshot.size);
              
              const fetchedEngineers = [];
              snapshot.forEach((doc) => {
                const userData = doc.data();
                fetchedEngineers.push({
                  uid: doc.id,
                  ...userData
                });
              });
              
              setUsers(fetchedEngineers);
              setLoading(false);
              setError(null);
            } catch (error) {
              console.error("Error processing real-time engineers update:", error);
              setError(`Real-time update error: ${error.message}`);
              setLoading(false);
            }
          },
          (error) => {
            console.error("Error in real-time engineers listener:", error);
            setError(`Listener error: ${error.message}`);
            setLoading(false);
          }
        );
        
      } catch (error) {
        console.error("Error setting up data fetching:", error);
        setError(`Setup error: ${error.message}`);
        setLoading(false);
      }
    };
    
    setupRealTimeListener();
        
    return () => {
      console.log("Cleaning up engineers data fetching...");
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, db, clients.length]);

  const handleAdd = () => {
    navigate('/engineer-management/create-engineer');
  };


  const handleEditClick = (userToEdit) => {
    navigate(`/engineer-management/engineer-detail/${userToEdit.uid}?edit=true`);
  };

  const handleViewClick = (userToView) => {
    navigate(`/engineer-management/engineer-detail/${userToView.uid}`);
  };

  const handleDeleteClick = (event, uid, email) => {
    event.stopPropagation();
    setUserToDeleteUid(uid);
    setCurrentUserEmailToDelete(email);
    setOpenConfirmPopover(true);
    anchorEl.current = event.currentTarget;
  };

  const handleDeleteConfirm = async () => {
    if (!userToDeleteUid) return;
    
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/users/${userToDeleteUid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!res.ok) throw new Error('Failed to delete engineer');
      
      setUsers(prev => prev.filter(u => u.uid !== userToDeleteUid));
      setSnackbar({ open: true, message: 'Engineer deleted successfully.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setOpenConfirmPopover(false);
      setUserToDeleteUid(null);
      setCurrentUserEmailToDelete('');
    }
  };

  const handleDeleteCancel = () => {
    setOpenConfirmPopover(false);
    setUserToDeleteUid(null);
    setCurrentUserEmailToDelete('');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Memoized filtered users for performance
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    
    const searchLower = search.toLowerCase();
    return users.filter(user => 
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.employeeId?.toLowerCase().includes(searchLower) ||
      user.designation?.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Engineer Management</h1>
              <p className="text-gray-600">Manage engineers in your organization</p>
            </div>
          </div>
          
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
              <Skeleton variant="rectangular" width={300} height={36} />
            </Box>
            
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">
                  Loading engineers...
                </Typography>
              </Box>
        </Box>
          </Paper>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        </Box>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Engineer Management</h1>
            <p className="text-gray-600">Manage engineers in your organization</p>
          </div>
          <div className="flex gap-2">
      <div
        onClick={handleAdd}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-200 ease-in-out cursor-pointer"
      >
        <AddIcon sx={{ fontSize: '16px' }} />
        Add Engineer
      </div>
      <div
        onClick={() => setShowActionsColumn(!showActionsColumn)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 ease-in-out cursor-pointer ${
          showActionsColumn 
            ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
            : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
        }`}
      >
        <AdminIcon sx={{ fontSize: '16px' }} />
        {showActionsColumn ? 'Cancel' : 'Manage'}
      </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="relative max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
              placeholder="Search engineers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {search && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    onClick={() => setSearch('')}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <ClearIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Name
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Email
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Employee ID
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Designation
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Role
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider truncate ${showActionsColumn ? 'w-1/6' : 'w-1/5'}`}>
                    Status
                  </th>
                   {showActionsColumn && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/6 truncate">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <EngineerTableRow
                    key={user.uid}
                    user={user}
                    showActionsColumn={showActionsColumn}
                    onViewClick={handleViewClick}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredUsers.length)} of {filteredUsers.length} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleChangePage(null, page - 1)}
                    disabled={page === 0}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {page + 1} of {Math.ceil(filteredUsers.length / rowsPerPage)}
                  </span>
                  <button
                    onClick={() => handleChangePage(null, page + 1)}
                    disabled={page >= Math.ceil(filteredUsers.length / rowsPerPage) - 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {openConfirmPopover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delete Engineer</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete {currentUserEmailToDelete}? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
            Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
              Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Notification */}
      {snackbar.open && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div className={`rounded-md shadow-lg p-4 ${
            snackbar.severity === 'success' ? 'bg-green-50 border border-green-200' :
            snackbar.severity === 'error' ? 'bg-red-50 border border-red-200' :
            snackbar.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {snackbar.severity === 'success' && (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {snackbar.severity === 'error' && (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {snackbar.severity === 'warning' && (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {snackbar.severity === 'info' && (
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  snackbar.severity === 'success' ? 'text-green-800' :
                  snackbar.severity === 'error' ? 'text-red-800' :
                  snackbar.severity === 'warning' ? 'text-yellow-800' :
                  'text-blue-800'
                }`}>
                  {snackbar.message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setSnackbar(prev => ({ ...prev, open: false }))}
                  className={`inline-flex rounded-md p-1.5 ${
                    snackbar.severity === 'success' ? 'text-green-500 hover:bg-green-100' :
                    snackbar.severity === 'error' ? 'text-red-500 hover:bg-red-100' :
                    snackbar.severity === 'warning' ? 'text-yellow-500 hover:bg-yellow-100' :
                    'text-blue-500 hover:bg-blue-100'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(EngineerManagementComponent);