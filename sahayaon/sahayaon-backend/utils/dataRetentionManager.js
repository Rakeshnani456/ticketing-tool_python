// utils/dataRetentionManager.js
const admin = require('firebase-admin');

/**
 * Data retention policies in milliseconds
 */
const RETENTION_POLICIES = {
    tickets: {
        resolved: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (legal requirement)
        cancelled: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years
        spam: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    users: {
        inactive: 3 * 365 * 24 * 60 * 60 * 1000, // 3 years of inactivity
        deleted: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (anonymized)
    },
    activities: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years (audit requirement)
    notifications: 1 * 365 * 24 * 60 * 60 * 1000, // 1 year
    sessions: 30 * 24 * 60 * 60 * 1000, // 30 days
    login_attempts: 90 * 24 * 60 * 60 * 1000, // 90 days
    gdpr_requests: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    security_incidents: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
};

/**
 * Apply data retention policy
 * @param {Object} db - Firestore database instance
 * @returns {Object} - Statistics about what was cleaned up
 */
async function applyRetentionPolicy(db) {
    console.log('========================================');
    console.log('Starting data retention policy enforcement...');
    console.log('Time:', new Date().toISOString());
    console.log('========================================');
    
    const stats = {
        ticketsArchived: 0,
        ticketsDeleted: 0,
        notificationsDeleted: 0,
        loginAttemptsDeleted: 0,
        sessionsDeleted: 0,
        activitiesArchived: 0,
        inactiveUsersNotified: 0,
        errors: []
    };
    
    const now = Date.now();
    
    try {
        // 1. Archive old resolved tickets
        await archiveOldTickets(db, now, stats);
        
        // 2. Delete old notifications
        await deleteOldNotifications(db, now, stats);
        
        // 3. Delete old login attempts
        await deleteOldLoginAttempts(db, now, stats);
        
        // 4. Delete expired sessions
        await deleteExpiredSessions(db, now, stats);
        
        // 5. Archive old activities
        await archiveOldActivities(db, now, stats);
        
        // 6. Handle inactive users
        await handleInactiveUsers(db, now, stats);
        
        // 7. Clean up old anonymized user data
        await cleanupAnonymizedUsers(db, now, stats);
        
        console.log('========================================');
        console.log('Data retention policy enforcement completed');
        console.log('Statistics:', JSON.stringify(stats, null, 2));
        console.log('========================================');
        
        // Log retention policy execution
        await db.collection('system_logs').add({
            type: 'data_retention',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            stats: stats,
            success: stats.errors.length === 0
        });
        
        return stats;
        
    } catch (error) {
        console.error('Error applying retention policy:', error);
        stats.errors.push(error.message);
        
        await db.collection('system_logs').add({
            type: 'data_retention_error',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            error: error.message,
            stats: stats
        });
        
        throw error;
    }
}

/**
 * Archive old resolved tickets
 */
async function archiveOldTickets(db, now, stats) {
    try {
        const resolvedCutoff = new Date(now - RETENTION_POLICIES.tickets.resolved);
        const cancelledCutoff = new Date(now - RETENTION_POLICIES.tickets.cancelled);
        
        // Archive resolved tickets
        const oldResolvedTickets = await db.collection('tickets')
            .where('status', '==', 'Resolved')
            .where('updated_at', '<', resolvedCutoff)
            .limit(100) // Process in batches
            .get();
        
        if (!oldResolvedTickets.empty) {
            const batch = db.batch();
            oldResolvedTickets.forEach(doc => {
                const archiveRef = db.collection('archived_tickets').doc(doc.id);
                batch.set(archiveRef, {
                    ...doc.data(),
                    archived_date: admin.firestore.FieldValue.serverTimestamp(),
                    archived_reason: 'retention_policy_resolved'
                });
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.ticketsArchived += oldResolvedTickets.size;
            console.log(`✓ Archived ${oldResolvedTickets.size} old resolved tickets`);
        }
        
        // Delete old cancelled tickets
        const oldCancelledTickets = await db.collection('tickets')
            .where('status', '==', 'Cancelled')
            .where('updated_at', '<', cancelledCutoff)
            .limit(100)
            .get();
        
        if (!oldCancelledTickets.empty) {
            const batch = db.batch();
            oldCancelledTickets.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.ticketsDeleted += oldCancelledTickets.size;
            console.log(`✓ Deleted ${oldCancelledTickets.size} old cancelled tickets`);
        }
        
    } catch (error) {
        console.error('Error archiving tickets:', error);
        stats.errors.push(`Ticket archival: ${error.message}`);
    }
}

/**
 * Delete old notifications
 */
async function deleteOldNotifications(db, now, stats) {
    try {
        const notificationCutoff = new Date(now - RETENTION_POLICIES.notifications);
        
        const oldNotifications = await db.collection('notifications')
            .where('created_at', '<', notificationCutoff)
            .limit(500) // Process in batches
            .get();
        
        if (!oldNotifications.empty) {
            const batch = db.batch();
            oldNotifications.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.notificationsDeleted += oldNotifications.size;
            console.log(`✓ Deleted ${oldNotifications.size} old notifications`);
        }
        
    } catch (error) {
        console.error('Error deleting notifications:', error);
        stats.errors.push(`Notification deletion: ${error.message}`);
    }
}

/**
 * Delete old login attempts
 */
async function deleteOldLoginAttempts(db, now, stats) {
    try {
        const loginCutoff = new Date(now - RETENTION_POLICIES.login_attempts);
        
        const oldAttempts = await db.collection('login_attempts')
            .where('timestamp', '<', loginCutoff)
            .limit(1000) // Process in batches
            .get();
        
        if (!oldAttempts.empty) {
            const batch = db.batch();
            oldAttempts.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.loginAttemptsDeleted += oldAttempts.size;
            console.log(`✓ Deleted ${oldAttempts.size} old login attempts`);
        }
        
    } catch (error) {
        console.error('Error deleting login attempts:', error);
        stats.errors.push(`Login attempts deletion: ${error.message}`);
    }
}

/**
 * Delete expired sessions
 */
async function deleteExpiredSessions(db, now, stats) {
    try {
        const sessionCutoff = new Date(now - RETENTION_POLICIES.sessions);
        
        const expiredSessions = await db.collection('sessions')
            .where('lastActivity', '<', sessionCutoff)
            .limit(500)
            .get();
        
        if (!expiredSessions.empty) {
            const batch = db.batch();
            expiredSessions.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.sessionsDeleted += expiredSessions.size;
            console.log(`✓ Deleted ${expiredSessions.size} expired sessions`);
        }
        
    } catch (error) {
        console.error('Error deleting sessions:', error);
        stats.errors.push(`Session deletion: ${error.message}`);
    }
}

/**
 * Archive old activities
 */
async function archiveOldActivities(db, now, stats) {
    try {
        const activityCutoff = new Date(now - RETENTION_POLICIES.activities);
        
        const oldActivities = await db.collection('activities')
            .where('timestamp', '<', activityCutoff)
            .limit(100)
            .get();
        
        if (!oldActivities.empty) {
            const batch = db.batch();
            oldActivities.forEach(doc => {
                const archiveRef = db.collection('archived_activities').doc(doc.id);
                batch.set(archiveRef, {
                    ...doc.data(),
                    archived_date: admin.firestore.FieldValue.serverTimestamp()
                });
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            stats.activitiesArchived += oldActivities.size;
            console.log(`✓ Archived ${oldActivities.size} old activities`);
        }
        
    } catch (error) {
        console.error('Error archiving activities:', error);
        stats.errors.push(`Activity archival: ${error.message}`);
    }
}

/**
 * Handle inactive users
 */
async function handleInactiveUsers(db, now, stats) {
    try {
        const inactiveCutoff = new Date(now - RETENTION_POLICIES.users.inactive);
        
        // Find users who haven't logged in for a long time
        const inactiveUsers = await db.collection('users')
            .where('lastLogin', '<', inactiveCutoff)
            .where('deleted', '==', false)
            .limit(50)
            .get();
        
        if (!inactiveUsers.empty) {
            // Send notification emails to inactive users
            for (const doc of inactiveUsers.docs) {
                const userData = doc.data();
                
                // Check if we've already sent an inactivity notice
                if (!userData.inactivity_notice_sent) {
                    // TODO: Send email notification
                    console.log(`  → Notifying inactive user: ${userData.email}`);
                    
                    await doc.ref.update({
                        inactivity_notice_sent: true,
                        inactivity_notice_date: admin.firestore.FieldValue.serverTimestamp()
                    });
                    
                    stats.inactiveUsersNotified++;
                }
            }
            
            console.log(`✓ Notified ${stats.inactiveUsersNotified} inactive users`);
        }
        
    } catch (error) {
        console.error('Error handling inactive users:', error);
        stats.errors.push(`Inactive users: ${error.message}`);
    }
}

/**
 * Clean up old anonymized user data
 */
async function cleanupAnonymizedUsers(db, now, stats) {
    try {
        const deletedCutoff = new Date(now - RETENTION_POLICIES.users.deleted);
        
        // Find users that were deleted/anonymized a long time ago
        const oldDeletedUsers = await db.collection('users')
            .where('deleted', '==', true)
            .where('deletion_date', '<', deletedCutoff)
            .limit(50)
            .get();
        
        if (!oldDeletedUsers.empty) {
            // These can be fully removed after the retention period
            const batch = db.batch();
            oldDeletedUsers.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`✓ Permanently deleted ${oldDeletedUsers.size} old anonymized user records`);
        }
        
    } catch (error) {
        console.error('Error cleaning up anonymized users:', error);
        stats.errors.push(`Anonymized users cleanup: ${error.message}`);
    }
}

/**
 * Schedule retention policy to run daily at specified time
 * @param {Object} db - Firestore database instance
 * @param {number} hour - Hour to run (0-23), default 2 AM
 */
function scheduleRetentionPolicy(db, hour = 2) {
    const runDaily = () => {
        const now = new Date();
        const next = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (now.getHours() >= hour ? 1 : 0),
            hour, 0, 0, 0
        );
        
        const timeUntilNext = next.getTime() - now.getTime();
        
        console.log(`📅 Data retention policy scheduled for: ${next.toISOString()}`);
        
        setTimeout(() => {
            applyRetentionPolicy(db).catch(err => {
                console.error('Scheduled retention policy failed:', err);
            });
            
            // Schedule next run
            setInterval(() => {
                applyRetentionPolicy(db).catch(err => {
                    console.error('Scheduled retention policy failed:', err);
                });
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, timeUntilNext);
    };
    
    runDaily();
}

/**
 * Get retention policy information
 * @returns {Object} - Retention policies in human-readable format
 */
function getRetentionPolicyInfo() {
    const msToYears = (ms) => ms / (365 * 24 * 60 * 60 * 1000);
    const msToDays = (ms) => ms / (24 * 60 * 60 * 1000);
    
    return {
        tickets: {
            resolved: `${msToYears(RETENTION_POLICIES.tickets.resolved)} years`,
            cancelled: `${msToYears(RETENTION_POLICIES.tickets.cancelled)} years`,
            spam: `${msToDays(RETENTION_POLICIES.tickets.spam)} days`
        },
        users: {
            inactive: `${msToYears(RETENTION_POLICIES.users.inactive)} years`,
            deleted: `${msToYears(RETENTION_POLICIES.users.deleted)} years (anonymized)`
        },
        activities: `${msToYears(RETENTION_POLICIES.activities)} years`,
        notifications: `${msToYears(RETENTION_POLICIES.notifications)} year`,
        sessions: `${msToDays(RETENTION_POLICIES.sessions)} days`,
        login_attempts: `${msToDays(RETENTION_POLICIES.login_attempts)} days`,
        gdpr_requests: `${msToYears(RETENTION_POLICIES.gdpr_requests)} years`,
        security_incidents: `${msToYears(RETENTION_POLICIES.security_incidents)} years`
    };
}

module.exports = {
    RETENTION_POLICIES,
    applyRetentionPolicy,
    scheduleRetentionPolicy,
    getRetentionPolicyInfo
};

