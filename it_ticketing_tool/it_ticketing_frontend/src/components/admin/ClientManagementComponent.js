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
  const [sorting, setSorting] = useState([]);
  const [centralFilterValue, setCentralFilterValue] = useState('');
  const [centralFilterColumn, setCentralFilterColumn] = useState(null);
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editMode, setEditMode] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

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

  const handleEdit = () => {
    setEditMode(true);
    setEditRowId(null);
    setDeleteMode(false);
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
        companyName: editRowData['companyName'],
        website: editRowData['website'],
        location: editRowData['location'],
        clientContactNumber: editRowData['clientContactNumber'],
        authFirstName: editRowData['authFirstName'],
        authLastName: editRowData['authLastName'],
        authContactNumber: editRowData['authContactNumber'],
        authOfficeEmail: editRowData['authOfficeEmail'],
        authPersonalEmail: editRowData['authPersonalEmail'],
        authDesignation: editRowData['authDesignation'],
        siteFirstName: editRowData['siteFirstName'],
        siteLastName: editRowData['siteLastName'],
        siteEmail: editRowData['siteEmail'],
        siteContactNumber: editRowData['siteContactNumber'],
        siteDesignation: editRowData['siteDesignation'],
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
    setEditRowId(null);
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

  const groupedColumns = useMemo(() => {
    return GROUPS.map(group => {
      const isCollapsed = collapsedGroups[group.key];
      return {
        header: (
          <Box display="flex" alignItems="center" gap={0.5}>
            <IconButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                setCollapsedGroups(prev => ({ ...prev, [group.key]: !prev[group.key] }));
              }}
              sx={{ p: 0.2 }}
              aria-label={isCollapsed ? `Expand ${group.label}` : `Collapse ${group.label}`}
            >
              {isCollapsed ? <ArrowDownward fontSize="inherit" /> : <ArrowUpward fontSize="inherit" />}
            </IconButton>
            <span>{group.label}</span>
          </Box>
        ),
        columns: isCollapsed
          ? []
          : group.columns.map(colId =>
              columnHelper.accessor(colId, { header: colId.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), enableSorting: true })
            )
      };
    });
  }, [collapsedGroups]);

  const actionsColumn = useMemo(() => {
    const showActionsColumn = Boolean(
      editMode ||
      (typeof editRowId !== 'undefined' && editRowId !== null) ||
      (typeof deleteMode !== 'undefined' && deleteMode && typeof selectedRowId !== 'undefined' && selectedRowId !== null)
    );
    if (!showActionsColumn) return [];
    return [
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
    ];
  }, [editMode, editRowId, deleteMode, selectedRowId, handleEditSave, handleEditCancel, handleDeleteConfirm, handleDeleteCancel, handleEditClick]);

  const columns = useMemo(() => {
    // Flatten grouped columns and add actions column if needed
    const flatCols = groupedColumns.flatMap(group => group.columns);
    return [...flatCols, ...actionsColumn];
  }, [groupedColumns, actionsColumn]);

  const customGlobalFilterFn = useMemo(() => {
    return (row, columnId, filterValue) => {
      if (!filterValue) {
        return true;
      }

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
    <div className="p-6" style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Add Client and Manage Buttons */}
      <div className="flex items-center gap-2 mb-4" style={{ width: '100%', overflowX: 'hidden' }}>
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
          variant="outlined"
          color="primary"
          onClick={handleEdit}
          size="small"
          sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
        >
          {editMode ? 'Exit Edit' : 'Edit Clients'}
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleDelete}
          size="small"
          sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
        >
          {deleteMode ? 'Cancel Delete' : 'Delete Clients'}
        </Button>
        {deleteMode && selectedRowId && (
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            size="small"
            sx={{ fontSize: '0.6rem', textTransform: 'none', minWidth: 'auto', padding: '2px 10px', height: 24, lineHeight: 1, boxShadow: 'none', borderRadius: 1 }}
          >
            Confirm Delete
          </Button>
        )}
      </div>
      <div style={{ marginBottom: 8, width: '100%', overflowX: 'hidden' }}>
        <h2 className="text-2xl font-bold" style={{ marginBottom: 0, wordBreak: 'break-word', maxWidth: '100%' }}>Client Management</h2>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, marginBottom: 8, gap: 8, flexWrap: 'wrap', maxWidth: '100%' }}>
          {/* Filter by Section */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', width: 'auto', overflowX: 'hidden' }}>
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
        </div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}

      {/* Responsive Table Wrapper - This is where the table's internal scrollbar is managed */}
      <div style={{ width: '100%', overflowX: 'hidden', maxWidth: '100%' }}>
        {/* TableContainer is now the only element that can scroll horizontally if needed */}
        <TableContainer component={Paper} sx={{
          width: '100%', // Take full width of its parent
          overflowX: 'auto', // Allow horizontal scroll only for the table
          overflowY: 'auto',
          background: 'white',
          borderRadius: 2,
          boxShadow: 'none',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 0,
        }}>
          {/*
            Responsive Table: The table will always fit the canvas width. If there are too many columns, only the table content will scroll horizontally. The main canvas will never have a horizontal scrollbar.
          */}
          <Table stickyHeader aria-label="client table" size="small" sx={{
            width: 'max-content', // Table grows as needed for columns
            minWidth: '100%', // Always at least as wide as the container
            '& .MuiTableCell-root': { fontSize: '0.7rem' },
            tableLayout: 'auto', // Let browser calculate column widths
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
                        whiteSpace: 'nowrap', // Prevents header text from wrapping
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
                    return (
                      <TableCell key={cell.id} sx={{
                        paddingY: 0.5,
                        borderRight: idx !== row.getVisibleCells().length - 1 ? '1px solid #e0e0e0' : 'none',
                        whiteSpace: 'nowrap', // Prevents body cell text from wrapping
                        maxWidth: 200, // Prevents cells from growing too wide
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {isEditingThisCell ? (
                          <input
                            value={editRowData?.[cell.column.id] || ''}
                            onChange={e => handleEditChange(cell.column.id, e.target.value)}
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
                            placeholder={cell.column.header}
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
      </div>
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