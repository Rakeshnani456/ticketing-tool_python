// src/hooks/useCookies.js

import { useState, useEffect, useCallback } from 'react';
import cookieManager from '../utils/cookieManager';

/**
 * Custom React hook for cookie management
 * Provides reactive cookie state and methods
 */
export const useCookies = () => {
    const [cookies, setCookies] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // Initialize cookies on mount
    useEffect(() => {
        setCookies(cookieManager.getAllCookies());
        setIsLoading(false);
    }, []);

    // Set cookie and update state
    const setCookie = useCallback((name, value, options = {}) => {
        const success = cookieManager.setCookie(name, value, options);
        if (success) {
            setCookies(prev => ({
                ...prev,
                [name]: value
            }));
        }
        return success;
    }, []);

    // Get cookie value
    const getCookie = useCallback((name) => {
        return cookieManager.getCookie(name);
    }, []);

    // Delete cookie and update state
    const deleteCookie = useCallback((name, options = {}) => {
        const success = cookieManager.deleteCookie(name, options);
        if (success) {
            setCookies(prev => {
                const newCookies = { ...prev };
                delete newCookies[name];
                return newCookies;
            });
        }
        return success;
    }, []);

    // Check if cookie exists
    const hasCookie = useCallback((name) => {
        return cookieManager.hasCookie(name);
    }, []);

    // Clear all cookies
    const clearAllCookies = useCallback(() => {
        const success = cookieManager.clearAllCookies();
        if (success) {
            setCookies({});
        }
        return success;
    }, []);

    return {
        cookies,
        isLoading,
        setCookie,
        getCookie,
        deleteCookie,
        hasCookie,
        clearAllCookies
    };
};

/**
 * Hook for user session management
 */
export const useUserSession = () => {
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        const userSession = cookieManager.getUserSession();
        setSession(userSession);
        setIsLoading(false);
    }, []);

    // Set user session
    const setUserSession = useCallback((userData, expiresInDays = 7) => {
        const success = cookieManager.setUserSession(userData, expiresInDays);
        if (success) {
            setSession(userData);
        }
        return success;
    }, []);

    // Update last activity
    const updateLastActivity = useCallback(() => {
        cookieManager.updateLastActivity();
        const updatedSession = cookieManager.getUserSession();
        setSession(updatedSession);
    }, []);

    // Clear user session
    const clearUserSession = useCallback(() => {
        const success = cookieManager.clearUserSession();
        if (success) {
            setSession(null);
        }
        return success;
    }, []);

    // Check if user is logged in
    const isLoggedIn = useCallback(() => {
        return session !== null;
    }, [session]);

    return {
        session,
        isLoading,
        setUserSession,
        updateLastActivity,
        clearUserSession,
        isLoggedIn
    };
};

/**
 * Hook for user preferences management
 */
export const useUserPreferences = () => {
    const [preferences, setPreferences] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load preferences on mount
    useEffect(() => {
        const userPrefs = cookieManager.getUserPreferences();
        setPreferences(userPrefs);
        setIsLoading(false);
    }, []);

    // Update preferences
    const updatePreferences = useCallback((newPrefs) => {
        const success = cookieManager.setUserPreferences(newPrefs);
        if (success) {
            setPreferences(newPrefs);
        }
        return success;
    }, []);

    // Update specific preference category
    const updateTheme = useCallback((theme) => {
        const currentPrefs = cookieManager.getUserPreferences();
        const newPrefs = { ...currentPrefs, theme };
        return updatePreferences(newPrefs);
    }, [updatePreferences]);

    const updateNotificationPreferences = useCallback((notificationPrefs) => {
        const currentPrefs = cookieManager.getUserPreferences();
        const newPrefs = {
            ...currentPrefs,
            notifications: { ...currentPrefs.notifications, ...notificationPrefs }
        };
        return updatePreferences(newPrefs);
    }, [updatePreferences]);

    const updateDashboardPreferences = useCallback((dashboardPrefs) => {
        const currentPrefs = cookieManager.getUserPreferences();
        const newPrefs = {
            ...currentPrefs,
            dashboard: { ...currentPrefs.dashboard, ...dashboardPrefs }
        };
        return updatePreferences(newPrefs);
    }, [updatePreferences]);

    const updateTicketPreferences = useCallback((ticketPrefs) => {
        const currentPrefs = cookieManager.getUserPreferences();
        const newPrefs = {
            ...currentPrefs,
            tickets: { ...currentPrefs.tickets, ...ticketPrefs }
        };
        return updatePreferences(newPrefs);
    }, [updatePreferences]);

    return {
        preferences,
        isLoading,
        updatePreferences,
        updateTheme,
        updateNotificationPreferences,
        updateDashboardPreferences,
        updateTicketPreferences
    };
};

/**
 * Hook for theme management
 */
export const useTheme = () => {
    const { preferences, updateTheme } = useUserPreferences();
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        if (preferences) {
            setTheme(preferences.theme);
        }
    }, [preferences]);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        updateTheme(newTheme);
        setTheme(newTheme);
    }, [theme, updateTheme]);

    const setThemeValue = useCallback((newTheme) => {
        updateTheme(newTheme);
        setTheme(newTheme);
    }, [updateTheme]);

    return {
        theme,
        toggleTheme,
        setTheme: setThemeValue
    };
};

/**
 * Hook for cookie consent management
 */
export const useCookieConsent = () => {
    const [consent, setConsent] = useState('not_set');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const consentStatus = cookieManager.getCookieConsent();
        setConsent(consentStatus);
        setIsLoading(false);
    }, []);

    const acceptCookies = useCallback(() => {
        const success = cookieManager.setCookieConsent('accepted');
        if (success) {
            setConsent('accepted');
        }
        return success;
    }, []);

    const declineCookies = useCallback(() => {
        const success = cookieManager.setCookieConsent('declined');
        if (success) {
            setConsent('declined');
        }
        return success;
    }, []);

    const hasConsent = useCallback(() => {
        return consent === 'accepted';
    }, [consent]);

    return {
        consent,
        isLoading,
        acceptCookies,
        declineCookies,
        hasConsent
    };
};

export default useCookies;
