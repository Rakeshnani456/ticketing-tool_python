// src/components/ModernDashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileText, Plus, ExternalLink, CheckCircle2, RotateCcw
} from 'lucide-react';
import CustomDropdown from './common/CustomDropdown';
import CompactDropdown from './common/CompactDropdown';
import UpdatesComponent from './common/UpdatesComponent';
import StatusDistributionChart from './charts/StatusDistributionChart';
import Spinner from './common/Spinner';
import { collection, query, orderBy, limit, getFirestore, where, onSnapshot } from 'firebase/firestore';
import { dbClient } from '../config/firebase';
import { COLORS } from '../config/constants';
import { useDashboardData } from '../hooks/useDataManager';
import readStatesService from '../services/readStatesService';

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

  // Utility function for timestamp formatting to avoid duplication - MEMOIZED
  const formatTimestamp = useCallback((timestamp, format = 'relative') => {
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
    
    if (format === 'relative') {
      const now = new Date();
      const diffInMinutes = Math.floor((now - safeTimestamp) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return `${safeTimestamp.getDate().toString().padStart(2, '0')}-${safeTimestamp.toLocaleDateString('en-US', { month: 'short' })}-${safeTimestamp.getFullYear()}`;
    }
  }, []);

  // Load read states from database and sync with localStorage
  useEffect(() => {
    const loadReadStates = async () => {
      try {
        console.log('Loading read states from database...');
        const readStates = await readStatesService.getReadStates();
        console.log('Loaded read states:', readStates);
        
        // Update state with database values
        const dbActivities = new Set(readStates.activities || []);
        const dbTickets = new Set(readStates.tickets || []);
        const dbShowReadActivities = readStates.showReadActivities !== undefined ? readStates.showReadActivities : true;
        const dbShowReadTickets = readStates.showReadTickets !== undefined ? readStates.showReadTickets : true;
        
        setReadActivities(dbActivities);
        setReadTickets(dbTickets);
        setShowReadActivities(dbShowReadActivities);
        setShowReadTickets(dbShowReadTickets);
        
        // Update localStorage with database values
        localStorage.setItem('dashboard_readActivities', JSON.stringify(Array.from(dbActivities)));
        localStorage.setItem('dashboard_readTickets', JSON.stringify(Array.from(dbTickets)));
        localStorage.setItem('dashboard_showReadActivities', JSON.stringify(dbShowReadActivities));
        localStorage.setItem('dashboard_showReadTickets', JSON.stringify(dbShowReadTickets));
        
        setReadStatesLoaded(true);
        
        console.log('Read states loaded and synced successfully:', {
          activities: Array.from(dbActivities),
          tickets: Array.from(dbTickets),
          showReadActivities: dbShowReadActivities,
          showReadTickets: dbShowReadTickets
        });
      } catch (error) {
        console.error('Error loading read states:', error);
        setReadStatesLoaded(true); // Still set loaded to true to prevent infinite loading
      }
    };

    if (user) {
      loadReadStates();
    }
  }, [user]);

  // Interactive functions
  const markActivityAsRead = async (activityId) => {
    try {
      console.log('Marking activity as read:', activityId);
      const updatedReadStates = await readStatesService.markActivityAsRead(activityId);
      console.log('Updated read states from API:', updatedReadStates);
      
      const newActivities = new Set(updatedReadStates.activities || []);
      setReadActivities(newActivities);
      
      // Update localStorage immediately
      localStorage.setItem('dashboard_readActivities', JSON.stringify(Array.from(newActivities)));
    } catch (error) {
      console.error('Error marking activity as read:', error);
      // Fallback to local state update
      const newActivities = new Set([...readActivities, activityId]);
      setReadActivities(newActivities);
      localStorage.setItem('dashboard_readActivities', JSON.stringify(Array.from(newActivities)));
    }
  };

  const markTicketAsRead = async (ticketId) => {
    try {
      const updatedReadStates = await readStatesService.markTicketAsRead(ticketId);
      const newTickets = new Set(updatedReadStates.tickets || []);
      setReadTickets(newTickets);
      
      // Update localStorage immediately
      localStorage.setItem('dashboard_readTickets', JSON.stringify(Array.from(newTickets)));
    } catch (error) {
      console.error('Error marking ticket as read:', error);
      // Fallback to local state update
      const newTickets = new Set([...readTickets, ticketId]);
      setReadTickets(newTickets);
      localStorage.setItem('dashboard_readTickets', JSON.stringify(Array.from(newTickets)));
    }
  };

  const markAllActivitiesAsRead = async () => {
    try {
      const allActivityIds = filteredActivities.map(activity => activity.id);
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: allActivityIds,
        tickets: Array.from(readTickets),
        showReadActivities,
        showReadTickets
      });
      setReadActivities(new Set(updatedReadStates.activities || []));
    } catch (error) {
      console.error('Error marking all activities as read:', error);
      // Fallback to local state update
      const allActivityIds = filteredActivities.map(activity => activity.id);
      setReadActivities(new Set(allActivityIds));
    }
  };

  const markAllTicketsAsRead = async () => {
    try {
      const allTicketIds = processedDashboardData.recentTickets.map(ticket => ticket.id);
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: Array.from(readActivities),
        tickets: allTicketIds,
        showReadActivities,
        showReadTickets
      });
      setReadTickets(new Set(updatedReadStates.tickets || []));
    } catch (error) {
      console.error('Error marking all tickets as read:', error);
      // Fallback to local state update
      const allTicketIds = processedDashboardData.recentTickets.map(ticket => ticket.id);
      setReadTickets(new Set(allTicketIds));
    }
  };

  const markAllUpdatesAsRead = async (updates) => {
    try {
      const activityIds = [];
      const ticketIds = [];
      
      // Separate updates by type
      updates.forEach(update => {
        if (update.type === 'activity') {
          const activityId = update.id.replace('activity-', '');
          if (!readActivities.has(activityId)) {
            activityIds.push(activityId);
          }
        } else if (update.type === 'ticket') {
          const ticketId = update.id.replace('ticket-', '');
          if (!readTickets.has(ticketId)) {
            ticketIds.push(ticketId);
          }
        }
      });
      
      // Mark all at once using the batch update function
      if (activityIds.length > 0 || ticketIds.length > 0) {
        const updatedReadStates = await readStatesService.updateReadStates({
          activities: [...Array.from(readActivities), ...activityIds],
          tickets: [...Array.from(readTickets), ...ticketIds],
          showReadActivities,
          showReadTickets
        });
        
        setReadActivities(new Set(updatedReadStates.activities || []));
        setReadTickets(new Set(updatedReadStates.tickets || []));
        
        // Update localStorage
        localStorage.setItem('dashboard_readActivities', JSON.stringify(Array.from(updatedReadStates.activities || [])));
        localStorage.setItem('dashboard_readTickets', JSON.stringify(Array.from(updatedReadStates.tickets || [])));
      }
    } catch (error) {
      console.error('Error marking all updates as read:', error);
      // Fallback to individual updates
      updates.forEach(update => {
        if (update.type === 'activity') {
          markActivityAsRead(update.id.replace('activity-', ''));
        } else if (update.type === 'ticket') {
          markTicketAsRead(update.id.replace('ticket-', ''));
        }
      });
    }
  };

  const clearReadActivities = async () => {
    try {
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: [],
        tickets: Array.from(readTickets),
        showReadActivities,
        showReadTickets
      });
      setReadActivities(new Set(updatedReadStates.activities || []));
    } catch (error) {
      console.error('Error clearing read activities:', error);
      // Fallback to local state update
      setReadActivities(new Set());
    }
  };

  const clearReadTickets = async () => {
    try {
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: Array.from(readActivities),
        tickets: [],
        showReadActivities,
        showReadTickets
      });
      setReadTickets(new Set(updatedReadStates.tickets || []));
    } catch (error) {
      console.error('Error clearing read tickets:', error);
      // Fallback to local state update
      setReadTickets(new Set());
    }
  };

  const toggleShowReadActivities = async () => {
    const newValue = !showReadActivities;
    try {
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: Array.from(readActivities),
        tickets: Array.from(readTickets),
        showReadActivities: newValue,
        showReadTickets
      });
      setShowReadActivities(updatedReadStates.showReadActivities);
    } catch (error) {
      console.error('Error toggling show read activities:', error);
      // Fallback to local state update
      setShowReadActivities(newValue);
    }
  };

  const toggleShowReadTickets = async () => {
    const newValue = !showReadTickets;
    try {
      const updatedReadStates = await readStatesService.updateReadStates({
        activities: Array.from(readActivities),
        tickets: Array.from(readTickets),
        showReadActivities,
        showReadTickets: newValue
      });
      setShowReadTickets(updatedReadStates.showReadTickets);
    } catch (error) {
      console.error('Error toggling show read tickets:', error);
      // Fallback to local state update
      setShowReadTickets(newValue);
    }
  };

  // Utility function to clean activity descriptions - MEMOIZED
  const cleanActivityDescription = useCallback((activity) => {
    let cleanDescription = activity.description || activity.details || '';
    
    // Remove redundant ticket ID information
    cleanDescription = cleanDescription.replace(/ to ticket TT\d+/gi, '');
    cleanDescription = cleanDescription.replace(/ for ticket TT\d+/gi, '');
    cleanDescription = cleanDescription.replace(/ on ticket TT\d+/gi, '');
    
    // Remove redundant filename information for attachments
    if (activity.type === 'attachment' && activity.filename) {
      cleanDescription = cleanDescription.replace(new RegExp(`: ${activity.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
    }
    
    // Remove redundant user information if it's already shown in the header
    if (activity.user_name || activity.user) {
      const userName = activity.user_name || activity.user;
      cleanDescription = cleanDescription.replace(new RegExp(`by ${userName}`, 'gi'), '');
      cleanDescription = cleanDescription.replace(new RegExp(`${userName} `, 'gi'), '');
    }
    
    // For assignment activities, ensure we have a clean description
    if (activity.type === 'assignment' && activity.assigned_to_email) {
      // If description doesn't contain the email, add it
      if (!cleanDescription.includes(activity.assigned_to_email)) {
        cleanDescription = `Assigned to ${activity.assigned_to_email}`;
      }
    }
    
    return cleanDescription.trim();
  }, []);

  // Utility function to highlight email addresses in text - MEMOIZED
  const highlightEmails = useCallback((text) => {
    if (!text) return text;
    
    // Email regex pattern
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    
    return text.split(emailRegex).map((part, index) => {
      if (emailRegex.test(part)) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md font-medium border border-blue-200">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);
  const [agents, setAgents] = useState([]);
  const [timeRange, setTimeRange] = useState('week');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false to avoid spinner flash
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' or 'tickets'
  
  // State for activities
  const [activities, setActivities] = useState([]);
  
  // State for interactive features
  const [readActivities, setReadActivities] = useState(() => {
    // Initialize from localStorage for immediate display
    try {
      const saved = localStorage.getItem('dashboard_readActivities');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });
  const [readTickets, setReadTickets] = useState(() => {
    // Initialize from localStorage for immediate display
    try {
      const saved = localStorage.getItem('dashboard_readTickets');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (error) {
      return new Set();
    }
  });
  const [showReadActivities, setShowReadActivities] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_showReadActivities');
      return saved ? JSON.parse(saved) : true;
    } catch (error) {
      return true;
    }
  });
  const [showReadTickets, setShowReadTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_showReadTickets');
      return saved ? JSON.parse(saved) : true;
    } catch (error) {
      return true;
    }
  });
  const [readStatesLoaded, setReadStatesLoaded] = useState(false);
  
  // State for company users (for site admin filtering)
  const [companyUsers, setCompanyUsers] = useState([]);
  
  // State for original fetched activities (for re-filtering)
  const [originalActivities, setOriginalActivities] = useState([]);
  
  // State for company filter (for Super Admin and Engineer)
  const [selectedCompany, setSelectedCompany] = useState('');
  const [availableCompanies, setAvailableCompanies] = useState([]);
  
  // State for Resolution Time Analytics filters (declare early to avoid initialization errors)
  const [resolutionTimePeriod, setResolutionTimePeriod] = useState('7');
  const [resolutionTimeStartDate, setResolutionTimeStartDate] = useState('');
  const [resolutionTimeEndDate, setResolutionTimeEndDate] = useState('');
  const [resolutionTimeCompany, setResolutionTimeCompany] = useState('');

  // Use centralized data management
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useDashboardData(
    user?.uid,
    user?.role,
    user?.client_name
  );

  // Debug logging
  useEffect(() => {
    console.log('Dashboard Debug:', {
      user: user ? { uid: user.uid, role: user.role, client_name: user.client_name } : null,
      dashboardData: dashboardData ? 'Data loaded' : 'No data',
      dashboardLoading,
      dashboardError
    });
  }, [user, dashboardData, dashboardLoading, dashboardError]);

  // Update state when dashboard data changes
  useEffect(() => {
    if (dashboardData) {
      setTickets(dashboardData.tickets || []);
      setCompanyUsers(dashboardData.companyUsers || []);
      setActivities(dashboardData.activities || []);
      setAgents(dashboardData.agents || []);
      setLoading(false);
    }
  }, [dashboardData]);

  // Extract unique companies from tickets for dropdown
  useEffect(() => {
    if (tickets.length > 0) {
      const uniqueCompanies = [...new Set(
        tickets
          .map(ticket => ticket.client_name || ticket.companyName)
          .filter(Boolean)
      )].sort();
      
      console.log('Extracted companies for dropdown:', uniqueCompanies);
      setAvailableCompanies(uniqueCompanies);
    }
  }, [tickets]);
  
  // Set default resolution time company when companies are available
  useEffect(() => {
    if (availableCompanies.length > 0 && !resolutionTimeCompany) {
      setResolutionTimeCompany(availableCompanies[0]);
    } else if (availableCompanies.length > 0 && resolutionTimeCompany && !availableCompanies.includes(resolutionTimeCompany)) {
      // If current company is not in available companies, reset to first
      setResolutionTimeCompany(availableCompanies[0]);
    }
  }, [availableCompanies, resolutionTimeCompany]);

  // Additional real-time listener for tickets to ensure cards update immediately
  useEffect(() => {
    if (!user?.uid || !dbClient) return;

    console.log('🔄 Setting up real-time tickets listener for dashboard cards');
    
    let ticketsQuery;
    try {
      // Create query for all tickets (for dashboard cards)
      ticketsQuery = query(
        collection(dbClient, 'tickets'),
        orderBy('created_at', 'desc')
      );
    } catch (error) {
      console.error('Error creating tickets query for dashboard:', error);
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
        
        console.log('🔄 Real-time tickets update for dashboard cards:', newTickets.length, 'tickets');
        setTickets(newTickets);
        
        // Update available companies from real-time data
        const uniqueCompanies = [...new Set(
          newTickets
            .map(ticket => ticket.client_name || ticket.companyName)
            .filter(Boolean)
        )].sort();
        
        if (uniqueCompanies.length > 0) {
          console.log('🔄 Updated companies from real-time data:', uniqueCompanies);
          setAvailableCompanies(uniqueCompanies);
          
        }
      },
      (error) => {
        console.error('Error in real-time tickets listener for dashboard:', error);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time tickets listener for dashboard cards');
      unsubscribe();
    };
  }, [user?.uid]);

  // Additional real-time listener for activities to ensure updates section gets fresh data
  useEffect(() => {
    if (!user?.uid || !dbClient) return;

    console.log('🔄 Setting up real-time activities listener for dashboard');
    
    let activitiesQuery;
    try {
      // Create query for recent activities with client filtering for site admins
      if (user?.role === 'site_admin' && user?.client_name) {
        console.log('🔒 Filtering activities for site admin by client:', user.client_name);
        activitiesQuery = query(
          collection(dbClient, 'activities'),
          where('client_name', '==', user.client_name),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      } else if (user?.role === 'user') {
        // For regular users, we need to filter by their tickets
        // Get user's tickets from the current tickets state
        const userTicketIds = tickets
          .filter(ticket => ticket.reporter_id === user.uid)
          .map(ticket => ticket.id);
        
        if (userTicketIds.length === 0) {
          console.log('🔄 No tickets for user, fetching empty activities');
          setActivities([]);
          return;
        }
        
        console.log('🔒 Filtering activities for regular user by tickets:', userTicketIds.length);
        
        if (userTicketIds.length <= 10) {
          // Firestore 'in' query supports up to 10 items
          activitiesQuery = query(
            collection(dbClient, 'activities'),
            where('ticket_id', 'in', userTicketIds),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
        } else {
          // If more than 10 tickets, fetch all and filter client-side
          activitiesQuery = query(
            collection(dbClient, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(200)
          );
        }
      } else {
        // For support/engineers/admins, get all activities
        activitiesQuery = query(
          collection(dbClient, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
      }
    } catch (error) {
      console.error('Error creating activities query for dashboard:', error);
      return;
    }

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        let newActivities = [];
        snapshot.forEach((doc) => {
          const activity = { id: doc.id, ...doc.data() };
          newActivities.push(activity);
        });
        
        // Client-side filtering for users with more than 10 tickets
        if (user?.role === 'user') {
          const userTicketIds = tickets
            .filter(ticket => ticket.reporter_id === user.uid)
            .map(ticket => ticket.id);
          
          if (userTicketIds.length > 10) {
            newActivities = newActivities.filter(activity => 
              userTicketIds.includes(activity.ticket_id)
            );
          }
          // Limit to 50 most recent after filtering
          newActivities = newActivities.slice(0, 50);
        }
        
        console.log('🔄 Real-time activities update for dashboard:', newActivities.length, 'activities');
        setActivities(newActivities);
      },
      (error) => {
        console.error('Error in real-time activities listener for dashboard:', error);
      }
    );

    return () => {
      console.log('🔄 Cleaning up real-time activities listener for dashboard');
      unsubscribe();
    };
  }, [user?.uid, user?.role, user?.client_name, tickets]);
  
  // State for time period filter (Ticket Volume Trend)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
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
    // Set to first available company instead of 'All'
    if (availableCompanies.length > 0) {
      setResolutionTimeCompany(availableCompanies[0]);
    } else {
      setResolutionTimeCompany('');
    }
    setResolutionTimeStartDate('');
    setResolutionTimeEndDate('');
  };
  

  
  // Theme classes
  const bgClass = darkMode ? 'bg-gray-900' : 'bg-white';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';
  const cardClass = darkMode 
    ? 'bg-gray-800/70 backdrop-blur-lg border-gray-700' 
    : 'bg-white/90 backdrop-blur-lg border-gray-300';

  // Data fetching is now handled by centralized data management
  // The useDashboardData hook will handle all Firebase queries and caching

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

  // Companies fetching removed - not critical for main functionality
  // This can be added back later if needed for specific admin features

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

  // Basic ticket filtering - OPTIMIZED
  const filteredTickets = useMemo(() => {
    // Filter for site_admin by company
    if (user?.role === 'site_admin' && user?.client_name) {
      return tickets.filter(ticket => {
        const ticketClientName = ticket.client_name || ticket.companyName;
        return ticketClientName === user.client_name || ticketClientName === user.companyName;
      });
    }
    
    // Filter for regular users - only show their own tickets
    if (user?.role === 'user' && user?.uid) {
      return tickets.filter(ticket => ticket.reporter_id === user.uid);
    }
    
    return tickets;
  }, [tickets, user?.role, user?.uid, user?.client_name]);

  // Basic metrics - OPTIMIZED
  const basicMetrics = useMemo(() => {
    const statusCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    
    const totalActiveTickets = (statusCounts['Open'] || 0) + (statusCounts['In Progress'] || 0) + (statusCounts['Hold'] || 0);
    const openTickets = statusCounts['Open'] || 0;
    const inProgressTickets = statusCounts['In Progress'] || 0;
    
    const assignedToMe = (user?.role === 'support' || user?.role === 'engineer' || user?.role === 'senior_engineer' || user?.role === 'lead_engineer' || user?.role === 'principal_engineer') ? 
      filteredTickets.filter(ticket => 
        ticket.assigned_to_email === user.email && 
        ['Open', 'In Progress', 'Hold'].includes(ticket.status)
      ).length : 0;

    return {
      statusCounts,
      totalActiveTickets,
      openTickets,
      inProgressTickets,
      assignedToMe
    };
  }, [filteredTickets, user?.role, user?.email]);

  // Process data for visualizations - OPTIMIZED
  const processedDashboardData = useMemo(() => {
    // Calculate current time once for all calculations
    const now = new Date();
    
    // Use pre-calculated basic metrics
    const { statusCounts, totalActiveTickets, openTickets, inProgressTickets, assignedToMe } = basicMetrics;
    
    // Priority counts
    const priorityCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});
    
    // Enhanced Resolution Time Analytics
    let avgResolutionTime = 0;
    let resolutionTimeData = [];
    let resolutionTimeDistribution = [];
    let resolutionTimeTrend = [];
    let priorityResolutionTimes = {};
    let agentResolutionPerformance = [];
    
    // Allow admin, super_admin, support, and site_admin to see resolution analytics
    if (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'support' || user?.role === 'site_admin') {
      // Get resolved tickets with proper data and apply filters
      let resolvedTickets = filteredTickets.filter(ticket => 
        (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
        ticket.created_at && 
        ticket.updated_at
      );
      
      // Apply company filter for Resolution Time Analytics
      if (resolutionTimeCompany) {
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
        
        // Resolution Time Trend (last 30 days including current day)
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
      let endDate = new Date(now); // Include current day
      
      // Calculate time period based on selection
      if (selectedTimePeriod === '1') {
        days = 1;
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        endDate = new Date(now); // Include current day
      } else if (selectedTimePeriod === '7') {
        days = 7;
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date(now); // Include current day
      } else if (selectedTimePeriod === '30') {
        days = 30;
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = new Date(now); // Include current day
      } else if (selectedTimePeriod === '90') {
        days = 90;
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = new Date(now); // Include current day
      } else if (selectedTimePeriod === '180') {
        days = 180;
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        endDate = new Date(now); // Include current day
      } else if (selectedTimePeriod === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1; // Include end date
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
    const recentTickets = filteredTickets.filter(ticket => {
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
        filteredTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length : 0
    };
  }, [basicMetrics, filteredTickets, agents, user, selectedCompany, selectedTimePeriod, customStartDate, customEndDate, resolutionTimePeriod, resolutionTimeCompany, resolutionTimeStartDate, resolutionTimeEndDate]);

  // Filter activities by selected company for Super Admin and Engineer - DISABLED
  const filteredActivities = useMemo(() => {
    // For site_admin, filter activities to only show their company's activities
    if (user?.role === 'site_admin' && user?.client_name) {
      return activities.filter(activity => {
        // First, check if activity has direct client information
        const activityClientName = activity.client_name || activity.companyName;
        if (activityClientName) {
          const matches = activityClientName === user.client_name || activityClientName === user.companyName;
          return matches;
        }
        
        // Check if the activity was performed by a company user
        if (activity.user_email && companyUsers.length > 0) {
          const companyUserEmails = companyUsers.map(u => u.email).filter(Boolean);
          if (companyUserEmails.includes(activity.user_email)) {
            return true;
          }
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
    }
    
    // For regular users, filter activities to only show their own tickets' activities
    if (user?.role === 'user' && user?.uid) {
      // Get user's ticket IDs
      const userTicketIds = filteredTickets
        .filter(ticket => ticket.reporter_id === user.uid)
        .map(ticket => ticket.id);
      
      return activities.filter(activity => {
        // Only show activities for tickets owned by the user
        if (activity.ticket_id) {
          return userTicketIds.includes(activity.ticket_id);
        }
        return false;
      });
    }
    
    // For other roles (admin, support), return all activities
    return activities;
  }, [activities, user, companyUsers, tickets, filteredTickets]);

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
  if (loading || dashboardLoading) {
    return (
      <div className={`flex justify-center items-center h-screen ${bgClass}`}>
        <Spinner size="lg" />
        <span className={`ml-4 ${textClass}`}>Loading dashboard...</span>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className={`flex flex-col justify-center items-center h-screen ${bgClass}`}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className={`text-xl font-bold ${textClass} mb-2`}>Dashboard Error</h2>
        <p className={`${textClass} text-center max-w-md`}>
          {dashboardError}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300`} style={{
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Main content with top padding to account for fixed header */}
      <main className={`px-6 py-8 ${bgClass}`} style={{ paddingTop: '5px' }}>
        {/* Header Section */}
        <div className="mb-3">
          <h1 className="text-xl font-medium text-gray-600" style={{
            textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
            fontWeight: '500',
            opacity: '0.8'
          }}>
            {user?.role === 'site_admin' && user?.client_name 
              ? `${user.client_name} Dashboard` 
              : 'Overview'
            }
          </h1>
          {user?.role === 'site_admin' && user?.client_name && (
            <p className="text-sm text-gray-600 mt-1">
              Tickets and updates
            </p>
          )}
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
          {/* Stats Cards - Take 3 columns on the left */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                     {/* Total Active Tickets - All roles can see */}
           <a 
             href={user?.role === 'user' ? "/my-tickets" : "/all-tickets"}
             onClick={(e) => {
               e.preventDefault();
               navigateTo(user?.role === 'user' ? '/my-tickets' : '/all-tickets');
             }}
             className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
           >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="opacity-75 font-normal text-sm" style={{
                  textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                  fontWeight: '400',
                  opacity: '0.7'
                }}>{user?.role === 'user' ? 'My Tickets' : 'Total Tickets'}</p>
                <p className="text-2xl font-medium mt-1" style={{
                  textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                  fontWeight: '500',
                  opacity: '0.8'
                }}>{processedDashboardData.totalActiveTickets}</p>
                <div className="flex justify-end mt-1">
                  <p className="text-blue-500 text-xs font-normal">
                    {user?.role === 'user' ? 'All my tickets' : 'Active tickets'}
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                <Activity size={18} />
              </div>
            </div>
            {/* Hover indicator */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
                     {/* Open Tickets - All roles can see */}
           <a 
             href={user?.role === 'user' ? "/my-tickets?status=Open" : "/all-tickets?status=Open"}
             onClick={(e) => {
               e.preventDefault();
               navigateTo(user?.role === 'user' ? '/my-tickets?status=Open' : '/all-tickets?status=Open');
             }}
             className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
           >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="opacity-75 font-normal text-sm" style={{
                  textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                  fontWeight: '400',
                  opacity: '0.7'
                }}>Open Tickets</p>
                <p className="text-2xl font-medium mt-1" style={{
                  textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                  fontWeight: '500',
                  opacity: '0.8'
                }}>{processedDashboardData.openTickets}</p>
                <div className="flex justify-end mt-1">
                  <p className="text-orange-500 text-xs font-normal">
                    Need attention
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                <AlertCircle size={18} />
              </div>
            </div>
            {/* Hover indicator */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
                     {/* In Progress - All roles can see */}
           <a 
             href={user?.role === 'user' ? "/my-tickets?filter_status=In Progress" : "/all-tickets?filter_status=In Progress"}
             onClick={(e) => {
               e.preventDefault();
               navigateTo(user?.role === 'user' ? '/my-tickets?filter_status=In Progress' : '/all-tickets?filter_status=In Progress');
             }}
             className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
           >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="opacity-75 font-normal text-sm" style={{
                  textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                  fontWeight: '400',
                  opacity: '0.7'
                }}>In Progress</p>
                <p className="text-2xl font-medium mt-1" style={{
                  textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                  fontWeight: '500',
                  opacity: '0.8'
                }}>{processedDashboardData.inProgressTickets}</p>
                <div className="flex justify-end mt-1">
                  <p className="text-yellow-500 text-xs font-normal">
                    Being worked on
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                <Clock size={18} />
              </div>
            </div>
            {/* Hover indicator */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
                     {/* Resolved - For users only */}
           {user?.role === 'user' && (
             <a 
               href="/my-tickets?status=Resolved"
               onClick={(e) => {
                 e.preventDefault();
                 navigateTo('/my-tickets?status=Resolved');
               }}
               className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
             >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="opacity-75 font-normal text-sm" style={{
                    textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                    fontWeight: '400',
                    opacity: '0.7'
                  }}>Resolved</p>
                  <p className="text-2xl font-medium mt-1" style={{
                    textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                    fontWeight: '500',
                    opacity: '0.8'
                  }}>{processedDashboardData.statusCounts['Resolved'] || 0}</p>
                  <div className="flex justify-end mt-1">
                    <p className="text-green-500 text-xs font-normal">
                      Completed
                    </p>
                  </div>
                </div>
                <div className="text-gray-600">
                  <CheckCircle size={18} />
                </div>
              </div>
              {/* Hover indicator */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ExternalLink size={16} className="text-gray-500" />
              </div>
            </a>
          )}
          
                     {/* My Queue - Support and Engineers */}
           {(user?.role === 'support' || user?.role === 'engineer' || user?.role === 'senior_engineer' || user?.role === 'lead_engineer' || user?.role === 'principal_engineer') && (
             <a 
               href="/assigned-to-me"
               onClick={(e) => {
                 e.preventDefault();
                 navigateTo('/assigned-to-me');
               }}
               className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
             >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="opacity-75 font-normal text-sm" style={{
                    textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                    fontWeight: '400',
                    opacity: '0.7'
                  }}>My Queue</p>
                  <p className="text-2xl font-medium mt-1" style={{
                    textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                    fontWeight: '500',
                    opacity: '0.8'
                  }}>{processedDashboardData.assignedToMe}</p>
                  <div className="flex justify-end mt-1">
                    <p className="text-green-500 text-xs font-normal">
                      My tickets
                    </p>
                  </div>
                </div>
                <div className="text-gray-600">
                  <Users size={18} />
                </div>
              </div>
              {/* Hover indicator */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <ExternalLink size={16} className="text-gray-500" />
              </div>
            </a>
          )}
          
          {/* Avg Resolution - Admin/Super Admin/Site Admin - NOT CLICKABLE */}
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'site_admin') && (
            <div 
              className={`rounded-lg p-3 border hover:scale-100 transition duration-100 shadow-sm ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="opacity-75 font-normal text-sm" style={{
                    textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                    fontWeight: '400',
                    opacity: '0.7'
                  }}>Avg. Resolution</p>
                  <p className="text-2xl font-medium mt-1" style={{
                    textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                    fontWeight: '500',
                    opacity: '0.8'
                  }}>{processedDashboardData.avgResolutionTime}m</p>
                  <div className="flex justify-end mt-1">
                    <p className="text-purple-500 text-xs font-normal">
                      {user?.role === 'site_admin' ? 'Client avg' : 'Minutes avg'}
                    </p>
                  </div>
                </div>
                <div className="text-gray-600">
                  <TrendingUp size={18} />
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Status Distribution Chart - Takes 2 columns on the right */}
          <div className={`${cardClass} rounded-lg p-3 border shadow-xs lg:col-span-2`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-600" style={{
                textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                fontWeight: '500',
                opacity: '0.8'
              }}>Status Distribution</h3>
            </div>
            <div className="h-32">
              <StatusDistributionChart 
                data={{
                  open: processedDashboardData.statusCounts['Open'] || 0,
                  inProgress: processedDashboardData.statusCounts['In Progress'] || 0,
                  resolved: processedDashboardData.statusCounts['Resolved'] || 0,
                  completed: processedDashboardData.statusCounts['Completed'] || 0,
                  assigned: processedDashboardData.assignedToMe || 0,
                  total: processedDashboardData.totalActiveTickets
                }}
                darkMode={darkMode}
              />
            </div>
          </div>
        </div>




        {/* System Updates Section */}
        <div className="mb-4">
          <UpdatesComponent
            user={user}
            activities={filteredActivities}
            tickets={processedDashboardData.recentTickets}
            darkMode={darkMode}
            onNavigateTo={navigateTo}
            onMarkAsRead={(update) => {
              if (update.type === 'activity') {
                markActivityAsRead(update.id.replace('activity-', ''));
              } else if (update.type === 'ticket') {
                markTicketAsRead(update.id.replace('ticket-', ''));
              }
            }}
            onMarkAllAsRead={(updates) => {
              markAllUpdatesAsRead(updates);
            }}
            onMarkAsUnread={(update) => {
              if (update.type === 'activity') {
                // Handle marking activity as unread
                const activityId = update.id.replace('activity-', '');
                const newActivities = new Set(readActivities);
                newActivities.delete(activityId);
                setReadActivities(newActivities);
                localStorage.setItem('dashboard_readActivities', JSON.stringify(Array.from(newActivities)));
              } else if (update.type === 'ticket') {
                // Handle marking ticket as unread
                const ticketId = update.id.replace('ticket-', '');
                const newTickets = new Set(readTickets);
                newTickets.delete(ticketId);
                setReadTickets(newTickets);
                localStorage.setItem('dashboard_readTickets', JSON.stringify(Array.from(newTickets)));
              }
            }}
            readStates={{
              activities: readActivities,
              tickets: readTickets
            }}
            showRead={showReadActivities}
          />
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
            className={`${cardClass} rounded-lg border theme-elevation-shadow`}
            style={{
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div className="mb-3 px-3 pt-3">
              <h2 className="font-normal text-gray-500 mb-3" style={{
                textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                fontWeight: '400',
                opacity: '0.7'
              }}>
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
                  <CompactDropdown
                    value={selectedTimePeriod}
                    onChange={setSelectedTimePeriod}
                    options={[
                      { value: "1", label: "1 Day" },
                      { value: "7", label: "7 Days" },
                      { value: "30", label: "1 Month" },
                      { value: "90", label: "3 Months" },
                      { value: "180", label: "6 Months" },
                      { value: "custom", label: "Custom" }
                    ]}
                    className="min-w-[100px]"
                  />
                </div>
                {/* Client Filter - hide for site_admin */}
                {(user?.role !== 'site_admin') && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Client:</label>
                  <CompactDropdown
                    value={selectedCompany}
                    onChange={setSelectedCompany}
                    options={[
                      { value: "All", label: "All" },
                      ...availableCompanies.map(company => ({
                        value: company,
                        label: company
                      }))
                    ]}
                    className="min-w-[120px]"
                  />
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
                  {processedDashboardData.volumeTrend.reduce((sum, day) => sum + day.volume, 0)}
                </span> total tickets in selected period
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-black">
                  {Math.round(processedDashboardData.volumeTrend.reduce((sum, day) => sum + day.volume, 0) / Math.max(processedDashboardData.volumeTrend.length, 1) * 10) / 10}
                </span> avg per day
              </div>
            </div>
            <div className="w-full">
              {processedDashboardData.volumeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart 
                  data={processedDashboardData.volumeTrend} 
                  animationDuration={0}
                  margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
                  isAnimationActive={false}
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
                      boxShadow: '0px 0px 1px 0px rgba(var(--theme-color-elevation-shadow-rgb), 0.3), 0px 1px 3px 1px rgba(var(--theme-color-elevation-shadow-rgb), 0.15)'
                    } : {
                      backgroundColor: 'white',
                      borderColor: '#e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0px 0px 1px 0px rgba(var(--theme-color-elevation-shadow-rgb), 0.3), 0px 1px 3px 1px rgba(var(--theme-color-elevation-shadow-rgb), 0.15)'
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
                    animationDuration={0}
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
            className={`${cardClass} rounded-lg p-3 border theme-elevation-shadow`}
            style={{
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div className="mb-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-normal text-gray-500 mb-3" style={{
                    textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                    fontWeight: '400',
                    opacity: '0.7'
                  }}>
                    
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
                      <span className="font-semibold">{processedDashboardData.totalResolvedTickets} Resolved</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold">{processedDashboardData.avgResolutionTime}m Avg</span>
                    </div>
                  </div>
                </div>
                {/* Filters - Organized in rows */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Time Period Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Period:</label>
                    <CompactDropdown
                      value={resolutionTimePeriod}
                      onChange={setResolutionTimePeriod}
                      options={[
                        { value: "1", label: "1 Day" },
                        { value: "7", label: "7 Days" },
                        { value: "30", label: "1 Month" },
                        { value: "90", label: "3 Months" },
                        { value: "180", label: "6 Months" },
                        { value: "custom", label: "Custom" }
                      ]}
                      className="min-w-[100px]"
                    />
                  </div>
                  {/* Client Filter - hide for site_admin */}
                  {(user?.role !== 'site_admin') && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Client:</label>
                    <CompactDropdown
                      value={resolutionTimeCompany || (availableCompanies.length > 0 ? availableCompanies[0] : '')}
                      onChange={setResolutionTimeCompany}
                      options={availableCompanies.map(company => ({
                        value: company,
                        label: company
                      }))}
                      className="min-w-[120px]"
                    />
                    <span className="text-xs text-gray-400">({availableCompanies.length} companies)</span>
                  </div>
                  )}
                  {/* Clear Filters Button - Only show when filters are changed from defaults */}
                  {(resolutionTimePeriod !== '7' || resolutionTimeCompany !== (availableCompanies.length > 0 ? availableCompanies[0] : '') || resolutionTimeStartDate || resolutionTimeEndDate) && (
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
              {processedDashboardData.resolutionTimes.length > 0 ? (
                processedDashboardData.resolutionTimes.map((metric, index) => {
                  const colors = [
                    'from-blue-500 to-blue-600',
                    'from-green-500 to-green-600', 
                    'from-orange-500 to-orange-600'
                  ];
                  
                  return (
                    <div key={index} className="flex-1 relative overflow-hidden bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 theme-elevation-shadow hover:shadow-md transition-all duration-300 group">
                      <div className="p-2">
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-[10px] font-semibold uppercase tracking-wide text-gray-500`}>
                            {metric.metric}
                          </div>
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${colors[index]} flex items-center justify-center theme-elevation-shadow`}>
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
            {processedDashboardData.resolutionTimeDistribution.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Time Distribution</h3>
                <div className="h-48">
                  <ChartBar
                    data={{
                      labels: processedDashboardData.resolutionTimeDistribution.map(item => item.range),
                      datasets: [
                        {
                          label: 'Number of Tickets',
                          data: processedDashboardData.resolutionTimeDistribution.map(item => item.count),
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
                              const percentage = processedDashboardData.resolutionTimeDistribution[context.dataIndex]?.percentage || 0;
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