// ticketing-tool-backend/server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Required for file uploads
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 5000;

// --- Firebase Firestore & Auth Configuration ---
// IMPORTANT: Adjust the path to your serviceAccountKey.json if necessary.
// For production, consider using environment variables for the key content directly
// instead of a file for better security.
const SERVICE_ACCOUNT_KEY_PATH = '../serviceAccountKey.json'; // Adjust this path!

let db;
let usersCollection;
let ticketsCollection;
let dbConnected = false; // Flag to track database connection status

try {
    // Initialize Firebase Admin SDK only once
    if (!admin.apps.length) { // Check if Firebase app is already initialized
        const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // Add storageBucket for Firebase Storage integration
            // IMPORTANT: This is hardcoded for debugging. In production, use environment variables.
            // The correct format is your-project-id.appspot.com (e.g., 'it-ticketing-tool-dd679.appspot.com')
            storageBucket: 'it-ticketing-tool-dd679.firebasestorage.app'
        });
    }
    db = admin.firestore(); // Get a Firestore client
    usersCollection = db.collection('users'); // Collection for user roles
    ticketsCollection = db.collection('tickets'); // Reference to your 'tickets' collection
    console.log("Connected to Firebase Firestore successfully!");
    dbConnected = true;
} catch (error) {
    console.error(`Error connecting to Firebase Firestore. Make sure '${SERVICE_ACCOUNT_KEY_PATH}' is correct and accessible: ${error.message}`);
    dbConnected = false;
    // In a production app, you'd want more robust error handling here,
    // possibly exiting the process if the database connection is critical.
}

// Middleware
app.use(cors()); // Enable CORS for all routes (for development, restrict in production)
app.use(express.json()); // For parsing application/json request bodies

// --- Constants for Ticket Fields ---
const validTicketCategories = ['software', 'hardware', 'troubleshoot'];
// Added 'Hold' status
const validTicketPriorities = ['Low', 'Medium', 'High', 'Critical'];
const validTicketStatuses = ['Open', 'In Progress', 'Hold', 'Resolved', 'Closed'];

// --- Helper function: JSON Serializable Ticket ---
// Converts Firestore Timestamp objects and adds document ID
function jsonSerializableTicket(docId, ticketData) {
    if (!ticketData) return null;

    const data = { ...ticketData, id: docId }; // Add document ID

    // Convert Firestore Timestamp objects to ISO 8601 strings
    if (data.created_at && data.created_at.toDate) {
        data.created_at = data.created_at.toDate().toISOString();
    }
    if (data.updated_at && data.updated_at.toDate) {
        data.updated_at = data.updated_at.toDate().toISOString();
    }
    if (data.due_date && data.due_date.toDate) { // Assuming a due_date might exist
        data.due_date = data.due_date.toDate().toISOString();
    }
    if (data.resolved_at && data.resolved_at.toDate) { // New: resolved_at
        data.resolved_at = data.resolved_at.toDate().toISOString();
    }
    // Ensure comments are correctly serialized, especially timestamps
    if (data.comments && Array.isArray(data.comments)) {
        data.comments = data.comments.map(comment => {
            if (comment.timestamp && comment.timestamp.toDate) {
                return { ...comment, timestamp: comment.timestamp.toDate().toISOString() };
            }
            return comment;
        });
    }
    return data;
}

// --- Middleware to check DB connection ---
const checkDbConnection = (req, res, next) => {
    if (!dbConnected) {
        return res.status(500).json({ error: 'Database connection not established.' });
    }
    next();
};
app.use(checkDbConnection); // Apply this middleware to all routes

// --- Helper for generating a simple display ID ---
async function generateDisplayId() {
    // Note: Using `orderBy('created_at', 'desc').limit(1)` is generally suitable for small to medium scale.
    // For very high-volume systems, a distributed counter or a dedicated ID generation service might be needed.
    const lastTicketQuery = await ticketsCollection.orderBy('created_at', 'desc').limit(1).get();
    let nextIdNum = 1;
    if (!lastTicketQuery.empty) {
        const lastTicket = lastTicketQuery.docs[0].data();
        const lastDisplayId = lastTicket.display_id;
        if (lastDisplayId && lastDisplayId.startsWith('TICKET-')) {
            const numPart = parseInt(lastDisplayId.split('-')[1]);
            if (!isNaN(numPart)) {
                nextIdNum = numPart + 1;
            }
        }
    }
    return `TICKET-${String(nextIdNum).padStart(5, '0')}`;
}

// --- Middleware to verify Firebase ID token for protected routes ---
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No authentication token provided or invalid format.' });
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Attach user info (uid, email, etc.) to request object
        next(); // Proceed to the next middleware/route handler
    } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(403).json({ message: 'Unauthorized: Invalid or expired token.' });
    }
};

// --- New Endpoint: Get Ticket Summary Counts ---
// @route   GET /tickets/summary-counts
// @desc    Get counts of active, assigned-to-me, and total tickets.
// @access  Private (requires token)
app.get('/tickets/summary-counts', verifyFirebaseToken, async (req, res) => {
    const authenticatedUid = req.user.uid;
    const authenticatedUserRole = (await usersCollection.doc(authenticatedUid).get()).data().role;

    try {
        // Query for active tickets (Open, In Progress, Hold)
        let activeTicketsQuery = ticketsCollection.where('status', 'in', ['Open', 'In Progress', 'Hold']);

        // Query for tickets assigned to the current user (only relevant for support)
        let assignedToMeTicketsQuery = ticketsCollection.where('assigned_to_id', '==', authenticatedUid);

        // Query for all tickets (including resolved and closed)
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
// @route   GET /tickets/status-summary
// @desc    Get counts of tickets by each status (e.g., Open: 5, In Progress: 3).
// @access  Private (requires token)
app.get('/tickets/status-summary', verifyFirebaseToken, async (req, res) => {
    try {
        const snapshot = await ticketsCollection.get();
        const statusCounts = {};

        // Initialize counts for all valid statuses to 0
        validTicketStatuses.forEach(status => {
            statusCounts[status] = 0;
        });

        snapshot.forEach(doc => {
            const ticketData = doc.data();
            const status = ticketData.status;
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                // Handle cases where a ticket might have an invalid/unexpected status
                console.warn(`Ticket ${doc.id} has an unrecognized status: ${status}.`);
                // Optionally, you might want to count these under an 'Other' category
                // statusCounts['Other'] = (statusCounts['Other'] || 0) + 1;
            }
        });

        return res.status(200).json(statusCounts);
    } catch (error) {
        console.error(`Error fetching ticket status summary: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch ticket status summary: ${error.message}` });
    }
});


// --- Routes ---

// @route   POST /register
// @desc    Register a new user with Firebase Auth and store role in Firestore
// @access  Public
app.post('/register', async (req, res) => {
    const { email, password, role = 'user' } = req.body; // Default role is 'user'

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required!' });
    }

    if (!['user', 'support'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
    }

    try {
        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });
        console.log(`Firebase Auth user created: ${userRecord.uid}`);

        // Store user role in Firestore 'users' collection using UID as document ID
        await usersCollection.doc(userRecord.uid).set({ email: email, role: role });
        console.log(`Firestore user profile created for ${userRecord.uid} with role ${role}`);

        return res.status(201).json({ message: `User ${email} registered successfully!`, user_id: userRecord.uid });
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        console.error(`Registration error: ${error.message}`);
        return res.status(500).json({ error: `Error registering user: ${error.message}` });
    }
});

// @route   POST /login
// @desc    Verify Firebase ID Token and retrieve user's role from Firestore
// @access  Public
app.post('/login', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header with Bearer token is required!' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
        // Verify the ID token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const emailFromToken = decodedToken.email || '';

        console.log(`ID Token verified for UID: ${uid}, Email: ${emailFromToken}`);

        // Retrieve user role from Firestore based on the verified UID
        const userDoc = await usersCollection.doc(uid).get();

        if (!userDoc.exists) {
            console.log(`User profile for UID ${uid} not found in Firestore.`);
            return res.status(404).json({ error: 'User profile not found in database. Please contact support.' });
        }

        const userProfile = userDoc.data();
        const loggedInUser = {
            id: uid,
            email: emailFromToken,
            role: userProfile.role || 'user'
        };
        console.log(`Login successful for user: ${loggedInUser}`);
        return res.status(200).json({ message: 'Login successful', user: loggedInUser });
    } catch (error) {
        if (error.code === 'auth/invalid-id-token' || error.code === 'auth/id-token-expired') {
            console.error(`Invalid ID Token error: ${error.message}`);
            return res.status(401).json({ error: 'Invalid or expired authentication token. Please log in again.' });
        }
        console.error(`Unexpected login error: ${error.message}`);
        return res.status(500).json({ error: `An unexpected error occurred during login: ${error.message}` });
    }
});


// --- Get User Profile ---
// @route GET /profile/:userId
// @desc Get user profile details (email, role).
// @access Private (requires token)
app.get('/profile/:userId', verifyFirebaseToken, async (req, res) => {
    const requestedUid = req.params.userId;
    const authenticatedUid = req.user.uid; // UID from the verified token

    // Ensure the authenticated user is requesting their own profile
    if (requestedUid !== authenticatedUid) {
        return res.status(403).json({ error: 'Unauthorized: You can only view your own profile.' });
    }

    try {
        const userDoc = await usersCollection.doc(requestedUid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        const profileData = userDoc.data();
        return res.status(200).json({ uid: requestedUid, email: profileData.email, role: profileData.role });
    } catch (error) {
        console.error(`Error fetching user profile for ${requestedUid}: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch user profile: ${error.message}` });
    }
});

// --- New Route: Create a new ticket ---
// @route   POST /tickets
// @desc    Create a new ticket.
// @access  Private (requires token)
app.post('/tickets', verifyFirebaseToken, async (req, res) => {
    const {
        request_for_email, // Email of the person the ticket is for
        category,
        short_description,
        long_description = '',
        contact_number,
        priority,
        hostname_asset_id,
        // Expect attachments to be an array of objects: [{ url: '...', fileName: '...' }]
        attachments = []
    } = req.body;

    // Get reporter info from authenticated user
    const reporterId = req.user.uid;
    const reporterEmail = req.user.email;

    // 1. Validate mandatory fields
    if (!request_for_email || !category || !short_description || !contact_number || !hostname_asset_id) { // Priority now has a default
        return res.status(400).json({ error: 'Missing mandatory ticket fields.' });
    }

    // 2. Validate field formats/constraints
    if (short_description.length > 250) {
        return res.status(400).json({ error: 'Short description exceeds 250 character limit.' });
    }
    if (!validTicketCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category specified.' });
    }
    // Priority is handled below by setting a default
    // if (!validTicketPriorities.includes(priority)) {
    //     return res.status(400).json({ error: 'Invalid priority specified.' });
    // }
    // Basic email format validation for request_for_email
    if (!/^\S+@\S+\.\S+$/.test(request_for_email)) {
         return res.status(400).json({ error: 'Invalid email format for "Request for".' });
    }
    // TODO: If needed, implement logic to restrict 'request_for_email' to the same company domain.
    // This would typically involve fetching user domains or a pre-approved list.

    try {
        const newDisplayId = await generateDisplayId(); // Generate unique display ID

        const newTicket = {
            display_id: newDisplayId,
            reporter_id: reporterId,
            reporter_email: reporterEmail,
            request_for_email: request_for_email,
            category: category,
            short_description: short_description,
            long_description: long_description,
            contact_number: contact_number,
            priority: priority || 'Low', // Set default priority if not provided
            hostname_asset_id: hostname_asset_id,
            status: 'Open', // Default status for new tickets
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            comments: [],
            attachments: attachments, // Store attachment objects with url and fileName
            assigned_to_id: null,
            assigned_to_email: null,
            resolved_at: null, // New field for time spent calculation
            time_spent_minutes: null, // New field for time spent calculation
        };

        const docRef = await ticketsCollection.add(newTicket);
        console.log(`New ticket created with ID: ${docRef.id}`);

        // TODO: Implement email alert logic here (requires external email service integration)
        // Example: sendEmailAlert(reporterEmail, 'Ticket Created', `Your ticket ${newDisplayId} has been created.`);

        return res.status(201).json({ message: 'Ticket created successfully!', id: docRef.id, display_id: newDisplayId  });
    } catch (error) {
        console.error(`Error creating ticket: ${error.message}`);
        return res.status(500).json({ error: `Error creating ticket: ${error.message}` });
    }
});

// --- Update an existing ticket ---
// @route   PATCH /ticket/:ticket_id
// @desc    Update a ticket.
// @access  Private (requires token)
app.patch('/ticket/:ticket_id', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const {
        status,
        assigned_to_email,
        priority,
        short_description,
        long_description,
        contact_number,
        attachments // Now expecting an array of objects: [{ url: '...', fileName: '...' }]
    } = req.body;

    const authenticatedUid = req.user.uid;
    const authenticatedUserRole = (await usersCollection.doc(authenticatedUid).get()).data().role;

    // Validate incoming fields
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

        // Prevent updates by users if ticket is Resolved or Closed
        if (['Resolved', 'Closed'].includes(ticketData.status) && authenticatedUserRole === 'user') {
            return res.status(403).json({ error: 'Forbidden: Cannot update a resolved or closed ticket as a regular user.' });
        }

        // Support users can update resolved/closed tickets (e.g., re-open them)
        // Regular users can only update their own tickets if they are not resolved/closed
        if (authenticatedUserRole === 'user' && ticketData.reporter_id !== authenticatedUid) {
            return res.status(403).json({ error: 'Forbidden: You can only update your own tickets.' });
        }


        const updateData = {
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Apply general updates
        if (priority !== undefined) updateData.priority = priority;
        if (short_description !== undefined) updateData.short_description = short_description;
        if (long_description !== undefined) updateData.long_description = long_description;
        if (contact_number !== undefined) updateData.contact_number = contact_number;

        // --- MODIFICATION START ---
        // If the frontend sends an 'attachments' array (now expected to be objects),
        // we use arrayUnion to add new ones.
        // This is safer than direct assignment which would overwrite previous attachments.
        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            // Validate that each attachment object has 'url' and 'fileName'
            const validNewAttachments = attachments.filter(att => att && typeof att.url === 'string' && typeof att.fileName === 'string');
            if (validNewAttachments.length > 0) {
                updateData.attachments = admin.firestore.FieldValue.arrayUnion(...validNewAttachments);
            } else if (attachments.length > 0) { // If attachments array was provided but no valid attachments found
                console.warn('Received attachments array but no valid {url, fileName} objects found.');
                // Optionally return an error or just ignore invalid entries
            }
        }
        // --- MODIFICATION END ---


        // Handle status change and time_spent calculation
        if (status && status !== ticketData.status) {
            updateData.status = status;

            // If status changes to Resolved or Closed, record resolved_at and calculate time_spent
            if (['Resolved', 'Closed'].includes(status)) {
                updateData.resolved_at = admin.firestore.FieldValue.serverTimestamp();
                if (ticketData.created_at && ticketData.created_at.toDate) {
                    const createdAt = ticketData.created_at.toDate();
                    const resolvedAt = new Date(); // Use current server time for resolution
                    const timeDiffMillis = resolvedAt.getTime() - createdAt.getTime();
                    const timeSpentMinutes = Math.round(timeDiffMillis / (1000 * 60)); // Convert milliseconds to minutes
                    updateData.time_spent_minutes = timeSpentMinutes;
                }
            } else if (['Resolved', 'Closed'].includes(ticketData.status) && !['Resolved', 'Closed'].includes(status)) {
                // If ticket is moved OUT of Resolved/Closed status, clear resolved_at and time_spent
                updateData.resolved_at = null;
                updateData.time_spent_minutes = null;
            }
        }

        // Handle assignment logic
        if (assigned_to_email !== undefined) {
            if (authenticatedUserRole !== 'support') { // Only support can assign/unassign
                return res.status(403).json({ error: 'Forbidden: Only support associates can assign tickets.' });
            }
            if (assigned_to_email === null || assigned_to_email === '') { // Unassign
                updateData.assigned_to_id = null;
                updateData.assigned_to_email = null;
            } else {
                // Check if the assigned_to_email corresponds to a 'support' user
                const userQuery = await usersCollection.where('email', '==', assigned_to_email).limit(1).get();
                if (userQuery.empty) {
                    return res.status(404).json({ error: 'Assigned user email not found.' });
                }
                const assignedUserDoc = userQuery.docs[0];
                const assignedUserData = assignedUserDoc.data();
                if (assignedUserData.role !== 'support') {
                    return res.status(400).json({ error: 'User cannot be assigned as they are not a support associate.' });
                }
                updateData.assigned_to_id = assignedUserDoc.id;
                updateData.assigned_to_email = assigned_to_email;
            }
        }

        await ticketsCollection.doc(ticketId).update(updateData);
        console.log(`Ticket ${ticketId} updated successfully!`);
        return res.status(200).json({ message: 'Ticket updated successfully!' });
    } catch (error) {
        console.error(`Error updating ticket: ${error.message}`);
        return res.status(500).json({ error: `Error updating ticket: ${error.message}` });
    }
});


// @route   POST /ticket/:ticket_id/add_comment
// @desc    Add a comment to a ticket.
// @access  Private (requires token)
app.post('/ticket/:ticket_id/add_comment', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const { comment_text, commenter_name = req.user.email } = req.body; // Default commenter to user's email

    if (!comment_text) {
        return res.status(400).json({ error: 'Comment text cannot be empty!' });
    }

    try {
        const ticketDoc = await ticketsCollection.doc(ticketId).get();
        if (!ticketDoc.exists) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticketData = ticketDoc.data();
        // Prevent adding comments to resolved or closed tickets
        if (['Resolved', 'Closed'].includes(ticketData.status)) {
            return res.status(403).json({ error: 'Cannot add comments to a resolved or closed ticket.' });
        }

        const newComment = {
            text: comment_text,
            commenter: commenter_name,
            timestamp: new Date() // Firestore server timestamp
        };

        await ticketsCollection.doc(ticketId).update({
            comments: admin.firestore.FieldValue.arrayUnion(newComment),
            updated_at: admin.firestore.FieldValue.serverTimestamp() // Update ticket's updated_at
        });
        console.log(`Comment added to ticket ${ticketId} by ${commenter_name}`);
        return res.status(200).json({ message: 'Comment added successfully!' });
    } catch (error) {
        console.error(`Error adding comment: ${error.message}`);
        return res.status(500).json({ error: `Error adding comment: ${error.message}` });
    }
});

// --- Get My Tickets ---
// @route   GET /tickets/my
// @desc    Get tickets created by the authenticated user.
// @access  Private (requires token)
app.get('/tickets/my', verifyFirebaseToken, async (req, res) => {
    const userId = req.query.userId; // User whose tickets are being requested
    const authenticatedUid = req.user.uid; // User from the token
    const searchKeyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';

    if (userId !== authenticatedUid) {
        return res.status(403).json({ error: 'Unauthorized: You can only view your own tickets.' });
    }

    try {
        let query = ticketsCollection.where('reporter_id', '==', userId);

        // Default filter for 'My Tickets': exclude Resolved and Closed tickets
        query = query.where('status', 'in', ['Open', 'In Progress', 'Hold']);

        if (searchKeyword) {
            // For exact display_id search, we check here, including closed tickets if matched.
            // This allows searching for closed tickets by ID within 'My Tickets'.
            const exactIdMatch = `TICKET-${searchKeyword.toUpperCase().padStart(5, '0')}`;
            const exactIdMatchQuery = ticketsCollection
                .where('reporter_id', '==', userId)
                .where('display_id', '==', exactIdMatch);
            const exactIdMatchSnapshot = await exactIdMatchQuery.get();
            if (!exactIdMatchSnapshot.empty) {
                // If an exact ID matches, return only that ticket, even if it's closed/resolved.
                return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data())));
            }
            // If no exact ID match for a closed ticket, then the default query (excluding closed) applies.
        }

        const snapshot = await query.orderBy('created_at', 'desc').get();
        const tickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));
        return res.status(200).json(tickets);
    } catch (error) {
        console.error(`Error fetching my tickets for ${userId}: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch your tickets: ${error.message}` });
    }
});

// --- Get All Tickets (for support users) ---
// @route   GET /tickets/all
// @desc    Get all tickets in the system.
// @access  Private (requires support role)
app.get('/tickets/all', verifyFirebaseToken, async (req, res) => {
    const authenticatedUserRole = (await usersCollection.doc(req.user.uid).get()).data().role;
    const filterStatus = req.query.status;
    const filterAssignment = req.query.assignment;
    const searchKeyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';

    if (authenticatedUserRole !== 'support') {
        return res.status(403).json({ error: 'Forbidden: Only support associates can view all tickets.' });
    }

    try {
        let query = ticketsCollection; // Start with fetching ALL tickets by default

        if (searchKeyword) {
            // Check for exact display_id match first, including closed/resolved tickets
            const exactIdMatch = `TICKET-${searchKeyword.toUpperCase().padStart(5, '0')}`;
            const exactIdMatchQuery = ticketsCollection.where('display_id', '==', exactIdMatch);
            const exactIdMatchSnapshot = await exactIdMatchQuery.get();
            if (!exactIdMatchSnapshot.empty) {
                return res.status(200).json(exactIdMatchSnapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data())));
            }
            // If no exact ID match, proceed to general filtering.
        }

        // Apply status filter if provided. If filterStatus is empty, NO status filter is applied, returning all tickets.
        if (filterStatus) {
            if (!validTicketStatuses.includes(filterStatus)) {
                return res.status(400).json({ error: 'Invalid status filter.' });
            }
            query = query.where('status', '==', filterStatus);
        }
        // Removed the 'else' block that previously filtered out Resolved/Closed tickets by default
        // This ensures that if no status filter is applied, all tickets (active, resolved, closed) are returned.


        // Apply assignment filter
        if (filterAssignment === 'unassigned') {
            query = query.where('assigned_to_email', '==', null);
        } else if (filterAssignment === 'assigned_to_me') {
            query = query.where('assigned_to_id', '==', req.user.uid);
        }

        const snapshot = await query.orderBy('created_at', 'desc').get();
        const tickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));
        return res.status(200).json(tickets);
    } catch (error) {
        console.error(`Error fetching all tickets: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch all tickets: ${error.message}` });
    }
});


// --- New Route: Get Ticket Details ---
// @route   GET /ticket/:ticket_id
// @desc    Get details of a specific ticket.
// @access  Private (requires token and proper authorization)
app.get('/ticket/:ticket_id', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const authenticatedUid = req.user.uid;
    const authenticatedUserRole = (await usersCollection.doc(authenticatedUid).get()).data().role;

    try {
        const ticketDoc = await ticketsCollection.doc(ticketId).get();

        if (!ticketDoc.exists) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticketData = ticketDoc.data();

        // Authorization check: Only reporter or support associate can view
        if (ticketData.reporter_id !== authenticatedUid && authenticatedUserRole !== 'support') {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket.' });
        }

        return res.status(200).json(jsonSerializableTicket(ticketDoc.id, ticketData));
    }
    catch (error) {
        console.error(`Error fetching ticket ${ticketId}: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch ticket details: ${error.message}` });
    }
});


// --- New Route: Export all tickets to CSV ---
// @route   GET /tickets/export
// // @desc    Export all tickets (including closed/resolved) to CSV based on duration.
// @access  Private (requires support role)
app.get('/tickets/export', verifyFirebaseToken, async (req, res) => {
    const authenticatedUserRole = (await usersCollection.doc(req.user.uid).get()).data().role;
    if (authenticatedUserRole !== 'support') {
        return res.status(403).json({ error: 'Forbidden: Only support associates can export tickets.' });
    }

    const { start_date, end_date } = req.query; // Optional date range

    try {
        let query = ticketsCollection.orderBy('created_at', 'asc');

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
                // To include records up to the end of the end_date, set time to end of day
                endDateObj.setHours(23, 59, 59, 999);
                query = query.where('created_at', '<=', admin.firestore.Timestamp.fromDate(endDateObj));
            } else {
                return res.status(400).json({ error: 'Invalid end_date format.' });
            }
        }

        const snapshot = await query.get();
        const allTickets = snapshot.docs.map(doc => jsonSerializableTicket(doc.id, doc.data()));

        if (allTickets.length === 0) {
            return res.status(404).json({ message: 'No tickets found for the specified criteria.' });
        }

        // CSV Generation Logic
        const headers = [
            "Ticket ID", "Short Description", "Long Description", "Category", "Priority",
            "Status", "Reporter Email", "Requested For Email", "Contact Number",
            "Hostname/Asset ID", "Assigned To Email", "Created At", "Updated At",
            "Resolved At", "Time Spent (Minutes)", "Comments", "Attachments"
        ];
        let csv = headers.join(',') + '\n';

        allTickets.forEach(ticket => {
            const commentsCsv = ticket.comments && Array.isArray(ticket.comments)
                ? ticket.comments.map(c => `[${c.commenter} @ ${c.timestamp}]: ${c.text}`).join('; ').replace(/"/g, '""')
                : '';

            // Handle attachments: map to original fileName if available, otherwise use URL part
            // ... (inside the backend's /tickets/export route)
        

            const row = [
                ticket.display_id || '',
                `"${ticket.short_description ? ticket.short_description.replace(/"/g, '""') : ''}"`, // Enclose with quotes and escape double quotes
                `"${ticket.long_description ? ticket.long_description.replace(/"/g, '""') : ''}"`,
                ticket.category || '',
                ticket.priority || '',
                ticket.status || '',
                ticket.reporter_email || '',
                ticket.request_for_email || '',
                ticket.contact_number || '',
                ticket.hostname_asset_id || '',
                ticket.assigned_to_email || '',
                ticket.created_at || '',
                ticket.updated_at || '',
                ticket.resolved_at || '',
                ticket.time_spent_minutes !== null ? ticket.time_spent_minutes : '',
                `"${commentsCsv}"`,
                //`"${attachmentsCsv}"` // Use the modified attachmentsCsv
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


// --- New Route: Upload Attachment ---
// @route   POST /upload-attachment
// @desc    Uploads a file to Firebase Storage and returns its URL.
// @access  Private (requires token)
// Max 10MB file size, allowed types: PDF, JPG, PNG, Word
app.post('/upload-attachment', verifyFirebaseToken, async (req, res) => {
    if (!admin.storage()) {
        console.error("Firebase Storage not initialized.");
        if (!res.headersSent) {
            return res.status(500).json({ error: "Firebase Storage not configured on the server." });
        }
        return;
    }

    const busboy = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } }); // Max 10MB per file
    const bucket = admin.storage().bucket();

    // This array will store objects like { originalFilename: 'abc.pdf', url: 'https://...', mimetype: '...' }
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

        const { filename: originalFilename, encoding, mimetype } = filenameInfo; // Capture original filename
        const fileExtension = path.extname(originalFilename).toLowerCase();

        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        const allowedExtensions = [
            '.pdf',
            '.jpg',
            '.jpeg',
            '.png',
            '.doc',
            '.docx'
        ];

        const fileUploadPromise = new Promise((resolve, reject) => {
            const isMimeTypeAllowed = mimetype && allowedMimeTypes.includes(mimetype);
            const isExtensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);

            if (!isMimeTypeAllowed && !isExtensionAllowed) {
                file.resume();
                const errorMsg = `File type for ${originalFilename} not allowed. Detected MIME: "${mimetype}", Extension: "${fileExtension}". Allowed types: PDF, JPG, PNG, Word.`;
                return reject(new Error(errorMsg));
            }

            const uniqueFilename = `${uuidv4()}${fileExtension}`;
            const filepath = path.join(os.tmpdir(), uniqueFilename);
            const writeStream = fs.createWriteStream(filepath);

            file.pipe(writeStream);

            writeStream.on('finish', () => {
                // Ensure a unique path in storage, but retain original filename in metadata
                const destination = `attachments/${Date.now()}_${uniqueFilename}`;
                bucket.upload(filepath, {
                    destination: destination,
                    metadata: {
                        contentType: mimetype,
                        metadata: {
                            firebaseStorageDownloadTokens: uuidv4(),
                            uploadedBy: req.user.email,
                            // *** Store the original filename as custom metadata ***
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
                    // *** Push an object with originalFilename and url to the uploads array ***
                    uploads.push({ originalFilename: originalFilename, url: publicUrl, mimetype: mimetype }); //
                    fs.unlink(filepath, () => {});
                    resolve();
                })
                .catch(err => {
                    console.error("Error uploading file to Firebase Storage:", err);
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
            // Using Promise.allSettled to ensure all promises resolve or reject before continuing
            const results = await Promise.allSettled(filePromises);

            const successfulUploads = [];
            const failedUploads = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    // uploads array is populated within the file.on('finish') handler
                    // No need to push again here, just ensure the order might be different.
                    // If you wanted to strictly use results, you'd resolve the full object from the promise
                    // For now, `uploads` array is already populated correctly.
                } else {
                    failedUploads.push(result.reason.message);
                }
            });

            if (failedUploads.length > 0) {
                const errorMessage = `Some files failed to upload: ${failedUploads.join('; ')}`;
                sendResponse(400, { error: errorMessage, files: uploads }); // Return successful uploads along with errors
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
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});