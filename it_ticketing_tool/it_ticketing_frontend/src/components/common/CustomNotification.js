// src/components/common/CustomNotification.js

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Custom Notification Component for success, error, warning, and info messages
 * @param {object} props - Component props
 * @param {string} props.message - The notification message
 * @param {string} props.type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {boolean} props.isVisible - Whether the notification is visible
 * @param {function} props.onClose - Function to call when notification should be closed
 * @param {number} props.duration - Duration in milliseconds before auto-close (default: 4000)
 * @param {string} props.position - Position of notification: 'top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center' (default: 'top-right')
 * @param {number} props.index - Index of this notification in the stack (for stacking)
 * @param {number} props.totalCount - Total number of notifications in the stack
 * @returns {JSX.Element} A styled notification component
 */
const CustomNotification = ({ 
    message, 
    type = 'info', 
    isVisible = false, 
    onClose, 
    duration = 4000,
    position = 'top-right',
    index = 0,
    totalCount = 1
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300); // Wait for animation to complete
    };

    if (!isVisible && !isAnimating) return null;

    const getPositionClasses = () => {
        // Calculate stacking offset (each notification is ~80px tall including margin)
        const stackOffset = index * 90; // 80px height + 10px margin
        
        switch (position) {
            case 'top-left':
                return `top-4 left-4`;
            case 'top-center':
                return `top-4 left-1/2 transform -translate-x-1/2`;
            case 'top-right':
                return `top-4 right-4`;
            case 'bottom-left':
                return `bottom-4 left-4`;
            case 'bottom-center':
                return `bottom-4 left-1/2 transform -translate-x-1/2`;
            case 'bottom-right':
                return `bottom-4 right-4`;
            default:
                return `top-4 right-4`;
        }
    };

    const getStackOffset = () => {
        // Calculate stacking offset (each notification is ~80px tall including margin)
        const stackOffset = index * 90; // 80px height + 10px margin
        
        switch (position) {
            case 'top-left':
            case 'top-center':
            case 'top-right':
                return { 
                    top: `${16 + stackOffset}px`,
                    zIndex: 9999 - index // Higher z-index for newer notifications
                };
            case 'bottom-left':
            case 'bottom-center':
            case 'bottom-right':
                return { 
                    bottom: `${16 + stackOffset}px`,
                    zIndex: 9999 - index // Higher z-index for newer notifications
                };
            default:
                return { 
                    top: `${16 + stackOffset}px`,
                    zIndex: 9999 - index
                };
        }
    };

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-green-50 border-green-200 text-green-800',
                    icon: 'text-green-500',
                    iconComponent: CheckCircle,
                    progress: 'bg-green-500'
                };
            case 'error':
                return {
                    container: 'bg-red-50 border-red-200 text-red-800',
                    icon: 'text-red-500',
                    iconComponent: XCircle,
                    progress: 'bg-red-500'
                };
            case 'warning':
                return {
                    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                    icon: 'text-yellow-500',
                    iconComponent: AlertCircle,
                    progress: 'bg-yellow-500'
                };
            case 'info':
                return {
                    container: 'bg-blue-50 border-blue-200 text-blue-800',
                    icon: 'text-blue-500',
                    iconComponent: Info,
                    progress: 'bg-blue-500'
                };
            default:
                return {
                    container: 'bg-gray-50 border-gray-200 text-gray-800',
                    icon: 'text-gray-500',
                    iconComponent: Info,
                    progress: 'bg-gray-500'
                };
        }
    };

    const typeStyles = getTypeStyles();
    const IconComponent = typeStyles.iconComponent;

    return (
        <div 
            className={`fixed max-w-sm w-full ${getPositionClasses()} transition-all duration-300 ease-in-out ${
                isVisible && isAnimating 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 -translate-y-2 scale-95'
            }`}
            style={getStackOffset()}
        >
            <div className={`relative bg-white border-l-4 ${typeStyles.container} rounded-lg shadow-lg overflow-hidden ${
                index > 0 ? 'shadow-xl' : ''
            }`}>
                {/* Progress bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
                    <div 
                        className={`h-full ${typeStyles.progress} transition-all ease-linear`}
                        style={{
                            animation: `shrink ${duration}ms linear forwards`
                        }}
                    />
                </div>

                {/* Stack indicator for multiple notifications */}
                {totalCount > 1 && (
                    <div className="absolute top-2 right-2 bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                        {index + 1}/{totalCount}
                    </div>
                )}

                {/* Content */}
                <div className="flex items-start p-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mr-3">
                        <IconComponent className={`w-5 h-5 ${typeStyles.icon}`} />
                    </div>

                    {/* Message */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-5">
                            {message}
                        </p>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* CSS Animation for progress bar */}
            <style jsx>{`
                @keyframes shrink {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
};

export default CustomNotification;
