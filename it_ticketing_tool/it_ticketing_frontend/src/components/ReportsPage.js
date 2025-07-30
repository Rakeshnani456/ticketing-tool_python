// src/components/ReportsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider
} from '@mui/material';
import { 
  DateRange, 
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  PictureAsPdf as PdfIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

// Mock data for demonstration
const generateMockData = (days = 30) => {
  const data = [];
  const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const agents = ['Alex Johnson', 'Sam Smith', 'Taylor Reed', 'Jordan Lee'];
  
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), i);
    const ticketsCount = Math.floor(Math.random() * 20) + 5;
    
    for (let j = 0; j < ticketsCount; j++) {
      data.push({
        id: `TKT-${Math.floor(Math.random() * 10000)}`,
        title: `Issue with system component ${Math.floor(Math.random() * 10)}`,
        description: `Detailed description of the issue...`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assignee: agents[Math.floor(Math.random() * agents.length)],
        createdAt: new Date(date.getTime() + Math.floor(Math.random() * 86400000)),
        updatedAt: new Date(date.getTime() + Math.floor(Math.random() * 86400000) + Math.floor(Math.random() * 3 * 86400000)),
        resolutionTime: Math.floor(Math.random() * 72) + 1, // in hours
        client: `Client ${Math.floor(Math.random() * 5) + 1}`,
        category: `Category ${Math.floor(Math.random() * 4) + 1}`,
      });
    }
  }
  
  return data;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage = ({ user }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [reportData, setReportData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last30days');
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [tabValue, setTabValue] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Generate mock data on component mount
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const data = generateMockData(90); // Generate 90 days of data
      setReportData(data);
      setFilteredData(data);
      setLoading(false);
    }, 800);
  }, []);
  
  // Apply filters when date range or other filters change
  useEffect(() => {
    if (reportData.length === 0) return;
    
    let filtered = [...reportData];
    
    // Apply date range filter
    if (dateRange === 'today') {
      const today = new Date();
      filtered = filtered.filter(ticket => 
        format(ticket.createdAt, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      );
    } else if (dateRange === 'last7days') {
      const startDate = subDays(new Date(), 7);
      filtered = filtered.filter(ticket => ticket.createdAt >= startDate);
    } else if (dateRange === 'last30days') {
      const startDate = subDays(new Date(), 30);
      filtered = filtered.filter(ticket => ticket.createdAt >= startDate);
    } else if (dateRange === 'thisMonth') {
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());
      filtered = filtered.filter(ticket => 
        isWithinInterval(ticket.createdAt, { start: startDate, end: endDate })
      );
    } else if (dateRange === 'lastMonth') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const startDate = startOfMonth(lastMonth);
      const endDate = endOfMonth(lastMonth);
      filtered = filtered.filter(ticket => 
        isWithinInterval(ticket.createdAt, { start: startDate, end: endDate })
      );
    } else if (dateRange === 'custom' && customDateRange.start && customDateRange.end) {
      filtered = filtered.filter(ticket => 
        isWithinInterval(ticket.createdAt, { 
          start: customDateRange.start, 
          end: customDateRange.end 
        })
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter);
    }
    
    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter);
    }
    
    // Apply assignee filter
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.assignee === assigneeFilter);
    }
    
    setFilteredData(filtered);
  }, [reportData, dateRange, customDateRange, statusFilter, priorityFilter, assigneeFilter]);
  
  // Calculate metrics for summary cards
  const metrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        totalTickets: 0,
        resolvedTickets: 0,
        avgResolutionTime: 0,
        openTickets: 0,
        criticalTickets: 0,
      };
    }
    
    const resolved = filteredData.filter(t => t.status === 'Resolved' || t.status === 'Closed');
    const open = filteredData.filter(t => t.status === 'Open' || t.status === 'In Progress');
    const critical = filteredData.filter(t => t.priority === 'Critical');
    
    const totalResolutionTime = resolved.reduce((sum, ticket) => sum + ticket.resolutionTime, 0);
    const avgResolutionTime = resolved.length > 0 ? totalResolutionTime / resolved.length : 0;
    
    return {
      totalTickets: filteredData.length,
      resolvedTickets: resolved.length,
      avgResolutionTime: parseFloat(avgResolutionTime.toFixed(1)),
      openTickets: open.length,
      criticalTickets: critical.length,
    };
  }, [filteredData]);
  
  // Prepare data for charts
  const ticketTrendData = useMemo(() => {
    const dataMap = {};
    
    filteredData.forEach(ticket => {
      const date = format(ticket.createdAt, 'yyyy-MM-dd');
      if (!dataMap[date]) {
        dataMap[date] = { date, created: 0, resolved: 0 };
      }
      dataMap[date].created += 1;
      
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        if (!dataMap[date].resolved) dataMap[date].resolved = 0;
        dataMap[date].resolved += 1;
      }
    });
    
    return Object.values(dataMap).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredData]);
  
  const statusDistributionData = useMemo(() => {
    const statusCounts = {};
    
    filteredData.forEach(ticket => {
      if (!statusCounts[ticket.status]) {
        statusCounts[ticket.status] = 0;
      }
      statusCounts[ticket.status] += 1;
    });
    
    return Object.keys(statusCounts).map(status => ({
      name: status,
      value: statusCounts[status],
    }));
  }, [filteredData]);
  
  const priorityDistributionData = useMemo(() => {
    const priorityCounts = {};
    
    filteredData.forEach(ticket => {
      if (!priorityCounts[ticket.priority]) {
        priorityCounts[ticket.priority] = 0;
      }
      priorityCounts[ticket.priority] += 1;
    });
    
    return Object.keys(priorityCounts).map(priority => ({
      name: priority,
      value: priorityCounts[priority],
    }));
  }, [filteredData]);
  
  const assigneePerformanceData = useMemo(() => {
    const assigneeMap = {};
    
    filteredData.forEach(ticket => {
      if (!ticket.assignee) return;
      
      if (!assigneeMap[ticket.assignee]) {
        assigneeMap[ticket.assignee] = {
          name: ticket.assignee,
          assigned: 0,
          resolved: 0,
          avgResolutionTime: 0,
        };
      }
      
      assigneeMap[ticket.assignee].assigned += 1;
      
      if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
        assigneeMap[ticket.assignee].resolved += 1;
        assigneeMap[ticket.assignee].avgResolutionTime += ticket.resolutionTime;
      }
    });
    
    return Object.values(assigneeMap).map(assignee => ({
      ...assignee,
      avgResolutionTime: assignee.resolved > 0 
        ? parseFloat((assignee.avgResolutionTime / assignee.resolved).toFixed(1))
        : 0,
    })).sort((a, b) => b.resolved - a.resolved);
  }, [filteredData]);
  
  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleRefresh = () => {
    setLoading(true);
    // Simulate API refresh
    setTimeout(() => {
      const data = generateMockData(90);
      setReportData(data);
      setLoading(false);
    }, 800);
  };
  
  const handleExportData = (format) => {
    // In a real app, this would generate and download a file
    alert(`Exporting data in ${format.toUpperCase()} format`);
  };
  
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set();
    reportData.forEach(ticket => {
      if (ticket.assignee) assignees.add(ticket.assignee);
    });
    return Array.from(assignees);
  }, [reportData]);
  
  return (
    <Box sx={{ p: 2, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 2,
        pb: 2,
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600, color: '#1976d2', mb: 0.5, fontSize: '1.125rem' }}>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
            Track ticket trends, performance metrics, and resolution times
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 1, 
          mt: { xs: 2, sm: 0 }
        }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: '1rem' }} />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
            sx={{ borderRadius: 1, fontSize: '0.75rem', px: 2, py: 0.5 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => handleExportData('csv')}
            size="small"
            sx={{ borderRadius: 1, fontSize: '0.75rem', px: 2, py: 0.5 }}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<PdfIcon sx={{ fontSize: '1rem' }} />}
            onClick={() => handleExportData('pdf')}
            size="small"
            sx={{ borderRadius: 1, fontSize: '0.75rem', px: 2, py: 0.5 }}
          >
            Export PDF
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Card sx={{ mb: 2, borderRadius: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={1} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="date-range-label">Date Range</InputLabel>
                <Select
                  labelId="date-range-label"
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  label="Date Range"
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="last7days">Last 7 Days</MenuItem>
                  <MenuItem value="last30days">Last 30 Days</MenuItem>
                  <MenuItem value="thisMonth">This Month</MenuItem>
                  <MenuItem value="lastMonth">Last Month</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="Start Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={customDateRange.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    label="End Date"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={customDateRange.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                    fullWidth
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="priority-filter-label">Priority</InputLabel>
                <Select
                  labelId="priority-filter-label"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="assignee-filter-label">Assignee</InputLabel>
                <Select
                  labelId="assignee-filter-label"
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  label="Assignee"
                >
                  <MenuItem value="all">All Assignees</MenuItem>
                  {uniqueAssignees.map(assignee => (
                    <MenuItem key={assignee} value={assignee}>{assignee}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 1, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Total Tickets
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 600, fontSize: '1.5rem' }}>
                    {metrics.totalTickets}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    In selected period
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 1, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Resolved Tickets
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: '#4caf50', fontSize: '1.5rem' }}>
                    {metrics.resolvedTickets}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    {metrics.totalTickets > 0 
                      ? `${Math.round((metrics.resolvedTickets / metrics.totalTickets) * 100)}% resolution rate` 
                      : 'No tickets'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 1, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Avg. Resolution Time
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: '#ff9800', fontSize: '1.5rem' }}>
                    {metrics.avgResolutionTime}h
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    Per ticket
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 1, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                    Open Tickets
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: '#f44336', fontSize: '1.5rem' }}>
                    {metrics.openTickets}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    Requiring attention
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts Section */}
          <Card sx={{ mb: 2, borderRadius: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="report tabs" sx={{ '& .MuiTab-root': { fontSize: '0.75rem', minHeight: '32px' } }}>
                <Tab label="Ticket Trends" id="tab-0" />
                <Tab label="Status Distribution" id="tab-1" />
                <Tab label="Priority Analysis" id="tab-2" />
                <Tab label="Team Performance" id="tab-3" />
              </Tabs>
              
              <Divider sx={{ mb: 1 }} />
              
                              {tabValue === 0 && (
                  <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={ticketTrendData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Area type="monotone" dataKey="created" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="resolved" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
              
                              {tabValue === 1 && (
                  <Box sx={{ height: 300, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
                  <Box sx={{ width: { xs: '100%', md: '50%' }, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                                     <Box sx={{ width: { xs: '100%', md: '50%' }, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                     <Typography variant="h6" gutterBottom sx={{ fontSize: '0.875rem' }}>
                       Status Breakdown
                     </Typography>
                     {statusDistributionData.map((status, index) => (
                       <Box key={status.name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                         <Box sx={{ width: 12, height: 12, backgroundColor: COLORS[index % COLORS.length], mr: 1 }} />
                         <Typography variant="body2" sx={{ flexGrow: 1, fontSize: '0.75rem' }}>
                           {status.name}
                         </Typography>
                         <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                           {status.value} ({((status.value / metrics.totalTickets) * 100).toFixed(1)}%)
                         </Typography>
                       </Box>
                     ))}
                   </Box>
                </Box>
              )}
              
                              {tabValue === 2 && (
                  <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={priorityDistributionData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" name="Tickets by Priority">
                        {priorityDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
              
                              {tabValue === 3 && (
                  <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={assigneePerformanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      layout={isMobile ? "vertical" : "horizontal"}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={isMobile ? "avgResolutionTime" : "name"} type={isMobile ? "number" : "category"} />
                      <YAxis dataKey={isMobile ? "name" : "resolved"} type={isMobile ? "category" : "number"} />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="resolved" fill="#82ca9d" name="Tickets Resolved" />
                      <Bar dataKey="avgResolutionTime" fill="#ff7300" name="Avg. Resolution Time (hours)" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* Detailed Data Table */}
          <Card sx={{ borderRadius: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>
                  Detailed Ticket Data
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon sx={{ fontSize: '1rem' }} />}
                  onClick={() => handleExportData('csv')}
                  sx={{ fontSize: '0.75rem', px: 2, py: 0.5 }}
                >
                  Export Data
                </Button>
              </Box>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader aria-label="sticky table" size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Ticket ID</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Title</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Status</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Priority</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Assignee</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Created</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>Resolution Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredData.slice(0, 20).map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{ticket.id}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{ticket.title}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                          <Chip 
                            label={ticket.status} 
                            size="small"
                            sx={{ fontSize: '0.625rem', height: '20px' }}
                            color={
                              ticket.status === 'Open' ? 'error' :
                              ticket.status === 'In Progress' ? 'warning' :
                              ticket.status === 'Resolved' ? 'success' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>
                          <Chip 
                            label={ticket.priority} 
                            size="small"
                            sx={{ fontSize: '0.625rem', height: '20px' }}
                            color={
                              ticket.priority === 'Critical' ? 'error' :
                              ticket.priority === 'High' ? 'warning' :
                              ticket.priority === 'Medium' ? 'info' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{ticket.assignee || 'Unassigned'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{format(ticket.createdAt, 'MMM dd, yyyy')}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', py: 0.5 }}>{ticket.resolutionTime}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {filteredData.length > 20 && (
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    Showing first 20 of {filteredData.length} tickets. Export to see all data.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default ReportsPage;