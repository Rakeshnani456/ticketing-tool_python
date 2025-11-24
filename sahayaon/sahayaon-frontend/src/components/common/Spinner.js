// components/common/Spinner.js
import React from 'react';

/**
 * Spinner component matching the style used in Asset Management assets grid
 * @param {Object} props
 * @param {string} props.size - Size variant: 'sm' (h-3.5 w-3.5), 'md' (h-8 w-8), 'lg' (h-12 w-12), or custom className
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.color - Color variant: 'blue' (default), 'white' (for buttons on colored backgrounds)
 */
const Spinner = ({ size = 'lg', className = '', color = 'blue' }) => {
    // Size mapping
    const sizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    // Color mapping - matching AssetTable spinner pattern
    const colorClasses = {
        blue: 'border-4 border-blue-200 border-t-blue-600',
        white: 'border-2 border-white border-t-transparent',
    };

    const sizeClass = sizeClasses[size] || size; // Allow custom size class
    const colorClass = colorClasses[color] || colorClasses.blue;

    return (
        <div 
            className={`animate-spin rounded-full ${sizeClass} ${colorClass} ${className}`}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Spinner;

