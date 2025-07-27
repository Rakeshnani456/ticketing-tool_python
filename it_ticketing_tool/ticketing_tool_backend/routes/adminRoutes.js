// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /admin/users
    // @desc    Get all users (admin only)
    // @access  Private (requires admin role)
    router.get('/users', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('*');

            if (error) throw error;

            const usersList = users.map(user => ({
                uid: user.id,
                email: user.email,
                role: user.role || 'user',
                domain: user.domain || '',
                client_name: user.client_name || '',
                clientname: user.client_name || '',
                asset_id: user.asset_id || ''
            }));

            return res.status(200).json(usersList);
        } catch (error) {
            console.error('Error fetching all users (admin):', error);
            return res.status(500).json({ error: 'Failed to retrieve users.' });
        }
    });

    // @route   GET /admin/users/:uid
    // @desc    Get details of a specific user.
    // @access  Private (requires admin role)
    router.get('/users/:uid', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const userId = req.params.uid;
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !userData) {
                return res.status(404).json({ error: 'User not found in database.' });
            }

            return res.status(200).json({ 
                uid: userId, 
                email: userData.email, 
                role: userData.role 
            });
        } catch (error) {
            console.error(`Error fetching user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
        }
    });

    // @route   PATCH /admin/users/:uid
    // @desc    Update a user's role.
    // @access  Private (requires admin role)
    router.patch('/users/:uid', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { uid } = req.params;
        const { role } = req.body;

        const validRoles = ['user', 'support', 'admin', 'super_admin'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role provided.' });
        }

        if (uid === req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You cannot change your own role through this interface.' });
        }

        try {
            // Update user role in database
            const { error: updateError } = await supabase
                .from('users')
                .update({ role })
                .eq('id', uid);

            if (updateError) throw updateError;

            // Update user role in Supabase Auth
            const { error: authError } = await supabase.auth.admin.updateUserById(uid, {
                user_metadata: { role }
            });

            if (authError) {
                console.warn('Failed to update user metadata in auth:', authError);
                // Don't fail the request if auth update fails
            }

            return res.status(200).json({ message: 'User role updated successfully.' });
        } catch (error) {
            console.error(`Error updating user role for ${uid}:`, error);
            return res.status(500).json({ error: 'Failed to update user role.' });
        }
    });

    // @route   DELETE /admin/users/:uid
    // @desc    Delete a user (from Supabase Auth and database).
    // @access  Private (requires admin role)
    router.delete('/users/:uid', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { uid } = req.params;

        if (uid === req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You cannot delete your own account.' });
        }

        try {
            // Get user data first
            const { data: userData, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', uid)
                .single();

            if (fetchError || !userData) {
                return res.status(404).json({ error: 'User not found in database.' });
            }

            const clientName = userData.client_name;

            // Delete user from database
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', uid);

            if (deleteError) throw deleteError;

            // Delete user from Supabase Auth
            const { error: authError } = await supabase.auth.admin.deleteUser(uid);

            if (authError) {
                console.warn('Failed to delete user from auth:', authError);
                // Don't fail the request if auth delete fails
            }

            return res.status(200).json({ 
                message: `User ${userData.email} deleted successfully.`,
                clientName: clientName 
            });
        } catch (error) {
            console.error(`Error deleting user ${uid}:`, error);
            return res.status(500).json({ error: 'Failed to delete user.' });
        }
    });

    return router;
};