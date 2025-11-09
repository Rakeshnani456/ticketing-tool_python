// utils/emailTemplates.js
/**
 * Professional email templates for the enterprise ticketing system
 */
// Base template wrapper - modified to accept a function for proper variable evaluation
const createBaseTemplate = (contentFunction) => {
    const content = typeof contentFunction === 'function' ? contentFunction() : contentFunction;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sahayaon Technologies Enterprise Ticketing System</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 650px;
            margin: 0 auto;
            padding: 0;
            background-color: #f8f9fa;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            overflow: hidden;
            margin: 20px 0;
        }
        
        /* Header styles */
        .header {
            background: #e85c34;
            color: white;
            padding: 30px 40px;
            text-align: center;
            position: relative;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: #d1451f;
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
        }
        
        .header .tagline {
            font-size: 16px;
            font-weight: 300;
            margin-top: 8px;
            opacity: 0.9;
        }
        
        /* Content styles */
        .content {
            padding: 32px;
        }
        
        h2 {
            color: #1a365d;
            font-size: 24px;
            margin: 0 0 20px 0;
            font-weight: 600;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
        }
        
        h3 {
            color: #2d3748;
            font-size: 18px;
            margin: 0 0 12px 0;
            font-weight: 600;
        }
        
        p {
            margin: 0 0 12px 0;
            font-size: 16px;
            line-height: 1.5;
        }
        
        /* Button styles */
        .button {
            display: inline-block;
            background: #3182ce !important;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 16px 0;
            border: 2px solid #3182ce;
        }
        
        /* Info box styles */
        .info-box {
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 16px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        
        .info-box h3 {
            color: #2d3748;
            margin: 0 0 12px 0;
            font-size: 18px;
            display: flex;
            align-items: center;
        }
        
        .info-box h3::before {
            content: '•';
            color: #3182ce;
            font-size: 24px;
            margin-right: 10px;
        }
        
        .info-box ul {
            margin: 12px 0;
            padding-left: 20px;
        }
        
        .info-box li {
            margin: 8px 0;
            font-size: 16px;
        }
        
        .info-box li strong {
            color: #2d3748;
        }
        
        /* Highlight styles */
        .highlight {
            background-color: #ebf8ff;
            color: #2b6cb0;
            padding: 3px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        
        /* Warning styles */
        .warning {
            background-color: #fff5f5;
            border-left: 4px solid #e53e3e;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 16px 0;
            color: #742a2a;
        }
        
        .warning strong {
            color: #c53030;
            font-weight: 600;
        }
        
        /* Success styles */
        .success {
            background-color: #f0fff4;
            border-left: 4px solid #38a169;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 16px 0;
            color: #276749;
        }
        
        .success strong {
            color: #2f855a;
            font-weight: 600;
        }
        
        /* Comment styles */
        .comment-box {
            background-color: #f7fafc;
            border-left: 4px solid #3182ce;
            border-radius: 6px;
            padding: 16px;
            margin: 16px 0;
            font-style: italic;
        }
        
        .comment-meta {
            font-size: 14px;
            color: #718096;
            margin-bottom: 10px;
            font-style: normal;
            font-weight: 600;
        }
        
        /* Footer styles */
        .footer {
            background-color: #f7fafc;
            border-top: 1px solid #e2e8f0;
            padding: 30px 40px;
            color: #4a5568;
            font-size: 14px;
            text-align: center;
        }
        
        .footer p {
            margin-bottom: 12px;
        }
        
        .footer a {
            color: #3182ce;
            text-decoration: none;
            font-weight: 500;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .footer .contact {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        
        /* List styles */
        ol, ul {
            margin: 12px 0;
            padding-left: 20px;
        }
        
        li {
            margin: 6px 0;
            font-size: 16px;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            body {
                padding: 0;
            }
            
            .header, .content, .footer {
                padding: 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
            
            h2 {
                font-size: 20px;
            }
            
            .button {
                display: block;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Sahayaon Technologies</h1>
            <div class="tagline">Enterprise Ticketing System</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This is an automated message from the Sahayaon Technologies Enterprise Ticketing System.</p>
            <div class="contact">
                <p>For technical support, contact: <a href="mailto:HelloIT@kriasol.com">HelloIT@kriasol.com</a></p>
                <p>© 2025 Kriasol Technologies LLP. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
};

/**
 * Welcome email template for new users
 * @param {Object} userData - User data object
 * @returns {Object} Email content with subject, text, and html
 */
const getWelcomeEmailTemplate = (userData) => {
    const {
        userName = '',
        clientName = '',
        portalUrl = '',
        userEmail = '',
        tempPassword = '',
        companyName = ''
    } = userData;
    const subject = `Welcome to ${clientName || companyName} Enterprise Ticketing Portal – Your Account Details`;
    const textContent = `
Dear ${userName},

Welcome to the ${clientName || companyName} Enterprise Ticketing Portal, powered by Sahayaon Technologies.

Your account has been successfully created in our enterprise ticketing system. Below you will find your temporary login credentials:

Portal URL: ${portalUrl}
Username / Email: ${userEmail}
Temporary Password: ${tempPassword}

SECURITY NOTICE:
For your account security, please log in using the above credentials and immediately change your password upon first login.

GETTING STARTED:
1. Access the portal using the URL provided above.
2. Sign in with your username/email and temporary password.
3. You will be prompted to create a new secure password.
4. Complete your profile setup and begin utilizing the portal for efficient ticket management.

If you encounter any issues during the login process or have questions about the system, please contact our enterprise support team at HelloIT@kriasol.com.

Thank you for partnering with Sahayaon Technologies.

Best regards,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Welcome to ${clientName || companyName} Enterprise Ticketing Portal</h2>
        
        <p>Dear <strong>${userName}</strong>,</p>
        
        <p>Welcome to the <strong>${clientName || companyName} Enterprise Ticketing Portal</strong>, powered by Sahayaon Technologies.</p>
        
        <p>Your account has been successfully created in our enterprise ticketing system. Below you will find your temporary login credentials:</p>
        
        <div class="info-box">
            <h3>Your Account Details</h3>
            <ul>
                <li><strong>Portal URL:</strong> <a href="${portalUrl}" class="button">Access Enterprise Portal</a></li>
                <li><strong>Username / Email:</strong> <span class="highlight">${userEmail}</span></li>
                <li><strong>Temporary Password:</strong> <span class="highlight">${tempPassword}</span></li>
            </ul>
        </div>
        
        <div class="warning">
            <strong>SECURITY NOTICE:</strong> For your account security, please log in using the above credentials and immediately change your password upon first login.
        </div>
        
        <div class="info-box">
            <h3>Getting Started</h3>
            <ol>
                <li>Access the portal using the URL provided above.</li>
                <li>Sign in with your username/email and temporary password.</li>
                <li>You will be prompted to create a new secure password.</li>
                <li>Complete your profile setup and begin utilizing the portal for efficient ticket management.</li>
            </ol>
        </div>
        
        <p>If you encounter any issues during the login process or have questions about the system, please contact our enterprise support team at <a href="mailto:HelloIT@kriasol.com">HelloIT@kriasol.com</a>.</p>
        
        <div class="success">
            <strong>Thank you for partnering with Sahayaon Technologies.</strong>
        </div>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Password reset email template
 * @param {Object} userData - User data object
 * @returns {Object} Email content with subject, text, and html
 */
const getPasswordResetTemplate = (userData) => {
    const {
        userName = '',
        resetUrl = '',
        userEmail = ''
    } = userData;
    const subject = 'Password Reset Request - Sahayaon Enterprise Ticketing System';
    const textContent = `
Dear ${userName},

We have received a password reset request for your account in the Sahayaon Enterprise Ticketing System.

To reset your password, please click on the following link:
${resetUrl}

SECURITY INFORMATION:
- If you did not initiate this password reset request, please disregard this email and contact our security team immediately.
- This password reset link will expire in 24 hours for security purposes.
- For your account protection, never share your password with anyone.

If you have any questions or concerns about your account security, please contact our enterprise support team at HelloIT@kriasol.com.

Best regards,
IT Security Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Password Reset Request</h2>
        
        <p>Dear <strong>${userName}</strong>,</p>
        
        <p>We have received a password reset request for your account in the <strong>Sahayaon Enterprise Ticketing System</strong>.</p>
        
        <p>To reset your password, please click on the button below:</p>
        
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        
        <div class="info-box">
            <h3>Security Information</h3>
            <ul>
                <li>If you did not initiate this password reset request, please disregard this email and contact our security team immediately.</li>
                <li>This password reset link will expire in <strong>24 hours</strong> for security purposes.</li>
                <li>For your account protection, never share your password with anyone.</li>
            </ul>
        </div>
        
        <p>If you have any questions or concerns about your account security, please contact our enterprise support team at <a href="mailto:HelloIT@kriasol.com">HelloIT@kriasol.com</a>.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket notification email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketNotificationTemplate = (ticketData) => {
    const {
        ticketId = '',
        subject = '',
        description = '',
        priority = 'Low',
        category = '',
        reporterName = '',
        ticketUrl = ''
    } = ticketData;
    const emailSubject = `[${priority} Priority] New Ticket Created - ${ticketId}`;
    const textContent = `
NEW TICKET NOTIFICATION

A new ticket has been submitted to the Enterprise Ticketing System.

Ticket Information:
- Ticket ID: ${ticketId}
- Subject: ${subject}
- Description: ${description}
- Priority: ${priority}
- Category: ${category}
- Reported by: ${reporterName}

Please review this ticket and take appropriate action based on its priority level.

You can view the full details and update the ticket status by accessing the link below:
${ticketUrl}

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>New Ticket Notification</h2>
        
        <p>A new ticket has been submitted to the <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Ticket Information</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketId}</li>
                <li><strong>Subject:</strong> ${subject}</li>
                <li><strong>Description:</strong> ${description}</li>
                <li><strong>Priority:</strong> <span class="highlight">${priority}</span></li>
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Reported by:</strong> ${reporterName}</li>
            </ul>
        </div>
        
        <p>Please review this ticket and take appropriate action based on its priority level.</p>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View Ticket Details</a>
        </div>
    `);
    return {
        subject: emailSubject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket status update email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketStatusUpdateTemplate = (ticketData) => {
    const {
        display_id = '',
        short_description = '',
        status = '',
        ticketUrl = '',
        toEmail = '',
        ccEmail = ''
    } = ticketData;
    const subject = `Status Update: Ticket ${display_id} - ${status}`;
    const textContent = `
TICKET STATUS UPDATE

Dear User,

This is to inform you that the status of your ticket has been updated in our Enterprise Ticketing System.

Ticket Details:
- Ticket ID: ${display_id}
- Subject: ${short_description}
- New Status: ${status}

You can view the complete ticket history and additional details by accessing the Enterprise Ticketing Portal.

If you have any questions regarding this update, please reach out to the IT Team.

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Ticket Status Update</h2>
        
        <p>Dear User,</p>
        
        <p>This is to inform you that the status of your ticket has been updated in our <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
                <li><strong>New Status:</strong> <span class="highlight">${status}</span></li>
            </ul>
        </div>
        
        <p>You can view the complete ticket history and additional details by accessing the Enterprise Ticketing Portal.</p>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View Ticket Details</a>
        </div>
        
        <p>If you have any questions regarding this update, please reach out to the IT Team.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket assignment email template for internal team communication
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketAssignmentTemplate = (ticketData) => {
    const {
        display_id = '',
        short_description = '',
        assignedEngineerEmail = '',
        ticketUrl = '',
        toEmail = '',
        ccEmail = ''
    } = ticketData;
    const subject = `Assignment Notification: Ticket ${display_id}`;
    const textContent = `
TICKET ASSIGNMENT NOTIFICATION

Dear Team,

This notification is to inform you that a ticket has been assigned in the Enterprise Ticketing System.

Assignment Details:
- Ticket ID: ${display_id}
- Subject: ${short_description}
- Assigned Engineer: ${assignedEngineerEmail}

Please review the ticket details and take appropriate action. We kindly request that you acknowledge receipt of this assignment and provide an estimated resolution timeframe.

You can access the ticket and update its status through the Enterprise Ticketing Portal.

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Ticket Assignment Notification</h2>
        
        <p>Dear Team,</p>
        
        <p>This notification is to inform you that a ticket has been assigned in the <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Assignment Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
                <li><strong>Assigned Engineer:</strong> <span class="highlight">${assignedEngineerEmail}</span></li>
            </ul>
        </div>
        
        <p>Please review the ticket details and take appropriate action. We kindly request that you acknowledge receipt of this assignment and provide an estimated resolution timeframe.</p>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View Assigned Ticket</a>
        </div>
        
        <p>You can access the ticket and update its status through the Enterprise Ticketing Portal.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket assignment notification email template for users
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getUserTicketAssignmentTemplate = (ticketData) => {
    const {
        display_id = '',
        short_description = '',
        assignedEngineerEmail = '',
        ticketUrl = '',
        toEmail = '',
        ccEmail = ''
    } = ticketData;
    const subject = `Your Ticket Has Been Assigned - ${display_id}`;
    const textContent = `
TICKET ASSIGNMENT UPDATE

Dear User,

Great news! Your ticket has been assigned to an engineer and is now being worked on.

Ticket Details:
- Ticket ID: ${display_id}
- Subject: ${short_description}
- Assigned Engineer: ${assignedEngineerEmail}

Your ticket is now in progress and our team is working to resolve your issue as quickly as possible.

You can track the progress of your ticket through the Enterprise Ticketing Portal.

Thank you for your patience,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Ticket Assignment Update</h2>
        
        <p>Dear User,</p>
        
        <div class="success">
            <strong>Great news! Your ticket has been assigned to an engineer and is now being worked on.</strong>
        </div>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
                <li><strong>Assigned Engineer:</strong> <span class="highlight">${assignedEngineerEmail}</span></li>
            </ul>
        </div>
        
        <p>Your ticket is now in progress and our team is working to resolve your issue as quickly as possible.</p>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">Track Your Ticket</a>
        </div>
        
        <p>You can track the progress of your ticket through the Enterprise Ticketing Portal.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket cancellation email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketCancellationTemplate = (ticketData) => {
    const {
        display_id = '',
        short_description = '',
        ticketUrl = '',
        toEmail = '',
        ccEmail = ''
    } = ticketData;
    const subject = `Cancellation Notice: Ticket ${display_id}`;
    const textContent = `
TICKET CANCELLATION NOTICE

Dear User,

This is to inform you that your ticket has been cancelled in the Enterprise Ticketing System.

Cancelled Ticket Details:
- Ticket ID: ${display_id}
- Subject: ${short_description}

If you believe this cancellation was made in error or have any questions regarding this action, please contact our support team immediately.

You can view the ticket details and cancellation reason through the Enterprise Ticketing Portal.

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Ticket Cancellation Notice</h2>
        
        <p>Dear User,</p>
        
        <div class="warning">
            <strong>This is to inform you that your ticket has been cancelled in the Enterprise Ticketing System.</strong>
        </div>
        
        <div class="info-box">
            <h3>Cancelled Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
            </ul>
        </div>
        
        <p>If you believe this cancellation was made in error or have any questions regarding this action, please contact our support team immediately.</p>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View Cancelled Ticket</a>
        </div>
        
        <p>You can view the ticket details and cancellation reason through the Enterprise Ticketing Portal.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket comment email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketCommentTemplate = (ticketData) => {
    const {
        display_id = '',
        short_description = '',
        comment_text = '',
        commenterEmail = '',
        ticketUrl = '',
        toEmail = '',
        ccEmail = ''
    } = ticketData;
    const subject = `New Comment on Ticket ${display_id}`;
    const textContent = `
NEW COMMENT NOTIFICATION

Dear User,

A new comment has been added to your ticket in the Enterprise Ticketing System.

Ticket Details:
- Ticket ID: ${display_id}
- Subject: ${short_description}
- Commented by: ${commenterEmail}

Comment:
${comment_text}

You can view this comment and respond to it through the Enterprise Ticketing Portal.

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>New Comment Notification</h2>
        
        <p>Dear User,</p>
        
        <p>A new comment has been added to your ticket in the <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
                <li><strong>Commented by:</strong> <span class="highlight">${commenterEmail}</span></li>
            </ul>
            </div>
        
        <div class="comment-box">
            <div class="comment-meta">Comment:</div>
            <p>${comment_text}</p>
        </div>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View and Respond to Comment</a>
        </div>
        
        <p>You can view this comment and respond to it through the Enterprise Ticketing Portal.</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Password sharing email template for admin password resets
 * @param {Object} userData - User data object
 * @returns {Object} Email content with subject, text, and html
 */
const getPasswordSharingTemplate = (userData) => {
    const {
        userName = '',
        companyName = '',
        userEmail = '',
        newPassword = '',
        loginUrl = ''
    } = userData;
    
    const subject = `Your New Password - Sahayaon Technologies Enterprise Ticketing System`;
    const textContent = `
Dear ${userName},

Your password has been reset by an administrator in the Sahayaon Technologies Enterprise Ticketing System.

Your new login credentials are:
- Email: ${userEmail}
- New Password: ${newPassword}
- Login URL: ${loginUrl}

SECURITY NOTICE:
- Please log in immediately and change your password to something secure and memorable
- Do not share this password with anyone
- If you did not request this password reset, please contact your IT administrator immediately

You can access the portal using the login URL above. Upon first login, you will be prompted to create a new password.

If you have any questions or need assistance, please contact your IT support team.

Best regards,
IT Team
Sahayaon Technologies LLP
    `;
    
    const htmlContent = createBaseTemplate(() => `
        <h2>Your Password Has Been Reset</h2>
        
        <p>Dear <strong>${userName}</strong>,</p>
        
        <p>Your password has been reset by an administrator in the <strong>Sahayaon Technologies Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Your New Login Credentials</h3>
            <ul>
                <li><strong>Email:</strong> <span class="highlight">${userEmail}</span></li>
                <li><strong>New Password:</strong> <span class="highlight">${newPassword}</span></li>
                <li><strong>Login URL:</strong> <a href="${loginUrl}" class="button">Access Enterprise Portal</a></li>
            </ul>
        </div>
        
        <div class="warning">
            <strong>SECURITY NOTICE:</strong> Please log in immediately and change your password to something secure and memorable. Do not share this password with anyone.
        </div>
        
        <div class="info-box">
            <h3>Next Steps</h3>
            <ol>
                <li>Access the portal using the login URL above</li>
                <li>Sign in with your email and the new password provided</li>
                <li>You will be prompted to create a new secure password</li>
                <li>Complete your profile setup if needed</li>
            </ol>
        </div>
        
        <p>If you did not request this password reset, please contact your IT administrator immediately.</p>
        
        <p>If you have any questions or need assistance, please contact your IT support team.</p>
        
        <div class="success">
            <strong>Thank you for using the Sahayaon Technologies Enterprise Ticketing System.</strong>
        </div>
    `);
    
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Attachment upload notification email template
 * @param {Object} attachmentData - Attachment data object
 * @returns {Object} Email content with subject, text, and html
 */
const getAttachmentUploadTemplate = (attachmentData) => {
    const {
        display_id = '',
        short_description = '',
        fileName = '',
        uploadedBy = '',
        ticketUrl = ''
    } = attachmentData;
    
    const subject = `Attachment Uploaded - Ticket ${display_id}`;
    const textContent = `
ATTACHMENT UPLOAD NOTIFICATION

An attachment has been uploaded to a ticket in the Enterprise Ticketing System.

Ticket Information:
- Ticket ID: ${display_id}
- Subject: ${short_description}
- Attachment: ${fileName}
- Uploaded by: ${uploadedBy}

You can view the ticket and attachment details by accessing the link below:
${ticketUrl}

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    
    const htmlContent = createBaseTemplate(() => `
        <h2>Attachment Upload Notification</h2>
        
        <p>An attachment has been uploaded to a ticket in the <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Ticket Information</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${display_id}</li>
                <li><strong>Subject:</strong> ${short_description}</li>
                <li><strong>Attachment:</strong> <span class="highlight">${fileName}</span></li>
                <li><strong>Uploaded by:</strong> ${uploadedBy}</li>
            </ul>
        </div>
        
        <div style="text-align: center;">
            <a href="${ticketUrl}" class="button">View Ticket Details</a>
        </div>
        
        <p>You can view the ticket and attachment details by accessing the link above.</p>
    `);
    
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

module.exports = {
    getWelcomeEmailTemplate,
    getPasswordResetTemplate,
    getTicketNotificationTemplate,
    getTicketStatusUpdateTemplate,
    getTicketAssignmentTemplate,
    getUserTicketAssignmentTemplate,
    getTicketCancellationTemplate,
    getTicketCommentTemplate,
    getPasswordSharingTemplate,
    getAttachmentUploadTemplate,
    createBaseTemplate
};