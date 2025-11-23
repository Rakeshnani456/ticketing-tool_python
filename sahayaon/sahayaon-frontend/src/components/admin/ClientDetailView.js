import React, { useState, useEffect } from 'react';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Language as WebsiteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, getFirestore, collection, query, where } from 'firebase/firestore';
import { app } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import CustomDropdown from '../common/CustomDropdown';
import { getCountryOptions } from '../../services/countryService';
import VendorManagement from './VendorManagement';

const ClientDetailView = ({ user }) => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const db = getFirestore(app);

  const [client, setClient] = useState(null);
  const [clientUsers, setClientUsers] = useState([]);
  const [clientAssets, setClientAssets] = useState([]);
  const [clientVendors, setClientVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editError, setEditError] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const editMode = searchParams.get('edit') === 'true';
    if (editMode && client) {
      setIsEditMode(true);
      setFormData({ ...client });
    }
  }, [searchParams, client]);

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

  useEffect(() => {
    if (!client?.companyName) return;
    const unsubscribeAssets = onSnapshot(
      query(collection(db, 'assets'), where('client_name', '==', client.companyName)),
      (snapshot) => {
        const assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClientAssets(assets);
      },
      (error) => console.error('Error fetching assets:', error)
    );
    return () => unsubscribeAssets();
  }, [client?.companyName, db]);

  useEffect(() => {
    if (!client?.companyName) return;
    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users'), where('client_name', '==', client.companyName)),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setClientUsers(users);
      },
      (error) => console.error('Error fetching client users:', error)
    );
    return () => unsubscribeUsers();
  }, [client?.companyName, db]);

  useEffect(() => {
    if (!client?.companyName) return;
    const unsubscribeVendors = onSnapshot(
      query(collection(db, 'vendors'), where('client_name', '==', client.companyName)),
      (snapshot) => {
        const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClientVendors(vendors);
      },
      (error) => console.error('Error fetching vendors:', error)
    );
    return () => unsubscribeVendors();
  }, [client?.companyName, db]);

  const handleEditClient = () => {
    setIsEditMode(true);
    setFormData({ ...client });
    setEditError(null);
    setShowSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setFormData({});
    setEditError(null);
    setShowSuccess(false);
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleDeleteClient = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete client');
      setSnackbar({ open: true, message: 'Client deleted successfully', severity: 'success' });
      setTimeout(() => navigate('/clients'), 1500);
    } catch (error) {
      console.error('Error deleting client:', error);
      setSnackbar({ open: true, message: 'Failed to delete client', severity: 'error' });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleAddUser = () => {
    navigate(`/user-management/create-user?client=${encodeURIComponent(client.companyName)}`);
  };

  const handleManageUsers = () => {
    navigate(`/user-management/client/${encodeURIComponent(client.companyName)}`);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#3b82f6', width: '30%', animation: 'loading 1.5s ease-in-out infinite' }}></div>
        </div>
        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading client details...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ 
          padding: '1rem', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          color: '#dc2626',
          marginBottom: '1rem'
        }}>
          {error || 'Client not found'}
        </div>
        <button 
          onClick={() => navigate('/clients')} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            background: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          <ArrowBackIcon fontSize="small" />
          Back to Client Management
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        
        .page-header {
          background: white;
          padding: 1rem 1.5rem;
          margin: -1rem -1rem 1.5rem -1rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .page-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .btn {
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
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
        
        .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .btn-primary:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        
        .btn-danger:hover {
          background: #dc2626;
          border-color: #dc2626;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .stat-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          text-align: center;
        }
        
        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin: 0.5rem 0;
        }
        
        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .tabs-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          overflow: hidden;
        }
        
        .tabs-header {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        
        .tab-button {
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        
        .tab-button:hover {
          color: #374151;
          background: #f3f4f6;
        }
        
        .tab-button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
          background: white;
        }
        
        .tab-content {
          padding: 1.5rem;
        }
        
        .info-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.25rem;
          margin-bottom: 1rem;
        }
        
        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .section-title.edit-mode {
          font-weight: 600;
          color: #1e40af;
          font-size: 0.9375rem;
          border-bottom-color: #e5e7eb;
        }
        
        .info-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 1rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }
        
        .info-value {
          font-size: 0.875rem;
          color: #111827;
          font-weight: 400;
        }
        
        .info-value a {
          color: #3b82f6;
          text-decoration: none;
        }
        
        .info-value a:hover {
          text-decoration: underline;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.375rem;
        }
        
        .form-label.edit-mode {
          font-weight: 500;
          color: #1e40af;
          font-size: 0.8125rem;
        }
        
        .form-input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
          box-sizing: border-box;
          color: #111827;
          font-weight: 400;
        }
        
        .form-input.edit-mode {
          font-weight: 500;
          color: #1e293b;
          border-color: #d1d5db;
          background: white;
        }
        
        .form-input.edit-mode:focus {
          outline: none;
          border-color: #9ca3af;
          box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
          background: white;
          font-weight: 600;
          color: #0f172a;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .form-grid-full {
          grid-column: 1 / -1;
        }
        
        .form-grid-2x2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .form-grid-2x2 .form-group-full {
          grid-column: 1 / -1;
        }
        
        .two-column-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        
        @media (max-width: 768px) {
          .two-column-grid {
            grid-template-columns: 1fr;
          }
          
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .table-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .table-container table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table-container thead {
          background: #f9fafb;
        }
        
        .table-container th {
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .table-container td {
          padding: 0.75rem;
          font-size: 0.875rem;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .table-container tbody tr:hover {
          background: #f9fafb;
        }
        
        .table-container tbody tr:last-child td {
          border-bottom: none;
        }
        
        .chip {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.625rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          border: 1px solid;
        }
        
        .chip-success {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        
        .chip-error {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        
        .chip-primary {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
        
        .chip-default {
          background: #f9fafb;
          color: #374151;
          border-color: #e5e7eb;
        }
        
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
        }
        
        .alert {
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .alert-success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #16a34a;
        }
        
        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1300;
        }
        
        .modal-content {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
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

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/clients')} className="btn">
            <ArrowBackIcon fontSize="small" />
            Back
          </button>
          <h1 className="page-title">
            <BusinessIcon style={{ fontSize: '1.5rem', color: '#6b7280' }} />
            {client.companyName}
          </h1>
          <span className={`chip ${(client.status || 'active') === 'active' ? 'chip-success' : 'chip-error'}`}>
            {(client.status || 'active') === 'active' ? (
              <>
                <CheckCircleIcon style={{ fontSize: '0.875rem', marginRight: '0.25rem' }} />
                Active
              </>
            ) : (
              <>
                <ErrorIcon style={{ fontSize: '0.875rem', marginRight: '0.25rem' }} />
                Inactive
              </>
            )}
          </span>
        </div>
        {['admin', 'site_admin', 'super_admin'].includes(user?.role) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isEditMode ? (
              <>
                <button className="btn" onClick={handleCancelEdit} disabled={isSubmitting}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveClient} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={handleEditClient}>
                  <EditIcon fontSize="small" />
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => setShowDeleteDialog(true)}>
                  <DeleteIcon fontSize="small" />
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {isEditMode && showSuccess && (
          <div className="alert alert-success">Client updated successfully!</div>
        )}
        {isEditMode && editError && (
          <div className="alert alert-error">{editError}</div>
        )}

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-item">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{clientUsers.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value">{clientAssets.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Total Vendors</div>
            <div className="stat-value">{clientVendors.length}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Status</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>
              {(client.status || 'active') === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button 
              className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
              onClick={() => setActiveTab(0)}
            >
              About
            </button>
            <button 
              className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
            >
              Users ({clientUsers.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 2 ? 'active' : ''}`}
              onClick={() => setActiveTab(2)}
            >
              Assets ({clientAssets.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 3 ? 'active' : ''}`}
              onClick={() => setActiveTab(3)}
            >
              Vendors ({clientVendors.length})
            </button>
          </div>

          {/* About Tab */}
          {activeTab === 0 && (
            <div className="tab-content">
              <div className="info-card">
                <h2 className={`section-title ${isEditMode ? 'edit-mode' : ''}`}>
                  <BusinessIcon style={{ fontSize: '1rem' }} />
                  Company Information
                </h2>
                {isEditMode ? (
                  <form onSubmit={handleSaveClient}>
                    <div className="form-grid-2x2">
                      <div className="form-group">
                        <label className="form-label edit-mode">Company Name</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.companyName || ''}
                          onChange={(e) => handleFieldChange('companyName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Website</label>
                        <input
                          type="url"
                          className="form-input edit-mode"
                          value={formData.website || ''}
                          onChange={(e) => handleFieldChange('website', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Contact Number</label>
                        <input
                          type="tel"
                          className="form-input edit-mode"
                          value={formData.clientContactNumber || ''}
                          onChange={(e) => handleFieldChange('clientContactNumber', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Status</label>
                        <select
                          className="form-input edit-mode"
                          value={formData.status || 'active'}
                          onChange={(e) => handleFieldChange('status', e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div className="form-group form-group-full">
                        <label className="form-label edit-mode">Address</label>
                        <textarea
                          className="form-input edit-mode"
                          value={formData.location || ''}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="info-row">
                      <span className="info-label">Company Name</span>
                      <span className="info-value">{client.companyName}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Address</span>
                      <span className="info-value">{client.location || 'Not specified'}</span>
                    </div>
                    {client.website && (
                      <div className="info-row">
                        <span className="info-label">Website</span>
                        <span className="info-value">
                          <a href={client.website} target="_blank" rel="noopener noreferrer">{client.website}</a>
                        </span>
                      </div>
                    )}
                    {client.clientContactNumber && (
                      <div className="info-row">
                        <span className="info-label">Contact Number</span>
                        <span className="info-value">
                          <a href={`tel:${client.clientContactNumber}`}>{client.clientContactNumber}</a>
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Authorized Person and Site Admin Side by Side */}
              <div className="two-column-grid">
                <div className="info-card">
                  <h2 className={`section-title ${isEditMode ? 'edit-mode' : ''}`}>
                    <PersonIcon style={{ fontSize: '1rem' }} />
                    Authorized Person
                  </h2>
                  {isEditMode ? (
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label edit-mode">First Name</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.authFirstName || ''}
                          onChange={(e) => handleFieldChange('authFirstName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Last Name</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.authLastName || ''}
                          onChange={(e) => handleFieldChange('authLastName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Designation</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.authDesignation || ''}
                          onChange={(e) => handleFieldChange('authDesignation', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Office Email</label>
                        <input
                          type="email"
                          className="form-input edit-mode"
                          value={formData.authOfficeEmail || ''}
                          onChange={(e) => handleFieldChange('authOfficeEmail', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Personal Email</label>
                        <input
                          type="email"
                          className="form-input edit-mode"
                          value={formData.authPersonalEmail || ''}
                          onChange={(e) => handleFieldChange('authPersonalEmail', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Country Code</label>
                        <CustomDropdown
                          value={formData.authContactCountryCode || ''}
                          onChange={(value) => handleFieldChange('authContactCountryCode', value)}
                          options={getCountryOptions()}
                          placeholder="Select country code"
                          size="sm"
                          focusStyle="gray"
                        />
                      </div>
                      <div className="form-group form-grid-full">
                        <label className="form-label edit-mode">Contact Number</label>
                        <input
                          type="tel"
                          className="form-input edit-mode"
                          value={formData.authContactNumber || ''}
                          onChange={(e) => handleFieldChange('authContactNumber', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="info-row">
                        <span className="info-label">Name</span>
                        <span className="info-value">
                          {`${client.authFirstName || ''} ${client.authLastName || ''}`.trim() || 'Not specified'}
                        </span>
                      </div>
                      {client.authDesignation && (
                        <div className="info-row">
                          <span className="info-label">Designation</span>
                          <span className="info-value">{client.authDesignation}</span>
                        </div>
                      )}
                      {client.authOfficeEmail && (
                        <div className="info-row">
                          <span className="info-label">Office Email</span>
                          <span className="info-value">
                            <a href={`mailto:${client.authOfficeEmail}`}>{client.authOfficeEmail}</a>
                          </span>
                        </div>
                      )}
                      {client.authPersonalEmail && (
                        <div className="info-row">
                          <span className="info-label">Personal Email</span>
                          <span className="info-value">
                            <a href={`mailto:${client.authPersonalEmail}`}>{client.authPersonalEmail}</a>
                          </span>
                        </div>
                      )}
                      {client.authContactNumber && (
                        <div className="info-row">
                          <span className="info-label">Contact</span>
                          <span className="info-value">
                            <a href={`tel:${client.authContactNumber}`}>
                              {client.authContactCountryCode ? `${client.authContactCountryCode} ` : ''}
                              {client.authContactNumber}
                            </a>
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="info-card">
                  <h2 className={`section-title ${isEditMode ? 'edit-mode' : ''}`}>
                    <AdminIcon style={{ fontSize: '1rem' }} />
                    Site Administrator
                  </h2>
                  {isEditMode ? (
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label edit-mode">First Name</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.siteFirstName || ''}
                          onChange={(e) => handleFieldChange('siteFirstName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Last Name</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.siteLastName || ''}
                          onChange={(e) => handleFieldChange('siteLastName', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Designation</label>
                        <input
                          type="text"
                          className="form-input edit-mode"
                          value={formData.siteDesignation || ''}
                          onChange={(e) => handleFieldChange('siteDesignation', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Email</label>
                        <input
                          type="email"
                          className="form-input edit-mode"
                          value={formData.siteEmail || ''}
                          onChange={(e) => handleFieldChange('siteEmail', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label edit-mode">Country Code</label>
                        <CustomDropdown
                          value={formData.siteContactCountryCode || ''}
                          onChange={(value) => handleFieldChange('siteContactCountryCode', value)}
                          options={getCountryOptions()}
                          placeholder="Select country code"
                          size="sm"
                          focusStyle="gray"
                        />
                      </div>
                      <div className="form-group form-grid-full">
                        <label className="form-label edit-mode">Contact Number</label>
                        <input
                          type="tel"
                          className="form-input edit-mode"
                          value={formData.siteContactNumber || ''}
                          onChange={(e) => handleFieldChange('siteContactNumber', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="info-row">
                        <span className="info-label">Name</span>
                        <span className="info-value">
                          {`${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim() || 'Not specified'}
                        </span>
                      </div>
                      {client.siteDesignation && (
                        <div className="info-row">
                          <span className="info-label">Designation</span>
                          <span className="info-value">{client.siteDesignation}</span>
                        </div>
                      )}
                      {client.siteEmail && (
                        <div className="info-row">
                          <span className="info-label">Email</span>
                          <span className="info-value">
                            <a href={`mailto:${client.siteEmail}`}>{client.siteEmail}</a>
                          </span>
                        </div>
                      )}
                      {client.siteContactNumber && (
                        <div className="info-row">
                          <span className="info-label">Contact</span>
                          <span className="info-value">
                            <a href={`tel:${client.siteContactNumber}`}>
                              {client.siteContactCountryCode ? `${client.siteContactCountryCode} ` : ''}
                              {client.siteContactNumber}
                            </a>
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 1 && (
            <div className="tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                  Users ({clientUsers.length})
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn" onClick={handleManageUsers}>
                    <GroupIcon fontSize="small" />
                    Manage Users
                  </button>
                  <button className="btn btn-primary" onClick={handleAddUser}>
                    <AddIcon fontSize="small" />
                    Add User
                  </button>
                </div>
              </div>
              {clientUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No users found for this client</p>
                  <button className="btn btn-primary" onClick={handleAddUser}>
                    <PersonAddIcon fontSize="small" />
                    Add First User
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientUsers.slice(0, 10).map((clientUser) => (
                        <tr key={clientUser.uid}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="avatar">
                                {clientUser.firstName?.charAt(0) || clientUser.email?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                                  {clientUser.firstName} {clientUser.lastName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  {clientUser.designation || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{clientUser.email}</td>
                          <td>
                            <span className={`chip ${clientUser.role === 'site_admin' ? 'chip-primary' : 'chip-default'}`}>
                              {clientUser.role === 'site_admin' ? 'Site Admin' : 'User'}
                            </span>
                          </td>
                          <td>
                            <span className={`chip ${(clientUser.status || 'active') === 'active' ? 'chip-success' : 'chip-error'}`}>
                              {(clientUser.status || 'active') === 'active' ? (
                                <>
                                  <CheckCircleIcon style={{ fontSize: '0.75rem', marginRight: '0.25rem' }} />
                                  Active
                                </>
                              ) : (
                                <>
                                  <ErrorIcon style={{ fontSize: '0.75rem', marginRight: '0.25rem' }} />
                                  Inactive
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {clientUsers.length > 10 && (
                    <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                      <button className="btn" onClick={handleManageUsers}>
                        View All {clientUsers.length} Users →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 2 && (
            <div className="tab-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                  Assets ({clientAssets.length})
                </h3>
                <button className="btn btn-primary" onClick={() => navigate(`/assets?client=${encodeURIComponent(client.companyName)}`)}>
                  <AssessmentIcon fontSize="small" />
                  Manage Assets
                </button>
              </div>
              {clientAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No assets found for this client</p>
                  <button className="btn btn-primary" onClick={() => navigate(`/assets?client=${encodeURIComponent(client.companyName)}`)}>
                    <AddIcon fontSize="small" />
                    Add Asset
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset Name</th>
                        <th>Asset ID</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientAssets.slice(0, 10).map((asset) => (
                        <tr 
                          key={asset.id} 
                          style={{ cursor: 'pointer' }} 
                          onClick={() => navigate(`/assets?client=${encodeURIComponent(client.companyName)}`)}
                        >
                          <td>{asset.asset_name || asset.name || 'Unnamed Asset'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                            {asset.asset_id || asset.id?.substring(0, 8)}
                          </td>
                          <td>
                            <span className={`chip ${asset.asset_type === 'hardware' ? 'chip-primary' : 'chip-default'}`}>
                              {asset.asset_type || 'Unknown'}
                            </span>
                          </td>
                          <td>
                            <span className={`chip ${
                              asset.status === 'Active' ? 'chip-success' : 
                              asset.status === 'Under Repair' ? 'chip-default' : 
                              'chip-default'
                            }`}>
                              {asset.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {clientAssets.length > 10 && (
                    <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
                      <button className="btn" onClick={() => navigate(`/assets?client=${encodeURIComponent(client.companyName)}`)}>
                        View All {clientAssets.length} Assets →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === 3 && (
            <div className="tab-content">
              <VendorManagement clientName={client.companyName} user={user} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => setShowDeleteDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>Delete Client</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
              Are you sure you want to delete <strong>{client.companyName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteClient} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div className={`snackbar ${snackbar.severity === 'success' ? 'snackbar-success' : 'snackbar-error'}`}>
          <span>{snackbar.message}</span>
          <button 
            onClick={() => setSnackbar(prev => ({ ...prev, open: false }))}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'white', 
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0',
              marginLeft: 'auto'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientDetailView;
