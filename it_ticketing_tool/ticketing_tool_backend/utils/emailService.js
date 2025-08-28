// utils/emailService.js

const { getWelcomeEmailTemplate, getPasswordResetTemplate, getTicketNotificationTemplate, getTicketStatusUpdateTemplate, getTicketAssignmentTemplate, getUserTicketAssignmentTemplate, getTicketCancellationTemplate, getTicketCommentTemplate, getPasswordSharingTemplate } = require('./emailTemplates');

/**
 * Email service for sending various types of emails
 */
class EmailService {
    constructor(transporter) {
        this.transporter = transporter;
    }

    /**
     * Send welcome email to new users
     * @param {Object} userData - User data object
     * @param {string} userData.userName - User's full name
     * @param {string} userData.clientName - Client/company name
     * @param {string} userData.portalUrl - Portal URL
     * @param {string} userData.userEmail - User's email address
     * @param {string} userData.tempPassword - Temporary password
     * @param {string} userData.companyName - Company name (fallback)
     * @returns {Promise<boolean>} Success status
     */
    async sendWelcomeEmail(userData) {
        try {
            const { subject, text, html } = getWelcomeEmailTemplate(userData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: userData.userEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Welcome email sent successfully to ${userData.userEmail}`);
            return true;
        } catch (error) {
            console.error(`Error sending welcome email to ${userData.userEmail}:`, error.message);
            return false;
        }
    }

    /**
     * Send password reset email
     * @param {Object} userData - User data object
     * @param {string} userData.userName - User's full name
     * @param {string} userData.resetUrl - Password reset URL
     * @param {string} userData.userEmail - User's email address
     * @returns {Promise<boolean>} Success status
     */
    async sendPasswordResetEmail(userData) {
        try {
            const { subject, text, html } = getPasswordResetTemplate(userData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: userData.userEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset email sent successfully to ${userData.userEmail}`);
            return true;
        } catch (error) {
            console.error(`Error sending password reset email to ${userData.userEmail}:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket notification email
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketNotificationEmail(ticketData) {
        try {
            const { subject, text, html } = getTicketNotificationTemplate(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket notification email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket notification email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket status update notification email
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketStatusUpdateEmail(ticketData) {
        try {
            const { subject, text, html } = getTicketStatusUpdateTemplate(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket status update email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket status update email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket assignment notification email
     * @param {Object} ticketData - Ticket data object
     * @param {boolean} isUserNotification - Whether this is a user notification (true) or team notification (false)
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketAssignmentEmail(ticketData, isUserNotification = false) {
        try {
            // Choose template based on recipient type
            const template = isUserNotification ? getUserTicketAssignmentTemplate : getTicketAssignmentTemplate;
            const { subject, text, html } = template(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            const recipientType = isUserNotification ? 'user' : 'team';
            console.log(`Ticket assignment email sent successfully to ${recipientType}: ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket assignment email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket assignment notification email to users
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendUserTicketAssignmentEmail(ticketData) {
        try {
            const { subject, text, html } = getUserTicketAssignmentTemplate(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`User ticket assignment email sent successfully to: ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending user ticket assignment email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket cancellation notification email
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketCancellationEmail(ticketData) {
        try {
            const { subject, text, html } = getTicketCancellationTemplate(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket cancellation email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket cancellation email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket comment notification email
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketCommentEmail(ticketData) {
        try {
            const { subject, text, html } = getTicketCommentTemplate(ticketData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: ticketData.toEmail || 'tt.support@kriasol.com',
                cc: ticketData.ccEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket comment email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket comment email:`, error.message);
            return false;
        }
    }

    /**
     * Send custom email with template
     * @param {Object} emailData - Email data object
     * @param {string} emailData.to - Recipient email
     * @param {string} emailData.subject - Email subject
     * @param {string} emailData.text - Plain text content
     * @param {string} emailData.html - HTML content
     * @param {string} emailData.cc - CC recipients (optional)
     * @returns {Promise<boolean>} Success status
     */
    async sendCustomEmail(emailData) {
        try {
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: emailData.to,
                subject: emailData.subject,
                text: emailData.text,
                html: emailData.html,
            };

            if (emailData.cc) {
                mailOptions.cc = emailData.cc;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Custom email sent successfully to ${emailData.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending custom email to ${emailData.to}:`, error.message);
            return false;
        }
    }

    /**
     * Send bulk welcome emails to multiple users
     * @param {Array} usersData - Array of user data objects
     * @returns {Promise<Array>} Array of results for each email
     */
    async sendBulkWelcomeEmails(usersData) {
        const results = [];
        
        for (const userData of usersData) {
            const result = await this.sendWelcomeEmail(userData);
            results.push({
                email: userData.userEmail,
                success: result,
                timestamp: new Date().toISOString()
            });
        }
        
        return results;
    }

    /**
     * Send password sharing email for admin password resets
     * @param {Object} userData - User data object
     * @returns {Promise<boolean>} Success status
     */
    async sendPasswordSharingEmail(userData) {
        try {
            const { subject, text, html } = getPasswordSharingTemplate(userData);
            
            const mailOptions = {
                from: 'tt.support@kriasol.com',
                to: userData.userEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Password sharing email sent successfully to ${userData.userEmail}`);
            return true;
        } catch (error) {
            console.error(`Error sending password sharing email to ${userData.userEmail}:`, error.message);
            return false;
        }
    }
}

module.exports = EmailService;
