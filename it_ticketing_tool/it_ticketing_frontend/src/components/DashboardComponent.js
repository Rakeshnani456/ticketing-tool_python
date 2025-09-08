// src/components/ModernDashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  ArcElement,
} from 'chart.js';
import { Bar as ChartBar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, Users, Clock, AlertCircle, CheckCircle, 
  Activity, Filter, Settings, Sun, Moon, RefreshCw,
  FileText, Plus
} from 'lucide-react';
import { supabase } from '../config/supabase';
import { API_BASE_URL, COLORS } from '../config/constants';
import { getAccessToken } from '../utils/utils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  ArcElement
);

// Disable Chart.js animations globally for this component
ChartJS.defaults.animation = false;
ChartJS.defaults.responsiveAnimationDuration = 0;

const ModernDashboard = ({ user, navigateTo, showFlashMessage }) => {
  // State management
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'tickets'
  
  // State for time period filter
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7');
  
  // Clear filters function
  const clearFilters = () => {
    setSelectedTimePeriod('7');
  };
  

  
  // Theme classes
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const cardClass = darkMode 
    ? 'bg-gray-800/70 backdrop-blur-lg border-gray-700' 
    : 'bg-white/90 backdrop-blur-lg border-gray-300';

  // Fetch data from Supabase API
  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get the current session token
        const idToken = await getAccessToken(user);

        // Fetch dashboard stats
        const statsResponse = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!statsResponse.ok) {
          throw new Error(`Stats API error: ${statsResponse.status}`);
        }

        const stats = await statsResponse.json();
        
        // Fetch recent tickets
        const ticketsResponse = await fetch(`${API_BASE_URL}/api/dashboard/recent-tickets?limit=100`, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!ticketsResponse.ok) {
          throw new Error(`Tickets API error: ${ticketsResponse.status}`);
        }

        const fetchedTickets = await ticketsResponse.json();
        
        // Convert date strings to Date objects
        const processedTickets = fetchedTickets.map(ticket => ({
          ...ticket,
          created_at: ticket.created_at ? new Date(ticket.created_at) : new Date(),
          updated_at: ticket.updated_at ? new Date(ticket.updated_at) : new Date(),
        }));

        setTickets(processedTickets);
        setLoading(false);
        
        console.log('Dashboard data loaded successfully:', {
          stats,
          ticketsCount: processedTickets.length
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
        // Set empty data to prevent infinite loading
        setTickets([]);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Initialize default values
  useEffect(() => {
    if (user) {
      // Set default time period
      if (selectedTimePeriod === '30') {
        setSelectedTimePeriod('7');
      }
    }
  }, [user, selectedTimePeriod]);

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
    
    // Calculate assigned tickets for current support
    const assignedToMe = (user?.role === 'support') ? 
      tickets.filter(ticket => 
        ticket.assigned_to_email === user.email && 
        ['Open', 'In Progress', 'Hold'].includes(ticket.status)
      ).length : 0;
    
    // Simplified Resolution Time Analytics
    let avgResolutionTime = 0;
    let resolutionTimeData = [];
    let resolutionTimeDistribution = [];
    
    // Get resolved tickets
    const resolvedTickets = tickets.filter(ticket => 
      (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
      ticket.created_at && 
      ticket.updated_at
    );
    
    if (resolvedTickets.length > 0) {
      // Calculate resolution times
      const ticketResolutionData = resolvedTickets.map(ticket => {
        const createdDate = new Date(ticket.created_at);
        const resolvedDate = new Date(ticket.updated_at);
        
        if (isNaN(createdDate.getTime()) || isNaN(resolvedDate.getTime())) {
          return null;
        }
        
        const resolutionTimeMs = resolvedDate - createdDate;
        const resolutionTimeMinutes = Math.round(resolutionTimeMs / (1000 * 60));
        
        return {
          ...ticket,
          resolutionTimeMinutes: resolutionTimeMinutes,
          resolutionTimeHours: Math.round(resolutionTimeMinutes / 60 * 10) / 10,
          resolutionTimeDays: Math.round(resolutionTimeMinutes / (24 * 60) * 10) / 10,
        };
      }).filter(ticket => ticket && ticket.resolutionTimeMinutes > 0);
      
      // Calculate average resolution time
      if (ticketResolutionData.length > 0) {
        const totalResolutionTime = ticketResolutionData.reduce((total, ticket) => {
          return total + ticket.resolutionTimeMinutes;
        }, 0);
        avgResolutionTime = Math.round(totalResolutionTime / ticketResolutionData.length);
      }
      
      // Resolution Time Distribution (buckets)
      const timeBuckets = {
        '0-1h': 0,
        '1-4h': 0,
        '4-8h': 0,
        '8-24h': 0,
        '1-3d': 0,
        '3-7d': 0,
        '7d+': 0
      };
      
      ticketResolutionData.forEach(ticket => {
        const hours = ticket.resolutionTimeMinutes / 60;
        if (hours <= 1) timeBuckets['0-1h']++;
        else if (hours <= 4) timeBuckets['1-4h']++;
        else if (hours <= 8) timeBuckets['4-8h']++;
        else if (hours <= 24) timeBuckets['8-24h']++;
        else if (hours <= 72) timeBuckets['1-3d']++;
        else if (hours <= 168) timeBuckets['3-7d']++;
        else timeBuckets['7d+']++;
      });
      
      resolutionTimeDistribution = Object.entries(timeBuckets).map(([range, count]) => ({
        range,
        count,
        percentage: Math.round((count / ticketResolutionData.length) * 100)
      }));
      
      // Overall resolution time data for the chart
      resolutionTimeData = [
        { metric: 'Average', time: avgResolutionTime, unit: 'minutes' },
        { metric: 'Fastest', time: Math.min(...ticketResolutionData.map(t => t.resolutionTimeMinutes)), unit: 'minutes' },
        { metric: 'Slowest', time: Math.max(...ticketResolutionData.map(t => t.resolutionTimeMinutes)), unit: 'minutes' }
      ];
    }
    
    // Simplified ticket volume trend
    const volumeTrend = (() => {
      let days = 7; // Default to 7 days
      
      // Calculate time period based on selection
      if (selectedTimePeriod === '1') {
        days = 1;
      } else if (selectedTimePeriod === '7') {
        days = 7;
      } else if (selectedTimePeriod === '30') {
        days = 30;
      }
      
      const trendData = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        // Count tickets created on this date
        const ticketsForDate = filteredTickets.filter(ticket => {
          const ticketDate = new Date(ticket.created_at);
          const ticketDateStr = ticketDate.toISOString().split('T')[0];
          return ticketDateStr === dateStr;
        });
        
        trendData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          volume: ticketsForDate.length,
          fullDate: dateStr,
          timestamp: date.getTime()
        });
      }
      
      return trendData;
    })();
    
    // Recent tickets - get recent unassigned tickets
    const recentTickets = tickets
      .filter(ticket => 
        (ticket.status === 'Open' || ticket.status === 'In Progress') &&
        (!ticket.assigned_to_email || ticket.assigned_to_email === '')
      )
      .slice(0, 10); // Limit to 10 most recent
    
    return {
      statusCounts,
      priorityCounts,
      resolutionTimes: resolutionTimeData,
      resolutionTimeDistribution,
      volumeTrend,
      recentTickets,
      totalTickets: filteredTickets.length,
      totalActiveTickets,
      openTickets,
      inProgressTickets,
      assignedToMe,
      avgResolutionTime,
      totalResolvedTickets: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
    };
  }, [tickets, user, selectedTimePeriod]);

  // Activities are not available in Supabase version - using empty array
  const filteredActivities = [];

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
      <header className={`px-3 py-6 ${bgClass}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-medium flex items-center" style={{ color: '#6b7280', marginBottom: '0.125rem' }}>
              Service Insights
              <TrendingUp className="ml-3 text-[#e85c34]" size={20} />
            </h1>
          </div>

          {/* Company Filter for Super Admin and Support - DISABLED */}
          {/* {(user?.role === 'super_admin' || user?.role === 'support') && availableCompanies.length > 0 && (
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
          

        </div>
      </header>

      <main className={`px-3 pb-1 ${bgClass}`}>

        

        
        {/* Stats Overview */}
        <div className={`grid grid-cols-1 md:grid-cols-${(user?.role === 'support') ? '4' : user?.role === 'admin' || user?.role === 'super_admin' ? '4' : '3'} gap-3 mb-4`}>
                     {/* Total Active Tickets - All roles can see */}
           <div 
             onClick={() => navigateTo('/all-tickets')}
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-100 transition duration-100`}
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
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-100 transition duration-100`}
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
             className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-100 transition duration-100`}
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
          
                     {/* Assigned to Me - Only Support */}
           {(user?.role === 'support') && (
             <div 
               onClick={() => navigateTo('/assigned-to-me')}
               className={`${cardClass} rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-100 transition duration-100`}
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
              className={`${cardClass} rounded-lg p-3 border hover:scale-100 transition duration-100`}
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
            className={`${cardClass} rounded-lg p-2 border lg:col-span-2`}
              style={{ fontFamily: '"Source Sans 3", sans-serif' }}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold">Recent Tickets</h2>
              <div className="text-sm text-gray-500">
                {dashboardData.recentTickets.length} unassigned tickets
              </div>
            </div>
            
            <div className="space-y-0 max-h-72 overflow-y-auto">
              {dashboardData.recentTickets.length > 0 ? (
                  dashboardData.recentTickets.map((ticket, index) => {
                    const itemBg = darkMode 
                      ? (index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-700/50') 
                      : (index % 2 === 0 ? 'bg-white' : 'bg-slate-25/40');
                    
                    const itemBorder = darkMode
                      ? (index % 2 === 0 ? 'border-gray-300/50' : 'border-gray-300/50')
                      : (index % 2 === 0 ? 'border-gray-300/50' : 'border-gray-300/50');
                    
                    const itemShadow = index % 2 === 0 
                      ? 'shadow-xs' 
                      : 'shadow-none';

                    return (
                      <div key={ticket.id} className={`py-2 px-3 border-b-2 ${itemBorder} last:border-b-0 dark:border-gray-300/50 ${itemBg} ${itemShadow} transition-all duration-200`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {/* Full Name • Ticket ID • Subject Line */}
                            <div className="flex items-center mb-0.5 text-sm">
                              <span className="font-medium text-black">
                                {(() => {
                                  // Construct full name from firstName and lastName
                                  if (ticket.reporter_firstName || ticket.reporter_lastName) {
                                    return `${ticket.reporter_firstName || ''} ${ticket.reporter_lastName || ''}`.trim();
                                  }
                                  // Fallback to existing fields if firstName/lastName not available
                                  return ticket.reporter_name || ticket.reporter || ticket.user_name || 'Unknown User';
                                })()}
                              </span>
                              <span className="text-black mx-1">•</span>
                              <button
                                onClick={() => navigateTo(`/tickets/${ticket.id}`)}
                                className="font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                              >
                                {ticket.display_id || ticket.ticket_id || ticket.id}
                              </button>
                              <span className="text-black mx-1">•</span>
                              <span className="font-medium text-black">
                                {ticket.short_description || ticket.subject || ticket.title || 'No description'}
                              </span>
                            </div>
                            
                            {/* Status and Priority Icons */}
                            <div className="flex items-center gap-1 mb-0.5 text-xs">
                              <span className={`px-1.5 py-0.5 rounded ${
                                ticket.status === 'Open' ? 'bg-orange-100 text-black' :
                                ticket.status === 'In Progress' ? 'bg-blue-100 text-black' :
                                ticket.status === 'Resolved' ? 'bg-green-100 text-black' :
                                ticket.status === 'Hold' ? 'bg-yellow-100 text-black' :
                                'bg-gray-100 text-black'
                              }`}>
                                {ticket.status}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded ${
                                ticket.priority === 'High' ? 'bg-red-100 text-black' :
                                ticket.priority === 'Medium' ? 'bg-yellow-100 text-black' :
                                ticket.priority === 'Critical' ? 'bg-red-200 text-black' :
                                'bg-blue-100 text-black'
                              }`}>
                                {ticket.priority}
                              </span>
                            </div>
                            
                            {/* Created DateTime */}
                            <p className="text-xs text-black">
                              Created: {(() => {
                                // Ensure created_at is a proper Date object
                                let safeCreatedAt = ticket.created_at;
                                
                                if (!(safeCreatedAt instanceof Date)) {
                                  if (safeCreatedAt && typeof safeCreatedAt === 'object' && safeCreatedAt.toDate) {
                                    // Firebase Timestamp
                                    safeCreatedAt = safeCreatedAt.toDate();
                                  } else if (safeCreatedAt && typeof safeCreatedAt === 'string') {
                                    // String date
                                    safeCreatedAt = new Date(safeCreatedAt);
                                  } else if (safeCreatedAt && typeof safeCreatedAt === 'number') {
                                    // Unix timestamp
                                    safeCreatedAt = new Date(safeCreatedAt);
                                  } else {
                                    return 'Invalid date';
                                  }
                                }
                                
                                // Validate the date
                                if (isNaN(safeCreatedAt.getTime())) {
                                  return 'Invalid date';
                                }
                                
                                return `${safeCreatedAt.toLocaleDateString()} at ${safeCreatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 opacity-50">
                    <p className="text-sm text-black">No recent unassigned tickets found</p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Status Distribution & Team Performance - Hidden */}
        {/* 
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
          Status Distribution and Team Performance sections removed
        </div>
        */}

        {/* Charts Grid - Moved to Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Ticket Volume Trend */}
          <div 
            className={`${cardClass} rounded-lg border`}
          >
            <div className="mb-3 px-3 pt-3">
              <h2 className="text-lg font-bold mb-3">Ticket Volume Trend</h2>
              {/* Time Period Filter */}
              <div className="flex items-center gap-3 mb-3">
                <label className="text-xs font-medium text-gray-600">Period:</label>
                <select
                  value={selectedTimePeriod}
                  onChange={(e) => setSelectedTimePeriod(e.target.value)}
                  className={`px-2 py-1 rounded text-xs border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-black'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">1 Month</option>
                </select>
                {/* Clear Filters Button */}
                {selectedTimePeriod !== '7' && (
                  <button
                    onClick={clearFilters}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="flex justify-between items-center mb-2 px-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-black">
                  {dashboardData.volumeTrend.reduce((sum, day) => sum + day.volume, 0)}
                </span> total tickets in selected period
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-black">
                  {Math.round(dashboardData.volumeTrend.reduce((sum, day) => sum + day.volume, 0) / Math.max(dashboardData.volumeTrend.length, 1) * 10) / 10}
                </span> avg per day
              </div>
            </div>
            <div className="w-full">
              {dashboardData.volumeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart 
                  data={dashboardData.volumeTrend} 
                  animationDuration={0}
                  margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#eee'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={darkMode ? '#aaa' : '#666'}
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                    padding={{ left: 0, right: 0 }}
                    minTickGap={5}
                    type="category"
                    tickMargin={0}
                  />
                  <YAxis 
                    stroke={darkMode ? '#aaa' : '#666'}
                    tick={{ fontSize: 12 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    padding={{ top: 0, bottom: 0 }}
                    minTickGap={10}
                    type="number"
                    tickMargin={0}
                  />
                  <Tooltip 
                    contentStyle={darkMode ? { 
                      backgroundColor: '#1f2937', 
                      borderColor: '#374151',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    } : {
                      backgroundColor: 'white',
                      borderColor: '#e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={darkMode ? { color: '#fff' } : { color: '#374151' }}
                    formatter={(value, name) => [
                      `${value} ticket${value !== 1 ? 's' : ''}`,
                      'Volume'
                    ]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="volume" 
                    stroke="#e85c34" 
                    fill="#e85c3440"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm opacity-50">
                    {(() => {
                      let periodText = '';
                      if (selectedTimePeriod === '1') periodText = 'in the last day';
                      else if (selectedTimePeriod === '7') periodText = 'in the last 7 days';
                      else if (selectedTimePeriod === '30') periodText = 'in the last month';
                      else periodText = 'in the selected period';
                      
                      return `No tickets found ${periodText}`;
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Resolution Time Analytics */}
          <div 
            className={`${cardClass} rounded-lg p-3 border`}
          >
            <div className="mb-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-2 shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Resolution Time Analytics
                  </h2>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="font-semibold">{dashboardData.totalResolvedTickets} Resolved</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold">{dashboardData.avgResolutionTime}m Avg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="flex gap-2 mb-4">
              {dashboardData.resolutionTimes.length > 0 ? (
                dashboardData.resolutionTimes.map((metric, index) => {
                  const colors = [
                    'from-blue-500 to-blue-600',
                    'from-green-500 to-green-600', 
                    'from-orange-500 to-orange-600'
                  ];
                  
                  return (
                    <div key={index} className="flex-1 relative overflow-hidden bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-[10px] font-semibold uppercase tracking-wide text-gray-500`}>
                            {metric.metric}
                          </div>
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center shadow-sm`}>
                            <span className="text-white text-[8px] font-bold">
                              {metric.metric.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-800 mb-0.5">
                          {metric.time}
                        </div>
                        <div className="text-[10px] text-gray-500 font-medium">
                          {metric.unit}
                        </div>
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors[index]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 text-center py-4 text-xs opacity-50 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-gray-400 mb-1">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium text-[10px]">No resolution data available</p>
                </div>
              )}
            </div>

            {/* Resolution Time Distribution */}
            {dashboardData.resolutionTimeDistribution.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Time Distribution</h3>
                <div className="h-48">
                  <ChartBar
                    data={{
                      labels: dashboardData.resolutionTimeDistribution.map(item => item.range),
                      datasets: [
                        {
                          label: 'Number of Tickets',
                          data: dashboardData.resolutionTimeDistribution.map(item => item.count),
                          backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',   // Blue
                            'rgba(16, 185, 129, 0.8)',   // Green
                            'rgba(245, 158, 11, 0.8)',   // Yellow
                            'rgba(239, 68, 68, 0.8)',    // Red
                            'rgba(139, 92, 246, 0.8)',   // Purple
                            'rgba(236, 72, 153, 0.8)',   // Pink
                            'rgba(75, 85, 99, 0.8)',     // Gray
                          ],
                          borderColor: [
                            'rgba(59, 130, 246, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(139, 92, 246, 1)',
                            'rgba(236, 72, 153, 1)',
                            'rgba(75, 85, 99, 1)',
                          ],
                          borderWidth: 2,
                          borderRadius: 8,
                          borderSkipped: false,
                          hoverBackgroundColor: [
                            'rgba(59, 130, 246, 1)',
                            'rgba(16, 185, 129, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(139, 92, 246, 1)',
                            'rgba(236, 72, 153, 1)',
                            'rgba(75, 85, 99, 1)',
                          ],
                          hoverBorderColor: 'rgba(0, 0, 0, 0.8)',
                          hoverBorderWidth: 3,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        tooltip: {
                          backgroundColor: darkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          titleColor: darkMode ? '#f9fafb' : '#111827',
                          bodyColor: darkMode ? '#d1d5db' : '#374151',
                          borderColor: darkMode ? '#374151' : '#e5e7eb',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            title: function(context) {
                              return `Time Range: ${context[0].label}`;
                            },
                            label: function(context) {
                              const percentage = dashboardData.resolutionTimeDistribution[context.dataIndex]?.percentage || 0;
                              return `${context.parsed.y} tickets (${percentage}%)`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          grid: {
                            color: darkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.8)',
                            drawBorder: false,
                          },
                          ticks: {
                            color: darkMode ? '#9ca3af' : '#6b7280',
                            font: {
                              size: 12,
                              weight: '500'
                            },
                            padding: 8,
                          },
                          border: {
                            color: darkMode ? '#374151' : '#e5e7eb',
                            width: 1
                          }
                        },
                        y: {
                          grid: {
                            color: darkMode ? 'rgba(75, 85, 99, 0.2)' : 'rgba(229, 231, 235, 0.8)',
                            drawBorder: false,
                          },
                          ticks: {
                            color: darkMode ? '#9ca3af' : '#6b7280',
                            font: {
                              size: 12,
                              weight: '500'
                            },
                            padding: 8,
                          },
                          border: {
                            color: darkMode ? '#374151' : '#e5e7eb',
                            width: 1
                          }
                        }
                      },
                      animation: false
                    }}
                  />
                </div>
                </div>
              )}
            </div>
          </div>


      </main>
    </div>
  );
};

export default ModernDashboard;