# Email-to-Ticket Feature

## 📧 → 🎫 Automatically Convert Emails to Support Tickets

Turn any email sent to your support address into a ticket in your Sahayaon ticketing system!

## ⚡ Quick Start

### 1. Configure Environment Variables

Add to `.env`:

```bash
ENABLE_EMAIL_TO_TICKET=true
TICKET_EMAIL_USER=tickets@yourdomain.com
TICKET_EMAIL_PASSWORD=your_password
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993
EMAIL_POLL_INTERVAL_MINUTES=5
FRONTEND_URL=https://ticketingtoolv2.web.app
DISTRIBUTION_EMAIL=support@yourdomain.com
```

### 2. Restart Server

```bash
npm start
```

Look for: `✅ Email-to-Ticket service initialized`

### 3. Send Test Email

Send email to `tickets@yourdomain.com` → Wait 5 minutes → Check for new ticket!

## 📚 Documentation

- **[Quick Start Guide](../documents/EMAIL_TO_TICKET_QUICKSTART.md)** - Get started in 5 minutes
- **[Complete Documentation](../documents/EMAIL_TO_TICKET_FEATURE.md)** - Full feature reference
- **[Implementation Summary](../documents/EMAIL_TO_TICKET_IMPLEMENTATION_SUMMARY.md)** - Technical details

## 🎯 What You Get

### Automatic Ticket Creation
- ✅ Email subject → Ticket short description
- ✅ Email body → Ticket long description  
- ✅ Sender email → Requested By & Requested For
- ✅ Smart client identification
- ✅ Default: Low priority, troubleshoot category
- ✅ Notification emails sent

### Admin Controls
- ✅ Manual processing: `POST /api/email-to-ticket/process`
- ✅ Check status: `GET /api/email-to-ticket/status`
- ✅ Test config: `GET /api/email-to-ticket/test`

## 🔧 Configuration Options

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_EMAIL_TO_TICKET` | No | false | Enable/disable automatic polling |
| `TICKET_EMAIL_USER` | Yes | - | Email address to monitor |
| `TICKET_EMAIL_PASSWORD` | Yes | - | Email password |
| `TICKET_EMAIL_HOST` | No | outlook.office365.com | IMAP host |
| `TICKET_EMAIL_PORT` | No | 993 | IMAP port |
| `EMAIL_POLL_INTERVAL_MINUTES` | No | 5 | Polling frequency |
| `FRONTEND_URL` | No | - | Frontend URL for links |
| `DISTRIBUTION_EMAIL` | No | - | CC for notifications |

## 🌐 Common Email Providers

### Office 365
```bash
TICKET_EMAIL_HOST=outlook.office365.com
TICKET_EMAIL_PORT=993
```

### Gmail
```bash
TICKET_EMAIL_HOST=imap.gmail.com
TICKET_EMAIL_PORT=993
# Use App Password!
```

## 📋 Example

**Email Sent:**
```
From: john@acme.com
To: tickets@yourdomain.com
Subject: Can't access my account
Body: I've been locked out since yesterday...
```

**Ticket Created:**
- ID: INC000123
- Short Description: "Can't access my account"
- Long Description: "I've been locked out since yesterday..."
- Requested By: john@acme.com
- Priority: Low
- Category: troubleshoot
- Status: Open
- Client: Acme Corp (auto-detected)

## 🛠️ Troubleshooting

### Service Won't Start
- Check: `TICKET_EMAIL_USER` and `TICKET_EMAIL_PASSWORD` are set

### Can't Connect
- For Gmail: Use App Password, not regular password
- Check: IMAP is enabled in email account

### Emails Not Processing
- Check: `ENABLE_EMAIL_TO_TICKET=true`
- Check: Emails are unread
- Try: Manual processing via API

## 🔐 Security

- ✅ Admin-only API access
- ✅ Environment variable credentials
- ✅ Disabled system user for email-generated tickets
- ✅ Email validation
- ✅ Duplicate prevention

## 📊 Monitoring

Service logs:
```
✅ Email-to-Ticket service initialized
🔄 Automatic email polling started...
📧 Found 2 unread email(s) to process
✅ Ticket created successfully: INC000123
```

Check status:
```bash
curl -X GET http://localhost:5000/api/email-to-ticket/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🚀 Next Steps

1. ✅ Set up environment variables
2. ✅ Restart server
3. ✅ Test with sample email
4. ✅ Train users on email format
5. ✅ Set up email forwarding rules
6. ✅ Monitor logs regularly

## 📞 Need Help?

- Read the [Quick Start Guide](../documents/EMAIL_TO_TICKET_QUICKSTART.md)
- Check [Full Documentation](../documents/EMAIL_TO_TICKET_FEATURE.md)
- Review [Implementation Summary](../documents/EMAIL_TO_TICKET_IMPLEMENTATION_SUMMARY.md)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: October 26, 2025

