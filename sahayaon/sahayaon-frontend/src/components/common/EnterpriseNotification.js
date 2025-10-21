// src/components/common/EnterpriseNotification.js

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X, Clock, User, Ticket, ArrowRight } from 'lucide-react';

/**
 * Enterprise-style notification component for ticket creation and system events
 * Features a more professional, compact design with enterprise styling
 */
const EnterpriseNotification = ({ 
    message, 
    type = 'info',
    isVisible = false, 
    onClose, 
    duration = 3000,
    position = 'top-right',
    ticketId = null,
    ticketSubject = null,
    showDetails = false
}) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [showFullDetails, setShowFullDetails] = useState(false);

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
        }, 300);
    };

    const toggleDetails = () => {
        setShowFullDetails(!showFullDetails);
    };

    if (!isVisible && !isAnimating) return null;

    const getPositionClasses = () => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'top-center':
                return 'top-4 left-1/2 transform -translate-x-1/2';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-center':
                return 'bottom-4 left-1/2 transform -translate-x-1/2';
            case 'bottom-right':
                return 'bottom-4 right-4';
            default:
                return 'top-4 right-4';
        }
    };

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    container: 'bg-white border-l-4 border-green-500 shadow-lg',
                    icon: 'text-green-600',
                    iconComponent: CheckCircle,
                    title: 'Success',
                    titleColor: 'text-green-800'
                };
            case 'error':
                return {
                    container: 'bg-white border-l-4 border-red-500 shadow-lg',
                    icon: 'text-red-600',
                    iconComponent: XCircle,
                    title: 'Error',
                    titleColor: 'text-red-800'
                };
            case 'warning':
                return {
                    container: 'bg-white border-l-4 border-yellow-500 shadow-lg',
                    icon: 'text-yellow-600',
                    iconComponent: AlertCircle,
                    title: 'Warning',
                    titleColor: 'text-yellow-800'
                };
            case 'info':
            default:
                return {
                    container: 'bg-white border-l-4 border-blue-500 shadow-lg',
                    icon: 'text-blue-600',
                    iconComponent: Info,
                    title: 'Information',
                    titleColor: 'text-blue-800'
                };
        }
    };

    const typeStyles = getTypeStyles();
    const IconComponent = typeStyles.iconComponent;

    return (
        <div 
            className={`fixed max-w-md w-full z-50 ${getPositionClasses()} transition-all duration-300 ease-in-out ${
                isVisible && isAnimating 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 -translate-y-2 scale-95'
            }`}
        >
            <div className={`relative ${typeStyles.container} rounded-xl overflow-hidden shadow-xl border`}>
                {/* Professional Enterprise Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center`}>
                                <IconComponent className={`w-5 h-5 ${typeStyles.icon}`} />
                            </div>
                            <div>
                                <span className={`text-sm font-bold ${typeStyles.titleColor}`}>
                                    {typeStyles.title}
                                </span>
                                <div className="text-xs text-gray-500 font-medium">
                                    Sahayaon Helpdesk System
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-gray-600 font-medium">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Professional Main Content */}
                <div className="p-5 bg-white">
                    <div className="flex items-start space-x-4">
                        {/* Professional Icon */}
                        <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm border`}>
                                {ticketId ? (
                                    <Ticket className={`w-6 h-6 ${typeStyles.icon}`} />
                                ) : (
                                    <IconComponent className={`w-6 h-6 ${typeStyles.icon}`} />
                                )}
                            </div>
                        </div>

                        {/* Enhanced Message Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                                        {ticketId ? `Ticket ${ticketId} Created` : 'System Notification'}
                                    </h4>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="font-medium">Status: Active</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                                    aria-label="Close notification"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 border">
                                <p className="text-sm text-gray-800 leading-relaxed font-medium">
                                    {message}
                                </p>
                            </div>

                            {/* Enhanced Ticket Details */}
                            {ticketId && ticketSubject && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-semibold text-blue-800">Request Details</span>
                                    </div>
                                    <div className="text-sm text-blue-700 font-medium">
                                        "{ticketSubject}"
                                    </div>
                                </div>
                            )}

                            {/* Professional Action Button */}
                            {ticketId && (
                                <div className="mt-4 flex items-center justify-between">
                                    <button
                                        onClick={toggleDetails}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
                                    >
                                        <span>{showFullDetails ? 'Hide Details' : 'View Details'}</span>
                                        <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${showFullDetails ? 'rotate-90' : ''}`} />
                                    </button>
                                    <div className="text-xs text-gray-500">
                                        Auto-close in {Math.ceil(duration / 1000)}s
                                    </div>
                                </div>
                            )}

                            {/* Professional Full Details */}
                            {showFullDetails && ticketId && (
                                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <Ticket className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-blue-800">Ticket ID</div>
                                                <div className="text-lg font-bold text-blue-900">{ticketId}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-green-800">Status</div>
                                                <div className="text-sm font-medium text-green-700">Successfully Created</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-800">Created</div>
                                                <div className="text-sm font-medium text-gray-700">{new Date().toLocaleString()}</div>
                                            </div>
                                        </div>
                                        {ticketSubject && (
                                            <div className="flex items-start space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                                    <User className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-purple-800">Request Subject</div>
                                                    <div className="text-sm font-medium text-purple-700 mt-1">{ticketSubject}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Professional Enterprise Footer */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">K</span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-800">Sahayaon Helpdesk</div>
                                <div className="text-xs text-gray-600">Enterprise Support System</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-gray-600 font-medium">Online</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseNotification;
