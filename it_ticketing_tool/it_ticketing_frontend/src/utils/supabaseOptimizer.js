// Supabase optimization utilities

/**
 * Cache management for Supabase data
 */
export class SupabaseCache {
    static CACHE_DURATIONS = {
        TICKET_COUNTS: 5 * 60 * 1000,      // 5 minutes
        DASHBOARD_DATA: 2 * 60 * 1000,     // 2 minutes
        MY_TICKETS: 2 * 60 * 1000,         // 2 minutes
        ALL_TICKETS: 2 * 60 * 1000,        // 2 minutes
        TICKET_DETAIL: 1 * 60 * 1000,      // 1 minute
        USER_DATA: 5 * 60 * 1000,          // 5 minutes
        ACTIVITIES: 3 * 60 * 1000,         // 3 minutes
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
 * Query optimization utilities for Supabase
 */
export class QueryOptimizer {
    /**
     * Create optimized query with proper limits and filters
     */
    static createOptimizedQuery(supabaseClient, table, options = {}) {
        const {
            filters = [],
            orderByField = 'created_at',
            orderDirection = 'desc',
            limitCount = 50,
            includeDeleted = false
        } = options;

        let query = supabaseClient.from(table);

        // Apply filters
        filters.forEach(filter => {
            if (filter.field && filter.operator && filter.value !== undefined) {
                switch (filter.operator) {
                    case '==':
                        query = query.eq(filter.field, filter.value);
                        break;
                    case '!=':
                        query = query.neq(filter.field, filter.value);
                        break;
                    case '>':
                        query = query.gt(filter.field, filter.value);
                        break;
                    case '>=':
                        query = query.gte(filter.field, filter.value);
                        break;
                    case '<':
                        query = query.lt(filter.field, filter.value);
                        break;
                    case '<=':
                        query = query.lte(filter.field, filter.value);
                        break;
                    case 'in':
                        query = query.in(filter.field, filter.value);
                        break;
                    case 'like':
                        query = query.like(filter.field, filter.value);
                        break;
                    case 'ilike':
                        query = query.ilike(filter.field, filter.value);
                        break;
                }
            }
        });

        // Apply ordering
        if (orderByField) {
            query = query.order(orderByField, { ascending: orderDirection === 'asc' });
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
    static createPaginatedQuery(supabaseClient, table, pageSize = 20, offset = 0, options = {}) {
        let query = this.createOptimizedQuery(supabaseClient, table, { ...options, limitCount: pageSize });
        
        if (offset > 0) {
            query = query.range(offset, offset + pageSize - 1);
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
 * Supabase performance monitoring
 */
export class SupabasePerformance {
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
        console.log('Supabase Read Statistics:', stats);
        return stats;
    }
}

/**
 * Main optimization class
 */
export class SupabaseOptimizer {
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

export default {
    SupabaseCache,
    QueryOptimizer,
    RateLimiter,
    SupabasePerformance,
    SupabaseOptimizer
};
