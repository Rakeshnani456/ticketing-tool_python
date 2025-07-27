// routes/clientRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (supabase) => {

    // GET /api/clients - Get all clients
    router.get('/', async (req, res) => {
        try {
            const { data: clients, error } = await supabase
                .from('clients')
                .select('*');

            if (error) throw error;

            const formattedClients = clients.map(client => ({
                id: client.id,
                companyName: client.companyName || '',
                website: client.website || '',
                location: client.location || '',
                clientContactNumber: client.clientContactNumber || '',
                authFirstName: client.authFirstName || '',
                authLastName: client.authLastName || '',
                authContactNumber: client.authContactNumber || '',
                authOfficeEmail: client.authOfficeEmail || '',
                authPersonalEmail: client.authPersonalEmail || '',
                authDesignation: client.authDesignation || '',
                siteFirstName: client.siteFirstName || '',
                siteLastName: client.siteLastName || '',
                siteEmail: client.siteEmail || '',
                siteContactNumber: client.siteContactNumber || '',
                siteDesignation: client.siteDesignation || ''
            }));

            res.json(formattedClients);
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

            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .insert([newClient])
                .select()
                .single();

            if (clientError) throw clientError;

            // --- Automatically create a user for the site admin ---
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

            try {
                // Create user in Supabase Auth
                const { data: userRecord, error: authError } = await supabase.auth.admin.createUser({ 
                    email: userData.email, 
                    password: userData.password 
                });

                if (authError) throw authError;

                // Create user profile in database
                const { error: userError } = await supabase
                    .from('users')
                    .insert({
                        id: userRecord.user.id,
                        client_name: userData.client_name,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                        contactNumber: userData.contactNumber,
                        designation: userData.designation,
                        role: userData.role,
                        managerEmail: userData.managerEmail,
                        employmentType: userData.employmentType,
                        mustChangePassword: userData.mustChangePassword
                    });

                if (userError) throw userError;

                res.status(201).json({ 
                    message: 'Client and site admin created successfully', 
                    clientId: clientData.id,
                    userId: userRecord.user.id 
                });
            } catch (userCreationError) {
                // If user creation fails, we should clean up the client
                await supabase.from('clients').delete().eq('id', clientData.id);
                throw userCreationError;
            }
        } catch (err) {
            console.error('Error creating client:', err);
            res.status(500).json({ error: 'Failed to create client' });
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
            await supabase.from('clients').update(updateData).eq('id', id);
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
            await supabase.from('clients').delete().eq('id', id);
            res.status(200).json({ message: 'Client deleted successfully.' });
        } catch (err) {
            console.error('Error deleting client:', err);
            res.status(500).json({ error: 'Failed to delete client' });
        }
    });

    return router;
};