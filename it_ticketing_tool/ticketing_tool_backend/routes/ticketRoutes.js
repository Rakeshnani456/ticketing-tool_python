// routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const Busboy = require('busboy'); // Keep Busboy here as it's specific to file uploads
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { 
    logTicketCreated, 
    logTicketAssigned, 
    logStatusChange, 
    logCommentAdded, 
    logTicketResolved, 
    logAttachmentUploaded,
    logPriorityChange
} = require('../utils/activityLogger');

module.exports = (db, admin, ticketsCollection, usersCollection, notificationsCollection, transporter, verifyFirebaseToken, checkRole, jsonSerializableTicket, jsonSerializableNotification, generateDisplayId, emailService) => {

    const validTicketCategories = ['software', 'hardware', 'troubleshoot'];
    const validTicketPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const validTicketStatuses = ['Open', 'In Progress', 'Hold', 'Resolved', 'Cancelled'];

    // Function to trigger analytics updates when tickets change
    const triggerAnalyticsUpdate = async (action, ticketData) => {
        try {
            if (global.broadcastAnalyticsUpdate) {
                // Trigger real-time analytics update
                global.broadcastAnalyticsUpdate({
                    type: 'ticket_update',
                    action: action, // 'created', 'updated', 'deleted'
                    data: ticketData,
                    timestamp: new Date().toISOString()
                });
                console.log(`Analytics update triggered for ticket ${action}:`, ticketData.id || ticketData.display_id);
            }
        } catch (error) {
            console.error('Error triggering analytics update:', error);
        }
    };

    // --- Helper for generating a simple display ID (if not moved to a shared utility) ---
    // Make sure generateDisplayId is accessible, either passed in or in a utility file
    async function generateDisplayIdInternal() {
        const lastTicketQuery = await ticketsCollection.orderBy('created_at', 'desc').limit(1).get();
        let nextIdNum = 1;
        if (!lastTicketQuery.empty) {
            const lastTicket = lastTicketQuery.docs[0].data();
            const lastDisplayId = lastTicket.display_id;
            if (lastDisplayId && lastDisplayId.startsWith('TT')) {
                const numPart = parseInt(lastDisplayId.substring(2));
                if (!isNaN(numPart)) {
                    nextIdNum = numPart + 1;
                }
            }
        }
        return `TT${String(nextIdNum).padStart(6, '0')}`;
    }

    // --- New Endpoint: Get Ticket Summary Counts ---
    router.get('/summary-counts', verifyFirebaseToken, async (req, res) => {
        const authenticatedUid = req.user.uid;

        try {
            let activeTicketsQuery = ticketsCollection.where('status', 'in', ['Open', 'In Progress', 'Hold']);
            let assignedToMeTicketsQuery = ticketsCollection.where('assigned_to_id', '==', authenticatedUid);
            let totalTicketsQuery = ticketsCollection;

            const [activeSnapshot, assignedSnapshot, totalSnapshot] = await Promise.all([
                activeTicketsQuery.get(),
                assignedToMeTicketsQuery.get(),
                totalTicketsQuery.get()
            ]);

            const counts = {
                active_tickets: activeSnapshot.size,
                assigned_to_me: assignedSnapshot.size,
                total_tickets: totalSnapshot.size,
            };

            return res.status(200).json(counts);

        } catch (error) {
            console.error(`Error fetching summary counts: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch summary counts: ${error.message}` });
        }
    });

    // --- NEW ENDPOINT: Get Ticket Status Summary ---
    router.get('/status-summary', verifyFirebaseToken, async (req, res) => {
        try {
            const snapshot = await ticketsCollection.get();
            const statusCounts = {};

            validTicketStatuses.forEach(status => {
                statusCounts[status] = 0;
            });

            snapshot.forEach(doc => {
                const ticketData = doc.data();
                const status = ticketData.status;
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else {
                    console.warn(`Ticket ${doc.id} has an unrecognized status: ${status}.`);
                }
            });

            return res.status(200).json(statusCounts);
        } catch (error) {
            console.error(`Error fetching ticket status summary: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch ticket status summary: ${error.message}` });
        }
    });

    // --- New Route: Create a new ticket ---
    router.post('/', verifyFirebaseToken, async (req, res) => {
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
            let userSnap = await usersCollection.where('email', '==', reporterEmail).limit(1).get();
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                clientName = userData.client_name || null;
                console.log("Found user by reporter_email:", {
                    email: reporterEmail,
                    client_name: userData.client_name,
                    companyName: userData.companyName,
                    role: userData.role
                });
            } else {
                // Try request_for_email
                userSnap = await usersCollection.where('email', '==', request_for_email).limit(1).get();
                if (!userSnap.empty) {
                    const userData = userSnap.docs[0].data();
                    clientName = userData.client_name || null;
                    console.log("Found user by request_for_email:", {
                        email: request_for_email,
                        client_name: userData.client_name,
                        companyName: userData.companyName,
                        role: userData.role
                    });
                } else {
                    console.warn("No user found for either reporter_email or request_for_email:", {
                        reporterEmail,
                        request_for_email
                    });
                }
            }

            console.log("Final client_name for ticket:", clientName);

            const newDisplayId = await generateDisplayIdInternal();

            // Get user data for storing name information
            const userDoc = await usersCollection.doc(reporterId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            let reporterName = reporterEmail;
            if (userData.firstName || userData.lastName) {
                reporterName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            } else if (userData.name) {
                reporterName = userData.name;
            } else if (userData.client_name) {
                reporterName = userData.client_name;
            }

            const newTicket = {
                display_id: newDisplayId,
                reporter_id: reporterId,
                reporter_email: reporterEmail,
                reporter_name: reporterName,
                reporter_firstName: userData.firstName || null,
                reporter_lastName: userData.lastName || null,
                request_for_email: request_for_email,
                category: category,
                short_description: short_description,
                long_description: long_description,
                contact_number: contact_number,
                priority: priority || 'Low',
                hostname_asset_id: hostname_asset_id,
                status: 'Open',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                comments: [],
                attachments: attachments,
                assigned_to_id: null,
                assigned_to_email: null,
                resolved_at: null,
                time_spent_minutes: null,
                closure_notes: null,
                status_history: [],
                assigned_to_history: [],
                client_name: clientName,
            };

            const docRef = await ticketsCollection.add(newTicket);

            // Log ticket creation activity with enhanced context
            await logTicketCreated(db, docRef.id, reporterName, reporterEmail, { 
                ...newTicket, 
                ticket_display_id: newDisplayId,
                client_name: clientName 
            });

            const reporterUserRole = req.user.role;
            if (reporterUserRole === 'user') {
                await notificationsCollection.add({
                    userId: reporterId,
                    message: `Your ticket ${newDisplayId} - "${short_description}" has been created.`,
                    type: 'ticket_created',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: docRef.id
                });
            }

            // Prepare email content before setImmediate
            const emailSubject = `🔔 New IT Support Ticket Logged – ${newDisplayId}: ${short_description}`;
            const emailText = `Dear Team,\n\nA new IT support request has been logged in the Kriasol Helpdesk. Please review the details below and take appropriate action as needed.\n\nTicket ID: ${newDisplayId}\nIssue Summary: ${short_description}\nCategory: ${category}\nPriority: ${priority || 'Low'}\nRequested For: ${request_for_email}\nRequested By: ${reporterEmail}\nContact Number: ${contact_number}\n\nAccess the Kriasol Helpdesk to view, assign, or update the ticket.\n\nThank you for your prompt attention.\n\nBest regards,\nIT Service Desk\nKriasol Technologies`;
            const baseUrl = getBaseUrl(req);
            const ticketLink = `${baseUrl}/tickets/${docRef.id}`;
            const emailHtml = `
                <div style=\"font-family: Arial, sans-serif; color: #222;\">
                    <p>Dear Team,</p>
                    <p>A new IT support request has been logged in the <strong>Kriasol Helpdesk</strong>. Please review the details below and take appropriate action as needed.</p>
                    <div style=\"margin: 18px 0 10px 0; font-size: 1.1em;\">📌 <strong>Ticket Information</strong></div>
                    <table style=\"border-collapse: collapse; margin: 10px 0 18px 0;\">
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Ticket ID:</td><td style=\"padding: 4px 8px;\"><a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline; font-weight: bold;\" target=\"_blank\">${newDisplayId}</a></td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Issue Summary:</td><td style=\"padding: 4px 8px;\">${short_description}</td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Category:</td><td style=\"padding: 4px 8px;\">${category}</td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Priority:</td><td style=\"padding: 4px 8px;\">${priority || 'Low'}</td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Requested For:</td><td style=\"padding: 4px 8px;\">${request_for_email}</td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Requested By:</td><td style=\"padding: 4px 8px;\">${reporterEmail}</td></tr>
                        <tr><td style=\"padding: 4px 8px; font-weight: bold;\">Contact Number:</td><td style=\"padding: 4px 8px;\">${contact_number}</td></tr>
                    </table>
                    <div style=\"margin: 18px 0 10px 0;\">🔗 <a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline; font-weight: bold;\" target=\"_blank\">Access the Kriasol Helpdesk to view, assign, or update the ticket.</a></div>
                    <p>Thank you for your prompt attention.</p>
                    <p style=\"margin-top: 24px;\">Best regards,<br/>IT Service Desk<br/>Kriasol Technologies</p>
                </div>
            `;
            // Send email with proper To and CC fields
            setImmediate(async () => {
                const toEmail = 'tt.support@kriasol.com';
                let ccList = [];
                
                // Add requested by email and requested for email to CC (if they're different)
                if (request_for_email && reporterEmail) {
                    if (request_for_email === reporterEmail) {
                        ccList.push(request_for_email);
                    } else {
                        ccList.push(request_for_email, reporterEmail);
                    }
                } else if (request_for_email) {
                    ccList.push(request_for_email);
                } else if (reporterEmail) {
                    ccList.push(reporterEmail);
                }
                
                const ccEmail = ccList.length > 0 ? ccList.join(',') : null;
                
                // Use new EmailService instead of old sendEmailAlert
                try {
                    const baseUrl = getBaseUrl(req);
                    const ticketUrl = `${baseUrl}/tickets/${docRef.id}`;
                    
                    const ticketData = {
                        ticketId: newDisplayId,
                        subject: short_description,
                        description: long_description || short_description,
                        priority: priority || 'Low',
                        category: category,
                        reporterName: reporterEmail,
                        ticketUrl: ticketUrl,
                        toEmail: toEmail,
                        ccEmail: ccEmail
                    };
                    
                    await emailService.sendTicketNotificationEmail(ticketData);
                } catch (error) {
                    console.error('Error sending ticket notification email:', error);
                }
            });

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('created', { ...newTicket, id: docRef.id });

            return res.status(201).json({ message: 'Ticket created successfully!', id: docRef.id, display_id: newDisplayId });
        } catch (error) {
            console.error(`Error creating ticket: ${error.message}`);
            return res.status(500).json({ error: `Error creating ticket: ${error.message}` });
        }
    });

    // --- Update an existing ticket ---
    router.patch('/:ticket_id', verifyFirebaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const {
            status,
            assigned_to_email,
            priority,
            short_description,
            long_description,
            contact_number,
            attachments,
            closure_notes,
            time_spent,
            category
        } = req.body;

        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        if (status && !validTicketStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid ticket status provided.' });
        }
        if (priority && !validTicketPriorities.includes(priority)) {
            return res.status(400).json({ error: 'Invalid priority provided.' });
        }
        if (short_description !== undefined && short_description.length > 250) {
            return res.status(400).json({ error: 'Short description exceeds 250 character limit.' });
        }

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }
            const ticketData = ticketDoc.data();

            if (["Resolved", "Cancelled"].includes(ticketData.status) && authenticatedUserRole === "user") {
                return res.status(403).json({ error: "Forbidden: Cannot update a resolved or cancelled ticket as a regular user." });
            }

            // Check if user is either the ticket creator or has appropriate permissions
            const isTicketCreator = ticketData.reporter_id === authenticatedUid;
            const hasEditPermission = ['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole);
            
            if (!isTicketCreator && !hasEditPermission) {
                return res.status(403).json({ error: "Forbidden: Only ticket creators and users with appropriate permissions can edit tickets." });
            }

            // Additional permission checks for specific operations
            // Only users with appropriate permissions can change status, priority, category, and assign tickets
            if (status !== undefined || priority !== undefined || category !== undefined || assigned_to_email !== undefined) {
                if (!hasEditPermission) {
                    return res.status(403).json({ error: "Forbidden: Only users with appropriate permissions can change ticket status, priority, category, or assign tickets." });
                }
            }

            // Only users with appropriate permissions can add closure notes and time spent
            if (closure_notes !== undefined || time_spent !== undefined) {
                if (!hasEditPermission) {
                    return res.status(403).json({ error: "Forbidden: Only users with appropriate permissions can add closure notes or time spent." });
                }
            }

            const updateData = {
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            if (priority !== undefined) updateData.priority = priority;
            if (category !== undefined) updateData.category = category;
            if (short_description !== undefined) updateData.short_description = short_description;
            if (long_description !== undefined) updateData.long_description = long_description;
            if (contact_number !== undefined) updateData.contact_number = contact_number;
            if (closure_notes !== undefined) updateData.closure_notes = closure_notes;
            if (time_spent !== undefined && time_spent !== null && time_spent !== '') {
                const parsedTimeSpent = parseInt(time_spent, 10);
                if (!isNaN(parsedTimeSpent)) {
                    updateData.time_spent = parsedTimeSpent;
                }
            }

            if (attachments !== undefined && Array.isArray(attachments) && attachments.length > 0) {
                const existingAttachments = ticketData.attachments || [];
                const now = new Date().toISOString();
                const attachmentsWithTimestamp = attachments.map(att => ({
                    ...att,
                    added_at: att.added_at || now
                }));
                updateData.attachments = [...existingAttachments, ...attachmentsWithTimestamp];
                
                // Log attachment upload activity with enhanced context
                const userDoc = await usersCollection.doc(authenticatedUid).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                let userName = req.user.email;
                if (userData.firstName || userData.lastName) {
                    userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                } else if (userData.name) {
                    userName = userData.name;
                } else if (userData.client_name) {
                    userName = userData.client_name;
                }
                for (const attachment of attachments) {
                    const filename = attachment.originalFilename || attachment.fileName || attachment.filename || 'Unknown file';
                    const attachmentDetails = {
                        file_size: attachment.size || null,
                        file_type: attachment.mimetype || null,
                        short_description: ticketData.short_description,
                        status: ticketData.status
                    };
                    await logAttachmentUploaded(db, ticketId, userName, filename, req.user.email, { ...attachmentDetails, ticket_display_id: ticketData.display_id });
                }

                // Send attachment upload notification emails
                setImmediate(async () => {
                    try {
                        const baseUrl = getBaseUrl(req);
                        const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                        
                        // Determine recipients based on who performed the action
                        const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole);
                        
                        if (isEngineerAction) {
                            // Engineer action: Notify ticket stakeholders
                            let toList = [];
                            if (ticketData.request_for_email && ticketData.reporter_email) {
                                if (ticketData.request_for_email === ticketData.reporter_email) {
                                    toList.push(ticketData.request_for_email);
                                } else {
                                    toList.push(ticketData.request_for_email, ticketData.reporter_email);
                                }
                            } else if (ticketData.request_for_email) {
                                toList.push(ticketData.request_for_email);
                            } else if (ticketData.reporter_email) {
                                toList.push(ticketData.reporter_email);
                            }
                            
                            let ccList = ['tt.support@kriasol.com'];
                            // Add the engineer who uploaded the attachment
                            ccList.push(req.user.email);
                            if (ticketData.assigned_to_email) {
                                ccList.push(ticketData.assigned_to_email);
                            }
                            
                            // Send email for each attachment
                            for (const attachment of attachments) {
                                const filename = attachment.originalFilename || attachment.fileName || attachment.filename || 'Unknown file';
                                const emailData = {
                                    display_id: ticketData.display_id,
                                    short_description: ticketData.short_description,
                                    fileName: filename,
                                    uploadedBy: userName,
                                    ticketUrl: ticketUrl,
                                    toEmail: toList.join(','),
                                    ccEmail: ccList.join(',')
                                };
                                
                                await emailService.sendAttachmentUploadEmail(emailData);
                            }
                        } else {
                            // Non-engineer action: Notify support team
                            const emailData = {
                                display_id: ticketData.display_id,
                                short_description: ticketData.short_description,
                                fileName: attachments.map(att => att.originalFilename || att.fileName || att.filename || 'Unknown file').join(', '),
                                uploadedBy: userName,
                                ticketUrl: ticketUrl,
                                toEmail: 'tt.support@kriasol.com',
                                ccEmail: req.user.email
                            };
                            
                            await emailService.sendAttachmentUploadEmail(emailData);
                        }
                    } catch (error) {
                        console.error('Error sending attachment upload notification email:', error);
                    }
                });
            }

            // Status change logic
            if (status && status !== ticketData.status) {
                updateData.status = status;
                const statusHistoryEntry = {
                    old_status: ticketData.status,
                    new_status: status,
                    user_email: req.user.email,
                    timestamp: new Date()
                };
                updateData.status_history = admin.firestore.FieldValue.arrayUnion(statusHistoryEntry);
                
                // Log status change activity with enhanced context
                const userDoc = await usersCollection.doc(authenticatedUid).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                let userName = req.user.email;
                if (userData.firstName || userData.lastName) {
                    userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                } else if (userData.name) {
                    userName = userData.name;
                } else if (userData.client_name) {
                    userName = userData.client_name;
                }
                await logStatusChange(db, ticketId, userName, ticketData.status, status, req.user.email, { ...ticketData, ticket_display_id: ticketData.display_id });
                
                // Log resolution activity if status is Resolved
                if (status === 'Resolved') {
                    await logTicketResolved(db, ticketId, userName, req.user.email, { ...ticketData, ticket_display_id: ticketData.display_id });
                }

                // Handle resolved/cancelled specific logic
                if (["Resolved", "Cancelled"].includes(status)) {
                    updateData.resolved_at = admin.firestore.FieldValue.serverTimestamp();
                    updateData.closed_by_email = req.user.email;
                    if ((time_spent === undefined || time_spent === null || time_spent === "") && ticketData.created_at && ticketData.created_at.toDate) {
                        const createdAt = ticketData.created_at.toDate();
                        const resolvedAt = new Date();
                        const timeDiffMillis = resolvedAt.getTime() - createdAt.getTime();
                        const timeSpentMinutes = Math.round(timeDiffMillis / (1000 * 60));
                        updateData.time_spent_minutes = timeSpentMinutes;
                    }
                }

                // Send status change email for all status changes
                const ticketReporterEmail = ticketData.reporter_email;
                const requestForEmail = ticketData.request_for_email;
                const emailSubject = `Ticket ${ticketData.display_id} Status Updated`;
                const emailText = `The status of your ticket (${ticketData.display_id} - ${ticketData.short_description}) has been updated to: ${status}.\n\nAccess the Ticketing Tool for more details.`;
                const baseUrl = getBaseUrl(req);
                const ticketLink = `${baseUrl}/tickets/${ticketId}`;
                const emailHtml = `<div style=\"font-family: Arial, sans-serif; color: #222;\"><p>The status of your ticket (<a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline;\" target=\"_blank\"><strong>${ticketData.display_id}</strong></a> - ${ticketData.short_description}) has been updated to: <strong>${status}</strong>.</p><p>Access the Ticketing Tool for more details.</p></div>`;
                
                // Check if action is performed by engineer
                const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole);
                
                if (isEngineerAction) {
                    // Engineer action: To = request_for_email/reporter_email, CC = tt.support@kriasol.com + assigned engineer
                    let toList = [];
                    if (requestForEmail && ticketReporterEmail) {
                        if (requestForEmail === ticketReporterEmail) {
                            toList.push(requestForEmail);
                        } else {
                            toList.push(requestForEmail, ticketReporterEmail);
                        }
                    } else if (requestForEmail) {
                        toList.push(requestForEmail);
                    } else if (ticketReporterEmail) {
                        toList.push(ticketReporterEmail);
                    }
                    
                    let ccList = ['tt.support@kriasol.com'];
                    if (ticketData.assigned_to_email) {
                        ccList.push(ticketData.assigned_to_email);
                    }
                    
                    setImmediate(async () => {
                        try {
                            const baseUrl = getBaseUrl(req);
                            const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                            
                            const emailData = {
                                display_id: ticketData.display_id,
                                short_description: ticketData.short_description,
                                status: status,
                                ticketUrl: ticketUrl,
                                toEmail: toList.join(','),
                                ccEmail: ccList.join(',')
                            };
                            
                            await emailService.sendTicketStatusUpdateEmail(emailData);
                        } catch (error) {
                            console.error('Error sending ticket status update email:', error);
                        }
                    });
                } else {
                    // Non-engineer action: To = tt.support@kriasol.com + users, CC = none
                    setImmediate(async () => {
                        let toList = ['tt.support@kriasol.com'];
                        
                        // Add user emails to "To" field
                        if (requestForEmail && ticketReporterEmail) {
                            if (requestForEmail === ticketReporterEmail) {
                                toList.push(requestForEmail);
                            } else {
                                toList.push(requestForEmail, ticketReporterEmail);
                            }
                        } else if (requestForEmail) {
                            toList.push(requestForEmail);
                        } else if (ticketReporterEmail) {
                            toList.push(ticketReporterEmail);
                        }
                        
                        const baseUrl = getBaseUrl(req);
                        const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                        
                        const emailData = {
                            display_id: ticketData.display_id,
                            short_description: ticketData.short_description,
                            status: status,
                            ticketUrl: ticketUrl,
                            toEmail: toList.join(','),
                            ccEmail: null
                        };
                        
                        await emailService.sendTicketStatusUpdateEmail(emailData);
                    });
                }
            }

            // Assignment logic - only process if assignment actually changed
            if (assigned_to_email !== undefined && assigned_to_email !== ticketData.assigned_to_email) {
                if (assigned_to_email === null || assigned_to_email === '') {
                    updateData.assigned_to_id = null;
                    updateData.assigned_to_email = null;
                    const assignmentHistoryEntry = {
                        old_assigned_to: ticketData.assigned_to_email,
                        new_assigned_to: null,
                        user_email: req.user.email,
                        timestamp: new Date()
                    };
                    updateData.assigned_to_history = admin.firestore.FieldValue.arrayUnion(assignmentHistoryEntry);
                    if (ticketData.assigned_to_id) {
                        await notificationsCollection.add({
                            userId: ticketData.assigned_to_id,
                            message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been unassigned from you.`,
                            type: 'ticket_unassigned',
                            read: false,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            ticketId: ticketId
                        });
                    }
                } else {
                    const userQuery = await usersCollection.where('email', '==', assigned_to_email).limit(1).get();
                    if (userQuery.empty) {
                        return res.status(404).json({ error: 'Assigned user email not found.' });
                    }
                    const assignedUserDoc = userQuery.docs[0];
                    const assignedUserData = assignedUserDoc.data();
                    
                    // Allow assignment based on user role
                    let canAssign = false;
                    if (authenticatedUserRole === 'site_admin') {
                        // Site admin can assign to support, admin, and site_admin users
                        canAssign = ['support', 'admin', 'site_admin'].includes(assignedUserData.role);
                    } else {
                        // Other users can assign to support, admin, and super_admin users
                        canAssign = ['support', 'admin', 'super_admin'].includes(assignedUserData.role);
                    }
                    
                    if (!canAssign) {
                        if (authenticatedUserRole === 'site_admin') {
                            return res.status(400).json({ error: 'User cannot be assigned as they are not a support associate, admin, or site admin.' });
                        } else {
                            return res.status(400).json({ error: 'User cannot be assigned as they are not a support associate, admin, or super admin.' });
                        }
                    }
                    
                    updateData.assigned_to_id = assignedUserDoc.id;
                    updateData.assigned_to_email = assigned_to_email;

                    const assignmentHistoryEntry = {
                        old_assigned_to: ticketData.assigned_to_email,
                        new_assigned_to: assigned_to_email,
                        user_email: req.user.email,
                        timestamp: new Date()
                    };
                    updateData.assigned_to_history = admin.firestore.FieldValue.arrayUnion(assignmentHistoryEntry);
                    
                    // Log assignment activity with enhanced context
                    const userDoc = await usersCollection.doc(authenticatedUid).get();
                    const userData = userDoc.exists ? userDoc.data() : {};
                    let userName = req.user.email;
                    if (userData.firstName || userData.lastName) {
                        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    } else if (userData.name) {
                        userName = userData.name;
                    } else if (userData.client_name) {
                        userName = userData.client_name;
                    }
                    await logTicketAssigned(db, ticketId, userName, assigned_to_email, req.user.email, { ...ticketData, ticket_display_id: ticketData.display_id });

                    if (assignedUserDoc.id !== authenticatedUid) {
                        await notificationsCollection.add({
                            userId: assignedUserDoc.id,
                            message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been assigned to you.`,
                            type: 'ticket_assigned',
                            read: false,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            ticketId: ticketId
                        });
                    }
                    if (ticketData.assigned_to_id && ticketData.assigned_to_id !== assignedUserDoc.id) {
                        await notificationsCollection.add({
                            userId: ticketData.assigned_to_id,
                            message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been reassigned from you.`,
                            type: 'ticket_reassigned_from',
                            read: false,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                            ticketId: ticketId
                        });
                    }

                    // Send assignment email
                    const reporterEmail = ticketData.reporter_email;
                    const requestForEmail = ticketData.request_for_email;
                    const assignedEngineerEmail = assigned_to_email;
                    const emailSubject = `Ticket ${ticketData.display_id} Assigned`;
                    const emailText = `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been assigned to engineer: ${assignedEngineerEmail}.`;
                    const baseUrl = getBaseUrl(req);
                    const ticketLink = `${baseUrl}/tickets/${ticketId}`;
                    const emailHtml = `<div style=\"font-family: Arial, sans-serif; color: #222;\"><p>Ticket <a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline;\" target=\"_blank\"><strong>${ticketData.display_id}</strong></a> - ${ticketData.short_description} has been assigned to engineer: <strong>${assignedEngineerEmail}</strong>.</p><p>Access the Ticketing Tool for more details.</p></div>`;
                    
                    // Check if action is performed by engineer
                    const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole);
                    
                    if (isEngineerAction) {
                        // Engineer action: To = request_for_email/reporter_email, CC = tt.support@kriasol.com + assigned engineer
                        let toList = [];
                        if (requestForEmail && reporterEmail) {
                            if (requestForEmail === reporterEmail) {
                                toList.push(requestForEmail);
                            } else {
                                toList.push(requestForEmail, reporterEmail);
                            }
                        } else if (requestForEmail) {
                            toList.push(requestForEmail);
                        } else if (reporterEmail) {
                            toList.push(reporterEmail);
                        }
                        
                        let ccList = ['tt.support@kriasol.com'];
                        if (assignedEngineerEmail) {
                            ccList.push(assignedEngineerEmail);
                        }
                        
                        setImmediate(async () => {
                            try {
                                const baseUrl = getBaseUrl(req);
                                const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                                
                                const emailData = {
                                    display_id: ticketData.display_id,
                                    short_description: ticketData.short_description,
                                    assignedEngineerEmail: assignedEngineerEmail,
                                    ticketUrl: ticketUrl,
                                    toEmail: toList.join(','),
                                    ccEmail: ccList.join(',')
                                };
                                
                                await emailService.sendTicketAssignmentEmail(emailData, false); // false = team notification
                            } catch (error) {
                                console.error('Error sending ticket assignment email:', error);
                            }
                        });
                    } else {
                        // Non-engineer action: To = reporter_email, request_for_email; CC = assigned engineer
                        let toList = [];
                        if (reporterEmail) toList.push(reporterEmail);
                        if (requestForEmail && requestForEmail !== reporterEmail) toList.push(requestForEmail);
                        let ccList = assignedEngineerEmail;
                        setImmediate(async () => {
                            try {
                                const baseUrl = getBaseUrl(req);
                                const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                                
                                const emailData = {
                                    display_id: ticketData.display_id,
                                    short_description: ticketData.short_description,
                                    assignedEngineerEmail: assignedEngineerEmail,
                                    ticketUrl: ticketUrl,
                                    toEmail: toList.join(','),
                                    ccEmail: ccList
                                };
                                
                                await emailService.sendTicketAssignmentEmail(emailData, true); // true = user notification
                            } catch (error) {
                                console.error('Error sending ticket assignment email:', error);
                            }
                        });
                    }
                }
            }

            // Priority change
            if (priority && priority !== ticketData.priority) {
                const priorityHistoryEntry = {
                    old_priority: ticketData.priority,
                    new_priority: priority,
                    user_email: req.user.email,
                    timestamp: new Date()
                };
                updateData.priority_history = admin.firestore.FieldValue.arrayUnion(priorityHistoryEntry);
                
                // Log priority change activity with enhanced context
                const userDoc = await usersCollection.doc(authenticatedUid).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                let userName = req.user.email;
                if (userData.firstName || userData.lastName) {
                    userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                } else if (userData.name) {
                    userName = userData.name;
                } else if (userData.client_name) {
                    userName = userData.client_name;
                }
                await logPriorityChange(db, ticketId, userName, ticketData.priority, priority, req.user.email, { ...ticketData, ticket_display_id: ticketData.display_id });
            }

            // Category change
            if (category && category !== ticketData.category) {
                const categoryHistoryEntry = {
                    old_category: ticketData.category,
                    new_category: category,
                    user_email: req.user.email,
                    timestamp: new Date()
                };
                updateData.category_history = admin.firestore.FieldValue.arrayUnion(categoryHistoryEntry);
            }

            await ticketsCollection.doc(ticketId).update(updateData);
            
            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, ...updateData, id: ticketId });
            
            return res.status(200).json({ message: 'Ticket updated successfully!' });
        } catch (error) {
            console.error(`Error updating ticket: ${error.message}`);
            return res.status(500).json({ error: `Error updating ticket: ${error.message}` });
        }
    });

    // NEW API: Cancel a ticket
    router.patch('/:ticket_id/cancel', verifyFirebaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;
        const { closure_notes } = req.body;

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }
            const ticketData = ticketDoc.data();

            if (['Resolved', 'Cancelled'].includes(ticketData.status)) {
                return res.status(400).json({ error: `Ticket is already ${ticketData.status.toLowerCase()}. Cannot cancel.` });
            }

            if (ticketData.reporter_id !== authenticatedUid && !['support', 'admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to cancel this ticket.' });
            }

            const updateData = {
                status: 'Cancelled',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
                resolved_at: admin.firestore.FieldValue.serverTimestamp(),
                closed_by_email: req.user.email,
                assigned_to_id: null,
                assigned_to_email: null,
                closure_notes: closure_notes || null,
            };

            const statusHistoryEntry = {
                old_status: ticketData.status,
                new_status: 'Cancelled',
                user_email: req.user.email,
                timestamp: new Date()
            };
            updateData.status_history = admin.firestore.FieldValue.arrayUnion(statusHistoryEntry);

            if (ticketData.assigned_to_email) {
                const assignmentHistoryEntry = {
                    old_assigned_to: ticketData.assigned_to_email,
                    new_assigned_to: null,
                    user_email: req.user.email,
                    timestamp: new Date()
                };
                updateData.assigned_to_history = admin.firestore.FieldValue.arrayUnion(assignmentHistoryEntry);
            }

            if (ticketData.created_at && ticketData.created_at.toDate) {
                const createdAt = ticketData.created_at.toDate();
                const cancelledAt = new Date();
                const timeDiffMillis = cancelledAt.getTime() - createdAt.getTime();
                const timeSpentMinutes = Math.round(timeDiffMillis / (1000 * 60));
                updateData.time_spent_minutes = timeSpentMinutes;
            }

            await ticketsCollection.doc(ticketId).update(updateData);
            
            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, ...updateData, id: ticketId });

            // Log cancellation activity with enhanced context
            const userDoc = await usersCollection.doc(authenticatedUid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            let userName = req.user.email;
            if (userData.firstName || userData.lastName) {
                userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            } else if (userData.name) {
                userName = userData.name;
            } else if (userData.client_name) {
                userName = userData.client_name;
            }
            const cancellationDetails = {
                short_description: ticketData.short_description,
                cancellation_reason: closure_notes || null
            };
            await logTicketCancelled(db, ticketId, userName, req.user.email, { ...cancellationDetails, ticket_display_id: ticketData.display_id });

            if (ticketData.reporter_id !== authenticatedUid) {
                await notificationsCollection.add({
                    userId: ticketData.reporter_id,
                    message: `Your ticket ${ticketData.display_id} - "${ticketData.short_description}" has been cancelled.`,
                    type: 'ticket_cancelled',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });
            }
            if (ticketData.assigned_to_id && ticketData.assigned_to_id !== authenticatedUid) {
                await notificationsCollection.add({
                    userId: ticketData.assigned_to_id,
                    message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been cancelled.`,
                    type: 'ticket_cancelled_assigned',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });
            }

            // After cancellation, notify the reporter
            const ticketReporterEmail = ticketData.reporter_email;
            const requestForEmail = ticketData.request_for_email;
            const emailSubject = `Ticket ${ticketData.display_id} Cancelled`;
            const emailText = `Your ticket (${ticketData.display_id} - ${ticketData.short_description}) has been cancelled.\n\nAccess the Ticketing Tool for more details.`;
            const baseUrl = getBaseUrl(req);
            const ticketLink = `${baseUrl}/tickets/${ticketId}`;
            const emailHtml = `<div style=\"font-family: Arial, sans-serif; color: #222;\"><p>Your ticket (<a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline;\" target=\"_blank\"><strong>${ticketData.display_id}</strong></a> - ${ticketData.short_description}) has been cancelled.</p><p>Access the Ticketing Tool for more details.</p></div>`;
            setImmediate(async () => {
                let toList = ['tt.support@kriasol.com'];
                
                // Add user emails to "To" field
                if (requestForEmail && ticketReporterEmail) {
                    if (requestForEmail === ticketReporterEmail) {
                        toList.push(requestForEmail);
                    } else {
                        toList.push(requestForEmail, ticketReporterEmail);
                    }
                } else if (requestForEmail) {
                    toList.push(requestForEmail);
                                    } else if (ticketReporterEmail) {
                        toList.push(ticketReporterEmail);
                    }
                    
                    const baseUrl = getBaseUrl(req);
                    const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                    
                    const emailData = {
                        display_id: ticketData.display_id,
                        short_description: ticketData.short_description,
                        ticketUrl: ticketUrl,
                        toEmail: toList.join(','),
                        ccEmail: null
                    };
                    
                    await emailService.sendTicketCancellationEmail(emailData);
            });

            return res.status(200).json({ message: 'Ticket cancelled successfully!', id: ticketId });

        } catch (error) {
            console.error(`Error cancelling ticket ${ticketId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to cancel ticket: ${error.message}` });
        }
    });

    // @route   POST /ticket/:ticket_id/add_comment
    router.post('/:ticket_id/add_comment', verifyFirebaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const { comment_text, commenter_name = req.user.email } = req.body;

        if (!comment_text) {
            return res.status(400).json({ error: 'Comment text cannot be empty!' });
        }

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            const ticketData = ticketDoc.data();
            if (['Resolved', 'Cancelled'].includes(ticketData.status)) {
                return res.status(403).json({ error: 'Cannot add comments to a resolved or cancelled ticket.' });
            }

            const newComment = {
                text: comment_text,
                commenter: commenter_name,
                timestamp: new Date()
            };

            await ticketsCollection.doc(ticketId).update({
                comments: admin.firestore.FieldValue.arrayUnion(newComment),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, id: ticketId });
            
            // Log comment addition activity with enhanced context
            const userDoc = await usersCollection.doc(req.user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            let userName = req.user.email;
            if (userData.firstName || userData.lastName) {
                userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            } else if (userData.name) {
                userName = userData.name;
            } else if (userData.client_name) {
                userName = userData.client_name;
            }
            await logCommentAdded(db, ticketId, userName, req.user.email, comment_text, { ...ticketData, ticket_display_id: ticketData.display_id });

            if (req.user.uid !== ticketData.reporter_id) {
                await notificationsCollection.add({
                    userId: ticketData.reporter_id,
                    message: `New comment on your ticket ${ticketData.display_id} by ${commenter_name}.`,
                    type: 'new_comment_on_my_ticket',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });
            }

            if (ticketData.assigned_to_id && req.user.uid !== ticketData.assigned_to_id) {
                await notificationsCollection.add({
                    userId: ticketData.assigned_to_id,
                    message: `New comment on assigned ticket ${ticketData.display_id} by ${commenter_name}.`,
                    type: 'new_comment_on_assigned_ticket',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });
            }

            const reporterEmail = ticketData.reporter_email;
            const requestForEmail = ticketData.request_for_email;
            const assignedToEmail = ticketData.assigned_to_email;
            const commenterEmail = commenter_name;
            const emailSubject = `New Comment on Ticket ${ticketData.display_id}`;
            const emailText = `A new comment has been added to your ticket (${ticketData.display_id} - ${ticketData.short_description}):\n\n${comment_text}\n\nAccess the Ticketing Tool for more details.`;
            const baseUrl = getBaseUrl(req);
            const ticketLink = `${baseUrl}/tickets/${ticketId}`;
            const emailHtml = `<div style=\"font-family: Arial, sans-serif; color: #222;\"><p>A new comment has been added to your ticket (<a href=\"${ticketLink}\" style=\"color: #2563eb; text-decoration: underline;\" target=\"_blank\"><strong>${ticketData.display_id}</strong></a> - ${ticketData.short_description}):</p><blockquote style=\"margin: 8px 0; padding-left: 12px; border-left: 2px solid #ccc;\">${comment_text}</blockquote><p>Access the Ticketing Tool for more details.</p></div>`;
            
            // Check if action is performed by engineer
            const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role);
            
            if (isEngineerAction) {
                // Engineer action: To = request_for_email/reporter_email, CC = tt.support@kriasol.com + assigned engineer
                let toList = [];
                if (requestForEmail && reporterEmail) {
                    if (requestForEmail === reporterEmail) {
                        toList.push(requestForEmail);
                    } else {
                        toList.push(requestForEmail, reporterEmail);
                    }
                } else if (requestForEmail) {
                    toList.push(requestForEmail);
                } else if (reporterEmail) {
                    toList.push(reporterEmail);
                }
                
                let ccList = ['tt.support@kriasol.com'];
                if (assignedToEmail) {
                    ccList.push(assignedToEmail);
                }
                
                setImmediate(() => {
                    emailService.sendTicketCommentEmail({
                        toEmail: toList.join(','),
                        ccEmail: ccList.join(','),
                        display_id: ticketData.display_id,
                        short_description: ticketData.short_description,
                        comment_text: comment_text,
                        commenterEmail: commenterEmail,
                        ticketUrl: ticketLink
                    });
                });
            } else {
                // Non-engineer action: To = tt.support@kriasol.com + assigned engineer, CC = request_for_email/reporter_email
                setImmediate(() => {
                    let toList = ['tt.support@kriasol.com'];
                    
                    // Add assigned engineer to "To" field if ticket is assigned
                    if (assignedToEmail) {
                        toList.push(assignedToEmail);
                    }
                    
                    let ccList = [];
                    
                    // Add requested by email and requested for email to CC (if they're different)
                    if (requestForEmail && reporterEmail) {
                        if (requestForEmail === reporterEmail) {
                            ccList.push(requestForEmail);
                        } else {
                            ccList.push(requestForEmail, reporterEmail);
                        }
                    } else if (requestForEmail) {
                        ccList.push(requestForEmail);
                    } else if (reporterEmail) {
                        ccList.push(reporterEmail);
                    }
                    
                    const toEmail = toList.join(',');
                    const ccEmail = ccList.length > 0 ? ccList.join(',') : null;
                    emailService.sendTicketCommentEmail({
                        toEmail: toEmail,
                        ccEmail: ccEmail,
                        display_id: ticketData.display_id,
                        short_description: ticketData.short_description,
                        comment_text: comment_text,
                        commenterEmail: commenterEmail,
                        ticketUrl: ticketLink
                    });
                });
            }

            return res.status(200).json({ message: 'Comment added successfully!' });
        } catch (error) {
            console.error(`Error adding comment: ${error.message}`);
            return res.status(500).json({ error: `Error adding comment: ${error.message}` });
        }
    });

    // --- Get My Tickets ---
    router.get('/my', verifyFirebaseToken, async (req, res) => {
        const userId = req.query.userId;
        const authenticatedUid = req.user.uid;
        const searchKeyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';
        const limit = parseInt(req.query.limit) || 50; // OPTIMIZED: Add limit parameter

        if (userId !== authenticatedUid) {
            return res.status(403).json({ error: 'Unauthorized: You can only view your own tickets.' });
        }

        try {
            let query = ticketsCollection.where('reporter_id', '==', userId);
            
            // OPTIMIZED: Only apply status filter if no search keyword
            if (!searchKeyword) {
                query = query.where('status', 'in', ['Open', 'In Progress', 'Hold']);
            }

            if (searchKeyword) {
                const exactIdMatch = `TT${searchKeyword.toUpperCase().padStart(5, '0')}`;
                const exactIdMatchQuery = ticketsCollection
                    .where('reporter_id', '==', userId)
                    .where('display_id', '==', exactIdMatch)
                    .limit(10); // OPTIMIZED: Limit exact searches
                const exactIdMatchSnapshot = await exactIdMatchQuery.get();
                if (!exactIdMatchSnapshot.empty) {
                    return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data())));
                }
            }

            // OPTIMIZED: Apply limit to prevent excessive reads
            const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();
            const tickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));
            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error fetching my tickets for ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch your tickets: ${error.message}` });
        }
    });

    // --- Get All Tickets (for support, admin, super_admin, and site_admin users) ---
    router.get('/all', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const filterStatus = req.query.status;
        const filterAssignment = req.query.assignment;
        const filterCompany = req.query.company; // New company filter parameter
        const searchKeyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';
        const limit = parseInt(req.query.limit) || 100; // OPTIMIZED: Add limit parameter

        try {
            let query = ticketsCollection;

            // Apply company filtering for site admin users
            if (req.user.role === 'site_admin' && req.user.client_name) {
                query = query.where('client_name', '==', req.user.client_name);
            }

            if (searchKeyword) {
                const exactIdMatch = `TT${searchKeyword.toUpperCase().padStart(5, '0')}`;
                let exactIdMatchQuery = ticketsCollection.where('display_id', '==', exactIdMatch);
                
                // Apply company filtering for site admin users in exact match query
                if (req.user.role === 'site_admin' && req.user.client_name) {
                    exactIdMatchQuery = exactIdMatchQuery.where('client_name', '==', req.user.client_name);
                }
                
                const exactIdMatchSnapshot = await exactIdMatchQuery.limit(10).get(); // OPTIMIZED: Limit exact searches
                if (!exactIdMatchSnapshot.empty) {
                    return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data())));
                }
            }

            if (filterStatus) {
                if (!validTicketStatuses.includes(filterStatus)) {
                    return res.status(400).json({ error: 'Invalid status filter.' });
                }
                query = query.where('status', '==', filterStatus);
            }

            if (filterAssignment === 'unassigned') {
                query = query.where('assigned_to_email', '==', null);
            } else if (filterAssignment === 'assigned_to_me') {
                query = query.where('assigned_to_id', '==', req.user.uid);
            }

            // Apply company filter
            if (filterCompany) {
                query = query.where('client_name', '==', filterCompany);
            }

            // OPTIMIZED: Apply limit to prevent excessive reads
            const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();
            const tickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));
            return res.status(200).json(tickets);
        } catch (error) {
            console.error(`Error fetching all tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch all tickets: ${error.message}` });
        }
    });

    // --- New Route: Export all tickets to CSV ---
    router.get('/export', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const { start_date, end_date, status } = req.query;

        try {
            let query = ticketsCollection.orderBy('created_at', 'asc');

            // Apply company filtering for site admin users
            if (req.user.role === 'site_admin' && req.user.client_name) {
                query = query.where('client_name', '==', req.user.client_name);
            }

            if (start_date) {
                const startDateObj = new Date(start_date);
                if (!isNaN(startDateObj.getTime())) {
                    query = query.where('created_at', '>=', admin.firestore.Timestamp.fromDate(startDateObj));
                } else {
                    return res.status(400).json({ error: 'Invalid start_date format.' });
                }
            }
            if (end_date) {
                const endDateObj = new Date(end_date);
                if (!isNaN(endDateObj.getTime())) {
                    endDateObj.setHours(23, 59, 59, 999);
                    query = query.where('created_at', '<=', admin.firestore.Timestamp.fromDate(endDateObj));
                } else {
                    return res.status(400).json({ error: 'Invalid end_date format.' });
                }
            }
            if (status && status !== '' && status !== 'All') {
                query = query.where('status', '==', status);
            }
            const snapshot = await query.get();
            const allTickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));

            const headers = [
                "Ticket ID",
                "Short description",
                "Category",
                "Priority",
                "Status",
                "Requested by",
                "Requested for",
                "Contact",
                "Asset ID",
                "Assigned to",
                "Created",
                "Resolved Date",
                "Time Spent",
                "Closure Notes",
                "Closed by"
            ];
            let csv = headers.join(',') + '\n';

            allTickets.forEach(ticket => {
                let timeSpent = ticket.time_spent !== undefined && ticket.time_spent !== null ? ticket.time_spent : '';

                const row = [
                    ticket.display_id || '',
                    `"${ticket.short_description ? ticket.short_description.replace(/"/g, '""') : ''}"`,
                    ticket.category || '',
                    ticket.priority || '',
                    ticket.status || '',
                    ticket.reporter_email || '',
                    ticket.request_for_email || '',
                    ticket.contact_number || '',
                    ticket.hostname_asset_id || '',
                    ticket.assigned_to_email || '',
                    ticket.created_at || '',
                    ticket.resolved_at || '',
                    timeSpent,
                    `"${ticket.closure_notes ? ticket.closure_notes.replace(/"/g, '""') : ''}"`,
                    ticket.closed_by_email || ''
                ];
                csv += row.join(',') + '\n';
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="tickets_export.csv"');
            return res.status(200).send(csv);

        } catch (error) {
            console.error(`Error exporting tickets: ${error.message}`);
            return res.status(500).json({ error: `Failed to export tickets: ${error.message}` });
        }
    });

    // --- New Route: Get Ticket Details ---
    router.get('/:ticket_id', verifyFirebaseToken, async (req, res) => {
        const ticketId = req.params.ticket_id;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        try {
            let ticketDoc = await ticketsCollection.doc(ticketId).get();

            // If not found by document ID, try to find by display_id
            if (!ticketDoc.exists && ticketId.startsWith('TT')) {
                const displayIdQuery = await ticketsCollection.where('display_id', '==', ticketId).limit(1).get();
                if (!displayIdQuery.empty) {
                    ticketDoc = displayIdQuery.docs[0];
                }
            }

            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            const ticketData = ticketDoc.data();

            // For site admin users, check if they can access this ticket based on company
            if (authenticatedUserRole === 'site_admin') {
                if (req.user.client_name && ticketData.client_name !== req.user.client_name) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to view tickets from other companies.' });
                }
            } else if (ticketData.reporter_id !== authenticatedUid && !['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket.' });
            }

            return res.status(200).json(jsonSerializableTicket(ticketDoc.id, ticketData));
        } catch (error) {
            console.error(`Error fetching ticket ${ticketId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch ticket details: ${error.message}` });
        }
    });

    // --- New Route: Upload Attachment ---
    router.post('/upload-attachment', verifyFirebaseToken, async (req, res) => {
        if (!admin.storage()) {
            if (!res.headersSent) {
                return res.status(500).json({ error: "Firebase Storage not configured on the server." });
            }
            return;
        }

        const busboy = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } });
        const bucket = admin.storage().bucket();

        const uploads = [];
        const filePromises = [];
        let responseSent = false;

        const sendResponse = (statusCode, data) => {
            if (!responseSent) {
                responseSent = true;
                return res.status(statusCode).json(data);
            }
        };

        busboy.on('file', (fieldname, file, filenameInfo) => {
            if (responseSent) {
                file.resume();
                return;
            }

            const { filename: originalFilename, encoding, mimetype } = filenameInfo;
            const fileExtension = path.extname(originalFilename).toLowerCase();

            const allowedMimeTypes = [
                'application/pdf', 'image/jpeg', 'image/png',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

            const fileUploadPromise = new Promise((resolve, reject) => {
                const isMimeTypeAllowed = mimetype && allowedMimeTypes.includes(mimetype);
                const isExtensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);

                if (!isMimeTypeAllowed && !isExtensionAllowed) {
                    file.resume();
                    return reject(new Error(`File type for ${originalFilename} not allowed. Allowed types: PDF, JPG, PNG, Word.`));
                }

                const uniqueFilename = `${uuidv4()}${fileExtension}`;
                const filepath = path.join(os.tmpdir(), uniqueFilename);
                const writeStream = fs.createWriteStream(filepath);

                file.pipe(writeStream);

                writeStream.on('finish', () => {
                    const destination = `attachments/${Date.now()}_${uniqueFilename}`;
                    bucket.upload(filepath, {
                        destination: destination,
                        metadata: {
                            contentType: mimetype,
                            metadata: {
                                firebaseStorageDownloadTokens: uuidv4(),
                                uploadedBy: req.user.email,
                                originalFileName: originalFilename
                            }
                        }
                    })
                    .then(() => {
                        const fileRef = bucket.file(destination);
                        return fileRef.makePublic();
                    })
                    .then(() => {
                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                        uploads.push({
                            originalFilename: originalFilename,
                            url: publicUrl,
                            mimetype: mimetype,
                            added_at: new Date().toISOString()
                        });
                        fs.unlink(filepath, () => {});
                        resolve();
                    })
                    .catch(err => {
                        fs.unlink(filepath, () => {});
                        reject(new Error(`Failed to upload file ${originalFilename}: ${err.message}`));
                    });
                });

                writeStream.on('error', (err) => {
                    fs.unlink(filepath, () => {});
                    reject(new Error(`Failed to write file ${originalFilename} to disk: ${err.message}`));
                });

                file.on('limit', () => {
                    fs.unlink(filepath, () => {});
                    file.resume();
                    reject(new Error(`File ${originalFilename} exceeds the 10MB limit.`));
                });
            });

            filePromises.push(fileUploadPromise);
        });

        busboy.on('finish', async () => {
            if (responseSent) return;
            try {
                const results = await Promise.allSettled(filePromises);
                const failedUploads = results.filter(result => result.status === 'rejected').map(result => result.reason.message);

                if (failedUploads.length > 0) {
                    const errorMessage = `Some files failed to upload: ${failedUploads.join('; ')}`;
                    sendResponse(400, { error: errorMessage, files: uploads });
                } else if (uploads.length > 0) {
                    sendResponse(200, { message: 'Files uploaded successfully', files: uploads });
                } else {
                    sendResponse(400, { error: 'No files were uploaded or processed.' });
                }
            } catch (error) {
                console.error('Busboy finish processing error:', error);
                sendResponse(500, { error: `An unexpected error occurred during file processing: ${error.message}` });
            }
        });

        busboy.on('error', (error) => {
            console.error('Busboy parsing error:', error);
            sendResponse(500, { error: `File upload parsing error: ${error.message}` });
        });

        req.pipe(busboy);
    });

    // --- Danger: Delete All Tickets Endpoint ---
    router.delete('/all', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        try {
            const snapshot = await ticketsCollection.get();
            const batch = admin.firestore().batch();
            let count = 0;
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
                count++;
            });
            if (count === 0) {
                return res.status(200).json({ message: 'No tickets to delete.' });
            }
            await batch.commit();
            return res.status(200).json({ message: `Deleted ${count} tickets.` });
        } catch (error) {
            console.error('Error deleting all tickets:', error);
            return res.status(500).json({ error: 'Failed to delete all tickets.' });
        }
    });

    return router;
};

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
    // Fallback to production URL
    return 'https://ticketing.kriasol.com';
}