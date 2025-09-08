// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_key';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder_anon_key';

// Check if we're using placeholder values
if (supabaseUrl === 'https://placeholder-project.supabase.co' || supabaseServiceKey === 'placeholder_service_key') {
    console.warn('⚠️  WARNING: Using placeholder Supabase credentials. Please set up your .env file with real Supabase credentials.');
    console.warn('   Create a .env file with:');
    console.warn('   SUPABASE_URL=your_supabase_project_url');
    console.warn('   SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.warn('   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
}

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create Supabase client with anon key for client-side operations
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

module.exports = {
    supabase,
    supabaseAnon,
    supabaseUrl,
    supabaseServiceKey,
    supabaseAnonKey
};
