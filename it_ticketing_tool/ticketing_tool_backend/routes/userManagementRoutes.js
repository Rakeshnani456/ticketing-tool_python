// routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, clientsCollection, verifyFirebaseToken) => {

    // GET /api/users - Get users based on role
    router.get('/', verifyFirebaseToken, async (req, res) => {
        try {
            const userRole = req.user.role;
            const userClientName = req.user.client_name;
            
            let snapshot;
            if (userRole === 'site_admin' && userClientName) {
                // For site_admin, get users from their company/client
                snapshot = await usersCollection.where('client_name', '==', userClientName).get();
            } else if (userRole === 'support') {
                // For support role, get all support users
                snapshot = await usersCollection.where('role', '==', 'support').get();
            } else if (userRole === 'admin' || userRole === 'super_admin') {
                // For admin/super_admin, get all users
                snapshot = await usersCollection.get();
            } else {
                return res.status(403).json({ error: 'Insufficient permissions to view users.' });
            }
            
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            return res.status(200).json(users);
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
            contactNumber, managerEmail, employmentType, designation,
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
        // Optionally handle password update here if needed (not recommended for Firestore, should be done via Auth)

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }
        try {
            await usersCollection.doc(uid).update(updateData);
            return res.status(200).json({ message: 'User updated successfully.' });
        } catch (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: err.message || 'Failed to update user.' });
        }
    });

    // POST /api/users - Create a new user (with Auth UID as Firestore doc ID)
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
            const queries = [
                usersCollection.where('employeeid', '==', employeeid).limit(1).get(),
                usersCollection.where('asset_id', '==', asset_id).limit(1).get(),
                usersCollection.where('email', '==', email).limit(1).get(),
                usersCollection.where('contactNumber', '==', contactNumber).limit(1).get(),
            ];
            const [empSnap, assetSnap, emailSnap, contactSnap] = await Promise.all(queries);
            if (!empSnap.empty) {
                return res.status(400).json({ error: 'Employee ID already exists.' });
            }
            if (!assetSnap.empty) {
                return res.status(400).json({ error: 'Asset ID already exists.' });
            }
            if (!emailSnap.empty) {
                return res.status(400).json({ error: 'Email already exists.' });
            }
            if (!contactSnap.empty) {
                return res.status(400).json({ error: 'Contact Number already exists.' });
            }
            const finalPassword = password && password.length >= 6 ? password : 'Welcome@123';
            try {
                let userRecord;
                try {
                    userRecord = await admin.auth().createUser({ email, password: finalPassword });
                } catch (err) {
                    return res.status(400).json({ error: err.message || 'Failed to create user in Auth.' });
                }
                const uid = userRecord.uid;
                const userRef = usersCollection.doc(uid);
                const userData = {
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
                };
                await userRef.set(userData);
                return res.status(201).json({ message: 'Engineer created in Auth and Firestore.' });
            } catch (err) {
                console.error('Error creating engineer:', err);
                return res.status(500).json({ error: err.message || 'Failed to create engineer.' });
            }
        } else if (role === 'user') {
            // NEW LOGIC: Accept and save all new user fields
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation } = req.body;
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation) {
                return res.status(400).json({ error: 'Missing required fields for user: companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation' });
            }
            try {
                let userRecord;
                try {
                    userRecord = await admin.auth().createUser({ email, password });
                } catch (err) {
                    return res.status(400).json({ error: err.message || 'Failed to create user in Auth.' });
                }
                const uid = userRecord.uid;
                const userRef = usersCollection.doc(uid);
                const userData = {
                    client_name: companyName,
                    firstName,
                    lastName,
                    email,
                    role,
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false // Always false for users created here
                };
                await userRef.set(userData);
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
            const userQuerySnap = await usersCollection.where('email', '==', email).limit(1).get();
            if (userQuerySnap.empty) {
                return res.status(404).json({ error: 'User not found.' });
            }
            const userDoc = userQuerySnap.docs[0];
            const userRef = userDoc.ref;
            const oldUserData = userDoc.data();
            const oldClientName = oldUserData.client_name;

            const newClientSnapshot = await clientsCollection.where('client_name', '==', client_name).limit(1).get();
            if (newClientSnapshot.empty) {
                return res.status(400).json({ error: 'New client does not exist.' });
            }
            const newClientDocRef = newClientSnapshot.docs[0].ref;
            const newClientData = newClientSnapshot.docs[0].data();
            const newDomain = newClientData.domain;

            const userDomain = email.split('@')[1];
            if (userDomain !== newDomain) {
                return res.status(400).json({ error: `User email domain (${userDomain}) does not match new client domain (${newDomain}).` });
            }

            let oldClientDocRef = null;
            if (oldClientName !== client_name) {
                const oldClientSnapshot = await clientsCollection.where('client_name', '==', oldClientName).limit(1).get();
                if (!oldClientSnapshot.empty) {
                    oldClientDocRef = oldClientSnapshot.docs[0].ref;
                }
            }

            await db.runTransaction(async (t) => {
                const reads = [t.get(userRef), t.get(newClientDocRef)];
                if (oldClientDocRef) reads.push(t.get(oldClientDocRef));
                const [userSnapTx, newClientSnap, oldClientSnap] = await Promise.all(reads);

                t.update(userRef, { role, client_name, domain: newDomain, asset_id });
                if (oldClientName !== client_name && oldClientDocRef && oldClientSnap) {
                    const oldCount = oldClientSnap.data().no_of_users || 1;
                    t.update(oldClientDocRef, { no_of_users: Math.max(0, oldCount - 1) });
                }
                if (oldClientName !== client_name) {
                    const newCount = newClientSnap.data().no_of_users || 0;
                    t.update(newClientDocRef, { no_of_users: newCount + 1 });
                }
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
            await admin.auth().updateUser(uid, { password });
            // Also update mustChangePassword in Firestore if requested
            if (mustChangePassword) {
                await usersCollection.doc(uid).update({ mustChangePassword: true });
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
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation } = user;
            // Validate required fields
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation) {
                results.push({ email, success: false, error: 'Missing required fields.' });
                continue;
            }
            try {
                let userRecord;
                try {
                    userRecord = await admin.auth().createUser({ email, password });
                } catch (err) {
                    results.push({ email, success: false, error: err.message || 'Failed to create user in Auth.' });
                    continue;
                }
                const uid = userRecord.uid;
                const userRef = usersCollection.doc(uid);
                const userData = {
                    client_name: companyName,
                    firstName,
                    lastName,
                    email,
                    role: 'user',
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false // Always false for users created here
                };
                await userRef.set(userData);
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
            const userRef = usersCollection.doc(uid);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                return res.status(404).json({ error: 'User not found in Firestore.' });
            }
            const userData = userSnap.data();
            const clientName = userData.client_name;

            if (!clientName) {
                await admin.auth().deleteUser(uid);
                await userRef.delete();
                return res.status(200).json({ message: 'User deleted (no client update needed).' });
            }

            const clientSnapshot = await clientsCollection.where('client_name', '==', clientName).limit(1).get();
            const clientDocRef = clientSnapshot.empty ? null : clientSnapshot.docs[0].ref;

            await db.runTransaction(async (t) => {
                let clientSnap = null;
                if (clientDocRef) {
                    clientSnap = await t.get(clientDocRef);
                }

                await admin.auth().deleteUser(uid);
                t.delete(userRef);

                if (clientSnap && clientSnap.exists) {
                    const prevCount = clientSnap.data().no_of_users || 1;
                    t.update(clientDocRef, { no_of_users: Math.max(0, prevCount - 1) });
                }
            });

            return res.status(200).json({ message: 'User deleted and client user count updated (if applicable).' });
        } catch (err) {
            console.error(`Error deleting user ${uid}:`, err);
            if (err.code && err.code.startsWith('auth/')) {
                return res.status(500).json({ error: `Firebase Auth error: ${err.message}` });
            }
            return res.status(500).json({ error: err.message || 'Failed to delete user.' });
        }
    });

    return router;
};