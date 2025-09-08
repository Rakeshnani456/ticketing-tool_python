# Supabase Migration Guide

This guide will help you migrate your IT Ticketing Tool from Firebase to Supabase.

## Prerequisites

1. **Supabase Account**: You mentioned you have your Supabase account ready
2. **Supabase Project**: Create a new project in your Supabase dashboard
3. **Database Access**: You'll need your project URL and API keys

## Step 1: Set Up Supabase Project

### 1.1 Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_schema.sql` into the editor
4. Run the SQL to create all tables, indexes, and policies

### 1.2 Configure Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure your site URL (e.g., `http://localhost:3000` for development)
3. Add any additional redirect URLs you need
4. Configure email templates if needed

### 1.3 Set Up Storage (Optional)

1. Go to Storage in your Supabase dashboard
2. Create a bucket named `attachments` for file uploads
3. Configure the bucket policies for public access if needed

## Step 2: Backend Migration

### 2.1 Install Dependencies

```bash
cd it_ticketing_tool/ticketing_tool_backend
npm install @supabase/supabase-js uuid
npm uninstall firebase-admin
```

### 2.2 Environment Configuration

1. Copy `supabase.env.template` to `.env`
2. Fill in your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 2.3 Update Server Configuration

1. Replace `server.js` with `server.supabase.js`:
   ```bash
   mv server.js server.firebase.backup.js
   mv server.supabase.js server.js
   ```

2. Update all route files to use the Supabase versions:
   ```bash
   # Backup Firebase routes
   mkdir routes/firebase_backup
   mv routes/*.js routes/firebase_backup/
   
   # Use Supabase routes
   mv routes/*.supabase.js routes/
   # Remove .supabase suffix
   for file in routes/*.supabase.js; do
     mv "$file" "${file%.supabase.js}.js"
   done
   ```

## Step 3: Frontend Migration

### 3.1 Install Dependencies

```bash
cd it_ticketing_tool/it_ticketing_frontend
npm install @supabase/supabase-js
npm uninstall firebase
```

### 3.2 Environment Configuration

1. Copy `supabase.env.template` to `.env.local`
2. Fill in your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3.3 Update Configuration Files

1. Replace `src/config/firebase.js` with `src/config/supabase.js`
2. Update all components that import from Firebase config

## Step 4: Component Updates

### 4.1 Authentication Components

Update authentication components to use Supabase Auth:

```javascript
// Before (Firebase)
import { authClient } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

// After (Supabase)
import { supabase } from '../config/supabase';

// Login example
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});
```

### 4.2 Database Operations

Update database operations to use Supabase:

```javascript
// Before (Firebase)
import { dbClient } from '../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const querySnapshot = await getDocs(collection(dbClient, 'tickets'));

// After (Supabase)
import { supabase } from '../config/supabase';

const { data, error } = await supabase
  .from('tickets')
  .select('*');
```

### 4.3 Real-time Subscriptions

Update real-time features:

```javascript
// Before (Firebase)
import { onSnapshot } from 'firebase/firestore';

const unsubscribe = onSnapshot(collection(dbClient, 'tickets'), (snapshot) => {
  // Handle updates
});

// After (Supabase)
import { supabase } from '../config/supabase';

const subscription = supabase
  .channel('tickets')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'tickets' },
    (payload) => {
      // Handle updates
    }
  )
  .subscribe();
```

## Step 5: Data Migration (Optional)

If you have existing data in Firebase, you'll need to migrate it:

### 5.1 Export Firebase Data

1. Use Firebase Admin SDK to export your data
2. Convert the data format to match Supabase schema
3. Import the data into Supabase

### 5.2 Migration Script Example

```javascript
// migration-script.js
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path-to-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateUsers() {
  const usersSnapshot = await admin.firestore().collection('users').get();
  const users = [];
  
  usersSnapshot.forEach(doc => {
    users.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  const { error } = await supabase
    .from('users')
    .insert(users);
    
  if (error) console.error('Error migrating users:', error);
}

// Run migration
migrateUsers();
```

## Step 6: Testing

### 6.1 Backend Testing

1. Start the backend server:
   ```bash
   cd it_ticketing_tool/ticketing_tool_backend
   npm start
   ```

2. Test API endpoints using Postman or curl
3. Verify database operations work correctly

### 6.2 Frontend Testing

1. Start the frontend development server:
   ```bash
   cd it_ticketing_tool/it_ticketing_frontend
   npm start
   ```

2. Test all major functionality:
   - User registration and login
   - Ticket creation and management
   - Real-time updates
   - File uploads

## Step 7: Deployment

### 7.1 Environment Variables

Update your production environment variables:
- Backend: Add Supabase credentials to your server environment
- Frontend: Add Supabase credentials to your build environment

### 7.2 Database Policies

Review and adjust Row Level Security (RLS) policies in Supabase:
1. Go to Authentication > Policies in your Supabase dashboard
2. Review the policies created by the schema
3. Adjust them based on your specific requirements

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check that your Supabase URL and keys are correct
2. **Database Connection**: Verify your database schema was created successfully
3. **RLS Policies**: Make sure Row Level Security policies allow the operations you need
4. **CORS Issues**: Configure CORS settings in Supabase if needed

### Getting Help

1. Check Supabase documentation: https://supabase.com/docs
2. Review the Supabase community forum
3. Check the migration files for examples

## Rollback Plan

If you need to rollback to Firebase:

1. Restore the original `server.js` from backup
2. Restore Firebase route files from `routes/firebase_backup/`
3. Restore `src/config/firebase.js`
4. Reinstall Firebase dependencies
5. Update environment variables back to Firebase

## Next Steps

After successful migration:

1. Monitor application performance
2. Update documentation
3. Train team members on Supabase
4. Consider additional Supabase features (Edge Functions, etc.)
