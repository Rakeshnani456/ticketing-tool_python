import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Chip, IconButton, Tooltip, CircularProgress, Box, Typography, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { notification } from 'antd';
import { API_BASE_URL } from '../../config/constants';
import { useReactTable, getCoreRowModel, flexRender, getSortedRowModel } from '@tanstack/react-table';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'read_only_admin', label: 'Read-only Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const statusColor = (active) => (active ? 'success' : 'default');
const roleColor = (role) => {
  switch (role) {
    case 'super_admin': return 'primary';
    case 'admin': return 'info';
    case 'read_only_admin': return 'default';
    default: return 'default';
  }
};

const AdminManagementComponent = ({ currentUser }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'admin', active: true });
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [loginActivity, setLoginActivity] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sorting, setSorting] = React.useState([]);

  const openNotification = (type, message) => notification[type]({ message });

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const idToken = await currentUser.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/admin-management`, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch {
      openNotification('error', 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginActivity = async () => {
    setActivityOpen(true);
    try {
      const idToken = await currentUser.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/admin-management/login-activity`, { headers: { Authorization: `Bearer ${idToken}` } });
      const data = await res.json();
      setLoginActivity(data.activity || []);
    } catch {
      openNotification('error', 'Failed to fetch login activity');
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleDialogOpen = (admin = null) => {
    setEditMode(!!admin);
    setSelectedAdmin(admin);
    setForm(admin ? { ...admin, password: '' } : { email: '', password: '', role: 'admin', active: true });
    setDialogOpen(true);
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedAdmin(null);
    setForm({ email: '', password: '', role: 'admin', active: true });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const idToken = await currentUser.firebaseUser.getIdToken();
      if (editMode) {
        const res = await fetch(`${API_BASE_URL}/admin-management/${selectedAdmin.uid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ role: form.role, active: form.active }),
        });
        if (res.ok) {
          openNotification('success', 'Admin updated');
          fetchAdmins();
          handleDialogClose();
        } else {
          const data = await res.json();
          openNotification('error', data.error || 'Failed to update admin');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/admin-management`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          openNotification('success', 'Admin created');
          fetchAdmins();
          handleDialogClose();
        } else {
          const data = await res.json();
          openNotification('error', data.error || 'Failed to create admin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    setLoading(true);
    try {
      const idToken = await currentUser.firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/admin-management/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        openNotification('success', 'Admin deleted');
        fetchAdmins();
      } else {
        const data = await res.json();
        openNotification('error', data.error || 'Failed to delete admin');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debug: log admins data
  console.log('ADMINS DATA:', admins);

  // Define columns for TanStack Table
  const tableColumns = React.useMemo(() => [
    {
      accessorKey: 'email',
      header: 'Email',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: info => (
        <Chip label={info.getValue().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} color={roleColor(info.getValue())} size="small" />
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: info => (
        <Chip label={info.getValue() ? 'Active' : 'Disabled'} color={statusColor(info.getValue())} size="small" />
      ),
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: info => {
        const val = info.getValue();
        if (!val) return '—';
        try {
          return new Date(val).toLocaleString();
        } catch {
          return val;
        }
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit">
            <IconButton color="primary" size="small" onClick={() => handleDialogOpen(row.original)}><EditIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" size="small" onClick={() => handleDelete(row.original.uid)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [handleDialogOpen, handleDelete]);

  const table = useReactTable({
    data: admins,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Box sx={{ p: { xs: 0.5, md: 2 }, width: '100%', height: '100%', minHeight: 'calc(100vh - 64px)', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" fontWeight={600} mb={1.5}>Admin Management</Typography>
      <Stack direction="row" spacing={1} mb={1}>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleDialogOpen()} size="small">
          Create Admin
        </Button>
        <Button variant="outlined" color="info" startIcon={<VisibilityIcon />} onClick={fetchLoginActivity} size="small">
          View Login Activity
        </Button>
      </Stack>
      <Box sx={{ flex: 1, width: '100%', bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1, display: 'flex', flexDirection: 'column', p: 0.5 }}>
        {loading ? <Box display="flex" justifyContent="center" alignItems="center" flex={1}><CircularProgress size={24} /></Box> :
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <Box component="thead">
              <Box component="tr">
                {table.getHeaderGroups()[0].headers.map(header => (
                  <Box component="th" key={header.id} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', textAlign: 'left', fontWeight: 600, fontSize: 13, cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      header.column.getIsSorted() === 'asc' ? <ArrowDropUpIcon fontSize="small" sx={{ verticalAlign: 'middle' }} /> :
                      header.column.getIsSorted() === 'desc' ? <ArrowDropDownIcon fontSize="small" sx={{ verticalAlign: 'middle' }} /> :
                      <ArrowDropUpIcon fontSize="small" sx={{ opacity: 0.2, verticalAlign: 'middle' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {table.getRowModel().rows.map(row => (
                <Box component="tr" key={row.id} sx={{ minHeight: 32, maxHeight: 32 }}>
                  {row.getVisibleCells().map(cell => (
                    <Box component="td" key={cell.id} sx={{ p: 1, borderBottom: 1, borderColor: 'divider', fontSize: 13 }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        }
      </Box>
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>{editMode ? 'Edit Admin' : 'Create Admin'}</DialogTitle>
        <form onSubmit={handleCreateOrEdit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 1.5 }}>
            <TextField label="Email" name="email" value={form.email} onChange={handleFormChange} required fullWidth disabled={editMode} size="small" />
            {!editMode && <TextField label="Password" name="password" type="password" value={form.password} onChange={handleFormChange} required fullWidth size="small" />}
            <Select label="Role" name="role" value={form.role} onChange={handleFormChange} fullWidth size="small">
              {roleOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
            <Select label="Status" name="active" value={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'true' }))} fullWidth size="small">
              <MenuItem value={'true'}>Active</MenuItem>
              <MenuItem value={'false'}>Disabled</MenuItem>
            </Select>
          </DialogContent>
          <DialogActions sx={{ py: 1, px: 2 }}>
            <Button onClick={handleDialogClose} startIcon={<CloseIcon />} size="small">Cancel</Button>
            <Button type="submit" variant="contained" color="primary" startIcon={editMode ? <SaveIcon /> : <AddIcon />} disabled={loading} size="small">
              {editMode ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={activityOpen} onClose={() => setActivityOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 18, py: 1.5 }}>Admin Login Activity</DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          {loginActivity.length === 0 ? <Typography fontSize={14}>No activity found.</Typography> : (
            <Box>
              {loginActivity.map(a => (
                <Box key={a.uid} mb={1}>
                  <Typography fontWeight={600} fontSize={14}>{a.email}</Typography>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {a.loginActivity && a.loginActivity.length > 0 ? a.loginActivity.map((ts, idx) => (
                      <li key={idx}>{new Date(ts).toLocaleString()}</li>
                    )) : <li>—</li>}
                  </ul>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ py: 1, px: 2 }}>
          <Button onClick={() => setActivityOpen(false)} startIcon={<CloseIcon />} size="small">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminManagementComponent; 