// routes/dashboardRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /dashboard/stats
    // @desc    Get dashboard statistics
    // @access  Private
    router.get('/stats', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userRole = req.user.role;
        const clientName = req.user.client_name;

        try {
            let ticketQuery = supabase.from('tickets').select('*');
            
            // Apply company filtering for site admin users
            if (userRole === 'site_admin' && clientName) {
                ticketQuery = ticketQuery.eq('client_name', clientName);
            }

            const { data: tickets, error } = await ticketQuery;

            if (error) throw error;

            // Calculate statistics
            const stats = {
                totalTickets: tickets.length,
                openTickets: tickets.filter(t => t.status === 'Open').length,
                inProgressTickets: tickets.filter(t => t.status === 'In Progress').length,
                resolvedTickets: tickets.filter(t => t.status === 'Resolved').length,
                cancelledTickets: tickets.filter(t => t.status === 'Cancelled').length,
                assignedToMe: tickets.filter(t => t.assigned_to_id === userId).length,
                highPriorityTickets: tickets.filter(t => t.priority === 'High' || t.priority === 'Critical').length,
                softwareTickets: tickets.filter(t => t.category === 'software').length,
                hardwareTickets: tickets.filter(t => t.category === 'hardware').length,
                troubleshootTickets: tickets.filter(t => t.category === 'troubleshoot').length
            };

            return res.status(200).json(stats);
        } catch (error) {
            console.error(`Error fetching dashboard stats: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch dashboard stats: ${error.message}` });
        }
    });

    // @route   GET /dashboard/recent-tickets
    // @desc    Get recent tickets for dashboard
    // @access  Private
    router.get('/recent-tickets', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userRole = req.user.role;
        const clientName = req.user.client_name;
        const limit = parseInt(req.query.limit) || 10;

        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            // Apply company filtering for site admin users
            if (userRole === 'site_admin' && clientName) {
                query = query.eq('client_name', clientName);
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error fetching recent tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch recent tickets: ${error.message}` });
        }
    });

    // @route   GET /dashboard/my-tickets
    // @desc    Get user's own tickets for dashboard
    // @access  Private
    router.get('/my-tickets', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 5;

        try {
            const { data: tickets, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('reporter_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error fetching user's tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user's tickets: ${error.message}` });
        }
    });

    // @route   GET /dashboard/assigned-tickets
    // @desc    Get tickets assigned to the user
    // @access  Private
    router.get('/assigned-tickets', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 5;

        try {
            const { data: tickets, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('assigned_to_id', userId)
                .in('status', ['Open', 'In Progress', 'Hold'])
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error fetching assigned tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch assigned tickets: ${error.message}` });
        }
    });

    return router;
};

