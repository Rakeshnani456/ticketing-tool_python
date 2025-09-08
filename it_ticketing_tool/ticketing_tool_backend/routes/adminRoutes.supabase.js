// routes/adminRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /admin/users
    // @desc    Get all users for admin management
    // @access  Private (Admin)
    router.get('/users', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return res.status(200).json(users);
        } catch (error) {
            console.error(`Error fetching users: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch users: ${error.message}` });
        }
    });

    // @route   GET /admin/activities
    // @desc    Get system activities for admin
    // @access  Private (Admin)
    router.get('/activities', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const limit = parseInt(req.query.limit) || 100;

        try {
            const { data: activities, error } = await supabase
                .from('activities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return res.status(200).json(activities);
        } catch (error) {
            console.error(`Error fetching activities: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch activities: ${error.message}` });
        }
    });

    return router;
};

