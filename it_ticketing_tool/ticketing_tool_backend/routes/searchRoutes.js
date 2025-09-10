const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

/**
 * Advanced search endpoint that searches across tickets, users, and knowledge base
 * GET /api/search?q=query&limit=10&type=all
 */
router.get('/', async (req, res) => {
    try {
        const { q: query, limit = 10, type = 'all' } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.json({ results: [] });
        }

        const searchTerm = query.trim().toLowerCase();
        const results = [];
        
        // Determine search context for better filtering
        const isEmailSearch = searchTerm.includes('@');
        const isTicketIdSearch = searchTerm.startsWith('tt') || searchTerm.match(/^tt\d+/i);
        const isUserRoleSearch = ['admin', 'user', 'support', 'super_admin', 'site_admin'].includes(searchTerm);

        // Search tickets
        if (type === 'all' || type === 'ticket') {
            const ticketsSnapshot = await admin.firestore()
                .collection('tickets')
                .orderBy('created_at', 'desc')
                .limit(100)
                .get();

            ticketsSnapshot.forEach(doc => {
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
                
                // If it's a ticket ID search, only match display IDs
                if (isTicketIdSearch) {
                    if (matchesDisplayId) {
                        results.push({
                            id: ticket.id,
                            type: 'ticket',
                            title: ticket.display_id || `Ticket ${ticket.id}`,
                            description: ticket.short_description || 'No description',
                            meta: {
                                status: ticket.status,
                                priority: ticket.priority,
                                date: ticket.created_at ? new Date(ticket.created_at.seconds * 1000).toLocaleDateString() : 'Unknown',
                                assignedTo: ticket.assigned_to_email,
                                reporter: ticket.reporter_email
                            },
                            url: `/tickets/${ticket.id}`
                        });
                    }
                    return; // Skip other matches for ticket ID searches
                }

                if (matchesDisplayId || matchesDescription || matchesCategory || matchesPriority || matchesStatus || matchesReporter || matchesAssigned) {
                    results.push({
                        id: ticket.id,
                        type: 'ticket',
                        title: ticket.display_id || `Ticket ${ticket.id}`,
                        description: ticket.short_description || 'No description',
                        meta: {
                            status: ticket.status,
                            priority: ticket.priority,
                            date: ticket.created_at ? new Date(ticket.created_at.seconds * 1000).toLocaleDateString() : 'Unknown',
                            assignedTo: ticket.assigned_to_email,
                            reporter: ticket.reporter_email
                        },
                        url: `/tickets/${ticket.id}`
                    });
                }
            });
        }

        // Search users
        if (type === 'all' || type === 'user') {
            const usersSnapshot = await admin.firestore()
                .collection('users')
                .limit(50)
                .get();

            usersSnapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() };
                
                // More precise matching for users - prioritize user-specific fields
                const matchesEmail = user.email && user.email.toLowerCase().includes(searchTerm);
                const matchesDisplayName = user.displayName && user.displayName.toLowerCase().includes(searchTerm);
                const matchesRole = user.role && user.role.toLowerCase().includes(searchTerm);
                const matchesDepartment = user.department && user.department.toLowerCase().includes(searchTerm);
                
                // If it's an email search, prioritize email matches
                if (isEmailSearch) {
                    if (matchesEmail) {
                        results.push({
                            id: user.id,
                            type: 'user',
                            title: user.displayName || user.email,
                            description: `${user.role} • ${user.department || 'No department'}`,
                            meta: {
                                email: user.email,
                                role: user.role,
                                department: user.department
                            },
                            url: `/profile/${user.id}`
                        });
                    }
                    return; // Skip other matches for email searches
                }
                
                // If it's a role search, prioritize role matches
                if (isUserRoleSearch) {
                    if (matchesRole) {
                        results.push({
                            id: user.id,
                            type: 'user',
                            title: user.displayName || user.email,
                            description: `${user.role} • ${user.department || 'No department'}`,
                            meta: {
                                email: user.email,
                                role: user.role,
                                department: user.department
                            },
                            url: `/profile/${user.id}`
                        });
                    }
                    return; // Skip other matches for role searches
                }
                
                // Only include if it's a clear user match
                const isUserMatch = matchesEmail || matchesDisplayName || matchesRole || matchesDepartment;

                if (isUserMatch) {
                    results.push({
                        id: user.id,
                        type: 'user',
                        title: user.displayName || user.email,
                        description: `${user.role} • ${user.department || 'No department'}`,
                        meta: {
                            email: user.email,
                            role: user.role,
                            department: user.department
                        },
                        url: `/profile/${user.id}`
                    });
                }
            });
        }

        // Search knowledge base
        if (type === 'all' || type === 'knowledge') {
            const kbSnapshot = await admin.firestore()
                .collection('knowledge_base')
                .limit(50)
                .get();

            kbSnapshot.forEach(doc => {
                const kb = { id: doc.id, ...doc.data() };
                
                // More precise matching for knowledge base
                const matchesTitle = kb.title && kb.title.toLowerCase().includes(searchTerm);
                const matchesContent = kb.content && kb.content.toLowerCase().includes(searchTerm);
                const matchesCategory = kb.category && kb.category.toLowerCase().includes(searchTerm);
                const matchesTags = kb.tags && kb.tags.some(tag => tag.toLowerCase().includes(searchTerm));

                if (matchesTitle || matchesContent || matchesCategory || matchesTags) {
                    results.push({
                        id: kb.id,
                        type: 'knowledge',
                        title: kb.title || 'Untitled',
                        description: kb.content ? kb.content.substring(0, 100) + '...' : 'No content',
                        meta: {
                            category: kb.category,
                            tags: kb.tags,
                            date: kb.created_at ? new Date(kb.created_at.seconds * 1000).toLocaleDateString() : 'Unknown'
                        },
                        url: `/knowledge-base/${kb.id}`
                    });
                }
            });
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
            
            // Then by type priority (tickets first, then users, then knowledge)
            const typePriority = { ticket: 0, user: 1, knowledge: 2 };
            return typePriority[a.type] - typePriority[b.type];
        });

        // Limit results
        const limitedResults = results.slice(0, parseInt(limit));

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
router.get('/suggestions', async (req, res) => {
    try {
        const suggestions = [
            'Open tickets',
            'My assigned tickets',
            'High priority tickets',
            'Recent tickets',
            'Closed tickets',
            'User management',
            'Knowledge base',
            'System settings'
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

module.exports = router;
