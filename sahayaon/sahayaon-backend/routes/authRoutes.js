// routes/authRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, usersCollection, verifyFirebaseToken) => {

    // @route   POST /register
    // @desc    Register a new user with Firebase Auth and store role in Firestore
    // @access  Public or Protected (RBAC enforced)
    router.post('/register', async (req, res) => {
        const { email, password, role = 'user', isSiteAdmin = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required!' });
        }

        const validUserRoles = ['user', 'support', 'admin', 'super_admin', 'site_admin']; // Define or import this
        if (!validUserRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        let requesterRole = null;
        let requesterUid = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            try {
                const idToken = req.headers.authorization.split(' ')[1];
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                requesterUid = decodedToken.uid;
                const userDoc = await usersCollection.doc(requesterUid).get();
                if (userDoc.exists) {
                    requesterRole = userDoc.data().role;
                }
            } catch (err) {
                return res.status(401).json({ error: 'Invalid or expired authentication token.' });
            }
        }

        let finalIsSiteAdmin = false;
        if (typeof isSiteAdmin === 'boolean' && isSiteAdmin === true && requesterRole === null) {
            // Only allow isSiteAdmin: true if registration is public (e.g., from client creation flow)
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
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
            });
            await usersCollection.doc(userRecord.uid).set({ email: email, role: role, isSiteAdmin: finalIsSiteAdmin });
            return res.status(201).json({ message: `User ${email} registered successfully!`, user_id: userRecord.uid });
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                return res.status(409).json({ error: 'Email already registered.' });
            }
            console.error(`Registration error: ${error.message}`);
            return res.status(500).json({ error: `Error registering user: ${error.message}` });
        }
    });

    // @route   POST /login
    // @desc    Verify Firebase ID Token and retrieve user's role from Firestore
    // @access  Public
    router.post('/login', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization header with Bearer token is required!' });
        }

        const idToken = authHeader.split(' ')[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const emailFromToken = decodedToken.email || '';

            const userDocRef = usersCollection.doc(uid);
            const userDoc = await userDocRef.get();

            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User profile not found in database. Please contact support.' });
            }

            const userProfile = userDoc.data();
            const loggedInUser = {
                id: uid,
                email: emailFromToken,
                role: userProfile.role || 'user',
                mustChangePassword: userProfile.mustChangePassword || false
            };

            await userDocRef.update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp(),
                loginActivity: admin.firestore.FieldValue.arrayUnion(new Date().toISOString())
            });

            if (userProfile.mustChangePassword) {
                // Require password change before allowing login
                return res.status(403).json({
                    mustChangePassword: true,
                    user: loggedInUser
                });
            }

            return res.status(200).json({ message: 'Login successful', user: loggedInUser });
        } catch (error) {
            if (error.code === 'auth/invalid-id-token' || error.code === 'auth/id-token-expired') {
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
            await admin.auth().updateUser(uid, { password: newPassword });
            await usersCollection.doc(uid).update({ mustChangePassword: false });
            return res.status(200).json({ message: 'Password changed successfully. You can now log in.' });
        } catch (err) {
            console.error('Error changing password:', err);
            return res.status(500).json({ error: err.message || 'Failed to change password.' });
        }
    });

    // @route GET /profile/:userId
    // @desc Get user profile details (email, role).
    // @access Private (requires token, self-access or admin role)
    router.get('/profile/:userId', verifyFirebaseToken, async (req, res) => {
        const requestedUid = req.params.userId;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        if (requestedUid !== authenticatedUid && authenticatedUserRole !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own profile unless you are an admin.' });
        }

        try {
            const userDoc = await usersCollection.doc(requestedUid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User profile not found.' });
            }
            const profileData = userDoc.data();
            let fullName = '';
            if (profileData.firstName || profileData.lastName) {
                fullName = `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim();
            } else if (profileData.name) {
                fullName = profileData.name;
            }
            return res.status(200).json({
                uid: requestedUid,
                fullName,
                employeeid: profileData.employeeid || '',
                email: profileData.email,
                role: profileData.role
            });
        } catch (error) {
            console.error(`Error fetching user profile for ${requestedUid}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch user profile: ${error.message}` });
        }
    });

    return router;
};