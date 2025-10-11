// src/components/common/CustomDropdown.js

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
    customDisplay = null, // Custom display component for the selected value
    size = 'md', // 'sm' | 'md' - controls button height and font size
    disableClickOutside = false // Disable click outside detection for modal contexts
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Memoize options to prevent unnecessary re-renders
    const memoizedOptions = useMemo(() => options, [JSON.stringify(options)]);
    
    // Find the selected option based on value
    useEffect(() => {
        const option = memoizedOptions.find(opt => opt.value === value);
        setSelectedOption(option);
    }, [value, memoizedOptions]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            // Check if click is outside both dropdown and button
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target);
            
            // Only close if click is outside both elements AND not on a modal backdrop
            const isModalBackdrop = event.target.classList.contains('bg-black') && event.target.classList.contains('bg-opacity-30');
            
            if (isOutsideDropdown && isOutsideButton && !isModalBackdrop) {
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

        if (isOpen && !disableClickOutside) {
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
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Calculate optimal width based on content
            const maxContentWidth = Math.max(
                ...memoizedOptions.map(option => {
                    const label = typeof option.label === 'string' ? option.label : option.label?.props?.children || '';
                    return label.length * 8; // Approximate character width
                })
            );
            // Use button width as minimum, but ensure dropdown is at least as wide as the button
            const optimalWidth = Math.max(rect.width, Math.min(maxContentWidth + 32, 300));
            
            // Fixed dropdown height with scrollbar
            const maxDropdownHeight = 200; // Fixed max height
            const estimatedDropdownHeight = Math.min(memoizedOptions.length * 32 + 16, maxDropdownHeight);
            
            // Check if dropdown would go out of viewport when opening below
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Determine if dropdown should open upward
            // Open upward if there's not enough space below AND there's more space above
            const shouldOpenUpward = spaceBelow < maxDropdownHeight && 
                                   spaceAbove > maxDropdownHeight && 
                                   spaceAbove > spaceBelow;
            
            // Calculate position
            let top, left;
            
            if (shouldOpenUpward) {
                // Open above the button with proper gap to avoid overlap
                top = Math.max(10, rect.top + window.scrollY - estimatedDropdownHeight - 8);
            } else {
                // Open below the button (default)
                top = rect.bottom + window.scrollY + 2;
            }
            
            // Ensure dropdown doesn't go off the edges of viewport
            // For modals, try to align with button first, then adjust if needed
            let preferredLeft = rect.left + window.scrollX;
            if (preferredLeft + optimalWidth > viewportWidth - 10) {
                preferredLeft = viewportWidth - optimalWidth - 10;
            }
            left = Math.max(10, preferredLeft);
            
            setDropdownPosition({
                top,
                left,
                width: optimalWidth,
                openUpward: shouldOpenUpward
            });
        }
    };

    const handleOptionClick = (option, event) => {
        event.preventDefault();
        event.stopPropagation();
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

    // Compute size classes
    const sizeTextClass = size === 'sm' ? 'text-xs' : 'text-sm';
    const sizePadDefault = size === 'sm' ? 'px-3 py-2.5' : 'px-3 py-3';
    const sizePadMinimal = size === 'sm' ? 'px-2 py-1.5' : 'px-2 py-2';

    return (
        <>
            <style>{`
                .custom-dropdown-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-dropdown-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                .custom-dropdown-scroll::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                .custom-dropdown-scroll::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                .custom-dropdown-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #c1c1c1 #f1f1f1;
                }
                .dropdown-option {
                    min-height: 40px;
                    display: flex;
                    align-items: center;
                    color: #1f2937 !important;
                }
                .dropdown-option * {
                    color: #1f2937 !important;
                }
                .dropdown-option .flag {
                    font-size: 18px;
                    line-height: 1;
                }
                .dropdown-option:hover {
                    color: #1f2937 !important;
                    background-color: #e5e7eb !important;
                    border-left: 3px solid #3b82f6 !important;
                }
                .dropdown-option:hover * {
                    color: #1f2937 !important;
                }
                .dropdown-option:focus {
                    color: #1f2937 !important;
                    background-color: #e5e7eb !important;
                    border-left: 3px solid #3b82f6 !important;
                }
                .dropdown-option:focus * {
                    color: #1f2937 !important;
                }
                .dropdown-option span {
                    color: #1f2937 !important;
                }
                .dropdown-option div {
                    color: #1f2937 !important;
                }
                .dropdown-option div span {
                    color: #1f2937 !important;
                }
                .dropdown-option button {
                    color: #1f2937 !important;
                }
                .dropdown-option * {
                    color: #1f2937 !important;
                }
                .custom-dropdown-button {
                    min-height: 40px;
                }
            `}</style>
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
                    className={`custom-dropdown-button w-full ${sizeTextClass} focus:outline-none transition-all duration-200 flex items-center ${
                        variant === 'minimal' 
                            ? `${sizePadMinimal} border-0 bg-transparent hover:bg-gray-50 rounded ${
                                disabled 
                                    ? 'cursor-not-allowed text-gray-500' 
                                    : isOpen
                                        ? 'bg-gray-50'
                                        : 'text-gray-700 hover:text-gray-900'
                            }`
                            : `${sizePadDefault} border rounded-md focus:outline-none ${
                                disabled 
                                    ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200' 
                                    : isOpen
                                        ? 'border-blue-500 bg-white shadow-sm'
                                        : 'border-gray-300 bg-white hover:border-gray-400'
                            }`
                    }`}
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontOpticalSizing: 'auto', fontStyle: 'normal' }}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                        <div 
                            className="min-w-0 flex-1 truncate"
                            title={selectedOption?.fullLabel || (typeof selectedOption?.label === 'string' ? selectedOption.label : selectedOption?.label?.props?.children || '')}
                        >
                            {customDisplay && selectedOption ? customDisplay : (selectedOption ? (
                                typeof selectedOption.label === 'string' ? (
                                    selectedOption.label
                                ) : (
                                    selectedOption.label
                                )
                            ) : placeholder)}
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
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        className={`fixed bg-white/95 backdrop-blur-lg border border-gray-300 rounded-md shadow-lg z-[10000] custom-dropdown-scroll ${
                            dropdownPosition.openUpward ? 'rounded-b-none' : 'rounded-t-none'
                        }`}
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            maxHeight: '200px',
                            overflowY: 'auto',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            animation: dropdownPosition.openUpward ? 'fadeInUp 0.15s ease-out' : 'fadeInDown 0.15s ease-out'
                        }}
                    >
                        {memoizedOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={(e) => handleOptionClick(option, e)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onMouseUp={(e) => e.stopPropagation()}
                                className={`dropdown-option w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 flex items-center min-w-0 ${
                                    index === 0 ? 'rounded-t-md' : ''
                                } ${
                                    index === memoizedOptions.length - 1 ? 'rounded-b-md' : ''
                                } ${
                                    option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                                }`}
                                style={{ 
                                    fontFamily: 'Arial, sans-serif', 
                                    fontWeight: 400, 
                                    fontOpticalSizing: 'auto', 
                                    fontStyle: 'normal',
                                    color: '#1f2937'
                                }}
                                title={option.fullLabel || (typeof option.label === 'string' ? option.label : option.label?.props?.children || '')}
                            >
                                <div className="min-w-0 flex-1 whitespace-nowrap flex items-center gap-2">
                                    {typeof option.label === 'string' ? (
                                        <span style={{ color: '#1f2937' }}>
                                            {option.label}
                                        </span>
                                    ) : (
                                        option.label
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
            </div>
        </div>
        </>
    );
};

export default CustomDropdown;
