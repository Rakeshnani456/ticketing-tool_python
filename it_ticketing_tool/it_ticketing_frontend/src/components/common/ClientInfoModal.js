import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Typography, Box, IconButton, Collapse, Alert, InputAdornment, Checkbox, FormControlLabel } from '@mui/material';
import { Close as CloseIcon, Business as BusinessIcon, Person as PersonIcon, AdminPanelSettings as AdminIcon, Phone as PhoneIcon, Email as EmailIcon, Language as WebsiteIcon, LocationOn as LocationIcon, Save as SaveIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

// Designation is now a text input field, no dropdown options needed

// Validation schema with better handling for empty values
const validationSchema = yup.object().shape({
  companyName: yup.string().required('Company name is required').min(2, 'Minimum 2 characters').max(100, 'Maximum 100 characters'),
  website: yup.string().nullable().transform((value) => (value === '' ? null : value)),
  location: yup.string().nullable().max(100, 'Maximum 100 characters'),
  clientContactCountryCode: yup.string().required('Country code is required').matches(/^[\+]?[0-9]{1,4}$/, 'Invalid country code'),
  clientContactNumber: yup.string().required('Contact number is required').matches(/^[0-9\s\-\(\)]{7,15}$/, 'Invalid phone number'),
  authFirstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  authLastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  authContactCountryCode: yup.string().required('Country code is required').matches(/^[\+]?[0-9]{1,4}$/, 'Invalid country code'),
  authContactNumber: yup.string().required('Contact number is required').matches(/^[0-9\s\-\(\)]{7,15}$/, 'Invalid phone number'),
  authOfficeEmail: yup.string().email('Invalid email').required('Office email is required').max(100, 'Maximum 100 characters'),
  authPersonalEmail: yup.string().nullable().transform((value) => (value === '' ? null : value)).email('Invalid email').max(100, 'Maximum 100 characters'),
  authDesignation: yup.string().nullable().transform((value) => (value === '' ? 'Other' : value)).required('Designation is required'),
  siteFirstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  siteLastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  siteEmail: yup.string().email('Invalid email').required('Email is required').max(100, 'Maximum 100 characters'),
  siteContactCountryCode: yup.string().required('Country code is required').matches(/^[\+]?[0-9]{1,4}$/, 'Invalid country code'),
  siteContactNumber: yup.string().required('Contact number is required').matches(/^[0-9\s\-\(\)]{7,15}$/, 'Invalid phone number'),
  siteDesignation: yup.string().nullable().transform((value) => (value === '' ? 'Other' : value)).required('Designation is required'),
});

const initialState = {
  companyName: '',
  website: '',
  location: '',
  clientContactCountryCode: '+91',
  clientContactNumber: '',
  authFirstName: '',
  authLastName: '',
  authContactCountryCode: '+91',
  authContactNumber: '',
  authOfficeEmail: '',
  authPersonalEmail: '',
  authDesignation: 'Other',
  siteFirstName: '',
  siteLastName: '',
  siteEmail: '',
  siteContactCountryCode: '+91',
  siteContactNumber: '',
  siteDesignation: 'Other',
};

const ClientInfoModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sameAsAuth, setSameAsAuth] = useState(false);

  const { handleSubmit, control, reset, formState: { errors, isValid }, clearErrors, watch } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialData || initialState,
    mode: 'onChange',
  });

  const { authFirstName, authLastName, authContactCountryCode, authContactNumber, authOfficeEmail, authPersonalEmail, authDesignation } = watch();

  // Auto-fill site admin fields when checkbox is checked or auth fields change
  useEffect(() => {
    if (sameAsAuth) {
      reset({
        ...watch(),
        siteFirstName: authFirstName,
        siteLastName: authLastName,
        siteContactCountryCode: authContactCountryCode,
        siteContactNumber: authContactNumber,
        siteEmail: authOfficeEmail,
        siteDesignation: authDesignation,
      });
    }
  }, [sameAsAuth, authFirstName, authLastName, authContactCountryCode, authContactNumber, authOfficeEmail, authDesignation, reset]);

  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      // Ensure all required fields have values when editing
      const formData = initialData ? {
        ...initialState,
        ...initialData,
        authDesignation: initialData.authDesignation || 'Other',
        siteDesignation: initialData.siteDesignation || 'Other',
      } : initialState;
      reset(formData);
      clearErrors();
      setSameAsAuth(false); // Reset checkbox state
    }
  }, [isOpen, reset, initialData, clearErrors]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (onSave) onSave(data);
      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving client info:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    setIsSubmitting(false);
    reset(initialState);
    clearErrors();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
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
          {initialData ? 'Edit Client Information' : 'Add Client Information'}
        </Typography>
        <IconButton onClick={handleClose} disabled={isSubmitting} className="text-white hover:bg-white hover:bg-opacity-10 transition-colors">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent className="p-4 sm:p-5 bg-gray-50">
        <Collapse in={showSuccess}>
          <Alert severity="success" className="mb-4 text-sm" sx={{ borderRadius: 0 }}>
            Client information saved successfully!
          </Alert>
        </Collapse>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
          {/* Hidden password field to trick Chrome autofill */}
          <input type="password" style={{ display: 'none' }} autoComplete="new-password" />

          {/* Client Information Section */}
          <Box className="bg-white p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <BusinessIcon className="text-gray-600 mr-2" fontSize="small" />
              <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>Client Information</Typography>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Company Name *"
                    error={!!errors.companyName}
                    helperText={errors.companyName?.message}
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><BusinessIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <Controller
                name="website"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Website"
                    error={!!errors.website}
                    helperText={errors.website?.message}
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><WebsiteIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Location"
                    helperText="City, State/Country"
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LocationIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <div className="flex gap-2">
                <Controller
                  name="clientContactCountryCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Code *"
                      error={!!errors.clientContactCountryCode}
                      helperText={errors.clientContactCountryCode?.message}
                      size="small"
                      placeholder="+91"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                      }}
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.7rem' } }}
                      autoComplete="new-password"
                      sx={{ 
                        '& .MuiInputBase-input': { fontSize: '0.85rem' },
                        minWidth: '80px',
                        maxWidth: '80px',
                        flexShrink: 0
                      }}
                    />
                  )}
                />
                <Controller
                  name="clientContactNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Number *"
                      error={!!errors.clientContactNumber}
                      helperText={errors.clientContactNumber?.message}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                      autoComplete="new-password"
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                    />
                  )}
                />
              </div>
            </div>
          </Box>

          {/* Authorized Person Section */}
          <Box className="bg-white p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <PersonIcon className="text-gray-600 mr-2" fontSize="small" />
              <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>Authorized Person</Typography>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Controller
                name="authFirstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    error={!!errors.authFirstName}
                    helperText={errors.authFirstName?.message}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <Controller
                name="authLastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    error={!!errors.authLastName}
                    helperText={errors.authLastName?.message}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <div className="flex gap-2">
                <Controller
                  name="authContactCountryCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Code *"
                      error={!!errors.authContactCountryCode}
                      helperText={errors.authContactCountryCode?.message}
                      size="small"
                      placeholder="+91"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                      }}
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.7rem' } }}
                      autoComplete="new-password"
                      sx={{ 
                        '& .MuiInputBase-input': { fontSize: '0.85rem' },
                        minWidth: '80px',
                        maxWidth: '80px',
                        flexShrink: 0
                      }}
                    />
                  )}
                />
                <Controller
                  name="authContactNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Number *"
                      error={!!errors.authContactNumber}
                      helperText={errors.authContactNumber?.message}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                      autoComplete="new-password"
                      sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                    />
                  )}
                />
              </div>
              <Controller
                name="authDesignation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Designation *"
                    error={!!errors.authDesignation}
                    helperText={errors.authDesignation?.message}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <Controller
                name="authOfficeEmail"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Office Email *"
                    error={!!errors.authOfficeEmail}
                    helperText={errors.authOfficeEmail?.message}
                    fullWidth
                    type="email"
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
              <Controller
                name="authPersonalEmail"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Personal Email"
                    error={!!errors.authPersonalEmail}
                    helperText={errors.authPersonalEmail?.message || 'Optional'}
                    fullWidth
                    type="email"
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                  />
                )}
              />
            </div>
          </Box>

          {/* Site Administrator Section */}
          <Box className="bg-white p-4 border border-gray-200">
            <div className="flex items-center mb-3">
              <AdminIcon className="text-gray-600 mr-2" fontSize="small" />
              <Typography variant="subtitle1" className="font-semibold text-gray-800" sx={{ fontSize: '0.9rem' }}>Site Administrator</Typography>
            </div>
            
            {/* Checkbox for Same as Authorized Person - Inside Site Administrator box */}
            <Box className="mb-3">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sameAsAuth}
                    onChange={(e) => setSameAsAuth(e.target.checked)}
                    name="sameAsAuth"
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.75rem' }}>
                    Same as Authorized Person
                  </Typography>
                }
              />
            </Box>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Controller
                name="siteFirstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    error={!!errors.siteFirstName}
                    helperText={errors.siteFirstName?.message}
                    fullWidth
                    size="small"
                    disabled={sameAsAuth}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ 
                      '& .MuiInputBase-input': { fontSize: '0.85rem' },
                      '& .Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }
                    }}
                  />
                )}
              />
              <Controller
                name="siteLastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    error={!!errors.siteLastName}
                    helperText={errors.siteLastName?.message}
                    fullWidth
                    size="small"
                    disabled={sameAsAuth}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ 
                      '& .MuiInputBase-input': { fontSize: '0.85rem' },
                      '& .Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }
                    }}
                  />
                )}
              />
              <Controller
                name="siteEmail"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email *"
                    error={!!errors.siteEmail}
                    helperText={errors.siteEmail?.message}
                    fullWidth
                    type="email"
                    size="small"
                    disabled={sameAsAuth}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ 
                      '& .MuiInputBase-input': { fontSize: '0.85rem' },
                      '& .Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }
                    }}
                  />
                )}
              />
              <div className="flex gap-2">
                <Controller
                  name="siteContactCountryCode"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Code *"
                      error={!!errors.siteContactCountryCode}
                      helperText={errors.siteContactCountryCode?.message}
                      size="small"
                      disabled={sameAsAuth}
                      placeholder="+91"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: '1.1rem', color: 'text.secondary' }} /></InputAdornment>,
                      }}
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.7rem' } }}
                      autoComplete="new-password"
                      sx={{ 
                        '& .MuiInputBase-input': { fontSize: '0.85rem' },
                        minWidth: '80px',
                        maxWidth: '80px',
                        flexShrink: 0,
                        '& .Mui-disabled': {
                          backgroundColor: '#f5f5f5',
                          color: '#666'
                        }
                      }}
                    />
                  )}
                />
                <Controller
                  name="siteContactNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Contact Number *"
                      error={!!errors.siteContactNumber}
                      helperText={errors.siteContactNumber?.message}
                      fullWidth
                      size="small"
                      disabled={sameAsAuth}
                      InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                      autoComplete="new-password"
                      sx={{ 
                        '& .MuiInputBase-input': { fontSize: '0.85rem' },
                        '& .Mui-disabled': {
                          backgroundColor: '#f5f5f5',
                          color: '#666'
                        }
                      }}
                    />
                  )}
                />
              </div>
              <Controller
                name="siteDesignation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Designation *"
                    error={!!errors.siteDesignation}
                    helperText={errors.siteDesignation?.message}
                    fullWidth
                    size="small"
                    disabled={sameAsAuth}
                    InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                    autoComplete="new-password"
                    sx={{ 
                      '& .MuiInputBase-input': { fontSize: '0.85rem' },
                      '& .Mui-disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#666'
                      }
                    }}
                  />
                )}
              />
            </div>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions className="p-4 flex justify-end gap-3 border-t border-gray-200">
        <Button
          onClick={handleClose}
          variant="text"
          disabled={isSubmitting}
          className="text-gray-600 hover:bg-gray-100"
          sx={{ fontWeight: 'normal', textTransform: 'none', borderRadius: 0 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="outlined"
          color="primary"
          startIcon={<SaveIcon fontSize="small" />}
          disabled={!isValid || isSubmitting}
          className="hover:bg-blue-50"
          sx={{
            fontWeight: 'normal',
            textTransform: 'none',
            borderRadius: 0,
            borderColor: '#283149',
            color: '#283149',
            '&:hover': {
              borderColor: '#283149',
              bgcolor: '#f1f5f9',
            },
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientInfoModal;