const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Analytics Routes for Reports and Analytics
module.exports = function(db, admin, authenticateToken, checkRole) {
    
    // Get ticket analytics data
    router.get('/tickets', authenticateToken, async (req, res) => {
        try {
            console.log('Analytics request received:', { dateRange, clients, status, priority });
            console.log('User ID:', req.user.uid);
            const { dateRange, clients, status, priority } = req.query;
            
            // Build query based on filters
            console.log('Database connection status:', db ? 'Connected' : 'Not connected');
            let query = db.collection('tickets');
            
            // Check total tickets in collection
            const totalTicketsSnapshot = await db.collection('tickets').get();
            console.log(`Total tickets in database: ${totalTicketsSnapshot.size}`);
            
            if (totalTicketsSnapshot.size > 0) {
                const sampleTicket = totalTicketsSnapshot.docs[0].data();
                console.log('Sample ticket data:', {
                    id: totalTicketsSnapshot.docs[0].id,
                    status: sampleTicket.status,
                    priority: sampleTicket.priority,
                    created_at: sampleTicket.created_at,
                    client_id: sampleTicket.client_id
                });
            }
            
            // Apply date range filter
            if (dateRange && dateRange !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (dateRange) {
                    case '7d':
                        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                        break;
                    case '30d':
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                        break;
                    case '90d':
                        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                        break;
                    case '1y':
                        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                        break;
                    default:
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                
                console.log(`Date filter: ${dateRange}, startDate: ${startDate.toISOString()}, now: ${now.toISOString()}`);
                query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDate));
            } else {
                console.log('No date filter applied - getting all tickets');
            }
            
            // Apply client filter
            if (clients && clients !== '') {
                const clientIds = clients.split(',').filter(id => id.trim() !== '');
                if (clientIds.length > 0) {
                    console.log(`Client filter: ${clientIds.join(', ')}`);
                    query = query.where('client_id', 'in', clientIds);
                }
            }
            
            // Apply status filter
            if (status && status !== 'all') {
                console.log(`Status filter: ${status}`);
                query = query.where('status', '==', status);
            }
            
            // Apply priority filter
            if (priority && priority !== 'all') {
                console.log(`Priority filter: ${priority}`);
                query = query.where('priority', '==', priority);
            }
            
            // Get tickets
            console.log('Final query filters applied');
            const ticketsSnapshot = await query.get();
            const tickets = [];
            
            console.log(`Found ${ticketsSnapshot.size} tickets in query`);
            
            ticketsSnapshot.forEach(doc => {
                const ticketData = doc.data();
                tickets.push({
                    id: doc.id,
                    ...ticketData,
                    created_at: ticketData.created_at?.toDate?.() || ticketData.created_at,
                    updated_at: ticketData.updated_at?.toDate?.() || ticketData.updated_at,
                    resolved_at: ticketData.resolved_at?.toDate?.() || ticketData.resolved_at
                });
            });
            
            console.log('Sample ticket statuses:', tickets.slice(0, 5).map(t => ({ id: t.id, status: t.status, priority: t.priority })));
            
            // Calculate analytics
            const totalTickets = tickets.length;
            const openTickets = tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length;
            const resolvedTickets = tickets.filter(t => ['Resolved', 'Cancelled'].includes(t.status)).length;
            
            console.log(`Status counting: total=${totalTickets}, open=${openTickets}, resolved=${resolvedTickets}`);
            console.log('All statuses found:', [...new Set(tickets.map(t => t.status))]);
            
            // Calculate average resolution time
            let totalResolutionTime = 0;
            let resolvedCount = 0;
            
            tickets.forEach(ticket => {
                if (ticket.resolved_at && ticket.created_at) {
                    const created = new Date(ticket.created_at);
                    const resolved = new Date(ticket.resolved_at);
                    const resolutionTime = (resolved - created) / (1000 * 60 * 60); // hours
                    totalResolutionTime += resolutionTime;
                    resolvedCount++;
                }
            });
            
            const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;
            
            // Status distribution
            const statusDistribution = {};
            tickets.forEach(ticket => {
                statusDistribution[ticket.status] = (statusDistribution[ticket.status] || 0) + 1;
            });
            
            // Priority distribution
            const priorityDistribution = {};
            tickets.forEach(ticket => {
                priorityDistribution[ticket.priority] = (priorityDistribution[ticket.priority] || 0) + 1;
            });
            
            // Client distribution
            const clientDistribution = {};
            tickets.forEach(ticket => {
                if (ticket.client_name) {
                    clientDistribution[ticket.client_name] = (clientDistribution[ticket.client_name] || 0) + 1;
                }
            });
            
            // Daily ticket volume for trend analysis
            const dailyVolume = {};
            const dailyOpenTickets = {};
            const dailyResolvedTickets = {};
            
            // Initialize all dates in the range with 0
            const volumeStartDate = new Date();
            const endDate = new Date();
            
            if (dateRange && dateRange !== 'all') {
                switch (dateRange) {
                    case '7d':
                        volumeStartDate.setDate(volumeStartDate.getDate() - 7);
                        break;
                    case '30d':
                        volumeStartDate.setDate(volumeStartDate.getDate() - 30);
                        break;
                    case '90d':
                        volumeStartDate.setDate(volumeStartDate.getDate() - 90);
                        break;
                    case '1y':
                        volumeStartDate.setFullYear(volumeStartDate.getFullYear() - 1);
                        break;
                    default:
                        volumeStartDate.setDate(volumeStartDate.getDate() - 30);
                }
            } else {
                volumeStartDate.setDate(volumeStartDate.getDate() - 30);
            }
            
            // Initialize all dates
            for (let d = new Date(volumeStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                dailyVolume[dateStr] = 0;
                dailyOpenTickets[dateStr] = 0;
                dailyResolvedTickets[dateStr] = 0;
            }
            
            // Count tickets by date
            tickets.forEach(ticket => {
                if (ticket.created_at) {
                    const createdDate = new Date(ticket.created_at).toISOString().split('T')[0];
                    dailyVolume[createdDate] = (dailyVolume[createdDate] || 0) + 1;
                    
                    // Count open tickets (created on that day and still open)
                    if (['Open', 'In Progress'].includes(ticket.status)) {
                        dailyOpenTickets[createdDate] = (dailyOpenTickets[createdDate] || 0) + 1;
                    }
                }
                
                if (ticket.resolved_at) {
                    const resolvedDate = new Date(ticket.resolved_at).toISOString().split('T')[0];
                    dailyResolvedTickets[resolvedDate] = (dailyResolvedTickets[resolvedDate] || 0) + 1;
                }
            });
            
            // Sort daily volume by date and create arrays for chart
            const sortedDailyVolume = Object.entries(dailyVolume)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => ({ 
                    date, 
                    count,
                    openTickets: dailyOpenTickets[date] || 0,
                    resolvedTickets: dailyResolvedTickets[date] || 0
                }));
            
            const analyticsData = {
                totalTickets,
                openTickets,
                resolvedTickets,
                avgResolutionTime,
                statusDistribution,
                priorityDistribution,
                clientDistribution,
                dailyVolume: sortedDailyVolume,
                tickets: tickets.slice(0, 100), // Limit to first 100 tickets for performance
                filters: {
                    dateRange,
                    clients,
                    status,
                    priority
                }
            };
            
            console.log('Analytics data being sent:', {
                totalTickets,
                openTickets,
                resolvedTickets,
                statusDistribution,
                filters: { dateRange, clients, status, priority }
            });
            
            res.json(analyticsData);
            
        } catch (error) {
            console.error('Error fetching ticket analytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics data' });
        }
    });
    
    // Export analytics data
    router.get('/export', authenticateToken, async (req, res) => {
        try {
            const { dateRange, clients, status, priority, format } = req.query;
            
            // Build query similar to analytics endpoint
            let query = db.collection('tickets');
            
            // Apply filters (same logic as above)
            if (dateRange && dateRange !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (dateRange) {
                    case '7d':
                        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                        break;
                    case '30d':
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                        break;
                    case '90d':
                        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                        break;
                    case '1y':
                        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                        break;
                    default:
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                
                query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDate));
            }
            
            if (clients && clients !== '') {
                const clientIds = clients.split(',').filter(id => id.trim() !== '');
                if (clientIds.length > 0) {
                    query = query.where('client_id', 'in', clientIds);
                }
            }
            
            if (status && status !== 'all') {
                query = query.where('status', '==', status);
            }
            
            if (priority && priority !== 'all') {
                query = query.where('priority', '==', priority);
            }
            
            const ticketsSnapshot = await query.get();
            const tickets = [];
            
            ticketsSnapshot.forEach(doc => {
                const ticketData = doc.data();
                tickets.push({
                    id: doc.id,
                    display_id: ticketData.display_id,
                    title: ticketData.title,
                    description: ticketData.description,
                    status: ticketData.status,
                    priority: ticketData.priority,
                    client_name: ticketData.client_name,
                    assigned_to: ticketData.assigned_to,
                    reporter_email: ticketData.reporter_email,
                    created_at: ticketData.created_at?.toDate?.()?.toISOString() || ticketData.created_at,
                    updated_at: ticketData.updated_at?.toDate?.()?.toISOString() || ticketData.updated_at,
                    resolved_at: ticketData.resolved_at?.toDate?.()?.toISOString() || ticketData.resolved_at,
                    due_date: ticketData.due_date?.toDate?.()?.toISOString() || ticketData.due_date
                });
            });
            
            if (format === 'excel') {
                // For now, return CSV format (Excel can open CSV files)
                // In production, you might want to use a library like 'exceljs' for proper Excel files
                const csvHeaders = [
                    'Ticket ID',
                    'Display ID',
                    'Title',
                    'Description',
                    'Status',
                    'Priority',
                    'Client',
                    'Assigned To',
                    'Reporter',
                    'Created At',
                    'Updated At',
                    'Resolved At',
                    'Due Date'
                ];
                
                const csvRows = tickets.map(ticket => [
                    ticket.id,
                    ticket.display_id,
                    `"${(ticket.title || '').replace(/"/g, '""')}"`,
                    `"${(ticket.description || '').replace(/"/g, '""')}"`,
                    ticket.status,
                    ticket.priority,
                    ticket.client_name,
                    ticket.assigned_to,
                    ticket.reporter_email,
                    ticket.created_at,
                    ticket.updated_at,
                    ticket.resolved_at,
                    ticket.due_date
                ]);
                
                const csvContent = [csvHeaders, ...csvRows]
                    .map(row => row.join(','))
                    .join('\n');
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="ticket-report-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csvContent);
                
            } else if (format === 'pdf') {
                // For now, return a simple text representation
                // In production, you might want to use a library like 'puppeteer' or 'html-pdf' for proper PDF generation
                const pdfContent = `Ticket Report\n\n` +
                    `Generated on: ${new Date().toLocaleString()}\n` +
                    `Total Tickets: ${tickets.length}\n\n` +
                    tickets.map(ticket => 
                        `${ticket.display_id} - ${ticket.title} (${ticket.status})`
                    ).join('\n');
                
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', `attachment; filename="ticket-report-${new Date().toISOString().split('T')[0]}.txt"`);
                res.send(pdfContent);
                
            } else {
                res.status(400).json({ error: 'Invalid format specified. Use "excel" or "pdf"' });
            }
            
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            res.status(500).json({ error: 'Failed to export data' });
        }
    });
    
    // Get client analytics
    router.get('/clients', authenticateToken, async (req, res) => {
        try {
            const { dateRange } = req.query;
            
            // Get all clients
            const clientsSnapshot = await db.collection('clients').get();
            const clients = [];
            
            clientsSnapshot.forEach(doc => {
                clients.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get tickets for each client
            const clientAnalytics = await Promise.all(clients.map(async (client) => {
                let query = db.collection('tickets').where('client_id', '==', client.id);
                
                // Apply date range if specified
                if (dateRange && dateRange !== 'all') {
                    const now = new Date();
                    let startDate;
                    
                    switch (dateRange) {
                        case '7d':
                            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                            break;
                        case '30d':
                            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                            break;
                        case '90d':
                            startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                            break;
                        case '1y':
                            startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                            break;
                        default:
                            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    }
                    
                    query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDate));
                }
                
                const ticketsSnapshot = await query.get();
                const tickets = [];
                
                ticketsSnapshot.forEach(doc => {
                    tickets.push(doc.data());
                });
                
                const totalTickets = tickets.length;
                const openTickets = tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length;
                const resolvedTickets = tickets.filter(t => ['Resolved', 'Cancelled'].includes(t.status)).length;
                
                return {
                    ...client,
                    totalTickets,
                    openTickets,
                    resolvedTickets,
                    resolutionRate: totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : 0
                };
            }));
            
            res.json(clientAnalytics);
            
        } catch (error) {
            console.error('Error fetching client analytics:', error);
            res.status(500).json({ error: 'Failed to fetch client analytics' });
        }
    });
    
    // Get engineer analytics
    router.get('/engineers', authenticateToken, async (req, res) => {
        try {
            const { dateRange } = req.query;
            
            // Get all users with engineer role
            const engineersSnapshot = await db.collection('users').where('role', '==', 'engineer').get();
            const engineers = [];
            
            engineersSnapshot.forEach(doc => {
                engineers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get tickets for each engineer
            const engineerAnalytics = await Promise.all(engineers.map(async (engineer) => {
                let query = db.collection('tickets').where('assigned_to', '==', engineer.email);
                
                // Apply date range if specified
                if (dateRange && dateRange !== 'all') {
                    const now = new Date();
                    let startDate;
                    
                    switch (dateRange) {
                        case '7d':
                            startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                            break;
                        case '30d':
                            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                            break;
                        case '90d':
                            startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                            break;
                        case '1y':
                            startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                            break;
                        default:
                            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    }
                    
                    query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDate));
                }
                
                const ticketsSnapshot = await query.get();
                const tickets = [];
                
                ticketsSnapshot.forEach(doc => {
                    tickets.push(doc.data());
                });
                
                const totalTickets = tickets.length;
                const openTickets = tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length;
                const resolvedTickets = tickets.filter(t => ['Resolved', 'Cancelled'].includes(t.status)).length;
                
                // Calculate average resolution time
                let totalResolutionTime = 0;
                let resolvedCount = 0;
                
                tickets.forEach(ticket => {
                    if (ticket.resolved_at && ticket.created_at) {
                        const created = new Date(ticket.created_at.toDate ? ticket.created_at.toDate() : ticket.created_at);
                        const resolved = new Date(ticket.resolved_at.toDate ? ticket.resolved_at.toDate() : ticket.resolved_at);
                        const resolutionTime = (resolved - created) / (1000 * 60 * 60); // hours
                        totalResolutionTime += resolutionTime;
                        resolvedCount++;
                    }
                });
                
                const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;
                
                return {
                    ...engineer,
                    totalTickets,
                    openTickets,
                    resolvedTickets,
                    avgResolutionTime,
                    resolutionRate: totalTickets > 0 ? ((resolvedTickets / totalTickets) * 100).toFixed(1) : 0
                };
            }));
            
            res.json(engineerAnalytics);
            
        } catch (error) {
            console.error('Error fetching engineer analytics:', error);
            res.status(500).json({ error: 'Failed to fetch engineer analytics' });
        }
    });
    
    // Get performance analytics
    router.get('/performance', authenticateToken, async (req, res) => {
        try {
            const { dateRange } = req.query;
            
            // Build query
            let query = db.collection('tickets');
            
            // Apply date range if specified
            if (dateRange && dateRange !== 'all') {
                const now = new Date();
                let startDate;
                
                switch (dateRange) {
                    case '7d':
                        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                        break;
                    case '30d':
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                        break;
                    case '90d':
                        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
                        break;
                    case '1y':
                        startDate = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
                        break;
                    default:
                        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                }
                
                query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDate));
            }
            
            const ticketsSnapshot = await query.get();
            const tickets = [];
            
            ticketsSnapshot.forEach(doc => {
                const ticketData = doc.data();
                tickets.push({
                    ...ticketData,
                    created_at: ticketData.created_at?.toDate?.() || ticketData.created_at,
                    resolved_at: ticketData.resolved_at?.toDate?.() || ticketData.resolved_at
                });
            });
            
            // Calculate performance metrics
            const totalTickets = tickets.length;
            const resolvedTickets = tickets.filter(t => ['Resolved', 'Cancelled'].includes(t.status));
            
            // Resolution time metrics
            const resolutionTimes = resolvedTickets
                .map(ticket => {
                    if (ticket.resolved_at && ticket.created_at) {
                        const created = new Date(ticket.created_at);
                        const resolved = new Date(ticket.resolved_at);
                        return (resolved - created) / (1000 * 60 * 60); // hours
                    }
                    return null;
                })
                .filter(time => time !== null);
            
            const avgResolutionTime = resolutionTimes.length > 0 
                ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
                : 0;
            
            const minResolutionTime = resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0;
            const maxResolutionTime = resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0;
            
            // SLA compliance (assuming 24-hour SLA for now)
            const slaTarget = 24; // hours
            const slaCompliant = resolutionTimes.filter(time => time <= slaTarget).length;
            const slaComplianceRate = resolutionTimes.length > 0 
                ? ((slaCompliant / resolutionTimes.length) * 100).toFixed(1)
                : 0;
            
            // Priority-based metrics
            const priorityMetrics = {};
            ['Low', 'Medium', 'High', 'Critical'].forEach(priority => {
                const priorityTickets = tickets.filter(t => t.priority === priority);
                const resolvedPriorityTickets = priorityTickets.filter(t => ['Resolved', 'Cancelled'].includes(t.status));
                
                priorityMetrics[priority] = {
                    total: priorityTickets.length,
                    resolved: resolvedPriorityTickets.length,
                    resolutionRate: priorityTickets.length > 0 
                        ? ((resolvedPriorityTickets.length / priorityTickets.length) * 100).toFixed(1)
                        : 0
                };
            });
            
            const performanceData = {
                totalTickets,
                resolvedTickets: resolvedTickets.length,
                resolutionRate: totalTickets > 0 
                    ? ((resolvedTickets.length / totalTickets) * 100).toFixed(1)
                    : 0,
                resolutionTime: {
                    average: avgResolutionTime,
                    minimum: minResolutionTime,
                    maximum: maxResolutionTime
                },
                slaCompliance: {
                    target: slaTarget,
                    compliant: slaCompliant,
                    rate: slaComplianceRate
                },
                priorityMetrics,
                filters: { dateRange }
            };
            
            res.json(performanceData);
            
        } catch (error) {
            console.error('Error fetching performance analytics:', error);
            res.status(500).json({ error: 'Failed to fetch performance analytics' });
        }
    });
    
    return router;
};
