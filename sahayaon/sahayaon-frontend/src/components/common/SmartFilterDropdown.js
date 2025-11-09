// src/components/common/SmartFilterDropdown.js

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Filter, 
    X, 
    Calendar, 
    User, 
    Building2, 
    AlertTriangle, 
    Clock, 
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Search,
    Plus,
    Minus
} from 'lucide-react';

/**
 * Smart Filter Dropdown Component - Jira-like filtering system
 * Provides advanced filtering capabilities for tickets with multiple filter types
 */
const SmartFilterDropdown = ({ 
    filters = {}, 
    onFiltersChange, 
    availableEngineers = [], 
    availableClients = [], 
    className = "",
    disabled = false,
    showClearAll = true,
    user = null  // Add user prop to check role
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    // Filter types configuration
    const filterTypes = useMemo(() => {
        const allFilterTypes = [
            {
                id: 'status',
                label: 'Status',
                icon: CheckCircle,
                options: [
                    { value: 'Open', label: 'Open', color: 'bg-green-100 text-green-800' },
                    { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
                    { value: 'Hold', label: 'On Hold', color: 'bg-purple-100 text-purple-800' },
                    { value: 'Resolved', label: 'Resolved', color: 'bg-blue-100 text-blue-800' },
                    { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
                ]
            },
            {
                id: 'priority',
                label: 'Priority',
                icon: AlertTriangle,
                options: [
                    { value: 'Low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
                    { value: 'Medium', label: 'Medium', color: 'bg-orange-100 text-orange-800' },
                    { value: 'High', label: 'High', color: 'bg-red-100 text-red-800' },
                    { value: 'Critical', label: 'Critical', color: 'bg-red-200 text-red-900 border border-red-500' }
                ]
            },
            {
                id: 'assigned',
                label: 'Assigned To',
                icon: User,
                options: [
                    { value: 'unassigned', label: 'Unassigned', color: 'bg-gray-100 text-gray-800' },
                    { value: 'assigned_to_me', label: 'My Queue', color: 'bg-blue-100 text-blue-800' },
                    ...availableEngineers.map(engineer => ({
                        value: engineer.email,
                        label: engineer.name || engineer.email.split('@')[0],
                        color: 'bg-indigo-100 text-indigo-800'
                    }))
                ]
            },
            {
                id: 'client',
                label: 'Client',
                icon: Building2,
                options: availableClients.map(client => ({
                    value: client['Client name'] || client.companyName,
                    label: client['Client name'] || client.companyName,
                    color: 'bg-emerald-100 text-emerald-800'
                }))
            },
            {
                id: 'created',
                label: 'Created Date',
                icon: Calendar,
                options: [
                    { value: 'today', label: 'Today', color: 'bg-blue-100 text-blue-800' },
                    { value: 'yesterday', label: 'Yesterday', color: 'bg-gray-100 text-gray-800' },
                    { value: 'last_7_days', label: 'Last 7 days', color: 'bg-green-100 text-green-800' },
                    { value: 'last_30_days', label: 'Last 30 days', color: 'bg-yellow-100 text-yellow-800' },
                    { value: 'last_90_days', label: 'Last 90 days', color: 'bg-orange-100 text-orange-800' },
                    { value: 'this_year', label: 'This year', color: 'bg-purple-100 text-purple-800' }
                ]
            }
        ];
        
        // Hide client and assigned filters for site_admin users since they should only see their own client
        if (user?.role === 'site_admin') {
            return allFilterTypes.filter(type => type.id !== 'client' && type.id !== 'assigned');
        }
        
        return allFilterTypes;
    }, [availableEngineers, availableClients, user?.role]);

    // Calculate active filters count
    const activeFiltersCount = useMemo(() => {
        return Object.values(filters).reduce((count, filterValue) => {
            if (Array.isArray(filterValue)) {
                return count + filterValue.length;
            }
            return count + (filterValue && filterValue !== '' ? 1 : 0);
        }, 0);
    }, [filters]);

    // Handle filter changes
    const handleFilterChange = (filterType, value, isMultiSelect = false) => {
        const newFilters = { ...filters };
        
        if (isMultiSelect) {
            if (!newFilters[filterType]) {
                newFilters[filterType] = [];
            }
            
            const currentValues = newFilters[filterType];
            if (currentValues.includes(value)) {
                newFilters[filterType] = currentValues.filter(v => v !== value);
            } else {
                newFilters[filterType] = [...currentValues, value];
            }
            
            // Remove empty arrays
            if (newFilters[filterType].length === 0) {
                delete newFilters[filterType];
            }
        } else {
            if (newFilters[filterType] === value) {
                delete newFilters[filterType];
            } else {
                newFilters[filterType] = value;
            }
        }
        
        onFiltersChange(newFilters);
    };

    // Clear all filters
    const clearAllFilters = () => {
        onFiltersChange({});
        setActiveFilterType(null);
    };

    // Clear specific filter
    const clearFilter = (filterType) => {
        const newFilters = { ...filters };
        delete newFilters[filterType];
        onFiltersChange(newFilters);
    };

    // Get filtered options based on search
    const getFilteredOptions = (filterType) => {
        const type = filterTypes.find(t => t.id === filterType);
        if (!type) return [];
        
        if (!searchTerm) return type.options;
        
        return type.options.filter(option => 
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Calculate dropdown position
    const calculatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Responsive dropdown width
            const dropdownWidth = viewportWidth < 640 ? Math.min(280, viewportWidth - 20) : 320;
            const dropdownHeight = 400;
            
            // Always try to position below the button first
            let top = rect.bottom + 8; // 8px gap below button
            let left = rect.left; // Align with left edge of button
            
            // Check if dropdown would go off the right edge of viewport
            if (left + dropdownWidth > viewportWidth - 10) {
                // Align with right edge of button instead
                left = rect.right - dropdownWidth;
            }
            
            // Check if dropdown would go off the bottom of viewport
            if (top + dropdownHeight > viewportHeight - 10) {
                // Position above the button instead
                top = rect.top - dropdownHeight - 8;
            }
            
            // Final boundary checks
            if (left < 10) {
                left = 10;
            }
            if (left + dropdownWidth > viewportWidth - 10) {
                left = viewportWidth - dropdownWidth - 10;
            }
            if (top < 10) {
                top = 10;
            }
            if (top + dropdownHeight > viewportHeight - 10) {
                top = viewportHeight - dropdownHeight - 10;
            }
            
            // Ensure minimum gap from button
            if (top < rect.bottom + 4) {
                top = rect.bottom + 4;
            }
            
            // Debug logging
            console.log('Dropdown positioning:', {
                buttonRect: rect,
                viewport: { width: viewportWidth, height: viewportHeight },
                dropdown: { top, left, width: dropdownWidth, height: dropdownHeight },
                calculated: { top, left, width: dropdownWidth }
            });
            
            setDropdownPosition({ top, left, width: dropdownWidth });
        }
    };

    // Handle click outside and window resize
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveFilterType(null);
                setSearchTerm('');
            }
        }

        function handleResize() {
            if (isOpen) {
                calculatePosition();
            }
        }

        function handleScroll() {
            if (isOpen) {
                calculatePosition();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('resize', handleResize);
            window.addEventListener('scroll', handleScroll);
            // Add a small delay to ensure proper positioning after layout changes
            setTimeout(() => {
                calculatePosition();
            }, 10);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setActiveFilterType(null);
                setSearchTerm('');
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = () => {
        if (!disabled) {
            if (!isOpen) {
                // Calculate position before opening
                setTimeout(() => {
                    calculatePosition();
                }, 10);
            }
            setIsOpen(!isOpen);
            if (isOpen) {
                setActiveFilterType(null);
                setSearchTerm('');
            }
        }
    };

    return (
        <>
            <style>{`
                .smart-filter-dropdown {
                    max-height: 400px;
                    overflow-y: auto;
                }
                .smart-filter-dropdown::-webkit-scrollbar {
                    width: 6px;
                }
                .smart-filter-dropdown::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 3px;
                }
                .smart-filter-dropdown::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                .smart-filter-dropdown::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
                .filter-option {
                    transition: all 0.2s ease;
                }
                .filter-option:hover {
                    background-color: #f3f4f6;
                }
                .filter-option.selected {
                    background-color: #dbeafe;
                }
                .filter-badge {
                    animation: fadeIn 0.2s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            
            <div className={`relative ${className}`}>
                {/* Filter Button */}
                <button
                    ref={buttonRef}
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`
                        flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border h-8
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                        ${disabled 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : isOpen
                                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }
                    `}
                >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>


                {/* Dropdown */}
                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed bg-white border border-gray-300 rounded-lg shadow-lg smart-filter-dropdown"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            maxHeight: '400px',
                            zIndex: 999999,
                            backgroundColor: 'white',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {!activeFilterType ? (
                            // Main filter menu
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900">Filter by</h3>
                                    {showClearAll && activeFiltersCount > 0 && (
                                        <button
                                            onClick={clearAllFilters}
                                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                                        >
                                            Clear all
                                        </button>
                                    )}
                                </div>
                                
                                {/* Active Filters Display */}
                                {activeFiltersCount > 0 && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                                        <div className="text-xs font-medium text-blue-800 mb-2">Active Filters:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(filters).map(([filterType, value]) => {
                                                const type = filterTypes.find(t => t.id === filterType);
                                                if (!type) return null;
                                                
                                                // Get the actual display values for the selected options
                                                let displayValues = [];
                                                if (Array.isArray(value)) {
                                                    // For arrays, get the labels from the filter type options
                                                    displayValues = value.map(val => {
                                                        const option = type.options.find(opt => opt.value === val);
                                                        return option ? option.label : val;
                                                    });
                                                } else {
                                                    // For single values, get the label from the filter type options
                                                    const option = type.options.find(opt => opt.value === value);
                                                    displayValues = [option ? option.label : value];
                                                }
                                                
                                                const displayLabel = `${type.label}: ${displayValues.join(', ')}`;
                                                
                                                return (
                                                    <span
                                                        key={filterType}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md"
                                                    >
                                                        {displayLabel}
                                                        <button
                                                            onClick={() => clearFilter(filterType)}
                                                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-1">
                                    {filterTypes.map((type) => {
                                        const Icon = type.icon;
                                        const isActive = filters[type.id];
                                        const count = Array.isArray(filters[type.id]) 
                                            ? filters[type.id].length 
                                            : (filters[type.id] && filters[type.id] !== '' ? 1 : 0);
                                        
                                        return (
                                            <button
                                                key={type.id}
                                                onClick={() => setActiveFilterType(type.id)}
                                                className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded-md transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className="w-4 h-4 text-gray-500" />
                                                    <span className="text-sm text-gray-700">{type.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {count > 0 && (
                                                        <>
                                                            <span className="bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-0.5">
                                                                {count}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    clearFilter(type.id);
                                                                }}
                                                                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                                                                title={`Clear ${type.label} filter`}
                                                            >
                                                                <X className="w-3 h-3 text-red-500 hover:text-red-700" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            // Specific filter options
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setActiveFilterType(null)}
                                            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
                                        </button>
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            {filterTypes.find(t => t.id === activeFilterType)?.label}
                                        </h3>
                                    </div>
                                    {/* Clear button for this specific filter type */}
                                    {filters[activeFilterType] && (
                                        <button
                                            onClick={() => clearFilter(activeFilterType)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                            title={`Clear ${filterTypes.find(t => t.id === activeFilterType)?.label} filter`}
                                        >
                                            <X className="w-3 h-3" />
                                            Clear
                                        </button>
                                    )}
                                </div>
                                
                                {/* Search for filter options */}
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Filter options */}
                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {getFilteredOptions(activeFilterType).map((option) => {
                                        const isSelected = Array.isArray(filters[activeFilterType])
                                            ? filters[activeFilterType].includes(option.value)
                                            : filters[activeFilterType] === option.value;
                                        
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleFilterChange(
                                                    activeFilterType, 
                                                    option.value, 
                                                    activeFilterType === 'status' || activeFilterType === 'priority' || activeFilterType === 'assigned'
                                                )}
                                                className={`w-full flex items-center gap-3 p-2 text-left rounded-md transition-colors filter-option ${
                                                    isSelected ? 'selected' : ''
                                                }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                                    isSelected 
                                                        ? 'bg-blue-600 border-blue-600' 
                                                        : 'border-gray-300'
                                                }`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${option.color || 'bg-gray-100 text-gray-800'}`}>
                                                    {option.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>
        </>
    );
};

export default SmartFilterDropdown;
