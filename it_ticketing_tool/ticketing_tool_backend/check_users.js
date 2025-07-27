// check_users.js
// Script to check existing users in Supabase

const { supabase } = require('./config/supabase');

async function checkUsers() {
    try {
        console.log('Checking existing users...\n');

        // Check users in the database
        console.log('1. Users in database:');
        const { data: dbUsers, error: dbError } = await supabase
            .from('users')
            .select('id, email, role, created_at');

        if (dbError) {
            console.error('Database error:', dbError);
        } else {
            if (dbUsers && dbUsers.length > 0) {
                dbUsers.forEach(user => {
                    console.log(`   - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
                });
            } else {
                console.log('   No users found in database');
            }
        }

        console.log('\n2. Users in Supabase Auth:');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('Auth error:', authError);
        } else {
            if (authUsers && authUsers.users && authUsers.users.length > 0) {
                authUsers.users.forEach(user => {
                    console.log(`   - ID: ${user.id}, Email: ${user.email}, Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
                });
            } else {
                console.log('   No users found in Auth');
            }
        }

    } catch (error) {
        console.error('Error checking users:', error);
    }
}

// Run the function
checkUsers(); 