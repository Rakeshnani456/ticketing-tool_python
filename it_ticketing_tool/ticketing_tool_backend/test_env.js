// Test environment variables
require('dotenv').config();

console.log('Testing environment variables...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('YOUR_')) {
    console.error('❌ SUPABASE_URL is not set correctly!');
    console.log('Please create a .env file with your actual Supabase URL');
} else {
    console.log('✅ SUPABASE_URL is set correctly');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_')) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set correctly!');
    console.log('Please create a .env file with your actual Supabase service role key');
} else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY is set correctly');
} 