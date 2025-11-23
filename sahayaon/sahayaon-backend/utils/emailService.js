// utils/emailService.js

const { getWelcomeEmailTemplate, getPasswordResetTemplate, getTicketNotificationTemplate, getTicketStatusUpdateTemplate, getTicketClosedTemplate, getTicketAssignmentTemplate, getUserTicketAssignmentTemplate, getTicketCancellationTemplate, getTicketCommentTemplate, getPasswordSharingTemplate, getAttachmentUploadTemplate } = require('./emailTemplates');

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
            // Validate required environment variables
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured - cannot send welcome email to ${userData.userEmail}`);
                return false;
            }

            // Validate transporter
            if (!this.transporter) {
                console.error(`[EmailService] Email transporter not initialized - cannot send welcome email to ${userData.userEmail}`);
                return false;
            }

            // Validate user data
            if (!userData.userEmail) {
                console.error(`[EmailService] Missing userEmail in userData`);
                return false;
            }

            const { subject, text, html } = getWelcomeEmailTemplate(userData);
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: userData.userEmail,
                subject: subject,
                text: text,
                html: html,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`[EmailService] Welcome email sent successfully to ${userData.userEmail}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error sending welcome email to ${userData.userEmail}:`, error.message);
            console.error(`[EmailService] Error details:`, error);
            // Log more details for debugging
            if (error.code) {
                console.error(`[EmailService] Error code: ${error.code}`);
            }
            if (error.response) {
                console.error(`[EmailService] SMTP response: ${error.response}`);
            }
            return false;
        }
    }

    /**
     * Send password reset email
     * To: User only
     * CC: (none)
     * @param {Object} userData - User data object
     * @param {string} userData.userName - User's full name
     * @param {string} userData.resetUrl - Password reset URL
     * @param {string} userData.userEmail - User's email address
     * @returns {Promise<boolean>} Success status
     */
    async sendPasswordResetEmail(userData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            if (!userData.userEmail) {
                console.error(`[EmailService] Missing userEmail in userData`);
                return false;
            }

            const { subject, text, html } = getPasswordResetTemplate(userData);
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
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
     * Send ticket notification email (Ticket Creation)
     * To: User, Distribution List
     * CC: (none)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketNotificationEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getTicketNotificationTemplate(ticketData);
            
            // To: User + Distribution List
            const toList = [];
            if (ticketData.userEmail) {
                toList.push(ticketData.userEmail);
            }
            if (process.env.DISTRIBUTION_EMAIL) {
                toList.push(process.env.DISTRIBUTION_EMAIL);
            }
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.join(','),
                subject: subject,
                text: text,
                html: html,
            };

            // Only add CC if provided
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket notification email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket notification email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket status update notification email (Ticket Updated)
     * To: User, Engineer
     * CC: Distribution List (if provided)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketStatusUpdateEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getTicketStatusUpdateTemplate(ticketData);
            
            // To: User + Engineer (from toEmail field which should contain both)
            const toList = ticketData.toEmail ? ticketData.toEmail.split(',').map(e => e.trim()) : [];
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.length > 0 ? toList.join(',') : process.env.DISTRIBUTION_EMAIL,
                subject: subject,
                text: text,
                html: html,
            };

            // CC: Distribution List + assigned engineer (if provided)
            const ccList = [];
            if (ticketData.ccEmail) {
                ccList.push(...ticketData.ccEmail.split(',').map(e => e.trim()));
            }
            if (ccList.length > 0) {
                mailOptions.cc = ccList.join(',');
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket status update email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket status update email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket assignment notification email (Ticket Assigned)
     * To: User, Engineer, Distribution List
     * CC: (varies based on context)
     * @param {Object} ticketData - Ticket data object
     * @param {boolean} isUserNotification - Whether this is a user notification (true) or team notification (false)
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketAssignmentEmail(ticketData, isUserNotification = false) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            // Choose template based on recipient type
            const template = isUserNotification ? getUserTicketAssignmentTemplate : getTicketAssignmentTemplate;
            const { subject, text, html } = template(ticketData);
            
            // To: User + Engineer + Distribution List
            const toList = ticketData.toEmail ? ticketData.toEmail.split(',').map(e => e.trim()) : [];
            if (!toList.includes(process.env.DISTRIBUTION_EMAIL)) {
                toList.push(process.env.DISTRIBUTION_EMAIL);
            }
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.join(','),
                subject: subject,
                text: text,
                html: html,
            };

            // CC: (varies - add if provided)
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

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
     * Send ticket assignment notification email to users (Ticket Assigned)
     * To: User, Engineer, Distribution List
     * CC: (varies)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendUserTicketAssignmentEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getUserTicketAssignmentTemplate(ticketData);
            
            // To: User + Engineer + Distribution List
            const toList = ticketData.toEmail ? ticketData.toEmail.split(',').map(e => e.trim()) : [];
            if (!toList.includes(process.env.DISTRIBUTION_EMAIL)) {
                toList.push(process.env.DISTRIBUTION_EMAIL);
            }
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.join(','),
                subject: subject,
                text: text,
                html: html,
            };

            // CC: (varies - add if provided)
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`User ticket assignment email sent successfully to: ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending user ticket assignment email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket closed/resolved email (Ticket Closed)
     * To: User, Distribution List
     * CC: (varies)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketClosedEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getTicketClosedTemplate(ticketData);
            
            // To: User + Distribution List
            const toList = [];
            if (ticketData.userEmail) {
                toList.push(ticketData.userEmail);
            }
            if (process.env.DISTRIBUTION_EMAIL) {
                toList.push(process.env.DISTRIBUTION_EMAIL);
            }
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.join(','),
                subject: subject,
                text: text,
                html: html,
            };

            // CC: (varies - add if provided)
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket closed email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket closed email:`, error.message);
            return false;
        }
    }

    /**
     * Send ticket cancellation notification email
     * To: User, Distribution List
     * CC: (varies)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketCancellationEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getTicketCancellationTemplate(ticketData);
            
            // To: User + Distribution List
            const toList = [];
            if (ticketData.userEmail) {
                toList.push(ticketData.userEmail);
            }
            if (process.env.DISTRIBUTION_EMAIL) {
                toList.push(process.env.DISTRIBUTION_EMAIL);
            }
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.length > 0 ? toList.join(',') : process.env.DISTRIBUTION_EMAIL,
                subject: subject,
                text: text,
                html: html,
            };

            // CC: (varies - add if provided)
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

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
     * To: User, Engineer (varies)
     * CC: Distribution List (if provided)
     * @param {Object} ticketData - Ticket data object
     * @returns {Promise<boolean>} Success status
     */
    async sendTicketCommentEmail(ticketData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getTicketCommentTemplate(ticketData);
            
            // To: User + Engineer (from toEmail field)
            const toList = ticketData.toEmail ? ticketData.toEmail.split(',').map(e => e.trim()) : [];
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.length > 0 ? toList.join(',') : process.env.DISTRIBUTION_EMAIL,
                subject: subject,
                text: text,
                html: html,
            };

            // CC: Distribution List (if provided)
            if (ticketData.ccEmail) {
                mailOptions.cc = ticketData.ccEmail;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Ticket comment email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending ticket comment email:`, error.message);
            return false;
        }
    }

    /**
     * Send attachment upload notification email
     * To: User, Engineer (varies)
     * CC: Distribution List (if provided)
     * @param {Object} attachmentData - Attachment data object
     * @returns {Promise<boolean>} Success status
     */
    async sendAttachmentUploadEmail(attachmentData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            const { subject, text, html } = getAttachmentUploadTemplate(attachmentData);
            
            // To: User + Engineer (from toEmail field)
            const toList = attachmentData.toEmail ? attachmentData.toEmail.split(',').map(e => e.trim()) : [];
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
                to: toList.length > 0 ? toList.join(',') : process.env.DISTRIBUTION_EMAIL,
                subject: subject,
                text: text,
                html: html,
            };

            // CC: Distribution List (if provided)
            if (attachmentData.ccEmail) {
                mailOptions.cc = attachmentData.ccEmail;
            }

            await this.transporter.sendMail(mailOptions);
            console.log(`Attachment upload email sent successfully to ${mailOptions.to}`);
            return true;
        } catch (error) {
            console.error(`Error sending attachment upload email:`, error.message);
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
                from: process.env.DISTRIBUTION_EMAIL,
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
     * To: User only
     * CC: (none)
     * @param {Object} userData - User data object
     * @returns {Promise<boolean>} Success status
     */
    async sendPasswordSharingEmail(userData) {
        try {
            if (!process.env.DISTRIBUTION_EMAIL) {
                console.error(`[EmailService] DISTRIBUTION_EMAIL not configured`);
                return false;
            }

            if (!userData.userEmail) {
                console.error(`[EmailService] Missing userEmail in userData`);
                return false;
            }

            const { subject, text, html } = getPasswordSharingTemplate(userData);
            
            const mailOptions = {
                from: process.env.DISTRIBUTION_EMAIL,
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
