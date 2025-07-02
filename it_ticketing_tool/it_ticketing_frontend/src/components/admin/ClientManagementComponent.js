import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Chip, InputBase, IconButton, Tooltip, Button, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert
} from '@mui/material';
import { Search as SearchIcon, ArrowDownward, ArrowUpward, MoreVert } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/constants';

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
  'Client name': '',
  'Client type': '',
  'Location': '',
  'Domain': '',
  'Joined date': '',
  'No of users': '',
  'Contract end': '',
  'Site admin': '',
};

const columns = [
  { id: 'Client name', label: 'Client name', minWidth: 120, sortable: true },
  { id: 'Client type', label: 'Type', minWidth: 80, sortable: true },
  { id: 'Location', label: 'Location', minWidth: 100, sortable: true },
  { id: 'Domain', label: 'Domain', minWidth: 100, sortable: true },
  { id: 'Joined date', label: 'Joined', minWidth: 90, sortable: true },
  { id: 'No of users', label: 'Users', minWidth: 60, sortable: true },
  { id: 'Contract end', label: 'Contract', minWidth: 90, sortable: true },
  { id: 'Site admin', label: 'Site admin', minWidth: 120, sortable: true },
];

const ClientManagementComponent = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'Client name', direction: 'asc' });
  const [manageAnchorEl, setManageAnchorEl] = useState(null);
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [addRowData, setAddRowData] = useState(initialClientState);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/clients`);
        if (!res.ok) throw new Error('Failed to fetch clients');
        const data = await res.json();
        setClients(data);
      } catch (err) {
        setError('Could not load clients. Showing dummy data.');
        setClients([
          {
            id: 'dummy',
            'Client name': 'Acme Corp',
            'Client type': 'Enterprise',
            'Location': 'New York, USA',
            'Domain': 'acme.com',
            'Joined date': '2022-01-15',
            'No of users': 120,
            'Contract end': '2025-12-31',
            'Site admin': 'john.doe@acme.com',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Sorting logic
  const sortedClients = useMemo(() => {
    let sortable = [...clients];
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        // Numeric sort for users
        if (sortConfig.key === 'No of users') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        // Date sort for contract/joined
        if (sortConfig.key === 'Contract end' || sortConfig.key === 'Joined date') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [clients, sortConfig]);

  const handleSort = (colId) => {
    setSortConfig(prev => {
      if (prev.key === colId) {
        return { key: colId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: colId, direction: 'asc' };
    });
  };

  // Manage menu handlers
  const handleManageClick = (event) => {
    setManageAnchorEl(event.currentTarget);
  };
  const handleManageClose = () => {
    setManageAnchorEl(null);
  };

  // Add logic
  const handleAdd = () => {
    setAddMode(true);
    setAddRowData(initialClientState);
    setEditRowId(null);
    setDeleteMode(false);
    handleManageClose();
  };
  const handleAddChange = (colId, value) => {
    setAddRowData(prev => ({ ...prev, [colId]: value }));
  };
  const handleAddSave = async () => {
    try {
      const payload = {
        client_name: addRowData['Client name'],
        client_type: addRowData['Client type'],
        location: addRowData['Location'],
        domain: addRowData['Domain'],
        joined_date: addRowData['Joined date'],
        no_of_users: addRowData['No of users'],
        contract_end: addRowData['Contract end'],
        site_admin: addRowData['Site admin'],
      };
      const res = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add client');
      const newClient = await res.json();
      setClients(prev => [
        {
          id: newClient.id,
          'Client name': newClient.client_name,
          'Client type': newClient.client_type,
          'Location': newClient.location,
          'Domain': newClient.domain,
          'Joined date': newClient.joined_date,
          'No of users': newClient.no_of_users,
          'Contract end': newClient.contract_end,
          'Site admin': newClient.site_admin,
        },
        ...prev,
      ]);
      setAddMode(false);
      setSnackbar({ open: true, message: 'Client added successfully.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };
  const handleAddCancel = () => {
    setAddMode(false);
    setAddRowData(initialClientState);
  };

  // Edit logic
  const handleEdit = () => {
    setEditMode(true);
    setEditRowId(null);
    setAddMode(false);
    setDeleteMode(false);
    handleManageClose();
  };
  const handleEditClick = (row) => {
    setEditRowId(row.id);
    setEditRowData(row);
  };
  const handleEditChange = (colId, value) => {
    setEditRowData(prev => ({ ...prev, [colId]: value }));
  };
  const handleEditSave = async () => {
    try {
      const payload = {
        client_name: editRowData['Client name'],
        client_type: editRowData['Client type'],
        location: editRowData['Location'],
        domain: editRowData['Domain'],
        joined_date: editRowData['Joined date'],
        no_of_users: editRowData['No of users'],
        contract_end: editRowData['Contract end'],
        site_admin: editRowData['Site admin'],
      };
      const res = await fetch(`${API_BASE_URL}/api/clients/${editRowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update client');
      setClients(prev => prev.map(c => c.id === editRowId ? { ...editRowData } : c));
      setEditRowId(null);
      setEditMode(false);
      setSnackbar({ open: true, message: 'Client updated successfully.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };
  const handleEditCancel = () => {
    setEditRowId(null);
    setEditRowData(null);
    setEditMode(false);
  };

  // Delete logic
  const handleDelete = () => {
    setDeleteMode(true);
    setAddMode(false);
    setEditRowId(null);
    handleManageClose();
  };
  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/clients/${selectedRowId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete client');
      setClients(prev => prev.filter(c => c.id !== selectedRowId));
      setSelectedRowId(null);
      setDeleteMode(false);
      setSnackbar({ open: true, message: 'Client deleted successfully.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };
  const handleDeleteCancel = () => {
    setSelectedRowId(null);
    setDeleteMode(false);
  };

  return (
    <div className="p-6" style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <div style={{ marginBottom: 8 }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: 0 }}>Client Management</h2>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, marginBottom: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleManageClick}
            size="small"
            sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
          >
            Manage
          </Button>
          <Menu
            anchorEl={manageAnchorEl}
            open={Boolean(manageAnchorEl)}
            onClose={handleManageClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={handleEdit} sx={{ fontSize: '0.65rem', paddingY: 0.5, paddingX: 1.5, minHeight: 28 }}>Edit</MenuItem>
            <MenuItem onClick={handleAdd} sx={{ fontSize: '0.65rem', paddingY: 0.5, paddingX: 1.5, minHeight: 28 }}>Add</MenuItem>
            <MenuItem onClick={handleDelete} sx={{ fontSize: '0.65rem', paddingY: 0.5, paddingX: 1.5, minHeight: 28 }}>Delete</MenuItem>
          </Menu>
        </div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', boxShadow: 'none', borderRadius: 2 }}>
        <TableContainer sx={{ maxHeight: 'none', width: '100%', overflow: 'hidden !important' }}>
          <Table stickyHeader sx={{ minWidth: 650, width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
            <TableHead>
              <TableRow sx={{ background: '#f8f9fb' }}>
                {columns.map(col => (
                  <TableCell
                    key={col.id}
                    align="left"
                    sx={{
                      background: '#f8f9fb',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      borderBottom: '2px solid #e0e3e7',
                      borderRight: 'none',
                      padding: '8px 8px',
                      minWidth: col.minWidth,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflow: 'visible',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {col.label}
                      {col.sortable && (
                        <IconButton size="small" onClick={() => handleSort(col.id)}>
                          {sortConfig.key === col.id ? (
                            sortConfig.direction === 'asc' ? <ArrowUpward fontSize="inherit" /> : <ArrowDownward fontSize="inherit" />
                          ) : (
                            <ArrowDownward fontSize="inherit" sx={{ opacity: 0.2 }} />
                          )}
                        </IconButton>
                      )}
                    </span>
                  </TableCell>
                ))}
                {(addMode || editRowId || deleteMode) && <TableCell sx={{ background: '#f8f9fb' }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {addMode && (
                <TableRow>
                  {columns.map(col => (
                    <TableCell key={col.id} align="left">
                      <input
                        value={addRowData[col.id]}
                        onChange={e => handleAddChange(col.id, e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.7rem',
                          border: 'none',
                          background: 'transparent',
                          outline: 'none',
                          padding: 0,
                        }}
                        placeholder={col.label}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button onClick={handleAddSave} color="primary" size="small" sx={{ fontSize: '0.7rem', minWidth: 0, mr: 1 }}>Save</Button>
                    <Button onClick={handleAddCancel} color="inherit" size="small" sx={{ fontSize: '0.7rem', minWidth: 0 }}>Cancel</Button>
                  </TableCell>
                </TableRow>
              )}
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">Loading...</TableCell>
                </TableRow>
              ) : sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} align="center">No clients found.</TableCell>
                </TableRow>
              ) : (
                sortedClients.map((row, idx) => (
                  <TableRow
                    key={row.id || idx}
                    hover
                    selected={deleteMode && selectedRowId === row.id}
                    onClick={deleteMode ? () => setSelectedRowId(row.id) : undefined}
                    sx={{
                      background: idx % 2 === 0 ? '#fff' : '#f8f9fb',
                      transition: 'background 0.2s',
                      cursor: deleteMode ? 'pointer' : editRowId === row.id ? 'default' : 'default',
                      '&:hover': { background: '#f4f6fa' },
                      borderBottom: '1px solid #e0e3e7',
                      fontSize: '0.7rem',
                    }}
                  >
                    {editRowId === row.id ? (
                      columns.map(col => (
                        <TableCell key={col.id} align="left">
                          <input
                            value={editRowData[col.id]}
                            onChange={e => handleEditChange(col.id, e.target.value)}
                            style={{
                              width: '100%',
                              fontSize: '0.7rem',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              padding: 0,
                            }}
                          />
                        </TableCell>
                      ))
                    ) : (
                      columns.map(col => (
                        <TableCell key={col.id} align="left">
                          {col.id === 'Client name' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: '#1976d2' }}>
                                {getInitials(row['Client name'])}
                              </Avatar>
                              <span style={{ fontWeight: 600 }}>{row['Client name']}</span>
                            </span>
                          ) : col.id === 'Client type' ? (
                            <Chip
                              label={row['Client type']}
                              size="small"
                              color={row['Client type'] === 'Enterprise' ? 'primary' : row['Client type'] === 'SMB' ? 'secondary' : 'default'}
                              sx={{ fontWeight: 500, fontSize: 9, height: 18 }}
                            />
                          ) : col.id === 'Contract end' ? (
                            <Chip
                              label={getContractStatus(row['Contract end']).label}
                              size="small"
                              color={getContractStatus(row['Contract end']).color}
                              variant={getContractStatus(row['Contract end']).color === 'default' ? 'outlined' : 'filled'}
                              sx={{ fontWeight: 500, fontSize: 9, height: 18 }}
                            />
                          ) : col.id === 'Site admin' ? (
                            <Tooltip title={row['Site admin']}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: '#607d8b' }}>
                                  {getInitials(row['Site admin'])}
                                </Avatar>
                                <span style={{ fontWeight: 500 }}>{row['Site admin']}</span>
                              </span>
                            </Tooltip>
                          ) : (
                            row[col.id]
                          )}
                        </TableCell>
                      ))
                    )}
                    {/* Action cell */}
                    {addMode || editRowId || deleteMode || editMode ? (
                      <TableCell>
                        {editRowId === row.id ? (
                          <>
                            <Button onClick={handleEditSave} color="primary" size="small" sx={{ fontSize: '0.7rem', minWidth: 0, mr: 1 }}>Save</Button>
                            <Button onClick={handleEditCancel} color="inherit" size="small" sx={{ fontSize: '0.7rem', minWidth: 0 }}>Cancel</Button>
                          </>
                        ) : deleteMode ? (
                          selectedRowId === row.id && (
                            <>
                              <Button onClick={handleDeleteConfirm} color="error" size="small" sx={{ fontSize: '0.7rem', minWidth: 0, mr: 1 }}>Delete</Button>
                              <Button onClick={handleDeleteCancel} color="inherit" size="small" sx={{ fontSize: '0.7rem', minWidth: 0 }}>Cancel</Button>
                            </>
                          )
                        ) : (
                          editMode && <Button onClick={() => handleEditClick(row)} color="primary" size="small" sx={{ fontSize: '0.7rem', minWidth: 0 }}>Edit</Button>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ClientManagementComponent; 