import React, { useState } from 'react';
import { 
    Card, 
    CardContent, 
    Collapse, 
    Typography, 
    Box, 
    IconButton, 
    Divider, 
    Tooltip, 
    Avatar, 
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Menu,
    MenuItem,
    CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BusinessIcon from '@mui/icons-material/Business';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import WorkIcon from '@mui/icons-material/Work';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import { Edit as EditIcon, Delete as DeleteIcon, LockReset as LockResetIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/constants';

const InfoRow = ({ icon, label, value, itemSx }) => (
    <Box
        display="flex"
        alignItems="center"
        gap={0.5}
        sx={{ 
            flex: '1 1 0', 
            minWidth: 0, 
            py: 0.25,
            px: 0.25,
            ...itemSx 
        }}
    >
        {icon}
        <Typography 
            variant="body2" 
            sx={{ 
                fontWeight: 600, 
                minWidth: 0, 
                whiteSpace: 'nowrap', 
                fontSize: '0.7em', 
                pr: 0.5,
                color: 'primary.main'
            }}
        >
            {label}:
        </Typography>
        <Typography
            variant="body2"
            sx={{ 
                color: 'text.secondary', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                minWidth: 0, 
                flex: 1, 
                fontSize: '0.7em',
                fontWeight: 400
            }}
        >
            {value || '-'}
        </Typography>
    </Box>
);

const ClientUserCard = ({ 
    clientName, 
    users, 
    index, 
    onEditUser,
    onDeleteUser, 
    onEditClick, 
    onDeleteClick,
    onPasswordResetClick,
    showEdit,
    showDelete,
    isOwnRow,
    actionNotifications,
    user // Current logged-in user for API calls
}) => {
    const [expanded, setExpanded] = useState(false);
    const [roleChangeAnchor, setRoleChangeAnchor] = useState(null);
    const [changingRole, setChangingRole] = useState({});
    const [roleChangeNotifications, setRoleChangeNotifications] = useState({});

    const userCount = users.length;
    const activeUsers = users.filter(user => user.role === 'user').length;
    const siteAdmins = users.filter(user => user.role === 'site_admin').length;

    // Handle role change
    const handleRoleChange = async (userId, newRole) => {
        if (!user || !user.firebaseUser) return;
        
        setChangingRole(prev => ({ ...prev, [userId]: true }));
        setRoleChangeAnchor(null);
        
        try {
            const idToken = await user.firebaseUser.getIdToken();
            
            const response = await fetch(`${API_BASE_URL}/api/users/role/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: newRole
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update user role');
            }

            setRoleChangeNotifications(prev => ({
                ...prev,
                [userId]: {
                    type: 'success',
                    message: `Role updated to ${newRole === 'site_admin' ? 'Site Admin' : 'User'}`
                }
            }));

            // Clear notification after 3 seconds
            setTimeout(() => {
                setRoleChangeNotifications(prev => {
                    const newState = { ...prev };
                    delete newState[userId];
                    return newState;
                });
            }, 3000);
            
        } catch (error) {
            console.error('Error updating user role:', error);
            setRoleChangeNotifications(prev => ({
                ...prev,
                [userId]: {
                    type: 'error',
                    message: error.message || 'Failed to update role'
                }
            }));

            // Clear error notification after 5 seconds
            setTimeout(() => {
                setRoleChangeNotifications(prev => {
                    const newState = { ...prev };
                    delete newState[userId];
                    return newState;
                });
            }, 5000);
        } finally {
            setChangingRole(prev => ({ ...prev, [userId]: false }));
        }
    };

    return (
        <Card
            variant="outlined"
            sx={{
                mb: 2,
                borderRadius: 1,
                boxShadow: expanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, border-left 0.2s, background 0.2s',
                width: '100%',
                borderLeft: expanded ? '4px solid #1976d2' : '4px solid #90caf9',
                borderRight: 'none',
                borderTop: 'none',
                borderBottom: 'none',
                background: expanded ? '#f5f7fa' : '#f8fafc',
                '&:hover': {
                    background: '#e3f2fd',
                    borderLeft: '4px solid #1976d2',
                },
            }}
        >
            <Box
                display="flex"
                alignItems="center"
                flexWrap="wrap"
                width="100%"
                sx={{
                    cursor: 'pointer',
                    background: expanded ? '#f5f7fa' : '#f8fafc',
                    px: 0,
                    py: 0.5,
                    minHeight: 56,
                }}
                onClick={() => setExpanded((prev) => !prev)}
            >
                {/* Number Badge */}
                <Box sx={{ pl: 2, pr: 1 }}>
                    <Avatar
                        sx={{
                            width: 28,
                            height: 28,
                            bgcolor: 'primary.main',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'white',
                            boxShadow: '0 1px 4px rgba(25,118,210,0.10)'
                        }}
                    >
                        {index}
                    </Avatar>
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} sx={{ pl: 1 }}>
                    <BusinessIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 100, color: '#1e293b' }}>
                        {clientName || 'Unknown Client'}
                    </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" gap={2} flex={1} justifyContent="flex-start" flexWrap="wrap" sx={{ ml: 2, minWidth: 0, width: '100%' }}>
                    <InfoRow 
                        icon={<GroupIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />} 
                        label="Total Users" 
                        value={userCount} 
                    />
                    <InfoRow 
                        icon={<PersonIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />} 
                        label="Regular Users" 
                        value={activeUsers} 
                    />
                    <InfoRow 
                        icon={<WorkIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />} 
                        label="Site Admins" 
                        value={siteAdmins} 
                    />
                    
                    {/* User Count Badge */}
                    <Box display="flex" alignItems="center" gap={0.5} sx={{ ml: 1 }}>
                        <GroupIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                        <Chip
                            label={`${userCount} user${userCount !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                                height: 22,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                bgcolor: userCount > 0 ? '#e3f2fd' : '#f5f5f5',
                                color: userCount > 0 ? '#1976d2' : '#757575',
                                border: userCount > 0 ? '1px solid #bbdefb' : '1px solid #e0e0e0',
                                '& .MuiChip-label': {
                                    px: 1.2,
                                }
                            }}
                        />
                    </Box>
                </Box>
                
                <Tooltip title={expanded ? 'Hide Users' : 'Show Users'}>
                    <IconButton size="small" sx={{ ml: 1, mr: 2, color: expanded ? 'primary.main' : '#90caf9', transition: 'color 0.2s' }}>
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Tooltip>
            </Box>
            
            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Divider />
                <CardContent sx={{ background: '#fafbfc', py: 2, px: { xs: 2, sm: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, fontSize: '1rem' }}>
                        Users for {clientName}
                    </Typography>
                    
                    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Employee ID</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Designation</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Contact</TableCell>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Role</TableCell>
                                    {(showEdit || showDelete || onPasswordResetClick) && (
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Actions</TableCell>
                                    )}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow 
                                        key={user.uid} 
                                        sx={{ 
                                            bgcolor: '#ffffff',
                                            '&:hover': { backgroundColor: '#f5f5f5' }
                                        }}
                                    >
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar 
                                                    sx={{ 
                                                        width: 24, 
                                                        height: 24, 
                                                        fontSize: '0.7rem',
                                                        bgcolor: user.role === 'site_admin' ? '#10b981' : '#3b82f6'
                                                    }}
                                                >
                                                    {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                                </Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                                        {user.firstName} {user.lastName}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                                                        {user.managerEmail}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <EmailIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                {user.email}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <BadgeIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                {user.employeeId || '-'}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <WorkIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                {user.designation || '-'}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                <PhoneIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                                                {user.contactNumber || '-'}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.role === 'site_admin' ? 'Site Admin' : 'User'}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600,
                                                    bgcolor: user.role === 'site_admin' ? '#dcfce7' : '#dbeafe',
                                                    color: user.role === 'site_admin' ? '#166534' : '#1e40af',
                                                    border: user.role === 'site_admin' ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                                                }}
                                            />
                                        </TableCell>
                                                                                {(showEdit || showDelete || onPasswordResetClick) && (
                                            <TableCell>
                                                {actionNotifications && actionNotifications[user.uid] ? (
                                                    <Typography 
                                                        variant="body2" 
                                                        sx={{ 
                                                            fontSize: '0.7rem',
                                                            color: actionNotifications[user.uid].type === 'success' ? '#2e7d32' : '#d32f2f',
                                                            fontWeight: 500,
                                                            textAlign: 'right',
                                                            py: 0.5
                                                        }}
                                                    >
                                                        {actionNotifications[user.uid].message}
                                                    </Typography>
                                                ) : (
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        {onPasswordResetClick && !isOwnRow(user) && (
                                                            <Tooltip title="Reset Password">
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onPasswordResetClick && onPasswordResetClick(user);
                                                                    }}
                                                                    sx={{ 
                                                                        color: '#607d8b',
                                                                        '&:hover': { color: '#455a64', bgcolor: 'rgba(96, 125, 139, 0.1)' }
                                                                    }}
                                                                >
                                                                    <LockResetIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {showEdit && !isOwnRow(user) && (
                                                            <Tooltip title="Edit User">
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onEditClick && onEditClick(user);
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {showDelete && !isOwnRow(user) && (
                                                            <Tooltip title="Delete User">
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="error" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteClick && onDeleteClick(user);
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Collapse>
        </Card>
    );
};

export default ClientUserCard; 