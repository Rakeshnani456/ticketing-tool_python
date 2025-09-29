// Firebase optimization utilities

/**
 * Cache management for Firebase data
 */
export class FirebaseCache {
    static CACHE_DURATIONS = {
        TICKET_COUNTS: 10 * 60 * 1000,     // 10 minutes
        DASHBOARD_DATA: 5 * 60 * 1000,     // 5 minutes
        MY_TICKETS: 5 * 60 * 1000,         // 5 minutes
        ALL_TICKETS: 5 * 60 * 1000,        // 5 minutes
        TICKET_DETAIL: 2 * 60 * 1000,      // 2 minutes
        USER_DATA: 10 * 60 * 1000,         // 10 minutes
        ACTIVITIES: 5 * 60 * 1000,         // 5 minutes
        NOTIFICATIONS: 2 * 60 * 1000,      // 2 minutes
    };

    /**
     * Get cached data if it exists and is still valid
     */
    static getCachedData(key, duration = this.CACHE_DURATIONS.TICKET_COUNTS) {
        try {
            const cachedData = localStorage.getItem(key);
            const cacheTime = localStorage.getItem(`${key}_time`);
            const now = Date.now();

            if (cachedData && cacheTime && (now - parseInt(cacheTime)) < duration) {
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.warn('Failed to get cached data:', error);
        }
        return null;
    }

    /**
     * Set cached data with timestamp
     */
    static setCachedData(key, data) {
        try {
            const now = Date.now();
            localStorage.setItem(key, JSON.stringify(data));
            localStorage.setItem(`${key}_time`, now.toString());
        } catch (error) {
            console.warn('Failed to set cached data:', error);
        }
    }

    /**
     * Clear all cached data
     */
    static clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('_tickets_') || key.includes('dashboard_') || key.includes('ticket_detail_')) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(`${key}_time`);
                }
            });
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }

    /**
     * Clear cache for specific user
     */
    static clearUserCache(userId) {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes(userId)) {
                    localStorage.removeItem(key);
                    localStorage.removeItem(`${key}_time`);
                }
            });
        } catch (error) {
            console.warn('Failed to clear user cache:', error);
        }
    }
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
    /**
     * Create optimized query with proper limits and filters
     */
    static createOptimizedQuery(collectionRef, options = {}) {
        const {
            filters = [],
            orderByField = 'created_at',
            orderDirection = 'desc',
            limitCount = 50,
            includeDeleted = false
        } = options;

        let query = collectionRef;

        // Apply filters
        filters.forEach(filter => {
            if (filter.field && filter.operator && filter.value !== undefined) {
                query = query.where(filter.field, filter.operator, filter.value);
            }
        });

        // Apply ordering
        if (orderByField) {
            query = query.orderBy(orderByField, orderDirection);
        }

        // Apply limit
        if (limitCount > 0) {
            query = query.limit(limitCount);
        }

        return query;
    }

    /**
     * Create paginated query
     */
    static createPaginatedQuery(collectionRef, pageSize = 20, lastDoc = null, options = {}) {
        let query = this.createOptimizedQuery(collectionRef, { ...options, limitCount: pageSize });

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        return query;
    }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
    static limits = new Map();

    /**
     * Check if operation is allowed based on rate limit
     */
    static isAllowed(key, maxRequests = 10, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!this.limits.has(key)) {
            this.limits.set(key, []);
        }

        const requests = this.limits.get(key);
        
        // Remove old requests outside the window
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        this.limits.set(key, recentRequests);

        if (recentRequests.length >= maxRequests) {
            return false;
        }

        recentRequests.push(now);
        return true;
    }

    /**
     * Clear rate limit for a specific key
     */
    static clearLimit(key) {
        this.limits.delete(key);
    }
}

/**
 * Firebase performance monitoring
 */
export class FirebasePerformance {
    static readCounts = new Map();

    /**
     * Track read operation
     */
    static trackRead(operation, count = 1) {
        if (!this.readCounts.has(operation)) {
            this.readCounts.set(operation, 0);
        }
        this.readCounts.set(operation, this.readCounts.get(operation) + count);
    }

    /**
     * Get read statistics
     */
    static getReadStats() {
        const stats = {};
        this.readCounts.forEach((count, operation) => {
            stats[operation] = count;
        });
        return stats;
    }

    /**
     * Reset read statistics
     */
    static resetReadStats() {
        this.readCounts.clear();
    }

    /**
     * Log read statistics to console
     */
    static logReadStats() {
        const stats = this.getReadStats();
        console.log('Firebase Read Statistics:', stats);
        return stats;
    }
}

/**
 * Main optimization class
 */
export class FirebaseOptimizer {
    /**
     * Optimize query based on user role and context
     */
    static optimizeQuery(user, queryType, options = {}) {
        const baseOptions = {
            limitCount: 50,
            ...options
        };

        // Role-based optimizations
        switch (user?.role) {
            case 'site_admin':
                if (user.client_name && queryType === 'tickets') {
                    baseOptions.filters = [
                        { field: 'client_name', operator: '==', value: user.client_name }
                    ];
                }
                break;
            case 'user':
                if (queryType === 'tickets') {
                    baseOptions.filters = [
                        { field: 'reporter_id', operator: '==', value: user.uid }
                    ];
                }
                break;
        }

        return baseOptions;
    }

    /**
     * Get cache key for data
     */
    static getCacheKey(type, userId, ...additionalKeys) {
        const keys = [type, userId, ...additionalKeys.filter(Boolean)];
        return keys.join('_');
    }

    /**
     * Check if data should be cached
     */
    static shouldCache(type) {
        const cacheableTypes = [
            'ticket_counts',
            'dashboard_data',
            'my_tickets',
            'all_tickets',
            'ticket_detail',
            'user_data'
        ];
        return cacheableTypes.includes(type);
    }
}

/**
 * Centralized Data Manager - Single source of truth for all Firebase data
 */
export class DataManager {
    static listeners = new Map();
    static cache = new Map();
    static websocketClient = null;
    static subscribers = new Map();

    /**
     * Initialize the data manager with websocket client
     */
    static initialize(wsClient) {
        this.websocketClient = wsClient;
        this.lastConnectionState = false;
        
        // Set up websocket listeners for real-time updates
        if (wsClient) {
            wsClient.addListener('ticket_update', (data) => {
                this.handleTicketUpdate(data);
            });
            wsClient.addListener('user_update', (data) => {
                this.handleUserUpdate(data);
            });
            wsClient.addListener('notification_update', (data) => {
                this.handleNotificationUpdate(data);
            });
            
            // Handle data responses from server
            wsClient.addListener('data_tickets', (data) => {
                this.handleDataResponse('tickets', data);
            });
            wsClient.addListener('data_ticket_counts', (data) => {
                this.handleDataResponse('ticket_counts', data);
            });
            wsClient.addListener('data_dashboard_data', (data) => {
                this.handleDataResponse('dashboard_data', data);
            });
            wsClient.addListener('data_notifications', (data) => {
                this.handleDataResponse('notifications', data);
            });
            
            // Handle connection changes more intelligently
            wsClient.addListener('connection_change', (connected) => {
                this.handleConnectionChange(connected);
            });
        }
    }

    /**
     * Handle WebSocket connection changes intelligently
     */
    static handleConnectionChange(connected) {
        const wasConnected = this.lastConnectionState;
        this.lastConnectionState = connected;
        
        if (connected && !wasConnected) {
            console.log('🌐 WebSocket reconnected - using cached data, not triggering fresh fetches');
            // Don't trigger fresh data fetches on reconnection
            // Let components use cached data and only fetch when needed
        } else if (!connected && wasConnected) {
            console.log('🌐 WebSocket disconnected - components will use cached data');
        }
    }

    /**
     * Subscribe to data updates
     */
    static subscribe(dataType, callback, options = {}) {
        const subscriptionId = `${dataType}_${Date.now()}_${Math.random()}`;
        
        if (!this.subscribers.has(dataType)) {
            this.subscribers.set(dataType, new Map());
        }
        
        this.subscribers.get(dataType).set(subscriptionId, { callback, options });
        
        // Return subscription ID for cleanup
        return subscriptionId;
    }

    /**
     * Unsubscribe from data updates
     */
    static unsubscribe(dataType, subscriptionId) {
        if (this.subscribers.has(dataType)) {
            this.subscribers.get(dataType).delete(subscriptionId);
        }
    }

    /**
     * Notify all subscribers of data changes
     */
    static notifySubscribers(dataType, data) {
        if (this.subscribers.has(dataType)) {
            this.subscribers.get(dataType).forEach(({ callback }) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in data subscriber callback:', error);
                }
            });
        }
    }

    /**
     * Handle ticket updates from websocket
     */
    static handleTicketUpdate(data) {
        console.log('🎫 Processing ticket update from WebSocket:', data);
        
        // Update cache with timestamp
        const now = Date.now();
        this.cache.set('tickets', { data: data.tickets, timestamp: now });
        this.cache.set('ticket_counts', { data: data.counts, timestamp: now });
        
        // Notify subscribers
        this.notifySubscribers('tickets', data.tickets);
        this.notifySubscribers('ticket_counts', data.counts);
        
        // Update localStorage cache
        localStorage.setItem('tickets_cache', JSON.stringify(data.tickets));
        localStorage.setItem('tickets_cache_time', now.toString());
        localStorage.setItem('ticket_counts_cache', JSON.stringify(data.counts));
        localStorage.setItem('ticket_counts_cache_time', now.toString());
        
        console.log('✅ Ticket data updated and cached');
    }

    /**
     * Handle user updates from websocket
     */
    static handleUserUpdate(data) {
        this.cache.set('users', data.users);
        this.notifySubscribers('users', data.users);
        
        const now = Date.now();
        localStorage.setItem('users_cache', JSON.stringify(data.users));
        localStorage.setItem('users_cache_time', now.toString());
    }

    /**
     * Handle notification updates from websocket
     */
    static handleNotificationUpdate(data) {
        this.cache.set('notifications', data.notifications);
        this.notifySubscribers('notifications', data.notifications);
        
        const now = Date.now();
        localStorage.setItem('notifications_cache', JSON.stringify(data.notifications));
        localStorage.setItem('notifications_cache_time', now.toString());
    }

    /**
     * Handle data responses from server
     */
    static handleDataResponse(dataType, data) {
        console.log(`📊 Processing data response for ${dataType}:`, data?.length || 'no data');
        
        // Update cache with timestamp
        const now = Date.now();
        this.cache.set(dataType, { data, timestamp: now });
        
        // Notify subscribers
        this.notifySubscribers(dataType, data);
        
        // Update localStorage cache
        localStorage.setItem(`${dataType}_cache`, JSON.stringify(data));
        localStorage.setItem(`${dataType}_cache_time`, now.toString());
        
        console.log(`✅ ${dataType} data updated and cached`);
    }

    /**
     * Get cached data or fetch from Firebase
     */
    static async getData(dataType, userId, options = {}) {
        const cacheKey = `${dataType}_${userId}`;
        const cacheDuration = FirebaseCache.CACHE_DURATIONS[dataType.toUpperCase()] || 5 * 60 * 1000;
        
        // Check memory cache first
        if (this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < cacheDuration) {
                console.log(`📦 Using cached data for ${dataType}`);
                return cachedData.data;
            }
        }
        
        // Check localStorage cache
        const cachedData = FirebaseCache.getCachedData(cacheKey, cacheDuration);
        if (cachedData) {
            // Update memory cache
            this.cache.set(cacheKey, { data: cachedData, timestamp: Date.now() });
            console.log(`📦 Using localStorage cached data for ${dataType}`);
            return cachedData;
        }
        
        // If websocket is available, request data through it
        if (this.websocketClient && this.websocketClient.isConnected) {
            console.log(`🌐 Requesting ${dataType} data via WebSocket`);
            return new Promise((resolve) => {
                const subscriptionId = this.subscribe(dataType, (data) => {
                    this.unsubscribe(dataType, subscriptionId);
                    // Cache the data for future use
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    FirebaseCache.setCachedData(cacheKey, data);
                    resolve(data);
                });
                
                // Request data from server via websocket
                this.websocketClient.send('request_data', {
                    dataType,
                    userId,
                    options,
                    subscriptionId
                });
                
                // Set a timeout to avoid hanging if websocket doesn't respond
                setTimeout(() => {
                    this.unsubscribe(dataType, subscriptionId);
                    console.log(`⏰ WebSocket timeout for ${dataType}, falling back to null`);
                    resolve(null);
                }, 5000); // 5 second timeout
            });
        }
        
        // Fallback: return null and let the component handle it
        console.log(`WebSocket not available for ${dataType} - will use fallback Firebase query`);
        return null;
    }

    /**
     * Clear all caches
     */
    static clearAllCaches() {
        this.cache.clear();
        FirebaseCache.clearCache();
    }

    /**
     * Clear cache for specific user
     */
    static clearUserCache(userId) {
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
            if (key.includes(userId)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.cache.delete(key));
        FirebaseCache.clearUserCache(userId);
    }

    /**
     * Check if data is fresh (less than 30 seconds old)
     */
    static isDataFresh(dataType, maxAge = 30000) {
        const cacheKey = dataType;
        if (this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            const age = Date.now() - cachedData.timestamp;
            return age < maxAge;
        }
        return false;
    }

    /**
     * Get data age in milliseconds
     */
    static getDataAge(dataType) {
        const cacheKey = dataType;
        if (this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            return Date.now() - cachedData.timestamp;
        }
        return null;
    }

    /**
     * Force refresh data by clearing cache and requesting fresh data
     */
    static async forceRefresh(dataType, userId, options = {}) {
        console.log(`🔄 Force refreshing ${dataType} data`);
        
        // Clear cache
        this.cache.delete(dataType);
        FirebaseCache.clearUserCache(userId);
        
        // Request fresh data
        return this.getData(dataType, userId, options);
    }
}

export default {
    FirebaseCache,
    QueryOptimizer,
    RateLimiter,
    FirebasePerformance,
    FirebaseOptimizer,
    DataManager
};

