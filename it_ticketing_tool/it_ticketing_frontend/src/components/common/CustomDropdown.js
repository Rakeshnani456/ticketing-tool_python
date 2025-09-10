// src/components/common/CustomDropdown.js

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Custom Dropdown Component that matches the app's design system
 * @param {object} props - Component props
 * @param {string} props.value - Current selected value
 * @param {function} props.onChange - Handler for value changes
 * @param {Array} props.options - Array of options: [{ value: 'optionValue', label: 'Option Label' }]
 * @param {string} [props.placeholder] - Placeholder text when no option is selected
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled] - Whether the dropdown is disabled
 * @param {string} [props.label] - Label text for the dropdown
 * @param {string} [props.variant] - Style variant: "default" or "minimal"
 * @param {JSX.Element} [props.customDisplay] - Custom display component for selected value
 * @returns {JSX.Element} A styled custom dropdown
 */
const CustomDropdown = ({ 
    value, 
    onChange, 
    options, 
    placeholder = "Select an option...", 
    className = "", 
    disabled = false,
    label = "",
    variant = "default", // "default" or "minimal"
    customDisplay = null // Custom display component for the selected value
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Find the selected option based on value
    useEffect(() => {
        const option = options.find(opt => opt.value === value);
        setSelectedOption(option);
    }, [value, options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        function handleScroll() {
            if (isOpen) {
                calculatePosition();
            }
        }

        function handleResize() {
            if (isOpen) {
                calculatePosition();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    // Calculate dropdown position when opening
    const calculatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    const handleOptionClick = (option) => {
        onChange(option.value);
        setIsOpen(false);
    };

    const handleToggle = () => {
        if (!disabled) {
            if (!isOpen) {
                calculatePosition();
            }
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label className="block text-[10px] font-semibold text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`w-full text-xs focus:outline-none transition-all duration-200 flex items-center ${
                        variant === 'minimal' 
                            ? `px-1 py-0.5 border-0 bg-transparent hover:bg-gray-50 rounded ${
                                disabled 
                                    ? 'cursor-not-allowed text-gray-500' 
                                    : isOpen
                                        ? 'bg-gray-50'
                                        : 'text-gray-700 hover:text-gray-900'
                            }`
                            : `px-3 py-1.5 border rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                                disabled 
                                    ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200' 
                                    : isOpen
                                        ? 'border-blue-500 bg-white shadow-sm'
                                        : 'border-gray-300 bg-white hover:border-gray-400'
                            }`
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                        <div 
                            className="min-w-0 flex-1 truncate"
                            title={selectedOption?.fullLabel || (typeof selectedOption?.label === 'string' ? selectedOption.label : selectedOption?.label?.props?.children || '')}
                        >
                            {customDisplay && selectedOption ? customDisplay : (selectedOption ? selectedOption.label : placeholder)}
                        </div>
                    </div>
                    <svg 
                        className={`w-3 h-3 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                        }`} 
                        viewBox="0 0 12 12" 
                        fill="currentColor"
                    >
                        <path d="M6 9L1.5 4.5L10.5 4.5L6 9Z" />
                    </svg>
                </button>

                {isOpen && createPortal(
                    <div 
                        ref={dropdownRef}
                        className="fixed bg-white/95 backdrop-blur-lg border border-gray-300 rounded-md shadow-lg z-[9999]"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            animation: 'fadeInDown 0.15s ease-out'
                        }}
                    >
                        {options.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionClick(option)}
                                className={`w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100/80 transition-all duration-200 flex items-center min-w-0 ${
                                    index === 0 ? 'rounded-t-md' : ''
                                } ${
                                    index === options.length - 1 ? 'rounded-b-md' : ''
                                } ${
                                    option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                }`}
                                title={option.fullLabel || (typeof option.label === 'string' ? option.label : option.label?.props?.children || '')}
                            >
                                <div className="min-w-0 flex-1 truncate">
                                    {typeof option.label === 'string' ? option.label : option.label}
                                </div>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default CustomDropdown;
