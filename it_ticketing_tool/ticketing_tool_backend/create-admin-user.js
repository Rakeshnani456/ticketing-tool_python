#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createAdminUser() {
    console.log('🔐 Create Admin User');
    console.log('==================\n');
    
    console.log('This script will help you create your first admin user in Supabase.');
    console.log('Make sure you have:');
    console.log('1. Set up your .env file with Supabase credentials');
    console.log('2. Created the database schema in Supabase\n');
    
    // Check if .env file exists
    try {
        require('dotenv').config();
    } catch (error) {
        console.error('❌ Error loading .env file. Please run setup-env.js first.');
        rl.close();
        return;
    }
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
        console.error('❌ Supabase credentials not configured. Please run setup-env.js first.');
        rl.close();
        return;
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Enter admin user details:\n');
    
    const email = await question('Email: ');
    const password = await question('Password (min 6 characters): ');
    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const clientName = await question('Client/Company Name: ');
    
    if (!email || !password || password.length < 6) {
        console.error('❌ Email and password (min 6 chars) are required.');
        rl.close();
        return;
    }
    
    try {
        console.log('\n🔄 Creating admin user...');
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        
        if (authError) {
            if (authError.message.includes('already registered')) {
                console.error('❌ User with this email already exists.');
            } else {
                console.error('❌ Error creating user in Supabase Auth:', authError.message);
            }
            rl.close();
            return;
        }
        
        // Create user profile in database
        const { error: dbError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email: email,
                role: 'super_admin',
                is_site_admin: true,
                first_name: firstName,
                last_name: lastName,
                client_name: clientName,
                name: `${firstName} ${lastName}`.trim()
            });
        
        if (dbError) {
            console.error('❌ Error creating user profile:', dbError.message);
            // Try to clean up the auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            rl.close();
            return;
        }
        
        console.log('\n✅ Admin user created successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`👤 Name: ${firstName} ${lastName}`);
        console.log(`🏢 Client: ${clientName}`);
        console.log(`🔑 Role: super_admin`);
        console.log('\n🎉 You can now log in to your application!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
    
    rl.close();
}

createAdminUser().catch(console.error);

