// src/components/common/PrimaryButton.js

import React from 'react';
import { Loader2 } from 'lucide-react'; // Icon for loading state

/**
 * Reusable Primary Button component.
 * Designed for main actions, with loading state and icon support.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content of the button (e.g., text).
 * @param {function} [props.onClick] - Click handler for the button.
 * @param {boolean|string} [props.loading=false] - If true, shows a spinner. If a string, shows the string next to the spinner.
 * @param {object} [props.Icon] - Lucide React icon component to display.
 * @param {string} [props.type='button'] - Button type (e.g., 'submit', 'button').
 * @param {boolean} [props.disabled=false] - Whether the button is disabled.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} A styled primary button.
 */
const PrimaryButton = ({ children, onClick, loading, Icon, type = 'button', disabled, className = '' }) => (
    <button
        type={type}
        onClick={onClick}
        className={`w-full bg-blue-600 text-white py-2 px-3 rounded-md font-bold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-[1.01] ${className}`}
        disabled={loading || disabled} // Disable if loading or explicitly disabled
    >
        {loading ? (
            <>
                <Loader2 size={16} className="animate-spin" />
                <span>{typeof loading === 'string' ? loading : 'Loading...'}</span>
            </>
        ) : (
            <>
                {Icon && <Icon size={16} />}
                <span>{children}</span>
            </>
        )}
    </button>
);

export default PrimaryButton;
