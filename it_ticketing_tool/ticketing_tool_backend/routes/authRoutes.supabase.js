// routes/authRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole, validUserRoles) => {

    // @route   POST /register
    // @desc    Register a new user with Supabase Auth and store role in database
    // @access  Public or Protected (RBAC enforced)
    router.post('/register', async (req, res) => {
        const { email, password, role = 'user', isSiteAdmin = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        if (!validUserRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        let requesterRole = null;
        let requesterUid = null;
        
        // Check if request is authenticated
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const { data: { user }, error } = await supabase.auth.getUser(token);
                
                if (!error && user) {
                    requesterUid = user.id;
                    const { data: userData } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    
                    if (userData) {
                        requesterRole = userData.role;
                    }
                }
            } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired authentication token.' });
            }
        }

        let finalIsSiteAdmin = false;
        if (typeof isSiteAdmin === 'boolean' && isSiteAdmin === true && requesterRole === null) {
            finalIsSiteAdmin = true;
        }

        // Role-based access control
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
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    return res.status(409).json({ error: 'Email already registered.' });
                }
                throw authError;
            }

            // Create user profile in database
            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    email: email,
                    role: role,
                    is_site_admin: finalIsSiteAdmin
                });

            if (dbError) {
                // If database insert fails, try to clean up the auth user
                await supabase.auth.admin.deleteUser(authData.user.id);
                throw dbError;
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
    // @desc    Verify Supabase JWT Token and retrieve user's role from database
    // @access  Public
    router.post('/login', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header with Bearer token is required!' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (error || !user) {
                return res.status(401).json({ error: 'Invalid or expired authentication token. Please log in again.' });
            }

            const { data: userProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError || !userProfile) {
                return res.status(404).json({ error: 'User profile not found in database. Please contact support.' });
            }

            const loggedInUser = {
                id: user.id,
                email: user.email,
                role: userProfile.role || 'user',
                mustChangePassword: userProfile.must_change_password || false
            };

            // Update last login
            await supabase
                .from('users')
                .update({
                    last_login: new Date().toISOString(),
                    login_activity: supabase.rpc('append_to_array', {
                        arr: userProfile.login_activity || [],
                        val: new Date().toISOString()
                    })
                })
                .eq('id', user.id);

            if (userProfile.must_change_password) {
                return res.status(403).json({
                    mustChangePassword: true,
                    user: loggedInUser
                });
            }

            return res.status(200).json({ message: 'Login successful', user: loggedInUser });
        } catch (error) {
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
            const { error: authError } = await supabase.auth.admin.updateUserById(uid, {
                password: newPassword
            });

            if (authError) {
                throw authError;
            }

            // Clear must_change_password flag
            const { error: dbError } = await supabase
                .from('users')
                .update({ must_change_password: false })
                .eq('id', uid);

            if (dbError) {
                throw dbError;
            }

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
        const authenticatedUid = req.user.uid;
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
                employeeid: userData.employee_id || '',
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

