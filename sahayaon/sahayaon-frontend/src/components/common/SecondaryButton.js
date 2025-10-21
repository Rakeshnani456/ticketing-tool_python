// src/components/common/SecondaryButton.js

import React from 'react';

/**
 * Reusable Secondary Button component.
 * Designed for less prominent actions.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content of the button (e.g., text).
 * @param {function} [props.onClick] - Click handler for the button.
 * @param {object} [props.Icon] - Lucide React icon component to display.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.type='button'] - Button type (e.g., 'submit', 'button').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @returns {JSX.Element} A styled secondary button.
 */
const SecondaryButton = ({ children, onClick, Icon, className = '', type = 'button', disabled }) => (
    <button
        onClick={onClick}
        type={type}
        className={`bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold text-sm hover:bg-gray-300 transition duration-300 flex items-center space-x-2 shadow-sm hover:shadow-md transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        disabled={disabled}
    >
        {Icon && <Icon size={18} />}
        <span>{children}</span>
    </button>
);

export default SecondaryButton;
