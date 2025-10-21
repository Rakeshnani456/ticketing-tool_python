// migrateActivities.js - Migration script to update existing activities with client information
const admin = require('firebase-admin');

// Initialize Firebase Admin (adjust path as needed)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateActivities() {
  console.log('Starting activities migration...');
  
  try {
    // Get all activities
    const activitiesSnapshot = await db.collection('activities').get();
    console.log(`Found ${activitiesSnapshot.size} activities to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const activityDoc of activitiesSnapshot.docs) {
      const activityData = activityDoc.data();
      
      // Skip if already has client_name
      if (activityData.client_name) {
        skippedCount++;
        continue;
      }
      
      // Look up associated ticket
      if (activityData.ticket_id) {
        try {
          const ticketDoc = await db.collection('tickets').doc(activityData.ticket_id).get();
          
          if (ticketDoc.exists) {
            const ticketData = ticketDoc.data();
            const clientName = ticketData.client_name || ticketData.companyName;
            
            if (clientName) {
              // Update activity with client information
              await activityDoc.ref.update({
                client_name: clientName
              });
              updatedCount++;
              console.log(`Updated activity ${activityDoc.id} with client_name: ${clientName}`);
            } else {
              console.log(`Ticket ${activityData.ticket_id} has no client information`);
              skippedCount++;
            }
          } else {
            console.log(`Ticket ${activityData.ticket_id} not found`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`Error processing activity ${activityDoc.id}:`, error);
          skippedCount++;
        }
      } else {
        console.log(`Activity ${activityDoc.id} has no ticket_id`);
        skippedCount++;
      }
    }
    
    console.log(`Migration completed. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run migration
migrateActivities(); 