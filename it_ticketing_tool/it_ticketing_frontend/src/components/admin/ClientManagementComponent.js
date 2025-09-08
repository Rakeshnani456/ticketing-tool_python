import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Chip, Tooltip, Button, Menu, MenuItem, Snackbar, Alert, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Typography, Collapse, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowDownward, ArrowUpward, Edit as EditIcon, Delete as DeleteIcon, Save as SaveIcon, Cancel as CancelIcon, Add as AddIcon, Clear as ClearIcon } from '@mui/icons-material';
import Select from 'react-select'; // Import react-select
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { API_BASE_URL } from '../../config/constants';
import { supabase } from '../../config/supabase';
import ClientInfoModal from '../common/ClientInfoModal';
import PrimaryButton from '../common/PrimaryButton';
import ClientCard from './ClientCard';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Helper to get initials from email or name
const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return '';
  const parts = nameOrEmail.split('@')[0].split('.');
  return parts.map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2);
};

// Helper to get contract status
const getContractStatus = (endDate) => {
  if (!endDate) return { label: 'No End Date', color: 'default' };
  const end = new Date(endDate);
  const today = new Date();
  if (end < today) return { label: 'Expired', color: 'error' };
  const diff = (end - today) / (1000 * 60 * 60 * 24);
  if (diff < 30) return { label: 'Expiring', color: 'warning' };
  return { label: 'Active', color: 'success' };
};

const initialClientState = {
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

const columnHelper = createColumnHelper();

const GROUPS = [
  {
    key: 'company',
    label: 'Company Info',
    columns: [
      'companyName', 'website', 'location', 'clientContactNumber'
    ]
  },
  {
    key: 'auth',
    label: 'Auth Info',
    columns: [
      'authFirstName', 'authLastName', 'authContactNumber', 'authOfficeEmail', 'authPersonalEmail', 'authDesignation'
    ]
  },
  {
    key: 'site',
    label: 'Site Admin Info',
    columns: [
      'siteFirstName', 'siteLastName', 'siteEmail', 'siteContactNumber', 'siteDesignation'
    ]
  }
];

const ClientManagementComponent = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showClientModal, setShowClientModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [removeClient, setRemoveClient] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [actionMode, setActionMode] = useState(null); // 'edit' | 'delete' | null
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const handleMenuOpen = (e) => setMenuAnchorEl(e.currentTarget);
  const handleMenuClose = () => setMenuAnchorEl(null);
  const handleActionMode = (mode) => { setActionMode(mode); setMenuAnchorEl(null); };

  // Using Supabase instead of Firebase

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

  useEffect(() => {
    // Only set up listeners if user exists and has required role
    if (!user || !['admin', 'site_admin', 'super_admin'].includes(user.role)) {
      return;
    }

    setLoading(true);
    setError(null);
    
    let unsubClients = null;
    let unsubUsers = null;
    
    // Fetch clients using Supabase
    const fetchClients = async () => {
      try {
        const { data: clientsData, error } = await supabase
          .from('clients')
          .select('*');
        
        if (error) throw error;
        
        setClients(clientsData || []);
        setLoading(false);
      } catch (err) {
        setError('Could not load clients.');
        setClients([]);
        setLoading(false);
      }
    };

    // Fetch users using Supabase
    const fetchUsers = async () => {
      try {
        const { data: usersData, error } = await supabase
          .from('users')
          .select('*');
        
        if (error) throw error;
        
        setUsers(usersData || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        // Don't set error here as it's not critical for client management
      }
    };

    // Fetch data
    fetchClients();
    fetchUsers();

    // Set up real-time subscriptions
    const clientsSubscription = supabase
      .channel('clients-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' }, 
        () => fetchClients()
      )
      .subscribe();

    const usersSubscription = supabase
      .channel('users-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'users' }, 
        () => fetchUsers()
      )
      .subscribe();

    unsubClients = () => clientsSubscription.unsubscribe();
    unsubUsers = () => usersSubscription.unsubscribe();
    
    return () => {
      if (unsubClients) unsubClients();
      if (unsubUsers) unsubUsers();
    };
  }, [user?.uid, user?.role]); // Only depend on user ID and role, not the entire user object

  // Handler for edit
  const handleEditClient = (client) => {
    setEditClient(client);
    setShowClientModal(true);
  };
  // Handler for remove
  const handleRemoveClient = (client) => {
    setRemoveClient(client);
  };
  const confirmRemoveClient = async () => {
    if (!removeClient) return;
    setRemoving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/clients/${removeClient.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove client');
      setSnackbar({ open: true, message: 'Client removed successfully.', severity: 'success' });
      setRemoveClient(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  const handleSaveClient = async (data) => {
    try {
      if (editClient) {
        // Update existing client
        const res = await fetch(`${API_BASE_URL}/api/clients/${editClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update client');
        setSnackbar({ open: true, message: 'Client updated successfully.', severity: 'success' });
      } else {
        // Create new client
        const res = await fetch(`${API_BASE_URL}/api/clients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create client');
        setSnackbar({ open: true, message: 'Client created successfully.', severity: 'success' });
      }
      setShowClientModal(false);
      setEditClient(null);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  return (
    <div className="client-management-page" style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', boxSizing: 'border-box', background: '#fff', padding: 0 }}>
      {/* Title and Add Client Button side by side, left-aligned */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 24, paddingLeft: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="text-2xl font-bold" style={{ marginBottom: 0, wordBreak: 'break-word', maxWidth: '100%', fontSize: '1.1rem' }}>Client Management</h2>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowClientModal(true)}
            size="small"
            sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
          >
            Add Client
          </Button>
          <Button
            variant="text"
            size="small"
            sx={{ minWidth: 0, padding: '2px', height: 24, borderRadius: 1 }}
            onClick={handleMenuOpen}
          >
            <MoreVertIcon fontSize="small" />
          </Button>
        </div>
        {actionMode && (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, borderRadius: 1, mr: 4 }}
            onClick={() => setActionMode(null)}
          >
            Cancel
          </Button>
        )}
        <Menu anchorEl={menuAnchorEl} open={!!menuAnchorEl} onClose={handleMenuClose}>
          <MenuItem onClick={() => handleActionMode('edit')} sx={{ fontSize: '0.85rem' }}>Edit Client</MenuItem>
          <MenuItem onClick={() => handleActionMode('delete')} sx={{ fontSize: '0.85rem' }}>Delete Client</MenuItem>
        </Menu>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Loading clients...</Typography>
      ) : (
        <Box sx={{ width: '100%', m: 0, p: 0 }}>
          {clients.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>No clients found.</Typography>
          ) : (
            clients.map((client, index) => (
              <ClientCard
                key={client.id}
                client={client}
                index={index + 1}
                onEdit={actionMode === 'edit' ? handleEditClient : undefined}
                onRemove={actionMode === 'delete' ? handleRemoveClient : undefined}
                showEdit={actionMode === 'edit' && ['admin', 'site_admin', 'super_admin'].includes(user?.role)}
                showRemove={actionMode === 'delete' && ['admin', 'site_admin', 'super_admin'].includes(user?.role)}
                userCount={userCounts[client.companyName] || 0}
              />
            ))
          )}
        </Box>
      )}

      {/* Client Info Modal */}
      <ClientInfoModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditClient(null);
        }}
        onSave={handleSaveClient}
        initialData={editClient}
      />

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeClient} onClose={() => setRemoveClient(null)}>
        <DialogTitle>Remove Client</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{removeClient?.companyName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveClient(null)} disabled={removing}>
            Cancel
          </Button>
          <Button onClick={confirmRemoveClient} color="error" disabled={removing}>
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          top: '80px !important', // Position below the header/tabs
          '& .MuiAlert-root': {
            minWidth: '300px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ClientManagementComponent;