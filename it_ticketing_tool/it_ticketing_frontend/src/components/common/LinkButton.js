// src/components/common/LinkButton.js

import React from 'react';

/**
 * Reusable Link Button component.
 * Styled to look like a hyperlink but functions as a button.
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Content of the button (e.g., text).
 * @param {function} props.onClick - Click handler for the button.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} A styled button that looks like a link.
 */
const LinkButton = ({ children, onClick, className = '' }) => (
    <button
        type="button" // Explicitly 'button' to prevent form submission if nested
        onClick={onClick}
        className={`text-blue-600 hover:underline font-semibold text-sm transition duration-200 ${className}`}
    >
        {children}
    </button>
);

export default LinkButton;
