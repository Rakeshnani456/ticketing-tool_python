// ticketing-tool-backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5000;

let db;
let usersCollection;
let ticketsCollection;
let notificationsCollection;
let clientsCollection;
let dbConnected = false;

try {
    if (!admin.apps.length) {
        const firebaseConfig = {
            type: process.env.type,
            project_id: process.env.project_id,
            private_key_id: process.env.private_key_id,
            private_key: process.env.private_key ? process.env.private_key.replace(/\\n/g, '\n') : undefined,
            client_email: process.env.client_email,
            client_id: process.env.client_id,
            auth_uri: process.env.auth_uri,
            token_uri: process.env.token_uri,
            auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
            client_x509_cert_url: process.env.client_x509_cert_url,
            universe_domain: process.env.universe_domain
        };

        if (!firebaseConfig.project_id || !firebaseConfig.private_key || !firebaseConfig.client_email) {
            throw new Error('Missing essential Firebase environment variables for Admin SDK initialization.');
        }

        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
    }
    db = admin.firestore();
    usersCollection = db.collection('users');
    ticketsCollection = db.collection('tickets');
    notificationsCollection = db.collection('notifications');
    clientsCollection = db.collection('clients');
    console.log("Connected to Firebase Firestore successfully!");
    dbConnected = true;
    app.locals.admin = admin; // Make admin available in routes
} catch (error) {
    console.error(`Error connecting to Firebase Firestore. Make sure environment variables are correct and accessible: ${error.message}`);
    dbConnected = false;
}

// Office365 SMTP transporter for sending as TT.Support@kriasol.com via testing@kriasol.com
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // use TLS
    auth: {
        user: process.env.EMAIL_USER, // Use process.env.EMAIL_USER in production
        pass: process.env.EMAIL_PASS       // Use process.env.EMAIL_PASS in production
    }
});

app.use(cors());
app.use(express.json());

// --- Constants for Ticket Fields (can be moved to a constants.js file) ---
const validUserRoles = ['user', 'support', 'admin', 'super_admin', 'site_admin'];

// --- Helper function: JSON Serializable Ticket ---
function jsonSerializableTicket(docId, ticketData) {
    if (!ticketData) return null;
    const data = { ...ticketData, id: docId };
    if (data.created_at && data.created_at.toDate) { data.created_at = data.created_at.toDate().toISOString(); }
    if (data.updated_at && data.updated_at.toDate) { data.updated_at = data.updated_at.toDate().toISOString(); }
    if (data.due_date && data.due_date.toDate) { data.due_date = data.due_date.toDate().toISOString(); }
    if (data.resolved_at && data.resolved_at.toDate) { data.resolved_at = data.resolved_at.toDate().toISOString(); }
    if (data.comments && Array.isArray(data.comments)) {
        data.comments = data.comments.map(comment => {
            if (comment.timestamp && comment.timestamp.toDate) {
                return { ...comment, timestamp: comment.timestamp.toDate().toISOString() };
            }
            return comment;
        });
    }
    if (data.status_history && Array.isArray(data.status_history)) {
        data.status_history = data.status_history.map(history => {
            if (history.timestamp && history.timestamp.toDate) {
                return { ...history, timestamp: history.timestamp.toDate().toISOString() };
            }
            return history;
        });
    }
    if (data.assigned_to_history && Array.isArray(data.assigned_to_history)) {
        data.assigned_to_history = data.assigned_to_history.map(history => {
            if (history.timestamp && history.timestamp.toDate) {
                return { ...history, timestamp: history.timestamp.toDate().toISOString() };
            }
            return history;
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
        data.createdAt = data.timestamp;
    } else if (data.timestamp && typeof data.timestamp === 'string') {
        data.createdAt = data.timestamp;
    } else if (data.createdAt && typeof data.createdAt === 'string') {
        data.timestamp = data.createdAt;
    } else {
        const now = new Date().toISOString();
        data.timestamp = now;
        data.createdAt = now;
    }
    if (!data.type) {
        data.type = 'generic';
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
app.use(checkDbConnection);

// --- Middleware to verify Firebase ID token for protected routes ---
const verifyFirebaseToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided or token format is invalid.' });
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (!userDoc.exists) {
            return res.status(403).json({ error: 'Forbidden: User profile not found.' });
        }
        const userData = userDoc.data();
        if (!userData || !userData.role) {
            return res.status(403).json({ error: 'Forbidden: User role not found.' });
        }
        req.user.role = userData.role;
        req.user.client_name = userData.client_name || userData.companyName;
        next();
    } catch (error) {
        console.error('Error verifying Firebase ID token or fetching user role:', error);
        if (error.code === 'auth/argument-error' || error.code === 'auth/invalid-credential' || error.code === 'auth/id-token-expired') {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token. Please log in again.' });
        }
        return res.status(500).json({ error: 'Failed to authenticate token or retrieve user data.' });
    }
};

// Middleware to check user role
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

// Middleware to check if the user has a super admin role
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
    }
    next();
};

// NEW: Helper function to send email alerts
async function sendEmailAlert(toEmail, subject, text, html, cc = null) {
    try {
        const mailOptions = {
            from: 'TT.Support@kriasol.com',
            to: toEmail,
            subject: subject,
            text: text,
            html: html,
        };
        if (cc) {
            mailOptions.cc = cc;
        }
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${toEmail}${cc ? ' (cc: ' + cc + ')' : ''}`);
    } catch (error) {
        console.error(`Error sending email to ${toEmail}${cc ? ' (cc: ' + cc + ')' : ''}: ${error.message}`);
    }
}


// --- Import and Use Routes ---
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const clientRoutes = require('./routes/clientRoutes');
const userManagementRoutes = require('./routes/userManagementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const adminManagementRouter = require('./routes/adminManagement');


app.use('/', authRoutes(db, admin, usersCollection, verifyFirebaseToken));
app.use('/tickets', ticketRoutes(db, admin, ticketsCollection, usersCollection, notificationsCollection, transporter, verifyFirebaseToken, checkRole, jsonSerializableTicket, jsonSerializableNotification, null, sendEmailAlert));
app.use('/admin', adminRoutes(db, admin, usersCollection, verifyFirebaseToken, checkRole));
app.use('/notifications', notificationRoutes(db, notificationsCollection, verifyFirebaseToken, jsonSerializableNotification));
app.use('/api/clients', clientRoutes(db, clientsCollection, usersCollection));
app.use('/api/users', userManagementRoutes(db, admin, usersCollection, clientsCollection, verifyFirebaseToken));
app.use('/dashboard', dashboardRoutes(db, ticketsCollection, clientsCollection, usersCollection, requireSuperAdmin));
app.use('/upload-attachment', attachmentRoutes(admin, verifyFirebaseToken));
app.use('/admin-management', adminManagementRouter(db, usersCollection, verifyFirebaseToken, requireSuperAdmin));


// Add a dummy client if none exist (for testing) - keep this in server.js or a separate setup file
(async () => {
    if (dbConnected) {
        const snapshot = await clientsCollection.limit(1).get();
        if (snapshot.empty) {
            await clientsCollection.add({
                client_name: 'Acme Corp',
                client_type: 'Enterprise',
                location: 'New York, USA',
                domain: 'acme.com',
                joined_date: '2022-01-15',
                no_of_users: 120,
                contract_end: '2025-12-31',
                site_admin: 'john.doe@acme.com'
            });
            console.log('Dummy client added to clients collection.');
        }
    }
})();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});