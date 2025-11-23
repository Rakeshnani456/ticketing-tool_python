// components/assets/AssetFilters.js
import React, { useState } from 'react';
import { FilterIcon, CloseIcon, SearchIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';

const AssetFilters = ({ 
    filters, 
    onFilterChange, 
    clients = [], 
    users = [],
    onClearFilters 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const activeFiltersCount = Object.values(filters).filter(v => v && v !== '' && v !== 'all').length;

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
                        type="button"
                    >
                        <FilterIcon className="w-4 h-4" />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={onClearFilters}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
                            type="button"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-4 border-t border-gray-200">
                            {/* Asset Type Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Asset Type</label>
                                <select
                                    value={filters.asset_type || 'all'}
                                    onChange={(e) => onFilterChange('asset_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="hardware">Hardware</option>
                                    <option value="software">Software</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    value={filters.status || 'all'}
                                    onChange={(e) => onFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Retired">Retired</option>
                                    <option value="Under Repair">Under Repair</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </div>

                            {/* Client Filter */}
                            {clients.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Client</label>
                                    <select
                                        value={filters.client_name || 'all'}
                                        onChange={(e) => onFilterChange('client_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Clients</option>
                                        {clients.map(client => (
                                            <option key={client.id || client.companyName} value={client.companyName || client.client_name}>
                                                {client.companyName || client.client_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Owner Filter */}
                            {users.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Owner</label>
                                    <select
                                        value={filters.owner_uid || 'all'}
                                        onChange={(e) => onFilterChange('owner_uid', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All Owners</option>
                                        {users.map(user => (
                                            <option key={user.uid} value={user.uid}>
                                                {user.name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Warranty Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">Warranty Status</label>
                                <select
                                    value={filters.warranty_status || 'all'}
                                    onChange={(e) => onFilterChange('warranty_status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="all">All</option>
                                    <option value="active">Active</option>
                                    <option value="expiring">Expiring Soon (30 days)</option>
                                    <option value="expired">Expired</option>
                                    <option value="none">No Warranty</option>
                                </select>
                            </div>

                            {/* Subscription Filter (Software) */}
                            {filters.asset_type === 'software' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-2">Subscription Status</label>
                                    <select
                                        value={filters.subscription_status || 'all'}
                                        onChange={(e) => onFilterChange('subscription_status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="expiring">Renewing Soon (30 days)</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Filter Tags */}
            {activeFiltersCount > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {filters.asset_type && filters.asset_type !== 'all' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                <span>Type: {filters.asset_type}</span>
                                <button
                                    onClick={() => onFilterChange('asset_type', 'all')}
                                    className="hover:text-blue-900 transition-colors duration-150 focus:outline-none rounded"
                                    type="button"
                                >
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {filters.status && filters.status !== 'all' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                <span>Status: {filters.status}</span>
                                <button
                                    onClick={() => onFilterChange('status', 'all')}
                                    className="hover:text-green-900 transition-colors duration-150 focus:outline-none rounded"
                                    type="button"
                                >
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {filters.client_name && filters.client_name !== 'all' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                <span>Client: {filters.client_name}</span>
                                <button
                                    onClick={() => onFilterChange('client_name', 'all')}
                                    className="hover:text-purple-900 transition-colors duration-150 focus:outline-none rounded"
                                    type="button"
                                >
                                    <CloseIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetFilters;

