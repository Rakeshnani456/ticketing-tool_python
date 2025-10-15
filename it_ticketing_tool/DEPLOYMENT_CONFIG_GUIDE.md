# Deployment Configuration Guide

## Issue: Deployed Frontend Trying to Connect to Localhost

Your deployed frontend is trying to connect to `localhost:5000` which doesn't exist in the deployed environment.

## ✅ FIXED: Updated Configuration

### 1. API Base URL
- **Before**: `http://localhost:5000`
- **After**: `https://ticketing-tool-python-1.onrender.com`

### 2. WebSocket URL
- **Before**: `ws://localhost:5000`
- **After**: `wss://ticketing-tool-python-1.onrender.com`

### 3. Files Updated:
- `it_ticketing_frontend/src/config/constants.js`
- `it_ticketing_frontend/src/utils/websocketClient.js`
- `it_ticketing_frontend/src/services/readStatesService.js`

## Environment-Specific Configuration

### For Development (Local):
```javascript
export const API_BASE_URL = 'http://localhost:5000';
export const WS_BASE_URL = 'ws://localhost:5000';
```

### For Production (Deployed):
```javascript
export const API_BASE_URL = 'https://ticketing-tool-python-1.onrender.com';
export const WS_BASE_URL = 'wss://ticketing-tool-python-1.onrender.com';
```

## Render.com Backend Configuration

### Required Environment Variables on Render:
```
NODE_ENV=production
PORT=5000
# Firebase Admin SDK credentials
type=service_account
project_id=ticketingtoolv2
private_key_id=your_private_key_id
private_key=your_private_key
client_email=your_client_email
client_id=your_client_id
auth_uri=https://accounts.google.com/o/oauth2/auth
token_uri=https://oauth2.googleapis.com/token
auth_provider_x509_cert_url=https://www.googleapis.com/oauth2/v1/certs
client_x509_cert_url=your_cert_url
universe_domain=googleapis.com
FIREBASE_STORAGE_BUCKET=ticketingtoolv2.firebasestorage.app
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
```

### WebSocket Support on Render:
- Render.com supports WebSocket connections
- Use `wss://` protocol for secure WebSocket connections
- Ensure your backend server is configured to handle WebSocket upgrades

## Firebase Index Creation

### Still Need to Create the Index:
1. Click this link: https://console.firebase.google.com/v1/r/project/ticketingtoolv2/firestore/indexes?create_composite=Ck9wcm9qZWN0cy90aWNrZXRpbmd0b29sdjIvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3RpY2tldHMvaW5kZXhlcy9fEAEaCgoGc3RhdHVzEAEaDgoKY3JlYXRlZF9hdBACGgwKCF9fbmFtZV9fEAI

2. Or manually create in Firebase Console:
   - Collection: `tickets`
   - Fields: `status` (Ascending), `created_at` (Descending), `__name__` (Ascending)

## Security Rules Deployment

Deploy the updated Firebase security rules:
```bash
cd ticketing_tool_backend
firebase deploy --only firestore:rules
```

## Testing the Fix

1. ✅ Frontend now points to deployed backend
2. ✅ WebSocket uses `wss://` for secure connection
3. ✅ API calls go to Render.com backend
4. ⏳ Still need to create Firebase index
5. ⏳ Still need to deploy security rules

## Next Steps

1. **Create Firebase Index** (click the link above)
2. **Deploy Security Rules** (run the firebase deploy command)
3. **Test the application** - errors should be resolved
4. **Monitor backend logs** on Render.com for any issues

## Troubleshooting

### If WebSocket Still Fails:
- Check if Render.com backend is running
- Verify WebSocket support is enabled
- Check browser console for connection errors

### If API Calls Still Fail:
- Verify backend is deployed and running on Render.com
- Check environment variables are set correctly
- Monitor backend logs for authentication issues

### If Firebase Permissions Still Fail:
- Ensure security rules are deployed
- Verify the Firebase index is created
- Check user authentication status


