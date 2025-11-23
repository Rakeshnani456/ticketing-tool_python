import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_BASE_URL } from '../../config/constants';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';
import { Eye, EyeOff } from 'lucide-react';

// Designation is now a text input field, no dropdown options needed

// Employment type options
const employmentTypeOptions = [
  { value: '', label: 'Select Employment Type' },
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Intern', label: 'Intern' },
  { value: 'Other', label: 'Other' },
];

// Role options - only user and site_admin
const roleOptions = [
  { value: '', label: 'Select Role' },
  { value: 'user', label: 'User' },
  { value: 'site_admin', label: 'Site Admin' },
];

// Validation schema
const validationSchema = yup.object().shape({
  companyName: yup.string().required('Company name is required').min(2, 'Minimum 2 characters').max(100, 'Maximum 100 characters'),
  firstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  lastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  email: yup.string().email('Invalid email').required('Email is required').max(100, 'Maximum 100 characters'),
  password: yup.string().required('Password is required').min(6, 'Minimum 6 characters').max(50, 'Maximum 50 characters'),
  contactNumber: yup.string().required('Contact number is required').matches(/^[0-9\s\-\(\)]{7,15}$/, 'Invalid phone number'),
  managerEmail: yup.string().email('Invalid email').required('Manager email is required').max(100, 'Maximum 100 characters'),
  employmentType: yup.string().required('Employment type is required'),
  designation: yup.string().required('Designation is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  employeeId: yup.string().required('Employee ID is required').min(1, 'Minimum 1 character').max(20, 'Maximum 20 characters'),
  role: yup.string().required('Role is required'),
});

const initialState = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
  employeeId: '',
  role: '',
};

const CreateUserPage = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isCompanyNameReadonly, setIsCompanyNameReadonly] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  
  // Determine if current user is super_admin or site_admin
  const isSuperAdmin = user?.role === 'super_admin';
  const isSiteAdmin = user?.role === 'site_admin';

  const { handleSubmit, control, reset, formState: { errors, isValid }, clearErrors, watch, setValue } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialState,
    mode: 'onChange',
  });

  // Generate password function
  const generatePassword = () => {
    // 8 characters: 4 from "Sahayaon" letters + 4 random characters (numbers or alphabets)
    const sahayaonLetters = ['S', 'a', 'h', 'y', 'o', 'n'];
    const randomChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    // Pick 4 random letters from "Sahayaon"
    const selectedLetters = [];
    for (let i = 0; i < 4; i++) {
      const randomIndex = Math.floor(Math.random() * sahayaonLetters.length);
      selectedLetters.push(sahayaonLetters[randomIndex]);
    }
    
    // Add 4 random characters (numbers or alphabets)
    for (let i = 0; i < 4; i++) {
      selectedLetters.push(randomChars.charAt(Math.floor(Math.random() * randomChars.length)));
    }
    
    // Shuffle the array to mix letters and random chars
    for (let i = selectedLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedLetters[i], selectedLetters[j]] = [selectedLetters[j], selectedLetters[i]];
    }
    
    return selectedLetters.join('');
  };

  // Fetch clients for super_admin
  useEffect(() => {
    const fetchClients = async () => {
      if (!isSuperAdmin || !user?.firebaseUser) {
        return;
      }
      
      setLoadingClients(true);
      try {
        const idToken = await user.firebaseUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/api/clients`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const clientsData = await response.json();
          setClients(clientsData);
        } else {
          console.error('Failed to fetch clients');
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    
    fetchClients();
  }, [isSuperAdmin, user]);

  // Handle client parameter from URL, auto-fill for site_admin, and auto-generate password
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const clientName = urlParams.get('client');
    
    // For site_admin: auto-fill company name from user's company
    if (isSiteAdmin && user?.companyName) {
      setValue('companyName', user.companyName);
      setIsCompanyNameReadonly(true);
    } else if (isSiteAdmin && user?.client_name) {
      setValue('companyName', user.client_name);
      setIsCompanyNameReadonly(true);
    } else if (clientName) {
      // Autofill company name from URL parameter and make it readonly
      setValue('companyName', decodeURIComponent(clientName));
      setIsCompanyNameReadonly(true);
    }
    
    // Auto-generate password on component mount
    const autoGeneratedPassword = generatePassword();
    setValue('password', autoGeneratedPassword);
  }, [location.search, setValue, isSiteAdmin, user]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const idToken = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      // Reset form to clear all fields
      reset(initialState);
      setShowSuccess(true);
      
      // Show popup and redirect after 4 seconds
      setTimeout(() => {
        navigate('/user-management');
      }, 4000);
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle specific error cases
      let errorMessage = error.message || 'Failed to create user. Please try again.';
      
      if (error.message && error.message.includes('email already in use')) {
        errorMessage = 'The email address is already in use by another account. Please use a different email address.';
      } else if (error.message && error.message.includes('Employee ID already exists')) {
        errorMessage = 'The Employee ID is already in use. Please use a different Employee ID.';
      } else if (error.message && error.message.includes('Contact Number already exists')) {
        errorMessage = 'The contact number is already in use. Please use a different contact number.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/user-management');
  };

  return (
    <div className="create-user-page">
      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon-container">
              <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <h2 className="modal-title">User Created Successfully!</h2>
            <p className="modal-message">The user has been created and all details have been saved.</p>
            <div className="modal-loading">
              <span>Redirecting to users page</span>
              <span className="modal-loading-dot"></span>
              <span className="modal-loading-dot"></span>
              <span className="modal-loading-dot"></span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .create-user-page {
          padding: 2rem;
          background-color: white;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .page-header {
          background: white;
          color: #374151;
          padding: 1rem 2rem;
          margin: -2rem -2rem 1.5rem -2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .page-header h1 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        
        .back-btn {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
          padding: 0.375rem 0.75rem;
          border-radius: 0.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          text-decoration: none;
          font-size: 0.75rem;
        }
        
        .back-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .form-container {
          max-width: 100%;
          margin: 0;
        }
        
        .form-section {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          margin-bottom: 1rem;
          overflow: hidden;
        }
        
        .section-header {
          background: white;
          padding: 0.75rem 1.25rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .section-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }
        
        .section-content {
          padding: 1rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 0.75rem;
        }
        
        .form-grid.full {
          grid-template-columns: 1fr;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group.half {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 0.5rem;
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
          width: 100%;
          height: 2.5rem;
          box-sizing: border-box;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-input.error {
          border-color: #ef4444;
        }
        
        .form-input:disabled {
          background-color: #f5f5f5;
          color: #666;
          cursor: not-allowed;
        }
        
        .form-select {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          width: 100%;
          height: 2.5rem;
          background: white;
          box-sizing: border-box;
        }
        
        .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-select:disabled {
          background-color: #f5f5f5;
          color: #666;
          cursor: not-allowed;
        }
        
        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        
        .form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        
        .form-actions-left {
          flex: 1;
        }
        
        .form-actions-right {
          display: flex;
          gap: 0.75rem;
        }
        
        .inline-error-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: #dc2626;
          font-size: 0.875rem;
          background: white;
          border: 1px solid #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
        }
        
        .inline-success-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          color: #16a34a;
          font-size: 0.875rem;
          background: white;
          border: 1px solid #16a34a;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          box-shadow: 0 2px 4px rgba(22, 163, 74, 0.1);
        }
        
        .success-go-back-btn {
          background: #16a34a;
          color: white;
          border: none;
          padding: 0.375rem 0.75rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          margin-left: 0.5rem;
        }
        
        .success-go-back-btn:hover {
          background: #15803d;
        }
        
        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          text-decoration: none;
          border: none;
        }
        
        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
          background: #f9fafb;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        
        .success-message {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .error-message-global {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.4;
        }
        
        .icon {
          width: 16px;
          height: 16px;
        }
        
        /* Custom dropdown styling to match form inputs */
        .form-group .custom-dropdown-button {
          height: 2.5rem !important;
          min-height: 2.5rem !important;
          padding: 0.625rem !important;
          border: 1px solid #d1d5db !important;
          border-radius: 0.375rem !important;
          font-size: 0.875rem !important;
        }
        
        .form-group .custom-dropdown-button:focus {
          outline: none !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
        }
        
        .form-group .custom-dropdown-button.error {
          border-color: #ef4444 !important;
        }
        
        /* Modal/Popup styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.25s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .modal-content {
          background: white;
          border-radius: 0.75rem;
          padding: 2rem;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .modal-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }
        
        .modal-icon-container {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.25rem;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .modal-icon {
          width: 36px;
          height: 36px;
          color: #3b82f6;
          animation: checkmark 0.5s ease-out 0.15s both;
        }
        
        @keyframes checkmark {
          0% {
            stroke-dasharray: 0 40;
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            stroke-dasharray: 40 0;
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
          letter-spacing: -0.01em;
        }
        
        .modal-message {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .modal-loading {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: #6b7280;
          font-size: 0.8125rem;
        }
        
        .modal-loading-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3b82f6;
          animation: pulse 1.2s ease-in-out infinite;
        }
        
        .modal-loading-dot:nth-child(2) {
          animation-delay: 0.15s;
        }
        
        .modal-loading-dot:nth-child(3) {
          animation-delay: 0.3s;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        .form-hidden {
          display: none;
        }
        
        @media (max-width: 768px) {
          .create-user-page {
            padding: 1rem;
          }
          
          .page-header {
            margin: -1rem -1rem 1rem -1rem;
            padding: 1rem;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-group.half {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1>Create New User</h1>
        <button className="back-btn" onClick={handleCancel}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Users
        </button>
      </div>

      <div className="form-container">
        {!showSuccess && (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* User Information Section */}
          <div className="form-section">
            <div className="section-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>User Information</h3>
            </div>
            <div className="section-content">
              <div className="form-grid">
                {/* Company Name Field - Show dropdown for super_admin, hide for site_admin */}
                {!isSiteAdmin && (
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    {isSuperAdmin ? (
                      // Dropdown for super_admin
                      <Controller
                        name="companyName"
                        control={control}
                        render={({ field }) => (
                          <CustomDropdown
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: '', label: 'Select Company' },
                              ...clients
                                .filter(client => client.companyName || client.name)
                                .map(client => ({
                                  value: client.companyName || client.name,
                                  label: client.companyName || client.name
                                }))
                            ]}
                            placeholder={loadingClients ? 'Loading companies...' : 'Select Company'}
                            className={`${errors.companyName ? 'error' : ''} ${isCompanyNameReadonly ? 'readonly' : ''}`}
                            size="sm"
                            disabled={showSuccess || loadingClients || isCompanyNameReadonly}
                            style={isCompanyNameReadonly ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                          />
                        )}
                      />
                    ) : (
                      // Text input for other roles (if any)
                      <Controller
                        name="companyName"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            className={`form-input ${errors.companyName ? 'error' : ''} ${isCompanyNameReadonly ? 'readonly' : ''}`}
                            placeholder="Enter company name"
                            disabled={showSuccess || isCompanyNameReadonly}
                            readOnly={isCompanyNameReadonly}
                            style={isCompanyNameReadonly ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                          />
                        )}
                      />
                    )}
                    {errors.companyName && (
                      <span className="error-message">{errors.companyName.message}</span>
                    )}
                    {isCompanyNameReadonly && (
                      <span className="info-message" style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                        Company name is pre-filled and cannot be changed
                      </span>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.firstName ? 'error' : ''}`}
                        placeholder="Enter first name"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.firstName && (
                    <span className="error-message">{errors.firstName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.lastName ? 'error' : ''}`}
                        placeholder="Enter last name"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.lastName && (
                    <span className="error-message">{errors.lastName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        placeholder="Enter email address"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.email && (
                    <span className="error-message">{errors.email.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                          placeholder="Auto-generated password"
                          disabled={showSuccess}
                          readOnly
                          style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={showSuccess}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', display: 'block' }}>
                    Auto-generated password
                  </span>
                  {errors.password && (
                    <span className="error-message">{errors.password.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <Controller
                    name="contactNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={`form-input ${errors.contactNumber ? 'error' : ''}`}
                        placeholder="Enter contact number"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.contactNumber && (
                    <span className="error-message">{errors.contactNumber.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Manager Email *</label>
                  <Controller
                    name="managerEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`form-input ${errors.managerEmail ? 'error' : ''}`}
                        placeholder="Enter manager email"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.managerEmail && (
                    <span className="error-message">{errors.managerEmail.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Employment Type *</label>
                  <Controller
                    name="employmentType"
                    control={control}
                    render={({ field }) => (
                      <CustomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={employmentTypeOptions}
                        placeholder="Select employment type"
                        className={errors.employmentType ? 'error' : ''}
                        size="sm"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.employmentType && (
                    <span className="error-message">{errors.employmentType.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <Controller
                    name="designation"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        {...field}
                        placeholder="Enter designation"
                        className={`form-input ${errors.designation ? 'error' : ''}`}
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.designation && (
                    <span className="error-message">{errors.designation.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Employee ID *</label>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.employeeId ? 'error' : ''}`}
                        placeholder="Enter employee ID"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.employeeId && (
                    <span className="error-message">{errors.employeeId.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <CustomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={roleOptions}
                        placeholder="Select role"
                        className={errors.role ? 'error' : ''}
                        size="sm"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.role && (
                    <span className="error-message">{errors.role.message}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <div className="form-actions-left">
              {error && (
                <div className="inline-error-message">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {error}
                </div>
              )}
            </div>
            <div className="form-actions-right">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default CreateUserPage;
