// routes/analyticsRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /analytics/ticket-trends
    // @desc    Get ticket trends over time
    // @access  Private (Admin/Support)
    router.get('/ticket-trends', verifySupabaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const { startDate, endDate } = req.query;
        const userRole = req.user.role;
        const clientName = req.user.client_name;

        try {
            let query = supabase
                .from('tickets')
                .select('created_at, status, priority, category');

            // Apply company filtering for site admin users
            if (userRole === 'site_admin' && clientName) {
                query = query.eq('client_name', clientName);
            }

            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            // Process data for trends
            const trends = {
                totalTickets: tickets.length,
                byStatus: {},
                byPriority: {},
                byCategory: {},
                byDate: {}
            };

            tickets.forEach(ticket => {
                const date = new Date(ticket.created_at).toISOString().split('T')[0];
                
                // Count by status
                trends.byStatus[ticket.status] = (trends.byStatus[ticket.status] || 0) + 1;
                
                // Count by priority
                trends.byPriority[ticket.priority] = (trends.byPriority[ticket.priority] || 0) + 1;
                
                // Count by category
                trends.byCategory[ticket.category] = (trends.byCategory[ticket.category] || 0) + 1;
                
                // Count by date
                trends.byDate[date] = (trends.byDate[date] || 0) + 1;
            });

            return res.status(200).json(trends);
        } catch (error) {
            console.error(`Error fetching ticket trends: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch ticket trends: ${error.message}` });
        }
    });

    // @route   GET /analytics/performance
    // @desc    Get performance metrics
    // @access  Private (Admin/Support)
    router.get('/performance', verifySupabaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const userRole = req.user.role;
        const clientName = req.user.client_name;

        try {
            let query = supabase
                .from('tickets')
                .select('created_at, resolved_at, time_spent_minutes, status');

            // Apply company filtering for site admin users
            if (userRole === 'site_admin' && clientName) {
                query = query.eq('client_name', clientName);
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            const resolvedTickets = tickets.filter(t => t.status === 'Resolved' && t.resolved_at);
            
            const performance = {
                totalTickets: tickets.length,
                resolvedTickets: resolvedTickets.length,
                averageResolutionTime: 0,
                averageTimeSpent: 0
            };

            if (resolvedTickets.length > 0) {
                // Calculate average resolution time
                const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
                    const created = new Date(ticket.created_at);
                    const resolved = new Date(ticket.resolved_at);
                    return sum + (resolved - created);
                }, 0);
                
                performance.averageResolutionTime = Math.round(totalResolutionTime / resolvedTickets.length / (1000 * 60 * 60)); // in hours

                // Calculate average time spent
                const ticketsWithTimeSpent = resolvedTickets.filter(t => t.time_spent_minutes);
                if (ticketsWithTimeSpent.length > 0) {
                    const totalTimeSpent = ticketsWithTimeSpent.reduce((sum, ticket) => sum + ticket.time_spent_minutes, 0);
                    performance.averageTimeSpent = Math.round(totalTimeSpent / ticketsWithTimeSpent.length);
                }
            }

            return res.status(200).json(performance);
        } catch (error) {
            console.error(`Error fetching performance metrics: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch performance metrics: ${error.message}` });
        }
    });

    return router;
};

