const express = require('express');
const router = express.Router();

module.exports = (db, usersCollection, verifyFirebaseToken, requireSuperAdmin) => {
    // List all admins
    router.get('/', verifyFirebaseToken, requireSuperAdmin, async (req, res) => {
        try {
            const snapshot = await usersCollection.where('role', '==', 'admin').get();
            const admins = snapshot.docs.map(doc => {
                const data = doc.data();
                let lastLogin = data.lastLogin;
                if (lastLogin && lastLogin.toDate) {
                    lastLogin = lastLogin.toDate().toISOString();
                } else if (lastLogin && lastLogin._seconds) {
                    lastLogin = new Date(lastLogin._seconds * 1000).toISOString();
                }
                return { uid: doc.id, ...data, lastLogin };
            });
            res.json({ admins });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch admins.' });
        }
    });

    // Create admin
    router.post('/', verifyFirebaseToken, requireSuperAdmin, async (req, res) => {
        const { email, password, role = 'admin' } = req.body;
        if (!email || !password || !['admin', 'read_only_admin', 'super_admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid input.' });
        }
        try {
            // Create user in Firebase Auth
            const userRecord = await req.app.locals.admin.auth().createUser({ email, password });
            // Add to Firestore
            await usersCollection.doc(userRecord.uid).set({
                email,
                role,
                active: true,
                loginActivity: [],
            });
            res.status(201).json({ message: 'Admin created.', uid: userRecord.uid });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create admin.' });
        }
    });

    // Edit admin (role, enable/disable)
    router.put('/:uid', verifyFirebaseToken, requireSuperAdmin, async (req, res) => {
        const { uid } = req.params;
        const { role, active } = req.body;
        if (!role && typeof active === 'undefined') {
            return res.status(400).json({ error: 'No update fields provided.' });
        }
        try {
            const updateData = {};
            if (role) updateData.role = role;
            if (typeof active !== 'undefined') updateData.active = active;
            await usersCollection.doc(uid).update(updateData);
            res.json({ message: 'Admin updated.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to update admin.' });
        }
    });

    // Delete admin
    router.delete('/:uid', verifyFirebaseToken, requireSuperAdmin, async (req, res) => {
        const { uid } = req.params;
        try {
            await usersCollection.doc(uid).delete();
            await req.app.locals.admin.auth().deleteUser(uid);
            res.json({ message: 'Admin deleted.' });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete admin.' });
        }
    });

    // Get login activity for all admins
    router.get('/login-activity', verifyFirebaseToken, requireSuperAdmin, async (req, res) => {
        try {
            const snapshot = await usersCollection.where('role', 'in', ['admin', 'read_only_admin', 'super_admin']).get();
            const activity = snapshot.docs.map(doc => ({ uid: doc.id, email: doc.data().email, loginActivity: doc.data().loginActivity || [] }));
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
            // Create user in Firebase Auth
            const userRecord = await req.app.locals.admin.auth().createUser({ email, password });
            // Add to Firestore
            await usersCollection.doc(userRecord.uid).set({
                email,
                role,
                active: true,
                loginActivity: [],
            });
            res.status(201).json({ message: 'Admin created (public endpoint).', uid: userRecord.uid });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create admin.', details: error.message || error.toString() });
        }
    });

    return router;
}; 