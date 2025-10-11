import React from 'react';

/**
 * Custom Button Component that matches the app's design system
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant: "primary", "secondary", "outline", "danger", "success", "refreshing", "refreshed", "failed"
 * @param {string} props.size - Button size: "sm", "md", "lg"
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.startIcon - Icon to display at the start
 * @param {React.ReactNode} props.endIcon - Icon to display at the end
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.state - Button state: "idle", "loading", "success", "error"
 * @returns {JSX.Element} A styled custom button
 */
const CustomButton = ({ 
    variant = "primary",
    size = "md",
    disabled = false,
    onClick,
    className = "",
    children,
    startIcon,
    endIcon,
    type = "button",
    state = "idle",
    ...props
}) => {
    const baseClasses = "inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variantClasses = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md",
        secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow-md",
        outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 shadow-sm hover:shadow-md",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md",
        success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md",
        "outline-danger": "border border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500 shadow-sm hover:shadow-md",
        refreshing: "bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 shadow-sm hover:shadow-md animate-pulse",
        refreshed: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 shadow-sm hover:shadow-md",
        failed: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm hover:shadow-md"
    };
    
    const sizeClasses = {
        sm: "px-3 py-1.5 text-sm min-h-[32px]",
        md: "px-4 py-2 text-sm min-h-[36px]",
        lg: "px-6 py-3 text-base min-h-[44px]"
    };
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {startIcon && (
                <span className="mr-2 flex-shrink-0">
                    {startIcon}
                </span>
            )}
            {children}
            {endIcon && (
                <span className="ml-2 flex-shrink-0">
                    {endIcon}
                </span>
            )}
        </button>
    );
};

export default CustomButton;
