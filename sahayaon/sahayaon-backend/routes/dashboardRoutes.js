// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, ticketsCollection, clientsCollection, usersCollection, requireSuperAdmin) => {

    // @route   GET /dashboard/clients-count
    // @desc    Get total number of clients
    // @access  Super Admin only
    router.get('/clients-count', requireSuperAdmin, async (req, res) => {
        try {
            // OPTIMIZED: Use count() instead of reading all documents
            const clientsCount = await clientsCollection.count().get();
            return res.status(200).json({ total_clients: clientsCount.data().count });
        } catch (error) {
            console.error('Error fetching clients count:', error);
            return res.status(500).json({ error: 'Failed to fetch clients count.' });
        }
    });

    // @route   GET /dashboard/active-users-count
    // @desc    Get total number of active users
    // @access  Super Admin only
    router.get('/active-users-count', requireSuperAdmin, async (req, res) => {
        try {
            // OPTIMIZED: Use count() instead of reading all documents
            const activeUsersCount = await usersCollection.where('active', '==', true).count().get();
            return res.status(200).json({ active_users: activeUsersCount.data().count });
        } catch (error) {
            console.error('Error fetching active users count:', error);
            return res.status(500).json({ error: 'Failed to fetch active users count.' });
        }
    });

    // @route   GET /dashboard/top-clients
    // @desc    Get top 5 clients by ticket load
    // @access  Super Admin only
    router.get('/top-clients', requireSuperAdmin, async (req, res) => {
        try {
            // OPTIMIZED: Add limit to prevent reading all tickets
            const ticketsSnapshot = await ticketsCollection.limit(1000).get();
            const clientTicketCounts = {};
            ticketsSnapshot.forEach(doc => {
                const data = doc.data();
                const clientId = data.client_id; // Assuming client_id is present on tickets
                if (clientId) {
                    clientTicketCounts[clientId] = (clientTicketCounts[clientId] || 0) + 1;
                }
            });
            const sortedClients = Object.entries(clientTicketCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([clientId, count]) => ({ clientId, ticketCount: count }));
            return res.status(200).json({ top_clients: sortedClients });
        } catch (error) {
            console.error('Error fetching top clients:', error);
            return res.status(500).json({ error: 'Failed to fetch top clients.' });
        }
    });

    return router;
};