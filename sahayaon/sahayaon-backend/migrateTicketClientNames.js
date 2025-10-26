// Migration script to populate client_name on existing tickets
// This fixes the permission issue for site admins accessing tickets

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using environment variables
if (!admin.apps.length) {
  const firebaseConfig = {
    type: process.env.type,
    project_id: process.env.project_id,
    private_key_id: process.env.private_key_id,
    private_key: process.env.private_key ? process.env.private_key.replace(/\\n/g, '\n') : undefined,
    client_email: process.env.client_email,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url,
    universe_domain: process.env.universe_domain
  };

  if (!firebaseConfig.project_id || !firebaseConfig.private_key || !firebaseConfig.client_email) {
    throw new Error('Missing essential Firebase environment variables. Make sure .env file is configured.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
}

const db = admin.firestore();

async function migrateTicketClientNames() {
  console.log('🔄 Starting migration to populate client_name on tickets...');
  
  try {
    // Get all tickets without client_name or with null client_name
    const ticketsSnapshot = await db.collection('tickets')
      .where('client_name', '==', null)
      .get();
    
    console.log(`📊 Found ${ticketsSnapshot.size} tickets without client_name`);
    
    if (ticketsSnapshot.empty) {
      console.log('✅ No tickets need migration');
      return;
    }
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process tickets in batches
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;
    
    for (const ticketDoc of ticketsSnapshot.docs) {
      const ticketData = ticketDoc.data();
      const ticketId = ticketDoc.id;
      
      // Get reporter's user document to find their client_name
      try {
        const reporterSnapshot = await db.collection('users')
          .where('email', '==', ticketData.reporter_email)
          .limit(1)
          .get();
        
        if (!reporterSnapshot.empty) {
          const userData = reporterSnapshot.docs[0].data();
          const clientName = userData.client_name || null;
          
          if (clientName) {
            batch.update(ticketDoc.ref, { client_name: clientName });
            batchCount++;
            updated++;
            
            console.log(`✅ Queued update for ticket ${ticketData.display_id}: ${clientName}`);
            
            // Commit batch if it reaches the limit
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`💾 Committed batch of ${batchCount} updates`);
              batchCount = 0;
            }
          } else {
            skipped++;
            console.log(`⚠️  Skipped ticket ${ticketData.display_id}: reporter has no client_name`);
          }
        } else {
          skipped++;
          console.log(`⚠️  Skipped ticket ${ticketData.display_id}: reporter not found`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Failed to process ticket ${ticketData.display_id}:`, error.message);
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updated} tickets`);
    console.log(`   ⚠️  Skipped: ${skipped} tickets`);
    console.log(`   ❌ Failed: ${failed} tickets`);
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateTicketClientNames()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });

