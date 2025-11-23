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
            
            .content, .footer {
                padding: 20px;
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
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This is an automated message from SahayaOn.</p>
            <div class="contact">
                <p>Powered by KriaSol Technologies</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
};

/**
 * Helper function to format user's full name
 * @param {Object} userData - User data object
 * @returns {string} Formatted full name
 */
const formatUserName = (userData) => {
    const { firstName = '', lastName = '', userName = '' } = userData;
    // Trim whitespace and check if both names exist
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    
    if (first && last) {
        return `${first} ${last}`;
    }
    // If only one name exists, use it
    if (first) {
        return first;
    }
    if (last) {
        return last;
    }
    // Fallback to userName
    return (userName || '').trim() || '';
};

/**
 * Welcome email template for new users (User Created)
 * @param {Object} userData - User data object
 * @returns {Object} Email content with subject, text, and html
 */
const getWelcomeEmailTemplate = (userData) => {
    const {
        firstName = '',
        lastName = '',
        userName = '',
        userEmail = '',
        username = userEmail,
        tempPassword = '',
        password = tempPassword,
        portalUrl = ''
    } = userData;
    const fullName = formatUserName({ firstName, lastName, userName });
    const subject = `Welcome to SahayaOn – Your Account Details`;
    const textContent = `
Hi ${fullName},

Your access to SahayaOn has been successfully created. You are now part of a streamlined IT service ecosystem.

Login Details:

Username: ${username || userEmail}

Temporary Password: ${password || tempPassword}

Portal URL: ${portalUrl}

For security, please change your password at first login.

Your experience now becomes more proactive and efficient.

Regards

SahayaOn Admin

KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your access to SahayaOn has been successfully created. You are now part of a streamlined IT service ecosystem.</p>
        
        <div class="info-box">
            <h3>Login Details:</h3>
            <ul>
                <li><strong>Username:</strong> <span class="highlight">${username || userEmail}</span></li>
                <li><strong>Temporary Password:</strong> <span class="highlight">${password || tempPassword}</span></li>
                <li><strong>Portal URL:</strong> <a href="${portalUrl}" class="button">Access Portal</a></li>
            </ul>
        </div>
        
        <div class="warning">
            <strong>For security, please change your password at first login.</strong>
        </div>
        
        <p>Your experience now becomes more proactive and efficient.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Admin</strong></p>
        <p>KriaSol Technologies</p>
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
        firstName = '',
        lastName = '',
        userName = '',
        password = '',
        tempPassword = password,
        newPassword = password || tempPassword,
        portalUrl = '',
        resetUrl = portalUrl
    } = userData;
    const fullName = formatUserName({ firstName, lastName, userName });
    const subject = `SahayaOn Password Reset Successful`;
    const textContent = `
Hi ${fullName},

Your password has been reset as requested.

New Temporary Password: ${newPassword || tempPassword || password}

Portal URL: ${portalUrl || resetUrl}

Please log in and update your password to maintain account security.

Your access workflows remain uninterrupted.

Regards

SahayaOn System

KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your password has been reset as requested.</p>
        
        <div class="info-box">
            <ul>
                <li><strong>New Temporary Password:</strong> <span class="highlight">${newPassword || tempPassword || password}</span></li>
                <li><strong>Portal URL:</strong> <a href="${portalUrl || resetUrl}" class="button">Access Portal</a></li>
            </ul>
        </div>
        
        <div class="warning">
            <strong>Please log in and update your password to maintain account security.</strong>
        </div>
        
        <p>Your access workflows remain uninterrupted.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn System</strong></p>
        <p>KriaSol Technologies</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket notification email template (Ticket Creation)
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketNotificationTemplate = (ticketData) => {
    const {
        ticketId = '',
        firstName = '',
        lastName = '',
        userName = '',
        category = '',
        priority = 'Low',
        description = '',
        ticketUrl = ''
    } = ticketData;
    const fullName = formatUserName({ firstName, lastName, userName });
    const emailSubject = `[SahayaOn] Ticket Logged – ${ticketId}`;
    const textContent = `
Hi ${fullName},

Your request has been successfully logged in SahayaOn. Our team is activating the workflow to address it.

Ticket details:

Ticket ID: ${ticketId}${ticketUrl ? `\nView Ticket: ${ticketUrl}` : ''}

Category: ${category}

Priority: ${priority}

Description: ${description}

You will receive further updates as the ticket progresses.

Our team is aligned and tracking towards closure.

Regards

SahayaOn Support

Powered by KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your request has been successfully logged in SahayaOn. Our team is activating the workflow to address it.</p>
        
        <div class="info-box">
            <h3>Ticket details:</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${ticketId}</a>` : ticketId}</li>
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Priority:</strong> <span class="highlight">${priority}</span></li>
                <li><strong>Description:</strong> ${description}</li>
            </ul>
        </div>
        
        <p>You will receive further updates as the ticket progresses.</p>
        
        <p>Our team is aligned and tracking towards closure.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Support</strong></p>
        <p>Powered by KriaSol Technologies</p>
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
        ticketId = display_id,
        firstName = '',
        lastName = '',
        userName = '',
        status = '',
        updateNotes = '',
        ticketUrl = ''
    } = ticketData;
    const fullName = formatUserName({ firstName, lastName, userName });
    const subject = `[SahayaOn] Ticket Update – ${ticketId || display_id}`;
    const textContent = `
Hi ${fullName},

Your ticket has been updated with the latest progress.

Ticket ID: ${ticketId || display_id}${ticketUrl ? `\nView Ticket: ${ticketUrl}` : ''}

Current Status: ${status}

Update Notes: ${updateNotes}

Our team is actively driving next steps to closure.

Regards

SahayaOn Support

KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your ticket has been updated with the latest progress.</p>
        
        <div class="info-box">
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${ticketId || display_id}</a>` : (ticketId || display_id)}</li>
                <li><strong>Current Status:</strong> <span class="highlight">${status}</span></li>
                <li><strong>Update Notes:</strong> ${updateNotes}</li>
            </ul>
        </div>
        
        <p>Our team is actively driving next steps to closure.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Support</strong></p>
        <p>KriaSol Technologies</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket closed email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketClosedTemplate = (ticketData) => {
    const {
        display_id = '',
        ticketId = display_id,
        firstName = '',
        lastName = '',
        userName = '',
        resolutionSummary = '',
        ticketUrl = ''
    } = ticketData;
    const fullName = formatUserName({ firstName, lastName, userName });
    const subject = `[SahayaOn] Ticket Resolved – ${ticketId || display_id}`;
    const textContent = `
Hi ${fullName},

This ticket has been resolved and closed in SahayaOn.

Ticket ID: ${ticketId || display_id}${ticketUrl ? `\nView Ticket: ${ticketUrl}` : ''}

Resolution Summary: ${resolutionSummary}

If you believe further action is required, please reopen the ticket or submit a new request through the portal.

We remain committed to seamless IT support.

Regards

SahayaOn Support

Powered by KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>This ticket has been resolved and closed in SahayaOn.</p>
        
        <div class="info-box">
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${ticketId || display_id}</a>` : (ticketId || display_id)}</li>
                <li><strong>Resolution Summary:</strong> ${resolutionSummary}</li>
            </ul>
        </div>
        
        <p>If you believe further action is required, please reopen the ticket or submit a new request through the portal.</p>
        
        <p>We remain committed to seamless IT support.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Support</strong></p>
        <p>Powered by KriaSol Technologies</p>
    `);
    return {
        subject,
        text: textContent,
        html: htmlContent
    };
};

/**
 * Ticket assignment email template
 * @param {Object} ticketData - Ticket data object
 * @returns {Object} Email content with subject, text, and html
 */
const getTicketAssignmentTemplate = (ticketData) => {
    const {
        display_id = '',
        ticketId = display_id,
        engineerName = '',
        assignedEngineerEmail = engineerName,
        userName = '',
        reporterName = userName,
        priority = 'Low',
        ticketUrl = ''
    } = ticketData;
    const subject = `[SahayaOn] Ticket Assigned – ${ticketId || display_id}`;
    const textContent = `
Hi Team,

The ticket below has been assigned for execution. Ownership is now active.

Ticket ID: ${ticketId || display_id}${ticketUrl ? `\nView Ticket: ${ticketUrl}` : ''}

Assigned To: ${engineerName || assignedEngineerEmail}

Priority: ${priority}

${engineerName || assignedEngineerEmail}, please drive resolution as per SLA commitments.

${userName || reporterName}, you will be notified as the ticket progresses.

Regards

SahayaOn Notifications

KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi Team,</p>
        
        <p>The ticket below has been assigned for execution. Ownership is now active.</p>
        
        <div class="info-box">
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${ticketId || display_id}</a>` : (ticketId || display_id)}</li>
                <li><strong>Assigned To:</strong> <span class="highlight">${engineerName || assignedEngineerEmail}</span></li>
                <li><strong>Priority:</strong> <span class="highlight">${priority}</span></li>
            </ul>
        </div>
        
        <p><strong>${engineerName || assignedEngineerEmail}</strong>, please drive resolution as per SLA commitments.</p>
        
        <p><strong>${userName || reporterName}</strong>, you will be notified as the ticket progresses.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Notifications</strong></p>
        <p>KriaSol Technologies</p>
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

Great news! Your ticket has been assigned to an engineer and is now being worked on.

Ticket Details:
- Ticket ID: ${display_id}${ticketUrl ? `\n  View Ticket: ${ticketUrl}` : ''}
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
        
        <div class="success">
            <strong>Great news! Your ticket has been assigned to an engineer and is now being worked on.</strong>
        </div>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${display_id}</a>` : display_id}</li>
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

This is to inform you that your ticket has been cancelled in the Enterprise Ticketing System.

Cancelled Ticket Details:
- Ticket ID: ${display_id}${ticketUrl ? `\n  View Ticket: ${ticketUrl}` : ''}
- Subject: ${short_description}

If you believe this cancellation was made in error or have any questions regarding this action, please contact our support team immediately.

You can view the ticket details and cancellation reason through the Enterprise Ticketing Portal.

Thank you,
IT Team
Sahayaon Technologies LLP
    `;
    const htmlContent = createBaseTemplate(() => `
        <h2>Ticket Cancellation Notice</h2>
        
        <div class="warning">
            <strong>This is to inform you that your ticket has been cancelled in the Enterprise Ticketing System.</strong>
        </div>
        
        <div class="info-box">
            <h3>Cancelled Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${display_id}</a>` : display_id}</li>
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

A new comment has been added to your ticket in the Enterprise Ticketing System.

Ticket Details:
- Ticket ID: ${display_id}${ticketUrl ? `\n  View Ticket: ${ticketUrl}` : ''}
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
        
        <p>A new comment has been added to your ticket in the <strong>Enterprise Ticketing System</strong>.</p>
        
        <div class="info-box">
            <h3>Ticket Details</h3>
            <ul>
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${display_id}</a>` : display_id}</li>
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
        firstName = '',
        lastName = '',
        userName = '',
        userEmail = '',
        newPassword = '',
        password = newPassword,
        tempPassword = newPassword || password,
        loginUrl = '',
        portalUrl = loginUrl
    } = userData;
    const fullName = formatUserName({ firstName, lastName, userName });
    
    const subject = `SahayaOn Password Reset Successful`;
    const textContent = `
Hi ${fullName},

Your password has been reset as requested.

New Temporary Password: ${tempPassword || newPassword || password}

Portal URL: ${portalUrl || loginUrl}

Please log in and update your password to maintain account security.

Your access workflows remain uninterrupted.

Regards

SahayaOn System

KriaSol Technologies
    `;
    
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your password has been reset as requested.</p>
        
        <div class="info-box">
            <ul>
                <li><strong>New Temporary Password:</strong> <span class="highlight">${tempPassword || newPassword || password}</span></li>
                <li><strong>Portal URL:</strong> <a href="${portalUrl || loginUrl}" class="button">Access Portal</a></li>
            </ul>
        </div>
        
        <div class="warning">
            <strong>Please log in and update your password to maintain account security.</strong>
        </div>
        
        <p>Your access workflows remain uninterrupted.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn System</strong></p>
        <p>KriaSol Technologies</p>
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
- Ticket ID: ${display_id}${ticketUrl ? `\n  View Ticket: ${ticketUrl}` : ''}
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
                <li><strong>Ticket ID:</strong> ${ticketUrl ? `<a href="${ticketUrl}" style="color: #3182ce; text-decoration: underline;">${display_id}</a>` : display_id}</li>
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

/**
 * Client onboarding email template (Client Admin Account Creation)
 * @param {Object} clientData - Client admin data object
 * @returns {Object} Email content with subject, text, and html
 */
const getClientOnboardingTemplate = (clientData) => {
    const {
        firstName = '',
        lastName = '',
        adminName = '',
        adminUsername = '',
        adminPassword = '',
        portalUrl = ''
    } = clientData;
    const fullName = formatUserName({ firstName, lastName, userName: adminName });
    const subject = `Welcome to SahayaOn – Client Onboarding Successful`;
    const textContent = `
Hi ${fullName},

Your organization is now fully onboarded onto SahayaOn – Powered by KriaSol Technologies.

Your admin account is ready, giving you complete visibility and control over tickets raised by your teams.

Admin Login Credentials:

Username: ${adminUsername}

Password: ${adminPassword}

Portal URL: ${portalUrl}

You can now manage users, view tickets, track SLAs, and monitor services in real time.

We look forward to supporting your operations with enterprise-grade reliability.

Regards

SahayaOn Onboarding Team

KriaSol Technologies
    `;
    const htmlContent = createBaseTemplate(() => `
        <p>Hi <strong>${fullName}</strong>,</p>
        
        <p>Your organization is now fully onboarded onto SahayaOn – Powered by KriaSol Technologies.</p>
        
        <p>Your admin account is ready, giving you complete visibility and control over tickets raised by your teams.</p>
        
        <div class="info-box">
            <h3>Admin Login Credentials:</h3>
            <ul>
                <li><strong>Username:</strong> <span class="highlight">${adminUsername}</span></li>
                <li><strong>Password:</strong> <span class="highlight">${adminPassword}</span></li>
                <li><strong>Portal URL:</strong> <a href="${portalUrl}" class="button">Access Portal</a></li>
            </ul>
        </div>
        
        <p>You can now manage users, view tickets, track SLAs, and monitor services in real time.</p>
        
        <p>We look forward to supporting your operations with enterprise-grade reliability.</p>
        
        <p>Regards</p>
        <p><strong>SahayaOn Onboarding Team</strong></p>
        <p>KriaSol Technologies</p>
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
    getTicketClosedTemplate,
    getTicketAssignmentTemplate,
    getUserTicketAssignmentTemplate,
    getTicketCancellationTemplate,
    getTicketCommentTemplate,
    getPasswordSharingTemplate,
    getAttachmentUploadTemplate,
    getClientOnboardingTemplate,
    createBaseTemplate
};