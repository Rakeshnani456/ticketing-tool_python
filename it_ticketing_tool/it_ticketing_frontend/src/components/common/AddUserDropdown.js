import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Add as AddIcon } from '@mui/icons-material';
import CustomButton from './CustomButton';

const AddUserDropdown = ({ clients, onAddUser, onAddUserForClient }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    const calculatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const dropdownHeight = Math.min(300, (clients.length + 1) * 40 + 20); // Dynamic height based on clients
            const dropdownWidth = 200;

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

    const handleAddUserClick = () => {
        onAddUser();
    };

    const handleClientClick = (clientName) => {
        setIsOpen(false);
        onAddUserForClient(clientName);
    };

    const handleDropdownClick = () => {
        calculatePosition();
        setIsOpen(!isOpen);
    };

    return (
        <>
            <div className="relative">
                <div className="flex items-center">
                    {/* Add User Button - Non-button style */}
                    <div
                        onClick={handleAddUserClick}
                        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors duration-200 cursor-pointer"
                    >
                        <AddIcon sx={{ fontSize: '0.875rem', marginRight: '6px' }} />
                        Add User
                    </div>

                    {/* Separator Line */}
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* Dropdown Arrow Button */}
                    <div
                        ref={buttonRef}
                        onClick={handleDropdownClick}
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
                    </button>
                </div>
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className={`absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 transition-all duration-200 ease-out transform ${dropdownPosition.openUpward ? 'origin-bottom' : 'origin-top'}`}
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                >
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        Select Client
                    </div>
                    {clients.map((client) => (
                        <button
                            key={client.id}
                            onClick={() => handleClientClick(client.companyName)}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors duration-150"
                        >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            {client.companyName}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default AddUserDropdown;
