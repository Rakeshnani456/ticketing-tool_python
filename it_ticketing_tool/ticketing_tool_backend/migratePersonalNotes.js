// Migration script to move personal notes from user documents to separate collection
const admin = require('firebase-admin');

// Initialize Firebase Admin (make sure your environment variables are set)
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

    admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig)
    });
}

const db = admin.firestore();
const usersCollection = db.collection('users');
const personalNotesCollection = db.collection('personal_notes');

async function migratePersonalNotes() {
    console.log('🔄 Starting personal notes migration...');
    
    try {
        // Get all users
        const usersSnapshot = await usersCollection.get();
        let totalUsers = 0;
        let totalNotes = 0;
        let migratedUsers = 0;
        
        console.log(`📊 Found ${usersSnapshot.size} users to process`);
        
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const personalNotes = userData.personal_notes || [];
            
            if (personalNotes.length > 0) {
                console.log(`📝 Processing user ${userDoc.id} with ${personalNotes.length} notes`);
                
                // Migrate each note to the new collection
                for (const note of personalNotes) {
                    try {
                        const noteData = {
                            user_id: userDoc.id,
                            title: note.title,
                            content: note.content,
                            category: note.category || 'general',
                            created_at: note.created_at ? 
                                (note.created_at._seconds ? 
                                    admin.firestore.Timestamp.fromDate(new Date(note.created_at._seconds * 1000)) :
                                    admin.firestore.Timestamp.fromDate(new Date(note.created_at))
                                ) : admin.firestore.FieldValue.serverTimestamp(),
                            updated_at: note.updated_at ? 
                                (note.updated_at._seconds ? 
                                    admin.firestore.Timestamp.fromDate(new Date(note.updated_at._seconds * 1000)) :
                                    admin.firestore.Timestamp.fromDate(new Date(note.updated_at))
                                ) : admin.firestore.FieldValue.serverTimestamp(),
                            is_pinned: note.is_pinned || false
                        };
                        
                        // Use the existing note ID if available, otherwise create new document
                        const noteRef = note.id ? 
                            personalNotesCollection.doc(note.id) : 
                            personalNotesCollection.doc();
                        
                        await noteRef.set(noteData);
                        totalNotes++;
                        
                    } catch (noteError) {
                        console.error(`❌ Error migrating note for user ${userDoc.id}:`, noteError);
                    }
                }
                
                // Remove personal_notes from user document after successful migration
                try {
                    await userDoc.ref.update({
                        personal_notes: admin.firestore.FieldValue.delete(),
                        updated_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                    migratedUsers++;
                    console.log(`✅ Successfully migrated ${personalNotes.length} notes for user ${userDoc.id}`);
                } catch (updateError) {
                    console.error(`❌ Error removing personal_notes from user ${userDoc.id}:`, updateError);
                }
            }
            
            totalUsers++;
        }
        
        console.log('🎉 Migration completed!');
        console.log(`📊 Statistics:`);
        console.log(`   - Total users processed: ${totalUsers}`);
        console.log(`   - Users with notes: ${migratedUsers}`);
        console.log(`   - Total notes migrated: ${totalNotes}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migratePersonalNotes()
        .then(() => {
            console.log('✅ Migration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migratePersonalNotes };


