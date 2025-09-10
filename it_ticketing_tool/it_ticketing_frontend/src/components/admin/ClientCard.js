import React, { useState } from 'react';
import { Card, CardContent, Collapse, Typography, Box, IconButton, Divider, Tooltip, Link, Grid, Avatar, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import GroupIcon from '@mui/icons-material/Group';
import { useNavigate } from 'react-router-dom';

const InfoRow = ({ icon, label, value, link, itemSx }) => (
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
    {link ? (
      <Link
        href={link}
        target="_blank"
        rel="noopener"
        underline="hover"
        sx={{ 
          fontSize: '0.7em', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap', 
          minWidth: 0, 
          flex: 1,
          color: 'primary.main'
        }}
      >
        {value}
      </Link>
    ) : (
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
    )}
  </Box>
);

const SectionHeader = ({ icon, title }) => (
  <Box display="flex" alignItems="center" gap={1} mb={1}>
    {icon}
    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary' }}>
      {title}
    </Typography>
  </Box>
);

const ContactCard = ({ title, icon, color, children }) => (
  <Card 
    elevation={0} 
    sx={{ 
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      border: `1px solid ${color}20`,
      borderRadius: 2,
      overflow: 'hidden',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: color,
      }
    }}
  >
    <Box sx={{ p: 2, pb: 1 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: color,
            fontSize: '0.8rem'
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {children}
      </Box>
    </Box>
  </Card>
);

const ContactInfoItem = ({ icon, label, value, isEmail = false, isPhone = false, isClickable = false, onClick }) => (
  <Box display="flex" alignItems="center" gap={1.5} sx={{ py: 0.5 }}>
    <Box 
      sx={{ 
        width: 24, 
        height: 24, 
        borderRadius: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.04)',
        color: 'text.secondary'
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 500, display: 'block' }}>
        {label}
      </Typography>
      {isEmail && value ? (
        <Link 
          href={`mailto:${value}`} 
          sx={{ 
            fontSize: '0.75rem', 
            color: 'primary.main', 
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {value}
        </Link>
      ) : isPhone && value ? (
        <Link 
          href={`tel:${value}`} 
          sx={{ 
            fontSize: '0.75rem', 
            color: 'primary.main', 
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' }
          }}
        >
          {value}
        </Link>
      ) : (
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.75rem', 
            color: isClickable ? 'primary.main' : 'text.primary', 
            fontWeight: isClickable ? 600 : 500,
            cursor: isClickable ? 'pointer' : 'default',
            '&:hover': isClickable ? {
              textDecoration: 'underline',
              color: 'primary.dark'
            } : {}
          }}
          onClick={isClickable ? onClick : undefined}
        >
          {value || 'N/A'}
        </Typography>
      )}
    </Box>
  </Box>
);

const ClientCard = ({ client, index, onEdit, onRemove, showEdit, showRemove, userCount = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleUserCountClick = () => {
    navigate(`/user-management?clientId=${client.id}`);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
        width: 'calc(100% - 32px)',
        borderLeft: 'none',
        borderRight: 'none',
        mx: 2,
        '&:hover': {
          boxShadow: '0px 1px 2px 0px rgba(var(--theme-color-elevation-shadow-rgb), 0.3), 0px 1px 3px 1px rgba(var(--theme-color-elevation-shadow-rgb), 0.15) !important',
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
          background: expanded ? '#f5f7fa' : '#fff',
          px: 0,
          py: 0.5,
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {/* Number Badge */}
        <Box sx={{ pl: 2, pr: 1 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: 'primary.main',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'white'
            }}
          >
            {index}
          </Avatar>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1} sx={{ pl: 1 }}>
          <BusinessIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 100 }}>
            {client.companyName || '-'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center" gap={1} flex={1} justifyContent="flex-start" flexWrap="wrap" sx={{ ml: 2, minWidth: 0, width: '100%' }}>
          <InfoRow icon={<LocationOnIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />} label="Location" value={client.location} />
          <InfoRow icon={<PhoneIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />} label="Contact" value={client.clientContactNumber} />
          <InfoRow icon={<LanguageIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />} label="Website" value={client.website} />
          <InfoRow icon={<EmailIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />} label="Site Email" value={client.siteEmail} />
          
          {/* User Count Badge */}
          <Box display="flex" alignItems="center" gap={0.5} sx={{ ml: 1 }}>
            <GroupIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: '1rem' }} />
            <Tooltip title={`Click to view ${userCount} user${userCount !== 1 ? 's' : ''} for this client`}>
              <Chip
                label={`${userCount} user${userCount !== 1 ? 's' : ''}`}
                size="small"
                onClick={handleUserCountClick}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: userCount > 0 ? '#e3f2fd' : '#f5f5f5',
                  color: userCount > 0 ? '#1976d2' : '#757575',
                  border: userCount > 0 ? '1px solid #bbdefb' : '1px solid #e0e0e0',
                  cursor: userCount > 0 ? 'pointer' : 'default',
                  '&:hover': userCount > 0 ? {
                    bgcolor: '#bbdefb'
                  } : {},
                  '& .MuiChip-label': {
                    px: 1,
                  }
                }}
              />
            </Tooltip>
          </Box>
        </Box>
        
        {/* Edit and Remove buttons */}
        {(showEdit || showRemove) && (
          <Box display="flex" alignItems="center" gap={1} sx={{ ml: 1, mr: 1 }} onClick={e => e.stopPropagation()}>
            {showEdit && <Tooltip title="Edit Client"><IconButton size="small" onClick={() => onEdit && onEdit(client)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
            {showRemove && <Tooltip title="Remove Client"><IconButton size="small" color="error" onClick={() => onRemove && onRemove(client)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
          </Box>
        )}
        <Tooltip title={expanded ? 'Hide Details' : 'Show Details'}>
          <IconButton size="small" sx={{ ml: 1, mr: 2 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent sx={{ background: '#fafbfc', py: 3, px: { xs: 2, sm: 3, md: 4 } }}>
          <Grid container spacing={3}>
            {/* Authorized Person Card */}
            <Grid item xs={12} md={4}>
              <ContactCard 
                title="Authorized Person" 
                icon={<PersonIcon fontSize="small" />}
                color="#3b82f6"
              >
                <ContactInfoItem 
                  icon={<BadgeIcon fontSize="small" />}
                  label="Name"
                  value={`${client.authFirstName || ''} ${client.authLastName || ''}`.trim() || 'N/A'}
                />
                <ContactInfoItem 
                  icon={<WorkIcon fontSize="small" />}
                  label="Designation"
                  value={client.authDesignation}
                />
                <ContactInfoItem 
                  icon={<ContactMailIcon fontSize="small" />}
                  label="Office Email"
                  value={client.authOfficeEmail}
                />
                <ContactInfoItem 
                  icon={<ContactMailIcon fontSize="small" />}
                  label="Personal Email"
                  value={client.authPersonalEmail}
                />
                <ContactInfoItem 
                  icon={<ContactPhoneIcon fontSize="small" />}
                  label="Contact Number"
                  value={client.authContactNumber}
                />
              </ContactCard>
            </Grid>

            {/* Site Administrator Card */}
            <Grid item xs={12} md={4}>
              <ContactCard 
                title="Site Administrator" 
                icon={<AdminPanelSettingsIcon fontSize="small" />}
                color="#10b981"
              >
                <ContactInfoItem 
                  icon={<BadgeIcon fontSize="small" />}
                  label="Name"
                  value={`${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim() || 'N/A'}
                />
                <ContactInfoItem 
                  icon={<WorkIcon fontSize="small" />}
                  label="Designation"
                  value={client.siteDesignation}
                />
                <ContactInfoItem 
                  icon={<ContactMailIcon fontSize="small" />}
                  label="Email"
                  value={client.siteEmail}
                />
                <ContactInfoItem 
                  icon={<ContactPhoneIcon fontSize="small" />}
                  label="Contact Number"
                  value={client.siteContactNumber}
                />
              </ContactCard>
            </Grid>

            {/* User Summary Card */}
            <Grid item xs={12} md={4}>
              <ContactCard 
                title="User Summary" 
                icon={<GroupIcon fontSize="small" />}
                color="#8b5cf6"
              >
                <ContactInfoItem 
                  icon={<GroupIcon fontSize="small" />}
                  label="Total Users"
                  value={`${userCount} user${userCount !== 1 ? 's' : ''}`}
                  isClickable={userCount > 0}
                  onClick={userCount > 0 ? handleUserCountClick : undefined}
                />
                <ContactInfoItem 
                  icon={<PersonIcon fontSize="small" />}
                  label="Active Users"
                  value={`${userCount} active`}
                />
                <ContactInfoItem 
                  icon={<WorkIcon fontSize="small" />}
                  label="User Types"
                  value="Regular Users"
                />
                <ContactInfoItem 
                  icon={<EmailIcon fontSize="small" />}
                  label="Domain"
                  value={client.domain || 'N/A'}
                />
                <ContactInfoItem 
                  icon={<BusinessIcon fontSize="small" />}
                  label="Company"
                  value={client.companyName || 'N/A'}
                />
              </ContactCard>
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default ClientCard; 