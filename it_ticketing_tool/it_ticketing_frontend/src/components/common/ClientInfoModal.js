import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Typography, Box, IconButton, Collapse, Alert, InputAdornment } from '@mui/material';
import { Close as CloseIcon, Business as BusinessIcon, Person as PersonIcon, AdminPanelSettings as AdminIcon, Phone as PhoneIcon, Email as EmailIcon, Language as WebsiteIcon, LocationOn as LocationIcon, Save as SaveIcon, Clear as ClearIcon } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

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

const validationSchema = yup.object().shape({
  companyName: yup.string().required('Company name is required').min(2, 'Minimum 2 characters').max(100, 'Maximum 100 characters'),
  website: yup.string().nullable().transform((value) => (value === '' ? null : value)).url('Invalid URL'),
  location: yup.string().nullable().max(100, 'Maximum 100 characters'),
  clientContactNumber: yup.string().required('Contact number is required').matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Invalid phone number'),
  authFirstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  authLastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  authContactNumber: yup.string().required('Contact number is required').matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Invalid phone number'),
  authOfficeEmail: yup.string().email('Invalid email').required('Office email is required').max(100, 'Maximum 100 characters'),
  authPersonalEmail: yup.string().nullable().transform((value) => (value === '' ? null : value)).email('Invalid email').max(100, 'Maximum 100 characters'),
  authDesignation: yup.string().required('Designation is required'),
  siteFirstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  siteLastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  siteEmail: yup.string().email('Invalid email').required('Email is required').max(100, 'Maximum 100 characters'),
  siteContactNumber: yup.string().required('Contact number is required').matches(/^[\+]?[0-9\s\-\(\)]{10,15}$/, 'Invalid phone number'),
  siteDesignation: yup.string().required('Designation is required'),
});

const initialState = {
  companyName: '',
  website: '',
  location: '',
  clientContactNumber: '',
  authFirstName: '',
  authLastName: '',
  authContactNumber: '',
  authOfficeEmail: '',
  authPersonalEmail: '',
  authDesignation: '',
  siteFirstName: '',
  siteLastName: '',
  siteEmail: '',
  siteContactNumber: '',
  siteDesignation: '',
};

const ClientInfoModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { handleSubmit, control, reset, formState: { errors, isValid }, clearErrors } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialData || initialState,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      reset(initialData || initialState);
      clearErrors();
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
      PaperProps={{ className: 'rounded-2xl bg-gray-50' }}
    >
      <DialogTitle className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-4 min-h-[48px]"> {/* Increased padding, min-height */}
        <Typography variant="h6" component="div" className="font-semibold text-lg sm:text-xl"> {/* Changed to h6, adjusted font size */}
          {initialData ? 'Edit Client Information' : 'Add Client Information'}
        </Typography>
        <IconButton onClick={handleClose} disabled={isSubmitting} className="text-white">
          <CloseIcon fontSize="medium" /> {/* Adjusted icon size */}
        </IconButton>
      </DialogTitle>

      <DialogContent className="p-4 sm:p-6 bg-gray-50"> {/* Adjusted padding */}
        <Collapse in={showSuccess}>
          <Alert severity="success" className="mb-4 text-sm sm:text-base"> {/* Adjusted font size */}
            Client information saved successfully!
          </Alert>
        </Collapse>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6" autoComplete="off"> {/* Adjusted spacing, disabled autofill */}
          {/* Hidden password field to trick Chrome autofill */}
          <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
          {/* Client Information */}
          <Box className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3 sm:mb-4"> {/* Adjusted margin */}
              <BusinessIcon className="text-blue-500 mr-2" fontSize="medium" /> {/* Adjusted icon size */}
              <Typography variant="h6" className="font-semibold text-blue-700 text-base sm:text-lg">Client Information</Typography> {/* Adjusted font size */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"> {/* Adjusted gap */}
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
                    size="small" // Added size prop
                    className="bg-gray-50"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><BusinessIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }} // Always show label
                    autoComplete="new-password"
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
                    helperText={errors.website?.message || 'Optional - Include https://'}
                    fullWidth
                    size="small" // Added size prop
                    className="bg-gray-50"
                    placeholder="https://example.com"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><WebsiteIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    size="small" // Added size prop
                    className="bg-gray-50"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LocationIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    size="small" // Added size prop
                    className="bg-gray-50"
                    placeholder="+1 (555) 123-4567"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PhoneIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  />
                )}
              />
            </div>
          </Box>

          {/* Authorized Person */}
          <Box className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3 sm:mb-4"> {/* Adjusted margin */}
              <PersonIcon className="text-blue-500 mr-2" fontSize="medium" /> {/* Adjusted icon size */}
              <Typography variant="h6" className="font-semibold text-blue-700 text-base sm:text-lg">Authorized Person</Typography> {/* Adjusted font size */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"> {/* Adjusted gap */}
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
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    placeholder="+1 (555) 123-4567"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PhoneIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  />
                )}
              />
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
                    select
                    size="small"
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  >
                    {designationOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
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
                    className="bg-gray-50"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  />
                )}
              />
            </div>
          </Box>

          {/* Site Administrator */}
          <Box className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-3 sm:mb-4"> {/* Adjusted margin */}
              <AdminIcon className="text-blue-500 mr-2" fontSize="medium" /> {/* Adjusted icon size */}
              <Typography variant="h6" className="font-semibold text-blue-700 text-base sm:text-lg">Site Administrator</Typography> {/* Adjusted font size */}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"> {/* Adjusted gap */}
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
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
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
                    className="bg-gray-50"
                    placeholder="+1 (555) 123-4567"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PhoneIcon className="text-gray-500" fontSize="small" /></InputAdornment>,
                    }}
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  />
                )}
              />
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
                    select
                    size="small"
                    className="bg-gray-50"
                    InputLabelProps={{ shrink: true }}
                    autoComplete="new-password"
                  >
                    {designationOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </div>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions className="p-4 bg-gray-50 flex justify-end gap-2">
        <Button
          onClick={handleClose}
          variant="outlined"
          startIcon={<ClearIcon fontSize="small" />}
          disabled={isSubmitting}
          className="border-gray-300 text-gray-700 hover:bg-gray-100 text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2" // Adjusted padding and font size
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          startIcon={<SaveIcon fontSize="small" />} 
          disabled={!isValid || isSubmitting}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2" // Adjusted padding and font size
        >
          {isSubmitting ? 'Saving...' : 'Save Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientInfoModal;