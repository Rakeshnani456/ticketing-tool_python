// src/components/UserDashboardComponent.js
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
import UpdatesComponent from './common/UpdatesComponent';
import { collection, query, orderBy, limit, getFirestore, where, onSnapshot } from 'firebase/firestore';
import Spinner from './common/Spinner';
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

const UserDashboardComponent = ({ user, navigateTo, showFlashMessage }) => {
  // State management
  const [tickets, setTickets] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showReadActivities, setShowReadActivities] = useState(true);
  const [showReadTickets, setShowReadTickets] = useState(true);
  const [originalActivities, setOriginalActivities] = useState([]);

  // Dashboard data hook
  const { 
    data: dashboardData, 
    loading: dashboardLoading, 
    error: dashboardError 
  } = useDashboardData(user?.uid, user?.role, user?.client_name);

  // Utility function for timestamp formatting
  const formatTimestamp = useCallback((timestamp, format = 'relative') => {
    let safeTimestamp = timestamp;
    
    if (!(safeTimestamp instanceof Date)) {
      if (safeTimestamp && typeof safeTimestamp === 'object' && safeTimestamp.toDate) {
        safeTimestamp = safeTimestamp.toDate();
      } else if (safeTimestamp && typeof safeTimestamp === 'string') {
        safeTimestamp = new Date(safeTimestamp);
      } else if (safeTimestamp && typeof safeTimestamp === 'number') {
        safeTimestamp = new Date(safeTimestamp);
      } else {
        return 'Invalid date';
      }
    }
    
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

  // Load read states from database
  useEffect(() => {
    const loadReadStates = async () => {
      try {
        const readStates = await readStatesService.getReadStates();
        const dbShowReadActivities = readStates.showReadActivities !== undefined ? readStates.showReadActivities : true;
        const dbShowReadTickets = readStates.showReadTickets !== undefined ? readStates.showReadTickets : true;
        
        setShowReadActivities(dbShowReadActivities);
        setShowReadTickets(dbShowReadTickets);
      } catch (error) {
        console.error('Error loading read states:', error);
      }
    };

    loadReadStates();
  }, []);

  // Fetch user's tickets
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user?.firebaseUser || !dbClient) return;

      try {
        setLoading(true);
        const db = dbClient;
        
        // Query only tickets created by the current user
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('reporter_id', '==', user.uid),
          orderBy('created_at', 'desc')
        );

        const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
          const userTickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTickets(userTickets);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching user tickets:', error);
        setLoading(false);
      }
    };

    fetchUserTickets();
  }, [user?.firebaseUser, user?.uid, dbClient]);

  // Filter tickets to only show user's own tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => ticket.reporter_id === user?.uid);
  }, [tickets, user?.uid]);

  // Calculate metrics for user's tickets only
  const userMetrics = useMemo(() => {
    const statusCounts = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    
    const totalTickets = filteredTickets.length;
    const openTickets = statusCounts['Open'] || 0;
    const inProgressTickets = statusCounts['In Progress'] || 0;
    const resolvedTickets = statusCounts['Resolved'] || 0;
    const closedTickets = statusCounts['Closed'] || 0;
    
    // Calculate average resolution time for resolved/closed tickets
    const resolvedTicketsWithTime = filteredTickets.filter(ticket => 
      (ticket.status === 'Resolved' || ticket.status === 'Closed') && 
      ticket.resolved_at
    );
    
    let avgResolutionTime = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalResolutionTime = resolvedTicketsWithTime.reduce((acc, ticket) => {
        const created = new Date(ticket.created_at);
        const resolved = new Date(ticket.resolved_at);
        return acc + (resolved - created);
      }, 0);
      avgResolutionTime = Math.round(totalResolutionTime / (1000 * 60 * 60 * 24)); // Convert to days
    }

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      avgResolutionTime,
      statusCounts
    };
  }, [filteredTickets]);

  // Process data for charts
  const chartData = useMemo(() => {
    // Status distribution for doughnut chart
    const statusData = {
      labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
      datasets: [{
        data: [
          userMetrics.openTickets,
          userMetrics.inProgressTickets,
          userMetrics.resolvedTickets,
          userMetrics.closedTickets
        ],
        backgroundColor: [
          '#f59e0b', // Orange for Open
          '#3b82f6', // Blue for In Progress
          '#10b981', // Green for Resolved
          '#6b7280'  // Gray for Closed
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    };

    // Monthly ticket creation data for bar chart
    const monthlyData = filteredTickets.reduce((acc, ticket) => {
      const date = new Date(ticket.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = 0;
      }
      acc[monthKey]++;
      return acc;
    }, {});

    const monthlyChartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        tickets: count
      }));

    return {
      statusData,
      monthlyChartData
    };
  }, [filteredTickets, userMetrics]);

  // Load activities for updates section
  useEffect(() => {
    const fetchActivities = async () => {
      if (!user?.firebaseUser || !dbClient || filteredTickets.length === 0) {
        setActivities([]);
        setOriginalActivities([]);
        return;
      }

      try {
        const db = dbClient;
        const ticketIds = filteredTickets.map(t => t.id);
        
        // Only query if we have ticket IDs
        if (ticketIds.length === 0) {
          setActivities([]);
          setOriginalActivities([]);
          return;
        }
        
        console.log('Fetching activities for ticket IDs:', ticketIds);
        
        // First, let's try a simpler query without orderBy to see if that's the issue
        let activitiesQuery;
        try {
          activitiesQuery = query(
            collection(db, 'activities'),
            where('ticket_id', 'in', ticketIds),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
        } catch (error) {
          console.log('OrderBy failed, trying without orderBy:', error);
          // If orderBy fails, try without it
          activitiesQuery = query(
            collection(db, 'activities'),
            where('ticket_id', 'in', ticketIds),
            limit(10)
          );
        }

        const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
          const userActivities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Fetched activities:', userActivities);
          console.log('Activities count:', userActivities.length);
          
          // If no activities found, let's also try a broader query to see if there are any activities at all
          if (userActivities.length === 0) {
            console.log('No activities found, checking if there are any activities in the database...');
            // This is just for debugging - we'll query all activities to see the structure
            const debugQuery = query(collection(db, 'activities'), limit(5));
            onSnapshot(debugQuery, (debugSnapshot) => {
              const allActivities = debugSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              console.log('Sample activities from database:', allActivities);
              console.log('Looking for ticket_id field in activities...');
              if (allActivities.length > 0) {
                console.log('Sample activity structure:', allActivities[0]);
                console.log('Available fields:', Object.keys(allActivities[0]));
              }
            });
          }
          
          setActivities(userActivities);
          setOriginalActivities(userActivities);
        }, (error) => {
          console.error('Error in activities snapshot:', error);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
        setOriginalActivities([]);
      }
    };

    fetchActivities();
  }, [filteredTickets, user?.firebaseUser, dbClient]);

  // Filter activities based on read state
  const filteredActivities = useMemo(() => {
    if (!showReadActivities) {
      return activities.filter(activity => !activity.isRead);
    }
    return activities;
  }, [activities, showReadActivities]);

  const bgClass = darkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-screen ${bgClass}`}>
        <RefreshCw className="animate-spin h-12 w-12 text-blue-500" />
        <span className={`ml-4 ${textClass}`}>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} ${textClass} transition-colors duration-300`} style={{
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Main content */}
      <main className={`px-6 py-8 ${bgClass}`} style={{ paddingTop: '5px' }}>
        {/* Header Section */}
        <div className="mb-3">
          <h1 className="text-xl font-medium text-gray-600" style={{
            textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
            fontWeight: '500',
            opacity: '0.8'
          }}>
            My Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Your tickets and updates
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Total Tickets */}
          <a 
            href="/my-tickets"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/my-tickets');
            }}
            className={`rounded-lg p-3 border cursor-pointer transition-all duration-200 hover:scale-100 transition duration-100 group relative shadow-sm block ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="opacity-75 font-normal text-sm" style={{
                  textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                  fontWeight: '400',
                  opacity: '0.7'
                }}>Total Tickets</p>
                <p className="text-2xl font-medium mt-1" style={{
                  textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                  fontWeight: '500',
                  opacity: '0.8'
                }}>{userMetrics.totalTickets}</p>
                <div className="flex justify-end mt-1">
                  <p className="text-blue-500 text-xs font-normal">
                    All tickets
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                <Activity size={18} />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
          {/* In Progress */}
          <a 
            href="/my-tickets?status=In Progress"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/my-tickets?status=In Progress');
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
                }}>{userMetrics.inProgressTickets}</p>
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
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
          {/* Resolved */}
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
                }}>{userMetrics.resolvedTickets}</p>
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
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ExternalLink size={16} className="text-gray-500" />
            </div>
          </a>
          
          {/* Average Resolution Time */}
          <div className={`rounded-lg p-3 border shadow-sm ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="opacity-75 font-normal text-sm" style={{
                  textShadow: '0.1px 0.1px 0.2px rgba(0,0,0,0.03)',
                  fontWeight: '400',
                  opacity: '0.7'
                }}>Avg Resolution</p>
                <p className="text-2xl font-medium mt-1" style={{
                  textShadow: '0.2px 0.2px 0.4px rgba(0,0,0,0.05)',
                  fontWeight: '500',
                  opacity: '0.8'
                }}>{userMetrics.avgResolutionTime}d</p>
                <div className="flex justify-end mt-1">
                  <p className="text-purple-500 text-xs font-normal">
                    Average time
                  </p>
                </div>
              </div>
              <div className="text-gray-600">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className={`rounded-lg p-4 border mb-6 ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Updates</h3>
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showReadActivities}
                  onChange={(e) => setShowReadActivities(e.target.checked)}
                  className="mr-2"
                />
                Show read updates
              </label>
            </div>
          </div>
          
          {/* Debug info - remove this in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
              <p>Debug: Tickets: {filteredTickets.length}, Activities: {activities.length}, Filtered: {filteredActivities.length}</p>
            </div>
          )}
          
          {filteredActivities.length > 0 ? (
            <UpdatesComponent 
              activities={filteredActivities}
              tickets={filteredTickets}
              user={user}
              showFlashMessage={showFlashMessage}
              formatTimestamp={formatTimestamp}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No recent updates for your tickets</p>
              <p className="text-sm text-gray-400 mt-2">
                {filteredTickets.length > 0 
                  ? "Updates will appear here when there are changes to your tickets"
                  : "Create a ticket to see updates here"
                }
              </p>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status Distribution Chart */}
          <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Ticket Status Distribution</h3>
            <div className="h-64">
              <Doughnut 
                data={chartData.statusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Monthly Tickets Chart */}
          <div className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-800/70 border-gray-400' : 'bg-white border-gray-300'}`}>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Tickets Created (Last 6 Months)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboardComponent;
