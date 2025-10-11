import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
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
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ContactPhone as ContactPhoneIcon,
  ContactMail as ContactMailIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  VpnKey as VpnKeyIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import TooltipBubble from '../common/TooltipBubble';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';

// Custom tooltip with arrow for UserDetailView
const TooltipWithArrow = ({ title, children, id }) => {
  const [show, setShow] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const iconRef = React.useRef(null);

  React.useEffect(() => {
    if (show && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 200;
      const tooltipHeight = 40;
      
      // Calculate optimal position
      let topPosition = rect.bottom + 8;
      let leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      
      // Check if tooltip would go off the bottom of viewport
      if (topPosition + tooltipHeight > viewportHeight - 10) {
        topPosition = rect.top - tooltipHeight - 8;
      }
      
      // Ensure tooltip doesn't go off-screen
      if (leftPosition + tooltipWidth > viewportWidth - 10) {
        leftPosition = viewportWidth - tooltipWidth - 10;
      }
      if (leftPosition < 10) {
        leftPosition = 10;
      }
      
      setCoords({
        top: topPosition,
        left: leftPosition
      });
    }
  }, [show]);

  return (
    <div
      ref={iconRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}
    >
      {children}
      {show && ReactDOM.createPortal(
        <div
          data-tooltip-id={id || 'tooltip-with-arrow'}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 9999,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {title}
          {/* Arrow pointing up */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1f2937'
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

// Designation options
const designationOptions = [
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

// Employment type options
const employmentTypeOptions = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
  { value: 'Other', label: 'Other' },
];

// Role options
const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'site_admin', label: 'Site Admin' },
];


const UserDetailView = ({ user }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = getFirestore(app);

  // State management
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleDropdownPosition, setRoleDropdownPosition] = useState({ openUpward: false });
  const [hasChanges, setHasChanges] = useState(false);
  
  // Password reset state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  // Check for edit mode from URL parameters
  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    if (editMode && userData) {
      setIsEditMode(true);
      setFormData({ ...userData });
    }
  }, [searchParams, userData]);

  // Fetch user data
  useEffect(() => {
    if (!userId) return;

    const unsubscribeUser = onSnapshot(
      doc(db, 'users', userId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserData({ uid: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setError('User not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    );

    return () => unsubscribeUser();
  }, [userId, db]);

  // Handle edit user
  const handleEditUser = () => {
    setIsEditMode(true);
    setFormData({ ...userData });
    setEditError(null);
    setShowSuccess(false);
    setHasChanges(false);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setFormData({});
    setEditError(null);
    setShowSuccess(false);
    setRoleDropdownOpen(false);
    setHasChanges(false);
  };

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Check if form has changes
  const checkForChanges = () => {
    if (!userData) return false;
    
    const editableFields = ['employeeId', 'contactNumber', 'managerEmail', 'employmentType', 'designation', 'role'];
    const hasFormChanges = editableFields.some(field => {
      const currentValue = formData[field] || '';
      const originalValue = userData[field] || '';
      return currentValue !== originalValue;
    });
    
    setHasChanges(hasFormChanges);
  };

  // Check for changes whenever formData changes
  useEffect(() => {
    if (isEditMode && userData) {
      checkForChanges();
    }
  }, [formData, isEditMode, userData]);

  // Calculate dropdown position
  const calculateRoleDropdownPosition = () => {
    const triggerElement = document.querySelector('.custom-dropdown-trigger');
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Calculate actual dropdown height based on number of options (2 options: User, Site Admin)
      const optionHeight = 48; // Approximate height per option
      const dropdownHeight = roleOptions.length * optionHeight;
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setRoleDropdownPosition({ 
        openUpward: shouldOpenUpward,
        top: shouldOpenUpward ? rect.top - dropdownHeight : rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Handle save user
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setShowSuccess(true);
      
      // Update the user state with new data
      setUserData(prev => ({ ...prev, ...formData }));
      
    } catch (error) {
      console.error('Error updating user:', error);
      let errorMessage = error.message || 'Failed to update user. Please try again.';
      if (error.message && error.message.includes('email already in use')) {
        errorMessage = 'The email address is already in use by another account. Please use a different email address.';
      }
      setEditError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (event) => {
    if (event) event.stopPropagation();
    setDeleting(true);
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setSnackbar({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });

      // Navigate back to user list after deletion
      setTimeout(() => {
        navigate('/user-management');
      }, 1500);
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete user',
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

  // Close role dropdown when clicking outside and handle scroll/resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roleDropdownOpen && !event.target.closest('.custom-role-dropdown')) {
        setRoleDropdownOpen(false);
      }
    };

    const handleScroll = () => {
      if (roleDropdownOpen) {
        calculateRoleDropdownPosition();
      }
    };

    const handleResize = () => {
      if (roleDropdownOpen) {
        calculateRoleDropdownPosition();
      }
    };

    if (roleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [roleDropdownOpen]);

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

  // Password reset functions
  const handlePasswordReset = async () => {
    if (!userData) return;
    
    setPasswordResetLoading(true);
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.uid}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      const data = await response.json();
      setNewPassword(data.newPassword);
      // Keep emailSent as true by default, only change if explicitly set to false
      setEmailSent(data.emailSent !== false);

    } catch (error) {
      console.error('Error resetting password:', error);
      // Just log the error, don't show snackbar notification
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordResetModal(false);
    setNewPassword('');
    setPasswordCopied(false);
    setEmailSent(true);
    setPasswordUpdateSuccess(false);
  };

  const handleUpdatePassword = async () => {
    if (!userData || !newPassword) return;
    
    setPasswordResetLoading(true);
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.uid}/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          password: newPassword, 
          mustChangePassword: true,
          sendEmail: emailSent 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password');
      }

      // Show success state
      setPasswordUpdateSuccess(true);
      
      // Close modal after successful update without showing snackbar
      setTimeout(() => {
        handleClosePasswordModal();
      }, 2000);
      
    } catch (error) {
      console.error('Password update error:', error);
      // Just log the error, don't show snackbar notification
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading user details...
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
        <Button
          variant="outlined"
          onClick={() => navigate('/user-management')}
          startIcon={<ArrowBackIcon />}
        >
          Back to User Management
        </Button>
      </Box>
    );
  }

  if (!userData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          User not found
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        bgcolor: '#f8fafc', 
        minHeight: '100vh',
      }}
    >
      <style>{`
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
          position: relative;
          z-index: 1;
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
        
        .form-input.disabled-field {
          background-color: #f3f4f6;
          color: #6b7280;
          border-color: #d1d5db;
          cursor: not-allowed;
          opacity: 0.7;
        }
        
        .form-input.disabled-field a {
          color: #6b7280;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        /* Simple form grid styling */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 0.75rem;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
        
        /* Custom role dropdown styling */
        .custom-role-dropdown {
          position: relative;
          display: block;
        }
        
        .custom-dropdown-trigger {
          position: relative;
          z-index: 10;
        }
        
        .custom-dropdown-menu {
          background: white;
          border: 1px solid #d1d5db;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          max-height: 150px;
          overflow-y: auto;
          min-width: 200px;
        }
        
        .dropdown-downward {
          border-radius: 0 0 0.375rem 0.375rem;
          border-top: none;
        }
        
        .dropdown-upward {
          border-radius: 0.375rem 0.375rem 0 0;
          border-bottom: none;
        }
        
        .custom-dropdown-option {
          width: 100%;
          padding: 0.75rem;
          text-align: left;
          border: none;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .custom-dropdown-option:last-child {
          border-bottom: none;
        }
        
        .custom-dropdown-option:hover {
          background-color: #f3f4f6;
          color: #1f2937;
        }
        
        .custom-dropdown-option.selected {
          background-color: #dbeafe;
          color: #1e40af;
          font-weight: 500;
        }
        
        .custom-dropdown-option:focus {
          outline: none;
          background-color: #e5e7eb;
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
            onClick={() => navigate('/user-management')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <GroupIcon size={16} />
            User Management
          </Link>
          <Typography variant="body2" color="text.primary">
            {userData.firstName} {userData.lastName}
          </Typography>
        </Breadcrumbs>

        {/* Title and Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => navigate('/user-management')}
            >
              <ArrowBackIcon fontSize="small" />
              Back to Users
            </button>
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
                    onClick={handleSaveUser}
                    disabled={isSubmitting || !hasChanges}
                  >
                    {isSubmitting ? 'Updating...' : 'Update User'}
                </button>
                </>
              ) : !isEditMode ? (
                <>
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:text-purple-800 hover:bg-purple-100 rounded transition-all duration-200 ease-in-out cursor-pointer"
                    onClick={handleEditUser}
                    style={{ fontFamily: 'Source Sans 3', fontWeight: 400 }}
                  >
                    Edit
                </div>
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:text-orange-800 hover:bg-orange-100 rounded transition-all duration-200 ease-in-out cursor-pointer"
                    onClick={() => setShowPasswordResetModal(true)}
                    style={{ fontFamily: 'Source Sans 3', fontWeight: 400 }}
                  >
                    Reset Password
                </div>
                  <button
                    className="btn btn-danger btn-small"
                    onClick={handleDeleteClick}
                    ref={setDeleteButtonRef}
                    style={{ fontFamily: 'Source Sans 3', fontWeight: 400 }}
                  >
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
               <span>User updated successfully!</span>
                </div>
              <button
               type="button"
               onClick={() => {
                 setShowSuccess(false);
                 setIsEditMode(false);
                 setFormData({});
                 setHasChanges(false);
               }}
                style={{
                 backgroundColor: 'transparent', 
                 color: '#065f46', 
                  border: '1px solid #10b981',
                 padding: '0.25rem 0.5rem',
                 borderRadius: '0.25rem',
                 fontSize: '0.7rem',
                  fontWeight: '500',
                 cursor: 'pointer',
                 height: '1.75rem',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.25rem'
                }}
              >
                <svg style={{ width: '0.75rem', height: '0.75rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Close
              </button>
          </div>
         )}

        {/* User Information Section */}
        <div className="form-section">
          <div className="section-header">
            <PersonIcon className="section-icon" />
            <h3>User Information</h3>
          </div>
          <div className="section-content">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">First Name</label>
                {isEditMode ? (
                  <TooltipWithArrow title="This field cannot be edited">
                    <div className="form-input display-only disabled-field">{userData.firstName || 'N/A'}</div>
                  </TooltipWithArrow>
                ) : (
                  <div className="form-input display-only">{userData.firstName || 'N/A'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                {isEditMode ? (
                  <TooltipWithArrow title="This field cannot be edited">
                    <div className="form-input display-only disabled-field">{userData.lastName || 'N/A'}</div>
                  </TooltipWithArrow>
                ) : (
                  <div className="form-input display-only">{userData.lastName || 'N/A'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                {isEditMode ? (
                  <TooltipWithArrow title="This field cannot be edited">
                    <div className="form-input display-only disabled-field">
                      {userData.email ? (
                        <a href={`mailto:${userData.email}`}>
                          {userData.email}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </div>
                  </TooltipWithArrow>
                ) : (
                  <div className="form-input display-only">
                    {userData.email ? (
                      <a href={`mailto:${userData.email}`}>
                        {userData.email}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID</label>
                {isEditMode ? (
                  <input
                    type="text"
                    className="form-input"
                    value={formData.employeeId || ''}
                    onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                    disabled={showSuccess}
                  />
                ) : (
                  <div className="form-input display-only">{userData.employeeId || 'N/A'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                {isEditMode ? (
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.contactNumber || ''}
                    onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                    disabled={showSuccess}
                  />
                ) : (
                  <div className="form-input display-only">
                    {userData.contactNumber ? (
                      <a href={`tel:${userData.contactNumber}`}>
                        {userData.contactNumber}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Manager Email</label>
                {isEditMode ? (
                  <input
                    type="email"
                    className="form-input"
                    value={formData.managerEmail || ''}
                    onChange={(e) => handleFieldChange('managerEmail', e.target.value)}
                    disabled={showSuccess}
                  />
                ) : (
                  <div className="form-input display-only">
                    {userData.managerEmail ? (
                      <a href={`mailto:${userData.managerEmail}`}>
                        {userData.managerEmail}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Employment Type</label>
                {isEditMode ? (
                  <CustomDropdown
                    value={formData.employmentType || ''}
                    onChange={(value) => handleFieldChange('employmentType', value)}
                    options={employmentTypeOptions}
                    placeholder="Select employment type"
                    size="sm"
                    disabled={showSuccess}
                  />
                ) : (
                  <div className="form-input display-only">{userData.employmentType || 'N/A'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Designation</label>
                {isEditMode ? (
                  <CustomDropdown
                    value={formData.designation || ''}
                    onChange={(value) => handleFieldChange('designation', value)}
                    options={designationOptions}
                    placeholder="Select designation"
                    size="sm"
                    disabled={showSuccess}
                  />
                ) : (
                  <div className="form-input display-only">{userData.designation || 'N/A'}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                {isEditMode ? (
                  <div className="custom-role-dropdown">
                    <button
                      type="button"
                      className="form-input custom-dropdown-trigger"
                      onClick={() => {
                        if (!roleDropdownOpen) {
                          calculateRoleDropdownPosition();
                        }
                        setRoleDropdownOpen(!roleDropdownOpen);
                      }}
                      disabled={showSuccess}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>
                        {roleOptions.find(opt => opt.value === formData.role)?.label || 'Select Role'}
                      </span>
                      <svg 
                        className={`w-4 h-4 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {roleDropdownOpen && (
                      <div 
                        className={`custom-dropdown-menu ${roleDropdownPosition.openUpward ? 'dropdown-upward' : 'dropdown-downward'}`}
                        style={{
                          position: 'fixed',
                          zIndex: 9999,
                          top: roleDropdownPosition.top,
                          left: roleDropdownPosition.left,
                          width: roleDropdownPosition.width
                        }}
                      >
                        {roleOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`custom-dropdown-option ${formData.role === option.value ? 'selected' : ''}`}
                            onClick={() => {
                              handleFieldChange('role', option.value);
                              setRoleDropdownOpen(false);
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-input display-only">
                    <Chip
                      label={userData.role === 'site_admin' ? 'Site Admin' : 'User'}
                      size="small"
                      color={userData.role === 'site_admin' ? 'primary' : 'default'}
                      variant={userData.role === 'site_admin' ? 'filled' : 'outlined'}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Company</label>
                {isEditMode ? (
                  <TooltipWithArrow title="This field cannot be edited">
                    <div className="form-input display-only disabled-field">{userData.client_name || userData.companyName || 'N/A'}</div>
                  </TooltipWithArrow>
                ) : (
                  <div className="form-input display-only">{userData.client_name || userData.companyName || 'N/A'}</div>
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
          <h4>Delete User</h4>
          <p>
            Are you sure you want to delete <strong>{userData.firstName} {userData.lastName}</strong>? 
            This action cannot be undone and will permanently remove the user from the system.
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
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Reset Password Popup */}
      {showPasswordResetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: window.innerWidth < 768 ? '95%' : '90%',
            maxWidth: window.innerWidth < 768 ? '100%' : '650px',
            height: 'auto',
            maxHeight: window.innerWidth < 768 ? '90vh' : '350px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            margin: window.innerWidth < 768 ? '10px' : '0'
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px 8px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#333'
              }}>
          Reset Password
              </h3>
              <button
                onClick={handleClosePasswordModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              flex: 1,
              flexDirection: window.innerWidth < 768 ? 'column' : 'row',
              gap: '16px',
              alignItems: 'flex-start'
            }}>
          {!newPassword ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '20px' }}>🔒</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#333',
                      marginBottom: '6px'
                    }}>
                      Reset password for <strong>{userData?.firstName} {userData?.lastName}</strong>?
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      A new password will be generated and displayed for you to copy.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Password Display */}
                  <div style={{ width: '100%' }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      padding: '16px',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '14px', marginRight: '6px' }}>🔑</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1976d2'
                        }}>
                          New Password Generated
                        </span>
                      </div>
                      
                      <div style={{
                display: 'flex',
                alignItems: 'center',
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        padding: '10px',
                        gap: '6px',
                        marginBottom: '12px'
                      }}>
                        <input
                          type="text"
                          value={newPassword}
                          readOnly
                          style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#2c3e50',
                            letterSpacing: '0.5px',
                            backgroundColor: 'transparent'
                          }}
                        />
                        <button
                  onClick={handleCopyPassword}
                  disabled={passwordCopied}
                          style={{
                            backgroundColor: passwordCopied ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: passwordCopied ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            minWidth: '60px'
                          }}
                          onMouseOver={(e) => {
                            if (!passwordCopied) {
                              e.target.style.backgroundColor = '#218838';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!passwordCopied) {
                              e.target.style.backgroundColor = '#28a745';
                            }
                          }}
                        >
                          {passwordCopied ? '✓' : 'Copy'}
                        </button>
                      </div>

                      {/* Email Option */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '3px',
                        border: '1px solid #e9ecef'
                      }}>
                        <input
                          type="checkbox"
                          id="emailSent"
                          checked={emailSent}
                          onChange={(e) => setEmailSent(e.target.checked)}
                          disabled={passwordResetLoading}
                          style={{
                            marginRight: '8px',
                            transform: 'scale(1.1)',
                            cursor: passwordResetLoading ? 'not-allowed' : 'pointer'
                          }}
                        />
                        <label htmlFor="emailSent" style={{
                          fontSize: '12px',
                          color: '#495057',
                          cursor: passwordResetLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{ marginRight: '6px' }}>📧</span>
                          Email password to user
                        </label>
                      </div>
                    </div>

                    {/* Success Message - Only show after Update Password is clicked */}
                    {passwordUpdateSuccess && (
                      <div style={{
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#155724',
                          fontWeight: 500
                        }}>
                          ✅ Password has been reset successfully! The user will be required to change it on their first login.
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '8px'
                    }}>
                      <button
                        onClick={handleClosePasswordModal}
                        style={{
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#5a6268'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
                      >
                        Close
                      </button>
                      <button
                        onClick={handleUpdatePassword}
                disabled={passwordResetLoading}
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: passwordResetLoading ? 'not-allowed' : 'pointer',
                          opacity: passwordResetLoading ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (!passwordResetLoading) {
                            e.target.style.backgroundColor = '#218838';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!passwordResetLoading) {
                            e.target.style.backgroundColor = '#28a745';
                          }
                        }}
                      >
                        {passwordResetLoading ? '⏳ Updating...' : '✅ Update Password'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer - Only for initial reset confirmation */}
            {!newPassword && (
              <div style={{
                padding: '10px 16px 16px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px'
              }}>
                <button
              onClick={handleClosePasswordModal}
                  disabled={passwordResetLoading}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: passwordResetLoading ? 'not-allowed' : 'pointer',
                    opacity: passwordResetLoading ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!passwordResetLoading) {
                      e.target.style.backgroundColor = '#5a6268';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!passwordResetLoading) {
                      e.target.style.backgroundColor = '#6c757d';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordReset}
                  disabled={passwordResetLoading}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: passwordResetLoading ? 'not-allowed' : 'pointer',
                    opacity: passwordResetLoading ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!passwordResetLoading) {
                      e.target.style.backgroundColor = '#0056b3';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!passwordResetLoading) {
                      e.target.style.backgroundColor = '#007bff';
                    }
                  }}
                >
                  {passwordResetLoading ? '⏳ Resetting...' : '🔒 Reset Password'}
                </button>
              </div>
            )}
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

export default UserDetailView;
