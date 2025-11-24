// Smart Cache Manager - Centralized caching with intelligent invalidation
export class SmartCacheManager {
    static CACHE_DURATIONS = {
        USERS: 15 * 60 * 1000,        // 15 minutes
        CLIENTS: 20 * 60 * 1000,      // 20 minutes  
        ENGINEERS: 15 * 60 * 1000,    // 15 minutes
        KNOWLEDGE_BASE: 10 * 60 * 1000, // 10 minutes
        ANALYTICS: 5 * 60 * 1000,     // 5 minutes
        REPORTS: 3 * 60 * 1000,       // 3 minutes
        TICKETS: 2 * 60 * 1000,       // 2 minutes
        NOTIFICATIONS: 1 * 60 * 1000,  // 1 minute
        ASSETS: 10 * 60 * 1000        // 10 minutes
    };

    static CACHE_KEYS = {
        USERS: 'users_data',
        CLIENTS: 'clients_data', 
        ENGINEERS: 'engineers_data',
        KNOWLEDGE_BASE: 'knowledge_base_data',
        ANALYTICS: 'analytics_data',
        REPORTS: 'reports_data',
        TICKETS: 'tickets_data',
        NOTIFICATIONS: 'notifications_data',
        ASSETS: 'assets_data'
    };

    /**
     * Get cached data with smart validation
     */
    static getCachedData(key, type = 'USERS', userId = null) {
        try {
            const fullKey = userId ? `${key}_${userId}` : key;
            const cachedData = localStorage.getItem(fullKey);
            const cacheTime = localStorage.getItem(`${fullKey}_time`);
            const cacheVersion = localStorage.getItem(`${fullKey}_version`);
            
            if (!cachedData || !cacheTime) {
                return null;
            }

            const now = Date.now();
            const cacheAge = now - parseInt(cacheTime);
            const maxAge = this.CACHE_DURATIONS[type] || this.CACHE_DURATIONS.USERS;

            // Check if cache is still valid
            if (cacheAge < maxAge) {
                console.log(`📦 Using cached ${type.toLowerCase()} data (age: ${Math.round(cacheAge / 1000)}s)`);
                return {
                    data: JSON.parse(cachedData),
                    version: cacheVersion,
                    age: cacheAge
                };
            } else {
                console.log(`⏰ Cache expired for ${type.toLowerCase()} (age: ${Math.round(cacheAge / 1000)}s)`);
                return null;
            }
        } catch (error) {
            console.warn('Failed to get cached data:', error);
            return null;
        }
    }

    /**
     * Set cached data with version control
     */
    static setCachedData(key, data, type = 'USERS', userId = null, version = null) {
        try {
            const fullKey = userId ? `${key}_${userId}` : key;
            const now = Date.now();
            const dataVersion = version || `${now}_${Math.random().toString(36).substr(2, 9)}`;
            
            localStorage.setItem(fullKey, JSON.stringify(data));
            localStorage.setItem(`${fullKey}_time`, now.toString());
            localStorage.setItem(`${fullKey}_version`, dataVersion);
            
            console.log(`💾 Cached ${type.toLowerCase()} data (version: ${dataVersion})`);
            return dataVersion;
        } catch (error) {
            console.warn('Failed to set cached data:', error);
            return null;
        }
    }

    /**
     * Check if data has changed (for selective refresh)
     */
    static hasDataChanged(key, newData, userId = null) {
        try {
            const fullKey = userId ? `${key}_${userId}` : key;
            const cachedData = localStorage.getItem(fullKey);
            
            if (!cachedData) return true;
            
            const oldData = JSON.parse(cachedData);
            const oldHash = this.generateDataHash(oldData);
            const newHash = this.generateDataHash(newData);
            
            return oldHash !== newHash;
        } catch (error) {
            console.warn('Failed to check data changes:', error);
            return true;
        }
    }

    /**
     * Generate a simple hash for data comparison
     */
    static generateDataHash(data) {
        try {
            // Create a simple hash based on data length and first few items
            const dataStr = JSON.stringify(data);
            let hash = 0;
            for (let i = 0; i < dataStr.length; i++) {
                const char = dataStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return hash.toString();
        } catch (error) {
            return Math.random().toString();
        }
    }

    /**
     * Invalidate specific cache
     */
    static invalidateCache(key, userId = null) {
        try {
            const fullKey = userId ? `${key}_${userId}` : key;
            localStorage.removeItem(fullKey);
            localStorage.removeItem(`${fullKey}_time`);
            localStorage.removeItem(`${fullKey}_version`);
            console.log(`🗑️ Invalidated cache for ${key}`);
        } catch (error) {
            console.warn('Failed to invalidate cache:', error);
        }
    }

    /**
     * Invalidate all caches for a user
     */
    static invalidateUserCaches(userId) {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes(userId)) {
                    localStorage.removeItem(key);
                }
            });
            console.log(`🗑️ Invalidated all caches for user ${userId}`);
        } catch (error) {
            console.warn('Failed to invalidate user caches:', error);
        }
    }

    /**
     * Clear all caches
     */
    static clearAllCaches() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('_data_') || key.includes('_time') || key.includes('_version')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('🗑️ Cleared all caches');
        } catch (error) {
            console.warn('Failed to clear all caches:', error);
        }
    }

    /**
     * Get cache statistics
     */
    static getCacheStats() {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.includes('_data_'));
            const stats = {
                totalCaches: cacheKeys.length,
                caches: []
            };

            cacheKeys.forEach(key => {
                const timeKey = `${key}_time`;
                const versionKey = `${key}_version`;
                const cacheTime = localStorage.getItem(timeKey);
                const version = localStorage.getItem(versionKey);
                
                if (cacheTime) {
                    const age = Date.now() - parseInt(cacheTime);
                    stats.caches.push({
                        key,
                        age: Math.round(age / 1000),
                        version
                    });
                }
            });

            return stats;
        } catch (error) {
            console.warn('Failed to get cache stats:', error);
            return { totalCaches: 0, caches: [] };
        }
    }

    /**
     * Smart fetch with caching and change detection
     */
    static async smartFetch(fetchFn, key, type = 'USERS', userId = null, options = {}) {
        const { forceRefresh = false, checkChanges = true } = options;
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = this.getCachedData(key, type, userId);
            if (cached) {
                return {
                    data: cached.data,
                    fromCache: true,
                    version: cached.version,
                    age: cached.age
                };
            }
        }

        // Fetch fresh data
        console.log(`🔄 Fetching fresh ${type.toLowerCase()} data...`);
        const freshData = await fetchFn();
        
        // Check if data actually changed (if enabled)
        if (checkChanges && !forceRefresh) {
            const hasChanged = this.hasDataChanged(key, freshData, userId);
            if (!hasChanged) {
                console.log(`✅ Data unchanged, using existing cache`);
                const cached = this.getCachedData(key, type, userId);
                if (cached) {
                    return {
                        data: cached.data,
                        fromCache: true,
                        version: cached.version,
                        age: cached.age
                    };
                }
            }
        }

        // Cache the fresh data
        const version = this.setCachedData(key, freshData, type, userId);
        
        return {
            data: freshData,
            fromCache: false,
            version,
            age: 0
        };
    }
}

export default SmartCacheManager;


