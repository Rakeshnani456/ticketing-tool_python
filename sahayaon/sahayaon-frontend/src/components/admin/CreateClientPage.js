import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_BASE_URL } from '../../config/constants';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';

// Designation is now a text input field, no dropdown options needed

// Validation schema
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
  clientContactCountryCode: getDefaultCountry().code,
  clientContactNumber: '',
  authFirstName: '',
  authLastName: '',
  authContactCountryCode: getDefaultCountry().code,
  authContactNumber: '',
  authOfficeEmail: '',
  authPersonalEmail: '',
  authDesignation: 'Other',
  siteFirstName: '',
  siteLastName: '',
  siteEmail: '',
  siteContactCountryCode: getDefaultCountry().code,
  siteContactNumber: '',
  siteDesignation: 'Other',
};

const CreateClientPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sameAsAuth, setSameAsAuth] = useState(false);
  const [error, setError] = useState(null);

  const { handleSubmit, control, reset, formState: { errors, isValid }, clearErrors, watch } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialState,
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

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }

      // Reset form to clear all fields
      reset(initialState);
      setShowSuccess(true);
      
      // Show popup and redirect after 4 seconds
      setTimeout(() => {
        navigate('/clients');
      }, 4000);
    } catch (error) {
      console.error('Error creating client:', error);
      
      // Handle specific error cases
      let errorMessage = error.message || 'Failed to create client. Please try again.';
      
      if (error.message && error.message.includes('email already in use')) {
        errorMessage = 'The email address is already in use by another account. Please use a different email address.';
      } else if (error.message && error.message.includes('Client created, but failed to create user')) {
        errorMessage = 'Client creation failed due to user account issues. Please check the email addresses and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/clients');
  };

  return (
    <div className="create-client-page">
      <style jsx>{`
        .create-client-page {
          padding: 1rem;
          background-color: #f9fafb;
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
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1e40af;
          margin: 0;
        }
        
        .section-content {
          padding: 1rem;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .form-grid.full {
          grid-template-columns: 1fr;
        }
        
        .form-grid-2x2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .form-grid-2x2 .form-group-full {
          grid-column: 1 / -1;
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
          font-size: 0.8125rem;
          font-weight: 500;
          color: #1e40af;
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
          background: white;
          color: #111827;
          font-weight: 400;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #9ca3af;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
          background: white;
          font-weight: 600;
          color: #0f172a;
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
          border-color: #9ca3af;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
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
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .checkbox {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }
        
        .checkbox-label {
          font-size: 0.875rem;
          color: #3b82f6;
          cursor: pointer;
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
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          text-decoration: none;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          transition: all 0.2s;
          height: auto;
          line-height: 1.4;
        }
        
        .btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
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
          border-color: #3b82f6;
        }
        
        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
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
          border-color: #9ca3af !important;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1) !important;
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
          .create-client-page {
            padding: 1rem;
          }
          
          .page-header {
            margin: -1rem -1rem 1rem -1rem;
            padding: 1rem;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
          
          .form-grid-2x2 {
            grid-template-columns: 1fr;
          }
          
          .form-group.half {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="page-header">
        <h1>Create New Client</h1>
        <button className="back-btn" onClick={handleCancel}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Clients
        </button>
      </div>

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
            <h2 className="modal-title">Client Created Successfully!</h2>
            <p className="modal-message">The client has been created and all details have been saved.</p>
            <div className="modal-loading">
              <span>Redirecting to clients page</span>
              <span className="modal-loading-dot"></span>
              <span className="modal-loading-dot"></span>
              <span className="modal-loading-dot"></span>
            </div>
          </div>
        </div>
      )}

      <div className="form-container">
        {!showSuccess && (
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Client Information Section */}
          <div className="form-section">
            <div className="section-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18"/>
                <path d="M5 21V7l8-4v18"/>
                <path d="M19 21V11l-6-4"/>
              </svg>
              <h3>Client Information</h3>
            </div>
            <div className="section-content">
              <div className="form-grid-2x2">
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <Controller
                    name="companyName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.companyName ? 'error' : ''}`}
                        placeholder="Enter company name"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.companyName && (
                    <span className="error-message">{errors.companyName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Website</label>
                  <Controller
                    name="website"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="url"
                        className={`form-input ${errors.website ? 'error' : ''}`}
                        placeholder="https://example.com"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.website && (
                    <span className="error-message">{errors.website.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <Controller
                    name="clientContactCountryCode"
                    control={control}
                    render={({ field }) => (
                      <CustomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={getCountryOptions()}
                        placeholder="Select country code"
                        className={errors.clientContactCountryCode ? 'error' : ''}
                        size="sm"
                        disabled={showSuccess}
                        focusStyle="gray"
                      />
                    )}
                  />
                  {errors.clientContactCountryCode && (
                    <span className="error-message">{errors.clientContactCountryCode.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <Controller
                    name="clientContactNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={`form-input ${errors.clientContactNumber ? 'error' : ''}`}
                        placeholder="Enter contact number"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.clientContactNumber && (
                    <span className="error-message">{errors.clientContactNumber.message}</span>
                  )}
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Location</label>
                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.location ? 'error' : ''}`}
                        placeholder="City, State/Country"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.location && (
                    <span className="error-message">{errors.location.message}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Authorized Person Section */}
          <div className="form-section">
            <div className="section-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>Authorized Person</h3>
            </div>
            <div className="section-content">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <Controller
                    name="authFirstName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.authFirstName ? 'error' : ''}`}
                        placeholder="Enter first name"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authFirstName && (
                    <span className="error-message">{errors.authFirstName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <Controller
                    name="authLastName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.authLastName ? 'error' : ''}`}
                        placeholder="Enter last name"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authLastName && (
                    <span className="error-message">{errors.authLastName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <Controller
                    name="authContactCountryCode"
                    control={control}
                    render={({ field }) => (
                      <CustomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={getCountryOptions()}
                        placeholder="Select country code"
                        className={errors.authContactCountryCode ? 'error' : ''}
                        size="sm"
                        disabled={showSuccess}
                        focusStyle="gray"
                      />
                    )}
                  />
                  {errors.authContactCountryCode && (
                    <span className="error-message">{errors.authContactCountryCode.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <Controller
                    name="authContactNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={`form-input ${errors.authContactNumber ? 'error' : ''}`}
                        placeholder="Enter contact number"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authContactNumber && (
                    <span className="error-message">{errors.authContactNumber.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <Controller
                    name="authDesignation"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        {...field}
                        placeholder="Enter designation"
                        className={`form-input ${errors.authDesignation ? 'error' : ''}`}
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authDesignation && (
                    <span className="error-message">{errors.authDesignation.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Office Email *</label>
                  <Controller
                    name="authOfficeEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`form-input ${errors.authOfficeEmail ? 'error' : ''}`}
                        placeholder="Enter office email"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authOfficeEmail && (
                    <span className="error-message">{errors.authOfficeEmail.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Personal Email</label>
                  <Controller
                    name="authPersonalEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`form-input ${errors.authPersonalEmail ? 'error' : ''}`}
                        placeholder="Enter personal email (optional)"
                        disabled={showSuccess}
                      />
                    )}
                  />
                  {errors.authPersonalEmail && (
                    <span className="error-message">{errors.authPersonalEmail.message}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Site Administrator Section */}
          <div className="form-section">
            <div className="section-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h3>Site Administrator</h3>
            </div>
            <div className="section-content">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="sameAsAuth"
                  checked={sameAsAuth}
                  onChange={(e) => setSameAsAuth(e.target.checked)}
                  className="checkbox"
                  disabled={showSuccess}
                />
                <label htmlFor="sameAsAuth" className="checkbox-label">
                  Same as Authorized Person
                </label>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <Controller
                    name="siteFirstName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.siteFirstName ? 'error' : ''} ${sameAsAuth ? 'disabled' : ''}`}
                        placeholder="Enter first name"
                        disabled={sameAsAuth || showSuccess}
                      />
                    )}
                  />
                  {errors.siteFirstName && (
                    <span className="error-message">{errors.siteFirstName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <Controller
                    name="siteLastName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${errors.siteLastName ? 'error' : ''} ${sameAsAuth ? 'disabled' : ''}`}
                        placeholder="Enter last name"
                        disabled={sameAsAuth || showSuccess}
                      />
                    )}
                  />
                  {errors.siteLastName && (
                    <span className="error-message">{errors.siteLastName.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <Controller
                    name="siteEmail"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="email"
                        className={`form-input ${errors.siteEmail ? 'error' : ''} ${sameAsAuth ? 'disabled' : ''}`}
                        placeholder="Enter email"
                        disabled={sameAsAuth || showSuccess}
                      />
                    )}
                  />
                  {errors.siteEmail && (
                    <span className="error-message">{errors.siteEmail.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <Controller
                    name="siteContactCountryCode"
                    control={control}
                    render={({ field }) => (
                      <CustomDropdown
                        value={field.value}
                        onChange={field.onChange}
                        options={getCountryOptions()}
                        placeholder="Select country code"
                        className={errors.siteContactCountryCode ? 'error' : ''}
                        size="sm"
                        disabled={sameAsAuth || showSuccess}
                        focusStyle="gray"
                      />
                    )}
                  />
                  {errors.siteContactCountryCode && (
                    <span className="error-message">{errors.siteContactCountryCode.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <Controller
                    name="siteContactNumber"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        className={`form-input ${errors.siteContactNumber ? 'error' : ''} ${sameAsAuth ? 'disabled' : ''}`}
                        placeholder="Enter contact number"
                        disabled={sameAsAuth || showSuccess}
                      />
                    )}
                  />
                  {errors.siteContactNumber && (
                    <span className="error-message">{errors.siteContactNumber.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Designation *</label>
                  <Controller
                    name="siteDesignation"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="text"
                        {...field}
                        placeholder="Enter designation"
                        className={`form-input ${errors.siteDesignation ? 'error' : ''}`}
                        disabled={sameAsAuth || showSuccess}
                      />
                    )}
                  />
                  {errors.siteDesignation && (
                    <span className="error-message">{errors.siteDesignation.message}</span>
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
                {isSubmitting ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default CreateClientPage;
