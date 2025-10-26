# Email-to-Ticket Quick Start Guide

Get your email-to-ticket system up and running in 5 minutes!

## Prerequisites

- Access to an email account dedicated for receiving tickets
- Admin access to your Sahayaon backend
- Email IMAP credentials

## Quick Setup

### Step 1: Add Environment Variables

Edit your `.env` file in `sahayaon-backend/` and add:

```bash
# Enable the feature
ENABLE_EMAIL_TO_TICKET=true

# Email credentials for the inbox to monitor
TICKET_EMAIL_USER=tickets@yourdomain.com
TICKET_EMAIL_PASSWORD=your_password

# IMAP settings (Office 365 example)
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993

# How often to check for new emails (in minutes)
EMAIL_POLL_INTERVAL_MINUTES=5

# Frontend URL for ticket links in notifications
FRONTEND_URL=https://ticketingtoolv2.web.app

# Distribution email for notifications
DISTRIBUTION_EMAIL=support@yourdomain.com
```

### Step 2: Restart Backend Server

```bash
cd sahayaon-backend
npm start
```

Look for these messages in the console:
```
✅ Email-to-Ticket service initialized
✅ Automatic email polling enabled (every 5 minutes)
```

### Step 3: Test the Setup

#### Option A: Using API (Recommended)

Test the configuration:
```bash
curl -X GET http://localhost:5000/api/email-to-ticket/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Option B: Send a Test Email

1. Send an email to `tickets@yourdomain.com` with:
   - **Subject**: Test Ticket - Please Ignore
   - **Body**: This is a test email to verify the email-to-ticket feature.

2. Wait 5 minutes for automatic processing, or manually trigger:
```bash
curl -X POST http://localhost:5000/api/email-to-ticket/process \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

3. Check your ticketing system for a new ticket with:
   - Short Description: "Test Ticket - Please Ignore"
   - Priority: Low
   - Category: troubleshoot
   - Requested By: Your email address

## Common IMAP Settings

### Office 365 / Outlook.com
```bash
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993
```

### Gmail
```bash
TICKET_EMAIL_HOST=imap.gmail.com
TICKET_EMAIL_PORT=993
```

**Important for Gmail**:
1. Enable 2-Step Verification in your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an App Password
4. Use this App Password in `TICKET_EMAIL_PASSWORD`

### Other Providers
Check your email provider's IMAP settings documentation.

## What Happens When Someone Sends an Email?

1. **Email arrives** at `tickets@yourdomain.com`
2. **System checks** for new emails every 5 minutes (or your configured interval)
3. **Email is parsed**:
   - Subject → Short Description
   - Body → Long Description
   - Sender → Requested By & Requested For
4. **Client lookup**:
   - Checks if sender email matches a user account
   - Checks if email domain matches a client domain
   - Defaults to "Email-Generated" if no match
5. **Ticket created** with:
   - Priority: Low
   - Category: troubleshoot
   - Status: Open
6. **Notification sent** to distribution email and sender
7. **Email marked as read** to prevent duplicate processing

## Manual Processing

If you don't want automatic processing, set:
```bash
ENABLE_EMAIL_TO_TICKET=false
```

Then manually trigger processing via API:
```bash
curl -X POST http://localhost:5000/api/email-to-ticket/process \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Checking Service Status

```bash
curl -X GET http://localhost:5000/api/email-to-ticket/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Response:
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

## Troubleshooting

### Service Won't Start

**Error**: "Email-to-Ticket service: Missing email credentials"

**Solution**: Ensure `TICKET_EMAIL_USER` and `TICKET_EMAIL_PASSWORD` are set in your `.env` file.

---

### Can't Connect to Email Server

**Error**: "IMAP error: Invalid credentials"

**Solutions**:
1. Double-check email and password
2. For Gmail, use App Password instead of regular password
3. Check if IMAP is enabled in your email account settings
4. Verify IMAP host and port settings

---

### Emails Not Being Processed

**Check**:
1. Is `ENABLE_EMAIL_TO_TICKET=true`?
2. Are emails unread?
3. Check server logs for errors
4. Manually trigger: `POST /api/email-to-ticket/process`

---

### Wrong Client Assigned

**Solution**:
1. Add email address to user account with correct `client_name`
2. Or add email domain to client record with correct `domain` field

---

## Tips for Success

1. **Use a dedicated email** - Don't use a shared inbox for multiple purposes
2. **Set up email forwarding** - Forward support emails from your main inbox to the ticket email
3. **Train your users** - Ask them to use clear, descriptive subject lines
4. **Monitor the logs** - Keep an eye on server logs for any issues
5. **Test thoroughly** - Send test emails before announcing to users

## Example Email Format

**Good Email**:
```
To: tickets@yourdomain.com
Subject: Cannot access customer portal
Body: 
Hi support team,

I'm unable to log in to the customer portal. I keep getting an "Invalid credentials" error even though I'm using the correct password.

Can you please help?

Thanks,
John Doe
```

This creates:
- Ticket ID: INC000XXX
- Short Description: "Cannot access customer portal"
- Long Description: [Full email body]
- Priority: Low
- Category: troubleshoot
- Requested By: john.doe@example.com
- Requested For: john.doe@example.com

---

## Need More Help?

See the full documentation: [EMAIL_TO_TICKET_FEATURE.md](./EMAIL_TO_TICKET_FEATURE.md)

---

**Happy Ticketing!** 🎫

