// Test script to verify Supabase connection
// Run this with: node test_supabase_connection.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Test Supabase connection
async function testConnection() {
    console.log('Testing Supabase connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables!');
        console.log('Please check your .env file and ensure you have:');
        console.log('- SUPABASE_URL or REACT_APP_SUPABASE_URL');
        console.log('- SUPABASE_SERVICE_ROLE_KEY or REACT_APP_SUPABASE_ANON_KEY');
        return;
    }
    
    console.log('✅ Environment variables found');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey.substring(0, 20) + '...');
    
    try {
        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Test connection by querying users table
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Database connection failed:', error.message);
            console.log('Make sure you have run the database schema in Supabase SQL Editor');
            return;
        }
        
        console.log('✅ Database connection successful!');
        console.log('✅ Users table exists and is accessible');
        
        // Test auth
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) {
            console.log('ℹ️  Auth test: No user logged in (this is expected)');
        } else {
            console.log('✅ Auth system working');
        }
        
        console.log('\n🎉 Supabase is properly configured!');
        console.log('You can now start your application.');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.log('Please check your Supabase URL and API key');
    }
}

testConnection(); 