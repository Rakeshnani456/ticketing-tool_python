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
import { collection, query, onSnapshot, orderBy, limit, getFirestore, where } from 'firebase/firestore';
import { dbClient } from '../config/firebase';
import { COLORS } from '../config/constants';

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
  
  // State for activities
  const [activities, setActivities] = useState([]);
  
  // State for company users (for site admin filtering)
  const [companyUsers, setCompanyUsers] = useState([]);
  
  // State for original fetched activities (for re-filtering)
  const [originalActivities, setOriginalActivities] = useState([]);
  
  // State for company filter (for Super Admin and Engineer)
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  
  // State for time period filter (Ticket Volume Trend)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // State for Resolution Time Analytics filters (separate from Ticket Volume Trend)
  const [resolutionTimePeriod, setResolutionTimePeriod] = useState('7');
  const [resolutionTimeStartDate, setResolutionTimeStartDate] = useState('');
  const [resolutionTimeEndDate, setResolutionTimeEndDate] = useState('');
  const [resolutionTimeCompany, setResolutionTimeCompany] = useState('All');
  
  // Clear filters function for Ticket Volume Trend
  const clearFilters = () => {
    setSelectedTimePeriod('7');
    setSelectedCompany('All');
    setCustomStartDate('');
    setCustomEndDate('');
  };
  
  // Clear filters function for Resolution Time Analytics
  const clearResolutionTimeFilters = () => {
    setResolutionTimePeriod('7');
    setResolutionTimeCompany('All');
    setResolutionTimeStartDate('');
    setResolutionTimeEndDate('');
  };
  

  
  // Theme classes
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-100';
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

  // Fetch available companies for Super Admin, Engineer, and Site Admin
  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'engineer' && user.role !== 'site_admin')) return;

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
      console.log('Available companies fetched:', companiesList);
      console.log('User role:', user?.role);
      setAvailableCompanies(companiesList);
      
      // Set "All" as default if none selected
      if (!selectedCompany) {
        setSelectedCompany('All');
      }
      
      // Set default time period to 7 days if not already set
      if (selectedTimePeriod === '30') {
        setSelectedTimePeriod('7');
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
    
    // Enhanced Resolution Time Analytics
    let avgResolutionTime = 0;
    let resolutionTimeData = [];
    let resolutionTimeDistribution = [];
    let resolutionTimeTrend = [];
    let priorityResolutionTimes = {};
    let agentResolutionPerformance = [];
    
    // Allow admin, super_admin, engineer, and site_admin to see resolution analytics
    if (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'engineer' || user?.role === 'site_admin') {
      // Get resolved tickets with proper data and apply filters
      let resolvedTickets = tickets.filter(ticket => 
        (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
        ticket.created_at && 
        ticket.updated_at
      );
      
      // Apply company filter for Resolution Time Analytics
      if (resolutionTimeCompany && resolutionTimeCompany !== 'All') {
        resolvedTickets = resolvedTickets.filter(ticket => {
          const ticketClient = ticket.client_name || ticket.companyName;
          return ticketClient === resolutionTimeCompany;
        });
      }
      
      // Apply time period filter for Resolution Time Analytics
      if (resolutionTimePeriod !== 'custom') {
        const days = parseInt(resolutionTimePeriod);
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        resolvedTickets = resolvedTickets.filter(ticket => {
          let ticketDate = ticket.updated_at;
          
          // Convert to Date if it's not already
          if (!(ticketDate instanceof Date)) {
            if (ticketDate && typeof ticketDate === 'object' && ticketDate.toDate) {
              ticketDate = ticketDate.toDate();
            } else if (ticketDate && typeof ticketDate === 'string') {
              ticketDate = new Date(ticketDate);
            } else if (ticketDate && typeof ticketDate === 'number') {
              ticketDate = new Date(ticketDate);
            } else {
              return false;
            }
          }
          
          return ticketDate >= cutoffDate;
        });
      } else if (resolutionTimeStartDate && resolutionTimeEndDate) {
        const startDate = new Date(resolutionTimeStartDate);
        const endDate = new Date(resolutionTimeEndDate);
        resolvedTickets = resolvedTickets.filter(ticket => {
          let ticketDate = ticket.updated_at;
          
          // Convert to Date if it's not already
          if (!(ticketDate instanceof Date)) {
            if (ticketDate && typeof ticketDate === 'object' && ticketDate.toDate) {
              ticketDate = ticketDate.toDate();
            } else if (ticketDate && typeof ticketDate === 'string') {
              ticketDate = new Date(ticketDate);
            } else if (ticketDate && typeof ticketDate === 'number') {
              ticketDate = new Date(ticketDate);
            } else {
              return false;
            }
          }
          
          return ticketDate >= startDate && ticketDate <= endDate;
        });
      }
      
      if (resolvedTickets.length > 0) {
        // Calculate resolution times for each ticket
        const ticketResolutionData = resolvedTickets.map(ticket => {
          // Ensure dates are proper Date objects
          let createdDate = ticket.created_at;
          let resolvedDate = ticket.updated_at;
          
          // Convert to Date if they're not already
          if (!(createdDate instanceof Date)) {
            if (createdDate && typeof createdDate === 'object' && createdDate.toDate) {
              createdDate = createdDate.toDate();
            } else if (createdDate && typeof createdDate === 'string') {
              createdDate = new Date(createdDate);
            } else if (createdDate && typeof createdDate === 'number') {
              createdDate = new Date(createdDate);
            } else {
              return null; // Skip invalid tickets
            }
          }
          
          if (!(resolvedDate instanceof Date)) {
            if (resolvedDate && typeof resolvedDate === 'object' && resolvedDate.toDate) {
              resolvedDate = resolvedDate.toDate();
            } else if (resolvedDate && typeof resolvedDate === 'string') {
              resolvedDate = new Date(resolvedDate);
            } else if (resolvedDate && typeof resolvedDate === 'number') {
              resolvedDate = new Date(resolvedDate);
            } else {
              return null; // Skip invalid tickets
            }
          }
          
          // Validate dates
          if (isNaN(createdDate.getTime()) || isNaN(resolvedDate.getTime())) {
            return null;
          }
          
          const resolutionTimeMs = resolvedDate - createdDate;
          const resolutionTimeMinutes = Math.round(resolutionTimeMs / (1000 * 60));
          
          // Use time_spent if available, otherwise calculate from dates
          const finalResolutionTime = ticket.time_spent && ticket.time_spent > 0 
            ? ticket.time_spent 
            : resolutionTimeMinutes;
          
          return {
            ...ticket,
            resolutionTimeMinutes: finalResolutionTime,
            resolutionTimeHours: Math.round(finalResolutionTime / 60 * 10) / 10,
            resolutionTimeDays: Math.round(finalResolutionTime / (24 * 60) * 10) / 10,
            createdDate: createdDate,
            resolvedDate: resolvedDate
          };
        }).filter(ticket => ticket && ticket.resolutionTimeMinutes > 0); // Filter out invalid tickets and times
        
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
        
        // Resolution Time Trend (last 30 days)
        const trendDays = 30;
      const trendData = [];
      
        for (let i = trendDays - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
          const ticketsResolvedOnDate = ticketResolutionData.filter(ticket => {
            const resolvedDateStr = ticket.resolvedDate.toISOString().split('T')[0];
            return resolvedDateStr === dateStr;
          });
          
          if (ticketsResolvedOnDate.length > 0) {
            const avgTimeForDate = Math.round(
              ticketsResolvedOnDate.reduce((sum, ticket) => sum + ticket.resolutionTimeMinutes, 0) / 
              ticketsResolvedOnDate.length
            );
          
          trendData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              avgResolutionTime: avgTimeForDate,
              ticketsResolved: ticketsResolvedOnDate.length,
              fullDate: dateStr
            });
          } else {
            trendData.push({
              date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              avgResolutionTime: 0,
              ticketsResolved: 0,
            fullDate: dateStr
          });
        }
      }
      
        resolutionTimeTrend = trendData;
        
        // Priority-based Resolution Times
        const priorityGroups = {};
        ticketResolutionData.forEach(ticket => {
          const priority = ticket.priority || 'Unknown';
          if (!priorityGroups[priority]) {
            priorityGroups[priority] = [];
          }
          priorityGroups[priority].push(ticket.resolutionTimeMinutes);
        });
        
        priorityResolutionTimes = Object.entries(priorityGroups).map(([priority, times]) => ({
        priority,
          avgTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
          count: times.length,
          minTime: Math.min(...times),
          maxTime: Math.max(...times)
        }));
        
        // Agent Performance (if assigned_to_email is available)
        const agentGroups = {};
        ticketResolutionData.forEach(ticket => {
          const agent = ticket.assigned_to_email || 'Unassigned';
          if (!agentGroups[agent]) {
            agentGroups[agent] = [];
          }
          agentGroups[agent].push(ticket.resolutionTimeMinutes);
        });
        
        agentResolutionPerformance = Object.entries(agentGroups)
          .map(([agent, times]) => ({
            agent: agent === 'Unassigned' ? 'Unassigned' : agent.split('@')[0],
            avgTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
            count: times.length,
            totalTime: times.reduce((sum, time) => sum + time, 0)
          }))
          .sort((a, b) => a.avgTime - b.avgTime) // Sort by performance (lower is better)
          .slice(0, 10); // Top 10 agents
        
        // Overall resolution time data for the chart
        resolutionTimeData = [
          { metric: 'Average', time: avgResolutionTime, unit: 'minutes' },
          { metric: 'Fastest', time: Math.min(...ticketResolutionData.map(t => t.resolutionTimeMinutes)), unit: 'minutes' },
          { metric: 'Slowest', time: Math.max(...ticketResolutionData.map(t => t.resolutionTimeMinutes)), unit: 'minutes' }
        ];
      }
    }
    
    // Calculate ticket volume trend based on tickets per day
    const volumeTrend = (() => {
      let days = 30; // Default to 30 days
      let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      let endDate = now;
      
      // Calculate time period based on selection
      if (selectedTimePeriod === '1') {
        days = 1;
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      } else if (selectedTimePeriod === '7') {
        days = 7;
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (selectedTimePeriod === '30') {
        days = 30;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (selectedTimePeriod === '90') {
        days = 90;
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (selectedTimePeriod === '180') {
        days = 180;
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      } else if (selectedTimePeriod === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
      }
      
      const trendData = [];
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Filter tickets for this specific date and client (if selected)
        const ticketsForDate = filteredTickets.filter(ticket => {
          // Ensure ticketDate is a proper Date object
          let ticketDate = ticket.created_at;
          
          // Convert to Date if it's not already
          if (!(ticketDate instanceof Date)) {
            if (ticketDate && typeof ticketDate === 'object' && ticketDate.toDate) {
              // Firebase Timestamp
              ticketDate = ticketDate.toDate();
            } else if (ticketDate && typeof ticketDate === 'string') {
              // String date
              ticketDate = new Date(ticketDate);
            } else if (ticketDate && typeof ticketDate === 'number') {
              // Unix timestamp
              ticketDate = new Date(ticketDate);
            } else {
              // Invalid date, skip this ticket
              return false;
            }
          }
            
            // Validate the date
            if (isNaN(ticketDate.getTime())) {
              return false;
            }
            
            const ticketDateStr = ticketDate.toISOString().split('T')[0];
            
            // Match date
            if (ticketDateStr !== dateStr) return false;
            
            // Apply client filter if selected
            if (selectedCompany && selectedCompany !== 'All') {
              const ticketClient = ticket.client_name || ticket.companyName;
              if (ticketClient !== selectedCompany) return false;
            }
            
            return true;
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
    
    // Recent tickets logic - get tickets from last 2 days that are unassigned/unresolved
    const recentTickets = tickets.filter(ticket => {
      // Ensure ticketDate is a proper Date object
      let ticketDate = ticket.created_at;
      
      // Convert to Date if it's not already
      if (!(ticketDate instanceof Date)) {
        if (ticketDate && typeof ticketDate === 'object' && ticketDate.toDate) {
          // Firebase Timestamp
          ticketDate = ticketDate.toDate();
        } else if (ticketDate && typeof ticketDate === 'string') {
          // String date
          ticketDate = new Date(ticketDate);
        } else if (ticketDate && typeof ticketDate === 'number') {
          // Unix timestamp
          ticketDate = new Date(ticketDate);
        } else {
          // Invalid date, skip this ticket
          return false;
        }
      }
        
        // Validate the date
        if (isNaN(ticketDate.getTime())) {
          return false;
        }
        
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        
        return ticketDate >= twoDaysAgo && 
               (ticket.status === 'Open' || ticket.status === 'In Progress') &&
               (!ticket.assigned_to_email || ticket.assigned_to_email === '');
    }).slice(0, 10); // Limit to 10 most recent
    
    return {
      statusCounts,
      priorityCounts,
      resolutionTimes: resolutionTimeData,
      resolutionTimeDistribution,
      resolutionTimeTrend,
      priorityResolutionTimes,
      agentResolutionPerformance,
      volumeTrend,
      recentTickets,
      totalTickets: filteredTickets.length,
      totalActiveTickets,
      openTickets,
      inProgressTickets,
      assignedToMe,
      avgResolutionTime,
      totalResolvedTickets: (user?.role === 'admin' || user?.role === 'super_admin') ? 
        tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length : 0
    };
  }, [tickets, agents, timeRange, user, selectedCompany, selectedTimePeriod, customStartDate, customEndDate, resolutionTimePeriod, resolutionTimeCompany, resolutionTimeStartDate, resolutionTimeEndDate]);

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
      <header className={`px-3 py-6 ${bgClass}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-medium flex items-center" style={{ color: '#6b7280', marginBottom: '0.125rem' }}>
              Service Insights
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
          

        </div>
      </header>

      <main className={`px-3 pb-1 ${bgClass}`}>

        

        
        {/* Stats Overview */}
        <div className={`grid grid-cols-1 md:grid-cols-${(user?.role === 'engineer' || user?.role === 'support') ? '4' : user?.role === 'admin' || user?.role === 'super_admin' ? '4' : '3'} gap-3 mb-4`}>
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
          
                     {/* Assigned to Me - Only Engineers and Support */}
           {(user?.role === 'engineer' || user?.role === 'support') && (
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
              <h2 className="text-xl font-semibold">Updates</h2>
              <div className="relative bg-gray-200 rounded-full p-0.5 flex w-48">
                <button 
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 py-1 px-2 rounded-full text-xs font-medium transition-all duration-300 ${
                    activeTab === 'activity' 
                      ? 'bg-[#e85c34] text-white shadow-sm transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  Activity
                </button>
                <button 
                  onClick={() => setActiveTab('tickets')}
                  className={`flex-1 py-1 px-2 rounded-full text-xs font-medium transition-all duration-300 ${
                    activeTab === 'tickets' 
                      ? 'bg-[#e85c34] text-white shadow-sm transform scale-105' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  Recents ({dashboardData.recentTickets.length})
                </button>
              </div>
            </div>
            
            {activeTab === 'activity' && (
              <div className="space-y-0 max-h-72 overflow-y-auto">
                {console.log('Activities array length:', filteredActivities.length)}
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((activity, index) => {
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
                          return 'bg-amber-100 text-amber-700 border border-amber-200';
                        case 'assignment':
                          return 'bg-sky-100 text-sky-700 border border-sky-200';
                        case 'comment':
                          return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
                        case 'resolved':
                          return 'bg-green-100 text-green-700 border border-green-200';
                        case 'attachment':
                          return 'bg-violet-100 text-violet-700 border border-violet-200';
                        case 'created':
                          return 'bg-blue-100 text-blue-700 border border-blue-200';
                        case 'priority_change':
                          return 'bg-orange-100 text-orange-700 border border-orange-200';
                        case 'cancelled':
                          return 'bg-red-100 text-red-700 border border-red-200';
                        default:
                          return 'bg-slate-100 text-slate-700 border border-slate-200';
                      }
                    };

                    const formatTimeAgo = (timestamp) => {
                      // Ensure timestamp is a proper Date object
                      let safeTimestamp = timestamp;
                      
                      if (!(safeTimestamp instanceof Date)) {
                        if (safeTimestamp && typeof safeTimestamp === 'object' && safeTimestamp.toDate) {
                          // Firebase Timestamp
                          safeTimestamp = safeTimestamp.toDate();
                        } else if (safeTimestamp && typeof safeTimestamp === 'string') {
                          // String date
                          safeTimestamp = new Date(safeTimestamp);
                        } else if (safeTimestamp && typeof safeTimestamp === 'number') {
                          // Unix timestamp
                          safeTimestamp = new Date(safeTimestamp);
                        } else {
                          return 'Invalid date';
                        }
                      }
                      
                      // Validate the date
                      if (isNaN(safeTimestamp.getTime())) {
                        return 'Invalid date';
                      }
                      
                      const now = new Date();
                      const diffInMinutes = Math.floor((now - safeTimestamp) / (1000 * 60));
                      
                      if (diffInMinutes < 1) return 'Just now';
                      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
                      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
                      return `${Math.floor(diffInMinutes / 1440)}d ago`;
                    };

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
                      <div key={activity.id} className={`py-2 px-3 border-b-2 ${itemBorder} last:border-b-0 dark:border-gray-300/50 ${itemBg} ${itemShadow} transition-all duration-200`}>
                        <div className="flex justify-between">
                          <div className="flex items-start">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 mt-0.5 ${getActivityColor(activity.type)}`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* New format: User full name • TicketID : Subjectline */}
                              <div className="mb-0.5">
                                <div className="flex items-center text-sm">
                                  <span className="font-medium text-black">
                                    {activity.user_name || activity.user || 'System'}
                                  </span>
                                  <span className="text-black mx-1">•</span>
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
                                    className="font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 cursor-pointer transition-all duration-200"
                                  >
                                    {activity.ticket_display_id || 
                                     (activity.ticket_id && activity.ticket_id.startsWith('TT') ? activity.ticket_id : null) || 
                                     (activity.ticketId && activity.ticketId.startsWith('TT') ? activity.ticketId : null) ||
                                     (activity.ticket_id && ticketMappings.docIdToDisplayIdMap[activity.ticket_id]) ||
                                     (activity.ticketId && ticketMappings.docIdToDisplayIdMap[activity.ticketId]) ||
                                     'Unknown Ticket'}
                                  </button>
                                  <span className="text-black mx-1">•</span>
                                  <span className="font-medium text-black">
                                    {activity.ticket_title || 'No title'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action description */}
                              <div className="space-y-0.5">
                                <p className="text-xs text-black">
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
                                    <span className="text-xs italic text-black">
                                      "{activity.comment_text}"
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show status change details */}
                                {activity.type === 'status_change' && activity.old_status && activity.new_status && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-black border border-slate-200">
                                      {activity.old_status}
                                    </span>
                                    <span className="text-black font-medium">→</span>
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-black border border-amber-200">
                                      {activity.new_status}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show priority change details */}
                                {activity.type === 'priority_change' && activity.old_priority && activity.new_priority && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-black border border-slate-200">
                                      {activity.old_priority}
                                    </span>
                                    <span className="text-black font-medium">→</span>
                                    <span className="px-1.5 py-0.5 rounded bg-orange-100 text-black border border-orange-200">
                                      {activity.new_priority}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show assignment details */}
                                {activity.type === 'assignment' && activity.assigned_to_email && (
                                  <p className="text-xs text-black bg-sky-50 px-2 py-1 rounded border border-sky-200">
                                    Assigned to: {activity.assigned_to_email}
                                  </p>
                                )}
                                
                                {/* Show attachment details */}
                                {activity.type === 'attachment' && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <FileText className="w-3 h-3 text-violet-600" />
                                    <span className="text-black font-medium">
                                      {activity.filename || 'Unknown file'}
                                    </span>
                                    {activity.file_size && (
                                      <span className="text-black bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        ({(activity.file_size / 1024).toFixed(1)} KB)
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show resolution details */}
                                {activity.type === 'resolved' && activity.resolution_time && (
                                  <p className="text-xs text-black bg-green-50 px-2 py-1 rounded border border-green-200">
                                    Resolution time: {Math.round(activity.resolution_time)} minutes
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <p className="text-xs text-black">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                            <p className="text-xs text-black mt-0.5">
                              {(() => {
                                // Ensure timestamp is a proper Date object
                                let safeTimestamp = activity.timestamp;
                                
                                if (!(safeTimestamp instanceof Date)) {
                                  if (safeTimestamp && typeof safeTimestamp === 'object' && safeTimestamp.toDate) {
                                    // Firebase Timestamp
                                    safeTimestamp = safeTimestamp.toDate();
                                  } else if (safeTimestamp && typeof safeTimestamp === 'string') {
                                    // String date
                                    safeTimestamp = new Date(safeTimestamp);
                                  } else if (safeTimestamp && typeof safeTimestamp === 'number') {
                                    // Unix timestamp
                                    safeTimestamp = new Date(safeTimestamp);
                                  } else {
                                    return 'Invalid date';
                                  }
                                }
                                
                                // Validate the date
                                if (isNaN(safeTimestamp.getTime())) {
                                  return 'Invalid date';
                                }
                                
                                return `${safeTimestamp.toLocaleDateString()} at ${safeTimestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                                })}`;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 opacity-50">
                    <p className="text-sm text-black">
                      {user?.role === 'site_admin' && companyUsers.length === 0 
                        ? 'Loading company activities...' 
                        : 'No activities found'
                      }
                    </p>
                    {user?.role === 'site_admin' && (
                      <p className="text-xs mt-1 text-black">Company users loaded: {companyUsers.length}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'tickets' && (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          {/* Ticket Volume Trend */}
          <div 
            className={`${cardClass} rounded-lg border`}
          >
            <div className="mb-3 px-3 pt-3">
              <h2 className="text-lg font-bold mb-3">
                Ticket Volume Trend
                {selectedCompany && selectedCompany !== 'All' && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    - {selectedCompany}
                  </span>
                )}
              </h2>
              {/* Filters - Organized in rows */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Time Period Filter */}
                <div className="flex items-center gap-2">
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
                    <option value="90">3 Months</option>
                    <option value="180">6 Months</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {/* Client Filter - hide for site_admin */}
                {(user?.role !== 'site_admin') && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Client:</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className={`px-2 py-1 rounded text-xs border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-black'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    <option value="All">All</option>
                    {availableCompanies.map(company => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">({availableCompanies.length} companies)</span>
                </div>
                )}
                {/* Clear Filters Button - Only show when filters are changed from defaults */}
                {(selectedTimePeriod !== '7' || selectedCompany !== 'All' || customStartDate || customEndDate) && (
                  <button
                    onClick={clearFilters}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      darkMode 
                        ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              {/* Custom Date Range - Separate row when custom is selected */}
              {selectedTimePeriod === 'custom' && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                  <label className="text-xs font-medium text-gray-600">Date Range:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`px-2 py-1 rounded text-xs border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-black'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <span className="text-xs text-gray-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`px-2 py-1 rounded text-xs border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-black'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                </div>
              )}
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
                      else if (selectedTimePeriod === '90') periodText = 'in the last 3 months';
                      else if (selectedTimePeriod === '180') periodText = 'in the last 6 months';
                      else if (selectedTimePeriod === 'custom') periodText = 'in the selected period';
                      else periodText = 'in the selected period';
                      
                      if (selectedCompany && selectedCompany !== 'All') {
                        return `No tickets found for ${selectedCompany} ${periodText}`;
                      }
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
                    {resolutionTimeCompany && resolutionTimeCompany !== 'All' && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        - {resolutionTimeCompany}
                      </span>
                    )}
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
                {/* Filters - Organized in rows */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Time Period Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Period:</label>
                    <select
                      value={resolutionTimePeriod}
                      onChange={(e) => setResolutionTimePeriod(e.target.value)}
                      className={`px-2 py-1 rounded text-xs border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-black'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                      <option value="1">1 Day</option>
                      <option value="7">7 Days</option>
                      <option value="30">1 Month</option>
                      <option value="90">3 Months</option>
                      <option value="180">6 Months</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  {/* Client Filter - hide for site_admin */}
                  {(user?.role !== 'site_admin') && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Client:</label>
                    <select
                      value={resolutionTimeCompany}
                      onChange={(e) => setResolutionTimeCompany(e.target.value)}
                      className={`px-2 py-1 rounded text-xs border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-black'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                      <option value="All">All</option>
                      {availableCompanies.map(company => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400">({availableCompanies.length} companies)</span>
                  </div>
                  )}
                  {/* Clear Filters Button - Only show when filters are changed from defaults */}
                  {(resolutionTimePeriod !== '7' || resolutionTimeCompany !== 'All' || resolutionTimeStartDate || resolutionTimeEndDate) && (
                    <button
                      onClick={clearResolutionTimeFilters}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        darkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                {/* Custom Date Range - Separate row when custom is selected */}
                {resolutionTimePeriod === 'custom' && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                    <label className="text-xs font-medium text-gray-600">Date Range:</label>
                    <input
                      type="date"
                      value={resolutionTimeStartDate}
                      onChange={(e) => setResolutionTimeStartDate(e.target.value)}
                      className={`px-2 py-1 rounded text-xs border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-black'
                        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    <span className="text-xs text-gray-500">to</span>
                    <input
                      type="date"
                      value={resolutionTimeEndDate}
                      onChange={(e) => setResolutionTimeEndDate(e.target.value)}
                      className={`px-2 py-1 rounded text-xs border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-black'
                        } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                  </div>
                )}
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