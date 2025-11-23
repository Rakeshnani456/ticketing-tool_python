import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/constants';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../../config/firebase';
import { CSVLink } from 'react-csv';
import FaviconIcon from '../common/FaviconIcon';

const ClientGridManagement = ({ user }) => {
  // State management
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedClients, setSelectedClients] = useState([]);
  const [orderBy, setOrderBy] = useState('companyName');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    location: '',
    userCount: 'all',
    status: 'all',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();
  const db = getFirestore(app);

  // Calculate user counts per client
  const userCounts = useMemo(() => {
    const counts = {};
    users.forEach(user => {
      const clientName = user.client_name || user.companyName;
      if (clientName) {
        counts[clientName] = (counts[clientName] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  // Calculate asset counts per client
  const assetCounts = useMemo(() => {
    const counts = {};
    assets.forEach(asset => {
      const clientName = asset.client_name;
      if (clientName) {
        if (!counts[clientName]) {
          counts[clientName] = { total: 0, hardware: 0, software: 0 };
        }
        counts[clientName].total += 1;
        if (asset.asset_type === 'hardware') {
          counts[clientName].hardware += 1;
        } else if (asset.asset_type === 'software') {
          counts[clientName].software += 1;
        }
      }
    });
    return counts;
  }, [assets]);


  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = clients.filter(client => {
      // Search filter
      const searchMatch = !searchTerm || 
        client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.authOfficeEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.siteEmail?.toLowerCase().includes(searchTerm.toLowerCase());

      // Location filter
      const locationMatch = !filters.location || 
        client.location?.toLowerCase().includes(filters.location.toLowerCase());

      // User count filter
      const userCount = userCounts[client.companyName] || 0;
      const userCountMatch = filters.userCount === 'all' ||
        (filters.userCount === 'hasUsers' && userCount > 0) ||
        (filters.userCount === 'noUsers' && userCount === 0);

      return searchMatch && locationMatch && userCountMatch;
    });

    return filtered;
  }, [clients, searchTerm, filters, userCounts]);

  // Sort function
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sort the filtered data
  const sortedClients = useMemo(() => {
    return filteredClients.sort((a, b) => {
      let valueA, valueB;
      
      switch (orderBy) {
        case 'companyName':
          valueA = a.companyName?.toLowerCase() || '';
          valueB = b.companyName?.toLowerCase() || '';
          break;
        case 'location':
          valueA = a.location?.toLowerCase() || '';
          valueB = b.location?.toLowerCase() || '';
          break;
        case 'userCount':
          valueA = userCounts[a.companyName] || 0;
          valueB = userCounts[b.companyName] || 0;
          break;
        case 'authEmail':
          valueA = a.authOfficeEmail?.toLowerCase() || '';
          valueB = b.authOfficeEmail?.toLowerCase() || '';
          break;
        case 'siteEmail':
          valueA = a.siteEmail?.toLowerCase() || '';
          valueB = b.siteEmail?.toLowerCase() || '';
          break;
        default:
          valueA = a.companyName?.toLowerCase() || '';
          valueB = b.companyName?.toLowerCase() || '';
      }

      if (typeof valueA === 'string') {
        const result = valueA.localeCompare(valueB);
        return order === 'asc' ? result : -result;
      } else {
        return order === 'asc' ? valueA - valueB : valueB - valueA;
      }
    });
  }, [filteredClients, orderBy, order, userCounts]);

  // Paginated data
  const paginatedClients = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedClients.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedClients, page, rowsPerPage]);


  // Data fetching
  useEffect(() => {
    if (!user || !['admin', 'site_admin', 'super_admin'].includes(user?.role)) return;

    const unsubscribeClients = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setError('Failed to load clients');
        setLoading(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setUsers(usersData);
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );

    const unsubscribeAssets = onSnapshot(
      collection(db, 'assets'),
      (snapshot) => {
        const assetsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAssets(assetsData);
      },
      (error) => {
        console.error('Error fetching assets:', error);
      }
    );

    return () => {
      unsubscribeClients();
      unsubscribeUsers();
      unsubscribeAssets();
    };
  }, [user, db]);

  // Event handlers
  const handleAddClient = () => {
    navigate('/clients/create-client');
  };

  const handleEditClient = (client) => {
    navigate(`/clients/client-detail/${client.id}?edit=true`);
  };

  const handleViewClient = (client) => {
    navigate(`/clients/client-detail/${client.id}`);
  };


  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteButtonPosition, setDeleteButtonPosition] = useState({ top: 0, left: 0 });
  const [popupRef, setPopupRef] = useState(null);

  const handleDeleteClient = (client, event) => {
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
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };


  const handleCancelDelete = (event) => {
    if (event) event.stopPropagation();
    setShowDeleteDialog(false);
    setClientToDelete(null);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteDialog && popupRef && !popupRef.contains(event.target)) {
        setShowDeleteDialog(false);
        setClientToDelete(null);
      }
    };

    if (showDeleteDialog) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteDialog, popupRef]);

  const handleConfirmDelete = async (event) => {
    if (event) event.stopPropagation();
    if (!clientToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/clients/${clientToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete client');

      setSnackbar({
        open: true,
        message: 'Client deleted successfully',
        severity: 'success'
      });
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
      setClientToDelete(null);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedClients(paginatedClients.map(client => client.id));
    } else {
      setSelectedClients([]);
    }
  };

  const handleSelectClient = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({
        open: true,
        message: 'Data refreshed successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh data',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleExportCSV = () => {
    return sortedClients.map(client => ({
      'Company Name': client.companyName,
      'Location': client.location,
      'Website': client.website,
      'Contact Number': client.clientContactNumber,
      'Auth Person': `${client.authFirstName} ${client.authLastName}`,
      'Auth Email': client.authOfficeEmail,
      'Site Admin': `${client.siteFirstName} ${client.siteLastName}`,
      'Site Email': client.siteEmail,
      'User Count': userCounts[client.companyName] || 0,
    }));
  };

  const getUserStatusChip = (userCount) => {
    if (userCount === 0) {
      return <span className="user-count-chip no-users">No Users</span>;
    } else if (userCount < 5) {
      return <span className="user-count-chip few-users">{userCount} Users</span>;
    } else if (userCount < 20) {
      return <span className="user-count-chip moderate-users">{userCount} Users</span>;
    } else {
      return <span className="user-count-chip many-users">{userCount} Users</span>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="client-management-page">
        <div className="page-header">
          <h1>Client Management</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
        <style>{`
          .loading-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 200px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="client-management-page">
        <div className="error-container">
          <div className="error-alert">
          {error}
          </div>
          <button className="btn btn-outline" onClick={handleRefresh}>
            <span className="icon">🔄</span>
          Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="client-management-page">
      <style>{`
        .client-management-page {
          padding: 1rem;
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .page-header {
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }
        
        .header-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn {
          padding: 0.375rem 0.75rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          text-decoration: none;
          color: inherit;
        }
        
        .btn:hover {
          background-color: #f9fafb;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .btn-primary:hover {
          background-color: #2563eb;
        }
        
        .btn-outline {
          background: white;
          color: #374151;
        }
        
        .btn-outline:hover {
          background-color: #f9fafb;
        }
        
        .icon {
          font-size: 1rem;
        }
        
        .btn svg {
          width: 16px;
          height: 16px;
        }
        
        .search-filters-card {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          margin-bottom: 0.75rem;
          padding: 0.75rem;
        }
        
        .search-filters-grid {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 1rem;
          align-items: center;
        }
        
        .search-input {
          position: relative;
        }
        
        .search-input input {
          width: 100%;
          padding: 0.5rem 0.5rem 0.5rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }
        
        .search-input .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
          width: 16px;
          height: 16px;
        }
        
        .filter-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .data-table-card {
          background: white;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          margin-bottom: 1rem;
          overflow: hidden;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th {
          background-color: #f8fafc;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }
        
        .data-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
          font-size: 0.875rem;
        }
        
        .data-table tr:hover {
          background-color: #f8fafc;
        }
        
        .data-table tr.selected {
          background-color: #eff6ff;
        }
        
        .sortable-header {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .sortable-header:hover {
          color: #3b82f6;
        }
        
        .sort-icon {
          font-size: 0.75rem;
          opacity: 0.5;
        }
        
        .sort-icon.active {
          opacity: 1;
          color: #3b82f6;
        }
        
        .checkbox {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }
        
        .client-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .client-avatar {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .client-details h4 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #3b82f6;
        }
        
        .client-details h4:hover {
          text-decoration: underline;
        }
        
        .client-details a {
          font-size: 0.75rem;
          color: #6b7280;
          text-decoration: none;
        }
        
        .client-details a:hover {
          color: #3b82f6;
        }
        
        .info-row {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #374151;
        }
        
        .info-icon {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .user-count-chip {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .user-count-chip.no-users {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        
        .user-count-chip.few-users {
          background-color: #fffbeb;
          color: #d97706;
          border: 1px solid #fed7aa;
        }
        
        .user-count-chip.moderate-users {
          background-color: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
        
        .user-count-chip.many-users {
          background-color: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        
        .action-buttons {
          display: flex;
          gap: 0.25rem;
          justify-content: center;
        }
        
        .action-btn {
          width: 2rem;
          height: 2rem;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          color: #374151;
        }
        
        .action-btn:hover {
          background-color: #f3f4f6;
          color: #1f2937;
        }
        
        .action-btn.delete:hover {
          background-color: #fef2f2;
          color: #dc2626;
        }
        
        .action-btn svg {
          width: 16px;
          height: 16px;
        }
        
        .action-btn {
          position: relative;
        }
        
        .action-btn:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #1f2937;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          white-space: nowrap;
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .action-btn:hover::before {
          content: '';
          position: absolute;
          bottom: calc(100% - 4px);
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1f2937;
          z-index: 1000;
          pointer-events: none;
        }
        
        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .pagination-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .pagination-btn {
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 0.875rem;
        }
        
        .pagination-btn:hover {
          background-color: #f9fafb;
        }
        
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        
        .filter-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          min-width: 200px;
        }
        
        .filter-menu-item {
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .filter-menu-item:hover {
          background-color: #f9fafb;
        }
        
        .filter-menu-item:last-child {
          border-bottom: none;
        }
        
        .filter-menu input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .snackbar {
          position: fixed;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 1rem;
          z-index: 10000;
          max-width: 400px;
        }
        
        .snackbar.success {
          border-color: #10b981;
          background-color: #f0fdf4;
        }
        
        .snackbar.error {
          border-color: #ef4444;
          background-color: #fef2f2;
        }
        
        .loading-container {
          padding: 2rem;
          text-align: center;
        }
        
        .loading-bar {
          width: 100%;
          height: 4px;
          background-color: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        
        .loading-bar::after {
          content: '';
          display: block;
          width: 30%;
          height: 100%;
          background-color: #3b82f6;
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-container {
          padding: 2rem;
        }
        
        .error-alert {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .refresh-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background-color: #3b82f6;
          z-index: 9999;
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
          .client-management-page {
            padding: 0.5rem;
          }
          
          .search-filters-grid {
            grid-template-columns: 1fr;
          }
          
          .filter-actions {
            justify-content: flex-start;
          }
          
          .table-container {
            font-size: 0.75rem;
          }
          
          .data-table th,
          .data-table td {
            padding: 0.5rem 0.25rem;
          }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <h1>Client Management</h1>
        <div className="header-actions">
          <button 
            className="btn btn-outline" 
            onClick={handleRefresh} 
            disabled={refreshing}
            title="Refresh Data"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10"/>
              <polyline points="1,20 1,14 7,14"/>
              <path d="M20.49,9A9,9 0 0,0 5.64,5.64L1,10m22,4l-4.64,4.36A9,9 0 0,1 3.51,15"/>
            </svg>
            <span className="hidden-mobile">Refresh</span>
          </button>
              <CSVLink 
                data={handleExportCSV()} 
                filename="clients.csv"
            className="btn btn-outline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="hidden-mobile">Export</span>
              </CSVLink>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-filters-card">
        <div className="search-filters-grid">
          <div className="search-input">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <button
              className="btn btn-primary"
                  onClick={handleAddClient}
                >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
                  Add Client
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={paginatedClients.length > 0 && selectedClients.length === paginatedClients.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>
                  <div 
                    className="sortable-header"
                    onClick={() => handleRequestSort('companyName')}
                  >
                    Company Name
                    <span className={`sort-icon ${orderBy === 'companyName' ? 'active' : ''}`}>
                      {orderBy === 'companyName' ? (order === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th>
                  <div 
                    className="sortable-header"
                    onClick={() => handleRequestSort('location')}
                  >
                    Location
                    <span className={`sort-icon ${orderBy === 'location' ? 'active' : ''}`}>
                      {orderBy === 'location' ? (order === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th>Contact</th>
                <th>
                  <div 
                    className="sortable-header"
                    onClick={() => handleRequestSort('authEmail')}
                  >
                    Auth Person
                    <span className={`sort-icon ${orderBy === 'authEmail' ? 'active' : ''}`}>
                      {orderBy === 'authEmail' ? (order === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th>
                  <div 
                    className="sortable-header"
                    onClick={() => handleRequestSort('siteEmail')}
                  >
                    Site Admin
                    <span className={`sort-icon ${orderBy === 'siteEmail' ? 'active' : ''}`}>
                      {orderBy === 'siteEmail' ? (order === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>
                  <div 
                    className="sortable-header"
                    onClick={() => handleRequestSort('userCount')}
                  >
                    Users
                    <span className={`sort-icon ${orderBy === 'userCount' ? 'active' : ''}`}>
                      {orderBy === 'userCount' ? (order === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                </th>
                <th style={{ textAlign: 'center' }}>Assets</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client) => {
                const isSelected = selectedClients.includes(client.id);
                const userCount = userCounts[client.companyName] || 0;
                const assetInfo = assetCounts[client.companyName] || { total: 0, hardware: 0, software: 0 };
                
                return (
                  <tr
                    key={client.id}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => handleViewClient(client)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectClient(client.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div className="client-info">
                        <div className="client-avatar">
                          <FaviconIcon 
                            websiteUrl={client.website} 
                            size="28px"
                            alt={`${client.companyName} favicon`}
                          />
                        </div>
                        <div className="client-details">
                          <h4>{client.companyName}</h4>
                          {client.website && (
                            <a 
                              href={client.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {client.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="info-row">
                        <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{client.location || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="info-row">
                        <svg className="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        <span>{client.clientContactNumber || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                          {`${client.authFirstName || ''} ${client.authLastName || ''}`.trim() || 'N/A'}
                        </div>
                        {client.authOfficeEmail && (
                          <a 
                            href={`mailto:${client.authOfficeEmail}`} 
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: '0.75rem', color: '#6b7280' }}
                          >
                            {client.authOfficeEmail}
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                          {`${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim() || 'N/A'}
                        </div>
                        {client.siteEmail && (
                          <a 
                            href={`mailto:${client.siteEmail}`} 
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: '0.75rem', color: '#6b7280' }}
                          >
                            {client.siteEmail}
                          </a>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {getUserStatusChip(userCount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/assets?client=${encodeURIComponent(client.companyName)}`);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="View Assets"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="9" y1="3" x2="9" y2="21"/>
                          </svg>
                          {assetInfo.total}
                        </button>
                        {assetInfo.total > 0 && (
                          <div style={{ fontSize: '0.65rem', color: '#6b7280', display: 'flex', gap: '0.5rem' }}>
                            <span>H: {assetInfo.hardware}</span>
                            <span>S: {assetInfo.software}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button 
                          className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewClient(client);
                            }}
                          data-tooltip="View Details"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        {['admin', 'site_admin', 'super_admin'].includes(user?.role) && (
                          <>
                            <button 
                              className="action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClient(client);
                                }}
                              data-tooltip="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                          <button 
                            className="action-btn delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClient(client, e);
                              }}
                            data-tooltip="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                          </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="pagination">
          <div className="pagination-info">
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, sortedClients.length)} of {sortedClients.length} entries
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              First
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              Previous
            </button>
            <span style={{ padding: '0 0.5rem' }}>Page {page + 1}</span>
            <button 
              className="pagination-btn"
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(sortedClients.length / rowsPerPage) - 1}
            >
              Next
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setPage(Math.ceil(sortedClients.length / rowsPerPage) - 1)}
              disabled={page >= Math.ceil(sortedClients.length / rowsPerPage) - 1}
            >
              Last
            </button>
            <select 
              className="pagination-select"
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>



      {/* Snackbar */}
      {snackbar.open && (
        <div className={`snackbar ${snackbar.severity}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{snackbar.message}</span>
            <button 
              onClick={() => setSnackbar(prev => ({ ...prev, open: false }))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {refreshing && (
        <div className="refresh-indicator"></div>
      )}

      {/* Delete Confirmation Bubble - Fixed Position Outside Container */}
      {showDeleteDialog && clientToDelete && (
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
            Are you sure you want to delete <strong>{clientToDelete.companyName}</strong>? 
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
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Client'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientGridManagement;
