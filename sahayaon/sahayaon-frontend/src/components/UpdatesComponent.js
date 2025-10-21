import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, AlertCircle, CheckCircle, Users, Clock, 
  FileText, Plus, TrendingUp, MessageSquare, Bell,
  ExternalLink, Filter, RefreshCw, Eye, EyeOff,
  Calendar, User, Tag, ArrowRight
} from 'lucide-react';
import { collection, query, orderBy, limit, getFirestore, where, getDocs } from 'firebase/firestore';
import { dbClient } from '../config/firebase';

const UpdatesComponent = ({ user, navigateTo, darkMode = false }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'today', 'week'
  const [showRead, setShowRead] = useState(true);
  const [readUpdates, setReadUpdates] = useState(new Set());

  // Theme classes
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-white';
  const textClass = darkMode ? 'text-gray-100' : 'text-gray-900';
  const borderClass = darkMode ? 'border-gray-700' : 'border-gray-200';
  const cardBgClass = darkMode ? 'bg-gray-800/70' : 'bg-white';
  const hoverClass = darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50';

  // Format timestamp utility
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    let safeTimestamp = timestamp;
    if (timestamp.toDate) {
      safeTimestamp = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      safeTimestamp = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      safeTimestamp = new Date(timestamp);
    }
    
    if (isNaN(safeTimestamp.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - safeTimestamp) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Get update icon and color based on type
  const getUpdateIcon = (type) => {
    const iconProps = { size: 16 };
    switch (type) {
      case 'status_change':
        return <AlertCircle {...iconProps} className="text-blue-500" />;
      case 'assignment':
        return <Users {...iconProps} className="text-green-500" />;
      case 'comment':
        return <MessageSquare {...iconProps} className="text-purple-500" />;
      case 'resolved':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      case 'attachment':
        return <FileText {...iconProps} className="text-orange-500" />;
      case 'created':
        return <Plus {...iconProps} className="text-indigo-500" />;
      case 'priority_change':
        return <TrendingUp {...iconProps} className="text-red-500" />;
      case 'cancelled':
        return <AlertCircle {...iconProps} className="text-red-600" />;
      default:
        return <Activity {...iconProps} className="text-gray-500" />;
    }
  };

  // Get update type label
  const getUpdateTypeLabel = (type) => {
    switch (type) {
      case 'status_change': return 'Status Changed';
      case 'assignment': return 'Assignment';
      case 'comment': return 'Comment Added';
      case 'resolved': return 'Resolved';
      case 'attachment': return 'Attachment Added';
      case 'created': return 'Created';
      case 'priority_change': return 'Priority Changed';
      case 'cancelled': return 'Cancelled';
      default: return 'Update';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Load updates from database
  useEffect(() => {
    const loadUpdates = async () => {
      try {
        setLoading(true);
        const db = getFirestore(dbClient);
        
        // Build query based on user role
        let updatesQuery;
        if (user?.role === 'site_admin' && user?.client_name) {
          // Site admin sees only their company's updates
          updatesQuery = query(
            collection(db, 'activities'),
            where('client_name', '==', user.client_name),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
        } else if (user?.role === 'support') {
          // Support sees all updates
          updatesQuery = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
        } else {
          // Admin/Super admin sees all updates
          updatesQuery = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
        }

        const snapshot = await getDocs(updatesQuery);
        const updatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setUpdates(updatesData);
      } catch (error) {
        console.error('Error loading updates:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUpdates();
    }
  }, [user]);

  // Filter updates based on selected filter
  const filteredUpdates = useMemo(() => {
    let filtered = updates;

    // Apply filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(update => !readUpdates.has(update.id));
        break;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(update => {
          const updateDate = update.timestamp?.toDate ? update.timestamp.toDate() : new Date(update.timestamp);
          return updateDate >= today;
        });
        break;
      case 'week':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(update => {
          const updateDate = update.timestamp?.toDate ? update.timestamp.toDate() : new Date(update.timestamp);
          return updateDate >= weekAgo;
        });
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply read status filter
    if (!showRead) {
      filtered = filtered.filter(update => !readUpdates.has(update.id));
    }

    return filtered;
  }, [updates, filter, showRead, readUpdates]);

  // Mark update as read
  const markAsRead = (updateId) => {
    setReadUpdates(prev => new Set([...prev, updateId]));
  };

  // Mark all as read
  const markAllAsRead = () => {
    const allUpdateIds = filteredUpdates.map(update => update.id);
    setReadUpdates(prev => new Set([...prev, ...allUpdateIds]));
  };

  // Get unread count
  const unreadCount = updates.filter(update => !readUpdates.has(update.id)).length;

  if (loading) {
    return (
      <div className={`rounded-xl border ${borderClass} ${cardBgClass} p-6`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-500" />
          <span className={`ml-3 ${textClass}`}>Loading updates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${borderClass} ${cardBgClass} overflow-hidden`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${borderClass} ${bgClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${textClass}`}>Recent Updates</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredUpdates.length} updates • {unreadCount} unread
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${borderClass} ${bgClass} ${textClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Updates</option>
              <option value="unread">Unread</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
            
            {/* Show/Hide Read Toggle */}
            <button
              onClick={() => setShowRead(!showRead)}
              className={`p-2 rounded-lg border ${borderClass} ${hoverClass} transition-colors`}
              title={showRead ? 'Hide read updates' : 'Show read updates'}
            >
              {showRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            
            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={`px-3 py-1.5 text-sm rounded-lg border ${borderClass} ${hoverClass} transition-colors ${textClass}`}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Updates List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredUpdates.length === 0 ? (
          <div className={`p-8 text-center ${textClass}`}>
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No updates found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'unread' ? 'No unread updates' : 'No updates match your filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUpdates.map((update, index) => {
              const isRead = readUpdates.has(update.id);
              const updateDate = update.timestamp?.toDate ? update.timestamp.toDate() : new Date(update.timestamp);
              const isToday = updateDate.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={update.id}
                  className={`p-4 ${hoverClass} transition-colors cursor-pointer ${
                    !isRead ? 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => markAsRead(update.id)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getUpdateIcon(update.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${textClass}`}>
                            {update.user_name || update.user || 'System'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(update.priority)}`}>
                            {getUpdateTypeLabel(update.type)}
                          </span>
                          {update.priority && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(update.priority)}`}>
                                {update.priority}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isToday && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Today
                            </span>
                          )}
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatTimestamp(update.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Ticket Reference */}
                      {update.ticket_display_id && (
                        <div className="mb-2">
                          <a
                            href={`/tickets/${update.ticket_id || update.ticketId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateTo(`/tickets/${update.ticket_id || update.ticketId}`);
                            }}
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {update.ticket_display_id}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      )}
                      
                      {/* Description */}
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                        {update.description || update.comment || 'No description available'}
                      </p>
                      
                      {/* Additional Info */}
                      {(update.status || update.assigned_to) && (
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          {update.status && (
                            <span className="flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Status: {update.status}
                            </span>
                          )}
                          {update.assigned_to && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              Assigned: {update.assigned_to}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Read Status Indicator */}
                    {!isRead && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {filteredUpdates.length > 0 && (
        <div className={`px-6 py-3 border-t ${borderClass} ${bgClass}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing {filteredUpdates.length} of {updates.length} updates
            </p>
            <button
              onClick={() => navigateTo('/all-tickets')}
              className="flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              View all tickets
              <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesComponent;

