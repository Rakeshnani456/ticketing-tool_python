// routes/clientRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, checkRole) => {

    // @route   GET /clients
    // @desc    Get all clients
    // @access  Private (Admin/Support)
    router.get('/', verifySupabaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const { data: clients, error } = await supabase
                .from('clients')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            return res.status(200).json(clients);
        } catch (error) {
            console.error(`Error fetching clients: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch clients: ${error.message}` });
        }
    });

    // @route   POST /clients
    // @desc    Create a new client
    // @access  Private (Admin)
    router.post('/', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const { name, contact_email, contact_phone, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Client name is required.' });
        }

        try {
            const { data: client, error } = await supabase
                .from('clients')
                .insert({
                    name,
                    contact_email,
                    contact_phone,
                    address
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({ message: 'Client created successfully', client });
        } catch (error) {
            console.error(`Error creating client: ${error.message}`);
            return res.status(500).json({ error: `Failed to create client: ${error.message}` });
        }
    });

    // @route   PUT /clients/:clientId
    // @desc    Update a client
    // @access  Private (Admin)
    router.put('/:clientId', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const clientId = req.params.clientId;
        const updateData = req.body;

        try {
            const { data: client, error } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', clientId)
                .select()
                .single();

            if (error) throw error;

            return res.status(200).json({ message: 'Client updated successfully', client });
        } catch (error) {
            console.error(`Error updating client ${clientId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to update client: ${error.message}` });
        }
    });

    // @route   DELETE /clients/:clientId
    // @desc    Delete a client
    // @access  Private (Admin)
    router.delete('/:clientId', verifySupabaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        const clientId = req.params.clientId;

        try {
            // Check if client has associated users or tickets
            const [usersResult, ticketsResult] = await Promise.all([
                supabase.from('users').select('id').eq('client_name', clientId).limit(1),
                supabase.from('tickets').select('id').eq('client_name', clientId).limit(1)
            ]);

            if (usersResult.data && usersResult.data.length > 0) {
                return res.status(400).json({ error: 'Cannot delete client with associated users.' });
            }

            if (ticketsResult.data && ticketsResult.data.length > 0) {
                return res.status(400).json({ error: 'Cannot delete client with associated tickets.' });
            }

            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) throw error;

            return res.status(200).json({ message: 'Client deleted successfully' });
        } catch (error) {
            console.error(`Error deleting client ${clientId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to delete client: ${error.message}` });
        }
    });

    return router;
};

