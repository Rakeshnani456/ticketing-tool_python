import React, { useState } from 'react';
import { Card, CardContent, Collapse, Typography, Box, IconButton, Divider, Tooltip, Link, Grid } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';

const InfoRow = ({ icon, label, value, link, itemSx }) => (
  <Box
    display="flex"
    alignItems="center"
    gap={0.25}
    sx={{ flex: '1 1 0', minWidth: 0, ...itemSx }}
  >
    {icon}
    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0, whiteSpace: 'nowrap', fontSize: '0.75em', pr: 0.25 }}>{label}:</Typography>
    {link ? (
      <Link
        href={link}
        target="_blank"
        rel="noopener"
        underline="hover"
        sx={{ fontSize: '0.75em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}
      >
        {value}
      </Link>
    ) : (
      <Typography
        variant="body2"
        sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1, fontSize: '0.75em' }}
      >
        {value || '-'}
      </Typography>
    )}
  </Box>
);

const SectionHeader = ({ icon, title }) => (
  <Box display="flex" alignItems="center" gap={1} mt={1} mb={0.5}>
    {icon}
    <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>{title}</Typography>
  </Box>
);

const ClientCard = ({ client }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
        width: '100%',
        borderLeft: 'none',
        borderRight: 'none',
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
          py: 1.5,
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Box display="flex" alignItems="center" gap={1} sx={{ pl: 2 }}>
          <BusinessIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 100 }}>
            {client.companyName || '-'}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2} flex={1} justifyContent="flex-start" flexWrap="wrap" sx={{ ml: 2, minWidth: 0, width: '100%' }}>
          <InfoRow icon={<LocationOnIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Location" value={client.location} />
          <InfoRow icon={<PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Contact" value={client.clientContactNumber} />
          <InfoRow icon={<LanguageIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Website" value={client.website} link={client.website ? (client.website.startsWith('http') ? client.website : `https://${client.website}`) : undefined} />
          <InfoRow icon={<EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Site Email" value={client.siteEmail} />
        </Box>
        <Tooltip title={expanded ? 'Hide Details' : 'Show Details'}>
          <IconButton size="small" sx={{ ml: 1, mr: 2 }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent sx={{ background: '#f9fafb', py: 3, px: { xs: 1, sm: 3, md: 6 } }}>
          <Grid container spacing={4} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <Box sx={{ pr: { md: 3 } }}>
                <SectionHeader icon={<PersonIcon color="primary" />} title="Authorized Person" />
                <Box display="flex" flexDirection="column" gap={1}>
                  <InfoRow icon={<PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Name" value={`${client.authFirstName || ''} ${client.authLastName || ''}`.trim()} />
                  <InfoRow icon={<EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Office Email" value={client.authOfficeEmail} />
                  <InfoRow icon={<EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Personal Email" value={client.authPersonalEmail} />
                  <InfoRow icon={<PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Contact" value={client.authContactNumber} />
                  <InfoRow icon={<BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Designation" value={client.authDesignation} />
                </Box>
              </Box>
            </Grid>
            {/* Optional vertical divider for desktop */}
            <Grid item xs={12} md={6}>
              <Box sx={{ pl: { md: 3 }, borderLeft: { md: '1px solid #e0e0e0' } }}>
                <SectionHeader icon={<PersonIcon color="secondary" />} title="Site Admin" />
                <Box display="flex" flexDirection="column" gap={1}>
                  <InfoRow icon={<PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Name" value={`${client.siteFirstName || ''} ${client.siteLastName || ''}`.trim()} />
                  <InfoRow icon={<EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Email" value={client.siteEmail} />
                  <InfoRow icon={<PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Contact" value={client.siteContactNumber} />
                  <InfoRow icon={<BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />} label="Designation" value={client.siteDesignation} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default ClientCard; 