# Firebase Security Rules Deployment

## ❌ Current Issue: "Missing or insufficient permissions"

The Firebase security rules are updated in the code but **NOT deployed** to Firebase yet.

## ✅ Solution: Deploy the Rules

### Option 1: Use the Batch File (Windows)
```bash
deploy_firebase_rules.bat
```

### Option 2: Manual Deployment
```bash
cd ticketing_tool_backend
firebase deploy --only firestore:rules
```

### Option 3: Deploy via Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ticketingtoolv2`
3. Go to Firestore Database → Rules
4. Copy the rules from `ticketing_tool_backend/firebaserules.txt`
5. Paste and publish

## What the Rules Do:

### For Tickets Collection:
- ✅ Users can read tickets they created
- ✅ Support/Admin/Super Admin can read all tickets
- ✅ Site Admin can read tickets for their company
- ✅ Users can create tickets
- ✅ Users can update their own tickets
- ✅ Support/Admin can update any ticket

### For Users Collection:
- ✅ Users can read their own profile
- ✅ Support/Admin can read all users
- ✅ Site Admin can read users from their company

### For Activities Collection:
- ✅ All authenticated users can read activities
- ✅ All authenticated users can create activities

### For Read States Collection:
- ✅ Users can read/write their own read states

### For Notifications Collection:
- ✅ Users can read their own notifications
- ✅ Users can update their own notifications

## After Deployment:

1. **Test the application** - permissions errors should be resolved
2. **Check Firebase Console** - rules should show as "Active"
3. **Monitor for any new errors** - some edge cases might need adjustment

## Troubleshooting:

### If deployment fails:
- Check if Firebase CLI is installed: `firebase --version`
- Check if you're logged in: `firebase login`
- Check if project is selected: `firebase use ticketingtoolv2`

### If rules don't work after deployment:
- Wait 1-2 minutes for rules to propagate
- Check Firebase Console to verify rules are active
- Test with a simple query to verify permissions

## Expected Result:
- ✅ No more "Missing or insufficient permissions" errors
- ✅ Users can read tickets based on their role
- ✅ WebSocket authentication should work
- ✅ API calls should return data instead of 401 errors


