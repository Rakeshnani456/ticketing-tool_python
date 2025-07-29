// test_site_admin.js - Test script to check site admin functionality
const admin = require('firebase-admin');

// Initialize Firebase Admin (adjust path as needed)
const serviceAccount = require('./ticketing_tool_backend/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testSiteAdminFunctionality() {
  console.log('Testing site admin functionality...\n');
  
  try {
    // 1. Check activities
    console.log('1. Checking activities...');
    const activitiesSnapshot = await db.collection('activities').limit(5).get();
    console.log(`Found ${activitiesSnapshot.size} activities (showing first 5):`);
    
    activitiesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  Activity ${index + 1}:`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Type: ${data.type}`);
      console.log(`    Client Name: ${data.client_name || 'NOT SET'}`);
      console.log(`    Ticket ID: ${data.ticket_id || 'NOT SET'}`);
      console.log(`    Description: ${data.description}`);
      console.log('');
    });
    
    // 2. Check tickets
    console.log('2. Checking tickets...');
    const ticketsSnapshot = await db.collection('tickets').limit(5).get();
    console.log(`Found ${ticketsSnapshot.size} tickets (showing first 5):`);
    
    ticketsSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  Ticket ${index + 1}:`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Display ID: ${data.display_id}`);
      console.log(`    Client Name: ${data.client_name || 'NOT SET'}`);
      console.log(`    Status: ${data.status}`);
      console.log(`    Reporter: ${data.reporter_email}`);
      console.log('');
    });
    
    // 3. Check users with site_admin role
    console.log('3. Checking site admin users...');
    const siteAdminSnapshot = await db.collection('users').where('role', '==', 'site_admin').get();
    console.log(`Found ${siteAdminSnapshot.size} site admin users:`);
    
    siteAdminSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`  Site Admin ${index + 1}:`);
      console.log(`    ID: ${doc.id}`);
      console.log(`    Email: ${data.email}`);
      console.log(`    Client Name: ${data.client_name || 'NOT SET'}`);
      console.log(`    Company Name: ${data.companyName || 'NOT SET'}`);
      console.log('');
    });
    
    // 4. Check activities with client_name
    console.log('4. Checking activities with client_name...');
    const activitiesWithClientSnapshot = await db.collection('activities').where('client_name', '!=', null).get();
    console.log(`Found ${activitiesWithClientSnapshot.size} activities with client_name set`);
    
    // 5. Check activities without client_name
    console.log('5. Checking activities without client_name...');
    const activitiesWithoutClientSnapshot = await db.collection('activities').where('client_name', '==', null).get();
    console.log(`Found ${activitiesWithoutClientSnapshot.size} activities without client_name set`);
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run test
testSiteAdminFunctionality(); 