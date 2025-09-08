// routes/ticketRoutes.supabase.js
const express = require('express');
const router = express.Router();
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = (supabase, verifySupabaseToken, checkRole, jsonSerializableTicket, generateDisplayId, emailService) => {

    const validTicketCategories = ['software', 'hardware', 'troubleshoot'];
    const validTicketPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const validTicketStatuses = ['Open', 'In Progress', 'Hold', 'Resolved', 'Cancelled'];

    // Function to trigger analytics updates when tickets change
    const triggerAnalyticsUpdate = async (action, ticketData) => {
        try {
            if (global.broadcastAnalyticsUpdate) {
                global.broadcastAnalyticsUpdate({
                    type: 'ticket_update',
                    action: action,
                    data: ticketData,
                    timestamp: new Date().toISOString()
                });
                console.log(`Analytics update triggered for ticket ${action}:`, ticketData.id || ticketData.display_id);
            }
        } catch (error) {
            console.error('Error triggering analytics update:', error);
        }
    };

    // --- New Endpoint: Get Ticket Summary Counts ---
    router.get('/summary-counts', verifySupabaseToken, async (req, res) => {
        const authenticatedUid = req.user.uid;

        try {
            const [activeResult, assignedResult, totalResult] = await Promise.all([
                supabase
                    .from('tickets')
                    .select('id', { count: 'exact' })
                    .in('status', ['Open', 'In Progress', 'Hold']),
                supabase
                    .from('tickets')
                    .select('id', { count: 'exact' })
                    .eq('assigned_to_id', authenticatedUid),
                supabase
                    .from('tickets')
                    .select('id', { count: 'exact' })
            ]);

            const counts = {
                active_tickets: activeResult.count || 0,
                assigned_to_me: assignedResult.count || 0,
                total_tickets: totalResult.count || 0,
            };

            return res.status(200).json(counts);

        } catch (error) {
            console.error(`Error fetching summary counts: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch summary counts: ${error.message}` });
        }
    });

    // --- NEW ENDPOINT: Get Ticket Status Summary ---
    router.get('/status-summary', verifySupabaseToken, async (req, res) => {
        try {
            const { data: tickets, error } = await supabase
                .from('tickets')
                .select('status');

            if (error) throw error;

            const statusCounts = {};
            validTicketStatuses.forEach(status => {
                statusCounts[status] = 0;
            });

            tickets.forEach(ticket => {
                const status = ticket.status;
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else {
                    console.warn(`Ticket has an unrecognized status: ${status}.`);
                }
            });

            return res.status(200).json(statusCounts);
        } catch (error) {
            console.error(`Error fetching ticket status summary: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch ticket status summary: ${error.message}` });
        }
    });

    // --- New Route: Create a new ticket ---
    router.post('/', verifySupabaseToken, async (req, res) => {
        const {
            request_for_email,
            category,
            short_description,
            long_description = '',
            contact_number,
            priority,
            hostname_asset_id,
            attachments = []
        } = req.body;

        const reporterId = req.user.uid;
        const reporterEmail = req.user.email;

        if (!request_for_email || !category || !short_description || !contact_number || !hostname_asset_id) {
            return res.status(400).json({ error: 'Missing mandatory ticket fields.' });
        }

        if (short_description.length > 250) {
            return res.status(400).json({ error: 'Short description exceeds 250 character limit.' });
        }
        if (!validTicketCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category specified.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request_for_email)) {
            return res.status(400).json({ error: 'Invalid email format for "Request for".' });
        }

        try {
            // Look up client_name for reporter_email and request_for_email
            let clientName = null;
            
            // Try reporter_email first
            let { data: userData } = await supabase
                .from('users')
                .select('client_name, company_name, role')
                .eq('email', reporterEmail)
                .limit(1)
                .single();

            if (userData) {
                clientName = userData.client_name || null;
                console.log("Found user by reporter_email:", {
                    email: reporterEmail,
                    client_name: userData.client_name,
                    companyName: userData.company_name,
                    role: userData.role
                });
            } else {
                // Try request_for_email
                const { data: requestUserData } = await supabase
                    .from('users')
                    .select('client_name, company_name, role')
                    .eq('email', request_for_email)
                    .limit(1)
                    .single();

                if (requestUserData) {
                    clientName = requestUserData.client_name || null;
                    console.log("Found user by request_for_email:", {
                        email: request_for_email,
                        client_name: requestUserData.client_name,
                        companyName: requestUserData.company_name,
                        role: requestUserData.role
                    });
                } else {
                    console.warn("No user found for either reporter_email or request_for_email:", {
                        reporterEmail,
                        request_for_email
                    });
                }
            }

            console.log("Final client_name for ticket:", clientName);

            const newDisplayId = await generateDisplayId();

            // Get user data for storing name information
            const { data: userDoc } = await supabase
                .from('users')
                .select('*')
                .eq('id', reporterId)
                .single();

            const reporterUserData = userDoc || {};
            let reporterName = reporterEmail;
            if (reporterUserData.first_name || reporterUserData.last_name) {
                reporterName = `${reporterUserData.first_name || ''} ${reporterUserData.last_name || ''}`.trim();
            } else if (reporterUserData.name) {
                reporterName = reporterUserData.name;
            } else if (reporterUserData.client_name) {
                reporterName = reporterUserData.client_name;
            }

            const newTicket = {
                display_id: newDisplayId,
                reporter_id: reporterId,
                reporter_email: reporterEmail,
                reporter_name: reporterName,
                reporter_first_name: reporterUserData.first_name || null,
                reporter_last_name: reporterUserData.last_name || null,
                request_for_email: request_for_email,
                category: category,
                short_description: short_description,
                long_description: long_description,
                contact_number: contact_number,
                priority: priority || 'Low',
                hostname_asset_id: hostname_asset_id,
                status: 'Open',
                assigned_to_id: null,
                assigned_to_email: null,
                resolved_at: null,
                time_spent_minutes: null,
                closure_notes: null,
                client_name: clientName,
            };

            const { data: ticketData, error: insertError } = await supabase
                .from('tickets')
                .insert(newTicket)
                .select()
                .single();

            if (insertError) throw insertError;

            // Handle attachments if any
            if (attachments && attachments.length > 0) {
                try {
                    const attachmentRecords = attachments.map(attachment => ({
                        ticket_id: ticketData.id,
                        original_filename: attachment.fileName || 'unknown',
                        file_url: attachment.url || '',
                        file_size: attachment.fileSize || null,
                        file_type: attachment.fileType || null,
                        uploaded_by_id: reporterId,
                        uploaded_by_email: reporterEmail
                    }));

                    const { error: attachmentError } = await supabase
                        .from('ticket_attachments')
                        .insert(attachmentRecords);

                    if (attachmentError) {
                        console.error('Error inserting attachments:', attachmentError);
                        // Don't fail the ticket creation if attachments fail
                    }
                } catch (attachmentError) {
                    console.error('Error processing attachments:', attachmentError);
                    // Don't fail the ticket creation if attachments fail
                }
            }

            // Log ticket creation activity
            await supabase
                .from('activities')
                .insert({
                    user_id: reporterId,
                    user_email: reporterEmail,
                    user_name: reporterName,
                    action: 'ticket_created',
                    resource_type: 'ticket',
                    resource_id: ticketData.id,
                    details: {
                        ticket_display_id: newDisplayId,
                        client_name: clientName,
                        category: category,
                        priority: priority || 'Low'
                    }
                });

            const reporterUserRole = req.user.role;
            if (reporterUserRole === 'user') {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: reporterId,
                        message: `Your ticket ${newDisplayId} - "${short_description}" has been created.`,
                        type: 'ticket_created',
                        read: false,
                        ticket_id: ticketData.id
                    });
            }

            // Send email notification
            setImmediate(async () => {
                try {
                    const baseUrl = getBaseUrl(req);
                    const ticketUrl = `${baseUrl}/tickets/${ticketData.id}`;
                    
                    const emailData = {
                        ticketId: newDisplayId,
                        subject: short_description,
                        description: long_description || short_description,
                        priority: priority || 'Low',
                        category: category,
                        reporterName: reporterEmail,
                        ticketUrl: ticketUrl,
                        toEmail: 'tt.support@kriasol.com',
                        ccEmail: request_for_email === reporterEmail ? request_for_email : `${request_for_email},${reporterEmail}`
                    };
                    
                    await emailService.sendTicketNotificationEmail(emailData);
                } catch (error) {
                    console.error('Error sending ticket notification email:', error);
                }
            });

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('created', { ...ticketData });

            return res.status(201).json({ message: 'Ticket created successfully!', id: ticketData.id, display_id: newDisplayId });
        } catch (error) {
            console.error(`Error creating ticket: ${error.message}`);
            return res.status(500).json({ error: `Error creating ticket: ${error.message}` });
        }
    });

    // Helper to get the base URL for links in emails
    function getBaseUrl(req) {
        if (req.headers.origin) {
            return req.headers.origin;
        }
        const protocol = req.protocol || 'https';
        const host = req.get ? req.get('host') : null;
        if (host) {
            return `${protocol}://${host}`;
        }
        return 'https://ticketing.kriasol.com';
    }

    // --- Get Ticket by ID ---
    // @route   GET /:ticket_id
    // @desc    Get a specific ticket by ID
    // @access  Private (requires token)
    router.get('/:ticket_id', verifySupabaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        try {
            let { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            // If not found by ID, try to find by display_id
            if (ticketError && ticketId.startsWith('TT')) {
                const { data: ticketByDisplayId, error: displayIdError } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('display_id', ticketId)
                    .single();
                
                if (!displayIdError && ticketByDisplayId) {
                    ticketData = ticketByDisplayId;
                    ticketError = null;
                }
            }

            if (ticketError || !ticketData) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            // For site admin users, check if they can access this ticket based on company
            if (authenticatedUserRole === 'site_admin') {
                if (req.user.client_name && ticketData.client_name !== req.user.client_name) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to view tickets from other companies.' });
                }
            } else if (ticketData.reporter_id !== authenticatedUid && !['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket.' });
            }

            return res.status(200).json(ticketData);
        } catch (error) {
            console.error(`Error fetching ticket ${ticketId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch ticket: ${error.message}` });
        }
    });

    // --- Update Ticket ---
    // @route   PATCH /:ticket_id
    // @desc    Update a ticket
    // @access  Private (requires token)
    router.patch('/:ticket_id', verifySupabaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const updates = req.body;

        try {
            // Check if ticket exists
            const { data: existingTicket, error: fetchError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (fetchError || !existingTicket) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            // Update the ticket
            const { data: updatedTicket, error: updateError } = await supabase
                .from('tickets')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ticketId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Trigger analytics update
            await triggerAnalyticsUpdate('updated', { ...updatedTicket, id: ticketId });

            return res.status(200).json(updatedTicket);
        } catch (error) {
            console.error(`Error updating ticket ${ticketId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to update ticket: ${error.message}` });
        }
    });

    // --- Add Comment to Ticket ---
    // @route   POST /:ticket_id/add_comment
    // @desc    Add a comment to a ticket
    // @access  Private (requires token)
    router.post('/:ticket_id/add_comment', verifySupabaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const { comment_text, commenter_name = req.user.email } = req.body;

        if (!comment_text) {
            return res.status(400).json({ error: 'Comment text cannot be empty!' });
        }

        try {
            // Check if ticket exists
            const { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (ticketError || !ticketData) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            // Check if ticket is resolved or cancelled
            if (['Resolved', 'Cancelled'].includes(ticketData.status)) {
                return res.status(403).json({ error: 'Cannot add comments to a resolved or cancelled ticket.' });
            }

            // Add comment to ticket_comments table
            const { data: commentData, error: commentError } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: ticketId,
                    comment_text: comment_text,
                    commenter_name: commenter_name,
                    commenter_id: req.user.uid
                })
                .select()
                .single();

            if (commentError) throw commentError;

            // Update ticket's updated_at timestamp
            const { error: updateError } = await supabase
                .from('tickets')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (updateError) throw updateError;

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, id: ticketId });

            // Create notification for ticket reporter if commenter is different
            if (req.user.uid !== ticketData.reporter_id) {
                const { error: notificationError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: ticketData.reporter_id,
                        message: `New comment on your ticket ${ticketData.display_id} by ${commenter_name}.`,
                        type: 'new_comment_on_my_ticket',
                        read: false,
                        ticket_id: ticketId
                    });

                if (notificationError) {
                    console.error('Error creating notification:', notificationError);
                }
            }

            // Create notification for assigned user if different from commenter
            if (ticketData.assigned_to_id && req.user.uid !== ticketData.assigned_to_id) {
                const { error: notificationError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: ticketData.assigned_to_id,
                        message: `New comment on assigned ticket ${ticketData.display_id} by ${commenter_name}.`,
                        type: 'new_comment_on_assigned_ticket',
                        read: false,
                        ticket_id: ticketId
                    });

                if (notificationError) {
                    console.error('Error creating notification:', notificationError);
                }
            }

            console.log(`Comment added to ticket ${ticketId} by ${commenter_name}`);
            return res.status(200).json({ message: 'Comment added successfully!' });

        } catch (error) {
            console.error(`Error adding comment: ${error.message}`);
            return res.status(500).json({ error: `Error adding comment: ${error.message}` });
        }
    });

    // --- Export Tickets ---
    // @route   GET /export
    // @desc    Export tickets to Excel
    // @access  Private (Admin/Support)
    router.get('/export', verifySupabaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const { start_date, end_date, status, company } = req.query;

        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (start_date) {
                query = query.gte('created_at', start_date);
            }
            if (end_date) {
                query = query.lte('created_at', end_date);
            }
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            if (company && company !== 'all') {
                query = query.eq('client_name', company);
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            // For site admin users, filter by their company
            if (req.user.role === 'site_admin' && req.user.client_name) {
                const filteredTickets = tickets.filter(ticket => ticket.client_name === req.user.client_name);
                return res.status(200).json(filteredTickets);
            }

            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error exporting tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to export tickets: ${error.message}` });
        }
    });

    // --- Get All Tickets ---
    // @route   GET /all
    // @desc    Get all tickets (for support/admin users)
    // @access  Private (Admin/Support)
    router.get('/all', verifySupabaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const { status, assignment, company, keyword, limit = 100 } = req.query;

        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(parseInt(limit));

            // Apply filters
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }
            if (assignment === 'unassigned') {
                query = query.is('assigned_to_email', null);
            } else if (assignment === 'assigned_to_me') {
                query = query.eq('assigned_to_id', req.user.uid);
            }
            if (company && company !== 'all') {
                query = query.eq('client_name', company);
            }
            if (keyword) {
                if (keyword.toUpperCase().startsWith('TICKET-')) {
                    query = query.eq('display_id', keyword.toUpperCase());
                } else {
                    // For general search, we'll filter client-side for better performance
                    query = query.limit(100);
                }
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            let filteredTickets = tickets || [];

            // Apply client-side search keyword filter for general keywords
            if (keyword && !keyword.toUpperCase().startsWith('TICKET-')) {
                const searchTerm = keyword.toLowerCase();
                filteredTickets = filteredTickets.filter(ticket => 
                    ticket.short_description?.toLowerCase().includes(searchTerm) ||
                    ticket.long_description?.toLowerCase().includes(searchTerm) ||
                    ticket.reporter_email?.toLowerCase().includes(searchTerm) ||
                    ticket.display_id?.toLowerCase().includes(searchTerm)
                );
            }

            // For site admin users, filter by their company
            if (req.user.role === 'site_admin' && req.user.client_name) {
                filteredTickets = filteredTickets.filter(ticket => ticket.client_name === req.user.client_name);
            }

            return res.status(200).json(filteredTickets);
        } catch (error) {
            console.error(`Error fetching all tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch tickets: ${error.message}` });
        }
    });

    // --- Get My Tickets ---
    // @route   GET /my
    // @desc    Get tickets created by the authenticated user
    // @access  Private (requires token)
    router.get('/my', verifySupabaseToken, async (req, res) => {
        const { keyword, status } = req.query;
        const userId = req.user.uid;

        try {
            let query = supabase
                .from('tickets')
                .select('*')
                .eq('reporter_id', userId)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (status && status !== 'all') {
                query = query.eq('status', status);
            } else {
                // Default filter: show active tickets only
                query = query.in('status', ['Open', 'In Progress', 'Hold']);
            }

            // Apply search filter
            if (keyword) {
                if (keyword.toUpperCase().startsWith('TICKET-')) {
                    query = query.eq('display_id', keyword.toUpperCase());
                } else {
                    query = query.limit(100);
                }
            } else {
                query = query.limit(50);
            }

            const { data: tickets, error } = await query;

            if (error) throw error;

            let filteredTickets = tickets || [];

            // Apply client-side search keyword filter for general keywords
            if (keyword && !keyword.toUpperCase().startsWith('TICKET-')) {
                const searchTerm = keyword.toLowerCase();
                filteredTickets = filteredTickets.filter(ticket => 
                    ticket.short_description?.toLowerCase().includes(searchTerm) ||
                    ticket.long_description?.toLowerCase().includes(searchTerm) ||
                    ticket.display_id?.toLowerCase().includes(searchTerm)
                );
            }

            return res.status(200).json(filteredTickets);
        } catch (error) {
            console.error(`Error fetching my tickets for ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch your tickets: ${error.message}` });
        }
    });

    return router;
};
