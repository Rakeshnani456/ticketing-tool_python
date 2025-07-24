import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Chip, Tooltip, Button, Menu, MenuItem, Snackbar, Alert, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Typography, Collapse } from '@mui/material';
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

  return (
    <div style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', boxSizing: 'border-box', background: '#fff', padding: 0 }}>
      {/* Title and Add Client Button side by side, left-aligned */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 24, paddingLeft: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 className="text-2xl font-bold" style={{ marginBottom: 0, wordBreak: 'break-word', maxWidth: '100%', fontSize: '1.4rem' }}>Client Management</h2>
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
          >
            <MoreVertIcon fontSize="small" />
          </Button>
        </div>
        <Button
          variant="outlined"
          color="error"
          size="small"
          sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, borderRadius: 1, mr: 4 }}
        >
          Remove Client
        </Button>
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
              <ClientCard key={client.id} client={client} />
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
        onClose={() => setShowClientModal(false)}
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
            const res = await fetch(`${API_BASE_URL}/api/clients`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to add client');
            setSnackbar({ open: true, message: 'Client info saved successfully.', severity: 'success' });
            setShowClientModal(false);
          } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
          }
        }}
      />
    </div>
  );
};

export default ClientManagementComponent;