// src/components/common/UpdatesComponent.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  User, 
  FileText, 
  TrendingUp, 
  Users, 
  Activity,
  ExternalLink,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  MoreHorizontal,
  Calendar,
  Tag,
  MessageSquare,
  Zap,
  Shield,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDropdown from './CustomDropdown';
import TooltipBubble from './TooltipBubble';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../../config/firebase';

const UpdatesComponent = ({ 
  user, 
  activities = [], 
  tickets = [], 
  darkMode = false,
  onNavigateTo,
  onMarkAsRead,
  onMarkAllAsRead,
  onMarkAsUnread,
  readStates = { activities: new Set(), tickets: new Set() },
  showRead = true
}) => {
  const [filterType, setFilterType] = useState('unread'); // Default to unread only
  const [sortBy, setSortBy] = useState('recent');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeActivities, setRealTimeActivities] = useState([]);
  const [realTimeTickets, setRealTimeTickets] = useState([]);

  // Real-time activity listener
  useEffect(() => {
    if (!user?.uid || !dbClient) return;

    console.log('🔄 Setting up real-time activities listener for UpdatesComponent');
    
    let activitiesQuery;
    try {
      // Create query for recent activities with role-based filtering
      if (user?.role === 'user') {
        // For regular users, skip the real-time listener since activities are filtered in DashboardComponent
        // The DashboardComponent already fetches activities for user's tickets
        console.log('🔄 Skipping real-time activities for user role - using DashboardComponent filtered activities');
        return;
      } else if (user?.role === 'site_admin' && user?.client_name) {
        // Site admin sees only their company's updates
        activitiesQuery = query(
          collection(dbClient, 'activities'),
          where('client_name', '==', user.client_name),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      } else {
        // Support, admin, super_admin see all activities
        activitiesQuery = query(
          collection(dbClient, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      }
    } catch (error) {
      console.error('Error creating activities query:', error);
      return;
    }

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const newActivities = [];
        snapshot.forEach((doc) => {
          const activity = { id: doc.id, ...doc.data() };
          newActivities.push(activity);
        });
        
        console.log('🔄 Real-time activities update received:', newActivities.length, 'activities');
        setRealTimeActivities(newActivities);
      },
      (error) => {
        console.error('Error in real-time activities listener:', error);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time activities listener');
      unsubscribe();
    };
  }, [user?.uid, user?.role, user?.client_name]);

  // Real-time tickets listener for recent tickets
  useEffect(() => {
    if (!user?.uid || !dbClient) return;

    console.log('🔄 Setting up real-time tickets listener for UpdatesComponent');
    
    let ticketsQuery;
    try {
      // Create query for recent tickets (last 2 days, open/in progress)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Add role-based filtering
      if (user?.role === 'user') {
        // For regular users, only show their own tickets
        ticketsQuery = query(
          collection(dbClient, 'tickets'),
          where('reporter_id', '==', user.uid),
          where('created_at', '>=', twoDaysAgo),
          where('status', 'in', ['Open', 'In Progress']),
          orderBy('created_at', 'desc'),
          limit(10)
        );
      } else if (user?.role === 'site_admin' && user?.client_name) {
        // Site admin sees only their company's tickets
        ticketsQuery = query(
          collection(dbClient, 'tickets'),
          where('client_name', '==', user.client_name),
          where('created_at', '>=', twoDaysAgo),
          where('status', 'in', ['Open', 'In Progress']),
          orderBy('created_at', 'desc'),
          limit(10)
        );
      } else {
        // Support, admin, super_admin see all tickets
        ticketsQuery = query(
          collection(dbClient, 'tickets'),
          where('created_at', '>=', twoDaysAgo),
          where('status', 'in', ['Open', 'In Progress']),
          orderBy('created_at', 'desc'),
          limit(10)
        );
      }
    } catch (error) {
      console.error('Error creating tickets query:', error);
      return;
    }

    const unsubscribe = onSnapshot(
      ticketsQuery,
      (snapshot) => {
        const newTickets = [];
        snapshot.forEach((doc) => {
          const ticket = { id: doc.id, ...doc.data() };
          newTickets.push(ticket);
        });
        
        console.log('🔄 Real-time tickets update received:', newTickets.length, 'tickets');
        setRealTimeTickets(newTickets);
      },
      (error) => {
        console.error('Error in real-time tickets listener:', error);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time tickets listener');
      unsubscribe();
    };
  }, [user?.uid, user?.role, user?.client_name]);

  // Memoized update processing
  const processedUpdates = useMemo(() => {
    const updates = [];

    // Use real-time data if available, otherwise fall back to props
    const currentActivities = realTimeActivities.length > 0 ? realTimeActivities : activities;
    const currentTickets = realTimeTickets.length > 0 ? realTimeTickets : tickets;

    // Process activities as updates
    currentActivities.forEach(activity => {
      const update = {
        id: `activity-${activity.id}`,
        type: 'activity',
        category: getActivityCategory(activity.type),
        priority: getActivityPriority(activity.type),
        title: getActivityTitle(activity),
        description: getActivityDescription(activity),
        timestamp: activity.timestamp,
        user: activity.user_name || activity.user_email || 'System',
        ticketId: activity.ticket_id || activity.ticketId,
        ticketDisplayId: activity.ticket_display_id || activity.display_id,
        ticketTitle: activity.ticket_title,
        status: activity.new_status || activity.status,
        isRead: readStates.activities.has(activity.id),
        icon: getActivityIcon(activity.type),
        color: getActivityColor(activity.type),
        metadata: getActivityMetadata(activity)
      };
      updates.push(update);
    });

    // Process tickets as updates
    currentTickets.forEach(ticket => {
      const update = {
        id: `ticket-${ticket.id}`,
        type: 'ticket',
        category: 'ticket',
        priority: ticket.priority || 'Medium',
        title: `Ticket ${ticket.display_id || ticket.ticket_id || ticket.id}`,
        description: ticket.short_description || ticket.subject || ticket.title || 'No description',
        timestamp: ticket.created_at || ticket.updated_at,
        user: ticket.reporter_name || ticket.reporter || ticket.user_name || 'Unknown',
        ticketId: ticket.id,
        ticketDisplayId: ticket.display_id,
        ticketTitle: ticket.title || ticket.subject,
        status: ticket.status,
        isRead: readStates.tickets.has(ticket.id),
        icon: getTicketIcon(ticket.status),
        color: getTicketColor(ticket.status),
        metadata: {
          priority: ticket.priority,
          status: ticket.status,
          client: ticket.client_name || ticket.companyName
        }
      };
      updates.push(update);
    });

    return updates.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else if (sortBy === 'priority') {
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }
      return 0;
    });
  }, [realTimeActivities, realTimeTickets, activities, tickets, readStates, sortBy]);

  // Filter updates based on selected filter - always filter out read updates
  const filteredUpdates = useMemo(() => {
    // First, filter out all read updates
    let unreadOnly = processedUpdates.filter(update => !update.isRead);
    
    // Then apply additional filters
    if (filterType === 'unread') return unreadOnly;
    if (filterType === 'tickets') return unreadOnly.filter(update => update.type === 'ticket');
    if (filterType === 'activities') return unreadOnly.filter(update => update.type === 'activity');
    return unreadOnly;
  }, [processedUpdates, filterType]);

  // Always show only unread updates
  const displayUpdates = useMemo(() => {
    return filteredUpdates.filter(update => !update.isRead);
  }, [filteredUpdates]);

  // Helper functions
  function getActivityCategory(type) {
    const categories = {
      'status_change': 'Status Update',
      'assignment': 'Assignment',
      'comment': 'Comment',
      'resolved': 'Resolution',
      'attachment': 'Attachment',
      'created': 'Creation',
      'priority_change': 'Priority Update',
      'cancelled': 'Cancellation'
    };
    return categories[type] || 'Activity';
  }

  function getActivityPriority(type) {
    const priorities = {
      'status_change': 'High',
      'assignment': 'Medium',
      'comment': 'Low',
      'resolved': 'High',
      'attachment': 'Low',
      'created': 'High',
      'priority_change': 'Medium',
      'cancelled': 'High'
    };
    return priorities[type] || 'Medium';
  }

  function getActivityTitle(activity) {
    switch (activity.type) {
      case 'status_change':
        return 'Status Update';
      case 'assignment':
        return `Assigned to ${activity.assigned_to || activity.assigned_to_name || activity.engineer_name || 'Unknown'}`;
      case 'comment':
        return 'New comment added';
      case 'resolved':
        return 'Ticket resolved';
      case 'attachment':
        return `File attached: ${activity.filename || 'Unknown file'}`;
      case 'created':
        return 'New ticket created';
      case 'priority_change':
        return 'Priority Update';
      case 'cancelled':
        return 'Ticket cancelled';
      default:
        return 'Activity update';
    }
  }

  function getActivityDescription(activity) {
    if (activity.type === 'comment' && activity.comment_text) {
      return activity.comment_text;
    }
    if (activity.type === 'attachment') {
      return `File: ${activity.filename} (${activity.file_size ? `${(activity.file_size / 1024).toFixed(1)} KB` : 'Unknown size'})`;
    }
    if (activity.type === 'resolved' && activity.resolution_time) {
      return `Resolved in ${Math.round(activity.resolution_time)} minutes`;
    }
    return activity.description || 'No additional details';
  }

  function getActivityIcon(type) {
    const icons = {
      'status_change': AlertCircle,
      'assignment': Users,
      'comment': MessageSquare,
      'resolved': CheckCircle,
      'attachment': FileText,
      'created': Zap,
      'priority_change': TrendingUp,
      'cancelled': AlertCircle
    };
    return icons[type] || Activity;
  }

  function getActivityColor(type) {
    const colors = {
      'status_change': 'text-blue-600',
      'assignment': 'text-purple-600',
      'comment': 'text-gray-600',
      'resolved': 'text-green-600',
      'attachment': 'text-violet-600',
      'created': 'text-emerald-600',
      'priority_change': 'text-orange-600',
      'cancelled': 'text-red-600'
    };
    return colors[type] || 'text-gray-600';
  }

  function getActivityMetadata(activity) {
    const metadata = {};
    if (activity.old_status && activity.new_status) {
      metadata.statusChange = { from: activity.old_status, to: activity.new_status };
    }
    if (activity.old_priority && activity.new_priority) {
      metadata.priorityChange = { from: activity.old_priority, to: activity.new_priority };
    }
    if (activity.assigned_to) {
      metadata.assignedTo = activity.assigned_to;
    }
    if (activity.resolution_time) {
      metadata.resolutionTime = Math.round(activity.resolution_time);
    }
    return metadata;
  }

  function getTicketIcon(status) {
    const icons = {
      'Open': AlertCircle,
      'In Progress': Clock,
      'Resolved': CheckCircle,
      'Hold': Clock,
      'Cancelled': AlertCircle
    };
    return icons[status] || FileText;
  }

  function getTicketColor(status) {
    const colors = {
      'Open': 'text-orange-600',
      'In Progress': 'text-blue-600',
      'Resolved': 'text-green-600',
      'Hold': 'text-yellow-600',
      'Cancelled': 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    let safeTimestamp = timestamp;
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
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
  }

  function formatAbsoluteTime(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    let safeTimestamp = timestamp;
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      safeTimestamp = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      safeTimestamp = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      safeTimestamp = new Date(timestamp);
    }

    if (isNaN(safeTimestamp.getTime())) return 'Invalid date';

    return `${safeTimestamp.getDate().toString().padStart(2, '0')}-${safeTimestamp.toLocaleDateString('en-US', { month: 'short' })}-${safeTimestamp.getFullYear()}`;
  }

  function getPriorityColor(priority) {
    const colors = {
      'Critical': 'bg-red-100 text-red-800 border-red-200',
      'High': 'bg-orange-100 text-orange-800 border-orange-200',
      'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Low': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function getStatusColor(status) {
    const colors = {
      'Open': 'bg-orange-100 text-orange-800 border-orange-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Resolved': 'bg-green-100 text-green-800 border-green-200',
      'Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  function toggleExpanded(id) {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  }

  function handleMarkAsRead(update) {
    if (onMarkAsRead) {
      onMarkAsRead(update);
    }
  }

  function handleMarkAllAsRead() {
    if (onMarkAllAsRead && displayUpdates.length > 0) {
      // Use batch mark all function if available
      onMarkAllAsRead(displayUpdates);
    } else if (onMarkAsRead && displayUpdates.length > 0) {
      // Fallback to individual updates if batch function not available
      displayUpdates.forEach(update => {
        if (!update.isRead) {
          onMarkAsRead(update);
        }
      });
    }
  }

  function handleMarkAsUnread(update) {
    if (onMarkAsUnread) {
      onMarkAsUnread(update);
    }
  }

  function handleNavigateToTicket(ticketId) {
    if (onNavigateTo && ticketId) {
      onNavigateTo(`/tickets/${ticketId}`);
    }
  }

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-white';
  const cardClass = darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`rounded-lg border ${cardClass} shadow-sm overflow-hidden`} style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Updates
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <span className="font-medium">{displayUpdates.length}</span>
                <span>total</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-blue-600">{displayUpdates.filter(u => !u.isRead).length}</span>
                <span>unread</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mark All as Read Button */}
            {displayUpdates.length > 0 && (
              <TooltipBubble title="Mark all updates as read">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border-0"
                  style={{ outline: 'none', border: 'none' }}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              </TooltipBubble>
            )}

            {/* Filter Dropdown */}
            <CustomDropdown
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: "unread", label: "All Unread" },
                { value: "tickets", label: "Tickets" },
                { value: "activities", label: "Activities" }
              ]}
              className="min-w-[140px]"
              size="sm"
            />

            {/* Sort Dropdown */}
            <CustomDropdown
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "recent", label: "Most Recent" },
                { value: "priority", label: "Priority" }
              ]}
              className="min-w-[120px]"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Updates List */}
      <div className="max-h-[32rem] overflow-y-auto p-1 space-y-1">
        <AnimatePresence>
          {displayUpdates.length > 0 ? (
            displayUpdates.map((update, index) => {
              const IconComponent = update.icon;
              const isExpanded = expandedItems.has(update.id);
              
              return (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`rounded-lg border transition-all duration-200 ${
                    !update.isRead 
                      ? 'border-gray-200 bg-gradient-to-r from-gray-50/80 to-white shadow-sm' 
                      : 'border-gray-200 bg-white'
                  } hover:shadow-md hover:border-gray-300`}
                >
                  <div className="relative px-4 py-3.5 group">
                    <div className="flex gap-3 items-start">
                      {/* Left Column - Icon */}
                      <div className="flex flex-col items-center flex-shrink-0 relative">
                        <div className={`p-2 rounded-lg ${update.color.replace('text-', 'bg-').replace('-600', '-100')} shadow-sm`}>
                          <IconComponent className={`w-4 h-4 ${update.color}`} />
                        </div>
                      </div>

                      {/* Main Content Area */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {update.title}
                            </h3>
                            {update.ticketDisplayId && (
                              <button
                                onClick={() => handleNavigateToTicket(update.ticketId)}
                                className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded transition-colors cursor-pointer"
                              >
                                #{update.ticketDisplayId}
                              </button>
                            )}
                          </div>
                          
                          {/* Status and Priority badges */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-100 ${getPriorityColor(update.priority).split(' ')[1]}`}>
                              {update.priority}
                            </span>
                            {update.status && (
                              <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-100 ${getStatusColor(update.status).split(' ')[1]}`}>
                                {update.status}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-700 text-xs leading-relaxed line-clamp-3">
                          {update.description}
                        </p>

                        {/* Metadata Row - With full width ticket title */}
                        <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{update.user}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(update.timestamp)}</span>
                          </div>
                          {update.ticketTitle && (
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <FileText className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate font-medium" title={update.ticketTitle}>
                                {update.ticketTitle}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status Changes */}
                        {update.metadata?.statusChange && (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                            <span className="font-medium text-gray-700">Status:</span>
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(update.metadata.statusChange.from)}`}>
                                {update.metadata.statusChange.from}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(update.metadata.statusChange.to)}`}>
                                {update.metadata.statusChange.to}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Priority Changes */}
                        {update.metadata?.priorityChange && (
                          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                            <span className="font-medium text-gray-700">Priority:</span>
                            <div className="flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(update.metadata.priorityChange.from)}`}>
                                {update.metadata.priorityChange.from}
                              </span>
                              <span className="text-gray-500">→</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(update.metadata.priorityChange.to)}`}>
                                {update.metadata.priorityChange.to}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Resolution Time */}
                        {update.metadata?.resolutionTime && (
                          <div className="p-2 bg-green-50 rounded text-xs">
                            <span className="font-medium text-green-800">
                              ⚡ Resolved in {update.metadata.resolutionTime} minutes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Overlay Action Buttons - Positioned absolutely on hover */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {update.ticketId && (
                        <TooltipBubble title="View Ticket">
                          <button
                            onClick={() => handleNavigateToTicket(update.ticketId)}
                            className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-all duration-200"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </TooltipBubble>
                      )}
                      
                      <TooltipBubble title="Mark as Read">
                        <button
                          onClick={() => handleMarkAsRead(update)}
                          className="p-1.5 hover:bg-green-100 rounded text-green-600 transition-all duration-200"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </TooltipBubble>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center shadow-lg">
                <Bell className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                No updates found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {filterType === 'unread' 
                  ? 'All updates have been read. Great job staying on top of things!'
                  : 'No updates match your current filter. Try adjusting your filter settings.'
                }
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Compact */}
      {displayUpdates.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {displayUpdates.length} of {processedUpdates.length} updates
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Unread</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                <span>Read</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesComponent;
