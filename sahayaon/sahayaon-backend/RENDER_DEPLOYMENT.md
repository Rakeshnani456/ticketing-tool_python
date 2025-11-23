# Render Deployment Guide - Email Configuration

## Issue: Email Works Locally But Not on Render

Render.com blocks outbound SMTP connections during startup, which causes email verification to timeout. However, **emails may still work when actually sent** - the verification is just a connectivity check.

## ✅ Solution: Skip Email Verification on Render

### Step 1: Add Environment Variable in Render Dashboard

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Add the following environment variable:

```
SKIP_EMAIL_VERIFICATION=true
```

### Step 2: Verify Your Email Configuration

Make sure these environment variables are set in Render:

```
EMAIL_USER=testing@kriasol.com
EMAIL_PASS=your-password-here
EMAIL_TRANSPORT=OUTLOOK
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
DISTRIBUTION_EMAIL=soulfanboy@gmail.com
```

### Step 3: Redeploy

After adding `SKIP_EMAIL_VERIFICATION=true`, redeploy your service. The email verification will be skipped, and your app will start immediately.

## How It Works

- **With `SKIP_EMAIL_VERIFICATION=true`**: The app skips the startup connectivity check and starts immediately. Emails will still be sent when needed.
- **Without it**: The app tries to verify SMTP connectivity during startup, which times out on Render (but emails may still work when actually sent).

## Testing Email After Deployment

1. Create a test ticket or trigger an email action
2. Check the Render logs to see if the email was sent
3. If emails still fail, see "Alternative Solutions" below

## Alternative Solutions

### Option 1: Use Port 465 (SSL) Instead of 587 (STARTTLS)

Some cloud platforms work better with SSL on port 465:

```
SMTP_PORT=465
SMTP_SECURE=true
```

### Option 2: Use a Dedicated Email Service

If SMTP is completely blocked, use a service designed for cloud platforms:

#### SendGrid (Recommended)
1. Sign up at https://sendgrid.com
2. Get your API key
3. Update your environment variables:

```
EMAIL_TRANSPORT=SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

#### Mailgun
1. Sign up at https://mailgun.com
2. Get your SMTP credentials
3. Update your environment variables:

```
EMAIL_TRANSPORT=SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-mailgun-username
EMAIL_PASS=your-mailgun-password
```

## Troubleshooting

### Emails Still Not Sending?

1. **Check Render Logs**: Look for email error messages
2. **Verify SMTP AUTH**: Ensure Office365 SMTP AUTH is enabled (see server.js error messages)
3. **Test Locally**: Confirm emails work locally with the same credentials
4. **Check Firewall**: Render may block SMTP entirely - consider using SendGrid/Mailgun

### Verification Timeout But Emails Work?

This is normal! The verification is just a startup check. If emails work when actually sent, you can safely ignore the verification timeout.

## Quick Fix Summary

**Just add this to Render environment variables:**
```
SKIP_EMAIL_VERIFICATION=true
```

This will skip the problematic startup check while still allowing emails to be sent when needed.

