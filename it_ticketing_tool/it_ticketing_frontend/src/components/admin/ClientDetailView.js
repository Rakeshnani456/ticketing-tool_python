import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Breadcrumbs,
  Link,
  Tab,
  Tabs,
  Tooltip,
  Badge,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Language as WebsiteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Add as AddIcon,
  FileDownload as FileDownloadIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  ContactPhone as ContactPhoneIcon,
  ContactMail as ContactMailIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Handshake } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, getFirestore, collection, query, where } from 'firebase/firestore';
import { app } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';

const ClientDetailView = ({ user }) => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = getFirestore(app);

  // State management
  const [client, setClient] = useState(null);
  const [clientUsers, setClientUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteButtonRef, setDeleteButtonRef] = useState(null);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState({ top: 0, left: 0 });
  const [popupRef, setPopupRef] = useState(null);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editError, setEditError] = useState(null);
  const [formData, setFormData] = useState({});

  // Designation options
  const designationOptions = [
    { value: '', label: 'Select Designation' },
    { value: 'CEO', label: 'CEO' },
    { value: 'CTO', label: 'CTO' },
    { value: 'Manager', label: 'Manager' },
    { value: 'IT Admin', label: 'IT Admin' },
    { value: 'Site Admin', label: 'Site Admin' },
    { value: 'Director', label: 'Director' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Developer', label: 'Developer' },
    { value: 'Other', label: 'Other' },
  ];

  // Inject styles to completely disable animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .client-detail-page * {
        transition: none !important;
        transform: none !important;
        animation: none !important;
        -webkit-transform: none !important;
        -moz-transform: none !important;
        -webkit-transition: none !important;
        -moz-transition: none !important;
      }
      .client-detail-page *:hover,
      .client-detail-page *:focus,
      .client-detail-page *:active {
        transition: none !important;
        transform: translateY(0px) !important;
        animation: none !important;
        -webkit-transform: translateY(0px) !important;
        -moz-transform: translateY(0px) !important;
        -webkit-transition: none !important;
        -moz-transition: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check for edit mode from URL parameters
  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    if (editMode && client) {
      setIsEditMode(true);
      setFormData({ ...client });
    }
  }, [searchParams, client]);

  // Fetch client data
  useEffect(() => {
    if (!clientId) return;

    const unsubscribeClient = onSnapshot(
      doc(db, 'clients', clientId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setClient({ id: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setError('Client not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching client:', error);
        setError('Failed to load client data');
      setLoading(false);
    }
    );

    return () => unsubscribeClient();
  }, [clientId, db]);

  // Fetch client users
  useEffect(() => {
    if (!client?.companyName) return;

    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users'), where('client_name', '==', client.companyName)),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setClientUsers(users);
      },
      (error) => {
        console.error('Error fetching client users:', error);
      }
    );

    return () => unsubscribeUsers();
  }, [client?.companyName, db]);

  // Handle edit client
  const handleEditClient = () => {
    setIsEditMode(true);
    setFormData({ ...client });
    setEditError(null);
    setShowSuccess(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setFormData({});
    setEditError(null);
    setShowSuccess(false);
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save client
  const handleSaveClient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }

      setShowSuccess(true);
      
      // Update the client state with new data
      setClient(prev => ({ ...prev, ...formData }));
      
    } catch (error) {
      console.error('Error updating client:', error);
      let errorMessage = error.message || 'Failed to update client. Please try again.';
      if (error.message && error.message.includes('email already in use')) {
        errorMessage = 'The email address is already in use by another account. Please use a different email address.';
      }
      setEditError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete client
  const handleDeleteClient = async (event) => {
    if (event) event.stopPropagation();
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setSnackbar({
        open: true,
        message: 'Client deleted successfully',
        severity: 'success'
      });

      // Navigate back to client list after deletion
      setTimeout(() => {
      navigate('/clients');
      }, 1500);
    } catch (error) {
      console.error('Error deleting client:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete client',
        severity: 'error'
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleCancelDelete = (event) => {
    if (event) event.stopPropagation();
    setShowDeleteDialog(false);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteDialog && popupRef && !popupRef.contains(event.target)) {
        setShowDeleteDialog(false);
      }
    };

    if (showDeleteDialog) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteDialog, popupRef]);

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const popupHeight = 200; // Approximate popup height
    
    // Check if there's enough space below the button
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    let top, left;
    
    if (spaceBelow >= popupHeight || spaceBelow > spaceAbove) {
      // Position below the button
      top = buttonRect.bottom + window.scrollY + 8;
    } else {
      // Position above the button
      top = buttonRect.top + window.scrollY - popupHeight - 8;
    }
    
    left = buttonRect.right - 280 + window.scrollX;
    
    setDeleteButtonPosition({ top, left });
    setShowDeleteDialog(true);
  };

  // Handle add user
  const handleAddUser = () => {
    navigate(`/user-management/create-user?client=${encodeURIComponent(client.companyName)}`);
  };

  // Handle manage users
  const handleManageUsers = () => {
    navigate(`/user-management?clientId=${clientId}&clientName=${encodeURIComponent(client.companyName)}`);
  };


   // Users Table Component
   const UsersTable = () => (
     <Card sx={{ width: '100%' }}>
       <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Users ({clientUsers.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
          <button
              className="btn btn-secondary btn-small"
              onClick={handleAddUser}
            >
              <PersonAddIcon fontSize="small" />
              Add User
          </button>
                <button
              className="btn btn-primary btn-small"
              onClick={handleManageUsers}
            >
              <GroupIcon fontSize="small" />
              Manage All
                </button>
          </Box>
        </Box>
        
        {clientUsers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              No users found for this client
            </Typography>
                <button
              className="btn btn-primary"
              onClick={handleAddUser}
            >
              <PersonAddIcon fontSize="small" />
              Add First User
                </button>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientUsers.map((user) => (
                  <TableRow key={user.uid} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                          {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.designation || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.employeeId || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role === 'site_admin' ? 'Site Admin' : 'User'}
                        size="small"
                        color={user.role === 'site_admin' ? 'primary' : 'default'}
                        variant={user.role === 'site_admin' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.contactNumber || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );


  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading client details...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
          <button
          className="btn btn-secondary"
            onClick={() => navigate('/clients')}
        >
          <ArrowBackIcon fontSize="small" />
          Back to Client Management
          </button>
      </Box>
    );
  }

  if (!client) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Client not found
        </Alert>
      </Box>
    );
  }

  const authPersonData = [
    { icon: <BadgeIcon fontSize="small" />, label: 'Name', value: `${client.authFirstName || ''} ${client.authLastName || ''}`.trim() },
    { icon: <WorkIcon fontSize="small" />, label: 'Designation', value: client.authDesignation },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Office Email', value: client.authOfficeEmail, isEmail: true },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Personal Email', value: client.authPersonalEmail, isEmail: true },
    { icon: <ContactPhoneIcon fontSize="small" />, label: 'Contact', value: client.authContactNumber, isPhone: true },
  ];

  const siteAdminData = [
    { icon: <BadgeIcon fontSize="small" />, label: 'Name', value: `${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim() },
    { icon: <WorkIcon fontSize="small" />, label: 'Designation', value: client.siteDesignation },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Email', value: client.siteEmail, isEmail: true },
    { icon: <ContactPhoneIcon fontSize="small" />, label: 'Contact', value: client.siteContactNumber, isPhone: true },
  ];

  return (
    <Box 
      className="client-detail-page"
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        bgcolor: '#f8fafc', 
      minHeight: '100vh',
        '& *': { 
          transition: 'none !important',
          transform: 'none !important',
          animation: 'none !important',
          WebkitTransform: 'none !important',
          MozTransform: 'none !important'
        },
        '&:hover *': {
          transition: 'none !important',
          transform: 'none !important',
          animation: 'none !important',
          WebkitTransform: 'none !important',
          MozTransform: 'none !important'
        },
        '& .MuiCard-root': {
          transform: 'none !important',
          transition: 'none !important'
        },
        '& .MuiCard-root:hover': {
          transform: 'translateY(0px) !important',
          transition: 'none !important',
          WebkitTransform: 'translateY(0px) !important'
        }
      }}
    >
      <style jsx>{`
        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          text-decoration: none;
          border: none;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn-danger {
          background: #dc2626;
          color: white;
          border: 1px solid #dc2626;
        }
        
        .btn-danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-small {
          padding: 0.25rem 0.625rem;
          font-size: 0.7rem;
        }
        
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-top: 1px solid #0ea5e9;
        }
        
        .form-actions-left {
          flex: 1;
        }
        
        .form-actions-right {
          display: flex;
          gap: 0.5rem;
        }
        
        /* Info Tags */
        .tag-container {
          display: flex;
          align-items: center;
          min-height: 2.5rem;
        }
        
        .info-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
          border: 1px solid;
        }
        
        .info-tag.location-tag {
          background: #f0f9ff;
          color: #0369a1;
          border-color: #bae6fd;
        }
        
        .info-tag.website-tag {
          background: #eff6ff;
          color: #1d4ed8;
          border-color: #bfdbfe;
          font-size: 0.75rem;
          padding: 0.375rem 0.5rem;
        }
        
        .info-tag.website-tag:hover {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .info-tag.users-tag {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
        }
        
        .info-tag.no-data {
          background: #fef3c7;
          color: #92400e;
          border-color: #fde68a;
          font-style: italic;
        }
        
        .tag-icon {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
        }
        
        /* Tab styling for user count */
        .MuiTab-root {
          position: relative;
        }
        
        .MuiTab-root[aria-selected="true"] {
          color: #3b82f6 !important;
        }
        
        /* Reduce form input sizes */
        .form-input {
          padding: 0.5rem;
          height: 2.25rem;
          font-size: 0.8rem;
        }
        
        .form-label {
          font-size: 0.7rem;
          margin-bottom: 0.25rem;
        }
        
        .form-grid {
          gap: 0.5rem;
        }
        
        .form-group {
          margin-bottom: 0.5rem;
        }
        
        .profile-section {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          margin-bottom: 1rem;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
        .profile-header {
          background: #f8fafc;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .profile-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }
        
        .profile-content {
          padding: 1rem;
        }
        
        .info-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .info-item:last-child {
          border-bottom: none;
        }
        
        .info-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #6b7280;
          flex-shrink: 0;
        }
        
        .info-content {
          flex: 1;
          min-width: 0;
        }
        
        .info-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }
        
        .info-value {
          font-size: 0.875rem;
          color: #374151;
          word-break: break-word;
        }
        
        .info-value a {
          color: #3b82f6;
          text-decoration: none;
        }
        
        .info-value a:hover {
          text-decoration: underline;
        }
        
        .client-detail-layout {
          width: 100%;
          max-width: none;
          padding: 0;
        }
        
        .form-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          margin-bottom: 0.75rem;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        
        .section-header {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #9ca3af;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .section-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #ffffff;
        }
        
        .section-header h3 {
          font-size: 0.8rem;
          font-weight: 500;
          color: #ffffff;
          margin: 0;
        }
        
        .section-content {
          padding: 0.75rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 0.75rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.375rem;
        }
        
        .form-input {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: #ffffff;
          transition: all 0.2s ease;
          width: 100%;
          height: 2.5rem;
          box-sizing: border-box;
          min-height: 2.5rem;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #6b7280;
          box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.1);
          background: #ffffff;
        }
        
        .form-input:hover {
          border-color: #9ca3af;
        }
        
        .form-input.display-only {
          background-color: #f9fafb;
          color: #374151;
          border-color: #e5e7eb;
          cursor: default;
          display: flex;
          align-items: center;
          height: 2.5rem;
          min-height: 2.5rem;
        }
        
        .form-input.display-only a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }
        
        .form-input.display-only a:hover {
          text-decoration: underline;
        }
        
        .delete-bubble {
          position: fixed;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 1rem;
          z-index: 10000;
          min-width: 280px;
          max-width: 320px;
        }
        
        .delete-bubble::before {
          content: '';
          position: absolute;
          top: -8px;
          right: 20px;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 8px solid #e5e7eb;
        }
        
        .delete-bubble::after {
          content: '';
          position: absolute;
          top: -7px;
          right: 21px;
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 7px solid white;
        }
        
        .delete-bubble h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .delete-bubble p {
          margin: 0 0 1rem 0;
          font-size: 0.8rem;
          color: #6b7280;
          line-height: 1.4;
        }
        
        .delete-bubble-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        
        .btn-bubble-cancel {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.75rem;
          color: #374151;
        }
        
        .btn-bubble-cancel:hover {
          background-color: #f9fafb;
        }
        
        .btn-bubble-delete {
          padding: 0.375rem 0.75rem;
          border: 1px solid #dc2626;
          background: #dc2626;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.75rem;
          color: white;
        }
        
        .btn-bubble-delete:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        
        .btn-bubble-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .section-content {
            padding: 0.75rem;
          }
          
          .delete-bubble {
            right: -50px;
            min-width: 250px;
          }
        }
      `}</style>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/clients')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <Handshake size={16} />
            Client Management
          </Link>
          <Typography variant="body2" color="text.primary">
            {client.companyName}
          </Typography>
        </Breadcrumbs>

        {/* Title and Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => navigate('/clients')}
            >
              <ArrowBackIcon fontSize="small" />
              Back to Clients
            </button>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500, color: '#1e293b', mb: 0.25, fontSize: '1.1rem' }}>
                {client.companyName}
              </Typography>
            </Box>
          </Box>
          
          {/* Action Buttons */}
          {['admin', 'site_admin', 'super_admin'].includes(user?.role) && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isEditMode && !showSuccess ? (
                <>
                <button
                    className="btn btn-secondary btn-small"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                </button>
                <button
                    className="btn btn-primary btn-small"
                    onClick={handleSaveClient}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Client'}
                </button>
                </>
              ) : !isEditMode ? (
                <>
                <button
                    className="btn btn-secondary btn-small"
                    onClick={handleEditClient}
                  >
                    <EditIcon fontSize="small" />
                    Edit
                </button>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={handleDeleteClick}
                    ref={setDeleteButtonRef}
                  >
                    <DeleteIcon fontSize="small" />
                    Delete
                  </button>
                </>
              ) : null}
            </Box>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ mb: 2 }}>
         {/* Success Message */}
         {isEditMode && showSuccess && (
        <div style={{
                  display: 'flex',
                  alignItems: 'center',
             justifyContent: 'space-between',
             gap: '0.5rem', 
             padding: '0.5rem 0.75rem', 
             backgroundColor: 'white', 
             border: '1px solid #10b981', 
             borderRadius: '0.375rem', 
             marginBottom: '1rem',
             color: '#065f46',
             fontSize: '0.8rem',
             fontWeight: '500',
             height: '2.5rem'
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <svg style={{ width: '1rem', height: '1rem', color: '#10b981' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M9 12l2 2 4-4"/>
                 <circle cx="12" cy="12" r="10"/>
               </svg>
               <span>Client updated successfully!</span>
                </div>
              <button
               type="button"
               onClick={() => navigate('/clients')}
                style={{
                 backgroundColor: '#10b981', 
                 color: 'white', 
                  border: 'none',
                 padding: '0.25rem 0.5rem',
                 borderRadius: '0.25rem',
                 fontSize: '0.7rem',
                  fontWeight: '500',
                 cursor: 'pointer',
                 height: '1.75rem'
                }}
              >
               Go Back to Clients
              </button>
          </div>
         )}

         <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 1, minHeight: '32px', '& .MuiTab-root': { minHeight: '32px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: '500', marginRight: '4px' }, '& .MuiTabs-indicator': { height: '2px' } }}>
           <Tab label="Overview" />
           <Tab label={`Users (${clientUsers.length})`} />
         </Tabs>

        {/* Tab Content */}
         {activeTab === 0 && (
           <div className="client-detail-layout">
             {/* Company Information Section */}
             <div className="form-section">
               <div className="section-header">
                 <Handshake className="section-icon" />
                 <h3>Company Information</h3>
               </div>
               <div className="section-content">
                 <div className="form-grid">
                   <div className="form-group">
                     <label className="form-label">Company Name</label>
                     {isEditMode ? (
                    <input
                      type="text"
                         className="form-input"
                         value={formData.companyName || ''}
                         onChange={(e) => handleFieldChange('companyName', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">{client.companyName}</div>
                  )}
                </div>
                   <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                     <label className="form-label">Address</label>
                     {isEditMode ? (
                       <textarea
                         className="form-input"
                         value={formData.location || ''}
                         onChange={(e) => handleFieldChange('location', e.target.value)}
                         disabled={showSuccess}
                         rows={3}
                         placeholder="Enter full address"
                         style={{ height: '4.5rem', minHeight: '4.5rem' }}
                       />
                     ) : (
                       <div className="form-input display-only" style={{ height: '4.5rem', minHeight: '4.5rem', whiteSpace: 'pre-wrap' }}>
                         {client.location || 'No address provided'}
                    </div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Website</label>
                     {isEditMode ? (
                    <input
                         type="url"
                         className="form-input"
                         value={formData.website || ''}
                         onChange={(e) => handleFieldChange('website', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="tag-container">
                         {client.website ? (
                           <a href={client.website} target="_blank" rel="noopener noreferrer" className="info-tag website-tag">
                             <WebsiteIcon className="tag-icon" />
                             {client.website}
                           </a>
                         ) : (
                           <span className="info-tag no-data">No website set</span>
                         )}
                    </div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Contact Number</label>
                     {isEditMode ? (
                       <input
                         type="tel"
                         className="form-input"
                         value={formData.clientContactNumber || ''}
                         onChange={(e) => handleFieldChange('clientContactNumber', e.target.value)}
                         disabled={showSuccess}
                       />
                     ) : (
                       <div className="form-input display-only">
                         {client.clientContactNumber ? (
                           <a href={`tel:${client.clientContactNumber}`}>
                             {client.clientContactNumber}
                           </a>
                         ) : (
                           'N/A'
                         )}
                    </div>
                  )}
                </div>
              </div>
            </div>
                </div>


             {/* Authorized Person Section */}
             <div className="form-section">
               <div className="section-header">
                 <PersonIcon className="section-icon" />
                 <h3>Authorized Person</h3>
               </div>
               <div className="section-content">
                 <div className="form-grid">
                   <div className="form-group">
                     <label className="form-label">First Name</label>
                     {isEditMode ? (
                    <input
                      type="text"
                         className="form-input"
                         value={formData.authFirstName || ''}
                         onChange={(e) => handleFieldChange('authFirstName', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">{client.authFirstName || 'N/A'}</div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Last Name</label>
                     {isEditMode ? (
                    <input
                         type="text"
                         className="form-input"
                         value={formData.authLastName || ''}
                         onChange={(e) => handleFieldChange('authLastName', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">{client.authLastName || 'N/A'}</div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Designation</label>
                     {isEditMode ? (
                       <CustomDropdown
                         value={formData.authDesignation || ''}
                         onChange={(value) => handleFieldChange('authDesignation', value)}
                         options={designationOptions}
                         placeholder="Select designation"
                         size="sm"
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">{client.authDesignation || 'N/A'}</div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Office Email</label>
                     {isEditMode ? (
                    <input
                         type="email"
                         className="form-input"
                         value={formData.authOfficeEmail || ''}
                         onChange={(e) => handleFieldChange('authOfficeEmail', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">
                         {client.authOfficeEmail ? (
                           <a href={`mailto:${client.authOfficeEmail}`}>
                             {client.authOfficeEmail}
                           </a>
                         ) : (
                           'N/A'
                         )}
                    </div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Personal Email</label>
                     {isEditMode ? (
                    <input
                      type="email"
                         className="form-input"
                         value={formData.authPersonalEmail || ''}
                         onChange={(e) => handleFieldChange('authPersonalEmail', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">
                         {client.authPersonalEmail ? (
                           <a href={`mailto:${client.authPersonalEmail}`}>
                             {client.authPersonalEmail}
                           </a>
                         ) : (
                           'N/A'
                         )}
                    </div>
                  )}
                </div>
                   <div className="form-group">
                     <label className="form-label">Country Code</label>
                     {isEditMode ? (
                       <CustomDropdown
                         value={formData.authContactCountryCode || ''}
                         onChange={(value) => handleFieldChange('authContactCountryCode', value)}
                         options={getCountryOptions()}
                         placeholder="Select country code"
                         size="sm"
                         disabled={showSuccess}
                       />
                     ) : (
                       <div className="form-input display-only">{client.authContactCountryCode || 'N/A'}</div>
                     )}
                   </div>
                   <div className="form-group">
                     <label className="form-label">Contact Number</label>
                     {isEditMode ? (
                    <input
                      type="tel"
                         className="form-input"
                         value={formData.authContactNumber || ''}
                         onChange={(e) => handleFieldChange('authContactNumber', e.target.value)}
                         disabled={showSuccess}
                    />
                  ) : (
                       <div className="form-input display-only">
                         {client.authContactNumber ? (
                           <a href={`tel:${client.authContactNumber}`}>
                             {client.authContactNumber}
                           </a>
                         ) : (
                           'N/A'
                         )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

             {/* Site Administrator Section */}
             <div className="form-section">
               <div className="section-header">
                 <AdminIcon className="section-icon" />
                 <h3>Site Administrator</h3>
               </div>
               <div className="section-content">
                 <div className="form-grid">
                   <div className="form-group">
                     <label className="form-label">First Name</label>
                     {isEditMode ? (
                  <input
                    type="text"
                         className="form-input"
                         value={formData.siteFirstName || ''}
                         onChange={(e) => handleFieldChange('siteFirstName', e.target.value)}
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">{client.siteFirstName || 'N/A'}</div>
                )}
              </div>
                   <div className="form-group">
                     <label className="form-label">Last Name</label>
                     {isEditMode ? (
                  <input
                    type="text"
                         className="form-input"
                         value={formData.siteLastName || ''}
                         onChange={(e) => handleFieldChange('siteLastName', e.target.value)}
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">{client.siteLastName || 'N/A'}</div>
                )}
              </div>
                   <div className="form-group">
                     <label className="form-label">Designation</label>
                     {isEditMode ? (
                       <CustomDropdown
                         value={formData.siteDesignation || ''}
                         onChange={(value) => handleFieldChange('siteDesignation', value)}
                         options={designationOptions}
                         placeholder="Select designation"
                         size="sm"
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">{client.siteDesignation || 'N/A'}</div>
                )}
              </div>
                   <div className="form-group">
                     <label className="form-label">Email</label>
                     {isEditMode ? (
                  <input
                         type="email"
                         className="form-input"
                         value={formData.siteEmail || ''}
                         onChange={(e) => handleFieldChange('siteEmail', e.target.value)}
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">
                         {client.siteEmail ? (
                           <a href={`mailto:${client.siteEmail}`}>
                             {client.siteEmail}
                           </a>
                         ) : (
                           'N/A'
                         )}
                  </div>
                )}
              </div>
                   <div className="form-group">
                     <label className="form-label">Country Code</label>
                     {isEditMode ? (
                       <CustomDropdown
                         value={formData.siteContactCountryCode || ''}
                         onChange={(value) => handleFieldChange('siteContactCountryCode', value)}
                         options={getCountryOptions()}
                         placeholder="Select country code"
                         size="sm"
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">{client.siteContactCountryCode || 'N/A'}</div>
                )}
              </div>
                   <div className="form-group">
                     <label className="form-label">Contact Number</label>
                     {isEditMode ? (
                  <input
                         type="tel"
                         className="form-input"
                         value={formData.siteContactNumber || ''}
                         onChange={(e) => handleFieldChange('siteContactNumber', e.target.value)}
                         disabled={showSuccess}
                  />
                ) : (
                       <div className="form-input display-only">
                         {client.siteContactNumber ? (
                           <a href={`tel:${client.siteContactNumber}`}>
                             {client.siteContactNumber}
                           </a>
                         ) : (
                           'N/A'
                         )}
          </div>
        )}
                  </div>
                  </div>
                </div>
                  </div>

             {/* Error Messages */}
             {isEditMode && editError && (
               <div className="form-section">
                 <div className="section-content">
                   <div className="inline-error-message">
                     <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                       <circle cx="12" cy="12" r="10"/>
                       <line x1="15" y1="9" x2="9" y2="15"/>
                       <line x1="9" y1="9" x2="15" y2="15"/>
                     </svg>
                     {editError}
              </div>
            </div>
          </div>
        )}
      </div>
         )}

         {activeTab === 1 && <UsersTable />}
      </Box>



      {/* Delete Confirmation Bubble - Smart Positioning */}
      {showDeleteDialog && (
        <div 
          ref={setPopupRef}
          className="delete-bubble"
          style={{
            top: `${deleteButtonPosition.top}px`,
            left: `${deleteButtonPosition.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4>Delete Client</h4>
          <p>
            Are you sure you want to delete <strong>{client.companyName}</strong>? 
            This action cannot be undone and may affect associated users.
          </p>
          <div className="delete-bubble-actions">
            <button 
              className="btn-bubble-cancel" 
              onClick={handleCancelDelete}
              disabled={deleting}
            >
              Cancel
            </button>
            <button 
              className="btn-bubble-delete" 
              onClick={handleDeleteClient}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Client'}
            </button>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClientDetailView;
