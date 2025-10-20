// src/utils/cookieManager.js

/**
 * Comprehensive Cookie Management Utility
 * Handles all cookie operations for the IT Ticketing Tool
 */

class CookieManager {
    constructor() {
        this.defaultOptions = {
            secure: window.location.protocol === 'https:', // Use secure cookies in production
            sameSite: 'Lax', // CSRF protection
            path: '/', // Available site-wide
        };
    }

    /**
     * Set a cookie with optional configuration
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {Object} options - Cookie options
     */
    setCookie(name, value, options = {}) {
        try {
            const config = {
                ...this.defaultOptions,
                ...options
            };

            let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

            // Add expiration
            if (config.expires) {
                if (typeof config.expires === 'number') {
                    const date = new Date();
                    date.setTime(date.getTime() + (config.expires * 24 * 60 * 60 * 1000));
                    cookieString += `; expires=${date.toUTCString()}`;
                } else if (config.expires instanceof Date) {
                    cookieString += `; expires=${config.expires.toUTCString()}`;
                }
            }

            // Add other options
            if (config.maxAge) {
                cookieString += `; max-age=${config.maxAge}`;
            }
            if (config.path) {
                cookieString += `; path=${config.path}`;
            }
            if (config.domain) {
                cookieString += `; domain=${config.domain}`;
            }
            if (config.secure) {
                cookieString += `; secure`;
            }
            if (config.sameSite) {
                cookieString += `; samesite=${config.sameSite}`;
            }
            if (config.httpOnly) {
                cookieString += `; httponly`;
            }

            document.cookie = cookieString;
            return true;
        } catch (error) {
            console.error('Error setting cookie:', error);
            return false;
        }
    }

    /**
     * Get a cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value or null if not found
     */
    getCookie(name) {
        try {
            const nameEQ = encodeURIComponent(name) + "=";
            const cookies = document.cookie.split(';');
            
            for (let cookie of cookies) {
                let c = cookie.trim();
                if (c.indexOf(nameEQ) === 0) {
                    return decodeURIComponent(c.substring(nameEQ.length));
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting cookie:', error);
            return null;
        }
    }

    /**
     * Delete a cookie
     * @param {string} name - Cookie name
     * @param {Object} options - Cookie options (path, domain)
     */
    deleteCookie(name, options = {}) {
        try {
            const config = {
                path: '/',
                ...options
            };
            
            this.setCookie(name, '', {
                ...config,
                expires: new Date(0) // Set to past date
            });
            return true;
        } catch (error) {
            console.error('Error deleting cookie:', error);
            return false;
        }
    }

    /**
     * Check if a cookie exists
     * @param {string} name - Cookie name
     * @returns {boolean} - True if cookie exists
     */
    hasCookie(name) {
        return this.getCookie(name) !== null;
    }

    /**
     * Get all cookies as an object
     * @returns {Object} - Object containing all cookies
     */
    getAllCookies() {
        try {
            const cookies = {};
            const cookieArray = document.cookie.split(';');
            
            for (let cookie of cookieArray) {
                const [name, value] = cookie.trim().split('=');
                if (name && value) {
                    cookies[decodeURIComponent(name)] = decodeURIComponent(value);
                }
            }
            return cookies;
        } catch (error) {
            console.error('Error getting all cookies:', error);
            return {};
        }
    }

    /**
     * Clear all cookies (for current domain and path)
     */
    clearAllCookies() {
        try {
            const cookies = this.getAllCookies();
            Object.keys(cookies).forEach(name => {
                this.deleteCookie(name);
            });
            return true;
        } catch (error) {
            console.error('Error clearing all cookies:', error);
            return false;
        }
    }

    // ===== SPECIFIC COOKIE METHODS FOR TICKETING TOOL =====

    /**
     * Set user session cookie
     * @param {Object} userData - User data to store
     * @param {number} expiresInDays - Days until expiration (default: 7)
     */
    setUserSession(userData, expiresInDays = 7) {
        const sessionData = {
            userId: userData.userId || userData.uid,
            email: userData.email,
            role: userData.role,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        return this.setCookie('user_session', JSON.stringify(sessionData), {
            expires: expiresInDays,
            httpOnly: false, // Allow JavaScript access for client-side checks
            secure: true
        });
    }

    /**
     * Get user session data
     * @returns {Object|null} - User session data or null
     */
    getUserSession() {
        try {
            const sessionData = this.getCookie('user_session');
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('Error getting user session:', error);
            return null;
        }
    }

    /**
     * Update last activity timestamp
     */
    updateLastActivity() {
        const session = this.getUserSession();
        if (session) {
            session.lastActivity = new Date().toISOString();
            this.setUserSession(session);
        }
    }

    /**
     * Clear user session
     */
    clearUserSession() {
        return this.deleteCookie('user_session');
    }

    /**
     * Set user preferences
     * @param {Object} preferences - User preferences
     */
    setUserPreferences(preferences) {
        return this.setCookie('user_preferences', JSON.stringify(preferences), {
            expires: 365, // 1 year
            httpOnly: false
        });
    }

    /**
     * Get user preferences
     * @returns {Object} - User preferences or default preferences
     */
    getUserPreferences() {
        try {
            const preferences = this.getCookie('user_preferences');
            return preferences ? JSON.parse(preferences) : this.getDefaultPreferences();
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Get default user preferences
     * @returns {Object} - Default preferences
     */
    getDefaultPreferences() {
        return {
            theme: 'light',
            language: 'en',
            notifications: {
                email: true,
                push: true,
                desktop: false
            },
            dashboard: {
                layout: 'grid',
                itemsPerPage: 10,
                showFilters: true
            },
            tickets: {
                defaultView: 'all',
                sortBy: 'createdAt',
                sortOrder: 'desc',
                autoRefresh: true,
                refreshInterval: 30
            }
        };
    }

    /**
     * Set theme preference
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    setTheme(theme) {
        const preferences = this.getUserPreferences();
        preferences.theme = theme;
        this.setUserPreferences(preferences);
    }

    /**
     * Get theme preference
     * @returns {string} - Current theme
     */
    getTheme() {
        return this.getUserPreferences().theme;
    }

    /**
     * Set notification preferences
     * @param {Object} notificationPrefs - Notification preferences
     */
    setNotificationPreferences(notificationPrefs) {
        const preferences = this.getUserPreferences();
        preferences.notifications = { ...preferences.notifications, ...notificationPrefs };
        this.setUserPreferences(preferences);
    }

    /**
     * Set dashboard preferences
     * @param {Object} dashboardPrefs - Dashboard preferences
     */
    setDashboardPreferences(dashboardPrefs) {
        const preferences = this.getUserPreferences();
        preferences.dashboard = { ...preferences.dashboard, ...dashboardPrefs };
        this.setUserPreferences(preferences);
    }

    /**
     * Set ticket view preferences
     * @param {Object} ticketPrefs - Ticket view preferences
     */
    setTicketPreferences(ticketPrefs) {
        const preferences = this.getUserPreferences();
        preferences.tickets = { ...preferences.tickets, ...ticketPrefs };
        this.setUserPreferences(preferences);
    }

    /**
     * Set CSRF token
     * @param {string} token - CSRF token
     */
    setCSRFToken(token) {
        return this.setCookie('csrf_token', token, {
            expires: 1, // 1 day
            httpOnly: true, // Security: prevent XSS access
            secure: true,
            sameSite: 'Strict'
        });
    }

    /**
     * Get CSRF token
     * @returns {string|null} - CSRF token or null
     */
    getCSRFToken() {
        return this.getCookie('csrf_token');
    }

    /**
     * Set remember me preference
     * @param {boolean} remember - Whether to remember user
     */
    setRememberMe(remember) {
        return this.setCookie('remember_me', remember.toString(), {
            expires: remember ? 30 : 0, // 30 days if true, session if false
            httpOnly: false
        });
    }

    /**
     * Get remember me preference
     * @returns {boolean} - Remember me setting
     */
    getRememberMe() {
        const remember = this.getCookie('remember_me');
        return remember === 'true';
    }

    /**
     * Set last visited page
     * @param {string} path - Page path
     */
    setLastVisitedPage(path) {
        return this.setCookie('last_visited_page', path, {
            expires: 7, // 1 week
            httpOnly: false
        });
    }

    /**
     * Get last visited page
     * @returns {string} - Last visited page path
     */
    getLastVisitedPage() {
        return this.getCookie('last_visited_page') || '/';
    }

    /**
     * Set analytics consent
     * @param {boolean} consent - User consent for analytics
     */
    setAnalyticsConsent(consent) {
        return this.setCookie('analytics_consent', consent.toString(), {
            expires: 365, // 1 year
            httpOnly: false
        });
    }

    /**
     * Get analytics consent
     * @returns {boolean} - Analytics consent status
     */
    getAnalyticsConsent() {
        const consent = this.getCookie('analytics_consent');
        return consent === 'true';
    }

    /**
     * Check if cookies are enabled
     * @returns {boolean} - True if cookies are enabled
     */
    areCookiesEnabled() {
        try {
            const testCookie = 'cookie_test_' + Math.random();
            this.setCookie(testCookie, 'test', { expires: 0 });
            const enabled = this.hasCookie(testCookie);
            this.deleteCookie(testCookie);
            return enabled;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cookie consent status
     * @returns {string} - 'accepted', 'declined', or 'not_set'
     */
    getCookieConsent() {
        const consent = this.getCookie('cookie_consent');
        return consent || 'not_set';
    }

    /**
     * Set cookie consent
     * @param {string} status - 'accepted' or 'declined'
     */
    setCookieConsent(status) {
        return this.setCookie('cookie_consent', status, {
            expires: 365, // 1 year
            httpOnly: false
        });
    }
}

// Create and export a singleton instance
const cookieManager = new CookieManager();
export default cookieManager;

// Export the class for testing purposes
export { CookieManager };
