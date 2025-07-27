// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, jsonSerializableNotification) => {

    // NEW: Get notifications for the authenticated user
    // @route   GET /notifications/my
    // @desc    Get notifications for the authenticated user.
    // @access  Private (requires token)
    router.get('/my', verifySupabaseToken, async (req, res) => {
        const authenticatedUid = req.user.id;
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('userId', authenticatedUid)
                .order('timestamp', { ascending: false })
                .limit(20);

            if (error) throw error;

            const formattedNotifications = notifications.map(notification => 
                jsonSerializableNotification(notification.id, notification)
            );
            return res.status(200).json(formattedNotifications);
        } catch (error) {
            console.error(`Error fetching notifications for user ${authenticatedUid}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch notifications: ${error.message}` });
        }
    });

    // NEW: Mark a notification as read
    // @route   PATCH /notifications/:notificationId/read
    // @desc    Mark a specific notification as read.
    // @access  Private (requires token and ownership of notification)
    router.patch('/:notificationId/read', verifySupabaseToken, async (req, res) => {
        const notificationId = req.params.notificationId;
        const authenticatedUid = req.user.id;

        try {
            const { data: notification, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('id', notificationId)
                .single();

            if (error || !notification) {
                return res.status(404).json({ error: 'Notification not found.' });
            }

            if (notification.userId !== authenticatedUid) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to mark this notification as read.' });
            }

            const { error: updateError } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (updateError) throw updateError;

            return res.status(200).json({ message: 'Notification marked as read.' });
        } catch (error) {
            console.error(`Error marking notification ${notificationId} as read: ${error.message}`);
            return res.status(500).json({ error: `Failed to mark notification as read: ${error.message}` });
        }
    });

    router.delete('/:id', verifySupabaseToken, async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        try {
            const { data: notification, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !notification) {
                return res.status(404).json({ error: 'Notification not found.' });
            }

            if (notification.userId !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to clear this notification.' });
            }

            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return res.status(200).json({ message: 'Notification cleared successfully.' });
        } catch (error) {
            console.error(`Error clearing notification ${id} for user ${userId}:`, error);
            return res.status(500).json({ error: 'Failed to clear notification.' });
        }
    });

    // @route   DELETE /notifications/clear-all
    // @desc    Clear all notifications for the authenticated user.
    // @access  Private (requires authentication)
    router.delete('/clear-all', verifySupabaseToken, async (req, res) => {
        const userId = req.user.id;

        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('id')
                .eq('userId', userId);

            if (error) throw error;

            if (!notifications || notifications.length === 0) {
                return res.status(200).json({ message: 'No notifications to clear.' });
            }

            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('userId', userId);

            if (deleteError) throw deleteError;

            return res.status(200).json({ message: `Cleared ${notifications.length} notifications.` });
        } catch (error) {
            console.error(`Error clearing all notifications for user ${userId}:`, error);
            return res.status(500).json({ error: 'Failed to clear notifications.' });
        }
    });

    return router;
};