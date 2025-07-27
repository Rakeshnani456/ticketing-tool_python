// src/config/supabase.js

import { createClient } from '@supabase/supabase-js';

// --- Supabase Configuration ---
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL||"https://khblgryvpgodtltxrlmu.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmxncnl2cGdvZHRsdHhybG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwMDM5NywiZXhwIjoyMDY5MTc2Mzk3fQ.INap8TpPa3puB7roejQZguRk2rwUhhLyNSTQ4A9ozWY";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase environment variables are not set!');
  console.error('Please create a .env file in your frontend directory with:');
  console.error('REACT_APP_SUPABASE_URL=your_supabase_project_url');
  console.error('REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key');
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Export the Supabase client for use in other components
export { supabase };

// This file sets up and initializes Supabase for your application.
// It exports the `supabase` instance, allowing other components to
// interact with Supabase services without re-initializing the client. 