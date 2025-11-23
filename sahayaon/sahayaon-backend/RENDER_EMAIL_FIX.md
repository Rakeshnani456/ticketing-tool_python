# Fix Email Timeout on Render

## Problem
Render is blocking outbound SMTP connections on port 587 (STARTTLS), causing email timeouts.

## Solution 1: Try Port 465 with SSL (Quick Fix)

Some cloud platforms allow SSL connections but block STARTTLS. Try this first:

### Update Render Environment Variables:

```
SMTP_PORT=465
SMTP_SECURE=true
```

Keep all other settings the same:
```
EMAIL_TRANSPORT=OUTLOOK
EMAIL_USER=testing@kriasol.com
EMAIL_PASS=your-password
SMTP_HOST=smtp.office365.com
DISTRIBUTION_EMAIL=soulfanboy@gmail.com
SKIP_EMAIL_VERIFICATION=true
```

### Redeploy and Test

If this works, you're done! If it still times out, proceed to Solution 2.

---

## Solution 2: Use SendGrid (Recommended for Cloud Platforms)

SendGrid is designed for cloud platforms and works reliably on Render.

### Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for a free account (100 emails/day free)
3. Verify your email address

### Step 2: Create API Key

1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it "Sahayaon Backend"
4. Give it "Full Access" or "Mail Send" permissions
5. Copy the API key (you'll only see it once!)

### Step 3: Verify Sender Identity

1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Enter your email (e.g., `testing@kriasol.com`)
4. Fill in the form and verify via email

### Step 4: Update Render Environment Variables

Replace your email configuration with:

```
EMAIL_TRANSPORT=SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key-here
DISTRIBUTION_EMAIL=soulfanboy@gmail.com
SKIP_EMAIL_VERIFICATION=true
```

**Important:** 
- `EMAIL_USER` must be exactly `apikey` (not your email)
- `EMAIL_PASS` is your SendGrid API key
- `DISTRIBUTION_EMAIL` is the "from" email address (must be verified in SendGrid)

### Step 5: Redeploy

After updating environment variables, redeploy your service on Render.

### Step 6: Test

Create or update a ticket to trigger an email. Check logs for:
```
[EmailService] ✅ Ticket notification email sent successfully
```

---

## Alternative: Mailgun

If you prefer Mailgun:

1. Sign up at https://mailgun.com
2. Verify your domain or use sandbox domain
3. Get SMTP credentials from Settings → Sending → SMTP credentials

Update environment variables:
```
EMAIL_TRANSPORT=SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-mailgun-username
EMAIL_PASS=your-mailgun-password
DISTRIBUTION_EMAIL=your-verified-email@yourdomain.com
SKIP_EMAIL_VERIFICATION=true
```

---

## Why This Happens

Render (and many cloud platforms) block outbound SMTP connections on port 587 to prevent spam. They allow:
- ✅ Port 465 (SSL) - sometimes works
- ✅ Dedicated email services (SendGrid, Mailgun) - always work
- ❌ Port 587 (STARTTLS) - usually blocked

## Recommendation

**Use SendGrid** - it's free for up to 100 emails/day, reliable, and designed for cloud platforms. Your emails will work consistently.

