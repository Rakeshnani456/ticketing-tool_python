const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/**
 * Advanced search endpoint that searches tickets only
 * GET /api/search?q=query&limit=10
 * Role-based filtering:
 * - super_admin/engineer: All tickets (including resolved/cancelled)
 * - site_admin: Tickets from his client + his own tickets
 * - user: Only his own tickets
 */
module.exports = (authenticateToken) => {
    router.get('/', authenticateToken, async (req, res) => {
        try {
            const { q: query, limit = 10 } = req.query;
            
            if (!query || query.trim().length < 2) {
                return res.json({ results: [] });
            }

            const searchTerm = query.trim().toLowerCase();
            const results = [];
            const userRole = req.user.role;
            const userId = req.user.uid;
            const userClientName = req.user.client_name;
            
            // Determine search context for better filtering
            const isEmailSearch = searchTerm.includes('@');
            const isTicketIdSearch = searchTerm.startsWith('tt') || searchTerm.match(/^tt\d+/i) || searchTerm.match(/^inc\d+/i);

            // Build tickets query based on user role
            let ticketsQuery = admin.firestore().collection('tickets');
            
            // Apply role-based filtering
            if (userRole === 'user') {
                // Regular user: only their own tickets
                ticketsQuery = ticketsQuery.where('reporter_id', '==', userId);
            } else if (userRole === 'site_admin') {
                if (userClientName) {
                    // Site admin: tickets from their client (includes tickets from all users in the client)
                    ticketsQuery = ticketsQuery.where('client_name', '==', userClientName);
                } else {
                    // Site admin without client_name: return empty results (should not happen in production)
                    return res.json({ results: [], total: 0, query: searchTerm });
                }
            } else if (userRole === 'super_admin' || ['engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'].includes(userRole)) {
                // Super admin and engineers: all tickets (no filtering, includes resolved/cancelled)
                // No query filter needed - will get all tickets
            }
            // For other roles (support, admin), show all tickets as well
            
            // Optimize query: reduce limit and use more efficient approach
            // For ticket ID searches, we can be more specific
            const requestLimit = parseInt(limit) || 10;
            const fetchLimit = Math.min(requestLimit * 3, 50); // Fetch 3x results for filtering, max 50
            
            // Order and limit - reduced from 100 to improve performance
            ticketsQuery = ticketsQuery.orderBy('created_at', 'desc').limit(fetchLimit);
            
            const ticketsSnapshot = await ticketsQuery.get();

            // Helper function to create result object
            const createResult = (ticket) => {
                return {
                    id: ticket.id,
                    type: 'ticket',
                    title: ticket.display_id || `Ticket ${ticket.id}`,
                    description: ticket.short_description || 'No description',
                    meta: {
                        status: ticket.status,
                        priority: ticket.priority,
                        date: ticket.created_at ? (ticket.created_at.toDate ? ticket.created_at.toDate().toLocaleDateString() : new Date(ticket.created_at.seconds * 1000).toLocaleDateString()) : 'Unknown',
                        assignedTo: ticket.assigned_to_email,
                        reporter: ticket.reporter_email
                    },
                    url: `/tickets/${ticket.id}`
                };
            };

            // For ticket ID searches, prioritize exact matches and exit early
            if (isTicketIdSearch) {
                const docs = ticketsSnapshot.docs;
                for (let i = 0; i < docs.length; i++) {
                    const doc = docs[i];
                    const ticket = { id: doc.id, ...doc.data() };
                    const matchesDisplayId = ticket.display_id && ticket.display_id.toLowerCase().includes(searchTerm);
                    
                    if (matchesDisplayId) {
                        results.push(createResult(ticket));
                        // For ticket ID searches, we can exit early once we have enough exact matches
                        if (results.length >= requestLimit) {
                            break;
                        }
                    }
                }
                
                // Sort and limit early for ticket ID searches
                results.sort((a, b) => {
                    const aTitle = a.title.toLowerCase();
                    const bTitle = b.title.toLowerCase();
                    if (aTitle === searchTerm && bTitle !== searchTerm) return -1;
                    if (bTitle === searchTerm && aTitle !== searchTerm) return 1;
                    if (aTitle.startsWith(searchTerm) && !bTitle.startsWith(searchTerm)) return -1;
                    if (bTitle.startsWith(searchTerm) && !aTitle.startsWith(searchTerm)) return 1;
                    return 0;
                });
                
                const limitedResults = results.slice(0, requestLimit);
                return res.json({ 
                    results: limitedResults,
                    total: results.length,
                    query: searchTerm
                });
            }

            // For general searches, process tickets more efficiently
            const docs = ticketsSnapshot.docs;
            for (let i = 0; i < docs.length; i++) {
                // Early exit if we have enough results (with some buffer)
                if (results.length >= requestLimit * 2) {
                    break;
                }
                
                const doc = docs[i];
                const ticket = { id: doc.id, ...doc.data() };
                
                // More precise matching - prioritize ticket-specific fields
                const matchesDisplayId = ticket.display_id && ticket.display_id.toLowerCase().includes(searchTerm);
                const matchesDescription = ticket.short_description && ticket.short_description.toLowerCase().includes(searchTerm);
                const matchesCategory = ticket.category && ticket.category.toLowerCase().includes(searchTerm);
                const matchesPriority = ticket.priority && ticket.priority.toLowerCase().includes(searchTerm);
                const matchesStatus = ticket.status && ticket.status.toLowerCase().includes(searchTerm);
                
                // Only include email matches if the search term looks like an email
                const matchesReporter = isEmailSearch && ticket.reporter_email && ticket.reporter_email.toLowerCase().includes(searchTerm);
                const matchesAssigned = isEmailSearch && ticket.assigned_to_email && ticket.assigned_to_email.toLowerCase().includes(searchTerm);

                // Match on any ticket field
                if (matchesDisplayId || matchesDescription || matchesCategory || matchesPriority || matchesStatus || matchesReporter || matchesAssigned) {
                    results.push(createResult(ticket));
                }
            }

            // Sort results by relevance (exact matches first, then partial matches)
            results.sort((a, b) => {
                const aTitle = a.title.toLowerCase();
                const bTitle = b.title.toLowerCase();
                
                // Exact match in title gets highest priority
                if (aTitle === searchTerm && bTitle !== searchTerm) return -1;
                if (bTitle === searchTerm && aTitle !== searchTerm) return 1;
                
                // Starts with search term gets second priority
                if (aTitle.startsWith(searchTerm) && !bTitle.startsWith(searchTerm)) return -1;
                if (bTitle.startsWith(searchTerm) && !aTitle.startsWith(searchTerm)) return 1;
                
                return 0;
            });

            // Limit results to requested amount
            const limitedResults = results.slice(0, requestLimit);

            res.json({ 
                results: limitedResults,
                total: results.length,
                query: searchTerm
            });

        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ 
                error: 'Search failed', 
                message: error.message 
            });
        }
    });

    /**
     * Get search suggestions based on popular searches
     * GET /api/search/suggestions
     */
    router.get('/suggestions', authenticateToken, async (req, res) => {
        try {
            const suggestions = [
                'Open tickets',
                'High priority tickets',
                'Recent tickets',
                'Resolved tickets',
                'Cancelled tickets'
            ];

            res.json({ suggestions });
        } catch (error) {
            console.error('Suggestions error:', error);
            res.status(500).json({ 
                error: 'Failed to get suggestions', 
                message: error.message 
            });
        }
    });

    return router;
};
