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
  Grid,
  Paper,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Link,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationIcon,
  Language as WebsiteIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Badge as BadgeIcon,
  Work as WorkIcon,
  ContactPhone as ContactPhoneIcon,
  ContactMail as ContactMailIcon,
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  PersonAdd as PersonAddIcon,
  Assessment as AssessmentIcon,
  Share as ShareIcon,
  FileCopy as CopyIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FaviconIcon from '../common/FaviconIcon';

const InfoChip = ({ icon, label, value, color = 'default', clickable = false, onClick }) => (
  <Chip
    icon={icon}
    label={
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.65rem' }}>
          {label}:
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
          {value || 'N/A'}
        </Typography>
      </Box>
    }
    variant="outlined"
    size="small"
    color={color}
    clickable={clickable}
    onClick={onClick}
    sx={{
      height: 'auto',
      '& .MuiChip-label': {
        px: 1,
        py: 0.5,
      },
      '& .MuiChip-icon': {
        fontSize: '0.8rem',
        ml: 0.5,
      },
    }}
  />
);

const ContactSection = ({ title, icon, color, data, dense = false }) => (
  <Paper
    elevation={0}
    sx={{
      p: dense ? 1 : 1.5,
      background: `linear-gradient(135deg, ${color}08 0%, ${color}02 100%)`,
      border: `1px solid ${color}20`,
      borderRadius: 2,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: color,
        borderRadius: '2px 2px 0 0',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: dense ? 0.75 : 1 }}>
      <Avatar sx={{ width: dense ? 24 : 28, height: dense ? 24 : 28, bgcolor: color, fontSize: '0.75rem' }}>
        {icon}
      </Avatar>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: dense ? '0.75rem' : '0.85rem', color: '#1e293b' }}>
        {title}
      </Typography>
    </Box>
    
    <Grid container spacing={dense ? 0.25 : 0.5}>
      {data.map((item, index) => (
        <Grid item xs={12} key={index}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.125 }}>
            <Box
              sx={{
                width: dense ? 14 : 18,
                height: dense ? 14 : 18,
                borderRadius: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0,0,0,0.04)',
                color: 'text.secondary',
              }}
            >
              {item.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: dense ? '0.55rem' : '0.6rem',
                  fontWeight: 500,
                  display: 'block',
                }}
              >
                {item.label}
              </Typography>
              {item.isEmail && item.value ? (
                <Link
                  href={`mailto:${item.value}`}
                  sx={{
                    fontSize: dense ? '0.65rem' : '0.7rem',
                    color: '#1976d2',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {item.value}
                </Link>
              ) : item.isPhone && item.value ? (
                <Link
                  href={`tel:${item.value}`}
                  sx={{
                    fontSize: dense ? '0.65rem' : '0.7rem',
                    color: '#1976d2',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {item.value}
                </Link>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: dense ? '0.65rem' : '0.7rem',
                    color: '#1e293b',
                    fontWeight: 500,
                  }}
                >
                  {item.value || 'N/A'}
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  </Paper>
);

const QuickStats = ({ userCount, dense = false }) => {
  const getStatusColor = (count) => {
    if (count === 0) return '#f44336';
    if (count < 5) return '#ff9800';
    if (count < 20) return '#2196f3';
    return '#4caf50';
  };

  const getStatusLabel = (count) => {
    if (count === 0) return 'No Users';
    if (count < 5) return 'Small Team';
    if (count < 20) return 'Medium Team';
    return 'Large Team';
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: dense ? 1 : 1.5,
        background: 'linear-gradient(135deg, #667eea08 0%, #764ba202 100%)',
        border: '1px solid #667eea20',
        borderRadius: 2,
        textAlign: 'center',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mb: 0.75 }}>
        <GroupIcon sx={{ color: getStatusColor(userCount), fontSize: dense ? '0.9rem' : '1.1rem' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: dense ? '0.75rem' : '0.85rem', color: '#1e293b' }}>
          User Stats
        </Typography>
      </Box>
      
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: getStatusColor(userCount),
          fontSize: dense ? '1.25rem' : '1.75rem',
          mb: 0.25,
        }}
      >
        {userCount}
      </Typography>
      
      <Chip
        label={getStatusLabel(userCount)}
        size="small"
        sx={{
          bgcolor: `${getStatusColor(userCount)}15`,
          color: getStatusColor(userCount),
          fontWeight: 600,
          fontSize: '0.6rem',
        }}
      />
    </Paper>
  );
};

const EnhancedClientCard = ({
  client,
  index,
  userCount = 0,
  onEdit,
  onDelete,
  showActions = false,
  dense = false,
  viewMode = 'cards',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const navigate = useNavigate();

  const handleUserCountClick = () => {
    navigate(`/user-management?clientId=${client.id}&clientName=${encodeURIComponent(client.companyName)}`);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleCopyInfo = () => {
    const info = `${client.companyName}\nLocation: ${client.location}\nContact: ${client.clientContactNumber}\nWebsite: ${client.website}`;
    navigator.clipboard.writeText(info);
    handleMenuClose();
  };

  // Prepare contact data
  const authPersonData = [
    { icon: <BadgeIcon fontSize="small" />, label: 'Name', value: `${client.authFirstName || ''} ${client.authLastName || ''}`.trim() },
    { icon: <WorkIcon fontSize="small" />, label: 'Designation', value: client.authDesignation },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Office Email', value: client.authOfficeEmail, isEmail: true },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Personal Email', value: client.authPersonalEmail, isEmail: true },
    { icon: <ContactPhoneIcon fontSize="small" />, label: 'Contact', value: client.authContactNumber, isPhone: true },
  ];

  const siteAdminData = [
    { icon: <BadgeIcon fontSize="small" />, label: 'Name', value: `${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim() },
    { icon: <WorkIcon fontSize="small" />, label: 'Designation', value: client.siteDesignation },
    { icon: <ContactMailIcon fontSize="small" />, label: 'Email', value: client.siteEmail, isEmail: true },
    { icon: <ContactPhoneIcon fontSize="small" />, label: 'Contact', value: client.siteContactNumber, isPhone: true },
  ];

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        boxShadow: expanded
          ? '0 8px 32px rgba(0,0,0,0.12)'
          : '0 2px 8px rgba(0,0,0,0.04)',
        border: expanded ? '2px solid #e3f2fd' : '1px solid #e0e0e0',
        background: expanded ? '#fafbfc' : '#ffffff',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          borderColor: '#bbdefb',
        },
      }}
    >
      {/* Main Header */}
      <Box
        sx={{
          p: dense ? 1 : 1.5,
          cursor: 'pointer',
          background: expanded
            ? 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderBottom: expanded ? '1px solid #e0e0e0' : 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Index Badge */}
          <Badge
            badgeContent={userCount > 0 ? userCount : null}
            color="primary"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <Avatar
              sx={{
                width: dense ? 32 : 40,
                height: dense ? 32 : 40,
                bgcolor: 'primary.main',
                fontSize: dense ? '0.75rem' : '0.9rem',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
              }}
            >
              {index}
            </Avatar>
          </Badge>

          {/* Company Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <FaviconIcon 
                websiteUrl={client.website} 
                size={dense ? '24px' : '28px'}
                alt={`${client.companyName} favicon`}
              />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: dense ? '0.9rem' : '1rem',
                  color: '#1e293b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {client.companyName || 'Unnamed Company'}
              </Typography>
              {userCount > 0 && (
                <VerifiedIcon sx={{ color: '#4caf50', fontSize: '0.9rem' }} />
              )}
            </Box>

            {/* Quick Info Chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {client.location && (
                <InfoChip
                  icon={<LocationIcon sx={{ fontSize: '0.7rem' }} />}
                  label="Location"
                  value={client.location}
                  color="default"
                />
              )}
              {client.website && (
                <InfoChip
                  icon={<WebsiteIcon sx={{ fontSize: '0.7rem' }} />}
                  label="Website"
                  value={client.website}
                  color="primary"
                  clickable
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(client.website, '_blank');
                  }}
                />
              )}
              <InfoChip
                icon={<GroupIcon sx={{ fontSize: '0.7rem' }} />}
                label="Users"
                value={userCount}
                color={userCount > 0 ? 'success' : 'default'}
                clickable={userCount > 0}
                onClick={userCount > 0 ? (e) => {
                  e.stopPropagation();
                  handleUserCountClick();
                } : undefined}
              />
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {showActions && (
              <Tooltip title="More Actions">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuAnchor(e.currentTarget);
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title={expanded ? 'Show Less' : 'Show More'}>
              <IconButton
                size="small"
                sx={{
                  color: expanded ? 'primary.main' : 'text.secondary',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Expanded Content */}
      <Collapse in={expanded} timeout={0}>
        <CardContent sx={{ p: dense ? 1.5 : 2, bgcolor: '#fafbfc' }}>
          <Grid container spacing={dense ? 1.5 : 2}>
            {/* Authorized Person */}
            <Grid item xs={12} md={4}>
              <ContactSection
                title="Authorized Person"
                icon={<PersonIcon fontSize="small" />}
                color="#2196f3"
                data={authPersonData}
                dense={dense}
              />
            </Grid>

            {/* Site Administrator */}
            <Grid item xs={12} md={4}>
              <ContactSection
                title="Site Administrator"
                icon={<AdminIcon fontSize="small" />}
                color="#4caf50"
                data={siteAdminData}
                dense={dense}
              />
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={4}>
              <QuickStats userCount={userCount} dense={dense} />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          {showActions && (
            <Box sx={{ mt: 2, display: 'flex', gap: 0.75, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ViewIcon />}
                onClick={() => handleUserCountClick()}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                View Users
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit && onEdit(client)}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete && onDelete(client)}
                sx={{ fontSize: '0.75rem', py: 0.5 }}
              >
                Delete
              </Button>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 180 },
        }}
      >
        <MenuItem onClick={() => { onEdit && onEdit(client); handleMenuClose(); }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit Client" />
        </MenuItem>
        
        <MenuItem onClick={() => { handleUserCountClick(); handleMenuClose(); }}>
          <ListItemIcon>
            <GroupIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Manage Users" />
        </MenuItem>
        
        <MenuItem onClick={() => { navigate(`/user-management/create-user?client=${encodeURIComponent(client.companyName)}`); handleMenuClose(); }}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Add User" />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleCopyInfo}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy Info" />
        </MenuItem>
        
        <MenuItem onClick={() => { /* Add export functionality */ handleMenuClose(); }}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Export Data" />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => { onDelete && onDelete(client); handleMenuClose(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete Client" />
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default EnhancedClientCard;
