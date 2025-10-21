// src/contexts/EnterpriseNotificationContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import EnterpriseNotification from '../components/common/EnterpriseNotification';

const EnterpriseNotificationContext = createContext();

/**
 * Enterprise Notification Provider Component
 * Manages enterprise-style notifications with enhanced features
 */
export const EnterpriseNotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    /**
     * Show enterprise notification
     * @param {string} message - The notification message
     * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
     * @param {object} options - Additional options
     * @param {number} options.duration - Duration in milliseconds (default: 4000)
     * @param {string} options.position - Position of notification (default: 'top-right')
     * @param {string} options.ticketId - Ticket ID for ticket-related notifications
     * @param {string} options.ticketSubject - Ticket subject for context
     * @param {boolean} options.showDetails - Whether to show expandable details
     */
    const showEnterpriseNotification = useCallback((message, type = 'info', options = {}) => {
        console.log('📢 EnterpriseNotificationContext: showEnterpriseNotification called with:', { message, type, options });
        const id = options.id || `enterprise-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
            id,
            message,
            type,
            duration: options.duration || 4000,
            position: options.position || 'top-right',
            ticketId: options.ticketId || null,
            ticketSubject: options.ticketSubject || null,
            showDetails: options.showDetails || false,
            timestamp: Date.now()
        };

        console.log('📢 EnterpriseNotificationContext: Adding notification:', notification);
        setNotifications(prev => {
            const newNotifications = [...prev, notification];
            console.log('📢 EnterpriseNotificationContext: Updated notifications array:', newNotifications);
            return newNotifications;
        });
        return id;
    }, []);

    /**
     * Show ticket creation success notification
     * @param {string} ticketId - The created ticket ID
     * @param {string} ticketSubject - The ticket subject
     * @param {object} options - Additional options
     */
    const showTicketCreatedNotification = useCallback((displayId, ticketSubject, options = {}) => {
        console.log('🚀 EnterpriseNotificationContext: showTicketCreatedNotification called with:', { displayId, ticketSubject, options });
        const message = `🎫 Ticket ${displayId} Created Successfully! Your request "${ticketSubject}" has been submitted and assigned to our support team.`;
        const result = showEnterpriseNotification(message, 'success', {
            ...options,
            ticketId: displayId,
            ticketSubject,
            showDetails: true,
            duration: 6000 // Longer duration for ticket creation
        });
        console.log('🚀 EnterpriseNotificationContext: showEnterpriseNotification returned:', result);
        return result;
    }, [showEnterpriseNotification]);

    /**
     * Show ticket update notification
     * @param {string} ticketId - The updated ticket ID
     * @param {string} action - The action performed (e.g., 'updated', 'assigned', 'resolved')
     * @param {object} options - Additional options
     */
    const showTicketUpdateNotification = useCallback((ticketId, action, options = {}) => {
        const message = `Ticket ${ticketId} has been ${action}.`;
        return showEnterpriseNotification(message, 'info', {
            ...options,
            ticketId,
            showDetails: true,
            duration: 4000
        });
    }, [showEnterpriseNotification]);

    /**
     * Show system notification
     * @param {string} message - The notification message
     * @param {string} type - Type of notification
     * @param {object} options - Additional options
     */
    const showSystemNotification = useCallback((message, type = 'info', options = {}) => {
        return showEnterpriseNotification(message, type, {
            ...options,
            duration: 3000
        });
    }, [showEnterpriseNotification]);

    /**
     * Remove a notification by ID
     * @param {string} id - The notification ID
     */
    const hideNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, []);

    /**
     * Clear all notifications
     */
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    const value = {
        notifications,
        showEnterpriseNotification,
        showTicketCreatedNotification,
        showTicketUpdateNotification,
        showSystemNotification,
        hideNotification,
        clearAllNotifications
    };

    return (
        <EnterpriseNotificationContext.Provider value={value}>
            {children}
            {/* Render all enterprise notifications */}
            {notifications.map((notification, index) => (
                <EnterpriseNotification
                    key={notification.id}
                    message={notification.message}
                    type={notification.type}
                    isVisible={true}
                    onClose={() => hideNotification(notification.id)}
                    duration={notification.duration}
                    position={notification.position}
                    ticketId={notification.ticketId}
                    ticketSubject={notification.ticketSubject}
                    showDetails={notification.showDetails}
                />
            ))}
        </EnterpriseNotificationContext.Provider>
    );
};

/**
 * Hook to use the enterprise notification context
 * @returns {object} Enterprise notification context value
 */
export const useEnterpriseNotification = () => {
    const context = useContext(EnterpriseNotificationContext);
    if (!context) {
        throw new Error('useEnterpriseNotification must be used within an EnterpriseNotificationProvider');
    }
    return context;
};

export default EnterpriseNotificationContext;
