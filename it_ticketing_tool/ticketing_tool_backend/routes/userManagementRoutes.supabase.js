// routes/userManagementRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole, validUserRoles) => {

    // @route   GET /users
    // @desc    Get all users (admin only)
    // @access  Private (Admin)
    router.get('/', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
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

    // @route   GET /users/:userId
    // @desc    Get user by ID
    // @access  Private (Admin or self)
    router.get('/:userId', verifySupabaseToken, async (req, res) => {
        const requestedUserId = req.params.userId;
        const authenticatedUserId = req.user.uid;
        const authenticatedUserRole = req.user.role;

        // Check if user can access this profile
        if (requestedUserId !== authenticatedUserId && !['admin', 'super_admin'].includes(authenticatedUserRole)) {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own profile unless you are an admin.' });
        }

        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', requestedUserId)
                .single();

            if (error) throw error;

            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            return res.status(200).json(user);
        } catch (error) {
            console.error(`Error fetching user ${requestedUserId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
        }
    });

    // @route   PUT /users/:userId
    // @desc    Update user profile
    // @access  Private (Admin or self)
    router.put('/:userId', verifySupabaseToken, async (req, res) => {
        const requestedUserId = req.params.userId;
        const authenticatedUserId = req.user.uid;
        const authenticatedUserRole = req.user.role;
        const updateData = req.body;

        // Check if user can update this profile
        if (requestedUserId !== authenticatedUserId && !['admin', 'super_admin'].includes(authenticatedUserRole)) {
            return res.status(403).json({ error: 'Unauthorized: You can only update your own profile unless you are an admin.' });
        }

        // Regular users can't change their role
        if (requestedUserId === authenticatedUserId && updateData.role && !['admin', 'super_admin'].includes(authenticatedUserRole)) {
            return res.status(403).json({ error: 'Unauthorized: You cannot change your own role.' });
        }

        // Validate role if provided
        if (updateData.role && !validUserRoles.includes(updateData.role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        try {
            const { data: updatedUser, error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', requestedUserId)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
        } catch (error) {
            console.error(`Error updating user ${requestedUserId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to update user: ${error.message}` });
        }
    });

    // @route   DELETE /users/:userId
    // @desc    Delete user (admin only)
    // @access  Private (Admin)
    router.delete('/:userId', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const userId = req.params.userId;
        const authenticatedUserId = req.user.uid;

        // Prevent self-deletion
        if (userId === authenticatedUserId) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }

        try {
            // First, delete from Supabase Auth
            const { error: authError } = await supabase.auth.admin.deleteUser(userId);
            if (authError) throw authError;

            // Then delete from database
            const { error: dbError } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

            if (dbError) throw dbError;

            return res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error(`Error deleting user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to delete user: ${error.message}` });
        }
    });

    // @route   POST /users/:userId/reset-password
    // @desc    Reset user password (admin only)
    // @access  Private (Admin)
    router.post('/:userId/reset-password', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const userId = req.params.userId;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        }

        try {
            // Update password in Supabase Auth
            const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
                password: newPassword
            });

            if (authError) throw authError;

            // Set must_change_password flag
            const { error: dbError } = await supabase
                .from('users')
                .update({ must_change_password: true })
                .eq('id', userId);

            if (dbError) throw dbError;

            return res.status(200).json({ message: 'Password reset successfully. User must change password on next login.' });
        } catch (error) {
            console.error(`Error resetting password for user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to reset password: ${error.message}` });
        }
    });

    // @route   GET /users/search
    // @desc    Search users by email or name
    // @access  Private (Admin)
    router.get('/search', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { q: searchQuery, limit = 10 } = req.query;

        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required.' });
        }

        try {
            const { data: users, error } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, name, role')
                .or(`email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
                .limit(parseInt(limit));

            if (error) throw error;

            return res.status(200).json(users);
        } catch (error) {
            console.error(`Error searching users: ${error.message}`);
            return res.status(500).json({ error: `Failed to search users: ${error.message}` });
        }
    });

    return router;
};

