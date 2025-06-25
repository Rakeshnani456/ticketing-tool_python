// src/components/common/FormSelect.js

import React from 'react';

/**
 * Reusable Form Select (dropdown) component.
 * @param {object} props - Component props.
 * @param {string} props.id - Unique ID for the select and label.
 * @param {string} [props.label] - Label text for the select.
 * @param {string} props.value - Current value of the select.
 * @param {function} props.onChange - Handler for select value changes.
 * @param {Array<object>} props.options - Array of options: [{ value: 'optionValue', label: 'Option Label' }].
 * @param {boolean} [props.required=false] - Whether the select is required.
 * @param {boolean} [props.disabled=false] - Whether the select is disabled.
 * @param {string} [props.className] - Additional CSS classes for the select element.
 * @returns {JSX.Element} A styled select dropdown.
 */
const FormSelect = ({ id, label, value, onChange, options, required, disabled, className = '' }) => (
    <div>
        {/* Render label only if provided */}
        {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
        <select
            id={id}
            className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-200 bg-white'} ${className}`}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
        >
            {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </div>
);

export default FormSelect;
