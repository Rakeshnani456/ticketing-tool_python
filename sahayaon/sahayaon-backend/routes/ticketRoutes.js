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

    // --- Helper for generating a simple display ID using atomic counter ---
    async function generateDisplayIdInternal() {
        try {
            const counterRef = db.collection('counters').doc('ticket_display_id');
            
            // Use Firestore transaction to atomically increment the counter
            const result = await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                let nextNumber = 1;
                
                if (counterDoc.exists) {
                    const counterData = counterDoc.data();
                    nextNumber = (counterData.count || 0) + 1;
                    console.log('🔍 Current counter value:', counterData.count, 'Next will be:', nextNumber);
                } else {
                    console.log('🔍 Counter document does not exist, starting from 1');
                }
                
                // Ensure we don't exceed 6 digits (max 999999)
                if (nextNumber > 999999) {
                    console.error('🔍 Display ID counter exceeded 999999, resetting to 1');
                    nextNumber = 1;
                }
                
                // Update the counter
                transaction.set(counterRef, { 
                    count: nextNumber,
                    last_updated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                return nextNumber;
            });
            
            // Format as 6-digit number with leading zeros
            const displayId = `TT${result.toString().padStart(6, '0')}`;
            console.log('🎫 Generated sequential display ID:', displayId, 'from counter:', result);
            return displayId;
            
        } catch (error) {
            console.error('Error generating display ID with counter:', error);
            
            // Fallback: Get the highest existing display ID and increment
            try {
                const lastTicketQuery = await ticketsCollection
                    .orderBy('display_id', 'desc')
                    .limit(1)
                    .get();
                
                let nextNumber = 1;
                
                if (!lastTicketQuery.empty) {
                    const lastTicket = lastTicketQuery.docs[0].data();
                    const lastDisplayId = lastTicket.display_id;
                    console.log('🔍 Fallback - Last ticket display_id:', lastDisplayId);
                    
                    if (lastDisplayId && lastDisplayId.startsWith('TT')) {
                        const numberPart = lastDisplayId.substring(2);
                        const lastNumber = parseInt(numberPart, 10);
                        if (!isNaN(lastNumber) && lastNumber > 0) {
                            nextNumber = lastNumber + 1;
                        }
                    }
                }
                
                // Ensure we don't exceed 6 digits
                if (nextNumber > 999999) {
                    nextNumber = 1;
                }
                
                const displayId = `TT${nextNumber.toString().padStart(6, '0')}`;
                console.log('🎫 Generated fallback display ID:', displayId);
                return displayId;
                
            } catch (fallbackError) {
                console.error('Fallback display ID generation failed:', fallbackError);
                // Final fallback to timestamp
                const timestamp = Date.now();
                const fallbackNumber = parseInt(timestamp.toString().slice(-6), 10);
                return `TT${fallbackNumber.toString().padStart(6, '0')}`;
            }
        }
    }

    // --- Helper to initialize counter from existing tickets ---
    async function initializeCounterFromExistingTickets() {
        try {
            const counterRef = db.collection('counters').doc('ticket_display_id');
            const counterDoc = await counterRef.get();
            
            if (counterDoc.exists) {
                console.log('🔍 Counter already exists, no initialization needed');
                return;
            }
            
            console.log('🔍 Initializing counter from existing tickets...');
            
            // Get the highest existing display ID
            // Handle potential index issues gracefully
            let highestNumber = 0;
            try {
                const lastTicketQuery = await ticketsCollection
                    .orderBy('display_id', 'desc')
                    .limit(1)
                    .get();
                
                if (!lastTicketQuery.empty) {
                    const lastTicket = lastTicketQuery.docs[0].data();
                    const lastDisplayId = lastTicket.display_id;
                    console.log('🔍 Highest existing display_id:', lastDisplayId);
                    
                    if (lastDisplayId && lastDisplayId.startsWith('TT')) {
                        const numberPart = lastDisplayId.substring(2);
                        const lastNumber = parseInt(numberPart, 10);
                        if (!isNaN(lastNumber) && lastNumber > 0) {
                            highestNumber = lastNumber;
                        }
                    }
                }
            } catch (queryError) {
                // If orderBy fails (e.g., index not created), try without ordering
                if (queryError.code === 9 || queryError.message?.includes('index')) {
                    console.warn('⚠️ Index for display_id not found. Trying alternative method...');
                    try {
                        const allTicketsSnapshot = await ticketsCollection.limit(100).get();
                        let maxNumber = 0;
                        allTicketsSnapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.display_id && data.display_id.startsWith('TT')) {
                                const numPart = parseInt(data.display_id.substring(2), 10);
                                if (!isNaN(numPart) && numPart > maxNumber) {
                                    maxNumber = numPart;
                                }
                            }
                        });
                        highestNumber = maxNumber;
                    } catch (fallbackError) {
                        console.warn('⚠️ Could not query tickets for counter initialization. Starting from 0.');
                    }
                } else {
                    throw queryError;
                }
            }
            
            // Set the counter to the highest existing number
            await counterRef.set({
                count: highestNumber,
                initialized_at: admin.firestore.FieldValue.serverTimestamp(),
                last_updated: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Counter initialized with value: ${highestNumber}`);
            
        } catch (error) {
            // Distinguish between different error types
            if (error.code === 5 || error.code === 'NOT_FOUND') {
                console.warn('⚠️ Counter initialization: Firestore NOT_FOUND error. This may indicate:');
                console.warn('   - Firestore database is not fully initialized');
                console.warn('   - Service account permissions issue');
                console.warn('   - Network connectivity issue');
                console.warn('   Counter will be created automatically when first ticket is created.');
            } else if (error.code === 7 || error.code === 'PERMISSION_DENIED') {
                console.error('❌ Counter initialization: Permission denied. Check service account permissions.');
                console.error('   Ensure the service account has Firestore read/write permissions.');
            } else {
                console.error('❌ Error initializing counter:', error.message || error);
                console.error('   Error code:', error.code || 'unknown');
            }
            // Don't throw - allow server to continue running
            // Counter will be created on-demand when first ticket is created
        }
    }

    // --- Initialize counter on server start ---
    initializeCounterFromExistingTickets();

    // --- New Endpoint: Initialize Display ID Counter ---
    router.post('/initialize-counter', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            await initializeCounterFromExistingTickets();
            res.status(200).json({ 
                message: 'Display ID counter initialized successfully',
                success: true 
            });
        } catch (error) {
            console.error('Error initializing counter:', error);
            res.status(500).json({ 
                error: 'Failed to initialize counter',
                success: false 
            });
        }
    });

    // --- New Endpoint: Get Display ID Counter Status ---
    router.get('/counter-status', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const counterRef = db.collection('counters').doc('ticket_display_id');
            const counterDoc = await counterRef.get();
            
            if (counterDoc.exists) {
                const counterData = counterDoc.data();
                res.status(200).json({
                    exists: true,
                    current_count: counterData.count || 0,
                    last_updated: counterData.last_updated,
                    initialized_at: counterData.initialized_at
                });
            } else {
                res.status(200).json({
                    exists: false,
                    message: 'Counter not initialized'
                });
            }
        } catch (error) {
            console.error('Error getting counter status:', error);
            res.status(500).json({ error: 'Failed to get counter status' });
        }
    });

    // --- New Endpoint: Get Ticket Summary Counts ---
    router.get('/summary-counts', verifyFirebaseToken, async (req, res) => {
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;
        const authenticatedClientName = req.user.client_name;

        try {
            let activeTicketsQuery = ticketsCollection.where('status', 'in', ['Open', 'In Progress', 'Hold']);
            let totalTicketsQuery = ticketsCollection.where('status', 'in', ['Open', 'In Progress', 'Hold']);
            let myTicketsQuery;
            let assignedToMeQuery;

            // "My Tickets" count = active tickets created by the user
            // This matches what MyTicketsComponent actually displays
            myTicketsQuery = ticketsCollection
                .where('reporter_id', '==', authenticatedUid)
                .where('status', 'in', ['Open', 'In Progress', 'Hold']);

            // "My Queue" count = active tickets assigned to the user (for support/engineer roles)
            let assignedToMeSnapshot;
            if (['support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole)) {
                const userDoc = await usersCollection.where('uid', '==', authenticatedUid).limit(1).get();
                const userEmail = userDoc.empty ? null : userDoc.docs[0].data().email;
                
                console.log(`[summary-counts] User: ${authenticatedUid}, Role: ${authenticatedUserRole}, Email: ${userEmail}`);
                
                if (userEmail) {
                    const assignedToMeQuery = ticketsCollection
                        .where('assigned_to_email', '==', userEmail)
                        .where('status', 'in', ['Open', 'In Progress', 'Hold']);
                    assignedToMeSnapshot = await assignedToMeQuery.get();
                    console.log(`[summary-counts] Found ${assignedToMeSnapshot.size} tickets assigned to ${userEmail}`);
                } else {
                    assignedToMeSnapshot = { size: 0 };
                    console.log(`[summary-counts] No email found for user ${authenticatedUid}`);
                }
            } else {
                assignedToMeSnapshot = { size: 0 };
                console.log(`[summary-counts] User role ${authenticatedUserRole} not eligible for My Queue`);
            }

            const [activeSnapshot, myTicketsSnapshot, totalSnapshot] = await Promise.all([
                activeTicketsQuery.get(),
                myTicketsQuery.get(),
                totalTicketsQuery.get()
            ]);

            const counts = {
                active_tickets: activeSnapshot.size,
                my_tickets: myTicketsSnapshot.size, // Tickets created by the user
                assigned_to_me: assignedToMeSnapshot.size, // Tickets assigned to the user
                total_tickets: totalSnapshot.size, // Now counts only active tickets
            };

            console.log(`[summary-counts] Returning counts:`, counts);

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

    // --- New Route: Create a new ticket (ULTRA-FAST) ---
    router.post('/', verifyFirebaseToken, async (req, res) => {
        const startTime = Date.now();
        console.log('🚀 Ticket creation started at:', new Date().toISOString());
        
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
            // OPTIMIZATION: Get client_name from authenticated user (no DB lookup needed)
            // This ensures site_admin can immediately access tickets from their client
            let clientName = req.user.client_name || null;

            // OPTIMIZATION: Generate display ID sequentially
            const newDisplayId = await generateDisplayIdInternal();

            // OPTIMIZATION: Use email as reporter name to avoid database lookup
            const reporterName = reporterEmail;

            const newTicket = {
                display_id: newDisplayId,
                reporter_id: reporterId,
                reporter_email: reporterEmail,
                reporter_name: reporterName,
                reporter_firstName: null,
                reporter_lastName: null,
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
                attachments: attachments || [],
                assigned_to_id: null,
                assigned_to_email: null,
                resolved_at: null,
                time_spent_minutes: null,
                closure_notes: null,
                status_history: [],
                assigned_to_history: [],
                notes: [], // Internal notes visible only to engineers/support
                client_name: clientName || null,
            };

            const docRef = await ticketsCollection.add(newTicket);
            const dbTime = Date.now();
            console.log('📊 Database write completed in:', dbTime - startTime, 'ms');

            // OPTIMIZATION: Return response immediately, handle all non-essential operations asynchronously
            const responseData = { 
                message: 'Ticket created successfully!', 
                id: docRef.id, 
                display_id: newDisplayId,
                ticket_id: docRef.id // Add ticket_id for frontend compatibility
            };

            // Send response immediately
            res.status(201).json(responseData);
            const responseTime = Date.now();
            console.log('⚡ Response sent in:', responseTime - startTime, 'ms');

            // OPTIMIZATION: Handle all non-essential operations asynchronously after response
            setImmediate(async () => {
                try {
                    // OPTIMIZATION: Populate client_name in background
                    let resolvedClientName = null;
                    try {
                        if (reporterEmail !== request_for_email) {
                            const [reporterSnap, requestSnap] = await Promise.all([
                                usersCollection.where('email', '==', reporterEmail).limit(1).get(),
                                usersCollection.where('email', '==', request_for_email).limit(1).get()
                            ]);
                            
                            if (!reporterSnap.empty) {
                                const userData = reporterSnap.docs[0].data();
                                resolvedClientName = userData.client_name || null;
                            } else if (!requestSnap.empty) {
                                const userData = requestSnap.docs[0].data();
                                resolvedClientName = userData.client_name || null;
                            }
                        } else {
                            const reporterSnap = await usersCollection.where('email', '==', reporterEmail).limit(1).get();
                            if (!reporterSnap.empty) {
                                const userData = reporterSnap.docs[0].data();
                                resolvedClientName = userData.client_name || null;
                            }
                        }
                        
                        // Update ticket with client_name if found
                        if (resolvedClientName) {
                            await ticketsCollection.doc(docRef.id).update({
                                client_name: resolvedClientName
                            });
                        }
                    } catch (lookupError) {
                        console.warn("Background client lookup failed:", lookupError.message);
                    }

                    // Log ticket creation activity (non-blocking)
                    await logTicketCreated(db, docRef.id, reporterName, reporterEmail, { 
                        ...newTicket, 
                        ticket_display_id: newDisplayId,
                        client_name: resolvedClientName || clientName 
                    });

                    // Add notification (non-blocking)
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

                    // Trigger analytics update (non-blocking)
                    await triggerAnalyticsUpdate('created', { ...newTicket, id: docRef.id });
                } catch (error) {
                    console.error('Error in post-creation tasks:', error);
                }
            });

            // OPTIMIZATION: Move email processing to the async setImmediate block
            setImmediate(async () => {
                try {
                    // Send email notification (non-blocking)
                    const baseUrl = getBaseUrl(req);
                    const ticketUrl = `${baseUrl}/tickets/${docRef.id}`;
                    
                    // Fetch user data to get firstName and lastName
                    let userFirstName = '';
                    let userLastName = '';
                    let userName = reporterEmail;
                    try {
                        const userEmail = request_for_email || reporterEmail;
                        const userSnap = await usersCollection.where('email', '==', userEmail).limit(1).get();
                        if (!userSnap.empty) {
                            const userData = userSnap.docs[0].data();
                            userFirstName = userData.firstName || '';
                            userLastName = userData.lastName || '';
                            if (userData.firstName || userData.lastName) {
                                userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                            }
                        }
                    } catch (userError) {
                        console.warn('Error fetching user data for email:', userError.message);
                    }
                    
                    // Ticket Creation Email: To: User + Distribution List, CC: none
                    const ticketData = {
                        ticketId: newDisplayId,
                        subject: short_description,
                        description: long_description || short_description,
                        priority: priority || 'Low',
                        category: category,
                        firstName: userFirstName,
                        lastName: userLastName,
                        userName: userName,
                        userEmail: request_for_email || reporterEmail,
                        reporterName: reporterEmail,
                        ticketUrl: ticketUrl
                    };
                    
                    await emailService.sendTicketNotificationEmail(ticketData);
                } catch (error) {
                    console.error('Error sending ticket notification email:', error);
                }
            });
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
            assigned_to_id, // User ID sent from frontend for faster lookup
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
        
        // Variable to store assignment background data (for processing after response is sent)
        let assignmentBackgroundData = null;

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

            // OPTIMIZATION: Use client timestamp for updated_at to avoid serverTimestamp() latency
            // serverTimestamp() requires a round-trip to Firestore servers, adding 200-300ms delay
            // Client timestamp is sufficient for updated_at since we have precise timestamps in history arrays
            const updateData = {
                updated_at: new Date() // Client timestamp - much faster than serverTimestamp()
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
                            
                            let ccList = [process.env.DISTRIBUTION_EMAIL];
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
                                toEmail: process.env.DISTRIBUTION_EMAIL,
                                ccEmail: req.user.email
                            };
                            
                            await emailService.sendAttachmentUploadEmail(emailData);
                        }
                    } catch (error) {
                        console.error('Error sending attachment upload notification email:', error);
                    }
                });
            }

            // Handle resolved/cancelled specific logic - ALWAYS set these when status is Resolved/Cancelled
            // Move this BEFORE status change check to ensure fields are set
            if (status && ["Resolved", "Cancelled"].includes(status)) {
                // Always set resolved_at and closed_by_email when resolving/cancelling
                // Only skip if ticket is already resolved/cancelled AND fields are already set AND status isn't changing
                const isChangingStatus = status !== ticketData.status;
                const isAlreadyResolvedOrCancelled = ["Resolved", "Cancelled"].includes(ticketData.status);
                
                // Set these fields if:
                // 1. Status is changing to Resolved/Cancelled, OR
                // 2. Status is Resolved/Cancelled and fields are not already set
                if (isChangingStatus || !isAlreadyResolvedOrCancelled || !ticketData.resolved_at || !ticketData.closed_by_email) {
                    // OPTIMIZATION: Use client timestamp for resolved_at to avoid serverTimestamp() latency
                    // The exact server time isn't critical here - client time is sufficient
                    updateData.resolved_at = new Date(); // Client timestamp - much faster
                    updateData.closed_by_email = req.user.email;
                }
                
                if ((time_spent === undefined || time_spent === null || time_spent === "") && ticketData.created_at && ticketData.created_at.toDate) {
                    const createdAt = ticketData.created_at.toDate();
                    const resolvedAt = new Date();
                    const timeDiffMillis = resolvedAt.getTime() - createdAt.getTime();
                    const timeSpentMinutes = Math.round(timeDiffMillis / (1000 * 60));
                    updateData.time_spent_minutes = timeSpentMinutes;
                }
            }

            // Status change logic
            // OPTIMIZATION: Store history entry for background update (non-blocking)
            let statusHistoryEntry = null;
            if (status && status !== ticketData.status) {
                updateData.status = status;
                statusHistoryEntry = {
                    old_status: ticketData.status,
                    new_status: status,
                    user_email: req.user.email,
                    timestamp: new Date() // Use client timestamp - will be updated in background
                };
                // REMOVED: Don't update history in critical path - move to background
                // updateData.status_history = admin.firestore.FieldValue.arrayUnion(statusHistoryEntry);
                
                // Move status change logging to background
                setImmediate(async () => {
                    try {
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
                    } catch (error) {
                        console.error('Error in background status change logging:', error);
                    }
                });

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
                    // Engineer action: To = request_for_email/reporter_email, CC = process.env.DISTRIBUTION_EMAIL + assigned engineer
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
                    
                    let ccList = [process.env.DISTRIBUTION_EMAIL];
                    if (ticketData.assigned_to_email) {
                        ccList.push(ticketData.assigned_to_email);
                    }
                    
                    setImmediate(async () => {
                        try {
                            const baseUrl = getBaseUrl(req);
                            const ticketUrl = `${baseUrl}/tickets/${ticketId}`;
                            
                            // Fetch user data to get firstName and lastName
                            let userFirstName = '';
                            let userLastName = '';
                            let userName = requestForEmail || ticketReporterEmail || '';
                            try {
                                const userEmail = requestForEmail || ticketReporterEmail;
                                if (userEmail) {
                                    const userSnap = await usersCollection.where('email', '==', userEmail).limit(1).get();
                                    if (!userSnap.empty) {
                                        const userData = userSnap.docs[0].data();
                                        userFirstName = userData.firstName || '';
                                        userLastName = userData.lastName || '';
                                        if (userData.firstName || userData.lastName) {
                                            userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                                        }
                                    }
                                }
                            } catch (userError) {
                                console.warn('Error fetching user data for email:', userError.message);
                            }
                            
                            const emailData = {
                                display_id: ticketData.display_id,
                                short_description: ticketData.short_description,
                                status: status,
                                firstName: userFirstName,
                                lastName: userLastName,
                                userName: userName,
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
                    // Non-engineer action: To = process.env.DISTRIBUTION_EMAIL + users, CC = none
                    setImmediate(async () => {
                        let toList = [process.env.DISTRIBUTION_EMAIL];
                        
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
                        
                        // Fetch user data to get firstName and lastName
                        let userFirstName = '';
                        let userLastName = '';
                        let userName = requestForEmail || ticketReporterEmail || '';
                        try {
                            const userEmail = requestForEmail || ticketReporterEmail;
                            if (userEmail) {
                                const userSnap = await usersCollection.where('email', '==', userEmail).limit(1).get();
                                if (!userSnap.empty) {
                                    const userData = userSnap.docs[0].data();
                                    userFirstName = userData.firstName || '';
                                    userLastName = userData.lastName || '';
                                    if (userData.firstName || userData.lastName) {
                                        userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                                    }
                                }
                            }
                        } catch (userError) {
                            console.warn('Error fetching user data for email:', userError.message);
                        }
                        
                        const emailData = {
                            display_id: ticketData.display_id,
                            short_description: ticketData.short_description,
                            status: status,
                            firstName: userFirstName,
                            lastName: userLastName,
                            userName: userName,
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
                    // OPTIMIZATION: Store history entry for background update (non-blocking)
                    const assignmentHistoryEntry = {
                        old_assigned_to: ticketData.assigned_to_email,
                        new_assigned_to: null,
                        user_email: req.user.email,
                        timestamp: new Date() // Use client timestamp - will be updated in background
                    };
                    // REMOVED: Don't update history in critical path - move to background
                    // updateData.assigned_to_history = admin.firestore.FieldValue.arrayUnion(assignmentHistoryEntry);
                    
                    // Store for background processing
                    if (!assignmentBackgroundData) {
                        assignmentBackgroundData = {
                            ticketId,
                            ticketData: JSON.parse(JSON.stringify(ticketData))
                        };
                    }
                    assignmentBackgroundData.assignmentHistoryEntry = assignmentHistoryEntry;
                    // Move unassignment notification to background for faster response
                    if (ticketData.assigned_to_id) {
                        setImmediate(async () => {
                            try {
                                await notificationsCollection.add({
                                    userId: ticketData.assigned_to_id,
                                    message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been unassigned from you.`,
                                    type: 'ticket_unassigned',
                                    read: false,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                    ticketId: ticketId
                                });
                            } catch (error) {
                                console.error('Error in background unassignment notification:', error);
                            }
                        });
                    }
                } else {
                    // OPTIMIZATION: Trust frontend's assigned_to_id when provided to avoid blocking lookup
                    // Full validation happens in background - if it fails, we rollback
                    let assignedUserDoc = null;
                    let assignedUserData = null;
                    let validationRequired = true;
                    
                    if (assigned_to_id) {
                        // OPTIMIZED: Trust the frontend's ID and proceed with update
                        // We'll validate in background and rollback if validation fails
                        updateData.assigned_to_id = assigned_to_id;
                        updateData.assigned_to_email = assigned_to_email;
                        
                        // Store for background validation
                        // Use assigned_to_id as assignedUserDocId since we're trusting it
                        assignmentBackgroundData = {
                            ticketId,
                            ticketData: JSON.parse(JSON.stringify(ticketData)),
                            assigned_to_email,
                            assigned_to_id,
                            assignedUserDocId: assigned_to_id, // Use the ID we're trusting
                            authenticatedUid,
                            authenticatedUserRole,
                            needsValidation: true // Flag to indicate we need to validate in background
                        };
                        
                        validationRequired = false; // Skip blocking validation
                        console.log(`[PERF] Assignment: Trusting frontend ID ${assigned_to_id}, validating in background`);
                    } else {
                        // Fallback: Email query (slower, but needed for backward compatibility)
                        // This path is slower but necessary when ID is not provided
                        const userQuery = await usersCollection.where('email', '==', assigned_to_email).limit(1).get();
                        if (userQuery.empty) {
                            console.log(`Assignment failed: User with email ${assigned_to_email} not found in database`);
                            return res.status(404).json({ error: 'Assigned user email not found.' });
                        }
                        assignedUserDoc = userQuery.docs[0];
                        assignedUserData = assignedUserDoc.data();
                        
                        // Validate role synchronously (required when ID not provided)
                        const canAssign = authenticatedUserRole === 'site_admin'
                            ? ['support', 'admin', 'site_admin'].includes(assignedUserData.role)
                            : ['support', 'admin', 'super_admin'].includes(assignedUserData.role);
                        
                        if (!canAssign) {
                            console.log(`Assignment failed: User ${assigned_to_email} has role ${assignedUserData.role} which is not assignable by ${authenticatedUserRole}`);
                            return res.status(400).json({ 
                                error: authenticatedUserRole === 'site_admin'
                                    ? 'User cannot be assigned as they are not a support associate, admin, or site admin.'
                                    : 'User cannot be assigned as they are not a support associate, admin, or super admin.'
                            });
                        }
                        
                        updateData.assigned_to_id = assignedUserDoc.id;
                        updateData.assigned_to_email = assigned_to_email;
                        
                        // Store for background processing
                        assignmentBackgroundData = {
                            ticketId,
                            ticketData: JSON.parse(JSON.stringify(ticketData)),
                            assigned_to_email,
                            assignedUserDocId: assignedUserDoc.id,
                            assignedUserData: assignedUserDoc.data(),
                            authenticatedUid,
                            authenticatedUserRole,
                            needsValidation: false
                        };
                    }

                    // OPTIMIZATION: Store history entry for background update (non-blocking)
                    const assignmentHistoryEntry = {
                        old_assigned_to: ticketData.assigned_to_email,
                        new_assigned_to: assigned_to_email,
                        user_email: req.user.email,
                        timestamp: new Date() // Use client timestamp - will be updated in background
                    };
                    // REMOVED: Don't update history in critical path - move to background
                    // updateData.assigned_to_history = admin.firestore.FieldValue.arrayUnion(assignmentHistoryEntry);
                    
                    // Add history entry to assignmentBackgroundData (which should already be set above)
                    if (assignmentBackgroundData) {
                        assignmentBackgroundData.assignmentHistoryEntry = assignmentHistoryEntry;
                    } else {
                        // Fallback: This shouldn't happen, but handle it just in case
                        // (This path is for when assignedUserDoc exists from email query)
                        assignmentBackgroundData = {
                            ticketId,
                            ticketData: JSON.parse(JSON.stringify(ticketData)), // Deep clone to avoid reference issues
                            assigned_to_email,
                            assignedUserDocId: assignedUserDoc ? assignedUserDoc.id : assigned_to_id,
                            assignedUserData: assignedUserDoc ? assignedUserDoc.data() : null,
                            authenticatedUid,
                            authenticatedUserRole,
                            needsValidation: false,
                            assignmentHistoryEntry // Store history entry for background update
                        };
                    }
                }
            }

            // Priority change
            // OPTIMIZATION: Store history entry for background update (non-blocking)
            let priorityHistoryEntry = null;
            if (priority && priority !== ticketData.priority) {
                priorityHistoryEntry = {
                    old_priority: ticketData.priority,
                    new_priority: priority,
                    user_email: req.user.email,
                    timestamp: new Date() // Use client timestamp - will be updated in background
                };
                // REMOVED: Don't update history in critical path - move to background
                // updateData.priority_history = admin.firestore.FieldValue.arrayUnion(priorityHistoryEntry);
                
                // Move priority change logging to background
                setImmediate(async () => {
                    try {
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
                    } catch (error) {
                        console.error('Error in background priority change logging:', error);
                    }
                });
            }

            // Category change
            // OPTIMIZATION: Store history entry for background update (non-blocking)
            let categoryHistoryEntry = null;
            if (category && category !== ticketData.category) {
                categoryHistoryEntry = {
                    old_category: ticketData.category,
                    new_category: category,
                    user_email: req.user.email,
                    timestamp: new Date() // Use client timestamp - will be updated in background
                };
                // REMOVED: Don't update history in critical path - move to background
                // updateData.category_history = admin.firestore.FieldValue.arrayUnion(categoryHistoryEntry);
            }

            // OPTIMIZED: Update only critical fields first (no history arrays = much faster)
            // History arrays will be updated in background after response is sent
            const updateStartTime = Date.now();
            const updateDataSize = JSON.stringify(updateData).length;
            
            // Critical update: Only essential fields (status, assignment, priority, etc.)
            // This should be much faster (100-200ms) without arrayUnion operations
            await ticketsCollection.doc(ticketId).update(updateData);
            const updateEndTime = Date.now();
            const updateDuration = updateEndTime - updateStartTime;
            
            console.log(`[PERF] Critical update took ${updateDuration}ms for ticket ${ticketId} (payload: ${updateDataSize} bytes)`);
            
            // Store history entries for background processing
            const historyUpdates = {};
            if (statusHistoryEntry) {
                historyUpdates.status_history = statusHistoryEntry;
            }
            if (priorityHistoryEntry) {
                historyUpdates.priority_history = priorityHistoryEntry;
            }
            if (categoryHistoryEntry) {
                historyUpdates.category_history = categoryHistoryEntry;
            }
            
            // Return success immediately after update completes - DON'T WAIT FOR EMAILS
            const responseStartTime = Date.now();
            res.status(200).json({ message: 'Ticket updated successfully!' });
            // Force flush the response immediately
            if (res.flush) res.flush();
            const responseEndTime = Date.now();
            console.log(`[PERF] Response sent in ${responseEndTime - responseStartTime}ms after update (total time from request: ${responseEndTime - (req._startTime || Date.now())}ms)`);
            
            // Handle all background operations asynchronously (non-blocking) - AFTER response is sent
            setImmediate(async () => {
                try {
                    // OPTIMIZATION: Update history arrays in background (non-blocking)
                    // This doesn't affect response time since it happens after response is sent
                    if (Object.keys(historyUpdates).length > 0) {
                        try {
                            const historyUpdateData = {};
                            if (historyUpdates.status_history) {
                                historyUpdateData.status_history = admin.firestore.FieldValue.arrayUnion(historyUpdates.status_history);
                            }
                            if (historyUpdates.priority_history) {
                                historyUpdateData.priority_history = admin.firestore.FieldValue.arrayUnion(historyUpdates.priority_history);
                            }
                            if (historyUpdates.category_history) {
                                historyUpdateData.category_history = admin.firestore.FieldValue.arrayUnion(historyUpdates.category_history);
                            }
                            
                            if (Object.keys(historyUpdateData).length > 0) {
                                await ticketsCollection.doc(ticketId).update(historyUpdateData);
                                console.log(`[PERF] History arrays updated in background for ticket ${ticketId}`);
                            }
                        } catch (historyError) {
                            console.error('Error updating history arrays in background:', historyError);
                            // Don't fail the entire operation if history update fails
                        }
                    }
                    
                    // Update assignment history if present
                    if (assignmentBackgroundData && assignmentBackgroundData.assignmentHistoryEntry) {
                        try {
                            await ticketsCollection.doc(ticketId).update({
                                assigned_to_history: admin.firestore.FieldValue.arrayUnion(assignmentBackgroundData.assignmentHistoryEntry)
                            });
                            console.log(`[PERF] Assignment history updated in background for ticket ${ticketId}`);
                        } catch (historyError) {
                            console.error('Error updating assignment history in background:', historyError);
                        }
                    }
                    
                    // Trigger analytics update for real-time reports
                    await triggerAnalyticsUpdate('updated', { ...ticketData, ...updateData, id: ticketId });
                    
                    // Handle assignment emails and notifications in background
                    if (assignmentBackgroundData) {
                        const {
                            ticketId: bgTicketId,
                            ticketData: bgTicketData,
                            assigned_to_email: bgAssignedToEmail,
                            assigned_to_id: bgAssignedToId,
                            assignedUserDocId: bgAssignedUserDocId,
                            assignedUserData: bgAssignedUserData,
                            authenticatedUid: bgAuthenticatedUid,
                            authenticatedUserRole: bgAuthenticatedUserRole,
                            needsValidation: bgNeedsValidation
                        } = assignmentBackgroundData;
                        
                        // OPTIMIZATION: If we trusted frontend ID, validate now and rollback if invalid
                        let validatedUserDoc = null;
                        let validatedUserData = null;
                        
                        if (bgNeedsValidation && bgAssignedToId) {
                            try {
                                // Validate the user exists and has correct email
                                validatedUserDoc = await usersCollection.doc(bgAssignedToId).get();
                                if (!validatedUserDoc.exists) {
                                    console.error(`[VALIDATION] Assignment failed: User with ID ${bgAssignedToId} not found - rolling back`);
                                    // Rollback assignment
                                    await ticketsCollection.doc(bgTicketId).update({
                                        assigned_to_id: bgTicketData.assigned_to_id,
                                        assigned_to_email: bgTicketData.assigned_to_email
                                    });
                                    return; // Don't proceed with notifications/emails
                                }
                                validatedUserData = validatedUserDoc.data();
                                
                                // Verify email matches
                                if (validatedUserData.email !== bgAssignedToEmail) {
                                    console.error(`[VALIDATION] Assignment failed: Email mismatch - rolling back`);
                                    await ticketsCollection.doc(bgTicketId).update({
                                        assigned_to_id: bgTicketData.assigned_to_id,
                                        assigned_to_email: bgTicketData.assigned_to_email
                                    });
                                    return;
                                }
                                
                                // Validate role
                                const canAssign = bgAuthenticatedUserRole === 'site_admin'
                                    ? ['support', 'admin', 'site_admin'].includes(validatedUserData.role)
                                    : ['support', 'admin', 'super_admin'].includes(validatedUserData.role);
                                
                                if (!canAssign) {
                                    console.error(`[VALIDATION] Assignment failed: Invalid role - rolling back`);
                                    await ticketsCollection.doc(bgTicketId).update({
                                        assigned_to_id: bgTicketData.assigned_to_id,
                                        assigned_to_email: bgTicketData.assigned_to_email
                                    });
                                    return;
                                }
                                
                                // Validation passed - use validated data
                                console.log(`[VALIDATION] Assignment validated successfully for ${bgAssignedToEmail}`);
                                assignmentBackgroundData.assignedUserDocId = validatedUserDoc.id;
                                assignmentBackgroundData.assignedUserData = validatedUserData;
                            } catch (validationError) {
                                console.error('[VALIDATION] Error during background validation:', validationError);
                                // Rollback on error
                                try {
                                    await ticketsCollection.doc(bgTicketId).update({
                                        assigned_to_id: bgTicketData.assigned_to_id,
                                        assigned_to_email: bgTicketData.assigned_to_email
                                    });
                                } catch (rollbackError) {
                                    console.error('[VALIDATION] Error rolling back assignment:', rollbackError);
                                }
                                return;
                            }
                        }
                        
                        // Use validated data if available, otherwise use original
                        const finalAssignedUserDocId = validatedUserDoc ? validatedUserDoc.id : bgAssignedUserDocId;
                        const finalAssignedUserData = validatedUserData || bgAssignedUserData;
                        
                        // Assignment logging
                        try {
                            const userDoc = await usersCollection.doc(bgAuthenticatedUid).get();
                            const userData = userDoc.exists ? userDoc.data() : {};
                            let userName = req.user.email;
                            if (userData.firstName || userData.lastName) {
                                userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                            } else if (userData.name) {
                                userName = userData.name;
                            } else if (userData.client_name) {
                                userName = userData.client_name;
                            }
                            await logTicketAssigned(db, bgTicketId, userName, bgAssignedToEmail, req.user.email, { ...bgTicketData, ticket_display_id: bgTicketData.display_id });
                        } catch (error) {
                            console.error('Error in background assignment logging:', error);
                        }
                        
                        // Notifications
                        try {
                            if (finalAssignedUserDocId && finalAssignedUserDocId !== bgAuthenticatedUid) {
                                await notificationsCollection.add({
                                    userId: finalAssignedUserDocId,
                                    message: `Ticket ${bgTicketData.display_id} - "${bgTicketData.short_description}" has been assigned to you.`,
                                    type: 'ticket_assigned',
                                    read: false,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                    ticketId: bgTicketId
                                });
                            }
                            if (bgTicketData.assigned_to_id && bgTicketData.assigned_to_id !== finalAssignedUserDocId) {
                                await notificationsCollection.add({
                                    userId: bgTicketData.assigned_to_id,
                                    message: `Ticket ${bgTicketData.display_id} - "${bgTicketData.short_description}" has been reassigned from you.`,
                                    type: 'ticket_reassigned_from',
                                    read: false,
                                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                    ticketId: bgTicketId
                                });
                            }
                        } catch (error) {
                            console.error('Error in background notification operations:', error);
                        }
                        
                        // Send assignment emails
                        try {
                            const reporterEmail = bgTicketData.reporter_email;
                            const requestForEmail = bgTicketData.request_for_email;
                            const assignedEngineerEmail = bgAssignedToEmail;
                            const baseUrl = getBaseUrl(req);
                            const ticketUrl = `${baseUrl}/tickets/${bgTicketId}`;
                            
                            const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(bgAuthenticatedUserRole);
                            
                            if (isEngineerAction) {
                                // Engineer action: To = request_for_email/reporter_email, CC = process.env.DISTRIBUTION_EMAIL + assigned engineer
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
                                
                                let ccList = [process.env.DISTRIBUTION_EMAIL];
                                if (assignedEngineerEmail) {
                                    ccList.push(assignedEngineerEmail);
                                }
                                
                                const emailData = {
                                    display_id: bgTicketData.display_id,
                                    short_description: bgTicketData.short_description,
                                    assignedEngineerEmail: assignedEngineerEmail,
                                    ticketUrl: ticketUrl,
                                    toEmail: toList.join(','),
                                    ccEmail: ccList.join(',')
                                };
                                
                                await emailService.sendTicketAssignmentEmail(emailData, false); // false = team notification
                            } else {
                                // Non-engineer action: To = reporter_email, request_for_email; CC = assigned engineer
                                let toList = [];
                                if (reporterEmail) toList.push(reporterEmail);
                                if (requestForEmail && requestForEmail !== reporterEmail) toList.push(requestForEmail);
                                let ccList = assignedEngineerEmail;
                                
                                const emailData = {
                                    display_id: bgTicketData.display_id,
                                    short_description: bgTicketData.short_description,
                                    assignedEngineerEmail: assignedEngineerEmail,
                                    ticketUrl: ticketUrl,
                                    toEmail: toList.join(','),
                                    ccEmail: ccList
                                };
                                
                                await emailService.sendTicketAssignmentEmail(emailData, true); // true = user notification
                            }
                        } catch (error) {
                            console.error('Error sending ticket assignment email:', error);
                        }
                    }
                } catch (error) {
                    console.error('Error in background analytics update:', error);
                }
            });
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
                let toList = [process.env.DISTRIBUTION_EMAIL];
                
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

            // Primary database operation - update ticket with comment
            await ticketsCollection.doc(ticketId).update({
                comments: admin.firestore.FieldValue.arrayUnion(newComment),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Return success immediately to user
            res.status(200).json({ message: 'Comment added successfully!' });
            
            // Handle all background operations asynchronously
            setImmediate(async () => {
                try {
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

                    // Add notifications asynchronously
                    const notificationPromises = [];
                    
                    if (req.user.uid !== ticketData.reporter_id) {
                        notificationPromises.push(
                            notificationsCollection.add({
                                userId: ticketData.reporter_id,
                                message: `New comment on your ticket ${ticketData.display_id} by ${commenter_name}.`,
                                type: 'new_comment_on_my_ticket',
                                read: false,
                                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                ticketId: ticketId
                            })
                        );
                    }

                    if (ticketData.assigned_to_id && req.user.uid !== ticketData.assigned_to_id) {
                        notificationPromises.push(
                            notificationsCollection.add({
                                userId: ticketData.assigned_to_id,
                                message: `New comment on assigned ticket ${ticketData.display_id} by ${commenter_name}.`,
                                type: 'new_comment_on_assigned_ticket',
                                read: false,
                                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                                ticketId: ticketId
                            })
                        );
                    }
                    
                    // Execute all notifications in parallel
                    await Promise.allSettled(notificationPromises);

                    // Handle email sending in background
                    const reporterEmail = ticketData.reporter_email;
                    const requestForEmail = ticketData.request_for_email;
                    const assignedToEmail = ticketData.assigned_to_email;
                    const commenterEmail = commenter_name;
                    const baseUrl = getBaseUrl(req);
                    const ticketLink = `${baseUrl}/tickets/${ticketId}`;
                    
                    // Check if action is performed by engineer
                    const isEngineerAction = ['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role);
                    
                    if (isEngineerAction) {
                        // Engineer action: To = request_for_email/reporter_email, CC = process.env.DISTRIBUTION_EMAIL + assigned engineer
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
                        
                        let ccList = [process.env.DISTRIBUTION_EMAIL];
                        if (assignedToEmail) {
                            ccList.push(assignedToEmail);
                        }
                        
                        emailService.sendTicketCommentEmail({
                            toEmail: toList.join(','),
                            ccEmail: ccList.join(','),
                            display_id: ticketData.display_id,
                            short_description: ticketData.short_description,
                            comment_text: comment_text,
                            commenterEmail: commenterEmail,
                            ticketUrl: ticketLink
                        });
                    } else {
                        // Non-engineer action: To = process.env.DISTRIBUTION_EMAIL + assigned engineer, CC = request_for_email/reporter_email
                        let toList = [process.env.DISTRIBUTION_EMAIL];
                        
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
                    }
                } catch (error) {
                    console.error('Background comment processing error:', error);
                }
            });
        } catch (error) {
            console.error(`Error adding comment: ${error.message}`);
            return res.status(500).json({ error: `Error adding comment: ${error.message}` });
        }
    });

    // --- Add Note to Ticket (Engineer/Support only) ---
    router.post('/:ticket_id/add_note', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const ticketId = req.params.ticket_id;
        const { note_text, note_type = 'internal' } = req.body;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        if (!note_text || note_text.trim() === '') {
            return res.status(400).json({ error: 'Note text cannot be empty!' });
        }

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            const ticketData = ticketDoc.data();

            // For site admin users, check if they can access this ticket based on company
            if (authenticatedUserRole === 'site_admin') {
                if (req.user.client_name && ticketData.client_name !== req.user.client_name) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to add notes to tickets from other companies.' });
                }
            }

            // Get user data for storing name information
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

            const newNote = {
                text: note_text.trim(),
                author: userName,
                author_email: req.user.email,
                author_id: authenticatedUid,
                note_type: note_type, // 'internal', 'technical', 'escalation', etc.
                timestamp: new Date(),
                created_at: new Date()
            };

            await ticketsCollection.doc(ticketId).update({
                notes: admin.firestore.FieldValue.arrayUnion(newNote),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log note addition activity
            await logCommentAdded(db, ticketId, userName, req.user.email, `[INTERNAL NOTE] ${note_text}`, { 
                ...ticketData, 
                ticket_display_id: ticketData.display_id,
                note_type: note_type 
            });

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, id: ticketId });

            return res.status(200).json({ 
                message: 'Note added successfully!', 
                note: {
                    ...newNote,
                    timestamp: newNote.created_at.toISOString()
                }
            });
        } catch (error) {
            console.error(`Error adding note: ${error.message}`);
            return res.status(500).json({ error: `Error adding note: ${error.message}` });
        }
    });

    // --- Update Note in Ticket (Engineer/Support only) ---
    router.patch('/:ticket_id/notes/:note_index', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const ticketId = req.params.ticket_id;
        const noteIndex = parseInt(req.params.note_index);
        const { note_text, note_type } = req.body;
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        if (isNaN(noteIndex) || noteIndex < 0) {
            return res.status(400).json({ error: 'Invalid note index!' });
        }

        if (!note_text || note_text.trim() === '') {
            return res.status(400).json({ error: 'Note text cannot be empty!' });
        }

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            const ticketData = ticketDoc.data();

            // For site admin users, check if they can access this ticket based on company
            if (authenticatedUserRole === 'site_admin') {
                if (req.user.client_name && ticketData.client_name !== req.user.client_name) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to edit notes for tickets from other companies.' });
                }
            }

            if (!ticketData.notes || !Array.isArray(ticketData.notes) || noteIndex >= ticketData.notes.length) {
                return res.status(404).json({ error: 'Note not found!' });
            }

            const note = ticketData.notes[noteIndex];

            // Only allow the note author or admin/super_admin to edit
            if (note.author_id !== authenticatedUid && !['admin', 'super_admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: You can only edit your own notes!' });
            }

            // Get user data for storing name information
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

            const updatedNote = {
                ...note,
                text: note_text.trim(),
                note_type: note_type || note.note_type,
                updated_by: userName,
                updated_by_email: req.user.email,
                updated_at: new Date()
            };

            // Update the specific note in the array
            const updatedNotes = [...ticketData.notes];
            updatedNotes[noteIndex] = updatedNote;

            await ticketsCollection.doc(ticketId).update({
                notes: updatedNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log note update activity
            await logCommentAdded(db, ticketId, userName, req.user.email, `[INTERNAL NOTE UPDATED] ${note_text}`, { 
                ...ticketData, 
                ticket_display_id: ticketData.display_id,
                note_type: note_type || note.note_type 
            });

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, id: ticketId });

            return res.status(200).json({ 
                message: 'Note updated successfully!', 
                note: {
                    ...updatedNote,
                    timestamp: updatedNote.created_at.toISOString(),
                    updated_at: updatedNote.updated_at.toISOString()
                }
            });
        } catch (error) {
            console.error(`Error updating note: ${error.message}`);
            return res.status(500).json({ error: `Error updating note: ${error.message}` });
        }
    });

    // --- Delete Note from Ticket (Engineer/Support only) ---
    router.delete('/:ticket_id/notes/:note_index', verifyFirebaseToken, checkRole(['support', 'admin', 'super_admin', 'site_admin']), async (req, res) => {
        const ticketId = req.params.ticket_id;
        const noteIndex = parseInt(req.params.note_index);
        const authenticatedUid = req.user.uid;
        const authenticatedUserRole = req.user.role;

        if (isNaN(noteIndex) || noteIndex < 0) {
            return res.status(400).json({ error: 'Invalid note index!' });
        }

        try {
            const ticketDoc = await ticketsCollection.doc(ticketId).get();
            if (!ticketDoc.exists) {
                return res.status(404).json({ error: 'Ticket not found.' });
            }

            const ticketData = ticketDoc.data();

            // For site admin users, check if they can access this ticket based on company
            if (authenticatedUserRole === 'site_admin') {
                if (req.user.client_name && ticketData.client_name !== req.user.client_name) {
                    return res.status(403).json({ error: 'Forbidden: You do not have permission to delete notes from tickets from other companies.' });
                }
            }

            if (!ticketData.notes || !Array.isArray(ticketData.notes) || noteIndex >= ticketData.notes.length) {
                return res.status(404).json({ error: 'Note not found!' });
            }

            const note = ticketData.notes[noteIndex];

            // Only allow the note author or admin/super_admin to delete
            if (note.author_id !== authenticatedUid && !['admin', 'super_admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: You can only delete your own notes!' });
            }

            // Get user data for storing name information
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

            // Remove the note from the array
            const updatedNotes = ticketData.notes.filter((_, index) => index !== noteIndex);

            await ticketsCollection.doc(ticketId).update({
                notes: updatedNotes,
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Log note deletion activity
            await logCommentAdded(db, ticketId, userName, req.user.email, `[INTERNAL NOTE DELETED] ${note.text}`, { 
                ...ticketData, 
                ticket_display_id: ticketData.display_id,
                note_type: note.note_type 
            });

            // Trigger analytics update for real-time reports
            await triggerAnalyticsUpdate('updated', { ...ticketData, id: ticketId });

            return res.status(200).json({ message: 'Note deleted successfully!' });
        } catch (error) {
            console.error(`Error deleting note: ${error.message}`);
            return res.status(500).json({ error: `Error deleting note: ${error.message}` });
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
                const exactIdMatch = `TT${searchKeyword.toUpperCase().padStart(6, '0')}`;
                const exactIdMatchQuery = ticketsCollection
                    .where('reporter_id', '==', userId)
                    .where('display_id', '==', exactIdMatch)
                    .limit(10); // OPTIMIZED: Limit exact searches
                const exactIdMatchSnapshot = await exactIdMatchQuery.get();
                if (!exactIdMatchSnapshot.empty) {
                    return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => {
                        const ticketData = doc.data();
                        // Filter out notes for regular users - only engineers/support can see notes
                        if (!['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role)) {
                            delete ticketData.notes;
                        }
                        return jsonSerializableTicket(doc.id, ticketData);
                    }));
                }
            }

            // OPTIMIZED: Apply limit to prevent excessive reads
            const snapshot = await query.orderBy('created_at', 'desc').limit(limit).get();
            const tickets = snapshot.docs.map(doc => {
                const ticketData = doc.data();
                // Filter out notes for regular users - only engineers/support can see notes
                if (!['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role)) {
                    delete ticketData.notes;
                }
                return jsonSerializableTicket(doc.id, ticketData);
            });
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
                const exactIdMatch = `TT${searchKeyword.toUpperCase().padStart(6, '0')}`;
                let exactIdMatchQuery = ticketsCollection.where('display_id', '==', exactIdMatch);
                
                // Apply company filtering for site admin users in exact match query
                if (req.user.role === 'site_admin' && req.user.client_name) {
                    exactIdMatchQuery = exactIdMatchQuery.where('client_name', '==', req.user.client_name);
                }
                
                const exactIdMatchSnapshot = await exactIdMatchQuery.limit(10).get(); // OPTIMIZED: Limit exact searches
                if (!exactIdMatchSnapshot.empty) {
                    return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => {
                        const ticketData = doc.data();
                        // Filter out notes for regular users - only engineers/support can see notes
                        if (!['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role)) {
                            delete ticketData.notes;
                        }
                        return jsonSerializableTicket(doc.id, ticketData);
                    }));
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
            const tickets = snapshot.docs.map(doc => {
                const ticketData = doc.data();
                // Filter out notes for regular users - only engineers/support can see notes
                if (!['support', 'admin', 'super_admin', 'site_admin'].includes(req.user.role)) {
                    delete ticketData.notes;
                }
                return jsonSerializableTicket(doc.id, ticketData);
            });
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

            // Filter out notes for regular users - only engineers/support can see notes
            const filteredTicketData = { ...ticketData };
            if (!['support', 'admin', 'super_admin', 'site_admin'].includes(authenticatedUserRole)) {
                delete filteredTicketData.notes;
            }

            return res.status(200).json(jsonSerializableTicket(ticketDoc.id, filteredTicketData));
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