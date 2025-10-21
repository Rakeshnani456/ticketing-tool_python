// routes/gdprRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, admin, verifyFirebaseToken) => {
    
    // @route   GET /api/gdpr/export-data
    // @desc    Export all user data (GDPR Right to Access)
    // @access  Private
    router.get('/export-data', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        
        try {
            const userData = {
                exportDate: new Date().toISOString(),
                userId: userId,
                exportedBy: userEmail,
                
                // User Profile
                profile: null,
                
                // Tickets
                tickets: [],
                
                // Comments
                comments: [],
                
                // Activities
                activities: [],
                
                // Notifications
                notifications: [],
                
                // Personal Notes
                personalNotes: [],
                
                // Login History
                loginHistory: [],
                
                // Consents
                consents: []
            };
            
            // Get user profile
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const profileData = userDoc.data();
                // Remove sensitive internal fields
                delete profileData.passwordHash;
                delete profileData.password;
                delete profileData.internal_notes;
                
                userData.profile = profileData;
            }
            
            // Get tickets created by user
            const ticketsSnapshot = await db.collection('tickets')
                .where('reporter_id', '==', userId)
                .get();
            
            ticketsSnapshot.forEach(doc => {
                userData.tickets.push({
                    id: doc.id,
                    role: 'creator',
                    ...doc.data()
                });
            });
            
            // Get tickets assigned to user
            const assignedTicketsSnapshot = await db.collection('tickets')
                .where('assigned_to', '==', userId)
                .get();
            
            assignedTicketsSnapshot.forEach(doc => {
                if (!userData.tickets.find(t => t.id === doc.id)) {
                    userData.tickets.push({
                        id: doc.id,
                        role: 'assignee',
                        ...doc.data()
                    });
                }
            });
            
            // Get comments from tickets
            for (const ticket of userData.tickets) {
                if (ticket.comments && Array.isArray(ticket.comments)) {
                    const userComments = ticket.comments.filter(
                        comment => comment.comment_by === userEmail || comment.comment_by_id === userId
                    );
                    userData.comments.push(...userComments.map(c => ({
                        ...c,
                        ticket_id: ticket.id,
                        ticket_title: ticket.short_description
                    })));
                }
            }
            
            // Get user activities
            const activitiesSnapshot = await db.collection('activities')
                .where('user_email', '==', userEmail)
                .orderBy('timestamp', 'desc')
                .get();
            
            activitiesSnapshot.forEach(doc => {
                userData.activities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get notifications
            const notificationsSnapshot = await db.collection('notifications')
                .where('recipientId', '==', userId)
                .orderBy('created_at', 'desc')
                .get();
            
            notificationsSnapshot.forEach(doc => {
                userData.notifications.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get personal notes
            const notesSnapshot = await db.collection('personal_notes')
                .where('userId', '==', userId)
                .get();
            
            notesSnapshot.forEach(doc => {
                userData.personalNotes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Get login history
            if (userData.profile && userData.profile.loginActivity) {
                userData.loginHistory = userData.profile.loginActivity;
            }
            
            // Get consent history
            const consentsSnapshot = await db.collection('user_consents')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            consentsSnapshot.forEach(doc => {
                userData.consents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Log the data export request for audit purposes
            await db.collection('gdpr_requests').add({
                userId: userId,
                userEmail: userEmail,
                requestType: 'data_export',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'completed',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            
            // Log activity
            await db.collection('activities').add({
                type: 'gdpr_data_export',
                user_email: userEmail,
                user_name: userData.profile?.firstName || userData.profile?.name || userEmail,
                description: 'User exported their personal data',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Send as downloadable JSON file
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="user_data_export_${userId}_${Date.now()}.json"`);
            res.send(JSON.stringify(userData, null, 2));
            
        } catch (error) {
            console.error('Error exporting user data:', error);
            res.status(500).json({ error: 'Failed to export data', details: error.message });
        }
    });
    
    // @route   POST /api/gdpr/request-deletion
    // @desc    Request account deletion (GDPR Right to Erasure)
    // @access  Private
    router.post('/request-deletion', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        const { reason, confirmEmail } = req.body;
        
        // Verify email confirmation
        if (confirmEmail !== userEmail) {
            return res.status(400).json({ error: 'Email confirmation does not match' });
        }
        
        try {
            // Log deletion request
            const deletionRequest = await db.collection('gdpr_requests').add({
                userId: userId,
                userEmail: userEmail,
                requestType: 'account_deletion',
                reason: reason || 'Not provided',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            
            // Log activity
            await db.collection('activities').add({
                type: 'gdpr_deletion_request',
                user_email: userEmail,
                user_name: req.user.name || userEmail,
                description: 'User requested account deletion',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                request_id: deletionRequest.id
            });
            
            // Send confirmation email
            // TODO: Implement email notification
            
            res.status(200).json({ 
                message: 'Account deletion request submitted successfully',
                requestId: deletionRequest.id,
                details: 'Your request will be processed within 30 days. You will receive a confirmation email.'
            });
            
        } catch (error) {
            console.error('Error requesting account deletion:', error);
            res.status(500).json({ error: 'Failed to submit deletion request', details: error.message });
        }
    });
    
    // @route   DELETE /api/gdpr/delete-account
    // @desc    Actually delete/anonymize account (Admin action or automated after approval)
    // @access  Private (User or Admin)
    router.delete('/delete-account', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        const { confirmPassword, reason } = req.body;
        
        try {
            // Log deletion initiation
            await db.collection('gdpr_requests').add({
                userId: userId,
                userEmail: userEmail,
                requestType: 'account_deletion',
                reason: reason || 'Not provided',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'initiated'
            });
            
            // Anonymize instead of delete to maintain referential integrity
            const anonymousEmail = `deleted_user_${userId}_${Date.now()}@anonymized.local`;
            const batch = db.batch();
            
            // 1. Anonymize tickets (keep for records but remove PII)
            const ticketsSnapshot = await db.collection('tickets')
                .where('reporter_id', '==', userId)
                .get();
            
            ticketsSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    reporter_email: anonymousEmail,
                    reporter_name: 'Deleted User',
                    reporter_id: `deleted_${userId}`,
                    anonymized: true,
                    anonymization_date: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            
            // 2. Anonymize assigned tickets
            const assignedTicketsSnapshot = await db.collection('tickets')
                .where('assigned_to', '==', userId)
                .get();
            
            assignedTicketsSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    assigned_to: null,
                    assigned_to_email: anonymousEmail,
                    assigned_to_name: 'Deleted User'
                });
            });
            
            // 3. Delete personal notes
            const notesSnapshot = await db.collection('personal_notes')
                .where('userId', '==', userId)
                .get();
            
            notesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 4. Anonymize activities (keep for audit)
            const activitiesSnapshot = await db.collection('activities')
                .where('user_email', '==', userEmail)
                .get();
            
            activitiesSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    user_name: 'Deleted User',
                    user_email: anonymousEmail,
                    anonymized: true
                });
            });
            
            // 5. Delete notifications
            const notificationsSnapshot = await db.collection('notifications')
                .where('recipientId', '==', userId)
                .get();
            
            notificationsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 6. Anonymize user profile (keep for audit purposes)
            const userRef = db.collection('users').doc(userId);
            batch.update(userRef, {
                email: anonymousEmail,
                firstName: 'Deleted',
                lastName: 'User',
                name: 'Deleted User',
                phone: null,
                phoneNumber: null,
                address: null,
                employeeid: null,
                deleted: true,
                deletion_date: admin.firestore.FieldValue.serverTimestamp(),
                deletion_reason: reason || 'User requested deletion',
                original_user_id: userId
            });
            
            await batch.commit();
            
            // 7. Delete Firebase Auth user
            await admin.auth().deleteUser(userId);
            
            // Update GDPR request status
            const gdprRequestSnapshot = await db.collection('gdpr_requests')
                .where('userId', '==', userId)
                .where('requestType', '==', 'account_deletion')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            
            if (!gdprRequestSnapshot.empty) {
                await gdprRequestSnapshot.docs[0].ref.update({
                    status: 'completed',
                    completion_date: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            
            res.status(200).json({ 
                message: 'Account successfully deleted and data anonymized',
                details: 'Your account has been deleted. Some anonymized records are retained for legal compliance.'
            });
            
        } catch (error) {
            console.error('Error deleting account:', error);
            res.status(500).json({ error: 'Failed to delete account', details: error.message });
        }
    });
    
    // @route   POST /api/gdpr/consent
    // @desc    Record user consent
    // @access  Private
    router.post('/consent', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        const { consentType, granted, version } = req.body;
        
        if (!consentType || typeof granted !== 'boolean') {
            return res.status(400).json({ error: 'consentType and granted (boolean) are required' });
        }
        
        try {
            // Record consent in history
            await db.collection('user_consents').add({
                userId,
                userEmail,
                consentType, // 'terms_of_service', 'privacy_policy', 'marketing', 'analytics', 'cookies'
                granted,
                version: version || '1.0',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            
            // Update user profile with current consent status
            await db.collection('users').doc(userId).update({
                [`consents.${consentType}`]: {
                    granted,
                    version: version || '1.0',
                    timestamp: new Date()
                }
            });
            
            // Log activity
            await db.collection('activities').add({
                type: 'consent_update',
                user_email: userEmail,
                user_name: req.user.name || userEmail,
                description: `${granted ? 'Granted' : 'Revoked'} consent for ${consentType}`,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                consent_type: consentType,
                consent_granted: granted
            });
            
            res.status(200).json({ message: 'Consent recorded successfully' });
        } catch (error) {
            console.error('Error recording consent:', error);
            res.status(500).json({ error: 'Failed to record consent', details: error.message });
        }
    });
    
    // @route   GET /api/gdpr/consent-history
    // @desc    Get user's consent history
    // @access  Private
    router.get('/consent-history', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        
        try {
            const consents = await db.collection('user_consents')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            const consentHistory = consents.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            res.status(200).json({ consents: consentHistory });
        } catch (error) {
            console.error('Error fetching consent history:', error);
            res.status(500).json({ error: 'Failed to fetch consent history', details: error.message });
        }
    });
    
    // @route   GET /api/gdpr/my-requests
    // @desc    Get user's GDPR requests history
    // @access  Private
    router.get('/my-requests', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;
        
        try {
            const requests = await db.collection('gdpr_requests')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            const requestHistory = requests.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            res.status(200).json({ requests: requestHistory });
        } catch (error) {
            console.error('Error fetching GDPR requests:', error);
            res.status(500).json({ error: 'Failed to fetch requests', details: error.message });
        }
    });
    
    return router;
};

