// routes/clientRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, clientsCollection, usersCollection, verifyFirebaseToken) => {

    // GET /api/clients - Get all clients (super_admin, support, engineer can access)
    router.get('/', verifyFirebaseToken, async (req, res) => {
        try {
            // Check if user has permission to access clients
            const allowedRoles = ['super_admin', 'support', 'engineer'];
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to access clients data' });
            }

            const clientsSnapshot = await clientsCollection.get();
            const isSuperAdmin = req.user.role === 'super_admin';
            
            const clients = clientsSnapshot.docs.map(doc => {
                const data = doc.data();
                // For super_admin, return full client data
                if (isSuperAdmin) {
                    return {
                        id: doc.id,
                        companyName: data.companyName || '',
                        website: data.website || '',
                        location: data.location || '',
                        clientContactNumber: data.clientContactNumber || '',
                        authFirstName: data.authFirstName || '',
                        authLastName: data.authLastName || '',
                        authContactNumber: data.authContactNumber || '',
                        authOfficeEmail: data.authOfficeEmail || '',
                        authPersonalEmail: data.authPersonalEmail || '',
                        authDesignation: data.authDesignation || '',
                        siteFirstName: data.siteFirstName || '',
                        siteLastName: data.siteLastName || '',
                        siteEmail: data.siteEmail || '',
                        siteContactNumber: data.siteContactNumber || '',
                        siteDesignation: data.siteDesignation || '',
                        status: data.status || 'active' // Include status, default to 'active' if not set
                    };
                } else {
                    // For support and engineer, return only companyName and id for filtering
                    return {
                        id: doc.id,
                        companyName: data.companyName || '',
                        'Client name': data.companyName || '' // Also include 'Client name' key for compatibility
                    };
                }
            });
            res.json(clients);
        } catch (err) {
            console.error('Error fetching clients:', err);
            res.status(500).json({ error: 'Failed to fetch clients' });
        }
    });

    // GET /api/clients/:id - Get a single client by ID or company name
    router.get('/:id', verifyFirebaseToken, async (req, res) => {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;
            const userClientName = req.user?.client_name || req.user?.companyName;
            
            console.log(`[GET /api/clients/:id] Looking up client with ID/name: ${id}, user role: ${userRole}, user client: ${userClientName}`);
            
            // Check basic permissions
            if (!['super_admin', 'admin', 'support', 'engineer', 'site_admin'].includes(userRole)) {
                return res.status(403).json({ error: 'Insufficient permissions to access client data' });
            }
            
            // First, try to fetch by document ID
            let clientDoc = await clientsCollection.doc(id).get();
            
            // If not found by ID, try to find by company name
            if (!clientDoc.exists) {
                console.log(`[GET /api/clients/:id] Not found by document ID, trying company name lookup...`);
                
                // Try exact match first
                let clientsSnapshot = await clientsCollection.where('companyName', '==', id).limit(1).get();
                
                // If not found, try case-insensitive by fetching all and filtering
                if (clientsSnapshot.empty) {
                    console.log(`[GET /api/clients/:id] Exact match failed, trying case-insensitive search...`);
                    const allClientsSnapshot = await clientsCollection.get();
                    const matchingDoc = allClientsSnapshot.docs.find(doc => {
                        const data = doc.data();
                        const companyName = (data.companyName || '').toLowerCase().trim();
                        const clientName = (data.client_name || '').toLowerCase().trim();
                        const searchId = id.toLowerCase().trim();
                        return companyName === searchId || clientName === searchId;
                    });
                    
                    if (matchingDoc) {
                        clientDoc = matchingDoc;
                        console.log(`[GET /api/clients/:id] Found client by case-insensitive match: ${matchingDoc.id}`);
                    } else {
                        console.log(`[GET /api/clients/:id] Client not found. Searched for: "${id}"`);
                        // Log available clients for debugging (limited to first 5)
                        const allClients = allClientsSnapshot.docs.slice(0, 5).map(doc => ({
                            id: doc.id,
                            companyName: doc.data().companyName,
                            client_name: doc.data().client_name
                        }));
                        console.log(`[GET /api/clients/:id] Sample clients:`, allClients);
                        return res.status(404).json({ error: 'Client not found' });
                    }
                } else {
                    // Found by exact match
                    clientDoc = clientsSnapshot.docs[0];
                    console.log(`[GET /api/clients/:id] Found client by exact company name match: ${clientDoc.id}`);
                }
            } else {
                console.log(`[GET /api/clients/:id] Found client by document ID: ${clientDoc.id}`);
            }
            
            const data = clientDoc.data();
            
            // For site_admin, verify they can only access their own client (after lookup)
            if (userRole === 'site_admin' && userClientName) {
                const clientName = (data.companyName || data.client_name || '').toLowerCase().trim();
                const userClient = userClientName.toLowerCase().trim();
                
                if (clientName && userClient && clientName !== userClient) {
                    console.log(`[GET /api/clients/:id] Site admin tried to access different client. User client: "${userClient}", Requested: "${clientName}"`);
                    return res.status(403).json({ error: 'Access denied: You can only access your own client' });
                }
            }
            const client = {
                id: clientDoc.id,
                client_id: clientDoc.id, // Add client_id for consistency
                companyName: data.companyName || '',
                client_name: data.companyName || data.client_name || '', // Add client_name for consistency
                website: data.website || '',
                location: data.location || '',
                clientContactNumber: data.clientContactNumber || '',
                authFirstName: data.authFirstName || '',
                authLastName: data.authLastName || '',
                authContactNumber: data.authContactNumber || '',
                authOfficeEmail: data.authOfficeEmail || '',
                authPersonalEmail: data.authPersonalEmail || '',
                authDesignation: data.authDesignation || '',
                siteFirstName: data.siteFirstName || '',
                siteLastName: data.siteLastName || '',
                siteEmail: data.siteEmail || '',
                siteContactNumber: data.siteContactNumber || '',
                siteDesignation: data.siteDesignation || '',
                clientContactCountryCode: data.clientContactCountryCode || '',
                authContactCountryCode: data.authContactCountryCode || '',
                siteContactCountryCode: data.siteContactCountryCode || '',
                status: data.status || 'active' // Include status, default to 'active' if not set
            };
            
            res.json(client);
        } catch (err) {
            console.error('Error fetching client:', err);
            res.status(500).json({ error: 'Failed to fetch client' });
        }
    });

    // POST /api/clients - Add a new client
    router.post('/', async (req, res) => {
        try {
            const {
                companyName,
                website,
                location,
                clientContactCountryCode,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactCountryCode,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactCountryCode,
                siteContactNumber,
                siteDesignation
            } = req.body;
            const newClient = {
                companyName,
                website,
                location,
                clientContactCountryCode,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactCountryCode,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactCountryCode,
                siteContactNumber,
                siteDesignation,
                status: 'active' // Default status for new clients
            };
            const docRef = await clientsCollection.add(newClient);

            // --- Automatically create a user for the site admin ---
            // Get admin SDK from global require (since not passed in)
            const admin = require('firebase-admin');
            // Generate password: 8 characters (4 from "Sahayaon" letters + 4 random characters)
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
            
            const generatedPassword = selectedLetters.join('');
            
            // Prepare user data
            const userData = {
                client_name: companyName,
                firstName: siteFirstName,
                lastName: siteLastName,
                email: siteEmail,
                password: generatedPassword,
                contactNumber: siteContactNumber,
                designation: siteDesignation,
                role: 'site_admin',
                managerEmail: '',
                employmentType: '',
                mustChangePassword: true
            };
            let userRecord;
            try {
                userRecord = await admin.auth().createUser({ email: userData.email, password: userData.password });
                await usersCollection.doc(userRecord.uid).set({
                    client_name: userData.client_name,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    role: userData.role,
                    contactNumber: userData.contactNumber,
                    managerEmail: userData.managerEmail,
                    employmentType: userData.employmentType,
                    designation: userData.designation,
                    mustChangePassword: true,
                    isSiteAdmin: true, // <-- Set site admin flag
                    status: 'active' // Default status for new users
                });
            } catch (userErr) {
                // Rollback client creation
                await clientsCollection.doc(docRef.id).delete();
                console.error('Error creating user for new client:', userErr);
                return res.status(500).json({ error: 'Client created, but failed to create user: ' + userErr.message });
            }

            res.status(201).json({ id: docRef.id, ...newClient, userCreated: true });
        } catch (err) {
            console.error('Error adding client:', err);
            res.status(500).json({ error: 'Failed to add client' });
        }
    });

    // PUT /api/clients/:id - Edit a client by ID
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                companyName,
                website,
                location,
                clientContactCountryCode,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactCountryCode,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactCountryCode,
                siteContactNumber,
                siteDesignation
            } = req.body;
            // Filter out undefined values to avoid Firestore issues
            const updateData = {};
            const fields = [
                'companyName', 'website', 'location', 'clientContactCountryCode', 'clientContactNumber',
                'authFirstName', 'authLastName', 'authContactCountryCode', 'authContactNumber', 
                'authOfficeEmail', 'authPersonalEmail', 'authDesignation', 'siteFirstName', 
                'siteLastName', 'siteEmail', 'siteContactCountryCode', 'siteContactNumber', 'siteDesignation', 'status'
            ];
            
            fields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });
            
            // If status is being changed to inactive, cascade to all users
            if (updateData.status === 'inactive') {
                const clientDoc = await clientsCollection.doc(id).get();
                if (clientDoc.exists) {
                    const clientData = clientDoc.data();
                    const companyName = updateData.companyName || clientData.companyName;
                    
                    // Update all users for this client to inactive
                    if (companyName) {
                        const usersSnapshot = await usersCollection.where('client_name', '==', companyName).get();
                        const batch = db.batch();
                        usersSnapshot.docs.forEach(doc => {
                            batch.update(doc.ref, { status: 'inactive' });
                        });
                        if (usersSnapshot.docs.length > 0) {
                            await batch.commit();
                        }
                    }
                }
            }
            
            await clientsCollection.doc(id).update(updateData);
            res.status(200).json({ id, ...updateData });
        } catch (err) {
            console.error('Error updating client:', err);
            console.error('Client ID:', id);
            console.error('Update data:', updateData);
            console.error('Request body:', req.body);
            res.status(500).json({ error: 'Failed to update client', details: err.message });
        }
    });

    // DELETE /api/clients/:id - Delete a client by ID
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await clientsCollection.doc(id).delete();
            res.status(200).json({ message: 'Client deleted successfully.' });
        } catch (err) {
            console.error('Error deleting client:', err);
            res.status(500).json({ error: 'Failed to delete client' });
        }
    });

    // PUT /api/clients/:id/status - Update client status and cascade to users
    router.put('/:id/status', verifyFirebaseToken, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            // Validate status
            if (!status || !['active', 'inactive'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status. Must be "active" or "inactive".' });
            }

            // Check permissions - only super_admin, admin can change client status
            const allowedRoles = ['super_admin', 'admin'];
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions to change client status' });
            }

            // Get client document
            const clientDoc = await clientsCollection.doc(id).get();
            if (!clientDoc.exists) {
                return res.status(404).json({ error: 'Client not found' });
            }

            const clientData = clientDoc.data();
            const companyName = clientData.companyName;

            // Update client status
            await clientsCollection.doc(id).update({ status });

            // If client is being set to inactive, set all its users to inactive
            if (status === 'inactive' && companyName) {
                const usersSnapshot = await usersCollection
                    .where('client_name', '==', companyName)
                    .get();
                
                // Update all users to inactive in batch
                const batch = db.batch();
                usersSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { status: 'inactive' });
                });
                await batch.commit();

                res.status(200).json({ 
                    message: `Client status updated to ${status} and ${usersSnapshot.docs.length} user(s) set to inactive.`,
                    usersUpdated: usersSnapshot.docs.length
                });
            } else {
                res.status(200).json({ message: `Client status updated to ${status}.` });
            }
        } catch (err) {
            console.error('Error updating client status:', err);
            res.status(500).json({ error: 'Failed to update client status' });
        }
    });

    return router;
};