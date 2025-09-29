// src/components/common/SelectButton.js

import React from 'react';

/**
 * Reusable Select Button component.
 * Designed for selection actions with the specific design from the HTML template.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content of the button (e.g., text).
 * @param {function} [props.onClick] - Click handler for the button.
 * @param {string} [props.type='button'] - Button type (e.g., 'submit', 'button').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} A styled select button.
 */
const SelectButton = ({ 
    children, 
    onClick, 
    type = 'button', 
    disabled = false, 
    className = '' 
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
                px-3 py-1.5 
                rounded-md 
                text-sm 
                font-medium 
                inline-flex 
                items-center 
                justify-center 
                cursor-pointer 
                transition-all 
                duration-200 
                ease-in-out 
                text-center 
                min-w-[80px]
                font-['Source_Sans_Pro']
                bg-white 
                text-gray-800 
                border
                border-orange-400
                hover:bg-gray-50 
                hover:border-orange-500 
                
                hover:shadow-md
                focus:outline-none 
                focus:border-orange-500 
                focus:ring-2 
                focus:ring-orange-400
                active:bg-gray-100 
                active:border-gray-600 
                active:translate-y-0.5 
                active:shadow-sm
                disabled:bg-white 
                disabled:text-gray-400 
                disabled:border-gray-300 
                disabled:cursor-not-allowed
                disabled:hover:transform-none
                disabled:hover:shadow-none
                ${className}
            `}
        >
            {children}
        </button>
    );
};

export default SelectButton;
