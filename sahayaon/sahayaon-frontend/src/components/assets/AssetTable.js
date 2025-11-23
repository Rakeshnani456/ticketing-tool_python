// components/assets/AssetTable.js
import React, { useState, useMemo } from 'react';
import { 
    LaptopIcon,
    PackageIcon,
    CheckCircleIcon,
    XCircleIcon,
    WrenchIcon,
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    SearchIcon,
    FilterIcon,
    CalendarIcon,
    UserIcon,
    BuildingIcon,
    LinkIcon
} from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';

const AssetTable = ({ 
    assets, 
    onAssetClick, 
    onEdit, 
    onDelete, 
    onBulkSelect,
    selectedAssets = [],
    loading = false,
    hideClientColumn = false,
    hideOwnerColumn = false,
    hideSubscriptionColumn = false
}) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [imageErrors, setImageErrors] = useState(new Set());

    const getAssetIcon = (type, category) => {
        if (type === 'software') return PackageIcon;
        const categoryLower = (category || '').toLowerCase();
        if (categoryLower.includes('laptop')) return LaptopIcon;
        return PackageIcon;
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Active': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
            'Retired': { color: 'bg-gray-100 text-gray-800', icon: XCircleIcon },
            'Under Repair': { color: 'bg-orange-100 text-orange-800', icon: WrenchIcon },
            'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
        };
        return statusConfig[status] || statusConfig['Active'];
    };

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedAssets = useMemo(() => {
        let filtered = assets.filter(asset => {
            const searchLower = searchTerm.toLowerCase();
            const searchFields = [
                asset.asset_name?.toLowerCase().includes(searchLower),
                asset.asset_id?.toLowerCase().includes(searchLower),
                asset.category?.toLowerCase().includes(searchLower)
            ];
            if (!hideOwnerColumn) {
                searchFields.push(asset.owner_name?.toLowerCase().includes(searchLower));
            }
            if (!hideClientColumn) {
                searchFields.push(asset.client_name?.toLowerCase().includes(searchLower));
            }
            return searchFields.some(field => field);
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key.includes('date') || sortConfig.key.includes('warranty') || sortConfig.key.includes('subscription')) {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                } else {
                    aVal = String(aVal || '').toLowerCase();
                    bVal = String(bVal || '').toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [assets, searchTerm, sortConfig, hideClientColumn, hideOwnerColumn, hideSubscriptionColumn]);

    const SortableHeader = ({ children, sortKey, className = '' }) => (
        <th 
            className={`px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors group border-r border-gray-300 ${className}`}
            onClick={() => handleSort(sortKey)}
        >
            <div className="flex items-center space-x-1.5">
                <span className="group-hover:text-blue-700 transition-colors">{children}</span>
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? 
                        <ChevronUpIcon className="w-3.5 h-3.5 text-blue-700" /> : 
                        <ChevronDownIcon className="w-3.5 h-3.5 text-blue-700" />
                ) : (
                    <div className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity">
                        <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                )}
            </div>
        </th>
    );

    const toggleRowExpansion = (assetId) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(assetId)) {
                next.delete(assetId);
            } else {
                next.add(assetId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                <p className="text-sm text-gray-600 font-medium">Loading assets...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="relative max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder={
                            hideClientColumn && hideOwnerColumn 
                                ? "Search assets by name, ID, or category..." 
                                : hideClientColumn 
                                    ? "Search assets by name, ID, owner, or category..." 
                                    : hideOwnerColumn
                                        ? "Search assets by name, ID, client, or category..."
                                        : "Search assets by name, ID, client, owner, or category..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 text-sm font-medium bg-white transition-all duration-200"
                    />
                </div>
                {searchTerm && (
                    <p className="text-xs text-gray-600 mt-1.5 ml-1 font-medium">
                        {filteredAndSortedAssets.length} {filteredAndSortedAssets.length === 1 ? 'result' : 'results'} found
                    </p>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                            {onBulkSelect && (
                                <th className="px-3 py-2 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedAssets.length === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                onBulkSelect(filteredAndSortedAssets.map(a => a.id));
                                            } else {
                                                onBulkSelect([]);
                                            }
                                        }}
                                        className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                </th>
                            )}
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Image
                            </th>
                            <SortableHeader sortKey="asset_name">Asset</SortableHeader>
                            <SortableHeader sortKey="asset_id">ID</SortableHeader>
                            {!hideClientColumn && <SortableHeader sortKey="client_name">Client</SortableHeader>}
                            {!hideOwnerColumn && <SortableHeader sortKey="owner_name">Owner</SortableHeader>}
                            <SortableHeader sortKey="asset_type">Type</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <SortableHeader sortKey="warranty_end">Warranty</SortableHeader>
                            {!hideSubscriptionColumn && <SortableHeader sortKey="subscription_end">Subscription</SortableHeader>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        <AnimatePresence>
                            {filteredAndSortedAssets.map((asset) => {
                                const AssetIcon = getAssetIcon(asset.asset_type, asset.category);
                                const statusConfig = getStatusBadge(asset.status);
                                const StatusIcon = statusConfig.icon;
                                const isExpanded = expandedRows.has(asset.id);
                                const isSelected = selectedAssets.includes(asset.id);
                                const imageError = imageErrors.has(asset.id);

                                return (
                                    <motion.tr
                                        key={asset.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`hover:bg-blue-50/30 transition-all duration-150 border-b border-gray-200 ${isSelected ? 'bg-blue-50' : ''}`}
                                    >
                                        {onBulkSelect && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            onBulkSelect([...selectedAssets, asset.id]);
                                                        } else {
                                                            onBulkSelect(selectedAssets.filter(id => id !== asset.id));
                                                        }
                                                    }}
                                                    className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                                {asset.asset_type === 'hardware' && asset.image_url && !imageError ? (
                                                    <img 
                                                        src={asset.image_url} 
                                                        alt={asset.asset_name || 'Asset'} 
                                                        className="w-full h-full object-cover"
                                                        onError={() => {
                                                            setImageErrors(prev => new Set([...prev, asset.id]));
                                                        }}
                                                    />
                                                ) : (
                                                    <AssetIcon className="w-5 h-5 text-gray-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {asset.asset_name || 'Unnamed'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <button
                                                onClick={() => onAssetClick && onAssetClick(asset)}
                                                className="text-xs font-mono font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded transition-all duration-150 cursor-pointer"
                                                title="View Asset Details"
                                            >
                                                {asset.asset_id || asset.id?.substring(0, 8)}
                                            </button>
                                        </td>
                                        {!hideClientColumn && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {asset.client_name || '-'}
                                                </span>
                                            </td>
                                        )}
                                        {!hideOwnerColumn && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-700">
                                                    {asset.owner_name || '-'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                                asset.asset_type === 'hardware' 
                                                    ? 'bg-blue-50 text-blue-800' 
                                                    : 'bg-purple-50 text-purple-800'
                                            }`}>
                                                {asset.asset_type || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 w-fit ${statusConfig.color}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                <span>{asset.status || 'Active'}</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {asset.warranty_end ? (
                                                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-400">
                                                    {new Date(asset.warranty_end).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        {!hideSubscriptionColumn && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {asset.subscription_end ? (
                                                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-400">
                                                        {new Date(asset.subscription_end).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                        )}
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {filteredAndSortedAssets.length === 0 && (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                        <PackageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {searchTerm ? 'No matching assets found' : 'No assets available'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                        {searchTerm 
                            ? `Try adjusting your search terms or filters to find what you're looking for.`
                            : 'Assets will appear here once they are added to the system.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AssetTable;

