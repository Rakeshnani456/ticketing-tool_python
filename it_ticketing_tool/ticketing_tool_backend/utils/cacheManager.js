class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
        this.cleanupInterval = 10 * 60 * 1000; // Cleanup every 10 minutes
        this.setupCleanup();
    }

    set(key, data, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, {
            data,
            expiry,
            accessed: Date.now(),
            accessCount: 0
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        // Update access stats
        item.accessed = Date.now();
        item.accessCount++;

        return item.data;
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Get cache statistics
    getStats() {
        const now = Date.now();
        let totalItems = 0;
        let expiredItems = 0;
        let totalSize = 0;

        for (const [key, item] of this.cache.entries()) {
            totalItems++;
            if (now > item.expiry) {
                expiredItems++;
            }
            totalSize += JSON.stringify(item.data).length;
        }

        return {
            totalItems,
            expiredItems,
            totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
            cacheSize: this.cache.size
        };
    }

    // Cleanup expired items
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`Cache cleanup: removed ${cleaned} expired items`);
        }
    }

    // Setup automatic cleanup
    setupCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    // Cache with smart invalidation
    async getOrSet(key, fetchFunction, ttl = this.defaultTTL, invalidationKeys = []) {
        // Check cache first
        const cached = this.get(key);
        if (cached) {
            return cached;
        }

        // Fetch fresh data
        try {
            const data = await fetchFunction();
            this.set(key, data, ttl);
            
            // Store invalidation keys for smart cache management
            if (invalidationKeys.length > 0) {
                this.set(`${key}_invalidation`, invalidationKeys, ttl);
            }
            
            return data;
        } catch (error) {
            console.error(`Cache fetch error for key ${key}:`, error);
            throw error;
        }
    }

    // Invalidate cache by pattern or specific keys
    invalidate(pattern) {
        let invalidated = 0;
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern) || pattern === key) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        
        if (invalidated > 0) {
            console.log(`Cache invalidation: removed ${invalidated} items matching pattern "${pattern}"`);
        }
        
        return invalidated;
    }

    // Get cache keys matching a pattern
    getKeys(pattern) {
        return Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
