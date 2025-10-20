import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { API_BASE_URL } from '../../config/constants';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions, getDefaultCountry } from '../../services/countryService';

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

// Role options for engineers
const roleOptions = [
  { value: '', label: 'Select Role' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'senior_engineer', label: 'Senior Engineer' },
  { value: 'lead_engineer', label: 'Lead Engineer' },
  { value: 'principal_engineer', label: 'Principal Engineer' },
];

// Validation schema
const validationSchema = yup.object().shape({
  employeeId: yup.string().required('Employee ID is required').min(1, 'Minimum 1 character').max(20, 'Maximum 20 characters'),
  firstName: yup.string().required('First name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  lastName: yup.string().required('Last name is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  email: yup.string().email('Invalid email').required('Email is required').max(100, 'Maximum 100 characters'),
  password: yup.string().required('Password is required').min(6, 'Minimum 6 characters').max(50, 'Maximum 50 characters'),
  contactNumber: yup.string().required('Contact number is required').matches(/^[0-9\s\-\(\)]{7,15}$/, 'Invalid phone number'),
  managerEmail: yup.string().email('Invalid email').required('Manager email is required').max(100, 'Maximum 100 characters'),
  employmentType: yup.string().required('Employment type is required'),
  designation: yup.string().required('Designation is required').min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  role: yup.string().required('Role is required'),
});

const initialState = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  contactNumber: '',
  managerEmail: '',
  employmentType: '',
  designation: '',
  role: 'support', // Engineers have 'support' role in the backend
};

const CreateEngineerPage = ({ user }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);

  const { handleSubmit, control, reset, formState: { errors, isValid }, clearErrors, watch, setValue } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: initialState,
    mode: 'onChange',
  });

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
        throw new Error(errorData.error || 'Failed to create engineer');
      }

      setShowSuccess(true);
    } catch (error) {
      console.error('Error creating engineer:', error);
      
      // Handle specific error cases
      let errorMessage = error.message || 'Failed to create engineer. Please try again.';
      
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
    navigate('/engineer-management');
  };

  // Generate a secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setValue('password', password);
    setPasswordCopied(false);
  };

  // Copy password to clipboard
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  // Auto-generate password on component mount
  useEffect(() => {
    generatePassword();
  }, []);

  return (
    <div className="create-engineer-page">
      <style jsx>{`
        .create-engineer-page {
          padding: 2rem;
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .page-header {
          background: #283149;
          color: white;
          padding: 1rem 2rem;
          margin: -2rem -2rem 1.5rem -2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .page-header h1 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }
        
        .back-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
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
          background: rgba(255, 255, 255, 0.2);
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
          background: #f8fafc;
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
          background: #f8fafc;
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
        
        /* Password field styling */
        .password-field-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .password-input {
          padding-right: 80px !important;
          font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
          font-size: 0.8rem;
          letter-spacing: 0.5px;
        }
        
        .password-actions {
          position: absolute;
          right: 4px;
          display: flex;
          gap: 4px;
        }
        
        .btn-generate-password,
        .btn-copy-password {
          width: 32px;
          height: 32px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .btn-generate-password:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .btn-copy-password:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .btn-copy-password.copied {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        
        .btn-generate-password:disabled,
        .btn-copy-password:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .password-info {
          margin-top: 0.25rem;
        }
        
        .password-hint {
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }
        
        @media (max-width: 768px) {
          .create-engineer-page {
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
        <h1>Create New Engineer</h1>
        <button className="back-btn" onClick={handleCancel}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Engineers
        </button>
      </div>

      <div className="form-container">

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Engineer Information Section */}
          <div className="form-section">
            <div className="section-header">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>Engineer Information</h3>
            </div>
            <div className="section-content">
              <div className="form-grid">
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
                  <div className="password-field-container">
                    <Controller
                      name="password"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="text"
                          className={`form-input password-input ${errors.password ? 'error' : ''}`}
                          placeholder="Auto-generated password"
                          disabled={showSuccess}
                          value={generatedPassword}
                          readOnly
                        />
                      )}
                    />
                    <div className="password-actions">
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="btn-generate-password"
                        disabled={showSuccess}
                        title="Generate new password"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6"/>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={copyPassword}
                        className={`btn-copy-password ${passwordCopied ? 'copied' : ''}`}
                        disabled={showSuccess || !generatedPassword}
                        title={passwordCopied ? 'Copied!' : 'Copy password'}
                      >
                        {passwordCopied ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="password-info">
                    <span className="password-hint">Auto-generated secure password</span>
                  </div>
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

                {/* Hidden role field - always set to support */}
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="hidden"
                      value="support"
                    />
                  )}
                />
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
              {showSuccess && (
                <div className="inline-success-message">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <span>Engineer created successfully!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/engineer-management')}
                    className="success-go-back-btn"
                  >
                    Go Back to Engineers
                  </button>
                </div>
              )}
            </div>
            {!showSuccess && (
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
                  {isSubmitting ? 'Creating...' : 'Create Engineer'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEngineerPage;
