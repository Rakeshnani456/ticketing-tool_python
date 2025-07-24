// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (db, notificationsCollection, verifyFirebaseToken, jsonSerializableNotification) => {

    // NEW: Get notifications for the authenticated user
    // @route   GET /notifications/my
    // @desc    Get notifications for the authenticated user.
    // @access  Private (requires token)
    router.get('/my', verifyFirebaseToken, async (req, res) => {
        const authenticatedUid = req.user.uid;
        try {
            const snapshot = await notificationsCollection
                .where('userId', '==', authenticatedUid)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();

            const notifications = snapshot.docs.map(doc => jsonSerializableNotification(doc.id, doc.data()));
            return res.status(200).json(notifications);
        } catch (error) {
            console.error(`Error fetching notifications for user ${authenticatedUid}: ${error.message}`);
            return res.status(500).json({ error: `Failed to fetch notifications: ${error.message}` });
        }
    });

    // NEW: Mark a notification as read
    // @route   PATCH /notifications/:notificationId/read
    // @desc    Mark a specific notification as read.
    // @access  Private (requires token and ownership of notification)
    router.patch('/:notificationId/read', verifyFirebaseToken, async (req, res) => {
        const notificationId = req.params.notificationId;
        const authenticatedUid = req.user.uid;

        try {
            const notificationDoc = await notificationsCollection.doc(notificationId).get();

            if (!notificationDoc.exists) {
                return res.status(404).json({ error: 'Notification not found.' });
            }

            const notificationData = notificationDoc.data();

            if (notificationData.userId !== authenticatedUid) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to mark this notification as read.' });
            }

            await notificationsCollection.doc(notificationId).update({ read: true });
            return res.status(200).json({ message: 'Notification marked as read.' });
        } catch (error) {
            console.error(`Error marking notification ${notificationId} as read: ${error.message}`);
            return res.status(500).json({ error: `Failed to mark notification as read: ${error.message}` });
        }
    });

    router.delete('/:id', verifyFirebaseToken, async (req, res) => {
        const { id } = req.params;
        const userId = req.user.uid;

        try {
            const notificationRef = notificationsCollection.doc(id);
            const notificationDoc = await notificationRef.get();

            if (!notificationDoc.exists) {
                return res.status(404).json({ error: 'Notification not found.' });
            }

            if (notificationDoc.data().userId !== userId) {
                return res.status(403).json({ error: 'Forbidden: You do not have permission to clear this notification.' });
            }

            await notificationRef.delete();
            return res.status(200).json({ message: 'Notification cleared successfully.' });
        } catch (error) {
            console.error(`Error clearing notification ${id} for user ${userId}:`, error);
            return res.status(500).json({ error: 'Failed to clear notification.' });
        }
    });

    // @route   DELETE /notifications/clear-all
    // @desc    Clear all notifications for the authenticated user.
    // @access  Private (requires authentication)
    router.delete('/clear-all', verifyFirebaseToken, async (req, res) => {
        const userId = req.user.uid;

        try {
            const userNotificationsQuery = notificationsCollection.where('userId', '==', userId);
            const snapshot = await userNotificationsQuery.get();

            if (snapshot.empty) {
                return res.status(200).json({ message: 'No notifications to clear.' });
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            return res.status(200).json({ message: 'All notifications cleared successfully.' });
        } catch (error) {
            console.error(`Error clearing all notifications for user ${userId}:`, error);
            return res.status(500).json({ error: 'Failed to clear all notifications.' });
        }
    });

    return router;
};