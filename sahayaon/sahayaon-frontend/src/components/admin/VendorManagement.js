import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/constants';

const VendorManagement = ({ clientName, user }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    vendor_name: '',
    description: '',
    contact_persons: [{ name: '', email: '', number: '' }],
    address: '',
  });
  const modalRef = useRef(null);
  const originalStylesRef = useRef(null);

  useEffect(() => {
    if (clientName) {
      fetchVendors();
    }
  }, [clientName]);

  // Handle modal backdrop effects (fade header/sidebar)
  useEffect(() => {
    if (showAddForm) {
      // Store original styles
      if (!originalStylesRef.current) {
        originalStylesRef.current = {
          bodyOverflow: window.getComputedStyle(document.body).overflow,
          bodyPosition: document.body.style.position,
          bodyTop: document.body.style.top,
          scrollY: window.scrollY
        };
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${originalStylesRef.current.scrollY}px`;
      document.body.style.width = '100%';

      // Fade header and sidebar
      const header = document.querySelector('header');
      const sidebar = document.querySelector('.sidebar-glass');
      
      if (header) {
        header.style.pointerEvents = 'none';
        header.style.opacity = '0.3';
        header.style.transition = 'opacity 0.2s ease';
      }
      
      if (sidebar) {
        sidebar.style.pointerEvents = 'none';
        sidebar.style.opacity = '0.3';
        sidebar.style.transition = 'opacity 0.2s ease';
      }

      // Handle ESC key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancelForm();
        }
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        // Restore header and sidebar
        const headerEl = document.querySelector('header');
        const sidebarEl = document.querySelector('.sidebar-glass');
        
        if (headerEl) {
          headerEl.style.pointerEvents = '';
          headerEl.style.opacity = '';
          headerEl.style.transition = '';
        }
        
        if (sidebarEl) {
          sidebarEl.style.pointerEvents = '';
          sidebarEl.style.opacity = '';
          sidebarEl.style.transition = '';
        }

        // Restore body styles
        if (originalStylesRef.current) {
          document.body.style.overflow = originalStylesRef.current.bodyOverflow;
          document.body.style.position = originalStylesRef.current.bodyPosition;
          document.body.style.top = originalStylesRef.current.bodyTop;
          document.body.style.width = '';
          window.scrollTo(0, originalStylesRef.current.scrollY);
          originalStylesRef.current = null;
        }

        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showAddForm]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/vendors?client_name=${encodeURIComponent(clientName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVendor = () => {
    setShowAddForm(true);
    setEditingVendor(null);
    setFormData({
      vendor_name: '',
      description: '',
      contact_persons: [{ name: '', email: '', number: '' }],
      address: '',
    });
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setShowAddForm(true);
    setFormData({
      vendor_name: vendor.vendor_name || '',
      description: vendor.description || '',
      contact_persons: vendor.contact_persons && vendor.contact_persons.length > 0 
        ? vendor.contact_persons 
        : [{ name: '', email: '', number: '' }],
      address: vendor.address || '',
    });
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingVendor(null);
    setFormErrors({});
    setFormData({
      vendor_name: '',
      description: '',
      contact_persons: [{ name: '', email: '', number: '' }],
      address: '',
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactPersonChange = (index, field, value) => {
    const updatedContacts = [...formData.contact_persons];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setFormData(prev => ({ ...prev, contact_persons: updatedContacts }));
  };

  const handleAddContactPerson = () => {
    setFormData(prev => ({
      ...prev,
      contact_persons: [...prev.contact_persons, { name: '', email: '', number: '' }],
    }));
  };

  const handleRemoveContactPerson = (index) => {
    if (formData.contact_persons.length > 1) {
      const updatedContacts = formData.contact_persons.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, contact_persons: updatedContacts }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors = {};
    if (!formData.vendor_name.trim()) {
      errors.vendor_name = 'Vendor name is required';
    }

    // Filter out empty contact persons and validate
    const validContactPersons = formData.contact_persons.filter(
      person => person.name.trim() !== '' && (person.email.trim() !== '' || person.number.trim() !== '')
    );

    if (validContactPersons.length === 0) {
      errors.contact_persons = 'At least one contact person with name and email/phone is required';
    }

    // Validate each contact person
    formData.contact_persons.forEach((person, index) => {
      if (person.name.trim() && (!person.email.trim() && !person.number.trim())) {
        errors[`contact_${index}`] = 'Email or phone number is required';
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const token = await user.firebaseUser.getIdToken();
      const url = editingVendor
        ? `${API_BASE_URL}/api/vendors/${editingVendor.id}`
        : `${API_BASE_URL}/api/vendors`;
      
      const method = editingVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          contact_persons: validContactPersons,
          client_name: clientName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save vendor');
      }

      showSnackbar(
        editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully',
        'success'
      );
      
      handleCancelForm();
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      setFormErrors({ submit: error.message || 'Failed to save vendor. Please try again.' });
    }
  };

  const handleDeleteVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      const token = await user.firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete vendor');
      }

      showSnackbar('Vendor deleted successfully', 'success');
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      showSnackbar('Failed to delete vendor', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
    setTimeout(() => {
      setSnackbar({ open: false, message: '', severity: 'success' });
    }, 3000);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', maxWidth: '200px', margin: '0 auto' }}>
          <div style={{ height: '100%', background: '#3b82f6', width: '30%', animation: 'vendor-loading 1.5s ease-in-out infinite' }}></div>
        </div>
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading vendors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ 
          padding: '1rem', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          color: '#dc2626',
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-management-container">
      <style>{`
        .vendor-management-container {
          font-size: 1rem;
        }
        
        .vendor-management-container * {
          box-sizing: border-box;
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }

        .vendor-management-container .vendor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .vendor-management-container .vendor-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .vendor-management-container .btn {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          transition: all 0.2s;
        }

        .vendor-management-container .btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .vendor-management-container .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .vendor-management-container .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        .vendor-management-container .btn-danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }

        .vendor-management-container .btn-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }

        .vendor-management-container         .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          min-width: auto;
        }

        .vendor-management-container .btn-sm svg {
          font-size: 0.875rem !important;
          width: 0.875rem;
          height: 0.875rem;
        }

        .vendor-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 0.875rem;
          margin-bottom: 1rem;
        }

        @media (min-width: 1024px) {
          .vendor-grid {
            grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
            gap: 1rem;
          }
        }

        .vendor-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-left: 3px solid #3b82f6;
          border-radius: 0.5rem;
          padding: 0.875rem;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          min-height: auto;
        }

        .vendor-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border-left-color: #2563eb;
        }

        .vendor-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.625rem;
          padding-bottom: 0.625rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .vendor-card-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: -0.01em;
          line-height: 1.4;
          flex: 1;
        }

        .vendor-card-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .vendor-card:hover .vendor-card-actions {
          opacity: 1;
        }

        .vendor-card-section {
          margin-bottom: 0.5rem;
        }

        .vendor-card-section:last-child {
          margin-bottom: 0;
        }

        .vendor-card-label {
          font-size: 0.625rem;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 0.25rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .vendor-card-value {
          font-size: 0.8125rem;
          color: #374151;
          word-wrap: break-word;
          line-height: 1.4;
          margin-bottom: 0.375rem;
        }

        .contact-person {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-left: 2px solid #3b82f6;
          border-radius: 0.375rem;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          transition: all 0.15s ease;
        }

        .contact-person:last-child {
          margin-bottom: 0;
        }

        .contact-person:hover {
          background: #f3f4f6;
          border-left-color: #2563eb;
        }

        .contact-person-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.25rem;
          letter-spacing: -0.005em;
        }

        .contact-person-detail {
          font-size: 0.75rem;
          color: #4b5563;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          margin-bottom: 0.125rem;
        }

        .contact-person-detail:last-child {
          margin-bottom: 0;
        }

        .contact-person-detail a {
          color: #3b82f6;
          text-decoration: none;
          transition: color 0.2s;
        }

        .contact-person-detail a:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .empty-state-text {
          color: #6b7280;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }


        .form-error-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #fee2e2;
          border: 2px solid #dc2626;
          border-radius: 0.5rem;
          padding: 1rem 1.5rem;
          z-index: 100000;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          max-width: 400px;
          text-align: center;
        }

        .form-error-container p {
          color: #991b1b;
          font-size: 0.875rem;
          font-weight: 600;
          margin: 0;
        }

        .snackbar {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1400;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 300px;
        }

        .snackbar-success {
          background: #10b981;
          color: white;
        }

        .snackbar-error {
          background: #ef4444;
          color: white;
        }
      `}</style>

      <div className="vendor-header">
        <h3 className="vendor-title">Vendors ({vendors.length})</h3>
        <button className="btn btn-primary" onClick={handleAddVendor}>
          <AddIcon fontSize="small" />
          Add Vendor
        </button>
      </div>

      {vendors.length === 0 ? (
        <div className="empty-state">
          <BusinessIcon style={{ fontSize: '3rem', color: '#d1d5db', marginBottom: '1rem' }} />
          <p className="empty-state-text">No vendors found for this client</p>
          <button className="btn btn-primary" onClick={handleAddVendor}>
            <AddIcon fontSize="small" />
            Add First Vendor
          </button>
        </div>
      ) : (
        <div className="vendor-grid">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="vendor-card">
              <div className="vendor-card-header">
                <h4 className="vendor-card-title">
                  <BusinessIcon style={{ fontSize: '1rem', color: '#3b82f6' }} />
                  {vendor.vendor_name}
                </h4>
                <div className="vendor-card-actions">
                  <button className="btn btn-sm" onClick={() => handleEditVendor(vendor)}>
                    <EditIcon style={{ fontSize: '0.875rem' }} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDeleteVendor(vendor.id)}>
                    <DeleteIcon style={{ fontSize: '0.875rem' }} />
                  </button>
                </div>
              </div>

              {vendor.description && (
                <div className="vendor-card-section">
                  <div className="vendor-card-label">
                    <DescriptionIcon style={{ fontSize: '0.625rem' }} />
                    Description
                  </div>
                  <div className="vendor-card-value">{vendor.description}</div>
                </div>
              )}

              {vendor.address && (
                <div className="vendor-card-section">
                  <div className="vendor-card-label">
                    <LocationIcon style={{ fontSize: '0.625rem' }} />
                    Address
                  </div>
                  <div className="vendor-card-value">{vendor.address}</div>
                </div>
              )}

              {vendor.contact_persons && vendor.contact_persons.length > 0 && (
                <div className="vendor-card-section">
                  <div className="vendor-card-label">
                    <PersonIcon style={{ fontSize: '0.625rem' }} />
                    Contact Persons
                  </div>
                  {vendor.contact_persons.map((person, index) => (
                    <div key={index} className="contact-person">
                      <div className="contact-person-name">{person.name}</div>
                      {person.email && (
                        <div className="contact-person-detail">
                          <EmailIcon style={{ fontSize: '0.75rem' }} />
                          <a href={`mailto:${person.email}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            {person.email}
                          </a>
                        </div>
                      )}
                      {person.number && (
                        <div className="contact-person-detail">
                          <PhoneIcon style={{ fontSize: '0.75rem' }} />
                          <a href={`tel:${person.number}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>
                            {person.number}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Vendor Form Modal */}
      {showAddForm && createPortal(
        (() => {
          const modalContent = (
            <AnimatePresence>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCancelForm}
                style={{ 
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  zIndex: 99999
                }}
              />
              <div 
                key="modal-container"
                className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" 
                style={{ 
                  position: 'fixed',
                  zIndex: 100000
                }}
              >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              ref={modalRef}
              className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[calc(95vh-2rem)] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-50 rounded-md">
                    <BusinessIcon className="w-4 h-4" style={{ color: '#2563eb' }} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <AddIcon className="w-4 h-4" style={{ color: '#4b5563' }} />
                    <div>
                      <h2 className="text-base font-bold text-gray-900">
                        {editingVendor ? `Edit Vendor for ${clientName}` : `Add Vendor for ${clientName}`}
                      </h2>
                      <p className="text-xs text-gray-500">Add vendor information and contact details</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCancelForm}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-150"
                  type="button"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form id="create-vendor-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
                {formErrors.submit && (
                  <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                    {formErrors.submit}
                  </div>
                )}

                {/* Basic Information */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Vendor Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Vendor Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.vendor_name}
                        onChange={(e) => {
                          handleFieldChange('vendor_name', e.target.value);
                          if (formErrors.vendor_name) {
                            setFormErrors({ ...formErrors, vendor_name: '' });
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                          formErrors.vendor_name ? 'bg-red-50' : 'bg-white'
                        }`}
                        placeholder="e.g., ABC Corporation"
                      />
                      {formErrors.vendor_name && (
                        <p className="mt-0.5 text-xs text-red-600">{formErrors.vendor_name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Vendor address"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="Vendor description"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Persons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact Persons</h3>
                    <button
                      type="button"
                      onClick={handleAddContactPerson}
                      className="px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-150 flex items-center space-x-1"
                    >
                      <AddIcon className="w-3 h-3" />
                      <span>Add Contact</span>
                    </button>
                  </div>
                  
                  {formErrors.contact_persons && (
                    <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                      {formErrors.contact_persons}
                    </div>
                  )}

                  {formData.contact_persons.map((person, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Contact Person {index + 1}</span>
                        {formData.contact_persons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveContactPerson(index)}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-all duration-150"
                          >
                            <DeleteIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Name <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={person.name}
                            onChange={(e) => handleContactPersonChange(index, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Contact name"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Email
                            </label>
                            <input
                              type="email"
                              value={person.email}
                              onChange={(e) => {
                                handleContactPersonChange(index, 'email', e.target.value);
                                if (formErrors[`contact_${index}`]) {
                                  setFormErrors({ ...formErrors, [`contact_${index}`]: '' });
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                formErrors[`contact_${index}`] ? 'bg-red-50' : 'bg-white'
                              }`}
                              placeholder="email@example.com"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={person.number}
                              onChange={(e) => {
                                handleContactPersonChange(index, 'number', e.target.value);
                                if (formErrors[`contact_${index}`]) {
                                  setFormErrors({ ...formErrors, [`contact_${index}`]: '' });
                                }
                              }}
                              className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                formErrors[`contact_${index}`] ? 'bg-red-50' : 'bg-white'
                              }`}
                              placeholder="+1 234 567 8900"
                            />
                          </div>
                        </div>
                        {formErrors[`contact_${index}`] && (
                          <p className="mt-0.5 text-xs text-red-600">{formErrors[`contact_${index}`]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </form>

              {/* Actions - Fixed at bottom */}
              <div className="bg-white px-4 py-3 flex items-center justify-end space-x-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="create-vendor-form"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <SaveIcon className="w-3.5 h-3.5" />
                  <span>{editingVendor ? 'Update Vendor' : 'Create Vendor'}</span>
                </button>
              </div>
            </motion.div>
          </div>
            </AnimatePresence>
          );
          return modalContent;
        })(),
        document.body
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div className={`snackbar ${snackbar.severity === 'success' ? 'snackbar-success' : 'snackbar-error'}`}>
          <span>{snackbar.message}</span>
          <button
            onClick={() => setSnackbar({ open: false, message: '', severity: 'success' })}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0',
              marginLeft: 'auto',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default VendorManagement;

