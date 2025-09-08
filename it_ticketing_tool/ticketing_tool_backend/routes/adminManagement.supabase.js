// routes/adminManagement.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /admin-management/system-info
    // @desc    Get system information
    // @access  Private (Super Admin)
    router.get('/system-info', verifySupabaseToken, checkRole(['super_admin']), async (req, res) => {
        try {
            // Get counts from different tables
            const [usersResult, ticketsResult, notificationsResult, activitiesResult] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }),
                supabase.from('tickets').select('*', { count: 'exact', head: true }),
                supabase.from('notifications').select('*', { count: 'exact', head: true }),
                supabase.from('activities').select('*', { count: 'exact', head: true })
            ]);

            const systemInfo = {
                totalUsers: usersResult.count || 0,
                totalTickets: ticketsResult.count || 0,
                totalNotifications: notificationsResult.count || 0,
                totalActivities: activitiesResult.count || 0,
                timestamp: new Date().toISOString()
            };

            return res.status(200).json(systemInfo);
        } catch (error) {
            console.error(`Error fetching system info: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch system info: ${error.message}` });
        }
    });

    return router;
};

