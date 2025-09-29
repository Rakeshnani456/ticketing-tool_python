// Custom hook for centralized data management with websockets and caching
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DataManager } from '../utils/firebaseOptimizer';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { dbClient } from '../config/firebase';

/**
 * Fallback function to get tickets data directly from Firebase when WebSocket is not available
 */
const getTicketsFallback = async (userId, options = {}) => {
    try {
        const { userRole, clientName } = options;
        const ticketsRef = collection(dbClient, 'tickets');
        let ticketsQuery;

        // Apply role-based filtering
        if (userRole === 'site_admin' && clientName) {
            ticketsQuery = query(ticketsRef, where('client_name', '==', clientName), orderBy('created_at', 'desc'), limit(100));
        } else if (userRole === 'user') {
            ticketsQuery = query(ticketsRef, where('reporter_id', '==', userId), orderBy('created_at', 'desc'), limit(100));
        } else {
            ticketsQuery = query(ticketsRef, orderBy('created_at', 'desc'), limit(100));
        }

        const snapshot = await getDocs(ticketsQuery);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.() || new Date(),
            updated_at: doc.data().updated_at?.toDate?.() || new Date(),
        }));
    } catch (error) {
        console.error('Fallback tickets query failed:', error);
        return null;
    }
};

/**
 * Fallback function to get ticket counts data directly from Firebase when WebSocket is not available
 */
const getTicketCountsFallback = async (userId, options = {}) => {
    try {
        const tickets = await getTicketsFallback(userId, options);
        if (!tickets) return null;
        
        const totalTickets = tickets.length;
        const activeTickets = tickets.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length;
        const assignedToMeTickets = tickets.filter(t => t.assigned_to_id === userId && !['Closed', 'Resolved'].includes(t.status)).length;

        return {
            total_tickets: totalTickets,
            active_tickets: activeTickets,
            assigned_to_me: assignedToMeTickets
        };
    } catch (error) {
        console.error('Fallback ticket counts query failed:', error);
        return null;
    }
};

/**
 * Custom hook for managing data with websockets and caching
 * This replaces direct Firebase onSnapshot calls with centralized data management
 */
export const useDataManager = (dataType, userId, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const subscriptionIdRef = useRef(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (subscriptionIdRef.current) {
                DataManager.unsubscribe(dataType, subscriptionIdRef.current);
            }
        };
    }, [dataType]);

    // Main effect to set up data fetching and subscription
    useEffect(() => {
        if (!userId || !dataType) {
            setLoading(false);
            return;
        }

        // Clean up existing subscription
        if (subscriptionIdRef.current) {
            DataManager.unsubscribe(dataType, subscriptionIdRef.current);
        }

        // Subscribe to real-time updates (but don't force immediate fetch)
        subscriptionIdRef.current = DataManager.subscribe(dataType, (newData) => {
            if (isMountedRef.current) {
                setData(newData);
                setLoading(false);
                setError(null);
            }
        }, { ...options, useCache: true }); // Use cache during WebSocket reconnections

        // Try to get cached data first
        const getInitialData = async () => {
            try {
                const cachedData = await DataManager.getData(dataType, userId, options);
                
                if (cachedData && isMountedRef.current) {
                    setData(cachedData);
                    setLoading(false);
                } else if (isMountedRef.current) {
                    // If no cached data and websocket not available, try direct Firebase query as fallback
                    if (dataType === 'tickets') {
                        const fallbackData = await getTicketsFallback(userId, options);
                        if (fallbackData && isMountedRef.current) {
                            setData(fallbackData);
                        }
                    } else if (dataType === 'ticket_counts') {
                        const fallbackData = await getTicketCountsFallback(userId, options);
                        if (fallbackData && isMountedRef.current) {
                            setData(fallbackData);
                        }
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMountedRef.current) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        getInitialData();
    }, [dataType, userId, options]); // Keep options but memoize them in the calling hooks

    // Refresh data manually
    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        // Clear cache and fetch fresh data
        DataManager.clearUserCache(userId);
        
        try {
            if (dataType === 'tickets') {
                const fallbackData = await getTicketsFallback(userId, options);
                if (fallbackData && isMountedRef.current) {
                    setData(fallbackData);
                }
            } else if (dataType === 'ticket_counts') {
                const fallbackData = await getTicketCountsFallback(userId, options);
                if (fallbackData && isMountedRef.current) {
                    setData(fallbackData);
                }
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err.message);
            }
        }
        
        setLoading(false);
    }, [dataType, userId, options]);

    return {
        data,
        loading,
        error,
        refresh
    };
};

/**
 * Hook specifically for ticket data
 */
export const useTickets = (userId, userRole, clientName) => {
    const options = useMemo(() => ({
        userRole,
        clientName,
        limit: 100
    }), [userRole, clientName]);
    
    return useDataManager('tickets', userId, options);
};

/**
 * Hook specifically for ticket counts
 */
export const useTicketCounts = (userId, userRole) => {
    const options = useMemo(() => ({
        userRole
    }), [userRole]);
    
    return useDataManager('ticket_counts', userId, options);
};

/**
 * Hook specifically for dashboard data
 */
export const useDashboardData = (userId, userRole, clientName) => {
    const options = {
        userRole,
        clientName,
        includeUsers: true
    };
    
    return useDataManager('dashboard_data', userId, options);
};

/**
 * Hook specifically for notifications
 */
export const useNotifications = (userId) => {
    return useDataManager('notifications', userId);
};

export default useDataManager;
