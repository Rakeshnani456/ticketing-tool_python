# Firebase to Supabase Migration Guide

## Overview
This guide will help you migrate your IT Ticketing Tool from Firebase to Supabase.

## Prerequisites
1. Create a Supabase account at https://supabase.com
2. Create a new project in Supabase
3. Get your project URL and API keys from the project settings

## Step 1: Set up Supabase Project

### 1.1 Create Supabase Project
1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project name (e.g., "it-ticketing-tool")
5. Enter database password
6. Choose region
7. Click "Create new project"

### 1.2 Get API Keys
1. Go to Project Settings > API
2. Copy the following:
   - Project URL
   - Anon public key (for frontend)
   - Service role key (for backend)

### 1.3 Set up Database Schema
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase_schema.sql`
3. Run the SQL script

## Step 2: Environment Variables

### Frontend (.env file in it_ticketing_frontend/)
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (.env file in ticketing_tool_backend/)
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Step 3: Update Configuration Files

### 3.1 Frontend Configuration
- Replace `src/config/firebase.js` with `src/config/supabase.js`
- Update all imports from Firebase to Supabase

### 3.2 Backend Configuration
- Replace Firebase Admin SDK with Supabase client
- Update authentication middleware

## Step 4: Code Changes Required

### 4.1 Authentication Changes
- Replace Firebase Auth with Supabase Auth
- Update login/signup components
- Update authentication state management

### 4.2 Database Changes
- Replace Firestore queries with Supabase queries
- Update real-time subscriptions
- Update data formatting functions

### 4.3 Storage Changes
- Replace Firebase Storage with Supabase Storage
- Update file upload/download functions

## Step 5: Testing
1. Test user registration and login
2. Test ticket creation and management
3. Test real-time updates
4. Test file uploads
5. Test role-based access control

## Step 6: Deployment
1. Update environment variables in production
2. Deploy updated frontend and backend
3. Test all functionality in production

## Key Differences Between Firebase and Supabase

### Authentication
- **Firebase**: `signInWithEmailAndPassword()`
- **Supabase**: `supabase.auth.signInWithPassword()`

### Database Queries
- **Firebase**: `collection().where().get()`
- **Supabase**: `from('table').select().eq()`

### Real-time Subscriptions
- **Firebase**: `onSnapshot()`
- **Supabase**: `supabase.channel().on()`

### Storage
- **Firebase**: `uploadBytes()`
- **Supabase**: `supabase.storage.from().upload()`

## Troubleshooting

### Common Issues
1. **Authentication errors**: Check API keys and environment variables
2. **Database permission errors**: Verify RLS policies
3. **Real-time not working**: Check channel subscriptions
4. **File upload errors**: Verify storage bucket permissions

### Support
- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

## Migration Checklist

- [ ] Set up Supabase project
- [ ] Run database schema
- [ ] Update environment variables
- [ ] Replace Firebase config with Supabase config
- [ ] Update authentication components
- [ ] Update database queries
- [ ] Update real-time subscriptions
- [ ] Update file storage
- [ ] Test all functionality
- [ ] Deploy to production
- [ ] Remove Firebase dependencies 