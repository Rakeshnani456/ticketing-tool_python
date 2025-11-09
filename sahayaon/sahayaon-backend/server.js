// ticketing-tool-backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Import email service and templates
const EmailService = require('./utils/emailService');

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
    
    // Data retention scheduler - DISABLED FOR NOW
    // const { scheduleRetentionPolicy } = require('./utils/dataRetentionManager');
    // scheduleRetentionPolicy(db, 2); // Run daily at 2 AM
    // console.log('✓ Data retention policy scheduler initialized (runs daily at 2 AM)');
} catch (error) {
    console.error(`Error connecting to Firebase Firestore. Make sure environment variables are correct and accessible: ${error.message}`);
    dbConnected = false;
}

// Email transporter (configurable via env)
const EMAIL_TRANSPORT = (process.env.EMAIL_TRANSPORT || 'SMTP').toUpperCase();
let transporter;
if (EMAIL_TRANSPORT === 'GMAIL') {
    // Google (App Password required)
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    console.log('📧 Email transport: GMAIL (SMTP)');
} else {
    // Generic SMTP (default). For Office365, ensure SMTP AUTH is enabled in tenant.
    const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    });
    console.log(`📧 Email transport: SMTP host=${smtpHost} port=${smtpPort} secure=${smtpSecure}`);
}

// Initialize email service
const emailService = new EmailService(transporter);

// Startup email service check (non-blocking)
let emailServiceReady = false;
(async () => {
    try {
        console.log('🔎 Verifying email service connectivity...');
        // Log essential env presence (masked)
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.DISTRIBUTION_EMAIL) {
            console.warn('⚠️ Email env vars missing: EMAIL_USER/EMAIL_PASS/DISTRIBUTION_EMAIL');
        } else {
            console.log(`📧 Email user configured: ${process.env.EMAIL_USER}`);
        }
        await transporter.verify();
        emailServiceReady = true;
        console.log('✅ Email service verification successful');
    } catch (err) {
        emailServiceReady = false;
        console.error(`❌ Email service verification failed: ${err.message}`);
        if (EMAIL_TRANSPORT !== 'GMAIL') {
            console.error('ℹ️ If you are using Office365, enable SMTP AUTH on the mailbox/tenant or switch to EMAIL_TRANSPORT=GMAIL or Graph.');
        } else {
            console.error('ℹ️ For Gmail, ensure you are using an App Password and IMAP/SMTP is enabled.');
        }
    }
})();
app.locals.emailServiceReady = () => emailServiceReady;

// Initialize Email-to-Ticket Service
const EmailToTicketService = require('./utils/emailToTicketService');
let emailToTicketService = null;

if (dbConnected) {
    emailToTicketService = new EmailToTicketService(
        db,
        admin,
        ticketsCollection,
        usersCollection,
        clientsCollection,
        emailService
    );
    console.log('✅ Email-to-Ticket service initialized');

    // Start automatic email polling every 5 minutes
    const EMAIL_POLL_INTERVAL = parseInt(process.env.EMAIL_POLL_INTERVAL_MINUTES || '5') * 60 * 1000;
    
    if (process.env.ENABLE_EMAIL_TO_TICKET === 'true') {
        setInterval(async () => {
            try {
                console.log('🔄 Automatic email polling started...');
                await emailToTicketService.processEmails();
            } catch (error) {
                console.error('❌ Error in automatic email polling:', error);
            }
        }, EMAIL_POLL_INTERVAL);
        
        console.log(`✅ Automatic email polling enabled (every ${process.env.EMAIL_POLL_INTERVAL_MINUTES || '5'} minutes)`);
    } else {
        console.log('⚠️ Automatic email polling disabled. Set ENABLE_EMAIL_TO_TICKET=true to enable.');
    }
}

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://ticketingtoolv2.web.app',
            'https://ticketingtoolv2.firebaseapp.com',
            'http://localhost:3000',
            'http://localhost:3001'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma', 'cache-control', 'pragma'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200,
    preflightContinue: false
};

app.use(cors(corsOptions));

// Fallback CORS for development/testing
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Specific CORS handling for login endpoint
app.options('/login', cors(corsOptions));

// Specific CORS handling for users endpoint
app.options('/api/users', cors(corsOptions));
app.options('/api/users/*', cors(corsOptions));

// Specific CORS handling for personal-notes endpoint
app.options('/api/personal-notes', cors(corsOptions));
app.options('/api/personal-notes/*', cors(corsOptions));

// Debug middleware to log CORS issues
app.use((req, res, next) => {
    console.log(`CORS Debug: ${req.method} ${req.path} from origin: ${req.headers.origin}`);
    next();
});

app.use(express.json());

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        email: emailServiceReady ? 'ready' : 'error'
    });
});

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
    if (data.notes && Array.isArray(data.notes)) {
        data.notes = data.notes.map(note => {
            if (note.timestamp && note.timestamp.toDate) {
                return { ...note, timestamp: note.timestamp.toDate().toISOString() };
            }
            if (note.created_at && note.created_at.toDate) {
                return { ...note, created_at: note.created_at.toDate().toISOString() };
            }
            return note;
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

// User cache for authentication optimization
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Middleware to authenticate Firebase ID token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        
        // Check cache first
        const cachedUser = userCache.get(decodedToken.uid);
        const now = Date.now();
        
        if (cachedUser && (now - cachedUser.timestamp) < CACHE_TTL) {
            // Use cached user data
            req.user.role = cachedUser.data.role;
            req.user.client_name = cachedUser.data.client_name;
            // Only log on cache miss or for debugging
            if (process.env.NODE_ENV === 'development') {
                console.log(`User ${decodedToken.uid} (${cachedUser.data.role}) - using cached data`);
            }
        } else {
            // Fetch from database and cache
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
            
            // Cache the user data
            userCache.set(decodedToken.uid, {
                data: {
                    role: userData.role,
                    client_name: req.user.client_name
                },
                timestamp: now
            });
            
            // Only log on cache miss or for debugging
            if (process.env.NODE_ENV === 'development') {
                console.log(`User ${decodedToken.uid} (${userData.role}) client_name set to: ${req.user.client_name} (from client_name: ${userData.client_name}, companyName: ${userData.companyName})`);
            }
            
            // Add additional validation for site_admin
            if (userData.role === 'site_admin' && !req.user.client_name) {
                console.error(`Site admin ${decodedToken.uid} has no client_name or companyName set`);
            }
        }
        
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
            from: process.env.DISTRIBUTION_EMAIL,
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

// Helper function to generate display ID for tickets
async function generateDisplayId() {
    try {
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
    } catch (error) {
        console.error('Error generating display ID:', error);
        throw new Error('Failed to generate ticket display ID');
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
const analyticsRoutes = require('./routes/analyticsRoutes');
const knowledgeBaseRoutes = require('./routes/knowledgeBaseRoutes');
const personalNotesRoutes = require('./routes/personalNotesRoutes');
const searchRoutes = require('./routes/searchRoutes');
const readStatesRoutes = require('./routes/readStatesRoutes');
const gdprRoutes = require('./routes/gdprRoutes');
const emailToTicketRoutes = require('./routes/emailToTicketRoutes');


app.use('/', authRoutes(db, admin, usersCollection, authenticateToken));
app.use('/tickets', ticketRoutes(db, admin, ticketsCollection, usersCollection, notificationsCollection, transporter, authenticateToken, checkRole, jsonSerializableTicket, jsonSerializableNotification, generateDisplayId, emailService));
app.use('/admin', adminRoutes(db, admin, usersCollection, authenticateToken, checkRole));
app.use('/notifications', notificationRoutes(db, notificationsCollection, authenticateToken, jsonSerializableNotification));
app.use('/api/clients', clientRoutes(db, clientsCollection, usersCollection, authenticateToken));
app.use('/api/users', userManagementRoutes(db, admin, usersCollection, clientsCollection, authenticateToken, emailService));
app.use('/dashboard', dashboardRoutes(db, ticketsCollection, clientsCollection, usersCollection, requireSuperAdmin));
app.use('/upload-attachment', attachmentRoutes(admin, authenticateToken));
app.use('/admin-management', adminManagementRouter(db, usersCollection, authenticateToken, requireSuperAdmin));
app.use('/analytics', analyticsRoutes(db, admin, authenticateToken, checkRole));
app.use('/api/knowledge-base', knowledgeBaseRoutes(db, admin, authenticateToken, checkRole));
app.use('/api/personal-notes', personalNotesRoutes(db, admin, usersCollection, authenticateToken, checkRole, jsonSerializableNotification));
app.use('/api/search', searchRoutes(authenticateToken));
app.use('/api/read-states', readStatesRoutes(db, admin, usersCollection, authenticateToken));
app.use('/api/gdpr', gdprRoutes(db, admin, authenticateToken));

// Email-to-Ticket route (only if service is initialized)
if (emailToTicketService) {
    app.use('/api/email-to-ticket', emailToTicketRoutes(emailToTicketService, authenticateToken, checkRole));
}

// Add cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
    res.json({
        userCache: {
            size: userCache.size,
            ttl: CACHE_TTL
        }
    });
});


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

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Initialize WebSocket server
const WebSocketServer = require('./websocketServer');
const wsServer = new WebSocketServer(server);
console.log('WebSocket server initialized');