// routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, clientsCollection) => {

    // GET /api/users - Get all engineers (users with role 'support')
    router.get('/', async (req, res) => {
        try {
            const snapshot = await usersCollection.where('role', '==', 'support').get();
            const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            return res.status(200).json(users);
        } catch (err) {
            console.error('Error fetching engineers:', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch engineers.' });
        }
    });

    // PUT /api/users/:uid - Update password and/or asset_id
    router.put('/:uid', async (req, res) => {
        const { uid } = req.params;
        const { name, asset_id, joined_date, role } = req.body;
        if (!name && asset_id === undefined && !joined_date && !role) {
            return res.status(400).json({ error: 'No fields to update.' });
        }
        try {
            const updateData = {};
            if (name) updateData.name = name;
            if (asset_id !== undefined) updateData.asset_id = asset_id;
            if (joined_date) updateData.joined_date = joined_date;
            if (role) updateData.role = role;
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
            const { name, email, password, asset_id, joined_date, employeeid, designation } = req.body;
            if (!name || !email || !password || !asset_id || !joined_date || !employeeid || !designation) {
                return res.status(400).json({ error: 'Missing required fields for engineer: name, email, password, asset_id, joined_date, employeeid, designation' });
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
                const userData = { name, email, role, asset_id, joined_date, employeeid, designation };
                await userRef.set(userData);
                return res.status(201).json({ message: 'Engineer created in Auth and Firestore.' });
            } catch (err) {
                console.error('Error creating engineer:', err);
                return res.status(500).json({ error: err.message || 'Failed to create engineer.' });
            }
        } else if (role === 'user') {
            const { client_name, name, domain, email, password, asset_id } = req.body;
            if (!client_name || !name || !domain || !email || !password || !asset_id) {
                return res.status(400).json({ error: 'Missing required fields for user: client_name, name, domain, email, password, asset_id' });
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
                const userData = { client_name, name, domain, email, role, asset_id };
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