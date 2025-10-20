// src/components/common/CompactDropdown.js

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

/**
 * Compact Dropdown Component for smaller UI elements like filter dropdowns
 * @param {object} props - Component props
 * @param {string} props.value - Current selected value
 * @param {function} props.onChange - Handler for value changes
 * @param {Array} props.options - Array of options: [{ value: 'optionValue', label: 'Option Label' }]
 * @param {string} [props.placeholder] - Placeholder text when no option is selected
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.disabled] - Whether the dropdown is disabled
 * @param {string} [props.label] - Label text for the dropdown
 * @param {JSX.Element} [props.customDisplay] - Custom display component for selected value
 * @returns {JSX.Element} A compact styled dropdown
 */
const CompactDropdown = ({ 
    value, 
    onChange, 
    options, 
    placeholder = "Select...", 
    className = "", 
    disabled = false,
    label = "",
    customDisplay = null
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
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target);
            
            if (isOutsideDropdown && isOutsideButton) {
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
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Calculate optimal width based on content
            const maxContentWidth = Math.max(
                ...memoizedOptions.map(option => {
                    const label = typeof option.label === 'string' ? option.label : option.label?.props?.children || '';
                    return label.length * 7; // Smaller character width for compact
                })
            );
            const optimalWidth = Math.max(rect.width, Math.min(maxContentWidth + 24, 200));
            
            // Smaller dropdown height
            const maxDropdownHeight = 150;
            const estimatedDropdownHeight = Math.min(memoizedOptions.length * 28 + 12, maxDropdownHeight);
            
            // Check if dropdown would go out of viewport
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            const shouldOpenUpward = spaceBelow < maxDropdownHeight && 
                                   spaceAbove > maxDropdownHeight && 
                                   spaceAbove > spaceBelow;
            
            let top, left;
            
            if (shouldOpenUpward) {
                // Open above the button with proper gap to avoid overlap
                top = Math.max(10, rect.top + window.scrollY - estimatedDropdownHeight - 8);
            } else {
                // Open below the button (default)
                top = rect.bottom + window.scrollY + 2;
            }
            
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

    return (
        <>
            <style>{`
                .compact-dropdown-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .compact-dropdown-scroll::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 2px;
                }
                .compact-dropdown-scroll::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 2px;
                }
                .compact-dropdown-scroll::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                .compact-dropdown-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: #c1c1c1 #f1f1f1;
                }
                .compact-dropdown-option {
                    min-height: 28px;
                    display: flex;
                    align-items: center;
                    color: #1f2937 !important;
                }
                .compact-dropdown-option:hover {
                    color: #1f2937 !important;
                    background-color: #e5e7eb !important;
                }
                .compact-dropdown-option:focus {
                    color: #1f2937 !important;
                    background-color: #e5e7eb !important;
                }
                .compact-dropdown-button {
                    min-height: 28px;
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
                    className={`compact-dropdown-button w-full text-xs focus:outline-none transition-all duration-200 flex items-center px-2 py-1.5 border rounded-md ${
                        disabled 
                            ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-200' 
                            : isOpen
                                ? 'border-blue-500 bg-white shadow-sm'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400 }}
                >
                    <div className="flex items-center gap-1 min-w-0 flex-1 text-left">
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
                        className={`w-2.5 h-2.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
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
                        className={`fixed bg-white/95 backdrop-blur-lg border border-gray-300 rounded-md shadow-lg z-[99999] compact-dropdown-scroll ${
                            dropdownPosition.openUpward ? 'rounded-b-none' : 'rounded-t-none'
                        }`}
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            maxHeight: '150px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
                                className={`compact-dropdown-option w-full text-left px-2 py-1.5 text-xs text-gray-800 hover:bg-gray-200 hover:text-gray-900 transition-all duration-200 flex items-center min-w-0 ${
                                    index === 0 ? 'rounded-t-md' : ''
                                } ${
                                    index === memoizedOptions.length - 1 ? 'rounded-b-md' : ''
                                } ${
                                    option.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800'
                                }`}
                                style={{ 
                                    fontFamily: 'Arial, sans-serif', 
                                    fontWeight: 400,
                                    color: '#1f2937'
                                }}
                                title={option.fullLabel || (typeof option.label === 'string' ? option.label : option.label?.props?.children || '')}
                            >
                                <div className="min-w-0 flex-1 whitespace-nowrap flex items-center gap-1">
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

export default CompactDropdown;
