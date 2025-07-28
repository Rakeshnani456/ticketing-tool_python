// src/components/common/FormTextarea.js

import React from 'react';

/**
 * Reusable Form Textarea component.
 * @param {object} props - Component props.
 * @param {string} props.id - Unique ID for the textarea and label.
 * @param {string} [props.label] - Label text for the textarea.
 * @param {string} props.value - Current value of the textarea.
 * @param {function} props.onChange - Handler for textarea value changes.
 * @param {boolean} [props.required=false] - Whether the textarea is required.
 * @param {number} [props.rows=3] - Number of rows for the textarea.
 * @param {string} [props.placeholder] - Placeholder text for the textarea.
 * @param {boolean} [props.disabled=false] - Whether the textarea is disabled.
 * @param {number} [props.maxLength] - Maximum length of the textarea value.
 * @param {string} [props.className] - Additional CSS classes for the textarea element.
 * @returns {JSX.Element} A styled textarea field.
 */
const FormTextarea = ({ id, label, value, onChange, required, rows = 3, placeholder, disabled, maxLength, className = '' }) => (
    <div>
        {/* Render label only if provided */}
        {label && <label htmlFor={id} className="block text-gray-700 text-sm font-semibold mb-1">{label}:</label>}
        <textarea
            id={id}
            className={`w-full px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 transition duration-200
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-200 bg-white'} ${className}`}
            rows={rows}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
        ></textarea>
    </div>
);

export default FormTextarea;
