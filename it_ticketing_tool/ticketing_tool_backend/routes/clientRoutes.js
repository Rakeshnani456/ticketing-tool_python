// routes/clientRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, clientsCollection, usersCollection) => {

    // GET /api/clients - Get all clients
    router.get('/', async (req, res) => {
        try {
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

    // POST /api/clients - Add a new client
    router.post('/', async (req, res) => {
        try {
            const {
                companyName,
                website,
                location,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactNumber,
                siteDesignation
            } = req.body;
            const newClient = {
                companyName,
                website,
                location,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactNumber,
                siteDesignation
            };
            const docRef = await clientsCollection.add(newClient);
            res.status(201).json({ id: docRef.id, ...newClient });
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
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
                siteContactNumber,
                siteDesignation
            } = req.body;
            const updateData = {
                companyName,
                website,
                location,
                clientContactNumber,
                authFirstName,
                authLastName,
                authContactNumber,
                authOfficeEmail,
                authPersonalEmail,
                authDesignation,
                siteFirstName,
                siteLastName,
                siteEmail,
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