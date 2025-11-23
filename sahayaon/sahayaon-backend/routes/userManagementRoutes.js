// routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();
const cacheManager = require('../utils/cacheManager');

module.exports = (db, admin, usersCollection, clientsCollection, verifyFirebaseToken, emailService) => {

    // Health check endpoint
    router.get('/health', (req, res) => {
        res.status(200).json({ message: 'User management API is running' });
    });

    // GET /api/users - Get users based on role with caching
    router.get('/', verifyFirebaseToken, async (req, res) => {
        try {
            const userRole = req.user.role;
            const userClientName = req.user.client_name;
            const forAssignment = req.query.forAssignment === 'true'; // Check if this is for ticket assignment
            
            // Engineer roles that should be excluded from user management
            const engineerRoles = ['support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'];
            
            // Check if the user is an engineer (any engineer role) - define before use
            const isEngineer = engineerRoles.includes(userRole || '');
            
            // Create cache key based on user role and client
            const cacheKey = `users_${userRole}_${userClientName || 'all'}_${forAssignment ? 'assignment' : 'management'}`;
            
            // For engineers, don't use cache to ensure fresh data (cache can be stale)
            // Try to get from cache first (only for non-engineers and non-assignment requests)
            if (!isEngineer && !forAssignment) {
                const cachedUsers = cacheManager.get(cacheKey);
                if (cachedUsers) {
                    return res.status(200).json(cachedUsers);
                }
            }
            
            // Test Firestore connection
            if (!usersCollection) {
                console.error('usersCollection is undefined');
                return res.status(500).json({ error: 'Database connection error' });
            }
            
            let snapshot;
            
            if (userRole === 'site_admin') {
                if (userClientName) {
                    // For site_admin, get users from their company/client
                    // Exclude engineers - they are managed separately
                    
                    // OPTIMIZED: Use a single query with 'in' operator to check both fields
                    try {
                        // First try client_name
                        snapshot = await usersCollection.where('client_name', '==', userClientName).limit(500).get();
                        
                        // If no users found, try companyName
                        if (snapshot.empty) {
                            snapshot = await usersCollection.where('companyName', '==', userClientName).limit(500).get();
                        }
                        
                        // If still empty, try a compound query (if supported by your indexes)
                        if (snapshot.empty) {
                            // This would require a composite index, but provides better performance
                            // For now, we'll keep the two separate queries but add better logging
                            console.log(`No users found for client_name or companyName: ${userClientName}`);
                        }
                    } catch (queryError) {
                        console.error('Error in Firestore query:', queryError);
                        throw queryError;
                    }
                } else {
                    console.error('Site admin has no client_name set, returning empty result');
                    return res.status(200).json([]);
                }
            } else if (isEngineer) {
                // For engineers (any engineer role), get users they can assign tickets to:
                // all engineer roles (support, engineer, senior_engineer, lead_engineer, principal_engineer) and super_admin
                // Use 'in' operator to get multiple roles in a single query
                // Note: Firestore 'in' operator supports up to 10 values
                snapshot = await usersCollection
                    .where('role', 'in', ['support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer', 'super_admin'])
                    .limit(500)
                    .get();
            } else if (userRole === 'admin' || userRole === 'super_admin') {
                if (forAssignment) {
                    // For ticket assignment, super_admin needs both engineers and superadmins
                    snapshot = await usersCollection
                        .where('role', 'in', ['support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer', 'super_admin'])
                        .limit(500)
                        .get();
                } else {
                    // For user management, get all users but exclude engineers
                    // Engineers are managed separately and should not appear in user management
                    snapshot = await usersCollection.limit(1000).get();
                }
            } else {
                return res.status(403).json({ error: 'Insufficient permissions to view users.' });
            }
            
            if (!snapshot) {
                console.error('Snapshot is undefined, returning empty array');
                return res.status(200).json([]);
            }
            
            // Filter users based on role
            // For engineers, include all engineer roles, admin, and super_admin (already filtered by query)
            // For other roles, exclude engineer roles (engineers are managed separately) unless it's for assignment
            let users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            
            if (!isEngineer && !forAssignment) {
                // Filter out engineer roles for non-engineer users when NOT for assignment
                // Engineers are managed separately and should not appear in user management
                users = users.filter(user => !engineerRoles.includes(user.role));
            }
            // For engineers or assignment requests, we already filtered by the query, so no additional filtering needed
            
            // Cache the results for 2 minutes (only for non-engineers and non-assignment requests to avoid stale data)
            if (!isEngineer && !forAssignment) {
                cacheManager.set(cacheKey, users, 2 * 60 * 1000);
            }
            
            // Log for debugging
            if (isEngineer || forAssignment) {
                console.log(`[API /users] ${forAssignment ? 'Assignment' : 'Engineer'} query returned ${users.length} users:`, {
                    engineers: users.filter(u => engineerRoles.includes(u.role)).length,
                    superadmins: users.filter(u => u.role === 'super_admin').length,
                    roles: [...new Set(users.map(u => u.role))],
                    forAssignment: forAssignment
                });
            }
            
            return res.status(200).json(users);
        } catch (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: err.message || 'Failed to fetch users.' });
        }
    });

    // PUT /api/users/:uid - Update user fields
    router.put('/:uid', verifyFirebaseToken, async (req, res) => {
        const { uid } = req.params;
        // Accept all possible fields
        const {
            name, asset_id, joined_date, role,
            firstName, lastName, companyName, client_name,
            contactNumber, managerEmail, employmentType, designation, employeeId,
            password, status // If you want to allow password update here (optional)
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
        if (status !== undefined) {
            // Validate status
            if (!['active', 'inactive'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive".' });
            }
            updateData.status = status;
        }
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
        const { role, email } = req.body;
        try {
            console.log(`[Users] Create request received | role=${role} email=${email}`);
        } catch (_) {}
        if (!role) {
            return res.status(400).json({ error: 'Missing required field: role' });
        }
        if (role === 'support') {
            const { firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId } = req.body;
            if (!firstName || !lastName || !email || !contactNumber || !managerEmail || !employmentType || !designation || !employeeId) {
                return res.status(400).json({ error: 'Missing required fields for engineer: firstName, lastName, email, contactNumber, managerEmail, employmentType, designation, employeeId' });
            }
            // Allow duplicates for employeeId/contactNumber/email at the database level
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
                    employeeId: employeeId,
                    role,
                    companyName: 'Kriasol Technologies LLP', // All engineers belong to Kriasol Technologies LLP
                    client_name: 'Kriasol Technologies LLP', // All engineers belong to Kriasol Technologies LLP
                    mustChangePassword: true,
                    isSiteAdmin: false, // Always false for users created here
                    status: 'active' // Default status for new users
                };
                await userRef.set(userData);
                
                // Send welcome email to the new user
                if (emailService) {
                    console.log(`[Users] Scheduling welcome email | email=${email}`);
                    const portalUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                    const emailData = {
                        firstName: firstName,
                        lastName: lastName,
                        userName: `${firstName} ${lastName}`.trim() || email,
                        clientName: 'Sahayaon Technologies',
                        portalUrl: portalUrl,
                        userEmail: email,
                        username: email,
                        tempPassword: finalPassword,
                        password: finalPassword,
                        companyName: 'Sahayaon Technologies'
                    };
                    
                    // Validate email data
                    if (!emailData.userEmail || !emailData.tempPassword) {
                        console.error(`[Users] Missing email data | email=${email} tempPassword=${!!emailData.tempPassword}`);
                    }
                    
                    // Send email asynchronously (don't block the response)
                    setImmediate(async () => {
                        try {
                            const emailSent = await emailService.sendWelcomeEmail(emailData);
                            if (emailSent) {
                                console.log(`[Users] Welcome email sent successfully | email=${email}`);
                            } else {
                                console.error(`[Users] Welcome email failed (returned false) | email=${email}`);
                            }
                        } catch (emailError) {
                            console.error(`[Users] Error sending welcome email | email=${email} error=${emailError.message}`, emailError);
                        }
                    });
                } else {
                    console.warn(`[Users] Email service not available - welcome email not sent | email=${email}`);
                }
                
                return res.status(201).json({ message: 'Engineer created in Auth and Firestore.' });
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
            
            // Allow duplicates for employeeId/contactNumber/email at the database level
            
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
                    employeeId, // Add employee ID field
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false, // Always false for users created here
                    status: 'active' // Default status for new users
                };
                await userRef.set(userData);
                
                // Send welcome email to the new user
                if (emailService) {
                    console.log(`[Users] Scheduling welcome email | email=${email}`);
                    const portalUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                    const emailData = {
                        firstName: firstName,
                        lastName: lastName,
                        userName: `${firstName} ${lastName}`.trim() || email,
                        clientName: companyName,
                        portalUrl: portalUrl,
                        userEmail: email,
                        username: email,
                        tempPassword: password,
                        password: password,
                        companyName: companyName
                    };
                    
                    // Validate email data
                    if (!emailData.userEmail || !emailData.tempPassword) {
                        console.error(`[Users] Missing email data | email=${email} tempPassword=${!!emailData.tempPassword}`);
                    }
                    
                    // Send email asynchronously (don't block the response)
                    setImmediate(async () => {
                        try {
                            const emailSent = await emailService.sendWelcomeEmail(emailData);
                            if (emailSent) {
                                console.log(`[Users] Welcome email sent successfully | email=${email}`);
                            } else {
                                console.error(`[Users] Welcome email failed (returned false) | email=${email}`);
                            }
                        } catch (emailError) {
                            console.error(`[Users] Error sending welcome email | email=${email} error=${emailError.message}`, emailError);
                        }
                    });
                } else {
                    console.warn(`[Users] Email service not available - welcome email not sent | email=${email}`);
                }
                
                return res.status(201).json({ message: 'User created in Auth and Firestore.' });
            } catch (err) {
                console.error('Error creating user:', err);
                return res.status(500).json({ error: err.message || 'Failed to create user.' });
            }
        } else if (role === 'site_admin') {
            // Handle site_admin role - similar to user but with site admin privileges
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId } = req.body;
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation || !employeeId) {
                return res.status(400).json({ error: 'Missing required fields for site admin: companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId' });
            }
            
            // Allow duplicates for employeeId/contactNumber/email at the database level

            try {
                // Create user in Firebase Auth
                const userRecord = await admin.auth().createUser({
                    email: email,
                    password: password,
                    displayName: `${firstName} ${lastName}`,
                });

                // Save user data to Firestore with siteadmin role
                await usersCollection.doc(userRecord.uid).set({
                    companyName,
                    firstName,
                    lastName,
                    email,
                    contactNumber,
                    managerEmail,
                    employmentType,
                    designation,
                    employeeId,
                    role: 'site_admin', // Set role as site_admin
                    status: 'active', // Default status for new users
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                
                return res.status(201).json({ message: 'Site admin created in Auth and Firestore.' });
            } catch (err) {
                console.error('Error creating site admin:', err);
                return res.status(500).json({ error: err.message || 'Failed to create site admin.' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid role. Only "support", "user", and "site_admin" are supported.' });
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
    router.put('/:uid/password', verifyFirebaseToken, async (req, res) => {
        const { uid } = req.params;
        const { password, mustChangePassword, sendEmail } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        try {
            // Check if user exists and is active
            const userDoc = await usersCollection.doc(uid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userData = userDoc.data();
            const userStatus = userData.status || 'active';
            
            // Prevent password changes for inactive users
            if (userStatus === 'inactive') {
                return res.status(403).json({ 
                    error: 'ACCESS_DENIED',
                    message: 'Password reset is disabled for inactive accounts. Please contact your administrator.' 
                });
            }
            
            await admin.auth().updateUser(uid, { password });
            // Also update mustChangePassword in Firestore if requested
            if (mustChangePassword) {
                await usersCollection.doc(uid).update({ mustChangePassword: true });
            }
            
            // Send email if requested - but only for active users
            let emailSent = false;
            if (sendEmail && emailService) {
                try {
                    const userDocCheck = await usersCollection.doc(uid).get();
                    if (userDocCheck.exists) {
                        const userDataCheck = userDocCheck.data();
                        const userStatusCheck = userDataCheck.status || 'active';
                        // Don't send emails to inactive users
                        if (userStatusCheck === 'inactive') {
                            console.log(`Email not sent - user ${uid} is inactive`);
                            emailSent = false;
                        } else if (userDataCheck.email) {
                            const loginUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                            const firstName = userDataCheck.firstName || '';
                            const lastName = userDataCheck.lastName || '';
                            const fullUserName = (firstName && lastName) ? `${firstName} ${lastName}` : (userDataCheck.name || userDataCheck.email);
                            
                            const emailData = {
                                firstName: firstName,
                                lastName: lastName,
                                userName: fullUserName,
                                companyName: userDataCheck.client_name || userDataCheck.companyName || 'Company',
                                userEmail: userDataCheck.email,
                                newPassword: password,
                                password: password,
                                tempPassword: password,
                                loginUrl,
                                portalUrl: loginUrl
                            };
                            
                            emailSent = await emailService.sendPasswordSharingEmail(emailData);
                            if (emailSent) {
                                console.log(`Password reset email sent successfully to ${userDataCheck.email}`);
                            } else {
                                console.error(`Failed to send password reset email to ${userDataCheck.email}`);
                            }
                        }
                    }
                } catch (emailError) {
                    console.error('Error sending password reset email:', emailError);
                    // Don't fail the password update if email fails
                }
            }
            
            return res.status(200).json({ 
                message: 'Password updated successfully.',
                emailSent: emailSent
            });
        } catch (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: err.message || 'Failed to update password.' });
        }
    });

    // POST /api/users/:uid/reset-password - Reset user password (admin only)
    router.post('/:uid/reset-password', verifyFirebaseToken, async (req, res) => {
        const { uid } = req.params;
        
        try {
            // Check if user exists
            const userDoc = await usersCollection.doc(uid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const userData = userDoc.data();
            const userStatus = userData.status || 'active';
            
            // Prevent password resets for inactive users
            if (userStatus === 'inactive') {
                return res.status(403).json({ 
                    error: 'ACCESS_DENIED',
                    message: 'Password reset is disabled for inactive accounts. Please contact your administrator.' 
                });
            }
            
            // Generate a new password: 8 characters (4 from "Sahayaon" letters + 4 random characters)
            const sahayaonLetters = ['S', 'a', 'h', 'y', 'o', 'n'];
            const randomChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            
            // Pick 4 random letters from "Sahayaon"
            const selectedLetters = [];
            for (let i = 0; i < 4; i++) {
                const randomIndex = Math.floor(Math.random() * sahayaonLetters.length);
                selectedLetters.push(sahayaonLetters[randomIndex]);
            }
            
            // Add 4 random characters (numbers or alphabets)
            for (let i = 0; i < 4; i++) {
                selectedLetters.push(randomChars.charAt(Math.floor(Math.random() * randomChars.length)));
            }
            
            // Shuffle the array to mix letters and random chars
            for (let i = selectedLetters.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [selectedLetters[i], selectedLetters[j]] = [selectedLetters[j], selectedLetters[i]];
            }
            
            const newPassword = selectedLetters.join('');
            
            // Update the user's password in Firebase Auth
            await admin.auth().updateUser(uid, { password: newPassword });
            
            // Set mustChangePassword to true in Firestore
            await usersCollection.doc(uid).update({ mustChangePassword: true });
            
            // Automatically send password reset email - but only for active users
            let emailSent = false;
            if (emailService && userData.email && userStatus === 'active') {
                try {
                    const loginUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                    const firstName = userData.firstName || '';
                    const lastName = userData.lastName || '';
                    const fullUserName = (firstName && lastName) ? `${firstName} ${lastName}` : (userData.name || userData.email);
                    
                    const emailData = {
                        firstName: firstName,
                        lastName: lastName,
                        userName: fullUserName,
                        companyName: userData.client_name || userData.companyName || 'Company',
                        userEmail: userData.email,
                        newPassword: newPassword,
                        password: newPassword,
                        tempPassword: newPassword,
                        loginUrl,
                        portalUrl: loginUrl
                    };
                    
                    emailSent = await emailService.sendPasswordSharingEmail(emailData);
                    if (emailSent) {
                        console.log(`Password reset email sent successfully to ${userData.email}`);
                    } else {
                        console.error(`Failed to send password reset email to ${userData.email}`);
                    }
                } catch (emailError) {
                    console.error('Error sending password reset email:', emailError);
                    // Don't fail the password reset if email fails
                }
            } else if (userStatus === 'inactive') {
                console.log(`Email not sent - user ${uid} is inactive`);
            }
            
            return res.status(200).json({ 
                message: 'Password reset successfully.',
                newPassword: newPassword,
                emailSent: emailSent
            });
        } catch (err) {
            console.error('Error resetting password:', err);
            return res.status(500).json({ error: err.message || 'Failed to reset password.' });
        }
    });

    // POST /api/users/:uid/send-password-email - Send password sharing email
    router.post('/:uid/send-password-email', verifyFirebaseToken, async (req, res) => {
        const { uid } = req.params;
        const { password, userEmail, userName, companyName } = req.body;
        
        if (!password || !userEmail || !userName || !companyName) {
            return res.status(400).json({ error: 'Missing required fields: password, userEmail, userName, companyName' });
        }
        
        try {
            // Verify the user exists
            const userDoc = await usersCollection.doc(uid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Send the password sharing email
            if (emailService) {
                const loginUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                
                // Get user data to extract firstName and lastName
                const userData = userDoc.data();
                const firstName = userData.firstName || '';
                const lastName = userData.lastName || '';
                const fullUserName = (firstName && lastName) ? `${firstName} ${lastName}` : (userName || userEmail);
                
                const emailData = {
                    firstName: firstName,
                    lastName: lastName,
                    userName: fullUserName,
                    companyName,
                    userEmail,
                    newPassword: password,
                    password: password,
                    tempPassword: password,
                    loginUrl,
                    portalUrl: loginUrl
                };
                
                const emailSent = await emailService.sendPasswordSharingEmail(emailData);
                if (emailSent) {
                    return res.status(200).json({ message: 'Password sharing email sent successfully' });
                } else {
                    return res.status(500).json({ error: 'Failed to send password sharing email' });
                }
            } else {
                return res.status(500).json({ error: 'Email service not available' });
            }
        } catch (err) {
            console.error('Error sending password sharing email:', err);
            return res.status(500).json({ error: err.message || 'Failed to send password sharing email' });
        }
    });

    // BULK IMPORT USERS
    router.post('/bulk', async (req, res) => {
        const users = req.body.users;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ error: 'No users provided.' });
        }
        const results = [];
        const emailResults = [];
        
        for (const user of users) {
            const { companyName, firstName, lastName, email, password, contactNumber, managerEmail, employmentType, designation, employeeId } = user;
            // Validate required fields
            if (!companyName || !firstName || !lastName || !email || !password || !contactNumber || !managerEmail || !employmentType || !designation || !employeeId) {
                results.push({ email, success: false, error: 'Missing required fields.' });
                continue;
            }
            
            // Allow duplicates in bulk import
            
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
                    employeeId, // Add employee ID field
                    mustChangePassword: true, // <-- enforce password change on first login
                    isSiteAdmin: false, // Always false for users created here
                    status: 'active' // Default status for new users
                };
                await userRef.set(userData);
                results.push({ email, success: true });
                
                // Prepare email data for bulk sending
                if (emailService) {
                    const portalUrl = process.env.FRONTEND_URL || 'https://tt.kriasol.com/';
                    const emailData = {
                        userName: `${firstName} ${lastName}`,
                        clientName: companyName,
                        portalUrl: portalUrl,
                        userEmail: email,
                        tempPassword: password,
                        companyName: companyName
                    };
                    emailResults.push(emailData);
                }
            } catch (err) {
                results.push({ email, success: false, error: err.message || 'Failed to create user.' });
            }
        }
        
        // Send welcome emails to all successfully created users
        if (emailService && emailResults.length > 0) {
            setImmediate(async () => {
                try {
                    const emailSendResults = await emailService.sendBulkWelcomeEmails(emailResults);
                    console.log(`Bulk welcome emails sent: ${emailSendResults.filter(r => r.success).length}/${emailSendResults.length} successful`);
                } catch (emailError) {
                    console.error('Error sending bulk welcome emails:', emailError);
                }
            });
        }
        
        return res.status(200).json({ results });
    });

    router.delete('/:uid', verifyFirebaseToken, async (req, res) => {
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

    // PUT /api/users/:uid/status - Update user status
    router.put('/:uid/status', verifyFirebaseToken, async (req, res) => {
        try {
            const { uid } = req.params;
            const { status } = req.body;
            
            // Validate status
            if (!status || !['active', 'inactive'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive".' });
            }

            // Check if user exists
            const userDoc = await usersCollection.doc(uid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Check permissions - only super_admin, admin, and site_admin can change user status
            // Site admin can only change status of users from their own client
            const allowedRoles = ['super_admin', 'admin', 'site_admin'];
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to change user status' });
            }

            const userData = userDoc.data();
            if (req.user.role === 'site_admin' && userData.client_name !== req.user.client_name) {
                return res.status(403).json({ error: 'You can only change status for users from your own client' });
            }

            // Update user status
            await usersCollection.doc(uid).update({ status });

            return res.status(200).json({ message: `User status updated to ${status}.` });
        } catch (err) {
            console.error('Error updating user status:', err);
            return res.status(500).json({ error: 'Failed to update user status' });
        }
    });

    return router;
};