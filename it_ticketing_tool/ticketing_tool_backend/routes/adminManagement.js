const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, requireSuperAdmin) => {
    // List all admins
    router.get('/', verifySupabaseToken, requireSuperAdmin, async (req, res) => {
        try {
            const { data: admins, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'admin');

            if (error) throw error;

            const formattedAdmins = admins.map(admin => {
                let lastLogin = admin.lastLogin;
                if (lastLogin && typeof lastLogin === 'string') {
                    lastLogin = new Date(lastLogin).toISOString();
                }
                return { uid: admin.id, ...admin, lastLogin };
            });

            res.json({ admins: formattedAdmins });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch admins.' });
        }
    });

    // Create admin
    router.post('/', verifySupabaseToken, requireSuperAdmin, async (req, res) => {
        const { email, password, role = 'admin' } = req.body;
        if (!email || !password || !['admin', 'read_only_admin', 'super_admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid input.' });
        }
        try {
            // Create user in Supabase Auth with email confirmation bypassed
            const { data: userRecord, error: authError } = await supabase.auth.admin.createUser({ 
                email, 
                password,
                email_confirm: true // This bypasses email verification
            });

            if (authError) throw authError;

            // Add to database
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: userRecord.user.id,
                    email,
                    role,
                    active: true,
                    login_activity: [],
                    is_site_admin: false // Always false for users created here
                });

            if (insertError) throw insertError;

            res.status(201).json({ message: 'Admin created.', uid: userRecord.user.id });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create admin.' });
        }
    });

    // Edit admin (role, enable/disable)
    router.put('/:uid', verifySupabaseToken, requireSuperAdmin, async (req, res) => {
        const { uid } = req.params;
        const { role, active } = req.body;
        if (!role && typeof active === 'undefined') {
            return res.status(400).json({ error: 'No update fields provided.' });
        }
        try {
            const updateData = {};
            if (role) updateData.role = role;
            if (typeof active !== 'undefined') updateData.active = active;

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', uid);

            if (error) throw error;

            res.json({ message: 'Admin updated.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update admin.' });
        }
    });

    // Delete admin
    router.delete('/:uid', verifySupabaseToken, requireSuperAdmin, async (req, res) => {
        const { uid } = req.params;
        try {
            // Delete from database
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', uid);

            if (deleteError) throw deleteError;

            // Delete from Supabase Auth
            const { error: authError } = await supabase.auth.admin.deleteUser(uid);

            if (authError) {
                console.warn('Failed to delete user from auth:', authError);
                // Don't fail the request if auth delete fails
            }

            res.json({ message: 'Admin deleted.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete admin.' });
        }
    });

    // Get login activity for all admins
    router.get('/login-activity', verifySupabaseToken, requireSuperAdmin, async (req, res) => {
        try {
            const { data: admins, error } = await supabase
                .from('users')
                .select('id, email, login_activity')
                .in('role', ['admin', 'read_only_admin', 'super_admin']);

            if (error) throw error;

            const activity = admins.map(admin => ({ 
                uid: admin.id, 
                email: admin.email, 
                loginActivity: admin.login_activity || [] 
            }));

            res.json({ activity });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch login activity.' });
        }
    });

    // --- PUBLIC: Create Admin/Super Admin for Testing (REMOVE IN PRODUCTION) ---
    // Allows creation of any number of admin, read_only_admin, or super_admin users without authentication.
    // Usage: POST /admin-management/public-create { email, password, role }
    // WARNING: REMOVE OR DISABLE THIS ENDPOINT IN PRODUCTION!
    router.post('/public-create', async (req, res) => {
        const { email, password, role = 'super_admin' } = req.body;
        if (!email || !password || !['admin', 'read_only_admin', 'super_admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid input.' });
        }
        try {
            // Create user in Supabase Auth with email confirmation bypassed
            const { data: userRecord, error: authError } = await supabase.auth.admin.createUser({ 
                email, 
                password,
                email_confirm: true // This bypasses email verification
            });

            if (authError) throw authError;

            // Add to database
            const { error: insertError } = await supabase
                .from('users')
                .insert({
                    id: userRecord.user.id,
                    email,
                    role,
                    active: true,
                    login_activity: [],
                    is_site_admin: false
                });

            if (insertError) throw insertError;

            res.status(201).json({ 
                message: `${role} created successfully.`, 
                uid: userRecord.user.id,
                email: userRecord.user.email 
            });
        } catch (error) {
            console.error('Public admin creation error:', error);
            res.status(500).json({ 
                error: 'Failed to create admin.',
                details: error.message,
                code: error.code
            });
        }
    });

    return router;
}; 