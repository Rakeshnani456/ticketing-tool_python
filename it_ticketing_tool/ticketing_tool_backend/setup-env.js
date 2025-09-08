#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
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

async function setupEnvironment() {
    console.log('🚀 Supabase Environment Setup');
    console.log('=============================\n');
    
    console.log('This script will help you set up your Supabase environment variables.');
    console.log('You can find these values in your Supabase project dashboard:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to Settings > API');
    console.log('3. Copy the Project URL and API keys\n');
    
    const supabaseUrl = await question('Enter your Supabase Project URL: ');
    const supabaseAnonKey = await question('Enter your Supabase Anon Key: ');
    const supabaseServiceKey = await question('Enter your Supabase Service Role Key: ');
    
    const emailUser = await question('Enter your email user (for SMTP): ');
    const emailPass = await question('Enter your email password (for SMTP): ');
    
    const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Email Configuration
EMAIL_USER=${emailUser}
EMAIL_PASS=${emailPass}

# WebSocket Configuration
WEBSOCKET_PORT=5001

# Application Configuration
NODE_ENV=development
PORT=5000
`;

    const envPath = path.join(__dirname, '.env');
    
    try {
        fs.writeFileSync(envPath, envContent);
        console.log('\n✅ Environment file created successfully!');
        console.log('📁 Location:', envPath);
        console.log('\n🔧 Next steps:');
        console.log('1. Run the SQL schema in your Supabase SQL editor');
        console.log('2. Start your server with: npm start');
    } catch (error) {
        console.error('❌ Error creating .env file:', error.message);
        console.log('\n📝 Please create a .env file manually with the following content:');
        console.log(envContent);
    }
    
    rl.close();
}

setupEnvironment().catch(console.error);

