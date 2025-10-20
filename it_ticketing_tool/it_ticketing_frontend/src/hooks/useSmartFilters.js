// src/hooks/useSmartFilters.js

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Custom hook for managing smart filter state and logic
 * Provides URL persistence and filter application logic
 */
export const useSmartFilters = (initialFilters = {}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [filters, setFilters] = useState(initialFilters);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize filters from URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const urlFilters = {};
        
        // Parse filters from URL
        for (const [key, value] of urlParams.entries()) {
            if (key.startsWith('filter_')) {
                const filterType = key.replace('filter_', '');
                try {
                    // Multi-select filters should always be arrays
                    const multiSelectFilters = ['status', 'priority', 'assigned'];
                    if (multiSelectFilters.includes(filterType)) {
                        urlFilters[filterType] = value.includes(',') ? value.split(',') : [value];
                    } else {
                        // Single-select filters
                        urlFilters[filterType] = value.includes(',') ? value.split(',') : value;
                    }
                } catch (e) {
                    urlFilters[filterType] = value;
                }
            }
        }
        
        if (Object.keys(urlFilters).length > 0) {
            setFilters(urlFilters);
        }
        setIsInitialized(true);
    }, [location.search]);

    // Update URL when filters change
    const updateURL = useCallback((newFilters) => {
        const urlParams = new URLSearchParams(location.search);
        
        // Remove existing filter params
        for (const key of urlParams.keys()) {
            if (key.startsWith('filter_')) {
                urlParams.delete(key);
            }
        }
        
        // Add new filter params
        Object.entries(newFilters).forEach(([filterType, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                // Multi-select filters should always be arrays
                const multiSelectFilters = ['status', 'priority', 'assigned'];
                if (multiSelectFilters.includes(filterType)) {
                    const paramValue = Array.isArray(value) ? value.join(',') : [value].join(',');
                    urlParams.set(`filter_${filterType}`, paramValue);
                } else {
                    const paramValue = Array.isArray(value) ? value.join(',') : value;
                    urlParams.set(`filter_${filterType}`, paramValue);
                }
            }
        });
        
        // Update URL without triggering navigation
        const newSearch = urlParams.toString();
        const newURL = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
        navigate(newURL, { replace: true });
    }, [location.pathname, location.search, navigate]);

    // Handle filter changes
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
        updateURL(newFilters);
    }, [updateURL]);

    // Clear all filters
    const clearAllFilters = useCallback(() => {
        setFilters({});
        updateURL({});
    }, [updateURL]);

    // Clear specific filter
    const clearFilter = useCallback((filterType) => {
        const newFilters = { ...filters };
        delete newFilters[filterType];
        setFilters(newFilters);
        updateURL(newFilters);
    }, [filters, updateURL]);

    // Apply filters to tickets
    const applyFilters = useCallback((tickets, currentUser = null) => {
        if (!isInitialized || !tickets || tickets.length === 0) {
            return tickets;
        }

        return tickets.filter(ticket => {
            // Status filter
            if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
                if (!filters.status.includes(ticket.status)) {
                    return false;
                }
            }

            // Priority filter
            if (filters.priority && Array.isArray(filters.priority) && filters.priority.length > 0) {
                if (!filters.priority.includes(ticket.priority)) {
                    return false;
                }
            }

            // Assigned filter
            if (filters.assigned && Array.isArray(filters.assigned) && filters.assigned.length > 0) {
                const assignedValues = filters.assigned;
                let matches = false;
                
                for (const assignedValue of assignedValues) {
                    if (assignedValue === 'unassigned') {
                        if (!ticket.assigned_to_email) {
                            matches = true;
                            break;
                        }
                    } else if (assignedValue === 'assigned_to_me') {
                        if (currentUser && ticket.assigned_to_email === currentUser.email) {
                            matches = true;
                            break;
                        }
                    } else {
                        if (ticket.assigned_to_email === assignedValue) {
                            matches = true;
                            break;
                        }
                    }
                }
                
                if (!matches) {
                    return false;
                }
            }

            // Client filter
            if (filters.client) {
                const clientValue = filters.client;
                const ticketClient = ticket.client_name || ticket.companyName;
                if (ticketClient !== clientValue) {
                    return false;
                }
            }

            // Created date filter
            if (filters.created) {
                const createdValue = filters.created;
                const ticketDate = new Date(ticket.created_at);
                const now = new Date();
                
                switch (createdValue) {
                    case 'today':
                        if (!isSameDay(ticketDate, now)) return false;
                        break;
                    case 'yesterday':
                        const yesterday = new Date(now);
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (!isSameDay(ticketDate, yesterday)) return false;
                        break;
                    case 'last_7_days':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        if (ticketDate < weekAgo) return false;
                        break;
                    case 'last_30_days':
                        const monthAgo = new Date(now);
                        monthAgo.setDate(monthAgo.getDate() - 30);
                        if (ticketDate < monthAgo) return false;
                        break;
                    case 'last_90_days':
                        const quarterAgo = new Date(now);
                        quarterAgo.setDate(quarterAgo.getDate() - 90);
                        if (ticketDate < quarterAgo) return false;
                        break;
                    case 'this_year':
                        if (ticketDate.getFullYear() !== now.getFullYear()) return false;
                        break;
                }
            }

            return true;
        });
    }, [filters, isInitialized]);

    // Get filter summary for display
    const getFilterSummary = useCallback(() => {
        const summary = [];
        
        Object.entries(filters).forEach(([filterType, value]) => {
            if (value) {
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        summary.push(`${filterType}: ${value.length} selected`);
                    }
                } else {
                    summary.push(`${filterType}: ${value}`);
                }
            }
        });
        
        return summary;
    }, [filters]);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return Object.values(filters).some(value => {
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            return value !== null && value !== undefined && value !== '';
        });
    }, [filters]);

    return {
        filters,
        handleFiltersChange,
        clearAllFilters,
        clearFilter,
        applyFilters,
        getFilterSummary,
        hasActiveFilters,
        isInitialized
    };
};

// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

export default useSmartFilters;
