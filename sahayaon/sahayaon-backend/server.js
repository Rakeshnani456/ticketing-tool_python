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
let assetsCollection;
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
    assetsCollection = db.collection('assets');
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
// Auto-detect email provider based on EMAIL_USER domain if EMAIL_TRANSPORT not explicitly set
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_TRANSPORT_ENV = (process.env.EMAIL_TRANSPORT || '').toUpperCase().trim();

// Auto-detect provider from email domain (Outlook/Office365 only)
let detectedProvider = null;
if (EMAIL_USER) {
    const emailDomain = EMAIL_USER.toLowerCase().split('@')[1];
    if (emailDomain && (emailDomain.includes('outlook.com') || emailDomain.includes('office365.com') || emailDomain.includes('microsoft.com') || emailDomain.includes('hotmail.com'))) {
        detectedProvider = 'OUTLOOK';
    }
}

// Determine which transport to use (explicit setting takes precedence, default to OUTLOOK)
const EMAIL_TRANSPORT = EMAIL_TRANSPORT_ENV || detectedProvider || 'OUTLOOK';

let transporter;
if (EMAIL_TRANSPORT === 'SENDGRID') {
    // SendGrid SMTP (recommended for cloud platforms like Render)
    const sendgridApiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_PASS;
    if (!sendgridApiKey) {
        console.error('❌ SendGrid configuration incomplete: SENDGRID_API_KEY or EMAIL_PASS required');
    }
    
    transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
            user: 'apikey', // SendGrid requires 'apikey' as username
            pass: sendgridApiKey, // Your SendGrid API key
        },
        connectionTimeout: 30000,
        socketTimeout: 30000,
        greetingTimeout: 15000,
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        },
        pool: false,
        maxConnections: 1,
        maxMessages: 1
    });
    console.log(`📧 Email transport: SENDGRID (smtp.sendgrid.net:587, STARTTLS)`);
    console.log(`   Using SendGrid API key (hidden)`);
    if (process.env.DISTRIBUTION_EMAIL) {
        console.log(`   From email: ${process.env.DISTRIBUTION_EMAIL}`);
    }
} else if (EMAIL_TRANSPORT === 'OUTLOOK' || EMAIL_TRANSPORT === 'OFFICE365') {
    // Office365/Outlook SMTP
    const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    
    // Office365 requires STARTTLS on port 587 (not SSL/TLS)
    // Port 587: secure=false (uses STARTTLS)
    // Port 465: secure=true (uses SSL/TLS)
    const useStartTLS = smtpPort === 587;
    
    // Detect if running on cloud platform (Render, Heroku, etc.)
    const isCloudPlatform = process.env.RENDER || process.env.HEROKU || process.env.NODE_ENV === 'production';
    
    // Warn if using port 465 on cloud platforms (often blocked)
    if (isCloudPlatform && smtpPort === 465) {
        console.warn(`⚠️  WARNING: Port 465 is often blocked on cloud platforms like Render!`);
        console.warn(`   Port 465 may cause connection timeouts. Recommended: Use port 587 instead.`);
        console.warn(`   Set SMTP_PORT=587 and SMTP_SECURE=false in your environment variables.`);
    }
    
    // Disable connection pooling on cloud platforms by default to avoid connection reuse issues
    // Connection pooling can cause problems with cloud providers' network configurations
    // Users can explicitly enable it by setting EMAIL_USE_POOL=true
    // Default: false on cloud platforms, true on local (unless explicitly disabled)
    let usePool = false;
    if (process.env.EMAIL_USE_POOL === 'true') {
        usePool = true; // Explicitly enabled
    } else if (!isCloudPlatform && process.env.EMAIL_USE_POOL !== 'false') {
        usePool = true; // Default to true on local platforms unless explicitly disabled
    }
    
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // false for STARTTLS on port 587, true for SSL on port 465
        requireTLS: useStartTLS, // Require TLS upgrade for Office365 on port 587
        auth: {
            user: EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: isCloudPlatform ? 30000 : 60000, // Shorter timeout for cloud platforms
        socketTimeout: isCloudPlatform ? 30000 : 60000, // Shorter timeout for cloud platforms
        greetingTimeout: isCloudPlatform ? 15000 : 30000, // Shorter greeting timeout for cloud platforms
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        },
        // Disable pooling on cloud platforms - each email gets a fresh connection
        pool: usePool,
        maxConnections: usePool ? 5 : 1,
        maxMessages: usePool ? 100 : 1,
        // Add debug logging for troubleshooting
        debug: process.env.EMAIL_DEBUG === 'true',
        logger: process.env.EMAIL_DEBUG === 'true'
    });
    
    if (isCloudPlatform && usePool) {
        console.log(`⚠️  Warning: Connection pooling enabled on cloud platform. Consider setting EMAIL_USE_POOL=false if experiencing issues.`);
    }
    
    console.log(`📧 Email transport: OUTLOOK/OFFICE365 (${smtpHost}:${smtpPort}, secure=${smtpSecure}${useStartTLS ? ', STARTTLS' : ''}, pool=${usePool})`);
    console.log(`   Using email: ${EMAIL_USER}`);
    console.log(`   Platform: ${isCloudPlatform ? 'Cloud' : 'Local'}`);
} else {
    // Generic SMTP (custom configuration)
    const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    
    const isOffice365 = smtpHost.includes('office365.com') || smtpHost.includes('outlook.com');
    const useStartTLS = isOffice365 && smtpPort === 587;
    
    transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        requireTLS: useStartTLS,
        auth: {
            user: EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 60000, // 60 seconds connection timeout (increased for cloud platforms)
        socketTimeout: 60000, // 60 seconds socket timeout
        greetingTimeout: 30000, // 30 seconds greeting timeout
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        },
        pool: false, // Disable pooling to avoid connection reuse issues on cloud platforms
        maxConnections: 1,
        maxMessages: 1
    });
    console.log(`📧 Email transport: SMTP (${smtpHost}:${smtpPort}, secure=${smtpSecure}${useStartTLS ? ', STARTTLS' : ''})`);
    console.log(`   Using email: ${EMAIL_USER}`);
}

// Initialize email service
const emailService = new EmailService(transporter);
console.log(`📧 Email service initialized`);
console.log(`   Transporter: ${transporter ? 'configured' : 'NOT configured'}`);
console.log(`   EMAIL_USER: ${EMAIL_USER || 'NOT SET'}`);
console.log(`   DISTRIBUTION_EMAIL: ${process.env.DISTRIBUTION_EMAIL || 'NOT SET'}`);
console.log(`   EMAIL_TRANSPORT: ${EMAIL_TRANSPORT}`);

// Startup email service check (non-blocking)
// Note: Verification failure does NOT prevent email sending - it's just a connectivity check
let emailServiceReady = false;
const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION === 'true';

(async () => {
    // Skip verification if explicitly disabled (useful for cloud platforms that block SMTP during startup)
    if (SKIP_EMAIL_VERIFICATION) {
        console.log('⏭️  Email verification skipped (SKIP_EMAIL_VERIFICATION=true)');
        console.log('   Email service will attempt to send emails when needed.');
        emailServiceReady = true; // Set to true so health check shows ready, but actual sends will still work
        return;
    }

    try {
        console.log('🔎 Verifying email service connectivity...');
        // Log essential env presence (masked)
        if (!EMAIL_USER || !process.env.EMAIL_PASS || !process.env.DISTRIBUTION_EMAIL) {
            console.warn('⚠️ Email env vars missing: EMAIL_USER/EMAIL_PASS/DISTRIBUTION_EMAIL');
            console.warn('   Email service will still attempt to send, but may fail.');
        } else {
            console.log(`📧 Email user configured: ${EMAIL_USER}`);
            console.log(`📧 Email transport: ${EMAIL_TRANSPORT} ${EMAIL_TRANSPORT_ENV ? '(explicit)' : '(auto-detected)'}`);
        }
        // Add timeout wrapper for verify() to prevent hanging (reduced to 15 seconds for faster startup)
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email verification timeout after 15 seconds')), 15000)
        );
        await Promise.race([verifyPromise, timeoutPromise]);
        emailServiceReady = true;
        console.log('✅ Email service verification successful');
    } catch (err) {
        // Don't set emailServiceReady to false - allow emails to still be attempted
        // Verification is just a connectivity check, not a requirement
        emailServiceReady = false; // Health check will show error, but emails will still be attempted
        console.error(`❌ Email service verification failed: ${err.message}`);
        console.warn('⚠️  Note: Email sending will still be attempted when needed.');
        console.warn('   Verification failure may indicate network/firewall issues, but emails may still work.');
        console.warn('   To skip verification entirely, set SKIP_EMAIL_VERIFICATION=true in your environment.');
        if (EMAIL_TRANSPORT === 'OUTLOOK' || EMAIL_TRANSPORT === 'OFFICE365') {
            const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
            console.error('\n⚠️  Office365 SMTP Configuration Issue ⚠️');
            console.error('To fix Office365 SMTP AUTH errors:');
            console.error('');
            console.error('1. Enable SMTP AUTH in Microsoft 365 Admin Center:');
            console.error('   - Go to: https://admin.microsoft.com');
            console.error('   - Navigate to: Settings > Mail > POP, IMAP, and SMTP access');
            console.error('   - Enable "Authenticated SMTP" for your mailbox');
            console.error('');
            console.error('2. For tenant-wide settings (if you have admin access):');
            console.error('   - PowerShell: Set-TransportConfig -SmtpClientAuthenticationDisabled $false');
            console.error('   - Or use Exchange Admin Center > Mail flow > Connectors');
            console.error('');
            console.error('3. Verify your environment variables:');
            console.error(`   - EMAIL_USER: ${EMAIL_USER || 'NOT SET'}`);
            console.error(`   - EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET (hidden)' : 'NOT SET'}`);
            console.error(`   - SMTP_HOST: ${smtpHost}`);
            console.error(`   - SMTP_PORT: ${process.env.SMTP_PORT || '587'}`);
            console.error(`   - SMTP_SECURE: ${process.env.SMTP_SECURE || 'false'}`);
            console.error(`   - EMAIL_TRANSPORT: ${EMAIL_TRANSPORT_ENV || 'AUTO-DETECTED'}`);
            console.error('');
            console.error('4. For Office365, recommended settings:');
            console.error('   - SMTP_HOST=smtp.office365.com');
            console.error('   - SMTP_PORT=587');
            console.error('   - SMTP_SECURE=false (uses STARTTLS)');
            console.error('   - EMAIL_TRANSPORT=OUTLOOK (or leave empty for auto-detect)');
            console.error('');
            console.error('5. Connection timeout troubleshooting:');
            console.error('   - If using cloud hosting (Render, Heroku, etc.), check if outbound SMTP is allowed');
            console.error('   - Some platforms block port 587 - try port 25 or 465 as alternative');
            console.error('   - Verify network firewall allows outbound connections to smtp.office365.com');
            console.error('   - Check if your hosting provider requires specific SMTP relay configuration');
            console.error('   - Consider using a dedicated email service (SendGrid, Mailgun) if SMTP is blocked');
            console.error('   - To skip verification (emails will still be attempted): Set SKIP_EMAIL_VERIFICATION=true');
            console.error('');
            console.error('6. Render-specific fixes:');
            console.error('   - Ensure you are using an App Password (not regular password) from Microsoft');
            console.error('   - Set EMAIL_USE_POOL=false to disable connection pooling (recommended for Render)');
            console.error('   - Verify SMTP AUTH is enabled for your Office365 account');
            console.error('   - Check Render logs for specific connection errors');
            console.error('   - Try setting SMTP_PORT=465 and SMTP_SECURE=true as alternative');
        } else {
            const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
            const isOffice365 = smtpHost.includes('office365.com') || smtpHost.includes('outlook.com');
            
            if (isOffice365) {
                console.error('\n⚠️  Office365 SMTP Configuration Issue ⚠️');
                console.error('To fix Office365 SMTP AUTH errors:');
                console.error('');
                console.error('1. Enable SMTP AUTH in Microsoft 365 Admin Center:');
                console.error('   - Go to: https://admin.microsoft.com');
                console.error('   - Navigate to: Settings > Mail > POP, IMAP, and SMTP access');
                console.error('   - Enable "Authenticated SMTP" for your mailbox');
                console.error('');
                console.error('2. For tenant-wide settings (if you have admin access):');
                console.error('   - PowerShell: Set-TransportConfig -SmtpClientAuthenticationDisabled $false');
                console.error('   - Or use Exchange Admin Center > Mail flow > Connectors');
                console.error('');
                console.error('3. Verify your environment variables:');
                console.error(`   - EMAIL_USER: ${EMAIL_USER || 'NOT SET'}`);
                console.error(`   - EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET (hidden)' : 'NOT SET'}`);
                console.error(`   - SMTP_HOST: ${smtpHost}`);
                console.error(`   - SMTP_PORT: ${process.env.SMTP_PORT || '587'}`);
                console.error(`   - SMTP_SECURE: ${process.env.SMTP_SECURE || 'false'}`);
                console.error(`   - EMAIL_TRANSPORT: ${EMAIL_TRANSPORT_ENV || 'AUTO-DETECTED'}`);
                console.error('');
                console.error('4. For Office365, recommended settings:');
                console.error('   - SMTP_HOST=smtp.office365.com');
                console.error('   - SMTP_PORT=587');
                console.error('   - SMTP_SECURE=false (uses STARTTLS)');
                console.error('   - EMAIL_TRANSPORT=OUTLOOK (or leave empty for auto-detect)');
                console.error('');
                console.error('5. Connection timeout troubleshooting:');
                console.error('   - If using cloud hosting (Render, Heroku, etc.), check if outbound SMTP is allowed');
                console.error('   - Some platforms block port 587 - try port 25 or 465 as alternative');
                console.error('   - Verify network firewall allows outbound connections to smtp.office365.com');
                console.error('   - Check if your hosting provider requires specific SMTP relay configuration');
                console.error('   - Consider using a dedicated email service (SendGrid, Mailgun) if SMTP is blocked');
                console.error('   - To skip verification (emails will still be attempted): Set SKIP_EMAIL_VERIFICATION=true');
            } else {
                console.error('ℹ️ SMTP Configuration:');
                console.error(`   - Host: ${smtpHost}`);
                console.error(`   - Port: ${process.env.SMTP_PORT || '587'}`);
                console.error(`   - Verify SMTP credentials and server settings`);
                console.error(`   - EMAIL_TRANSPORT: ${EMAIL_TRANSPORT_ENV || 'AUTO-DETECTED'}`);
            }
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
            'https://tt.kriasol.com',
            'http://localhost:3000',
            'http://localhost:3001',
            'https://my.sahayaon.com'
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
        
        // Check for Firebase project ID mismatch
        if (error.message && error.message.includes('aud') && error.message.includes('audience')) {
            const expectedProject = process.env.project_id || 'unknown';
            console.error(`\n⚠️  FIREBASE PROJECT ID MISMATCH DETECTED ⚠️`);
            console.error(`Backend expects project: ${expectedProject}`);
            console.error(`Frontend is using a different Firebase project.`);
            console.error(`\nTo fix this:`);
            console.error(`1. Check your backend .env file - ensure project_id matches the frontend Firebase project`);
            console.error(`2. Frontend uses: ticketingtoolv2 (see sahayaon-frontend/src/config/firebase.js)`);
            console.error(`3. Update backend .env: project_id=ticketingtoolv2`);
            console.error(`4. Also update FIREBASE_STORAGE_BUCKET to match: ticketingtoolv2.firebasestorage.app\n`);
            return res.status(500).json({ 
                error: 'Firebase project ID mismatch. Backend and frontend must use the same Firebase project.',
                details: `Backend expects: ${expectedProject}. Please check your .env file configuration.`
            });
        }
        
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
const assetRoutes = require('./routes/assetRoutes');


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

// Asset Management routes
app.use('/api/assets', assetRoutes(db, admin, assetsCollection, usersCollection, clientsCollection, authenticateToken, checkRole));

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
        try {
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
                console.log('✅ Dummy client added to clients collection.');
            } else {
                console.log('ℹ️ Clients collection already has data. Skipping dummy client creation.');
            }
        } catch (error) {
            // Distinguish between different error types
            if (error.code === 5 || error.code === 'NOT_FOUND') {
                console.warn('⚠️ Dummy client check: Firestore NOT_FOUND error.');
                console.warn('   This may indicate:');
                console.warn('   - Firestore database is not fully initialized');
                console.warn('   - Service account permissions issue');
                console.warn('   - Network connectivity issue');
                console.warn('   The server will continue running. Clients can be added manually.');
            } else if (error.code === 7 || error.code === 'PERMISSION_DENIED') {
                console.error('❌ Dummy client check: Permission denied.');
                console.error('   Check service account permissions in Firebase Console:');
                console.error('   https://console.firebase.google.com/project/' + (process.env.project_id || 'your-project') + '/settings/iam');
                console.error('   Ensure the service account has Firestore read/write permissions.');
            } else {
                console.error('❌ Error checking/adding dummy client:', error.message || error);
                console.error('   Error code:', error.code || 'unknown');
            }
            console.log('ℹ️ Server will continue running. This is a non-critical initialization step.');
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