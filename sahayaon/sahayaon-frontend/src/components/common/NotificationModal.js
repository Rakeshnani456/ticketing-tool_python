import React, { useMemo, useEffect, useRef } from 'react';
import { Bell, Eye, CheckCircle, X, Info, AlertCircle, Mail, Loader2, Check, Trash2 } from 'lucide-react';
import Spinner from './Spinner';

// Helper for relative time
const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
};

const getIconForNotificationType = (type) => {
    switch (type) {
        case 'alert':
            return <AlertCircle size={14} className="text-red-500" />;
        case 'info':
            return <Info size={14} className="text-blue-500" />;
        case 'message':
            return <Mail size={14} className="text-emerald-500" />;
        case 'update':
            return <Bell size={14} className="text-amber-500" />;
        default:
            return <Bell size={14} className="text-gray-500" />;
    }
};

const NotificationModal = ({ isOpen, onClose, notifications = [], onClearAll, onMarkRead, onViewTicket, isLoading = false, containerRef, className = "" }) => {
    const localRef = useRef(null);
    const modalRef = containerRef || localRef;

    // Scroll lock effect
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Outside click effect
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose && onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, modalRef]);

    const uniqueNotifications = useMemo(() => {
        const seenTitles = new Set();
        return notifications.filter(n => {
            if (seenTitles.has(n.title)) return false;
            seenTitles.add(n.title);
            return true;
        });
    }, [notifications]);

    const unreadCount = useMemo(() => uniqueNotifications.filter(n => !n.read).length, [uniqueNotifications]);

    if (!isOpen) return null;

    return (
        <div ref={modalRef} className={`absolute right-8 top-8 z-50 ${className}`}>
            <div 
                className="w-64 max-h-[70vh] bg-gray-100 rounded border-2 border-gray-400 overflow-hidden flex flex-col text-xs"
            >
                {/* Header */}
                <div className="px-6 py-2 text-xs bg-gray-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Bell size={18} className="text-white" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-sm font-semibold text-white">
                                Notifications
                            </h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex justify-between items-center px-6 py-2 bg-gray-50/80 border-b border-gray-100">
                    <span className="text-[11px] text-gray-600 font-medium">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </span>
                    <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                            <button 
                                onClick={onClearAll}
                                disabled={isLoading}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                            >
                                <Check size={12} />
                                Mark all read
                            </button>
                        )}
                        <button 
                            onClick={onClearAll}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={12} />
                            Clear all
                        </button>
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb #f9fafb' }}>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-xs">
                            <Spinner size="md" className="mb-2" />
                            <span className="text-[11px]">Loading...</span>
                        </div>
                    ) : uniqueNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-xs">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Bell size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-800 mb-2">All clear!</h3>
                            <p className="text-[11px] text-gray-500">No notifications at the moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {uniqueNotifications.map((notification, index) => (
                                <div
                                    key={notification.id}
                                    className={`p-2 transition-all duration-200 hover:bg-gray-50/50 ${
                                        !notification.read 
                                            ? 'bg-blue-50/30 border-l-4 border-blue-500' 
                                            : ''
                                    }`}
                                    style={{
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getIconForNotificationType(notification.type)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-[11px] font-semibold truncate ${
                                                    !notification.read ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                                    {getRelativeTime(notification.timestamp)}
                                                </span>
                                            </div>
                                            
                                            {/* TicketID . Requested by email */}
                                            <div className="text-[11px] text-gray-700 mb-1">
                                                {notification.ticket_id && (
                                                    <span className="font-mono text-blue-600">
                                                        {notification.ticket_id}
                                                    </span>
                                                )}
                                                {notification.reporter_email && (
                                                    <span className="text-gray-500">
                                                        . Requested by {notification.reporter_email}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Ticket update activity */}
                                            {notification.body && (
                                                <div className="text-[11px] text-gray-600 leading-relaxed mb-2">
                                                    {notification.body}
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center gap-2">
                                                {!notification.read && onMarkRead && (
                                                    <button
                                                        onClick={() => onMarkRead(notification.id)}
                                                        className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors group"
                                                    >
                                                        <CheckCircle size={10} className="group-hover:scale-110 transition-transform" />
                                                        Mark as read
                                                    </button>
                                                )}
                                                {notification.ticket_id && onViewTicket && (
                                                    <a
                                                        href={`/tickets/${notification.ticket_id}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            onViewTicket(notification.ticket_id);
                                                        }}
                                                        className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-gray-800 transition-colors group"
                                                    >
                                                        <Eye size={10} className="group-hover:scale-110 transition-transform" />
                                                        View details
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationModal;