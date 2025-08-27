// src/components/ModernDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Sankey
} from 'recharts';
import { 
  TrendingUp, Users, Clock, AlertCircle, CheckCircle, 
  Activity, Filter, Settings, Sun, Moon, RefreshCw,
  FileText, Plus
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, getFirestore, where } from 'firebase/firestore';
import { dbClient } from '../config/firebase';
import { COLORS } from '../config/constants';

const ModernDashboard = ({ user, navigateTo, showFlashMessage }) => {
  // State management
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'tickets'
  
  // State for activities
  const [activities, setActivities] = useState([]);
  
  // State for company users (for site admin filtering)
  const [companyUsers, setCompanyUsers] = useState([]);
  
  // State for original fetched activities (for re-filtering)
  const [originalActivities, setOriginalActivities] = useState([]);
  
  // State for company filter (for Super Admin and Engineer)
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  

  
  // Theme classes
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-[#fafafa]';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const cardClass = darkMode 
    ? 'bg-gray-800/70 backdrop-blur-lg border-gray-700' 
    : 'bg-white/90 backdrop-blur-lg border-gray-300';

  // Fetch data from Firebase
  useEffect(() => {
    if (!user || !user.firebaseUser) return;
    
    // OPTIMIZED: Check cache first
    const cacheKey = `dashboard_data_${user.uid}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_time`);
    const now = Date.now();
    
    // Use cached data if it's less than 2 minutes old
    if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 120000) {
      try {
        const parsedData = JSON.parse(cachedData);
        setTickets(parsedData.tickets || []);
        setCompanyUsers(parsedData.companyUsers || []);
        setLoading(false);
      } catch (e) {
        console.warn('Failed to parse cached dashboard data:', e);
      }
    }
    
    // Fetch tickets with company filtering for site admin
    const ticketsRef = collection(dbClient, 'tickets');
    let ticketsQuery;
    
    // OPTIMIZED: Apply proper filtering to reduce reads
    if (user.role === 'site_admin' && user.client_name) {
      ticketsQuery = query(ticketsRef, where('client_name', '==', user.client_name), orderBy('created_at', 'desc'), limit(100));
    } else {
      ticketsQuery = query(ticketsRef, orderBy('created_at', 'desc'), limit(100));
    }
    
    const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const fetchedTickets = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || new Date(),
          updated_at: data.updated_at?.toDate?.() || new Date(),
        };
      });
      
      // Additional client-side filtering for site admin if needed
      let filteredTickets = fetchedTickets;
      if (user.role === 'site_admin' && user.client_name) {
        filteredTickets = fetchedTickets.filter(ticket => {
          const ticketClientName = ticket.client_name || ticket.companyName;
          return ticketClientName === user.client_name || ticketClientName === user.companyName;
        });
      }
      
      setTickets(filteredTickets);
      setLoading(false);
      
      // Cache the data
      const dataToCache = {
        tickets: filteredTickets,
        companyUsers: companyUsers,
        timestamp: now
      };
      localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
    });
    
    // Initialize empty agents array (will be populated from real data when available)
    setAgents([]);
    
    // OPTIMIZED: Only fetch company users if needed and not already cached
    let unsubscribeUsers = null;
    if (user.role === 'site_admin' && user.client_name) {
      const usersRef = collection(dbClient, 'users');
      const usersQuery = query(usersRef, where('client_name', '==', user.client_name), limit(100));
      
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        const fetchedUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCompanyUsers(fetchedUsers);
        
        // Update cache with new company users
        const existingCache = localStorage.getItem(cacheKey);
        if (existingCache) {
          try {
            const parsedCache = JSON.parse(existingCache);
            parsedCache.companyUsers = fetchedUsers;
            localStorage.setItem(cacheKey, JSON.stringify(parsedCache));
          } catch (e) {
            console.warn('Failed to update cache with company users:', e);
          }
        }
        
        console.log(`Fetched ${fetchedUsers.length} users for company: ${user.client_name}`);
      }, (error) => {
        console.error('Error fetching company users:', error);
      });
    }
    
    // OPTIMIZED: Reduce activities fetch and add caching
    const activitiesRef = collection(dbClient, 'activities');
    let activitiesQuery;
    
    // For site admin, we'll fetch more activities and filter client-side
    // This handles existing activities that don't have client_name field
    if (user.role === 'site_admin' && user.client_name) {
      activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'), limit(20));
    } else {
      activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'), limit(5));
    }
    
    console.log('Setting up activities listener...');
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      console.log('Activities snapshot received:', snapshot.docs.length, 'documents');
      const fetchedActivities = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Activity data:', data);
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(),
        };
      });
      
      // Client-side filtering for site admin
      let filteredActivities = fetchedActivities;
      
      if (user.role === 'site_admin' && user.client_name) {
        console.log('Site admin filtering activities. User client_name:', user.client_name);
        console.log('Total activities before filtering:', fetchedActivities.length);
        console.log('Company users available for filtering:', companyUsers.length);
        
        // Get list of company user emails for filtering
        const companyUserEmails = companyUsers.map(u => u.email).filter(Boolean);
        console.log('Company user emails:', companyUserEmails);
        
        filteredActivities = fetchedActivities.filter(activity => {
          // First, check if activity has direct client information
          const activityClientName = activity.client_name || activity.companyName;
          if (activityClientName) {
            const matches = activityClientName === user.client_name || activityClientName === user.companyName;
            console.log(`Activity ${activity.id} has client_name: ${activityClientName}, matches: ${matches}`);
            return matches;
          }
          
          // Check if the activity was performed by a company user
          if (activity.user_email && companyUserEmails.includes(activity.user_email)) {
            console.log(`Activity ${activity.id} performed by company user: ${activity.user_email}`);
            return true;
          }
          
          // If no direct client info, look up the associated ticket
          if (activity.ticket_id) {
            const associatedTicket = tickets.find(ticket => ticket.id === activity.ticket_id);
            if (associatedTicket) {
              const ticketClientName = associatedTicket.client_name || associatedTicket.companyName;
              const matches = ticketClientName === user.client_name || ticketClientName === user.companyName;
              console.log(`Activity ${activity.id} linked to ticket ${activity.ticket_id}, ticket client_name: ${ticketClientName}, matches: ${matches}`);
              return matches;
            }
          }
          
          // If company users are not loaded yet, be more permissive for existing activities
          // This prevents activities from disappearing during initial load
          if (companyUsers.length === 0) {
            console.log(`Activity ${activity.id} - company users not loaded yet, allowing temporarily`);
            return true;
          }
          
          // If we can't determine the company, exclude it for security
          console.log('Activity without client info, excluding for security:', activity);
          return false;
        });
        
        console.log('Activities after filtering:', filteredActivities.length);
        
        // Limit to 3 most recent after filtering
        filteredActivities = filteredActivities.slice(0, 3);
        console.log('Final activities for site admin:', filteredActivities.length);
      } else {
        // For non-site admin users, just use the fetched activities
        filteredActivities = fetchedActivities;
      }
      
      console.log('Setting activities state with:', filteredActivities.length, 'activities');
      setActivities(filteredActivities);
      
      // Store original activities for re-filtering
      if (user.role === 'site_admin' && user.client_name) {
        setOriginalActivities(fetchedActivities);
      }
    }, (error) => {
      console.error('Error fetching activities:', error);
      console.error('Error details:', error.code, error.message);
    });
    
    return () => {
      unsubscribeTickets();
      unsubscribeActivities();
      if (unsubscribeUsers) {
        unsubscribeUsers();
      }
    };
  }, [user]);

  // Re-filter activities when company users are loaded (for site admin)
  useEffect(() => {
    if (user?.role === 'site_admin' && user?.client_name && companyUsers.length > 0 && originalActivities.length > 0) {
      console.log('Re-filtering activities with loaded company users');
      
      // Get list of company user emails for filtering
      const companyUserEmails = companyUsers.map(u => u.email).filter(Boolean);
      console.log('Re-filtering with company user emails:', companyUserEmails);
      
      // Re-filter the original activities with the loaded company users
      const reFilteredActivities = originalActivities.filter(activity => {
        // First, check if activity has direct client information
        const activityClientName = activity.client_name || activity.companyName;
        if (activityClientName) {
          const matches = activityClientName === user.client_name || activityClientName === user.companyName;
          return matches;
        }
        
        // Check if the activity was performed by a company user
        if (activity.user_email && companyUserEmails.includes(activity.user_email)) {
          return true;
        }
        
        // If no direct client info, look up the associated ticket
        if (activity.ticket_id) {
          const associatedTicket = tickets.find(ticket => ticket.id === activity.ticket_id);
          if (associatedTicket) {
            const ticketClientName = associatedTicket.client_name || associatedTicket.companyName;
            const matches = ticketClientName === user.client_name || ticketClientName === user.companyName;
            return matches;
          }
        }
        
        // If we can't determine the company, exclude it for security
        return false;
      });
      
      console.log('Activities after re-filtering:', reFilteredActivities.length);
      setActivities(reFilteredActivities.slice(0, 3));
    }
  }, [companyUsers, user, originalActivities, tickets]);

  // Fetch available companies for Super Admin and Engineer
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'engineer')) return;

    const usersRef = collection(dbClient, 'users');
    const unsubscribeCompanies = onSnapshot(usersRef, (snapshot) => {
      const companies = new Set();
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.client_name) {
          companies.add(userData.client_name);
        }
        if (userData.companyName) {
          companies.add(userData.companyName);
        }
      });
      
      const companiesList = Array.from(companies).sort();
      setAvailableCompanies(companiesList);
      
      // Set "All" as default if none selected
      if (!selectedCompany) {
        setSelectedCompany('All');
      }
    });

    return () => {
      unsubscribeCompanies();
    };
  }, [user, selectedCompany]);

  // Create mappings for ticket ID lookups
  const ticketMappings = useMemo(() => {
    const displayIdToDocIdMap = {};
    const docIdToDisplayIdMap = {};
    
    tickets.forEach(ticket => {
      if (ticket.display_id) {
        displayIdToDocIdMap[ticket.display_id] = ticket.id;
        docIdToDisplayIdMap[ticket.id] = ticket.display_id;
      }
    });
    
    return { displayIdToDocIdMap, docIdToDisplayIdMap };
  }, [tickets]);

  // Process data for visualizations
  const dashboardData = useMemo(() => {
    // Calculate ticket metrics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Use all tickets for dashboard counts (no time filtering)
    let filteredTickets = tickets;
    
    // Status counts
    const statusCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    
    // Priority counts
    const priorityCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate real-time metrics
    const totalActiveTickets = (statusCounts['Open'] || 0) + (statusCounts['In Progress'] || 0) + (statusCounts['Hold'] || 0);
    const openTickets = statusCounts['Open'] || 0;
    const inProgressTickets = statusCounts['In Progress'] || 0;
    
    // Calculate assigned tickets for current engineer or support
    const assignedToMe = (user?.role === 'engineer' || user?.role === 'support') ? 
      tickets.filter(ticket => 
        ticket.assigned_to_email === user.email && 
        ['Open', 'In Progress', 'Hold'].includes(ticket.status)
      ).length : 0;
    
    // Calculate average resolution time based on time_spent field (only for admin/super admin)
    let avgResolutionTime = 0;
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      const resolvedTickets = tickets.filter(ticket => 
        (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
        ticket.time_spent !== undefined && 
        ticket.time_spent !== null && 
        ticket.time_spent > 0
      );
      
      if (resolvedTickets.length > 0) {
        const totalResolutionTime = resolvedTickets.reduce((total, ticket) => {
          // time_spent is stored in minutes, so we can use it directly
          return total + (ticket.time_spent || 0);
        }, 0);
        
        avgResolutionTime = Math.round(totalResolutionTime / resolvedTickets.length);
      }
    }
    
    // Resolution time (empty for now - will be calculated from real data)
    const resolutionTimes = [];
    
    // Ticket volume trend (empty for now - will be calculated from real data)
    const volumeTrend = [];
    
    // Agent performance (empty for now - will be calculated from real data)
    const agentPerformance = [];
    
    // Recent tickets logic - get tickets from last 2 days that are unassigned/unresolved
    const recentTickets = tickets.filter(ticket => {
      const ticketDate = ticket.created_at;
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      
      return ticketDate >= twoDaysAgo && 
             (ticket.status === 'Open' || ticket.status === 'In Progress') &&
             (!ticket.assigned_to_email || ticket.assigned_to_email === '');
    }).slice(0, 10); // Limit to 10 most recent
    
    return {
      statusCounts,
      priorityCounts,
      resolutionTimes,
      volumeTrend,
      agentPerformance,
      recentTickets,
      totalTickets: filteredTickets.length,
      totalActiveTickets,
      openTickets,
      inProgressTickets,
      assignedToMe,
      avgResolutionTime
    };
  }, [tickets, agents, timeRange, user, selectedCompany]);

  // Filter activities by selected company for Super Admin and Engineer - DISABLED
  const filteredActivities = useMemo(() => {
    // Company filtering disabled - return all activities
    return activities;
  }, [activities]);

  // Status colors for charts
  const statusColors = {
    'Open': COLORS.blue,
    'In Progress': COLORS.yellow,
    'Hold': COLORS.purple,
    'Resolved': COLORS.green,
    'Closed': COLORS.gray,
  };

  // Priority colors
  const priorityColors = {
    'Low': COLORS.blue,
    'Medium': COLORS.yellow,
    'High': COLORS.orange,
    'Critical': COLORS.red,
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex justify-center items-center h-screen ${bgClass}`}>
        <RefreshCw className="animate-spin h-12 w-12 text-blue-500" />
        <span className={`ml-4 ${textClass}`}>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300`}>
      {/* Header */}
      <header className={`px-3 py-6`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-medium flex items-center" style={{ color: '#2c3e50', marginBottom: '0.125rem' }}>
              Service Desk Insights
              <TrendingUp className="ml-3 text-[#e85c34]" size={20} />
            </h1>
          </div>

          {/* Company Filter for Super Admin and Engineer - DISABLED */}
          {/* {(user?.role === 'super_admin' || user?.role === 'engineer') && availableCompanies.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Company:</label>
                             <select
                 value={selectedCompany}
                 onChange={(e) => setSelectedCompany(e.target.value)}
                 className={`px-3 py-1 rounded-md text-sm border ${
                   darkMode 
                     ? 'bg-gray-700 border-gray-600 text-white' 
                     : 'bg-white border-gray-300 text-gray-900'
                 } focus:outline-none focus:ring-2 focus:ring-blue-500`}
               >
                 <option value="All">All</option>
                 {availableCompanies.map(company => (
                   <option key={company} value={company}>
                     {company}
                   </option>
                 ))}
               </select>
            </div>
          )} */}
          
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div className="text-right">
              <p className="text-xs font-bold opacity-75">
                For detailed analytics, visit{' '}
                <button
                  onClick={() => navigateTo('/reports')}
                  className="text-blue-500 hover:text-blue-700 underline cursor-pointer transition-colors"
                >
                  Reports
                </button>{' '}
                page
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="px-3 pb-1">

        

        
        {/* Stats Overview */}
        <div className={`grid grid-cols-1 md:grid-cols-${(user?.role === 'engineer' || user?.role === 'support') ? '4' : user?.role === 'admin' || user?.role === 'super_admin' ? '4' : '3'} gap-3 mb-4`}>
                     {/* Total Active Tickets - All roles can see */}
           <div 
             onClick={() => navigateTo('/all-tickets')}
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-105`}
           >
            <div className="flex justify-between items-start">
              <div>
                <p className="opacity-75 font-semibold text-sm">Total Tickets</p>
                <p className="text-2xl font-bold mt-1">{dashboardData.totalActiveTickets}</p>
                <p className="text-blue-500 text-xs font-bold mt-1 flex items-center">
                  <Activity size={12} className="mr-1" /> Active tickets
                </p>
              </div>
              <div className="p-2 rounded-md bg-blue-500/20 text-blue-500">
                <Activity size={18} />
              </div>
            </div>
          </div>
          
                     {/* Open Tickets - All roles can see */}
           <div 
             onClick={() => navigateTo('/all-tickets?status=Open')}
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-105`}
           >
            <div className="flex justify-between items-start">
              <div>
                <p className="opacity-75 font-semibold text-sm">Open Tickets</p>
                <p className="text-2xl font-bold mt-1">{dashboardData.openTickets}</p>
                <p className="text-orange-500 text-xs font-bold mt-1 flex items-center">
                  <AlertCircle size={12} className="mr-1" /> Need attention
                </p>
              </div>
              <div className="p-2 rounded-md bg-orange-500/20 text-orange-500">
                <AlertCircle size={18} />
              </div>
            </div>
          </div>
          
                     {/* In Progress - All roles can see */}
           <div 
             onClick={() => navigateTo('/all-tickets?status=In Progress')}
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-105`}
           >
            <div className="flex justify-between items-start">
              <div>
                <p className="opacity-75 font-semibold text-sm">In Progress</p>
                <p className="text-2xl font-bold mt-1">{dashboardData.inProgressTickets}</p>
                <p className="text-yellow-500 text-xs font-bold mt-1 flex items-center">
                  <Clock size={12} className="mr-1" /> Being worked on
                </p>
              </div>
              <div className="p-2 rounded-md bg-yellow-500/20 text-yellow-500">
                <Clock size={18} />
              </div>
            </div>
          </div>
          
                     {/* Assigned to Me - Only Engineers and Support */}
           {(user?.role === 'engineer' || user?.role === 'support') && (
             <div 
               onClick={() => navigateTo('/assigned-to-me')}
               className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-105`}
             >
              <div className="flex justify-between items-start">
                <div>
                  <p className="opacity-75 font-semibold text-sm">Assigned to Me</p>
                  <p className="text-2xl font-bold mt-1">{dashboardData.assignedToMe}</p>
                  <p className="text-green-500 text-xs font-bold mt-1 flex items-center">
                    <Users size={12} className="mr-1" /> My tickets
                  </p>
                </div>
                <div className="p-2 rounded-md bg-green-500/20 text-green-500">
                  <Users size={18} />
                </div>
              </div>
            </div>
          )}
          
          {/* Avg Resolution - Only Admin/Super Admin - NOT CLICKABLE */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div 
              className={`${cardClass} rounded-lg p-3 border`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="opacity-75 font-semibold text-sm">Avg. Resolution</p>
                  <p className="text-2xl font-bold mt-1">{dashboardData.avgResolutionTime}m</p>
                  <p className="text-purple-500 text-xs font-bold mt-1 flex items-center">
                    <TrendingUp size={12} className="mr-1" /> Minutes avg
                  </p>
                </div>
                <div className="p-2 rounded-md bg-purple-500/20 text-purple-500">
                  <TrendingUp size={18} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity & Tickets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Activity & Tickets Tabs */}
          <div 
            className={`${cardClass} rounded-lg p-3 border lg:col-span-2`}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">Updates</h2>
              <div className="flex space-x-1">
                <button 
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${activeTab === 'activity' ? 'bg-[#e85c34] text-white' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Activity
                </button>
                <button 
                  onClick={() => setActiveTab('tickets')}
                  className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${activeTab === 'tickets' ? 'bg-[#e85c34] text-white' : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  Recent Tickets ({dashboardData.recentTickets.length})
                </button>
              </div>
            </div>
            
            {activeTab === 'activity' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {console.log('Activities array length:', filteredActivities.length)}
                {filteredActivities.length > 0 ? (
                  filteredActivities.map(activity => {
                    // Get activity icon and color based on type
                    const getActivityIcon = (type) => {
                      switch (type) {
                        case 'status_change':
                          return <AlertCircle size={12} />;
                        case 'assignment':
                          return <Users size={12} />;
                        case 'comment':
                          return <Activity size={12} />;
                        case 'resolved':
                          return <CheckCircle size={12} />;
                        case 'attachment':
                          return <FileText size={12} />;
                        case 'created':
                          return <Plus size={12} />;
                        case 'priority_change':
                          return <TrendingUp size={12} />;
                        case 'cancelled':
                          return <AlertCircle size={12} />;
                        default:
                          return <Activity size={12} />;
                      }
                    };

                    const getActivityColor = (type) => {
                      switch (type) {
                        case 'status_change':
                          return 'bg-yellow-500/20 text-yellow-500';
                        case 'assignment':
                          return 'bg-blue-500/20 text-blue-500';
                        case 'comment':
                          return 'bg-green-500/20 text-green-500';
                        case 'resolved':
                          return 'bg-green-500/20 text-green-500';
                        case 'attachment':
                          return 'bg-purple-500/20 text-purple-500';
                        case 'created':
                          return 'bg-blue-500/20 text-blue-500';
                        case 'priority_change':
                          return 'bg-orange-500/20 text-orange-500';
                        case 'cancelled':
                          return 'bg-red-500/20 text-red-500';
                        default:
                          return 'bg-gray-500/20 text-gray-500';
                      }
                    };

                    const formatTimeAgo = (timestamp) => {
                      const now = new Date();
                      const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
                      
                      if (diffInMinutes < 1) return 'Just now';
                      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
                      return `${Math.floor(diffInMinutes / 1440)}d ago`;
                    };

                    return (
                      <div key={activity.id} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between">
                          <div className="flex items-start">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* New format: User full name • TicketID : Subjectline */}
                              <div className="mb-1">
                                <div className="flex items-center">
                                  <span className="font-semibold text-sm text-[#DC5802]">
                                    {activity.user_name || activity.user || 'System'}
                                  </span>
                                  <span className="text-gray-600 mx-1">•</span>
                                  <button
                                    onClick={() => {
                                      // Get the ticket ID for navigation
                                      let ticketIdForNavigation = activity.ticket_id || activity.ticketId;
                                      
                                      // If it's a display ID (starts with TT), look up the actual document ID
                                      if (ticketIdForNavigation && ticketIdForNavigation.startsWith('TT')) {
                                        const actualDocId = ticketMappings.displayIdToDocIdMap[ticketIdForNavigation];
                                        if (actualDocId) {
                                          ticketIdForNavigation = actualDocId;
                                        }
                                      }
                                      
                                      navigateTo(`/tickets/${ticketIdForNavigation}`);
                                    }}
                                    className="font-bold text-sm text-[#1005e6] hover:text-[#1005e6]/80 underline cursor-pointer transition-colors"
                                  >
                                    {activity.ticket_display_id || 
                                     (activity.ticket_id && activity.ticket_id.startsWith('TT') ? activity.ticket_id : null) || 
                                     (activity.ticketId && activity.ticketId.startsWith('TT') ? activity.ticketId : null) ||
                                     (activity.ticket_id && ticketMappings.docIdToDisplayIdMap[activity.ticket_id]) ||
                                     (activity.ticketId && ticketMappings.docIdToDisplayIdMap[activity.ticketId]) ||
                                     'Unknown Ticket'}
                                  </button>
                                  <span className="text-gray-600 mx-1">•</span>
                                  <span className="font-semibold text-sm text-[#DC5802]">
                                    {activity.ticket_title || 'No title'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action description */}
                              <div className="space-y-1">
                                <p className="text-xs opacity-75">
                                  {(() => {
                                    let cleanDescription = activity.description || activity.details || '';
                                    
                                    // Remove redundant ticket ID information
                                    cleanDescription = cleanDescription.replace(/ to ticket TT\d+/gi, '');
                                    
                                    // Remove redundant filename information for attachments
                                    if (activity.type === 'attachment' && activity.filename) {
                                      cleanDescription = cleanDescription.replace(new RegExp(`: ${activity.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
                                    }
                                    
                                    return cleanDescription;
                                  })()}
                                </p>
                                
                                {/* Show comment text for comments */}
                                {activity.type === 'comment' && activity.comment_text && (
                                  <div>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 italic bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                      "{activity.comment_text}"
                                    </span>
                                    {activity.comment_length > 100 && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        (truncated from {activity.comment_length} characters)
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show status change details */}
                                {activity.type === 'status_change' && activity.old_status && activity.new_status && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600">
                                      {activity.old_status}
                                    </span>
                                    <span className="text-gray-500">→</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-600 text-blue-800 dark:text-blue-200">
                                      {activity.new_status}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show priority change details */}
                                {activity.type === 'priority_change' && activity.old_priority && activity.new_priority && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600">
                                      {activity.old_priority}
                                    </span>
                                    <span className="text-gray-500">→</span>
                                    <span className="px-2 py-0.5 rounded bg-orange-200 dark:bg-orange-600 text-orange-800 dark:text-orange-200">
                                      {activity.new_priority}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show assignment details */}
                                {activity.type === 'assignment' && activity.assigned_to_email && (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    Assigned to: {activity.assigned_to_email}
                                  </p>
                                )}
                                
                                {/* Show attachment details */}
                                {activity.type === 'attachment' && activity.filename && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <FileText className="w-3 h-3 text-purple-500" />
                                    <span className="text-purple-600 dark:text-purple-400">
                                      {activity.filename}
                                    </span>
                                    {activity.file_size && (
                                      <span className="text-gray-500">
                                        ({(activity.file_size / 1024).toFixed(1)} KB)
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show resolution details */}
                                {activity.type === 'resolved' && activity.resolution_time && (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    Resolution time: {Math.round(activity.resolution_time)} minutes
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            <p className="text-xs font-semibold opacity-75">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                            <p className="text-xs font-semibold opacity-50 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 opacity-50">
                    <p className="text-sm">
                      {user?.role === 'site_admin' && companyUsers.length === 0 
                        ? 'Loading company activities...' 
                        : 'No activities found'
                      }
                    </p>
                    {user?.role === 'site_admin' && (
                      <p className="text-xs mt-1">Company users loaded: {companyUsers.length}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'tickets' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {dashboardData.recentTickets.length > 0 ? (
                  dashboardData.recentTickets.map(ticket => (
                    <div key={ticket.id} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          {/* Full Name • Ticket ID • Subject Line */}
                          <div className="flex items-center mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {(() => {
                                // Construct full name from firstName and lastName
                                if (ticket.reporter_firstName || ticket.reporter_lastName) {
                                  return `${ticket.reporter_firstName || ''} ${ticket.reporter_lastName || ''}`.trim();
                                }
                                // Fallback to existing fields if firstName/lastName not available
                                return ticket.reporter_name || ticket.reporter || ticket.user_name || 'Unknown User';
                              })()}
                            </span>
                            <span className="text-gray-600 mx-1">•</span>
                            <button
                              onClick={() => navigateTo(`/tickets/${ticket.id}`)}
                              className="font-bold text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors"
                            >
                              {ticket.display_id || ticket.ticket_id || ticket.id}
                            </button>
                            <span className="text-gray-600 mx-1">•</span>
                            <span className="font-semibold text-sm text-gray-900">
                              {ticket.short_description || ticket.subject || ticket.title || 'No description'}
                            </span>
                          </div>
                          
                          {/* Status and Priority Icons */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              ticket.status === 'Open' ? 'bg-orange-100 text-orange-800' :
                              ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                              ticket.status === 'Hold' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {ticket.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                              ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              ticket.priority === 'Critical' ? 'bg-red-200 text-red-900' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {ticket.priority}
                            </span>
                          </div>
                          
                          {/* Created DateTime */}
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Created: {ticket.created_at.toLocaleDateString()} at {ticket.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 opacity-50">
                    <p className="text-sm">No recent unassigned tickets found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution & Team Performance - Hidden */}
        {/* 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
          Status Distribution and Team Performance sections removed
        </div>
        */}

        {/* Charts Grid - Moved to Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Ticket Volume Trend */}
          <div 
            className={`${cardClass} rounded-lg p-3 border`}
          >
            <h2 className="text-lg font-bold mb-3">Ticket Volume Trend</h2>
            <div className="h-64">
              {dashboardData.volumeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData.volumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                  <XAxis dataKey="date" stroke={darkMode ? '#aaa' : '#666'} />
                  <YAxis stroke={darkMode ? '#aaa' : '#666'} />
                  <Tooltip 
                    contentStyle={darkMode ? { backgroundColor: '#1f2937', borderColor: '#374151' } : {}}
                    labelStyle={darkMode ? { color: '#fff' } : {}}
                  />
                  <Area type="monotone" dataKey="volume" stroke={COLORS.blue} fill={COLORS.blue + '40'} />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm opacity-50">No volume data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Resolution Time */}
          <div 
            className={`${cardClass} rounded-lg p-3 border`}
          >
            <h2 className="text-lg font-bold mb-3">Avg. Resolution Time</h2>
            <div className="h-64">
              {dashboardData.resolutionTimes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.resolutionTimes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                  <XAxis dataKey="day" stroke={darkMode ? '#aaa' : '#666'} />
                  <YAxis stroke={darkMode ? '#aaa' : '#666'} />
                  <Tooltip 
                    contentStyle={darkMode ? { backgroundColor: '#1f2937', borderColor: '#374151' } : {}}
                    labelStyle={darkMode ? { color: '#fff' } : {}}
                  />
                  <Bar dataKey="time" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm opacity-50">No resolution data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModernDashboard;