// src/config/supabase.js

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://sknvnshttjywlnwhjbke.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbnZuc2h0dGp5d2xud2hqYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTAyNjgsImV4cCI6MjA3MjMyNjI2OH0.wU2_SPC7b_C7213vLjNPQVgeFgONa_QouhNe6hJE7-Q';

// Check if we're using placeholder values
if (supabaseUrl === 'https://sknvnshttjywlnwhjbke.supabase.co' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbnZuc2h0dGp5d2xud2hqYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTAyNjgsImV4cCI6MjA3MjMyNjI2OH0.wU2_SPC7b_C7213vLjNPQVgeFgONa_QouhNe6hJE7-Q') {
    console.warn('⚠️  WARNING: Using placeholder Supabase credentials. Please set up your .env.local file with real Supabase credentials.');
    console.warn('   Create a .env.local file with:');
    console.warn('   REACT_APP_SUPABASE_URL=your_supabase_project_url');
    console.warn('   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key');
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

// Export the supabase client for use in other components
export { supabase };

// This file sets up and initializes Supabase for your application.
// It exports the `supabase` instance, allowing other components to
// interact with Supabase services without re-initializing Supabase.
