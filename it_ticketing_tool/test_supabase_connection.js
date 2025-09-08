// Test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './it_ticketing_tool/ticketing_tool_backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        // Test basic connection
        console.log('\n1. Testing basic connection...');
        const { data, error } = await supabase.from('users').select('count').limit(1);
        
        if (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
        
        console.log('✅ Database connection successful');
        
        // Test auth service
        console.log('\n2. Testing auth service...');
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            console.error('❌ Auth service error:', authError.message);
        } else {
            console.log('✅ Auth service accessible');
        }
        
        // Test a simple query
        console.log('\n3. Testing user table query...');
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, email, role')
            .limit(5);
            
        if (userError) {
            console.error('❌ User query failed:', userError.message);
        } else {
            console.log('✅ User query successful, found', users.length, 'users');
            if (users.length > 0) {
                console.log('Sample user:', users[0]);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        return false;
    }
}

testConnection().then(success => {
    if (success) {
        console.log('\n🎉 All tests passed! Supabase is properly configured.');
    } else {
        console.log('\n💥 Some tests failed. Check the errors above.');
    }
    process.exit(success ? 0 : 1);
});

