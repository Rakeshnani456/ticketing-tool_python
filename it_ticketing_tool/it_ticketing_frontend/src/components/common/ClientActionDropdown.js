import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Client Action Dropdown Component
 * @param {object} props - Component props
 * @param {function} props.onAddUser - Handler for Add User action (plus icon)
 * @param {function} props.onImportUsers - Handler for Import Users action
 * @param {function} props.onExportUsers - Handler for Export Users action
 * @param {string} props.clientName - Name of the client
 * @returns {JSX.Element} A dropdown button with client actions
 */
const ClientActionDropdown = ({ onAddUser, onImportUsers, onExportUsers, clientName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Calculate dropdown position
    const calculatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const dropdownHeight = 120; // Approximate height of dropdown
            const dropdownWidth = 180; // Approximate width of dropdown
            
            const openUpward = rect.bottom + dropdownHeight > viewportHeight;
            const openLeft = rect.left - dropdownWidth < 0;
            
            setDropdownPosition({
                top: openUpward ? rect.top - dropdownHeight - 5 : rect.bottom + 5,
                left: openLeft ? rect.left : rect.left - dropdownWidth + rect.width,
                width: rect.width,
                openUpward
            });
        }
    };

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

    const handlePlusClick = () => {
        // Plus icon directly calls onAddUser
        onAddUser();
    };

    const handleArrowClick = () => {
        calculatePosition();
        setIsOpen(!isOpen);
    };

    const handleAction = (action) => {
        setIsOpen(false);
        action();
    };

    return (
        <>
            <div className="relative">
                <div className="flex items-center">
                    {/* Add Button - Minimal, compact, neutral */}
                    <div
                        onClick={handlePlusClick}
                        className="flex items-center justify-center px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md transition-colors duration-150 cursor-pointer border border-gray-300 hover:border-gray-400"
                    >
                        <svg 
                            width="12" 
                            height="12" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className="mr-1"
                        >
                            <path 
                                d="M12 5V19M5 12H19" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                        Add
                    </div>
                    
                    {/* Separator Line */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    
                    {/* Arrow Button */}
                    <div
                        ref={buttonRef}
                        onClick={handleArrowClick}
                        className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors duration-200 cursor-pointer"
                    >
                        <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            className={`text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        >
                            <path 
                                d="M6 9L12 15L18 9" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                    }}
                >
                    <button
                        onClick={() => handleAction(onImportUsers)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 transition-colors duration-150"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Import Users
                    </button>
                    
                    <button
                        onClick={() => handleAction(onExportUsers)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 flex items-center gap-2 transition-colors duration-150"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 10L12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 5V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Export Users
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};

export default ClientActionDropdown;
