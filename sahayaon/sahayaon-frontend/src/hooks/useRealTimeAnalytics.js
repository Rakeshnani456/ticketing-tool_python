import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import websocketClient from '../utils/websocketClient';
import { API_BASE_URL } from '../config/constants';

export const useRealTimeAnalytics = (user, filters) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const subscriptionId = useRef(`analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const filtersRef = useRef(filters);

  // Memoize filters to prevent unnecessary re-subscriptions
  const memoizedFilters = useMemo(() => ({
    dateRange: filters.dateRange,
    clients: filters.clients,
    status: filters.status,
    priority: filters.priority
  }), [
    filters.dateRange,
    filters.clients,
    filters.status,
    filters.priority
  ]);

  // Check if filters have actually changed
  const filtersChanged = useMemo(() => {
    if (!filtersRef.current) return true;
    
    const currentFilters = JSON.stringify(memoizedFilters);
    const previousFilters = JSON.stringify(filtersRef.current);
    
    return currentFilters !== previousFilters;
  }, [memoizedFilters]);

  // Fallback function to fetch data via regular API
  const fetchDataViaAPI = useCallback(async () => {
    if (!user?.firebaseUser?.getIdToken) {
      throw new Error('User authentication not available');
    }

    try {
      const idToken = await user.firebaseUser.getIdToken();
      const params = new URLSearchParams({
        dateRange: memoizedFilters.dateRange || '30d',
        clients: memoizedFilters.clients ? memoizedFilters.clients.join(',') : '',
        status: memoizedFilters.status || 'all',
        priority: memoizedFilters.priority || 'all'
      });

      const response = await fetch(`${API_BASE_URL}/analytics/tickets?${params}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setLoading(false);
      setError(null);
      return result;
    } catch (error) {
      console.error('Error fetching analytics data via API:', error);
      setError(error.message);
      setLoading(false);
      throw error;
    }
  }, [user, memoizedFilters]);

  // Subscribe to real-time analytics
  const subscribe = useCallback(async () => {
    if (!user || !websocketClient.isConnected) {
      console.log('WebSocket not available, falling back to API calls');
      // Fallback to regular API calls
      await fetchDataViaAPI();
      return false;
    }

    try {
      // Unsubscribe from previous subscription if filters changed
      if (filtersChanged && filtersRef.current) {
        websocketClient.unsubscribeFromAnalytics(subscriptionId.current);
      }

      // Subscribe to new analytics stream
      const success = websocketClient.subscribeToAnalytics(
        memoizedFilters,
        subscriptionId.current
      );

      if (success) {
        filtersRef.current = memoizedFilters;
        console.log('Successfully subscribed to real-time analytics');
        return true;
      }
    } catch (error) {
      console.error('Error subscribing to analytics:', error);
      // Fallback to API if WebSocket subscription fails
      await fetchDataViaAPI();
    }

    return false;
  }, [user, memoizedFilters, filtersChanged, fetchDataViaAPI]);

  // Unsubscribe from analytics
  const unsubscribe = useCallback(() => {
    websocketClient.unsubscribeFromAnalytics(subscriptionId.current);
    console.log('Unsubscribed from real-time analytics');
  }, []);

  // Handle WebSocket connection status
  useEffect(() => {
    const handleConnectionChange = (connected) => {
      setIsConnected(connected);
      // OPTIMIZED: Don't automatically re-subscribe on every connection change
      // Let the smart cache manager handle data fetching
      if (connected) {
        console.log('🌐 WebSocket reconnected - using cached data instead of re-subscribing');
        // Only re-subscribe if we don't have any data yet
        if (!data) {
          console.log('📊 No cached data available, subscribing to analytics');
          subscribe();
        }
      }
    };

    // Listen for WebSocket connection changes
    websocketClient.addListener('connection_change', handleConnectionChange);
    
    // Check initial connection status
    setIsConnected(websocketClient.isConnected);

    return () => {
      websocketClient.removeListener('connection_change', handleConnectionChange);
    };
  }, [subscribe, data]);

  // Handle analytics updates
  useEffect(() => {
    const handleAnalyticsUpdate = (updateData) => {
      console.log('Received real-time analytics update:', updateData);
      
      if (updateData.data) {
        setData(updateData.data);
        setLastUpdate(new Date(updateData.timestamp));
        setLoading(false);
        setError(null);
      }
    };

    const handleAnalyticsSubscribed = (subscriptionData) => {
      console.log('Analytics subscription confirmed:', subscriptionData);
      if (subscriptionData.subscriptionId === subscriptionId.current) {
        setIsConnected(true);
      }
    };

    const handleWebSocketError = (errorData) => {
      console.error('WebSocket error in analytics:', errorData);
      setError('Connection error: ' + errorData.message);
    };

    // Add listeners for analytics events
    websocketClient.addListener('analytics_update', handleAnalyticsUpdate);
    websocketClient.addListener('analytics_subscribed', handleAnalyticsSubscribed);
    websocketClient.addListener('websocket_error', handleWebSocketError);

    return () => {
      websocketClient.removeListener('analytics_update', handleAnalyticsUpdate);
      websocketClient.removeListener('analytics_subscribed', handleAnalyticsSubscribed);
      websocketClient.removeListener('websocket_error', handleWebSocketError);
    };
  }, []);

  // Subscribe/unsubscribe when filters change
  useEffect(() => {
    if (filtersChanged) {
      console.log('Filters changed, updating subscription...');
      subscribe();
    }
  }, [filtersChanged, subscribe]);

  // Initial data loading - always try to load data initially
  useEffect(() => {
    if (user) {
      console.log('Initial data load for user:', user.uid);
      // Always try to load initial data, regardless of WebSocket status
      subscribe();
    }
  }, [user, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  // Manual refresh function (fallback)
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try WebSocket first, fallback to API
      await subscribe();
    } catch (error) {
      console.error('Error during refresh:', error);
      // If both fail, try API directly
      await fetchDataViaAPI();
    }
  }, [subscribe, fetchDataViaAPI]);

  // Get connection status
  const connectionStatus = useMemo(() => ({
    isConnected,
    lastUpdate,
    subscriptionId: subscriptionId.current,
    filters: memoizedFilters
  }), [isConnected, lastUpdate, memoizedFilters]);

  return {
    data,
    loading,
    error,
    connectionStatus,
    refresh,
    subscribe,
    unsubscribe
  };
};
