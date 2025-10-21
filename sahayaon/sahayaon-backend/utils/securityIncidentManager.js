// utils/securityIncidentManager.js
const admin = require('firebase-admin');

const INCIDENT_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

const INCIDENT_TYPES = {
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    DATA_BREACH: 'data_breach',
    MALWARE: 'malware',
    DDOS: 'ddos',
    PHISHING: 'phishing',
    BRUTE_FORCE: 'brute_force',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    POLICY_VIOLATION: 'policy_violation'
};

/**
 * Log a security incident
 * @param {Object} db - Firestore database instance
 * @param {Object} incidentData - Incident details
 * @returns {string} - Incident ID
 */
async function logSecurityIncident(db, incidentData) {
    const {
        type,
        severity,
        description,
        affectedUsers = [],
        affectedData = [],
        detectedBy,
        ipAddress,
        userAgent,
        additionalInfo = {}
    } = incidentData;
    
    try {
        const incident = await db.collection('security_incidents').add({
            type,
            severity,
            description,
            affectedUsers,
            affectedData,
            detectedBy,
            ipAddress,
            userAgent,
            additionalInfo,
            status: 'open',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            responseActions: [],
            resolved: false,
            assignedTo: null,
            resolutionNotes: null
        });
        
        console.log(`🔒 Security incident logged: ${type} (${severity}) - ID: ${incident.id}`);
        
        // If critical or high severity, send immediate alerts
        if (severity === INCIDENT_SEVERITY.CRITICAL || severity === INCIDENT_SEVERITY.HIGH) {
            await sendSecurityAlert(db, incident.id, incidentData);
        }
        
        // Log to activity log
        await db.collection('activities').add({
            type: 'security_incident',
            description: `Security incident detected: ${type}`,
            severity,
            incident_id: incident.id,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            incident_type: type
        });
        
        return incident.id;
    } catch (error) {
        console.error('Error logging security incident:', error);
        throw error;
    }
}

/**
 * Send security alert notifications
 * @param {Object} db - Firestore database instance
 * @param {string} incidentId - Incident ID
 * @param {Object} incidentData - Incident details
 */
async function sendSecurityAlert(db, incidentId, incidentData) {
    try {
        console.log(`🚨 SECURITY ALERT: ${incidentData.type} - Severity: ${incidentData.severity}`);
        console.log(`Description: ${incidentData.description}`);
        
        // Get all admin and super_admin users
        const adminUsers = await db.collection('users')
            .where('role', 'in', ['admin', 'super_admin'])
            .get();
        
        // Create notifications for all admins
        const notificationPromises = adminUsers.docs.map(doc => {
            return db.collection('notifications').add({
                recipientId: doc.id,
                type: 'security_alert',
                title: `Security Incident: ${incidentData.type}`,
                message: `Severity: ${incidentData.severity} - ${incidentData.description}`,
                priority: 'critical',
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
                incident_id: incidentId,
                actionRequired: true
            });
        });
        
        await Promise.all(notificationPromises);
        
        // TODO: Integrate email service to send email alerts
        // const emailService = require('./emailService');
        // await emailService.sendSecurityIncidentAlert(incidentData);
        
        console.log(`✓ Security alerts sent to ${adminUsers.size} administrators`);
    } catch (error) {
        console.error('Error sending security alerts:', error);
    }
}

/**
 * Update incident status
 * @param {Object} db - Firestore database instance
 * @param {string} incidentId - Incident ID
 * @param {string} status - New status ('open', 'investigating', 'contained', 'resolved')
 * @param {string} notes - Status update notes
 * @param {string} userId - User making the update
 */
async function updateIncidentStatus(db, incidentId, status, notes, userId) {
    try {
        const incidentRef = db.collection('security_incidents').doc(incidentId);
        const updateData = {
            status,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: userId
        };
        
        if (status === 'resolved') {
            updateData.resolved = true;
            updateData.resolutionDate = admin.firestore.FieldValue.serverTimestamp();
            updateData.resolutionNotes = notes;
        }
        
        await incidentRef.update(updateData);
        
        // Add response action to history
        await incidentRef.update({
            responseActions: admin.firestore.FieldValue.arrayUnion({
                action: `Status changed to ${status}`,
                notes,
                timestamp: new Date(),
                by: userId
            })
        });
        
        console.log(`✓ Incident ${incidentId} status updated to: ${status}`);
    } catch (error) {
        console.error('Error updating incident status:', error);
        throw error;
    }
}

/**
 * Add response action to incident
 * @param {Object} db - Firestore database instance
 * @param {string} incidentId - Incident ID
 * @param {string} action - Action taken
 * @param {string} notes - Action notes
 * @param {string} userId - User taking the action
 */
async function addIncidentResponse(db, incidentId, action, notes, userId) {
    try {
        const incidentRef = db.collection('security_incidents').doc(incidentId);
        
        await incidentRef.update({
            responseActions: admin.firestore.FieldValue.arrayUnion({
                action,
                notes,
                timestamp: new Date(),
                by: userId
            }),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✓ Response action added to incident ${incidentId}`);
    } catch (error) {
        console.error('Error adding incident response:', error);
        throw error;
    }
}

/**
 * Track suspicious login activity
 * @param {Object} db - Firestore database instance
 * @param {string} email - User email
 * @param {string} ip - IP address
 * @param {string} userAgent - User agent
 * @param {string} reason - Reason for suspicion
 */
async function trackSuspiciousActivity(db, email, ip, userAgent, reason) {
    try {
        // Check if this is a repeated suspicious activity
        const recentActivity = await db.collection('suspicious_activities')
            .where('email', '==', email)
            .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
            .get();
        
        const count = recentActivity.size + 1;
        
        // Log suspicious activity
        await db.collection('suspicious_activities').add({
            email,
            ip,
            userAgent,
            reason,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            count
        });
        
        // If multiple suspicious activities, create incident
        if (count >= 3) {
            await logSecurityIncident(db, {
                type: INCIDENT_TYPES.SUSPICIOUS_ACTIVITY,
                severity: INCIDENT_SEVERITY.MEDIUM,
                description: `Multiple suspicious login attempts detected for ${email}`,
                affectedUsers: [email],
                detectedBy: 'automated_system',
                ipAddress: ip,
                userAgent,
                additionalInfo: {
                    reason,
                    count
                }
            });
        }
        
    } catch (error) {
        console.error('Error tracking suspicious activity:', error);
    }
}

/**
 * Handle data breach
 * @param {Object} db - Firestore database instance
 * @param {Object} breachData - Breach details
 * @returns {string} - Breach incident ID
 */
async function handleDataBreach(db, breachData) {
    const {
        description,
        affectedUsers,
        dataTypes,
        breachDate,
        discoveryDate,
        containmentMeasures,
        mitigationSteps
    } = breachData;
    
    try {
        // 1. Log the breach
        const breachDoc = await db.collection('data_breaches').add({
            description,
            affectedUserCount: affectedUsers.length,
            affectedUsers,
            dataTypes,
            breachDate: new Date(breachDate),
            discoveryDate: new Date(discoveryDate),
            containmentMeasures,
            mitigationSteps,
            status: 'investigating',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            notifiedUsers: false,
            notifiedAuthority: false,
            notificationDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours from now
        });
        
        console.log(`🚨 DATA BREACH DETECTED - ID: ${breachDoc.id}`);
        console.log(`⏰ SUPERVISORY AUTHORITY MUST BE NOTIFIED WITHIN 72 HOURS`);
        console.log(`Deadline: ${new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()}`);
        
        // 2. Notify affected users
        const notificationPromises = affectedUsers.map(async (userId) => {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    
                    // Create in-app notification
                    await db.collection('notifications').add({
                        recipientId: userId,
                        type: 'security_breach',
                        title: 'Important Security Notification',
                        message: 'We have detected a security incident that may have affected your data. Please check your email for detailed information and recommended actions.',
                        priority: 'critical',
                        created_at: admin.firestore.FieldValue.serverTimestamp(),
                        read: false,
                        breach_id: breachDoc.id
                    });
                    
                    // TODO: Send email notification
                    // await sendBreachNotificationEmail(userData.email, { breachDate, dataTypes, mitigationSteps });
                }
            } catch (error) {
                console.error(`Error notifying user ${userId}:`, error);
            }
        });
        
        await Promise.all(notificationPromises);
        await breachDoc.update({ notifiedUsers: true });
        
        // 3. Log as security incident
        const incidentId = await logSecurityIncident(db, {
            type: INCIDENT_TYPES.DATA_BREACH,
            severity: INCIDENT_SEVERITY.CRITICAL,
            description,
            affectedUsers,
            affectedData: dataTypes,
            detectedBy: 'system',
            additionalInfo: {
                breachDate,
                discoveryDate,
                containmentMeasures,
                mitigationSteps,
                breach_id: breachDoc.id
            }
        });
        
        console.log(`✓ Affected users notified (${affectedUsers.length} users)`);
        console.log(`✓ Security incident created: ${incidentId}`);
        
        return breachDoc.id;
    } catch (error) {
        console.error('Error handling data breach:', error);
        throw error;
    }
}

/**
 * Get incident statistics
 * @param {Object} db - Firestore database instance
 * @param {number} days - Number of days to look back
 * @returns {Object} - Incident statistics
 */
async function getIncidentStatistics(db, days = 30) {
    try {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        const incidents = await db.collection('security_incidents')
            .where('timestamp', '>', cutoffDate)
            .get();
        
        const stats = {
            total: incidents.size,
            bySeverity: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            byType: {},
            byStatus: {
                open: 0,
                investigating: 0,
                contained: 0,
                resolved: 0
            },
            averageResolutionTime: 0
        };
        
        let totalResolutionTime = 0;
        let resolvedCount = 0;
        
        incidents.forEach(doc => {
            const data = doc.data();
            
            // Count by severity
            stats.bySeverity[data.severity]++;
            
            // Count by type
            stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
            
            // Count by status
            stats.byStatus[data.status]++;
            
            // Calculate resolution time
            if (data.resolved && data.resolutionDate) {
                const resolutionTime = data.resolutionDate.toDate().getTime() - data.timestamp.toDate().getTime();
                totalResolutionTime += resolutionTime;
                resolvedCount++;
            }
        });
        
        if (resolvedCount > 0) {
            stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60)); // hours
        }
        
        return stats;
    } catch (error) {
        console.error('Error getting incident statistics:', error);
        throw error;
    }
}

module.exports = {
    INCIDENT_SEVERITY,
    INCIDENT_TYPES,
    logSecurityIncident,
    sendSecurityAlert,
    updateIncidentStatus,
    addIncidentResponse,
    trackSuspiciousActivity,
    handleDataBreach,
    getIncidentStatistics
};

