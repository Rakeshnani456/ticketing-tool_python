import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Domain as DomainIcon,
} from '@mui/icons-material';

const MetricCard = ({ title, value, subtitle, icon, color, trend }) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)` }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
          {icon}
        </Avatar>
        {trend && (
          <Chip
            label={`${trend > 0 ? '+' : ''}${trend}%`}
            size="small"
            color={trend > 0 ? 'success' : 'error'}
            variant="outlined"
          />
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 0.75, fontSize: '1.75rem' }}>
        {value}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.25, fontSize: '0.9rem', color: '#1e293b' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
        {subtitle}
      </Typography>
    </CardContent>
  </Card>
);

const ProgressCard = ({ title, items, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.9rem', color: '#1e293b' }}>
        <BarChartIcon sx={{ color, fontSize: '1.1rem' }} />
        {title}
      </Typography>
      <Box sx={{ space: 1.5 }}>
        {items.map((item, index) => (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem', color: '#1e293b' }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                {item.count} ({item.percentage}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const TopClientsTable = ({ clients, userCounts }) => {
  const sortedClients = clients
    .map(client => ({
      ...client,
      userCount: userCounts[client.companyName] || 0,
    }))
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 10);

  return (
    <Card>
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.9rem', color: '#1e293b' }}>
          <TrendingUpIcon sx={{ color: '#2196f3', fontSize: '1.1rem' }} />
          Top Clients by User Count
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Users</TableCell>
                <TableCell align="right">Percentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedClients.map((client, index) => {
                const totalUsers = Object.values(userCounts).reduce((sum, count) => sum + count, 0);
                const percentage = totalUsers > 0 ? ((client.userCount / totalUsers) * 100).toFixed(1) : 0;
                
                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                        {index + 1}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {client.companyName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {client.location || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={client.userCount}
                        size="small"
                        color={client.userCount > 0 ? 'primary' : 'default'}
                        variant={client.userCount > 0 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {percentage}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const ClientAnalytics = ({ clients, users, userCounts }) => {
  const analytics = useMemo(() => {
    const totalClients = clients.length;
    const totalUsers = users.length;
    const clientsWithUsers = clients.filter(client => (userCounts[client.companyName] || 0) > 0).length;
    const avgUsersPerClient = totalClients > 0 ? (totalUsers / totalClients).toFixed(1) : 0;

    // Location analytics
    const locationStats = {};
    clients.forEach(client => {
      const location = client.location || 'Unknown';
      locationStats[location] = (locationStats[location] || 0) + 1;
    });

    const locationData = Object.entries(locationStats)
      .map(([location, count]) => ({
        label: location,
        count,
        percentage: Math.round((count / totalClients) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // User distribution analytics
    const userDistribution = clients.map(client => {
      const userCount = userCounts[client.companyName] || 0;
      if (userCount === 0) return 'No Users';
      if (userCount <= 5) return '1-5 Users';
      if (userCount <= 20) return '6-20 Users';
      if (userCount <= 50) return '21-50 Users';
      return '50+ Users';
    });

    const distributionStats = {};
    userDistribution.forEach(category => {
      distributionStats[category] = (distributionStats[category] || 0) + 1;
    });

    const distributionData = Object.entries(distributionStats)
      .map(([category, count]) => ({
        label: category,
        count,
        percentage: Math.round((count / totalClients) * 100),
      }))
      .sort((a, b) => {
        const order = ['No Users', '1-5 Users', '6-20 Users', '21-50 Users', '50+ Users'];
        return order.indexOf(a.label) - order.indexOf(b.label);
      });

    // Client health metrics
    const healthMetrics = {
      activeClients: clientsWithUsers,
      inactiveClients: totalClients - clientsWithUsers,
      healthScore: totalClients > 0 ? Math.round((clientsWithUsers / totalClients) * 100) : 0,
    };

    return {
      totalClients,
      totalUsers,
      clientsWithUsers,
      avgUsersPerClient,
      locationData,
      distributionData,
      healthMetrics,
    };
  }, [clients, users, userCounts]);

  return (
    <Box sx={{ space: 2 }}>
      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Clients"
            value={analytics.totalClients}
            subtitle="Registered companies"
            icon={<BusinessIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Users"
            value={analytics.totalUsers}
            subtitle="Active user accounts"
            icon={<GroupIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Clients"
            value={analytics.clientsWithUsers}
            subtitle="Clients with users"
            icon={<TrendingUpIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Users/Client"
            value={analytics.avgUsersPerClient}
            subtitle="User distribution"
            icon={<PeopleIcon />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {/* Health Score */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.9rem', color: '#1e293b' }}>
            <PieChartIcon sx={{ color: '#4caf50', fontSize: '1.1rem' }} />
            Client Health Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ fontWeight: 700, color: '#4caf50', mb: 0.75, fontSize: '2.5rem' }}>
                  {analytics.healthMetrics.healthScore}%
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem', color: '#1e293b' }}>
                  Health Score
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Percentage of clients with active users
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#4caf50' }}>
                      <TrendingUpIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary="Active Clients"
                    secondary={`${analytics.healthMetrics.activeClients} clients with users`}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748b' }}
                  />
                  <Chip label={analytics.healthMetrics.activeClients} color="success" size="small" sx={{ fontSize: '0.7rem' }} />
                </ListItem>
                <ListItem sx={{ py: 1 }}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#f44336' }}>
                      <BusinessIcon fontSize="small" />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary="Inactive Clients"
                    secondary={`${analytics.healthMetrics.inactiveClients} clients without users`}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748b' }}
                  />
                  <Chip label={analytics.healthMetrics.inactiveClients} color="error" size="small" sx={{ fontSize: '0.7rem' }} />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Analytics Charts */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <ProgressCard
            title="Client Distribution by Location"
            items={analytics.locationData}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProgressCard
            title="User Distribution Across Clients"
            items={analytics.distributionData}
            color="#4caf50"
          />
        </Grid>
      </Grid>

      {/* Top Clients Table */}
      <TopClientsTable clients={clients} userCounts={userCounts} />

      {/* Additional Insights */}
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.9rem', color: '#1e293b' }}>
            <DomainIcon sx={{ color: '#9c27b0', fontSize: '1.1rem' }} />
            Key Insights
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976d2', fontSize: '1.5rem' }}>
                  {analytics.locationData.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Unique Locations
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#7b1fa2', fontSize: '1.5rem' }}>
                  {Math.max(...Object.values(userCounts), 0)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Max Users (Single Client)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '1.5rem' }}>
                  {clients.filter(client => (userCounts[client.companyName] || 0) > 10).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Enterprise Clients (10+ Users)
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fff3e0' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#f57c00', fontSize: '1.5rem' }}>
                  {analytics.totalClients - analytics.clientsWithUsers}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  Potential Growth
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientAnalytics;

