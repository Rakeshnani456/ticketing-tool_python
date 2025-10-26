// routes/emailToTicketRoutes.js

const express = require('express');
const router = express.Router();

module.exports = (emailToTicketService, verifyFirebaseToken, checkRole) => {

    /**
     * Manually trigger email processing
     * POST /api/email-to-ticket/process
     * Restricted to admin and super_admin only
     */
    router.post('/process', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            console.log('📧 Manual email processing triggered by:', req.user.email);
            
            const result = await emailToTicketService.processEmails();
            
            return res.status(200).json({
                success: true,
                message: `Processed ${result.processed} of ${result.total} email(s)`,
                ...result
            });
        } catch (error) {
            console.error('❌ Error processing emails:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get email-to-ticket service status
     * GET /api/email-to-ticket/status
     * Restricted to admin and super_admin only
     */
    router.get('/status', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const status = {
                enabled: !!(process.env.TICKET_EMAIL_USER && process.env.TICKET_EMAIL_PASSWORD),
                email: process.env.TICKET_EMAIL_USER || 'Not configured',
                host: process.env.TICKET_EMAIL_HOST || 'outlook.office365.com',
                port: process.env.TICKET_EMAIL_PORT || 993,
                isProcessing: emailToTicketService.isProcessing
            };

            return res.status(200).json({
                success: true,
                status: status
            });
        } catch (error) {
            console.error('❌ Error getting service status:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Test email-to-ticket configuration
     * GET /api/email-to-ticket/test
     * Restricted to admin and super_admin only
     */
    router.get('/test', verifyFirebaseToken, checkRole(['admin', 'super_admin']), async (req, res) => {
        try {
            const isConfigured = !!(process.env.TICKET_EMAIL_USER && process.env.TICKET_EMAIL_PASSWORD);
            
            if (!isConfigured) {
                return res.status(400).json({
                    success: false,
                    message: 'Email-to-Ticket service is not configured. Please set TICKET_EMAIL_USER and TICKET_EMAIL_PASSWORD environment variables.'
                });
            }

            // Try to connect
            const connected = emailToTicketService.connect();
            
            if (connected) {
                return res.status(200).json({
                    success: true,
                    message: 'Email-to-Ticket service is properly configured and can connect to the email server.',
                    config: {
                        user: process.env.TICKET_EMAIL_USER,
                        host: process.env.TICKET_EMAIL_HOST || 'outlook.office365.com',
                        port: process.env.TICKET_EMAIL_PORT || 993
                    }
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to initialize IMAP connection. Check your credentials.'
                });
            }
        } catch (error) {
            console.error('❌ Error testing email configuration:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
};

