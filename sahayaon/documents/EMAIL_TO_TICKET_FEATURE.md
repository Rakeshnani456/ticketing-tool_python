# Email-to-Ticket Feature Documentation

## Overview

The Email-to-Ticket feature automatically converts incoming emails sent to a specific email address into support tickets in the Sahayaon ticketing system.

## Features

✅ **Automatic Ticket Creation**: Emails are automatically converted to tickets
✅ **Client Lookup**: Automatically identifies the client based on sender email
✅ **Default Settings**: Tickets are created with Low priority and Troubleshoot category
✅ **Attachment Handling**: Email attachments are processed and logged
✅ **Duplicate Prevention**: Processed emails are marked as read to prevent duplicates
✅ **Manual & Automatic Processing**: Can be triggered manually or run on a schedule

## How It Works

1. **Email Monitoring**: The system monitors a specified email inbox for unread emails
2. **Email Processing**: When unread emails are found, they are parsed and processed
3. **Client Identification**: The system looks up the client based on:
   - User account email match
   - Email domain match with client domains
   - Defaults to "Email-Generated" if no match found
4. **Ticket Creation**: A new ticket is created with:
   - **Requested By**: Sender's email
   - **Requested For**: Sender's email
   - **Short Description**: Email subject (truncated to 250 characters if needed)
   - **Long Description**: Email body (text or HTML)
   - **Priority**: Low (default)
   - **Category**: troubleshoot (default)
   - **Hostname/Asset ID**: "Email-Generated"
   - **Contact Number**: "N/A"
   - **Status**: Open
   - **Client Name**: Looked up or "Email-Generated"
5. **Notification**: Confirmation email sent to distribution list and sender
6. **Mark as Read**: Processed email is marked as read to prevent reprocessing

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Email-to-Ticket Configuration
ENABLE_EMAIL_TO_TICKET=true                    # Enable/disable automatic email polling
TICKET_EMAIL_USER=tickets@yourdomain.com       # Email address to monitor
TICKET_EMAIL_PASSWORD=your_email_password      # Email password
TICKET_EMAIL_HOST=outlook.office365.com        # IMAP host (default: outlook.office365.com)
TICKET_EMAIL_PORT=993                          # IMAP port (default: 993)
EMAIL_POLL_INTERVAL_MINUTES=5                  # How often to check for new emails (default: 5 minutes)
FRONTEND_URL=https://ticketingtoolv2.web.app   # Frontend URL for ticket links
```

### Supported Email Providers

The service uses IMAP to connect to email servers. Common configurations:

#### Office 365 / Outlook
```bash
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993
```

#### Gmail (requires App Password)
```bash
TICKET_EMAIL_HOST=imap.gmail.com
TICKET_EMAIL_PORT=993
```

**Note**: For Gmail, you need to:
1. Enable 2-Step Verification
2. Generate an App Password
3. Use the App Password in `TICKET_EMAIL_PASSWORD`

#### Other Providers
Contact your email provider for IMAP settings.

## API Endpoints

### 1. Process Emails Manually

**Endpoint**: `POST /api/email-to-ticket/process`

**Authorization**: Admin or Super Admin only

**Description**: Manually trigger email processing to check for new emails and create tickets.

**Response**:
```json
{
  "success": true,
  "message": "Processed 2 of 3 email(s)",
  "processed": 2,
  "total": 3,
  "results": [
    {
      "success": true,
      "ticketId": "abc123",
      "displayId": "INC000123",
      "email": "user@example.com",
      "subject": "Need help with login"
    }
  ]
}
```

### 2. Check Service Status

**Endpoint**: `GET /api/email-to-ticket/status`

**Authorization**: Admin or Super Admin only

**Description**: Get the current status of the email-to-ticket service.

**Response**:
```json
{
  "success": true,
  "status": {
    "enabled": true,
    "email": "tickets@yourdomain.com",
    "host": "outlook.office365.com",
    "port": 993,
    "isProcessing": false
  }
}
```

### 3. Test Configuration

**Endpoint**: `GET /api/email-to-ticket/test`

**Authorization**: Admin or Super Admin only

**Description**: Test if the email-to-ticket service is properly configured and can connect to the email server.

**Response**:
```json
{
  "success": true,
  "message": "Email-to-Ticket service is properly configured and can connect to the email server.",
  "config": {
    "user": "tickets@yourdomain.com",
    "host": "outlook.office365.com",
    "port": 993
  }
}
```

## Setup Instructions

### Step 1: Create Dedicated Email Address

Create a dedicated email address for receiving tickets (e.g., `tickets@yourdomain.com`).

### Step 2: Configure Environment Variables

Add the required environment variables to your `.env` file:

```bash
ENABLE_EMAIL_TO_TICKET=true
TICKET_EMAIL_USER=tickets@yourdomain.com
TICKET_EMAIL_PASSWORD=your_password
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993
EMAIL_POLL_INTERVAL_MINUTES=5
```

### Step 3: Restart Server

Restart your backend server to apply the changes:

```bash
cd sahayaon-backend
npm start
```

You should see these messages in the console:
```
✅ Email-to-Ticket service initialized
✅ Automatic email polling enabled (every 5 minutes)
```

### Step 4: Test the Configuration

Use the test endpoint to verify the configuration:

```bash
curl -X GET http://localhost:5000/api/email-to-ticket/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 5: Send Test Email

Send a test email to your ticket email address (e.g., `tickets@yourdomain.com`).

Wait for the next polling cycle (or trigger manually), and verify that a ticket was created.

### Step 6: Manual Processing (Optional)

You can manually trigger email processing:

```bash
curl -X POST http://localhost:5000/api/email-to-ticket/process \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Email Format Guidelines

### Subject Line
- Used as the ticket's short description
- Automatically truncated to 250 characters if longer
- Example: "Unable to access application"

### Email Body
- Used as the ticket's long description
- Both text and HTML formats are supported
- Example: "I have been trying to log in for the past hour but keep getting an error message..."

### Attachments
- Supported formats: PDF, JPG, PNG, DOC, DOCX
- Attachments are logged with metadata
- **Note**: Attachment files are not automatically uploaded to storage (metadata only)

### From Address
- Must be a valid email address
- Used to identify the client and create the ticket
- Both "Requested By" and "Requested For" will be set to this email

## Client Identification Logic

The system uses the following logic to identify the client:

1. **User Email Match**: Check if sender email matches a user account
   - If found, use that user's `client_name`

2. **Domain Match**: Extract email domain and check if it matches a client's domain
   - Example: `user@acme.com` → check for client with domain `acme.com`

3. **Default**: If no match found, set client name to "Email-Generated"

## Ticket Field Defaults

| Field | Default Value | Source |
|-------|---------------|--------|
| Requested By | Sender Email | Email From address |
| Requested For | Sender Email | Email From address |
| Short Description | Email Subject | Email subject line (max 250 chars) |
| Long Description | Email Body | Email text or HTML body |
| Priority | Low | Fixed default |
| Category | troubleshoot | Fixed default |
| Status | Open | Fixed default |
| Contact Number | N/A | Fixed default |
| Hostname/Asset ID | Email-Generated | Fixed default |
| Client Name | Looked up | Based on email/domain lookup |
| Reporter | System Email Bot | System user account |

## Automatic Processing

When `ENABLE_EMAIL_TO_TICKET=true`, the system automatically:
- Checks for new emails every N minutes (configured by `EMAIL_POLL_INTERVAL_MINUTES`)
- Processes unread emails
- Creates tickets
- Marks processed emails as read
- Sends notifications

## Security Considerations

1. **Email Credentials**: Store email credentials securely in environment variables
2. **Access Control**: Only admins can trigger manual processing or view service status
3. **System User**: A disabled system user is created to be the "reporter" for email-generated tickets
4. **Email Validation**: Sender email addresses are validated before processing

## Troubleshooting

### Issue: Service Not Starting

**Check**:
- Are `TICKET_EMAIL_USER` and `TICKET_EMAIL_PASSWORD` set?
- Is `ENABLE_EMAIL_TO_TICKET=true`?
- Check server logs for error messages

### Issue: Cannot Connect to Email Server

**Check**:
- Verify IMAP settings (`TICKET_EMAIL_HOST`, `TICKET_EMAIL_PORT`)
- Test credentials by logging in manually
- Check firewall settings
- For Gmail, ensure you're using an App Password

### Issue: Emails Not Being Processed

**Check**:
- Are emails marked as unread?
- Check polling interval (`EMAIL_POLL_INTERVAL_MINUTES`)
- Manually trigger processing: `POST /api/email-to-ticket/process`
- Check server logs for errors

### Issue: Wrong Client Assignment

**Solutions**:
1. Ensure user accounts have correct `client_name` field
2. Ensure client records have correct `domain` field
3. Manually update ticket's client_name if needed

## Monitoring & Logging

The service logs all activities:

```
✅ Email-to-Ticket service initialized
🔄 Automatic email polling started...
📧 Found 3 unread email(s) to process
📧 Processing email from: user@example.com
✅ Found client from user: Acme Corp
🎫 Generated display ID: INC000123
📎 Processing 2 attachment(s)
📎 Processed attachment: document.pdf (102400 bytes)
✅ Ticket created successfully: INC000123 (ID: abc123def456)
```

## Best Practices

1. **Dedicated Email**: Use a dedicated email address only for ticket creation
2. **Email Filters**: Set up filters to forward specific emails to the ticket email
3. **Polling Interval**: Set appropriate interval (5-10 minutes recommended)
4. **Client Setup**: Ensure all clients have proper domain configuration
5. **User Training**: Train users to send well-formatted emails with clear subjects
6. **Monitoring**: Regularly check service status and logs
7. **Testing**: Test with sample emails before going live

## Future Enhancements

Potential improvements for future versions:

- [ ] Automatic attachment upload to Firebase Storage
- [ ] Email parsing for priority keywords (urgent, critical, etc.)
- [ ] Category detection based on email content
- [ ] Reply-to-ticket functionality (update existing tickets via email)
- [ ] Email templates for auto-responses
- [ ] Spam filtering
- [ ] Email signature removal
- [ ] Support for multiple email addresses
- [ ] Advanced email parsing (extract asset ID, contact number from body)

## Support

For issues or questions about the Email-to-Ticket feature, contact the development team or submit a support ticket.

---

**Last Updated**: October 26, 2025
**Version**: 1.0.0

