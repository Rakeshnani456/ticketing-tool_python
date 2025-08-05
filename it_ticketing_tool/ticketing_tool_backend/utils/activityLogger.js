// utils/activityLogger.js
const { FieldValue } = require('firebase-admin/firestore');

/**
 * Log an activity to the activities collection with enhanced context
 * @param {Object} db - Firebase Firestore instance
 * @param {string} type - Activity type (created, assignment, status_change, comment, resolved, attachment)
 * @param {string} user_name - Name of the user performing the action
 * @param {string} description - Description of the activity
 * @param {string} ticket_id - Ticket ID associated with the activity
 * @param {string} user_email - Email of the user performing the action
 * @param {Object} additionalData - Additional context data for the activity
 */
async function logActivity(db, type, user_name, description, ticket_id, user_email = null, additionalData = {}) {
    try {
        const activitiesCollection = db.collection('activities');
        
        const activityData = {
            type: type,
            user_name: user_name,
            description: description,
            ticket_id: ticket_id,
            user_email: user_email,
            timestamp: FieldValue.serverTimestamp(),
            // Include client information if available
            client_name: additionalData.client_name || null,
            companyName: additionalData.companyName || null,
            ...additionalData
        };

        await activitiesCollection.add(activityData);
        console.log(`Activity logged: ${type} - ${description} for ticket ${ticket_id}`);
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw error to avoid breaking the main operation
    }
}

/**
 * Log ticket creation activity
 */
async function logTicketCreated(db, ticket_id, user_name, user_email, ticketDetails = {}) {
    const description = `Created new ticket`;
    const additionalData = {
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_category: ticketDetails.category || 'No category',
        ticket_priority: ticketDetails.priority || 'Low',
        ticket_status: ticketDetails.status || 'Open',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'created', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log ticket assignment activity
 */
async function logTicketAssigned(db, ticket_id, user_name, assigned_to_email, user_email, ticketDetails = {}) {
    const description = `Assigned to ${assigned_to_email}`;
    const additionalData = {
        assigned_to_email: assigned_to_email,
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_status: ticketDetails.status || 'Unknown',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'assignment', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log status change activity
 */
async function logStatusChange(db, ticket_id, user_name, old_status, new_status, user_email, ticketDetails = {}) {
    const description = `Status changed from ${old_status} to ${new_status}`;
    const additionalData = {
        old_status: old_status,
        new_status: new_status,
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_priority: ticketDetails.priority || 'Unknown',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'status_change', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log comment addition activity with comment text
 */
async function logCommentAdded(db, ticket_id, user_name, user_email, commentText = '', ticketDetails = {}) {
    // Truncate comment text if too long for display
    const truncatedComment = commentText.length > 100 ? commentText.substring(0, 100) + '...' : commentText;
    const description = `Added a comment`;
    const additionalData = {
        comment_text: truncatedComment,
        comment_length: commentText.length,
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_status: ticketDetails.status || 'Unknown',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'comment', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log ticket resolution activity
 */
async function logTicketResolved(db, ticket_id, user_name, user_email, ticketDetails = {}) {
    const description = `Resolved ticket`;
    const additionalData = {
        ticket_title: ticketDetails.short_description || 'No title',
        resolution_time: ticketDetails.resolution_time || null,
        closure_notes: ticketDetails.closure_notes || null,
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'resolved', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log attachment upload activity
 */
async function logAttachmentUploaded(db, ticket_id, user_name, filename, user_email, ticketDetails = {}) {
    const description = `Uploaded attachment: ${filename}`;
    const additionalData = {
        filename: filename,
        file_size: ticketDetails.file_size || null,
        file_type: ticketDetails.file_type || null,
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'attachment', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log priority change activity
 */
async function logPriorityChange(db, ticket_id, user_name, old_priority, new_priority, user_email, ticketDetails = {}) {
    const description = `Priority changed from ${old_priority} to ${new_priority}`;
    const additionalData = {
        old_priority: old_priority,
        new_priority: new_priority,
        ticket_title: ticketDetails.short_description || 'No title',
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'priority_change', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

/**
 * Log ticket cancellation activity
 */
async function logTicketCancelled(db, ticket_id, user_name, user_email, ticketDetails = {}) {
    const description = `Cancelled ticket`;
    const additionalData = {
        ticket_title: ticketDetails.short_description || 'No title',
        cancellation_reason: ticketDetails.cancellation_reason || null,
        ticket_display_id: ticketDetails.ticket_display_id || ticketDetails.display_id || null
    };
    
    await logActivity(
        db, 
        'cancelled', 
        user_name, 
        description, 
        ticket_id, 
        user_email,
        additionalData
    );
}

module.exports = {
    logActivity,
    logTicketCreated,
    logTicketAssigned,
    logStatusChange,
    logCommentAdded,
    logTicketResolved,
    logAttachmentUploaded,
    logPriorityChange,
    logTicketCancelled
}; 