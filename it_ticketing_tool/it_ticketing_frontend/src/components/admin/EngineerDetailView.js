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
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as LockResetIcon,
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
  Engineering as EngineeringIcon,
  Code as CodeIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import TooltipBubble from '../common/TooltipBubble';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';

// Custom tooltip with arrow for EngineerDetailView
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

// Designation is now a text input field, no dropdown options needed

// Employment type options
const employmentTypeOptions = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
  { value: 'Other', label: 'Other' },
];

// Role options for engineers
const roleOptions = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'senior_engineer', label: 'Senior Engineer' },
  { value: 'lead_engineer', label: 'Lead Engineer' },
  { value: 'principal_engineer', label: 'Principal Engineer' },
];

const EngineerDetailView = ({ user }) => {
  const { engineerId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = getFirestore(app);

  // State management
  const [engineerData, setEngineerData] = useState(null);
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
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Check for edit mode from URL parameters
  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    if (editMode && engineerData) {
      setIsEditMode(true);
      setFormData({ ...engineerData });
    }
  }, [searchParams, engineerData]);

  // Fetch engineer data
  useEffect(() => {
    if (!engineerId) return;

    const unsubscribeEngineer = onSnapshot(
      doc(db, 'users', engineerId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setEngineerData({ uid: docSnapshot.id, ...docSnapshot.data() });
        } else {
          setError('Engineer not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching engineer:', error);
        setError('Failed to load engineer data');
        setLoading(false);
      }
    );

    return () => unsubscribeEngineer();
  }, [engineerId, db]);

  // Handle edit engineer
  const handleEditEngineer = () => {
    setIsEditMode(true);
    setFormData({ ...engineerData });
    setEditError(null);
    setShowSuccess(false);
    setHasChanges(false);
  };

  // Handle reset password
  const handleResetPassword = () => {
    setResetPasswordModalOpen(true);
    setNewPassword('');
    setPasswordCopied(false);
  };

  const handleResetPasswordConfirm = async () => {
    setResetPasswordLoading(true);
    try {
      // Generate a new password (8 characters, alphanumeric)
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const newPasswordValue = generatePassword();
      setNewPassword(newPasswordValue);
      setResetPasswordLoading(false);
    } catch (error) {
      console.error('Error generating password:', error);
      setResetPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setResetPasswordLoading(true);
    try {
      // Update the password in Firebase
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${engineerId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          password: newPassword, 
          mustChangePassword: true 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      // If email checkbox is checked, send the password email
      if (emailSent) {
        try {
          const emailRes = await fetch(`${API_BASE_URL}/api/users/${engineerId}/send-password-email`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
              password: newPassword,
              userEmail: engineerData.email,
              userName: `${engineerData.firstName || ''} ${engineerData.lastName || ''}`.trim() || engineerData.name || 'Engineer',
              companyName: engineerData.clientname || engineerData.companyName || 'Company',
              loginUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'
            }),
          });
          
          if (emailRes.ok) {
            // Password reset and email sent successfully - no notification needed
          } else {
            // Password reset successful, but email failed to send - no notification needed
          }
        } catch (emailErr) {
          console.error('Email sending failed:', emailErr);
          // Password reset successful, but email failed to send - no notification needed
        }
      } else {
        // Password reset successfully - no notification needed
      }
      
      // Close the modal after successful update
      handleCloseResetPasswordModal();
    } catch (error) {
      console.error('Error updating password:', error);
      // Error occurred - no notification needed
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleCloseResetPasswordModal = () => {
    setResetPasswordModalOpen(false);
    setNewPassword('');
    setPasswordCopied(false);
    setEmailSent(false);
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
    if (!engineerData) return false;
    
    const editableFields = ['employeeId', 'contactNumber', 'managerEmail', 'employmentType', 'designation'];
    const hasFormChanges = editableFields.some(field => {
      const currentValue = formData[field] || '';
      const originalValue = engineerData[field] || '';
      return currentValue !== originalValue;
    });
    
    setHasChanges(hasFormChanges);
  };

  // Check for changes whenever formData changes
  useEffect(() => {
    if (isEditMode && engineerData) {
      checkForChanges();
    }
  }, [formData, isEditMode, engineerData]);

  // Calculate dropdown position
  const calculateRoleDropdownPosition = () => {
    const triggerElement = document.querySelector('.custom-dropdown-trigger');
    if (triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Calculate actual dropdown height based on number of options
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

  // Handle save engineer
  const handleSaveEngineer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setEditError(null);

    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${engineerId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update engineer');
      }

      setShowSuccess(true);
      
      // Update the engineer state with new data
      setEngineerData(prev => ({ ...prev, ...formData }));
      
    } catch (error) {
      console.error('Error updating engineer:', error);
      let errorMessage = error.message || 'Failed to update engineer. Please try again.';
      if (error.message && error.message.includes('email already in use')) {
        errorMessage = 'The email address is already in use by another account. Please use a different email address.';
      }
      setEditError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete engineer
  const handleDeleteEngineer = async (event) => {
    if (event) event.stopPropagation();
    setDeleting(true);
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users/${engineerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete engineer');

      setSnackbar({
        open: true,
        message: 'Engineer deleted successfully',
        severity: 'success'
      });

      // Navigate back to engineer list after deletion
      setTimeout(() => {
        navigate('/engineer-management');
      }, 1500);
    } catch (error) {
      console.error('Error deleting engineer:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete engineer',
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

  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading engineer details...
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
          onClick={() => navigate('/engineer-management')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Engineer Management
        </Button>
      </Box>
    );
  }

  if (!engineerData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Engineer not found
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
        
        /* Professional Profile Styles */
        .profile-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .profile-header {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .profile-header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 500;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        
        .profile-info {
          flex: 1;
        }
        
        .profile-name {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 0.125rem 0;
          color: #475569;
        }
        
        .profile-title {
          font-size: 0.875rem;
          font-weight: 400;
          margin: 0 0 0.25rem 0;
          color: #64748b;
        }
        
        .profile-email {
          font-size: 0.8rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        
        .profile-email a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 400;
        }
        
        .profile-email a:hover {
          text-decoration: underline;
        }
        
        .profile-stats {
          display: flex;
          gap: 1.25rem;
          margin-top: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e2e8f0;
        }
        
        .stat-item {
          text-align: left;
        }
        
        .stat-value {
          font-size: 0.875rem;
          font-weight: 500;
          display: block;
          color: #475569;
        }
        
        .stat-label {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 0.125rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          font-weight: 400;
        }
        
        .sections-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .section {
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        
        .section-header {
          background: #f8fafc;
          padding: 0.625rem 0.875rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .section-icon {
          width: 0.875rem;
          height: 0.875rem;
          color: #64748b;
        }
        
        .section-title {
          font-size: 0.8rem;
          font-weight: 500;
          color: #475569;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        
        .section-content {
          padding: 0.875rem;
        }
        
        .fields-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 0.875rem;
        }
        
        .field-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .field-label {
          font-size: 0.7rem;
          font-weight: 400;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        
        .field-value {
          font-size: 0.8rem;
          color: #475569;
          font-weight: 400;
          word-break: break-word;
        }
        
        .field-value a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 400;
        }
        
        .field-value a:hover {
          text-decoration: underline;
        }
        
        .field-value .empty {
          color: #94a3b8;
          font-style: italic;
          font-weight: 400;
        }
        
        
        /* Edit mode styles */
        .edit-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: #ffffff;
          transition: border-color 0.2s ease;
          font-family: inherit;
        }
        
        .edit-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .edit-input:hover {
          border-color: #9ca3af;
        }
        
        .edit-input.disabled {
          background-color: #f9fafb;
          color: #6b7280;
          border-color: #e5e7eb;
          cursor: not-allowed;
        }
        
        .edit-dropdown {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          background: #ffffff;
          transition: border-color 0.2s ease;
          font-family: inherit;
        }
        
        .edit-dropdown:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }
        
        .edit-dropdown:hover {
          border-color: #9ca3af;
        }
        
        .edit-dropdown.disabled {
          background-color: #f9fafb;
          color: #6b7280;
          border-color: #e5e7eb;
          cursor: not-allowed;
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
          .sections-container {
            gap: 0.625rem;
          }
          
          .fields-grid {
            grid-template-columns: 1fr;
            gap: 0.625rem;
          }
          
          .profile-header {
            padding: 0.75rem;
          }
          
          .profile-header-content {
            flex-direction: column;
            text-align: center;
            gap: 0.625rem;
          }
          
          .profile-stats {
            justify-content: center;
            flex-wrap: wrap;
            gap: 0.625rem;
          }
          
          .section-content {
            padding: 0.625rem;
          }
          
          .section-header {
            padding: 0.5rem 0.75rem;
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
            onClick={() => navigate('/engineer-management')}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <EngineeringIcon size={16} />
            Engineer Management
          </Link>
          <Typography variant="body2" color="text.primary">
            {engineerData.firstName} {engineerData.lastName}
          </Typography>
        </Breadcrumbs>

        {/* Title and Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="btn btn-secondary btn-small"
              onClick={() => navigate('/engineer-management')}
            >
              <ArrowBackIcon fontSize="small" />
              Back to Engineers
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
                    onClick={handleSaveEngineer}
                    disabled={isSubmitting || !hasChanges}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Engineer'}
                </button>
                </>
              ) : !isEditMode ? (
                <>
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 hover:text-purple-800 hover:bg-purple-200 rounded transition-all duration-200 ease-in-out cursor-pointer"
                    onClick={handleEditEngineer}
                    style={{ fontFamily: 'Source Sans 3', fontWeight: 400 }}
                  >
                    <EditIcon sx={{ fontSize: '16px' }} />
                    Edit
                </div>
                <div
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 hover:text-orange-800 hover:bg-orange-200 rounded transition-all duration-200 ease-in-out cursor-pointer"
                    onClick={handleResetPassword}
                    style={{ fontFamily: 'Source Sans 3', fontWeight: 400 }}
                  >
                    <LockResetIcon sx={{ fontSize: '16px' }} />
                    Reset Password
                </div>
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
      <div className="profile-container">
        {/* Success Message */}
        {isEditMode && showSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem', 
            padding: '0.75rem 1rem', 
            backgroundColor: 'white', 
            border: '1px solid #10b981', 
            borderRadius: '0.5rem', 
            marginBottom: '1.5rem',
            color: '#065f46',
            fontSize: '0.875rem',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg style={{ width: '1.25rem', height: '1.25rem', color: '#10b981' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span>Engineer updated successfully!</span>
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
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <svg style={{ width: '0.875rem', height: '0.875rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Close
            </button>
          </div>
        )}

        {/* Professional Profile Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {engineerData.firstName?.[0]?.toUpperCase() || 'E'}
            </div>
            <div className="profile-info">
              <h1 className="profile-name">
                {engineerData.firstName} {engineerData.lastName}
              </h1>
              <div className="profile-title">
                {engineerData.designation || 'Engineer'}
              </div>
              <div className="profile-email">
                <EmailIcon fontSize="small" />
                {engineerData.email ? (
                  <a href={`mailto:${engineerData.email}`}>
                    {engineerData.email}
                  </a>
                ) : (
                  'No email provided'
                )}
              </div>
            </div>
          </div>
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{engineerData.employeeId || 'N/A'}</span>
              <span className="stat-label">Employee ID</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{engineerData.employmentType || 'N/A'}</span>
              <span className="stat-label">Employment Type</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{engineerData.contactNumber || 'N/A'}</span>
              <span className="stat-label">Contact</span>
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="sections-container">
          {/* Contact Information Section */}
          <div className="section">
            <div className="section-header">
              <PhoneIcon className="section-icon" />
              <h3 className="section-title">Contact Information</h3>
            </div>
            <div className="section-content">
              <div className="fields-grid">
                <div className="field-item">
                  <div className="field-label">Contact Number</div>
                  <div className="field-value">
                    {isEditMode ? (
                      <input
                        type="tel"
                        className="edit-input"
                        value={formData.contactNumber || ''}
                        onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                        disabled={showSuccess}
                        placeholder="Enter contact number"
                      />
                    ) : (
                      engineerData.contactNumber ? (
                        <a href={`tel:${engineerData.contactNumber}`}>
                          {engineerData.contactNumber}
                        </a>
                      ) : (
                        <span className="empty">No contact number provided</span>
                      )
                    )}
                  </div>
                </div>
                
                <div className="field-item">
                  <div className="field-label">Manager Email</div>
                  <div className="field-value">
                    {isEditMode ? (
                      <input
                        type="email"
                        className="edit-input"
                        value={formData.managerEmail || ''}
                        onChange={(e) => handleFieldChange('managerEmail', e.target.value)}
                        disabled={showSuccess}
                        placeholder="Enter manager email"
                      />
                    ) : (
                      engineerData.managerEmail ? (
                        <a href={`mailto:${engineerData.managerEmail}`}>
                          {engineerData.managerEmail}
                        </a>
                      ) : (
                        <span className="empty">No manager email</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information Section */}
          <div className="section">
            <div className="section-header">
              <WorkIcon className="section-icon" />
              <h3 className="section-title">Professional Information</h3>
            </div>
            <div className="section-content">
              <div className="fields-grid">
                <div className="field-item">
                  <div className="field-label">Employee ID</div>
                  <div className="field-value">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="edit-input"
                        value={formData.employeeId || ''}
                        onChange={(e) => handleFieldChange('employeeId', e.target.value)}
                        disabled={showSuccess}
                        placeholder="Enter employee ID"
                      />
                    ) : (
                      engineerData.employeeId || <span className="empty">No employee ID</span>
                    )}
                  </div>
                </div>
                
                <div className="field-item">
                  <div className="field-label">Designation</div>
                  <div className="field-value">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="edit-input"
                        value={formData.designation || ''}
                        onChange={(e) => handleFieldChange('designation', e.target.value)}
                        placeholder="Enter designation"
                        disabled={showSuccess}
                      />
                    ) : (
                      engineerData.designation || <span className="empty">No designation</span>
                    )}
                  </div>
                </div>
                
                <div className="field-item">
                  <div className="field-label">Employment Type</div>
                  <div className="field-value">
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
                      engineerData.employmentType || <span className="empty">No employment type</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {isEditMode && editError && (
          <div className="profile-card" style={{ marginTop: '1.5rem', borderColor: '#dc2626' }}>
            <div className="card-content">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626'
              }}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span style={{ fontWeight: '500' }}>{editError}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
          <h4>Delete Engineer</h4>
          <p>
            Are you sure you want to delete <strong>{engineerData.firstName} {engineerData.lastName}</strong>? 
            This action cannot be undone and will permanently remove the engineer from the system.
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
              onClick={handleDeleteEngineer}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Engineer'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Reset Password Popup */}
      {resetPasswordModalOpen && (
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
            width: '90%',
            maxWidth: '650px',
            height: 'auto',
            maxHeight: '350px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
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
                onClick={handleCloseResetPasswordModal}
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
              flexDirection: 'row',
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
                      Reset password for <strong>{engineerData?.firstName} {engineerData?.lastName}</strong>?
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
                  {/* Left Side - Password Display */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      padding: '16px'
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
                          Generated Password
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
                          disabled={resetPasswordLoading}
                          style={{
                            marginRight: '8px',
                            transform: 'scale(1.1)',
                            cursor: resetPasswordLoading ? 'not-allowed' : 'pointer'
                          }}
                        />
                        <label htmlFor="emailSent" style={{
                          fontSize: '12px',
                          color: '#495057',
                          cursor: resetPasswordLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{ marginRight: '6px' }}>📧</span>
                          Email password to engineer
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Instructions and Status */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {/* Instructions */}
                    <div style={{
                      backgroundColor: '#e7f3ff',
                      border: '1px solid #b3d9ff',
                      borderRadius: '4px',
                      padding: '12px',
                      marginBottom: '12px'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#0066cc',
                        lineHeight: '1.3'
                      }}>
                        <strong>Instructions:</strong> Copy this password and share it securely with the engineer. 
                        The engineer will be required to change it on their first login.
                      </p>
                    </div>

                    {/* Status Messages */}
                    {!passwordCopied && !emailSent && (
                      <div style={{
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: '3px',
                        padding: '10px',
                        marginBottom: '12px'
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#856404',
                          fontWeight: 500
                        }}>
                          ⚠️ You must either copy the password or check the email option before proceeding.
                        </p>
                      </div>
                    )}
                    
                    {passwordCopied && (
                      <div style={{
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '3px',
                        padding: '10px',
                        marginBottom: '12px'
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#155724',
                          fontWeight: 500
                        }}>
                          ✅ Password copied! You can now proceed with the update.
                        </p>
                      </div>
                    )}
                    
                    {emailSent && (
                      <div style={{
                        backgroundColor: '#d4edda',
                        border: '1px solid #c3e6cb',
                        borderRadius: '3px',
                        padding: '10px',
                        marginBottom: '12px'
                      }}>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#155724',
                          fontWeight: 500
                        }}>
                          ✅ Email option selected! Password will be sent via email when you update.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px 16px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              {!newPassword ? (
                <>
                  <button
                    onClick={handleCloseResetPasswordModal}
                    disabled={resetPasswordLoading}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: resetPasswordLoading ? 'not-allowed' : 'pointer',
                      opacity: resetPasswordLoading ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!resetPasswordLoading) {
                        e.target.style.backgroundColor = '#5a6268';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!resetPasswordLoading) {
                        e.target.style.backgroundColor = '#6c757d';
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPasswordConfirm}
                    disabled={resetPasswordLoading}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: resetPasswordLoading ? 'not-allowed' : 'pointer',
                      opacity: resetPasswordLoading ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!resetPasswordLoading) {
                        e.target.style.backgroundColor = '#0056b3';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!resetPasswordLoading) {
                        e.target.style.backgroundColor = '#007bff';
                      }
                    }}
                  >
                    {resetPasswordLoading ? '⏳ Resetting...' : '🔒 Reset Password'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCloseResetPasswordModal}
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
                    disabled={resetPasswordLoading || (!passwordCopied && !emailSent)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: (resetPasswordLoading || (!passwordCopied && !emailSent)) ? 'not-allowed' : 'pointer',
                      opacity: (resetPasswordLoading || (!passwordCopied && !emailSent)) ? 0.6 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!resetPasswordLoading && (passwordCopied || emailSent)) {
                        e.target.style.backgroundColor = '#218838';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!resetPasswordLoading && (passwordCopied || emailSent)) {
                        e.target.style.backgroundColor = '#28a745';
                      }
                    }}
                  >
                    {resetPasswordLoading ? '⏳ Updating...' : '✅ Update Password'}
                  </button>
                </>
              )}
            </div>
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

export default EngineerDetailView;
