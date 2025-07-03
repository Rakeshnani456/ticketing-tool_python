import React, { useEffect, useState, useMemo } from 'react';
import { Avatar, Chip, Tooltip, Button, Menu, MenuItem, Snackbar, Alert, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Typography } from '@mui/material';
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

const columnHelper = createColumnHelper();

const ClientManagementComponent = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [centralFilterValue, setCentralFilterValue] = useState('');
  const [centralFilterColumn, setCentralFilterColumn] = useState(null); // Changed to null for react-select value
  const [manageAnchorEl, setManageAnchorEl] = useState(null);
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const [addRowData, setAddRowData] = useState(initialClientState);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editMode, setEditMode] = useState(false);

  const db = getFirestore(app);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let clientsData = [];
    let usersData = [];
    let unsubClients = null;
    let unsubUsers = null;

    // Helper to recalculate and set clients with live user count
    const updateClientsWithUserCount = () => {
      // Build a map: domain -> user count
      const domainUserCount = {};
      usersData.forEach(user => {
        if (user.domain) {
          domainUserCount[user.domain] = (domainUserCount[user.domain] || 0) + 1;
        }
      });
      setClients(clientsData.map(doc => {
        const data = doc.data();
        const userCount = domainUserCount[data.domain] || 0;
        return {
          id: doc.id,
          'Client name': data.client_name,
          'Client type': data.client_type,
          'Location': data.location,
          'Domain': data.domain,
          'Joined date': data.joined_date,
          'No of users': userCount,
          'Contract end': data.contract_end,
          'Site admin': data.site_admin
        };
      }));
      setLoading(false);
    };

    unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      clientsData = snapshot.docs;
      updateClientsWithUserCount();
    }, (err) => {
      setError('Could not load clients.');
      setClients([]);
      setLoading(false);
    });

    unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      usersData = snapshot.docs.map(doc => doc.data());
      updateClientsWithUserCount();
    }, (err) => {
      setError('Could not load users for client count.');
      setClients([]);
      setLoading(false);
    });

    return () => {
      if (unsubClients) unsubClients();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const handleManageClick = (event) => {
    setManageAnchorEl(event.currentTarget);
  };
  const handleManageClose = () => {
    setManageAnchorEl(null);
  };

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

  const handleClearFilter = () => {
    setCentralFilterValue('');
    setCentralFilterColumn(null); // Reset to null for react-select
    table.setGlobalFilter('');
  };

  const columns = useMemo(() => {
    // Determine if any row is being edited, deleted, or if editMode is active
    const showActionsColumn = Boolean(
      addMode ||
      editMode ||
      (typeof editRowId !== 'undefined' && editRowId !== null) ||
      (typeof deleteMode !== 'undefined' && deleteMode && typeof selectedRowId !== 'undefined' && selectedRowId !== null)
    );
    const baseColumns = [
      columnHelper.accessor('Client name', {
        id: 'clientName',
        header: 'Client name',
        cell: info => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: 9, bgcolor: '#1976d2' }}>{getInitials(info.getValue())}</Avatar>
            <span style={{ fontWeight: 600 }}>{info.getValue()}</span>
          </span>
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('Client type', {
        id: 'clientType',
        header: 'Type',
        cell: info => (
          <Chip label={info.getValue()} size="small" color={info.getValue() === 'Enterprise' ? 'primary' : info.getValue() === 'SMB' ? 'secondary' : 'default'} sx={{ fontWeight: 500, fontSize: 8, height: 16 }} />
        ),
        enableSorting: true,
      }),
      columnHelper.accessor('Location', {
        id: 'location',
        header: 'Location',
        enableSorting: true,
      }),
      columnHelper.accessor('Domain', {
        id: 'domain',
        header: 'Domain',
        enableSorting: true,
      }),
      columnHelper.accessor('Joined date', {
        id: 'joinedDate',
        header: 'Joined',
        enableSorting: true,
      }),
      columnHelper.accessor('No of users', {
        id: 'noOfUsers',
        header: 'Users',
        sortingFn: (rowA, rowB, columnId) => {
          const valA = Number(rowA.getValue(columnId));
          const valB = Number(rowB.getValue(columnId));
          return valA - valB;
        },
        enableSorting: true,
      }),
      columnHelper.accessor('Contract end', {
        id: 'contractEnd',
        header: 'Contract',
        cell: info => {
          const status = getContractStatus(info.getValue());
          return <Chip label={status.label} size="small" color={status.color} variant={status.color === 'default' ? 'outlined' : 'filled'} sx={{ fontWeight: 500, fontSize: 8, height: 16 }} />;
        },
        sortingFn: (rowA, rowB, columnId) => {
          const dateA = new Date(rowA.getValue(columnId));
          const dateB = new Date(rowB.getValue(columnId));
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          return 0;
        },
        enableSorting: true,
      }),
      columnHelper.accessor('Site admin', {
        id: 'siteAdmin',
        header: 'Site admin',
        cell: info => (
          <Tooltip title={info.getValue()}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar sx={{ width: 18, height: 18, fontSize: 9, bgcolor: '#607d8b' }}>{getInitials(info.getValue())}</Avatar>
              <span style={{ fontWeight: 500 }}>{info.getValue()}</span>
            </span>
          </Tooltip>
        ),
        enableSorting: true,
      }),
    ];
    if (showActionsColumn) {
      baseColumns.push(
        columnHelper.display({
          id: 'actions',
          header: '',
          cell: ({ row }) => {
            const isEditingThisRow = editRowId === row.original.id;
            const isDeletingThisRow = deleteMode && selectedRowId === row.original.id;

            if (isEditingThisRow) {
              return (
                <>
                  <Button onClick={handleEditSave} color="primary" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5, py: 0 }}><SaveIcon fontSize="small" /></Button>
                  <Button onClick={handleEditCancel} color="inherit" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5, py: 0 }}><CancelIcon fontSize="small" /></Button>
                </>
              );
            }
            if (isDeletingThisRow) {
              return (
                <>
                  <Button onClick={handleDeleteConfirm} color="error" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5, py: 0 }}><DeleteIcon fontSize="small" /></Button>
                  <Button onClick={handleDeleteCancel} color="inherit" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5, py: 0 }}><CancelIcon fontSize="small" /></Button>
                </>
              );
            }
            if (editMode) {
              return (
                <Button onClick={() => handleEditClick(row.original)} color="primary" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5, py: 0 }}><EditIcon fontSize="small" /></Button>
              );
            }
            return null;
          },
          enableSorting: false,
          size: 70,
        })
      );
    }
    return baseColumns;
  }, [addMode, editMode, editRowId, deleteMode, selectedRowId, handleEditSave, handleEditCancel, handleDeleteConfirm, handleDeleteCancel, handleEditClick]);

  const customGlobalFilterFn = useMemo(() => {
    return (row, columnId, filterValue) => {
      if (!filterValue) {
        return true;
      }

      // `centralFilterColumn` will be an object `{ value: columnId, label: headerName }` from react-select
      const selectedColumnId = centralFilterColumn ? centralFilterColumn.value : null;

      if (selectedColumnId) {
        const rowValue = row.getValue(selectedColumnId);
        return String(rowValue || '').toLowerCase().includes(filterValue.toLowerCase());
      } else {
        const filterableColumnIds = columns
          .filter(col => col.enableSorting !== false && col.id !== 'actions')
          .map(col => col.id);

        return filterableColumnIds.some(colId => {
          const rowValue = row.getValue(colId);
          return String(rowValue || '').toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    };
  }, [centralFilterColumn, columns]);

  const table = useReactTable({
    data: clients,
    columns,
    state: {
      sorting,
      globalFilter: centralFilterValue,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setCentralFilterValue,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: customGlobalFilterFn,
  });

  // Calculate new dimensions (approx 30% smaller from previous sizes)
  const BASE_CONTROL_HEIGHT = 28;
  const REDUCTION_FACTOR = 0.7;

  const newHeight = BASE_CONTROL_HEIGHT * REDUCTION_FACTOR; // Approx 19.6px, will be rounded by browser
  const newHeightPx = `${newHeight}px`; // Use string for CSS

  // Set width to fit 'All Columns' comfortably (about 110px)
  const newSelectWidthPx = '110px';

  const BASE_SEARCH_WIDTH = 150;
  const newSearchWidth = BASE_SEARCH_WIDTH * REDUCTION_FACTOR; // Approx 105px
  const newSearchWidthPx = `${newSearchWidth}px`;

  const BASE_FONT_SIZE_REM = 0.75;
  const newFontSizeRem = BASE_FONT_SIZE_REM * 0.9; // Slightly smaller font to fit 0.7rem scale

  // Options for react-select
  const filterOptions = useMemo(() => {
    const options = columns
      .filter(col => col.enableSorting !== false && col.id !== 'actions')
      .map(col => ({
        value: col.id,
        label: typeof col.header === 'string' ? col.header : col.id
      }));
    return [{ value: '', label: 'All Columns' }, ...options];
  }, [columns]);

  // Custom styles for react-select to ensure fixed width, perfect alignment, and ellipsis
  const customSelectStyles = {
    container: (provided) => ({
      ...provided,
      width: newSelectWidthPx,
      minWidth: newSelectWidthPx,
      maxWidth: newSelectWidthPx,
    }),
    control: (provided, state) => ({
      ...provided,
      minHeight: newHeight,
      height: newHeight,
      fontSize: `${newFontSizeRem}rem`,
      borderColor: state.isFocused ? '#1976d2' : provided.borderColor,
      boxShadow: state.isFocused ? '0 0 0 1px #1976d2' : 'none',
      borderRadius: 4,
      paddingLeft: 4,
      display: 'flex',
      alignItems: 'center',
      width: newSelectWidthPx,
      minWidth: newSelectWidthPx,
      maxWidth: newSelectWidthPx,
      backgroundColor: 'white',
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: newHeight,
      padding: '0 4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      lineHeight: `${newHeight}px`,
      width: '86px', // 110px - 24px for arrow
      minWidth: '86px',
      maxWidth: '86px',
    }),
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0,
      height: newHeight,
      fontSize: `${newFontSizeRem}rem`,
      lineHeight: `${newHeight}px`,
    }),
    placeholder: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: `${newFontSizeRem}rem`,
      lineHeight: `${newHeight}px`,
      color: 'rgba(0, 0, 0, 0.6)',
      width: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    singleValue: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: `${newFontSizeRem}rem`,
      lineHeight: `${newHeight}px`,
      color: 'inherit',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      width: '100%',
      minWidth: 0,
      maxWidth: '100%',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      padding: 2,
      position: 'absolute',
      right: 0,
      top: 0,
      height: newHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 24,
    }),
    clearIndicator: (provided) => ({
      ...provided,
      padding: 4,
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    option: (provided, state) => ({
      ...provided,
      fontSize: `${newFontSizeRem}rem`,
      color: 'black',
      backgroundColor: state.isSelected ? '#e0e0e0' : 'white',
      '&:hover': {
        backgroundColor: '#f0f0f0',
      },
      padding: '4px 12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      minWidth: newSelectWidthPx,
      maxWidth: newSelectWidthPx,
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 1300,
      minWidth: newSelectWidthPx,
      maxWidth: newSelectWidthPx,
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 1301,
    }),
  };

  return (
    <div className="p-6" style={{ width: '100%', minHeight: '100vh', overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 8 }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: 0 }}>Client Management</h2>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, marginBottom: 8, gap: 8 }}>
          {/* Filter by Section */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', width: 'auto' }}>
            {/* Filter By Label */}
            <Typography variant="body2" sx={{ fontSize: `${newFontSizeRem}rem`, whiteSpace: 'nowrap', pr: 0.5 }}>
              Filter By:
            </Typography>

            {/* Clear Filter Button - Moved to the left of dropdown */}
            {(centralFilterValue || (centralFilterColumn && centralFilterColumn.value !== '')) ? (
              <IconButton
                onClick={handleClearFilter}
                size="small"
                color="primary"
                aria-label="clear filter"
                sx={{ p: 0.25, width: newHeightPx, height: newHeightPx }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null}

            {/* React-Select Dropdown */}
            <Select
              value={centralFilterColumn} // Value is the selected option object or null
              onChange={(selectedOption) => setCentralFilterColumn(selectedOption)} // Update with selected option object
              options={filterOptions} // Your array of { value, label } objects
              isClearable={false} // We handle clearing with our custom button
              isSearchable={false} // Typically for this use case, search isn't needed in the dropdown itself
              placeholder="All Columns" // Fallback placeholder
              styles={customSelectStyles} // Apply custom styles
              menuPortalTarget={document.body} // Crucial for z-index issues with MUI Modals/Snackbars
              classNamePrefix="react-select" // Optional: for easier debugging/specific CSS
              sx={{ width: newSelectWidthPx }} // Apply width to the react-select container
            />

            <TextField
              placeholder="Search..."
              value={centralFilterValue}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              size="small"
              variant="outlined"
              sx={{
                width: newSearchWidthPx,
                fontSize: '0.75rem',
                backgroundColor: 'white',
                height: newHeightPx,
                minHeight: newHeightPx,
                maxHeight: newHeightPx,
                display: 'flex',
                alignItems: 'center',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  height: newHeightPx,
                  minHeight: newHeightPx,
                  maxHeight: newHeightPx,
                  paddingTop: 0,
                  paddingBottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.75rem',
                  height: newHeightPx,
                  minHeight: newHeightPx,
                  maxHeight: newHeightPx,
                  py: 0,
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            />
          </Box>

          {/* Manage Button */}
          {(editMode || addMode || deleteMode) ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                // Cancel all modes and close menu
                if (editMode) handleEditCancel();
                if (addMode) handleAddCancel();
                if (deleteMode) handleDeleteCancel();
                handleManageClose();
              }}
              size="small"
              sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleManageClick}
              size="small"
              sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
            >
              Manage
            </Button>
          )}
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

      <TableContainer component={Paper} sx={{
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'auto',
        background: 'white',
        borderRadius: 2,
        boxShadow: 'none',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Table stickyHeader aria-label="client table" size="small" sx={{
          minWidth: 700,
          '& .MuiTableCell-root': { fontSize: '0.7rem' },
          tableLayout: 'auto'
        }}>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => (
                  <TableCell
                    key={header.id}
                    colSpan={header.colSpan}
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: '#f8f9fb',
                      paddingY: 0.5,
                      fontSize: '0.7rem',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      borderRight: idx !== headerGroup.headers.length - 1 ? '1px solid #e0e0e0' : 'none',
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() === 'asc' && <ArrowUpward fontSize="inherit" sx={{ fontSize: '0.6rem' }} />}
                        {header.column.getIsSorted() === 'desc' && <ArrowDownward fontSize="inherit" sx={{ fontSize: '0.6rem' }} />}
                      </Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {addMode && (
              <TableRow>
                {table.getAllColumns().map(column => {
                  const colIdMap = {
                    'clientName': 'Client name', 'clientType': 'Client type', 'location': 'Location',
                    'domain': 'Domain', 'joinedDate': 'Joined date', 'noOfUsers': 'No of users',
                    'contractEnd': 'Contract end', 'siteAdmin': 'Site admin',
                  };
                  const displayColId = colIdMap[column.id] || column.id;
                  if (column.id === 'actions') {
                    return (
                      <TableCell key={column.id} sx={{ paddingY: 0.5 }}>
                        <Button onClick={handleAddSave} color="primary" size="small" sx={{ fontSize: '0.6rem', minWidth: 0, mr: 1 }}><SaveIcon fontSize="small" /></Button>
                        <Button onClick={handleAddCancel} color="inherit" size="small" sx={{ fontSize: '0.6rem', minWidth: 0 }}><CancelIcon fontSize="small" /></Button>
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={column.id} sx={{ paddingY: 0.5 }}>
                      <input
                        value={addRowData[displayColId]}
                        onChange={e => handleAddChange(displayColId, e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.65rem',
                          padding: 0,
                          border: 'none',
                          borderRadius: 0,
                          background: 'transparent',
                          boxSizing: 'border-box',
                          outline: 'none',
                          height: '1.8em',
                        }}
                        placeholder={displayColId}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            )}

            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                onClick={() => deleteMode && setSelectedRowId(row.original.id)}
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: '#fdfdfe' },
                  '&:hover': { backgroundColor: '#f0f0f0' },
                  cursor: deleteMode ? 'pointer' : 'default',
                  backgroundColor: deleteMode && selectedRowId === row.original.id ? '#ffebee' : 'inherit',
                }}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const isEditingThisCell = editRowId === row.original.id && cell.column.id !== 'actions';
                  const colIdMap = {
                    'clientName': 'Client name', 'clientType': 'Client type', 'location': 'Location',
                    'domain': 'Domain', 'joinedDate': 'Joined date', 'noOfUsers': 'No of users',
                    'contractEnd': 'Contract end', 'siteAdmin': 'Site admin',
                  };
                  const displayColId = colIdMap[cell.column.id] || cell.column.id;
                  return (
                    <TableCell key={cell.id} sx={{ paddingY: 0.5, borderRight: idx !== row.getVisibleCells().length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      {isEditingThisCell ? (
                        <input
                          value={editRowData?.[displayColId] || ''}
                          onChange={e => handleEditChange(displayColId, e.target.value)}
                          style={{
                            width: '100%',
                            fontSize: '0.65rem',
                            padding: 0,
                            border: 'none',
                            borderRadius: 0,
                            background: 'transparent',
                            boxSizing: 'border-box',
                            outline: 'none',
                            height: '1.8em',
                          }}
                          placeholder={displayColId}
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ClientManagementComponent;