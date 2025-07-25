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
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app } from '../../config/firebase';
import ClientInfoModal from '../common/ClientInfoModal';
import PrimaryButton from '../common/PrimaryButton';
import ClientCard from './ClientCard';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// Helper to get initials from email or name
const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return '';
  const name = nameOrEmail.split('@')[0];
  const parts = name.split(/[ ._]/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Helper to get contract status
const getContractStatus = (contractEnd) => {
  if (!contractEnd) return { label: 'Unknown', color: 'default' };
  const today = new Date();
  const end = new Date(contractEnd);
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

const ClientManagementComponent = () => {
  const [clients, setClients] = useState([]);
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

  const db = getFirestore(app);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let unsubClients = null;
    unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      setError('Could not load clients.');
      setClients([]);
      setLoading(false);
    });
    return () => {
      if (unsubClients) unsubClients();
    };
  }, []);

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

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', boxSizing: 'border-box', background: '#fff', padding: 0 }}>
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
            clients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={actionMode === 'edit' ? handleEditClient : undefined}
                onRemove={actionMode === 'delete' ? handleRemoveClient : undefined}
                showEdit={actionMode === 'edit'}
                showRemove={actionMode === 'delete'}
              />
            ))
          )}
        </Box>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* Client Info Modal */}
      <ClientInfoModal
        isOpen={showClientModal}
        onClose={() => { setShowClientModal(false); setEditClient(null); }}
        initialData={editClient}
        onSave={async (data) => {
          const payload = {
            companyName: data.companyName,
            website: data.website,
            location: data.location,
            clientContactNumber: data.clientContactNumber,
            authFirstName: data.authFirstName,
            authLastName: data.authLastName,
            authContactNumber: data.authContactNumber,
            authOfficeEmail: data.authOfficeEmail,
            authPersonalEmail: data.authPersonalEmail,
            authDesignation: data.authDesignation,
            siteFirstName: data.siteFirstName,
            siteLastName: data.siteLastName,
            siteEmail: data.siteEmail,
            siteContactNumber: data.siteContactNumber,
            siteDesignation: data.siteDesignation,
          };
          try {
            const method = editClient ? 'PUT' : 'POST';
            const url = editClient ? `${API_BASE_URL}/api/clients/${editClient.id}` : `${API_BASE_URL}/api/clients`;
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(editClient ? 'Failed to update client' : 'Failed to add client');
            setSnackbar({ open: true, message: editClient ? 'Client updated successfully.' : 'Client info saved successfully.', severity: 'success' });
            setShowClientModal(false);
            setEditClient(null);
          } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
          }
        }}
      />
      <Dialog open={!!removeClient} onClose={() => setRemoveClient(null)}>
        <DialogTitle>Remove Client</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to remove <b>{removeClient?.companyName}</b>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveClient(null)} disabled={removing}>Cancel</Button>
          <Button onClick={confirmRemoveClient} color="error" disabled={removing}>{removing ? 'Removing...' : 'Remove'}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ClientManagementComponent;