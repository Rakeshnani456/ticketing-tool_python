// ticketing-tool-backend/server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

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
            credential: admin.credential.cert(serviceAccount)
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

// --- Helper function: JSON Serializable Ticket ---
// Replicates the functionality of your Python json_serializable_ticket
function jsonSerializableTicket(docId, ticketData) {
    if (!ticketData) return null;

    const data = { ...ticketData, id: docId }; // Add document ID

    // Convert Firestore Timestamp objects to ISO 8601 strings
    // Firestore Timestamp objects have toMillis() method
    if (data.created_at && data.created_at.toDate) {
        data.created_at = data.created_at.toDate().toISOString();
    }
    if (data.updated_at && data.updated_at.toDate) {
        data.updated_at = data.updated_at.toDate().toISOString();
    }
    if (data.due_date && data.due_date.toDate) {
        data.due_date = data.due_date.toDate().toISOString();
    }
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

// --- Middleware to verify Firebase ID token for protected routes ---
// This replaces the manual token check you had in each Python route
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

// --- Transactional Logic: get_next_ticket_number ---
// This function needs to be defined within the scope where `db` is accessible.
// It uses Firestore transactions similar to your Python version.
async function getNextTicketNumber(transaction) {
    const countersRef = db.collection('counters').doc('ticket_id_counter');

    // In Node.js, `transaction.get` directly returns a DocumentSnapshot
    const counterDoc = await transaction.get(countersRef);

    let currentCount;
    if (counterDoc.exists) {
        currentCount = counterDoc.data().count;
    } else {
        currentCount = 0;
    }

    const newCount = currentCount + 1;

    // Update the counter in the transaction
    transaction.set(countersRef, { count: newCount });

    // Format the new count into a 6-digit string with leading zeros
    const formattedNumber = String(newCount).padStart(6, '0');
    return `IT${formattedNumber}`;
}

// @route   GET /tickets/my
// @desc    Get tickets created by a specific user.
// @access  Private (requires token)
app.get('/tickets/my', verifyFirebaseToken, async (req, res) => {
    const userId = req.query.userId; // Get from query parameter as in Flask

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    // Optional: Add a check if req.user.uid matches userId for security
    // if (req.user.uid !== userId) {
    //     return res.status(403).json({ error: 'Access denied: You can only view your own tickets.' });
    // }

    try {
        const ticketsSnapshot = await ticketsCollection
            .where('creator_uid', '==', userId)
            .orderBy('created_at', 'desc')
            .get();

        const tickets = [];
        ticketsSnapshot.forEach(doc => {
            tickets.push(jsonSerializableTicket(doc.id, doc.data()));
        });
        return res.status(200).json(tickets);
    } catch (error) {
        console.error(`Error fetching my tickets: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch your tickets: ${error.message}` });
    }
});

// @route   GET /tickets/all
// @desc    Get all tickets (for support roles). Supports filtering.
// @access  Private (requires token)
app.get('/tickets/all', verifyFirebaseToken, async (req, res) => {
    const { status, assignment } = req.query; // Get from query parameters

    let query = ticketsCollection;

    if (status) {
        query = query.where('status', '==', status);
    }

    if (assignment === 'unassigned') {
        query = query.where('assigned_to_email', '==', ''); // Assuming empty string for unassigned
    }

    try {
        const ticketsSnapshot = await query.orderBy('created_at', 'desc').get();
        const tickets = [];
        ticketsSnapshot.forEach(doc => {
            tickets.push(jsonSerializableTicket(doc.id, doc.data()));
        });
        return res.status(200).json(tickets);
    } catch (error) {
        console.error(`Error fetching all tickets: ${error.message}`);
        return res.status(500).json({ error: `Failed to fetch all tickets: ${error.message}` });
    }
});

// @route   POST /create
// @desc    Create a new ticket in Firestore with a sequential display ID.
// @access  Private (requires token)
app.post('/create', verifyFirebaseToken, async (req, res) => {
    const { title, description, reporter, creator_uid, creator_email } = req.body;

    if (!title || !description || !reporter || !creator_uid || !creator_email) {
        return res.status(400).json({ error: 'Title, Description, Reporter, Creator ID, and Creator Email are required!' });
    }

    // Optional: Security check - ensure creator_uid matches the authenticated user's UID
    if (req.user.uid !== creator_uid) {
        return res.status(403).json({ error: 'Unauthorized: Creator UID does not match authenticated user.' });
    }

    try {
        const result = await db.runTransaction(async (transaction) => {
            const displayId = await getNextTicketNumber(transaction);

            const newTicketData = {
                title: title,
                description: description,
                status: 'Open', // Default
                priority: 'Low', // Default
                reporter: reporter,
                creator_uid: creator_uid,
                creator_email: creator_email,
                assigned_to_email: '', // Default empty
                comments: [],
                created_at: admin.firestore.FieldValue.serverTimestamp(), // Firestore server timestamp
                updated_at: admin.firestore.FieldValue.serverTimestamp(), // Firestore server timestamp
                display_id: displayId
            };

            const docRef = ticketsCollection.doc(); // Create a new document reference
            transaction.set(docRef, newTicketData); // Set the data using the transaction

            return { ticket_id: docRef.id, display_id: displayId };
        });

        return res.status(201).json({
            message: 'Ticket created successfully!',
            ticket_id: result.ticket_id,
            display_id: result.display_id
        });
    } catch (error) {
        console.error(`Error creating ticket: ${error.message}`);
        return res.status(500).json({ error: `Error creating ticket: ${error.message}` });
    }
});

// @route   GET /ticket/:ticket_id
// @desc    Get details of a single ticket.
// @access  Private (requires token)
app.get('/ticket/:ticket_id', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;

    try {
        const ticketDoc = await ticketsCollection.doc(ticketId).get();
        if (!ticketDoc.exists) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticketData = ticketDoc.data();
        return res.status(200).json(jsonSerializableTicket(ticketDoc.id, ticketData));
    } catch (error) {
        console.error(`Error retrieving ticket: ${error.message}`);
        return res.status(500).json({ error: `Error retrieving ticket: ${error.message}` });
    }
});

// @route   POST /ticket/:ticket_id/update
// @desc    Update ticket status, priority, assigned_to_email.
// @access  Private (requires token)
app.post('/ticket/:ticket_id/update', verifyFirebaseToken, async (req, res) => {
    const ticketId = req.params.ticket_id;
    const { status, priority, assigned_to_email } = req.body;

    const updateFields = {
        updated_at: admin.firestore.FieldValue.serverTimestamp() // Update timestamp
    };

    if (status) {
        updateFields.status = status;
    }
    if (priority) {
        updateFields.priority = priority;
    }
    // Check for explicit undefined to allow setting to empty string
    if (assigned_to_email !== undefined) {
        updateFields.assigned_to_email = assigned_to_email;
    }

    try {
        await ticketsCollection.doc(ticketId).update(updateFields);
        console.log(`Ticket ${ticketId} updated with new status: ${status}, priority: ${priority}, assigned to: ${assigned_to_email}`);
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
    const { comment_text, commenter_name = 'Anonymous' } = req.body;

    if (!comment_text) {
        return res.status(400).json({ error: 'Comment text cannot be empty!' });
    }

    const newComment = {
        text: comment_text,
        commenter: commenter_name,
        timestamp: admin.firestore.FieldValue.serverTimestamp() // Firestore server timestamp
    };

    try {
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

// Start the server
app.listen(port, () => {
    console.log(`Node.js Server is running on port ${port}`);
    console.log(`Access it at http://localhost:${port}`);
});