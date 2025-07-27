// ticketing-tool-backend/config/supabase.js

const { createClient } = require('@supabase/supabase-js');

// --- Supabase Configuration ---
// Replace these with your actual Supabase project configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY';

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export the Supabase client for use in routes
module.exports = { supabase };

// This file sets up and initializes Supabase for your backend application.
// It exports the `supabase` instance with service role key for admin operations. 