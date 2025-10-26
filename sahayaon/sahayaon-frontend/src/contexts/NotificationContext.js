// src/contexts/NotificationContext.js

import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomNotification from '../components/common/CustomNotification';

const NotificationContext = createContext();

/**
 * Notification Provider Component
 * Manages multiple notifications and provides methods to show/hide them
 */
export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    /**
     * Add a new notification
     * @param {string} message - The notification message
     * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
     * @param {object} options - Additional options
     * @param {number} options.duration - Duration in milliseconds (default: 2000)
     * @param {string} options.position - Position of notification (default: 'top-center')
     * @param {string} options.id - Custom ID for the notification (auto-generated if not provided)
     */
    const showNotification = useCallback((message, type = 'info', options = {}) => {
        const id = options.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
            id,
            message,
            type,
            duration: options.duration || 2000, // Reduced from 4000ms to 2000ms
            position: options.position || 'top-center',
            timestamp: Date.now()
        };

        setNotifications(prev => [...prev, notification]);
        return id;
    }, []);

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

    /**
     * Show success notification
     * @param {string} message - The success message
     * @param {object} options - Additional options
     */
    const showSuccess = useCallback((message, options = {}) => {
        return showNotification(message, 'success', options);
    }, [showNotification]);

    /**
     * Show error notification
     * @param {string} message - The error message
     * @param {object} options - Additional options
     */
    const showError = useCallback((message, options = {}) => {
        return showNotification(message, 'error', options);
    }, [showNotification]);

    /**
     * Show warning notification
     * @param {string} message - The warning message
     * @param {object} options - Additional options
     */
    const showWarning = useCallback((message, options = {}) => {
        return showNotification(message, 'warning', options);
    }, [showNotification]);

    /**
     * Show info notification
     * @param {string} message - The info message
     * @param {object} options - Additional options
     */
    const showInfo = useCallback((message, options = {}) => {
        return showNotification(message, 'info', options);
    }, [showNotification]);

    /**
     * Show multiple notifications at once (useful for testing stacking)
     * @param {Array} notifications - Array of notification objects
     */
    const showMultiple = useCallback((notifications) => {
        notifications.forEach((notification, index) => {
            setTimeout(() => {
                showNotification(
                    notification.message, 
                    notification.type, 
                    notification.options || {}
                );
            }, index * 200); // Stagger notifications by 200ms
        });
    }, [showNotification]);

    const value = {
        notifications,
        showNotification,
        hideNotification,
        clearAllNotifications,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showMultiple
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            {/* Render all notifications */}
            {notifications.map((notification, index) => (
                <CustomNotification
                    key={notification.id}
                    message={notification.message}
                    type={notification.type}
                    isVisible={true}
                    onClose={() => hideNotification(notification.id)}
                    duration={notification.duration}
                    position={notification.position}
                    index={index}
                    totalCount={notifications.length}
                />
            ))}
        </NotificationContext.Provider>
    );
};

/**
 * Hook to use the notification context
 * @returns {object} Notification context value
 */
export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
