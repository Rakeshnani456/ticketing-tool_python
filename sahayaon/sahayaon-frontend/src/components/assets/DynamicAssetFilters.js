// components/assets/DynamicAssetFilters.js
import React, { useState, useEffect, useRef } from 'react';
import { FilterIcon, CloseIcon, ChevronDownIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';

const DynamicAssetFilters = ({ 
    filters, 
    onFilterChange, 
    clients = [], 
    users = [],
    onClearFilters,
    excludeFilters = []
}) => {
    const [openFilter, setOpenFilter] = useState(null);
    const filterRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState('bottom'); // 'top' or 'bottom'

    // Calculate dropdown position based on viewport
    useEffect(() => {
        if (openFilter === 'unified' && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;
            const estimatedDropdownHeight = 400; // Approximate max height

            // If not enough space below but enough space above, position above
            if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
    }, [openFilter]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setOpenFilter(null);
            }
        };

        if (openFilter) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openFilter]);

    // Helper function to normalize filter values (handle both string and array)
    const getFilterValue = (filterKey) => {
        const value = filters[filterKey];
        if (!value || value === 'all') return [];
        if (Array.isArray(value)) return value;
        return [value];
    };

    // Helper function to check if a value is selected
    const isValueSelected = (filterKey, value) => {
        const selectedValues = getFilterValue(filterKey);
        return selectedValues.includes(value);
    };

    // Helper function to check if "all" is selected (no specific selections)
    const isAllSelected = (filterKey) => {
        const selectedValues = getFilterValue(filterKey);
        return selectedValues.length === 0 || (selectedValues.length === 1 && selectedValues[0] === 'all');
    };

    const activeFiltersCount = Object.keys(filters)
        .filter(key => !excludeFilters.includes(key))
        .filter(key => {
            const values = getFilterValue(key);
            return values.length > 0 && !values.includes('all');
        }).length;

    const filterOptions = {
        asset_type: {
            label: 'Type',
            options: [
                { value: 'all', label: 'All Types' },
                { value: 'hardware', label: 'Hardware' },
                { value: 'software', label: 'Software' }
            ]
        },
        status: {
            label: 'Status',
            options: [
                { value: 'all', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Retired', label: 'Retired' },
                { value: 'Under Repair', label: 'Under Repair' },
                { value: 'Pending', label: 'Pending' }
            ]
        },
        client_name: {
            label: 'Client',
            options: [
                { value: 'all', label: 'All Clients' },
                ...clients.map(client => ({
                    value: client.companyName || client.client_name,
                    label: client.companyName || client.client_name
                }))
            ]
        },
        owner_uid: {
            label: 'Owner',
            options: [
                { value: 'all', label: 'All Owners' },
                ...users.map(user => ({
                    value: user.uid,
                    label: user.name || user.email
                }))
            ]
        },
        warranty_status: {
            label: 'Warranty',
            options: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'expiring', label: 'Expiring Soon' },
                { value: 'expired', label: 'Expired' },
                { value: 'none', label: 'No Warranty' }
            ]
        }
    };

    const handleOptionToggle = (filterKey, value) => {
        const currentValues = getFilterValue(filterKey);
        
        if (value === 'all') {
            // Selecting "all" clears all other selections
            onFilterChange(filterKey, 'all');
        } else {
            // Toggle the value in the array
            let newValues;
            if (currentValues.includes(value)) {
                // Remove the value
                newValues = currentValues.filter(v => v !== value);
                // If no values left, set to 'all'
                if (newValues.length === 0) {
                    newValues = 'all';
                }
            } else {
                // Add the value (remove 'all' if present)
                newValues = currentValues.filter(v => v !== 'all');
                newValues.push(value);
            }
            onFilterChange(filterKey, newValues);
        }
    };

    const getFilterLabel = (filterKey) => {
        const selectedValues = getFilterValue(filterKey);
        const filterConfig = filterOptions[filterKey];
        if (!filterConfig) return '';
        
        if (isAllSelected(filterKey)) {
            return filterConfig.label;
        }
        
        if (selectedValues.length === 1) {
            const option = filterConfig.options.find(opt => opt.value === selectedValues[0]);
            return option ? option.label : filterConfig.label;
        }
        
        return `${filterConfig.label} (${selectedValues.length})`;
    };

    const getSelectedLabels = (filterKey) => {
        const selectedValues = getFilterValue(filterKey);
        const filterConfig = filterOptions[filterKey];
        if (!filterConfig) return [];
        
        return selectedValues
            .filter(v => v !== 'all')
            .map(value => {
                const option = filterConfig.options.find(opt => opt.value === value);
                return option ? option.label : value;
            });
    };

    return (
        <div ref={filterRef} className="space-y-2">
            {/* Unified Filter Button */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <button
                        ref={buttonRef}
                        type="button"
                        onClick={() => setOpenFilter(openFilter === 'unified' ? null : 'unified')}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeFiltersCount > 0
                                ? 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                        } ${openFilter === 'unified' ? 'ring-2 ring-blue-500' : ''}`}
                    >
                        <FilterIcon className="w-3.5 h-3.5" />
                        <span>Filter</span>
                        {activeFiltersCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs font-bold">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${openFilter === 'unified' ? 'transform rotate-180' : ''}`} />
                    </button>

                    {/* Unified Dropdown Menu */}
                    <AnimatePresence>
                        {openFilter === 'unified' && (
                            <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, y: dropdownPosition === 'top' ? 5 : -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: dropdownPosition === 'top' ? 5 : -5 }}
                                className={`absolute ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 z-50 bg-white rounded-md shadow-xl min-w-[240px] max-h-96 overflow-y-auto`}
                            >
                                {Object.keys(filterOptions)
                                    .filter(filterKey => !excludeFilters.includes(filterKey))
                                    .map((filterKey, index) => {
                                    const filterConfig = filterOptions[filterKey];
                                    const selectedValues = getFilterValue(filterKey);
                                    const selectedLabels = getSelectedLabels(filterKey);
                                    const filterKeys = Object.keys(filterOptions).filter(key => !excludeFilters.includes(key));
                                    
                                    return (
                                        <div key={filterKey}>
                                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                                <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                                    {filterConfig.label}
                                                </div>
                                                {selectedLabels.length > 0 && (
                                                    <div className="text-xs text-blue-600 mt-0.5">
                                                        {selectedLabels.length === 1 
                                                            ? `Selected: ${selectedLabels[0]}`
                                                            : `Selected: ${selectedLabels.length} items`
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                            {filterConfig.options.map(option => {
                                                const isSelected = isValueSelected(filterKey, option.value);
                                                const isAllOption = option.value === 'all';
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => handleOptionToggle(filterKey, option.value)}
                                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-all duration-150 flex items-center space-x-2 ${
                                                            isSelected ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-gray-700 font-medium'
                                                        } ${isAllOption ? 'border-b border-gray-300' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}} // Handled by button onClick
                                                            className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                                            readOnly
                                                        />
                                                        <span>{option.label}</span>
                                                    </button>
                                                );
                                            })}
                                            {index < filterKeys.length - 1 && (
                                                <div className="border-b border-gray-200 my-1" />
                                            )}
                                        </div>
                                    );
                                })}
                                
                                {activeFiltersCount > 0 && (
                                    <>
                                        <div className="border-t border-gray-300 my-1" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClearFilters();
                                                setOpenFilter(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-all"
                                        >
                                            Clear All Filters
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.keys(filterOptions)
                        .filter(filterKey => !excludeFilters.includes(filterKey))
                        .map(filterKey => {
                        const selectedValues = getFilterValue(filterKey);
                        const selectedLabels = getSelectedLabels(filterKey);
                        if (selectedLabels.length === 0) return null;
                        
                        const filterConfig = filterOptions[filterKey];

                        return selectedLabels.map((label, idx) => (
                            <motion.span
                                key={`${filterKey}-${idx}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center space-x-1.5 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold"
                            >
                                <span>{filterConfig.label}: {label}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const currentValues = getFilterValue(filterKey);
                                        const valueToRemove = filterConfig.options.find(opt => opt.label === label)?.value;
                                        if (valueToRemove) {
                                            const newValues = currentValues.filter(v => v !== valueToRemove);
                                            onFilterChange(filterKey, newValues.length === 0 ? 'all' : newValues);
                                        }
                                    }}
                                    className="hover:text-blue-900 hover:bg-blue-200 rounded p-0.5 transition-all"
                                >
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </motion.span>
                        ));
                    })}
                </div>
            )}
        </div>
    );
};

export default DynamicAssetFilters;
