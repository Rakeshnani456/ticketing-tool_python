// create_super_admin.js
// Simple script to create the first super_admin user

// Using built-in fetch (available in Node.js 18+)

async function createSuperAdmin() {
    const adminData = {
        email: 'superadmin@yourcompany.com', // Change this to your desired email
        password: 'YourSecurePassword123!', // Change this to your desired password
        role: 'super_admin'
    };

    try {
        console.log('Creating super_admin user...');
        console.log('Email:', adminData.email);
        
        const response = await fetch('http://localhost:5000/admin-management/public-create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(adminData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Super admin created successfully!');
            console.log('User ID:', result.uid);
            console.log('Email:', result.email);
            console.log('Role:', adminData.role);
            console.log('\nYou can now log in to the frontend with these credentials.');
        } else {
            console.error('❌ Failed to create super admin:');
            console.error('Status:', response.status);
            console.error('Error:', result.error);
            console.error('Full response:', JSON.stringify(result, null, 2));
        }
    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
        console.log('Make sure your backend server is running on port 5000');
    }
}

// Run the function
createSuperAdmin(); 