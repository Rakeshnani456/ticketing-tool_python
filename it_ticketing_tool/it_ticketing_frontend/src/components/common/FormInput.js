// src/components/common/FormInput.js

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react'; // Icons for password toggle

/**
 * Reusable Form Input component with integrated password toggle and icon support.
 * @param {object} props - Component props.
 * @param {string} props.id - Unique ID for the input and label.
 * @param {string} [props.label] - Label text for the input.
 * @param {string} props.type - Input type (e.g., 'text', 'email', 'password').
 * @param {string} props.value - Current value of the input.
 * @param {function} props.onChange - Handler for input value changes.
 * @param {boolean} [props.required=false] - Whether the input is required.
 * @param {boolean} [props.error=false] - Whether to show error styling.
 * @param {function} [props.onFocus] - Handler for input focus event.
 * @param {string} [props.placeholder] - Placeholder text for the input.
 * @param {boolean} [props.disabled=false] - Whether the input is disabled.
 * @param {object} [props.icon] - Lucide React icon component to display inside the input.
 * @param {boolean} [props.showPasswordToggle=false] - Whether to show the password toggle button.
 * @param {number} [props.maxLength] - Maximum length of the input value.
 * @param {string} [props.className] - Additional CSS classes for the input element.
 * @returns {JSX.Element} A styled input field.
 */
const FormInput = ({ id, label, type, value, onChange, required, error, onFocus, placeholder, disabled, icon: Icon, showPasswordToggle = false, maxLength, className = '' }) => {
    const [showPassword, setShowPassword] = useState(false);
    // Determine the actual input type, considering the password toggle
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
        <div>
            {/* Render label only if provided */}
            {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
            <div className="relative">
                <input
                    type={inputType}
                    id={id}
                    className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200 pr-9
                    ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'}
                    ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${className}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                    onFocus={onFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={maxLength}
                />
                {/* Conditional rendering for password toggle button */}
                {showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 hover:text-gray-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
                {/* Conditional rendering for other icons, ensuring it doesn't conflict with password toggle */}
                {Icon && !showPasswordToggle && (
                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <Icon size={16} className="text-gray-400" />
                    </span>
                )}
            </div>
        </div>
    );
};

export default FormInput;
