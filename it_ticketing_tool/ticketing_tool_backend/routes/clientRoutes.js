// routes/clientRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, clientsCollection, usersCollection, verifyFirebaseToken) => {

    // GET /api/clients - Get all clients (super_admin only)
    router.get('/', verifyFirebaseToken, async (req, res) => {
        try {
            // Check if user has permission to access clients
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({ error: 'Insufficient permissions to access clients data' });
            }

            const clientsSnapshot = await clientsCollection.get();
            const clients = clientsSnapshot.docs.map(doc => {
                const data = doc.data();
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
                    siteDesignation: data.siteDesignation || ''
                };
            });
            res.json(clients);
        } catch (err) {
            console.error('Error fetching clients:', err);
            res.status(500).json({ error: 'Failed to fetch clients' });
        }
    });

    // GET /api/clients/:id - Get a single client by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const clientDoc = await clientsCollection.doc(id).get();
            
            if (!clientDoc.exists) {
                return res.status(404).json({ error: 'Client not found' });
            }
            
            const data = clientDoc.data();
            const client = {
                id: clientDoc.id,
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
                clientContactCountryCode: data.clientContactCountryCode || '',
                authContactCountryCode: data.authContactCountryCode || '',
                siteContactCountryCode: data.siteContactCountryCode || ''
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
                siteDesignation
            };
            const docRef = await clientsCollection.add(newClient);

            // --- Automatically create a user for the site admin ---
            // Get admin SDK from global require (since not passed in)
            const admin = require('firebase-admin');
            // Prepare user data
            const userData = {
                client_name: companyName,
                firstName: siteFirstName,
                lastName: siteLastName,
                email: siteEmail,
                password: 'Welcome@123', // Default password, can be randomized
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
                    isSiteAdmin: true // <-- Set site admin flag
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
            const updateData = {
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
            };
            await clientsCollection.doc(id).update(updateData);
            res.status(200).json({ id, ...updateData });
        } catch (err) {
            console.error('Error updating client:', err);
            res.status(500).json({ error: 'Failed to update client' });
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

    return router;
};