// ticketing-tool-backend/server.supabase.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Import Supabase configuration
const { supabase } = require('./config/supabase');

// Import email service and templates
const EmailService = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

let dbConnected = false;

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        // Check if we're using placeholder credentials
        if (process.env.SUPABASE_URL === 'https://placeholder-project.supabase.co' || !process.env.SUPABASE_URL) {
            console.warn("⚠️  Supabase not configured. Please set up your .env file with real Supabase credentials.");
            dbConnected = false;
            return false;
        }
        
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            throw error;
        }
        console.log("Connected to Supabase successfully!");
        dbConnected = true;
        return true;
    } catch (error) {
        console.error(`Error connecting to Supabase: ${error.message}`);
        console.error("Please check your Supabase credentials and ensure the database schema is set up.");
        dbConnected = false;
        return false;
    }
}

// Initialize database connection
testSupabaseConnection();

// Office365 SMTP transporter for sending as TT.Support@kriasol.com via testing@kriasol.com
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // use TLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize email service
const emailService = new EmailService(transporter);

app.use(cors());
app.use(express.json());

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected'
    });
});

// --- Constants for Ticket Fields ---
const validUserRoles = ['user', 'support', 'admin', 'super_admin', 'site_admin'];

// --- Helper function: JSON Serializable Ticket ---
function jsonSerializableTicket(ticketData) {
    if (!ticketData) return null;
    const data = { ...ticketData };
    // Convert timestamps to ISO strings
    if (data.created_at) { data.created_at = new Date(data.created_at).toISOString(); }
    if (data.updated_at) { data.updated_at = new Date(data.updated_at).toISOString(); }
    if (data.due_date) { data.due_date = new Date(data.due_date).toISOString(); }
    if (data.resolved_at) { data.resolved_at = new Date(data.resolved_at).toISOString(); }
    return data;
}

// --- Helper function: JSON Serializable Notification ---
function jsonSerializableNotification(notificationData) {
    if (!notificationData) return null;
    const data = { ...notificationData };
    if (data.created_at) { data.created_at = new Date(data.created_at).toISOString(); }
    return data;
}

// --- Helper function: Generate Display ID ---
async function generateDisplayId() {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('display_id')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        let nextIdNum = 1;
        if (data && data.length > 0) {
            const lastDisplayId = data[0].display_id;
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
        return `TT${String(Date.now()).slice(-6)}`; // Fallback
    }
}

// --- Middleware: Verify Supabase JWT Token ---
async function verifySupabaseToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header with Bearer token is required!' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
        
        // Get user role from database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (userError || !userData) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        
        req.user = {
            uid: user.id,
            email: user.email,
            role: userData.role,
            client_name: userData.client_name
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ error: 'Token verification failed.' });
    }
}

// --- Middleware: Check Role ---
function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        next();
    };
}

// Make Supabase and utilities available to routes
app.locals.supabase = supabase;
app.locals.jsonSerializableTicket = jsonSerializableTicket;
app.locals.jsonSerializableNotification = jsonSerializableNotification;
app.locals.generateDisplayId = generateDisplayId;
app.locals.verifySupabaseToken = verifySupabaseToken;
app.locals.checkRole = checkRole;
app.locals.validUserRoles = validUserRoles;
app.locals.emailService = emailService;

// Import and use routes
const authRoutes = require('./routes/authRoutes.supabase');
const ticketRoutes = require('./routes/ticketRoutes.supabase');
const userManagementRoutes = require('./routes/userManagementRoutes.supabase');
const adminRoutes = require('./routes/adminRoutes.supabase');
const dashboardRoutes = require('./routes/dashboardRoutes.supabase');
const analyticsRoutes = require('./routes/analyticsRoutes.supabase');
const notificationRoutes = require('./routes/notificationRoutes.supabase');
const clientRoutes = require('./routes/clientRoutes.supabase');
const attachmentRoutes = require('./routes/attachmentRoutes.supabase');
const adminManagementRoutes = require('./routes/adminManagement.supabase');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin-management', adminManagementRoutes);

// WebSocket server setup
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server
});

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);
            
            // Handle different message types
            switch (data.type) {
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Global function for broadcasting analytics updates
global.broadcastAnalyticsUpdate = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'analytics_update',
                data: data
            }));
        }
    });
};

// Start server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server running on port ${process.env.WEBSOCKET_PORT || 5001}`);
});

module.exports = app;
