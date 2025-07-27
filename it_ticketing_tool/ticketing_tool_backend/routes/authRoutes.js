// routes/authRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken) => {

    // @route   POST /register
    // @desc    Register a new user with Supabase Auth and store role in database
    // @access  Public or Protected (RBAC enforced)
    router.post('/register', async (req, res) => {
        const { email, password, role = 'user', isSiteAdmin = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        const validUserRoles = ['user', 'support', 'admin', 'super_admin', 'site_admin'];
        if (!validUserRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        let requesterRole = null;
        let requesterUid = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (error) throw error;
                
                requesterUid = user.id;
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', requesterUid)
                    .single();
                
                if (!userError && userData) {
                    requesterRole = userData.role;
                }
            } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired authentication token.' });
            }
        }

        let finalIsSiteAdmin = false;
        if (typeof isSiteAdmin === 'boolean' && isSiteAdmin === true && requesterRole === null) {
            finalIsSiteAdmin = true;
        }

        if (requesterRole === 'super_admin') {
            // Super Admin can create any role
        } else if (requesterRole === 'site_admin') {
            if (!(role === 'user' || role === 'support')) {
                return res.status(403).json({ error: 'Site Admins can only create users with user or support roles.' });
            }
        } else if (requesterRole) {
            return res.status(403).json({ error: 'You do not have permission to create users.' });
        } else {
            if (role !== 'user') {
                return res.status(403).json({ error: 'Public registration only allowed for user role.' });
            }
        }

        try {
            // Create user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    return res.status(409).json({ error: 'Email already registered.' });
                }
                throw authError;
            }

            // Create user profile in database
            const { error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email,
                    role: role,
                    is_site_admin: finalIsSiteAdmin,
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                // If profile creation fails, we should clean up the auth user
                // For now, just return the error
                console.error('Profile creation error:', profileError);
                return res.status(500).json({ error: 'Error creating user profile.' });
            }

            return res.status(201).json({ 
                message: `User ${email} registered successfully!`, 
                user_id: authData.user.id 
            });
        } catch (error) {
            console.error(`Registration error: ${error.message}`);
            return res.status(500).json({ error: `Error registering user: ${error.message}` });
        }
    });

    // @route   POST /login
    // @desc    Verify Supabase token and retrieve user's role from database
    // @access  Public
    router.post('/login', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header with Bearer token is required!' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) throw error;

            const uid = user.id;
            const emailFromToken = user.email || '';

            // Get user profile from database
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', uid)
                .single();

            if (userError || !userData) {
                return res.status(404).json({ error: 'User profile not found in database. Please contact support.' });
            }

            const loggedInUser = {
                id: uid,
                email: emailFromToken,
                role: userData.role || 'user',
                mustChangePassword: userData.must_change_password || false
            };

            // Update last login
            await supabase
                .from('users')
                .update({
                    last_login: new Date().toISOString(),
                    login_activity: supabase.sql`array_append(login_activity, ${new Date().toISOString()})`
                })
                .eq('id', uid);

            if (userData.must_change_password) {
                return res.status(403).json({
                    error: 'Password change required before login.',
                    mustChangePassword: true,
                    user: loggedInUser
                });
            }

            return res.status(200).json({ message: 'Login successful', user: loggedInUser });
        } catch (error) {
            if (error.message.includes('invalid') || error.message.includes('expired')) {
                return res.status(401).json({ error: 'Invalid or expired authentication token. Please log in again.' });
            }
            console.error(`Unexpected login error: ${error.message}`);
            return res.status(500).json({ error: `An unexpected error occurred during login: ${error.message}` });
        }
    });

    // Route to change password and clear mustChangePassword flag
    router.post('/change-password', async (req, res) => {
        const { uid, newPassword } = req.body;
        if (!uid || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Valid uid and new password (min 6 chars) required.' });
        }
        try {
            // Update password in Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            // Clear must_change_password flag
            await supabase
                .from('users')
                .update({ must_change_password: false })
                .eq('id', uid);

            return res.status(200).json({ message: 'Password changed successfully. You can now log in.' });
        } catch (err) {
            console.error('Error changing password:', err);
            return res.status(500).json({ error: err.message || 'Failed to change password.' });
        }
    });

    // @route GET /profile/:userId
    // @desc Get user profile details (email, role).
    // @access Private (requires token, self-access or admin role)
    router.get('/profile/:userId', verifySupabaseToken, async (req, res) => {
        const requestedUid = req.params.userId;
        const authenticatedUid = req.user.id;
        const authenticatedUserRole = req.user.role;

        if (requestedUid !== authenticatedUid && authenticatedUserRole !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own profile unless you are an admin.' });
        }

        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', requestedUid)
                .single();

            if (error || !userData) {
                return res.status(404).json({ error: 'User profile not found.' });
            }

            let fullName = '';
            if (userData.first_name || userData.last_name) {
                fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
            } else if (userData.name) {
                fullName = userData.name;
            }

            return res.status(200).json({
                uid: requestedUid,
                fullName,
                employeeid: userData.employeeid || '',
                email: userData.email,
                role: userData.role
            });
        } catch (error) {
            console.error(`Error fetching user profile for ${requestedUid}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user profile: ${error.message}` });
        }
    });

    return router;
};