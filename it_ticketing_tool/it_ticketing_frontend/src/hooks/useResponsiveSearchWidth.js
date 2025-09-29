import { useState, useEffect } from 'react';

/**
 * Custom hook to calculate responsive search bar width based on user role and screen size
 * @param {string} userRole - The current user's role
 * @param {number} screenWidth - Current screen width
 * @returns {object} - Object containing width calculations for different breakpoints
 */
export const useResponsiveSearchWidth = (userRole, screenWidth) => {
    const [searchWidths, setSearchWidths] = useState({
        lg: 300,
        md: 250,
        sm: 200
    });

    useEffect(() => {
        const calculateWidths = () => {
            const isAdmin = ['admin', 'super_admin', 'site_admin'].includes(userRole);
            const isSupport = userRole === 'support';
            const isUser = !isAdmin && !isSupport;

            // Base calculations for different roles
            let baseWidths = {
                lg: 300,
                md: 250,
                sm: 200
            };

            if (isAdmin) {
                // Admin roles have more navigation items (Dashboard + Management + Search + Create)
                // More space needed for navigation, less for search
                baseWidths = {
                    lg: Math.min(350, Math.max(200, screenWidth * 0.25)),
                    md: Math.min(280, Math.max(180, screenWidth * 0.3)),
                    sm: Math.min(200, Math.max(150, screenWidth * 0.35))
                };
            } else if (isSupport) {
                // Support has Dashboard + Search + Create
                baseWidths = {
                    lg: Math.min(400, Math.max(250, screenWidth * 0.3)),
                    md: Math.min(320, Math.max(200, screenWidth * 0.35)),
                    sm: Math.min(250, Math.max(180, screenWidth * 0.4))
                };
            } else {
                // Regular users have only Search + Create
                baseWidths = {
                    lg: Math.min(500, Math.max(300, screenWidth * 0.4)),
                    md: Math.min(400, Math.max(250, screenWidth * 0.45)),
                    sm: Math.min(300, Math.max(200, screenWidth * 0.5))
                };
            }

            setSearchWidths(baseWidths);
        };

        calculateWidths();
    }, [userRole, screenWidth]);

    return searchWidths;
};

/**
 * Hook to get current screen width
 */
export const useScreenWidth = () => {
    const [screenWidth, setScreenWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setScreenWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return screenWidth;
};
