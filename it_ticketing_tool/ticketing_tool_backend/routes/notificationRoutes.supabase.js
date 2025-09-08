// routes/notificationRoutes.supabase.js
const express = require('express');
const router = express.Router();

module.exports = (supabase, verifySupabaseToken, jsonSerializableNotification) => {

    // @route   GET /notifications
    // @desc    Get notifications for the authenticated user
    // @access  Private
    router.get('/', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 50;

        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const serializedNotifications = notifications.map(notification => 
                jsonSerializableNotification(notification)
            );

            return res.status(200).json(serializedNotifications);
        } catch (error) {
            console.error(`Error fetching notifications for user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch notifications: ${error.message}` });
        }
    });

    // @route   PATCH /notifications/:notificationId/read
    // @desc    Mark a notification as read
    // @access  Private
    router.patch('/:notificationId/read', verifySupabaseToken, async (req, res) => {
        const notificationId = req.params.notificationId;
        const userId = req.user.uid;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;

            return res.status(200).json({ message: 'Notification marked as read' });
        } catch (error) {
            console.error(`Error marking notification ${notificationId} as read: ${error.message}`);
            return res.status(500).json({ error: `Failed to mark notification as read: ${error.message}` });
        }
    });

    // @route   PATCH /notifications/mark-all-read
    // @desc    Mark all notifications as read for the authenticated user
    // @access  Private
    router.patch('/mark-all-read', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            return res.status(200).json({ message: 'All notifications marked as read' });
        } catch (error) {
            console.error(`Error marking all notifications as read for user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to mark all notifications as read: ${error.message}` });
        }
    });

    // @route   DELETE /notifications/:notificationId
    // @desc    Delete a notification
    // @access  Private
    router.delete('/:notificationId', verifySupabaseToken, async (req, res) => {
        const notificationId = req.params.notificationId;
        const userId = req.user.uid;

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;

            return res.status(200).json({ message: 'Notification deleted' });
        } catch (error) {
            console.error(`Error deleting notification ${notificationId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to delete notification: ${error.message}` });
        }
    });

    // @route   GET /notifications/unread-count
    // @desc    Get count of unread notifications for the authenticated user
    // @access  Private
    router.get('/unread-count', verifySupabaseToken, async (req, res) => {
        const userId = req.user.uid;

        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            return res.status(200).json({ unreadCount: count || 0 });
        } catch (error) {
            console.error(`Error fetching unread notification count for user ${userId}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch unread notification count: ${error.message}` });
        }
    });

    return router;
};

