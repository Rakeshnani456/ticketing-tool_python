// src/contexts/ThemeContext.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '../hooks/useCookies';

const ThemeContext = createContext();

export const useThemeContext = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { theme, toggleTheme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Apply theme to document
        if (theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.classList.toggle('dark', theme === 'dark');
            setIsLoading(false);
        }
    }, [theme]);

    const value = {
        theme,
        toggleTheme,
        setTheme,
        isLoading
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;