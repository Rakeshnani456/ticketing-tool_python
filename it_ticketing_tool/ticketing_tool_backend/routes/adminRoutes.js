// routes/adminRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, verifyFirebaseToken, checkRole) => {

    // @route   GET /admin/users
    // @desc    Get all users (admin only)
    // @access  Private (requires admin role)
    router.get('/users', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const usersSnapshot = await usersCollection.get();
            const usersList = [];
            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                let email = userData.email;
                let role = userData.role || 'user';
                let uid = doc.id;
                let domain = userData.domain || '';
                let client_name = userData.client_name || '';
                let asset_id = userData.asset_id || '';
                try {
                    let authUser = (await admin.auth().getUser(doc.id)); // Assuming doc.id is UID
                    email = authUser.email;
                } catch (e) {
                    // If not found in Auth, fallback to Firestore data
                }
                usersList.push({ uid, email, role, domain, client_name, clientname: client_name, asset_id });
            }
            return res.status(200).json(usersList);
        } catch (error) {
            console.error('Error fetching all users (admin):', error);
            return res.status(500).json({ error: 'Failed to retrieve users.' });
        }
    });

    // @route   GET /admin/users/:uid
    // @desc    Get details of a specific user.
    // @access  Private (requires admin role)
    router.get('/users/:uid', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const userId = req.params.uid;
        try {
            const userDoc = await usersCollection.doc(userId).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found in Firestore.' });
            }
            const userData = userDoc.data();
            return res.status(200).json({ uid: userId, email: userData.email, role: userData.role });
        } catch (error) {
            console.error(`Error fetching user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
        }
    });

    // @route   PATCH /admin/users/:uid
    // @desc    Update a user's role.
    // @access  Private (requires admin role)
    router.patch('/users/:uid', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { uid } = req.params;
        const { role } = req.body;

        const validRoles = ['user', 'support', 'admin', 'super_admin']; // Define or import this
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role provided.' });
        }

        if (uid === req.user.uid) {
            return res.status(403).json({ error: 'Forbidden: You cannot change your own role through this interface.' });
        }

        try {
            await usersCollection.doc(uid).update({ role });
            await admin.auth().setCustomUserClaims(uid, { role });
            return res.status(200).json({ message: 'User role updated successfully.' });
        } catch (error) {
            console.error(`Error updating user role for ${uid}:`, error);
            return res.status(500).json({ error: 'Failed to update user role.' });
        }
    });

    // @route   DELETE /admin/users/:uid
    // @desc    Delete a user (from Firebase Auth and Firestore).
    // @access  Private (requires admin role)
    router.delete('/users/:uid', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { uid } = req.params;

        if (uid === req.user.uid) {
            return res.status(403).json({ error: 'Forbidden: You cannot delete your own account.' });
        }

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

            const clientSnapshot = await db.collection('clients').where('client_name', '==', clientName).limit(1).get();
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

    // Inline Admin Management Route (can be moved to its own file later if needed)
    router.get('/', verifyFirebaseToken, checkRole(['super_admin']), async (req, res) => {
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
            console.error('Error fetching admins:', error);
            res.status(500).json({ error: 'Failed to fetch admins.' });
        }
    });

    return router;
};