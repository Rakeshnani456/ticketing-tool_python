// ticketing-tool-backend/server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer'); // NEW: Import Nodemailer

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
let notificationsCollection; // NEW: Notifications collection
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
    notificationsCollection = db.collection('notifications'); // NEW: Reference to notifications collection
    console.log("Connected to Firebase Firestore successfully!");
    dbConnected = true;
} catch (error) {
    console.error(`Error connecting to Firebase Firestore. Make sure '${SERVICE_ACCOUNT_KEY_PATH}' is correct and accessible: ${error.message}`);
    dbConnected = false;
    // In a production app, you'd want more robust error handling here,
    // possibly exiting the process if the database connection is critical.
}

// NEW: Nodemailer Transporter Configuration
// Using Gmail for example. For production, use a dedicated email service like SendGrid, Mailgun, etc.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Middleware
app.use(cors()); // Enable CORS for all routes (for development, restrict in production)
app.use(express.json()); // For parsing application/json request bodies

// --- Constants for Ticket Fields ---
const validTicketCategories = ['software', 'hardware', 'troubleshoot'];
// Added 'Hold' status
const validTicketPriorities = ['Low', 'Medium', 'High', 'Critical'];
const validTicketStatuses = ['Open', 'In Progress', 'Hold', 'Resolved', 'Closed'];

// NEW: Valid User Roles
const validUserRoles = ['user', 'support', 'admin'];

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

// NEW Helper function: JSON Serializable Notification
function jsonSerializableNotification(docId, notificationData) {
    if (!notificationData) return null;

    const data = { ...notificationData, id: docId };

    if (data.timestamp && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate().toISOString();
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
        if (lastDisplayId && lastDisplayId.startsWith('RITM')) {
            const numPart = parseInt(lastDisplayId.split('-')[1]);
            if (!isNaN(numPart)) {
                nextIdNum = numPart + 1;
            }
        }
    }
    return `RITM${String(nextIdNum).padStart(5, '0')}`;
}

// --- Middleware to verify Firebase ID token for protected routes ---
// MODIFIED: Fetch user role and attach to req.user
// server.js (excerpt)

// Middleware to verify Firebase ID token
// server.js (Modified verifyFirebaseToken middleware)

// Middleware to verify Firebase ID token and fetch user role
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Authorization header missing or not Bearer token.');
        return res.status(401).json({ error: 'Unauthorized: No token provided or token format is invalid.' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;

        // Fetch user's role from Firestore
        console.log(`Attempting to fetch user document for UID: ${decodedToken.uid}`);
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            console.error(`ERROR: User document NOT found for UID: ${decodedToken.uid}`);
            return res.status(403).json({ error: 'Forbidden: User profile not found.' });
        }

        const userData = userDoc.data();
        console.log(`User data retrieved for ${decodedToken.uid}:`, userData); // Log the full user data

        if (!userData || !userData.role) {
            console.error(`ERROR: Role not found or is empty for user: ${decodedToken.uid}. User data:`, userData);
            return res.status(403).json({ error: 'Forbidden: User role not found.' });
        }

        req.user.role = userData.role;
        console.log(`Successfully set role for ${decodedToken.uid} to: ${req.user.role}`);
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token or fetching user role:', error);
        if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-credential' || error.code === 'auth/id-token-expired') {
             return res.status(401).json({ error: 'Unauthorized: Invalid or expired token. Please log in again.' });
        }
        return res.status(500).json({ error: 'Failed to authenticate token or retrieve user data.' });
    }
};
// Middleware to check if the user has an admin role
const requireAdmin = (req, res, next) => {
    // This assumes req.user.role has been set by verifyFirebaseToken
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
};

// ... then apply these middlewares to your routes
// Example:
// app.get('/admin/users', verifyFirebaseToken, requireAdmin, async (req, res) => {
//     // ... your logic for fetching users, which will now have req.user.role available
// });

// Example for a login route where role is retrieved and token generated
// app.post('/login', async (req, res) => {
//     const { idToken } = req.body; // Token from client after Firebase sign-in
//     try {
//         const decodedToken = await admin.auth().verifyIdToken(idToken);
//         const userDoc = await db.collection('users').doc(decodedToken.uid).get();
//         if (!userDoc.exists) {
//             // If user doesn't exist in Firestore, create basic profile
//             await db.collection('users').doc(decodedToken.uid).set({
//                 email: decodedToken.email,
//                 role: 'user', // Default role for new users
//                 createdAt: admin.firestore.FieldValue.serverTimestamp()
//             });
//             return res.status(200).json({ user: { uid: decodedToken.uid, email: decodedToken.email, role: 'user' } });
//         }
//         const userData = userDoc.data();
//         res.status(200).json({ user: { uid: decodedToken.uid, email: decodedToken.email, role: userData.role } });
//     } catch (error) {
//         console.error("Login endpoint token verification error:", error);
//         res.status(401).json({ error: 'Invalid token or login failed.' });
//     }
// });

// ... then use this middleware for protected routes
// app.get('/admin/users', verifyFirebaseToken, async (req, res) => { ... });

// NEW: Middleware to check user role
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: 'Forbidden: User role not found.' });
        }
        if (roles.includes(req.user.role)) {
            next();
        } else {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions.' });
        }
    };
};

// --- New Endpoint: Get Ticket Summary Counts ---
// @route   GET /tickets/summary-counts
// @desc    Get counts of active, assigned-to-me, and total tickets.
// @access  Private (requires token)
app.get('/tickets/summary-counts', verifyFirebaseToken, async (req, res) => {
    const authenticatedUid = req.user.uid;
    const authenticatedUserRole = req.user.role; // Now available directly from req.user

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

    if (!validUserRoles.includes(role)) { // Use new validUserRoles
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
// @access Private (requires token, self-access or admin role)
// MODIFIED: Allow admin to view any profile
app.get('/profile/:userId', verifyFirebaseToken, async (req, res) => {
    const requestedUid = req.params.userId;
    const authenticatedUid = req.user.uid; // UID from the verified token
    const authenticatedUserRole = req.user.role; // Role from the verified token

    // Allow user to view their own profile, or admin to view any profile
    if (requestedUid !== authenticatedUid && authenticatedUserRole !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized: You can only view your own profile unless you are an admin.' });
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

// NEW: Helper function to send email alerts
async function sendEmailAlert(toEmail, subject, text, html) {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, // Sender address
            to: toEmail, // List of receivers
            subject: subject, // Subject line
            text: text, // Plain text body
            html: html, // HTML body
        };
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${toEmail}`);
    } catch (error) {
        console.error(`Error sending email to ${toEmail}: ${error.message}`);
    }
}


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

        // NEW: Create notifications for relevant users
        const reporterUserRole = req.user.role; // Use role directly from req.user

        if (reporterUserRole === 'user') {
            // Notify the reporter that their ticket has been created
            await notificationsCollection.add({
                userId: reporterId,
                message: `Your ticket ${newDisplayId} - "${short_description}" has been created.`,
                type: 'ticket_created',
                read: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ticketId: docRef.id // Link to the ticket
            });
        }

        // Notify all support and admin users about the new ticket and send email alerts
        const supportAndAdminUsersSnapshot = await usersCollection.where('role', 'in', ['support', 'admin']).get();
        const supportAndAdminUserEmails = supportAndAdminUsersSnapshot.docs.map(doc => doc.data().email);

        for (const userEmail of supportAndAdminUserEmails) {
            const userDocSnapshot = await usersCollection.where('email', '==', userEmail).limit(1).get();
            if (!userDocSnapshot.empty) {
                const userIdToNotify = userDocSnapshot.docs[0].id;
                await notificationsCollection.add({
                    userId: userIdToNotify,
                    message: `New ticket ${newDisplayId} created by ${reporterEmail}: "${short_description}"`,
                    type: 'new_ticket_for_support',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: docRef.id // Link to the ticket
                });

                // NEW: Send email alert
                const emailSubject = `New Ticket Created: ${newDisplayId}`;
                const emailText = `A new ticket has been created by ${reporterEmail}.\n\nTicket ID: ${newDisplayId}\nShort Description: ${short_description}\nCategory: ${category}\nPriority: ${priority || 'Low'}\n\nPlease check the ticketing system for more details.`;
                const emailHtml = `
                    <p>A new ticket has been created by <strong>${reporterEmail}</strong>.</p>
                    <p><strong>Ticket ID:</strong> <strong>${newDisplayId}</strong></p>
                    <p><strong>Short Description:</strong> <strong>${short_description}</strong></p>
                    <p><strong>Category:</strong> ${category}</p>
                    <p><strong>Priority:</strong> ${priority || 'Low'}</p>
                    <p>Please check the ticketing system for more details.</p>
                `;
                await sendEmailAlert(userEmail, emailSubject, emailText, emailHtml);
            }
        }


        return res.status(201).json({ message: 'Ticket created successfully!', id: docRef.id, display_id: newDisplayId  });
    } catch (error) {
        console.error(`Error creating ticket: ${error.message}`);
        return res.status(500).json({ error: `Error creating ticket: ${error.message}` });
    }
});

// --- Update an existing ticket ---
// @route   PATCH /ticket/:ticket_id
// @desc    Update a ticket.
// @access  Private (requires token, support/admin role, or reporter if not resolved/closed)
// MODIFIED: Use req.user.role directly for authorization
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
    const authenticatedUserRole = req.user.role; // Get role directly from req.user

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

        // Prevent updates by 'user' role if ticket is Resolved or Closed
        if (['Resolved', 'Closed'].includes(ticketData.status) && authenticatedUserRole === 'user') {
            return res.status(403).json({ error: 'Forbidden: Cannot update a resolved or closed ticket as a regular user.' });
        }

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
                // NEW: Notify reporter and assigned support user (if any) about status change
                const ticketReporterId = ticketData.reporter_id;
                const ticketReporterEmail = ticketData.reporter_email;
                const ticketAssignedToId = ticketData.assigned_to_id;
                const ticketAssignedToEmail = ticketData.assigned_to_email;

                // Notify reporter
                await notificationsCollection.add({
                    userId: ticketReporterId,
                    message: `Your ticket ${ticketData.display_id} - "${ticketData.short_description}" has been marked as ${status}.`,
                    type: 'ticket_status_update',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });

                // Notify assigned support user if different from current user
                if (ticketAssignedToId && ticketAssignedToId !== authenticatedUid) {
                    await notificationsCollection.add({
                        userId: ticketAssignedToId,
                        message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been marked as ${status}.`,
                        type: 'ticket_status_update_assigned',
                        read: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        ticketId: ticketId
                    });
                }

            } else if (['Resolved', 'Closed'].includes(ticketData.status) && !['Resolved', 'Closed'].includes(status)) {
                // If ticket is moved OUT of Resolved/Closed status, clear resolved_at and time_spent
                updateData.resolved_at = null;
                updateData.time_spent_minutes = null;
                // NEW: Notify reporter and assigned support user (if any) about status change
                const ticketReporterId = ticketData.reporter_id;
                const ticketReporterEmail = ticketData.reporter_email;
                const ticketAssignedToId = ticketData.assigned_to_id;

                 // Notify reporter
                await notificationsCollection.add({
                    userId: ticketReporterId,
                    message: `Your ticket ${ticketData.display_id} - "${ticketData.short_description}" has been re-opened to ${status}.`,
                    type: 'ticket_reopened',
                    read: false,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    ticketId: ticketId
                });

                // Notify assigned support user if different from current user
                if (ticketAssignedToId && ticketAssignedToId !== authenticatedUid) {
                    await notificationsCollection.add({
                        userId: ticketAssignedToId,
                        message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been re-opened to ${status}.`,
                        type: 'ticket_reopened_assigned',
                        read: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        ticketId: ticketId
                    });
                }
            }
        }

        // Handle assignment logic
        if (assigned_to_email !== undefined) {
            // Only support or admin can assign/unassign
            if (!['support', 'admin'].includes(authenticatedUserRole)) {
                return res.status(403).json({ error: 'Forbidden: Only support associates or admins can assign tickets.' });
            }
            if (assigned_to_email === null || assigned_to_email === '') { // Unassign
                updateData.assigned_to_id = null;
                updateData.assigned_to_email = null;
                // NEW: Notify previous assignee if unassigned
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
                // Check if the assigned_to_email corresponds to a 'support' or 'admin' user
                const userQuery = await usersCollection.where('email', '==', assigned_to_email).limit(1).get();
                if (userQuery.empty) {
                    return res.status(404).json({ error: 'Assigned user email not found.' });
                }
                const assignedUserDoc = userQuery.docs[0];
                const assignedUserData = assignedUserDoc.data();
                if (!['support', 'admin'].includes(assignedUserData.role)) {
                    return res.status(400).json({ error: 'User cannot be assigned as they are not a support associate or admin.' });
                }
                updateData.assigned_to_id = assignedUserDoc.id;
                updateData.assigned_to_email = assigned_to_email;

                // NEW: Notify new assignee
                if (assignedUserDoc.id !== authenticatedUid) { // Don't notify if assigning to self
                    await notificationsCollection.add({
                        userId: assignedUserDoc.id,
                        message: `Ticket ${ticketData.display_id} - "${ticketData.short_description}" has been assigned to you.`,
                        type: 'ticket_assigned',
                        read: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        ticketId: ticketId
                    });
                }
                // NEW: Notify previous assignee if assignment changes
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

        // NEW: Create notification for ticket reporter if commenter is different
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

        // NEW: Create notification for assigned support user if commenter is different from them
        // Removed the condition `req.user.uid !== ticketData.reporter_id`
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
            const exactIdMatch = `RITM${searchKeyword.toUpperCase().padStart(5, '0')}`; // Corrected prefix
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

// --- Get All Tickets (for support and admin users) ---
// @route   GET /tickets/all
// @desc    Get all tickets in the system.
// @access  Private (requires support or admin role)
// MODIFIED: Use checkRole middleware
app.get('/tickets/all', verifyFirebaseToken, checkRole(['support', 'admin']), async (req, res) => {
    const filterStatus = req.query.status;
    const filterAssignment = req.query.assignment;
    const searchKeyword = req.query.keyword ? req.query.keyword.toLowerCase() : '';

    try {
        let query = ticketsCollection; // Start with fetching ALL tickets by default

        if (searchKeyword) {
            // Check for exact display_id match first, including closed/resolved tickets
            const exactIdMatch = `RITM${searchKeyword.toUpperCase().padStart(5, '0')}`; // Corrected prefix
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
// MODIFIED: Use req.user.role directly for authorization
app.get('/ticket/:ticket_id', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const authenticatedUid = req.user.uid;
    const authenticatedUserRole = req.user.role; // Get role directly from req.user

    try {
        const ticketDoc = await ticketsCollection.doc(ticketId).get();

        if (!ticketDoc.exists) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticketData = ticketDoc.data();

        // Authorization check: Only reporter, support associate, or admin can view
        if (ticketData.reporter_id !== authenticatedUid && !['support', 'admin'].includes(authenticatedUserRole)) {
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
// @access  Private (requires support or admin role)
// MODIFIED: Use checkRole middleware
app.get('/tickets/export', verifyFirebaseToken, checkRole(['support', 'admin']), async (req, res) => {
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

            const attachmentsCsv = ticket.attachments && Array.isArray(ticket.attachments)
                ? ticket.attachments.map(att => att.fileName || att.url).join('; ').replace(/"/g, '""')
                : '';

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
                `"${attachmentsCsv}"` // Use the modified attachmentsCsv
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

// NEW: Get notifications for the authenticated user
// @route   GET /notifications/my
// @desc    Get notifications for the authenticated user.
// @access  Private (requires token)
app.get('/notifications/my', verifyFirebaseToken, async (req, res) => {
    const authenticatedUid = req.user.uid;
    try {
        const snapshot = await notificationsCollection
            .where('userId', '==', authenticatedUid)
            .orderBy('timestamp', 'desc')
            .limit(20) // Limit to a reasonable number of recent notifications
            .get();

        const notifications = snapshot.docs.map(doc => jsonSerializableNotification(doc.id, doc.data()));
        return res.status(200).json(notifications);
    } catch (error) {
        console.error(`Error fetching notifications for user ${authenticatedUid}: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch notifications: ${error.message}` });
    }
});

// NEW: Mark a notification as read
// @route   PATCH /notifications/:notificationId/read
// @desc    Mark a specific notification as read.
// @access  Private (requires token and ownership of notification)
app.patch('/notifications/:notificationId/read', verifyFirebaseToken, async (req, res) => {
    const notificationId = req.params.notificationId;
    const authenticatedUid = req.user.uid;

    try {
        const notificationDoc = await notificationsCollection.doc(notificationId).get();

        if (!notificationDoc.exists) {
            return res.status(404).json({ error: 'Notification not found.' });
        }

        const notificationData = notificationDoc.data();

        // Ensure the authenticated user owns this notification
        if (notificationData.userId !== authenticatedUid) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to mark this notification as read.' });
        }

        await notificationsCollection.doc(notificationId).update({ read: true });
        return res.status(200).json({ message: 'Notification marked as read.' });
    } catch (error) {
        console.error(`Error marking notification ${notificationId} as read: ${error.message}`);
        return res.status(500).json({ error: `Failed to mark notification as read: ${error.message}` });
    }
});


// --- NEW ADMIN ROUTES (User Management) ---

// @route   GET /admin/users
// @desc    Get a list of all users.
// @access  Private (requires admin role)
// server.js
// ...
app.get('/admin/users', verifyFirebaseToken, requireAdmin, async (req, res) => {
    try {
        const usersSnapshot = await usersCollection.get();
        // Add this line to see how many documents are fetched
        console.log(`DEBUG: Found ${usersSnapshot.size} documents in 'users' collection.`);
        const usersList = [];
        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();
            const authUser = await admin.auth().getUser(doc.id);
            usersList.push({
                uid: doc.id,
                email: authUser.email,
                role: userData.role || 'user'
            });
        }
        return res.status(200).json(usersList);
    } catch (error) {
        console.error('Error fetching all users (admin):', error);
        return res.status(500).json({ error: 'Failed to retrieve users.' });
    }
});
// ...

// @route   GET /admin/users/:uid
// @desc    Get details of a specific user.
// @access  Private (requires admin role)
app.get('/admin/users/:uid', verifyFirebaseToken, checkRole(['admin']), async (req, res) => {
    const userId = req.params.uid;
    try {
        const userDoc = await usersCollection.doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found in Firestore.' });
        }
        const userData = userDoc.data();
        // You might want to fetch additional data from Firebase Auth here if needed
        // const authUser = await admin.auth().getUser(userId);
        return res.status(200).json({ uid: userId, email: userData.email, role: userData.role });
    } catch (error) {
        console.error(`Error fetching user ${userId}: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch user: ${error.message}` });
    }
});

// @route   PATCH /admin/users/:uid
// @desc    Update a user's role.
// @access  Private (requires admin role)
// Admin route to update user role
app.patch('/admin/users/:uid', verifyFirebaseToken, requireAdmin, async (req, res) => {
    const { uid } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'support', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role provided.' });
    }

    // Prevent an admin from changing their own role via this endpoint
    if (uid === req.user.uid) {
        return res.status(403).json({ error: 'Forbidden: You cannot change your own role through this interface.' });
    }

    try {
        // Update role in Firestore
        await usersCollection.doc(uid).update({ role });

        // Optionally, update custom claims for the user in Firebase Auth
        // This makes the role available directly in the ID token on subsequent logins
        await admin.auth().setCustomUserClaims(uid, { role });

        return res.status(200).json({ message: 'User role updated successfully.' });
    } catch (error) {
        console.error(`Error updating user role for ${uid}:`, error);
        return res.status(500).json({ error: 'Failed to update user role.' });
    }
});
// @route   DELETE /admin/users/:uid
// @desc    Delete a user (from Firebase Auth and Firestore).
// @access  Private (requires admin role)
app.delete('/admin/users/:uid', verifyFirebaseToken, requireAdmin, async (req, res) => {
    const { uid } = req.params;

    if (uid === req.user.uid) {
        return res.status(403).json({ error: 'Forbidden: You cannot delete your own account.' });
    }

    try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(uid);
        // Delete user's document from Firestore
        await usersCollection.doc(uid).delete();
        // Optionally, delete their tickets or reassign them if applicable
        // ... (add logic to handle associated data like tickets)

        return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting user ${uid}:`, error);
        return res.status(500).json({ error: 'Failed to delete user.' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});