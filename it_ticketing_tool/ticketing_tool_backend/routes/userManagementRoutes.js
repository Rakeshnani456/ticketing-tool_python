// routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken) => {

    // GET /api/users - Get users based on role
    router.get('/', verifySupabaseToken, async (req, res) => {
        try {
            const userRole = req.user.role;
            const userClientName = req.user.client_name;
            
            let query;
            if (userRole === 'site_admin' && userClientName) {
                // For site_admin, get users from their company/client
                query = supabase
                    .from('users')
                    .select('*')
                    .eq('client_name', userClientName);
            } else if (userRole === 'support') {
                // For support role, get all support users
                query = supabase
                    .from('users')
                    .select('*')
                    .eq('role', 'support');
            } else if (userRole === 'admin' || userRole === 'super_admin') {
                // For admin/super_admin, get all users
                query = supabase
                    .from('users')
                    .select('*');
            } else {
                return res.status(403).json({ error: 'Insufficient permissions to view users.' });
            }
            
            const { data: users, error } = await query;
            if (error) throw error;

            const formattedUsers = users.map(user => ({ uid: user.id, ...user }));
            return res.status(200).json(formattedUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch users.' });
        }
    });

    // PUT /api/users/:uid - Update user fields
    router.put('/:uid', async (req, res) => {
        const { uid } = req.params;
        // Accept all possible fields
        const {
            name, asset_id, joined_date, role,
            firstName, lastName, companyName, client_name,
            contactNumber, managerEmail, employmentType, designation, employeeId,
            password // If you want to allow password update here (optional)
        } = req.body;

        // Build updateData with all fields that are present
        const updateData = {};
        if (name) updateData.name = name;
        if (asset_id !== undefined) updateData.asset_id = asset_id;
        if (joined_date) updateData.joined_date = joined_date;
        if (role) updateData.role = role;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (companyName) updateData.companyName = companyName;
        if (client_name) updateData.client_name = client_name;
        if (contactNumber) updateData.contactNumber = contactNumber;
        if (managerEmail) updateData.managerEmail = managerEmail;
        if (employmentType) updateData.employmentType = employmentType;
        if (designation) updateData.designation = designation;
        if (employeeId) updateData.employeeId = employeeId; // Add employee ID to update fields
        // Optionally handle password update here if needed (not recommended for database, should be done via Auth)

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }
        try {
            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', uid);

            if (error) throw error;

            return res.status(200).json({ message: 'User updated successfully.' });
        } catch (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: err.message || 'Failed to update user.' });
        }
    });

    // POST /api/users - Create a new user (with Auth UID as database doc ID)
    router.post('/', async (req, res) => {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Missing required field: role' });
        }
        if (role === 'support') {
            const { firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, asset_id, employeeid } = req.body;
            if (!firstName || !lastName || !email || !contactNumber || !managerEmail || !employmentType || !designation || !asset_id || !employeeid) {
                return res.status(400).json({ error: 'Missing required fields for engineer: firstName, lastName, email, contactNumber, managerEmail, employmentType, designation, asset_id, employeeid' });
            }
            // Uniqueness checks
            const [empResult, assetResult, emailResult, contactResult] = await Promise.all([
                supabase.from('users').select('id').eq('employeeid', employeeid).limit(1),
                supabase.from('users').select('id').eq('asset_id', asset_id).limit(1),
                supabase.from('users').select('id').eq('email', email).limit(1),
                supabase.from('users').select('id').eq('contactNumber', contactNumber).limit(1)
            ]);

            if (empResult.data && empResult.data.length > 0) {
                return res.status(400).json({ error: 'Employee ID already exists.' });
            }
            if (assetResult.data && assetResult.data.length > 0) {
                return res.status(400).json({ error: 'Asset ID already exists.' });
            }
            if (emailResult.data && emailResult.data.length > 0) {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            if (contactResult.data && contactResult.data.length > 0) {
                return res.status(400).json({ error: 'Contact Number already exists.' });
            }
            const finalPassword = password && password.length >= 6 ? password : 'Welcome@123';
            try {
                let userRecord;
                try {
                    userRecord = await supabase.auth.admin.createUser({ email, password: finalPassword });
                } catch (err) {
                    return res.status(400).json({ error: err.message || 'Failed to create user in Auth.' });
                }
                const uid = userRecord.data.user.id;
                const { error: insertError } = await supabase.from('users').insert({
                    id: uid,
                    name: `${firstName} ${lastName}`.trim(),
                    firstName,
                    lastName,
                    email,
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    asset_id,
                    employeeid,
                    role,
                    mustChangePassword: true,
                    isSiteAdmin: false // Always false for users created here
                });
                if (insertError) throw insertError;
                return res.status(201).json({ message: 'Engineer created in Auth and database.' });
            } catch (err) {
                console.error('Error creating engineer:', err);
                return res.status(500).json({ error: err.message || 'Failed to create engineer.' });
            }
        } else if (role === 'user') {
            // NEW LOGIC: Accept and save all new user fields
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId } = req.body;
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation || !employeeId) {
                return res.status(400).json({ error: 'Missing required fields for user: companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId' });
            }
            
            // Uniqueness checks for regular users
            const [empSnap, emailSnap, contactSnap] = await Promise.all([
                supabase.from('users').select('id').eq('employeeId', employeeId).limit(1),
                supabase.from('users').select('id').eq('email', email).limit(1),
                supabase.from('users').select('id').eq('contactNumber', contactNumber).limit(1)
            ]);
            if (empSnap.data && empSnap.data.length > 0) {
                return res.status(400).json({ error: 'Employee ID already exists.' });
            }
            if (emailSnap.data && emailSnap.data.length > 0) {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            if (contactSnap.data && contactSnap.data.length > 0) {
                return res.status(400).json({ error: 'Contact Number already exists.' });
            }
            
            try {
                let userRecord;
                try {
                    userRecord = await supabase.auth.admin.createUser({ email, password });
                } catch (err) {
                    return res.status(400).json({ error: err.message || 'Failed to create user in Auth.' });
                }
                const uid = userRecord.data.user.id;
                const userRef = supabase.from('users').insert({
                    id: uid,
                    client_name: companyName,
                    firstName,
                    lastName,
                    email,
                    role,
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    employeeId, // Add employee ID field
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false // Always false for users created here
                }).select().single();
                await userRef;
                return res.status(201).json({ message: 'User created in Auth and Firestore.' });
            } catch (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ error: err.message || 'Failed to create user.' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid role. Only "support" and "user" are supported.' });
        }
    });

    // PUT /api/users/:email - Update a user by email (careful, UID is usually better)
    router.put('/:email', async (req, res) => {
        const { email } = req.params;
        const { role, client_name, asset_id } = req.body;
        if (!role || !client_name) {
            return res.status(400).json({ error: 'Missing required fields: role, client_name' });
        }
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('id, client_name, domain')
                .eq('email', email)
                .single();

            if (error || !user) {
                return res.status(404).json({ error: 'User not found.' });
            }
            const userData = user;
            const oldClientName = userData.client_name;

            const { data: newClient, error: newClientError } = await supabase
                .from('clients')
                .select('domain')
                .eq('client_name', client_name)
                .single();

            if (newClientError || !newClient) {
                return res.status(400).json({ error: 'New client does not exist.' });
            }
            const newDomain = newClient.domain;

            const userDomain = email.split('@')[1];
            if (userDomain !== newDomain) {
                return res.status(400).json({ error: `User email domain (${userDomain}) does not match new client domain (${newDomain}).` });
            }

            let oldClientDocRef = null;
            if (oldClientName !== client_name) {
                const { data: oldClient, error: oldClientError } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('client_name', oldClientName)
                    .single();
                if (!oldClientError && oldClient) {
                    oldClientDocRef = oldClient.id;
                }
            }

            await supabase.rpc('update_user_and_client_counts', {
                obj: {
                    user_id: user.id,
                    new_client_name: client_name,
                    new_domain: newDomain,
                    asset_id: asset_id
                },
                old_client_id: oldClientDocRef
            });
            return res.status(200).json({ message: 'User updated and client user counts adjusted.' });
        } catch (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: err.message || 'Failed to update user.' });
        }
    });

    // PUT /api/users/:uid/password - Change user password
    router.put('/:uid/password', async (req, res) => {
        const { uid } = req.params;
        const { password, mustChangePassword } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        try {
            await supabase.auth.admin.updateUser(uid, { password });
            // Also update mustChangePassword in Firestore if requested
            if (mustChangePassword) {
                await supabase.from('users').update({ mustChangePassword: true }).eq('id', uid);
            }
            return res.status(200).json({ message: 'Password updated successfully.' });
        } catch (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: err.message || 'Failed to update password.' });
        }
    });

    // BULK IMPORT USERS
    router.post('/bulk', async (req, res) => {
        const users = req.body.users;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ error: 'No users provided.' });
        }
        const results = [];
        for (const user of users) {
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId } = user;
            // Validate required fields
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation || !employeeId) {
                results.push({ email, success: false, error: 'Missing required fields.' });
                continue;
            }
            
            // Uniqueness checks for bulk import
            const [empSnap, emailSnap, contactSnap] = await Promise.all([
                supabase.from('users').select('id').eq('employeeId', employeeId).limit(1),
                supabase.from('users').select('id').eq('email', email).limit(1),
                supabase.from('users').select('id').eq('contactNumber', contactNumber).limit(1)
            ]);
            if (empSnap.data && empSnap.data.length > 0) {
                results.push({ email, success: false, error: 'Employee ID already exists.' });
                continue;
            }
            if (emailSnap.data && emailSnap.data.length > 0) {
                results.push({ email, success: false, error: 'Email already exists.' });
                continue;
            }
            if (contactSnap.data && contactSnap.data.length > 0) {
                results.push({ email, success: false, error: 'Contact Number already exists.' });
                continue;
            }
            
            try {
                let userRecord;
                try {
                    userRecord = await supabase.auth.admin.createUser({ email, password });
                } catch (err) {
                    results.push({ email, success: false, error: err.message || 'Failed to create user in Auth.' });
                    continue;
                }
                const uid = userRecord.data.user.id;
                const { error: insertError } = await supabase.from('users').insert({
                    id: uid,
                    client_name: companyName,
                    firstName,
                    lastName,
                    email,
                    role: 'user',
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    employeeId, // Add employee ID field
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false // Always false for users created here
                });
                if (insertError) throw insertError;
                results.push({ email, success: true });
            } catch (err) {
                results.push({ email, success: false, error: err.message || 'Failed to create user.' });
            }
        }
        return res.status(200).json({ results });
    });

    router.delete('/:uid', async (req, res) => {
        const { uid } = req.params;

        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('client_name')
                .eq('id', uid)
                .single();

            if (error || !user) {
                return res.status(404).json({ error: 'User not found in Supabase.' });
            }
            const userData = user;
            const clientName = userData.client_name;

            if (!clientName) {
                await supabase.auth.admin.deleteUser(uid);
                await supabase.from('users').delete().eq('id', uid);
                return res.status(200).json({ message: 'User deleted (no client update needed).' });
            }

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('id')
                .eq('client_name', clientName)
                .single();
            const clientDocRef = clientError || !client ? null : client.id;

            await supabase.rpc('delete_user_and_client_counts', {
                obj: {
                    user_id: uid,
                    client_id: clientDocRef
                }
            });

            return res.status(200).json({ message: 'User deleted and client user count updated (if applicable).' });
        } catch (err) {
            console.error(`Error deleting user ${uid}:`, err);
            if (err.code && err.code.startsWith('auth/')) {
                return res.status(500).json({ error: `Supabase Auth error: ${err.message}` });
            }
            return res.status(500).json({ error: err.message || 'Failed to delete user.' });
        }
    });

    return router;
};