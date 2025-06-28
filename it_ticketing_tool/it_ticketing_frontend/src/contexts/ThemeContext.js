// src/contexts/ThemeContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Theme Context
const ThemeContext = createContext(null);

/**
 * Custom hook to use the theme context.
 * Throws an error if used outside of a ThemeProvider.
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

/**
 * ThemeProvider component to wrap the application and provide theme context.
 * It manages the theme state and persists it to local storage.
 * @param {object} { children } - React children to be rendered within the provider.
 */
export const ThemeProvider = ({ children }) => {
    // Initialize theme from local storage, default to 'light' if not found
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('app-theme');
        return savedTheme ? savedTheme : 'light';
    });

    // Effect to update local storage whenever the theme changes
    useEffect(() => {
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    /**
     * Toggles the theme between 'light' and 'dark'.
     */
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

