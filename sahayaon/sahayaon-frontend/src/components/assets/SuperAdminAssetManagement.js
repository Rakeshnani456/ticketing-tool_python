// components/assets/SuperAdminAssetManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
    PackageIcon,
    LaptopIcon,
    AlertTriangleIcon,
    BuildingIcon,
    RefreshIcon,
    PlusIcon
} from './AssetIcons';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { useNavigate } from 'react-router-dom';
import AssetTable from './AssetTable';
import DynamicAssetFilters from './DynamicAssetFilters';
import CreateAssetModal from './CreateAssetModal';
import { authClient } from '../../config/firebase';
import useRealtimeAssets from '../../hooks/useRealtimeAssets';
import useRealtimeClients from '../../hooks/useRealtimeClients';
import useRealtimeAssetSummary from '../../hooks/useRealtimeAssetSummary';
import SmartCacheManager from '../../utils/smartCacheManager';

const SuperAdminAssetManagement = ({ currentUser, clientFilter = null, userFilter = null }) => {
    const navigate = useNavigate();
    
    // Use real-time hooks for optimized Firebase reads
    const { assets: allAssets, loading: assetsLoading, error: assetsError, refresh: refreshAssets } = useRealtimeAssets(currentUser);
    const { clients, loading: clientsLoading, error: clientsError, refresh: refreshClients } = useRealtimeClients(currentUser);
    const summary = useRealtimeAssetSummary(allAssets, currentUser);
    
    // Filter assets based on UI filters (client-side filtering, no additional reads)
    const [filters, setFilters] = useState({
        asset_type: 'all',
        status: 'all',
        client_name: clientFilter || 'all',
        owner_uid: userFilter || 'all',
        warranty_status: 'all',
    });
    
    // Apply filters to assets (client-side, no API calls)
    const assets = useMemo(() => {
        if (!allAssets || allAssets.length === 0) return [];
        
        return allAssets.filter(asset => {
            if (filters.asset_type !== 'all' && asset.asset_type !== filters.asset_type) return false;
            if (filters.status !== 'all' && asset.status !== filters.status) return false;
            if (filters.client_name !== 'all' && asset.client_name !== filters.client_name) return false;
            if (filters.owner_uid !== 'all' && asset.owner_uid !== filters.owner_uid) return false;
            if (filters.warranty_status !== 'all') {
                if (filters.warranty_status === 'expiring' && asset.warranty_end) {
                    const endDate = new Date(asset.warranty_end);
                    const now = new Date();
                    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    if (!(endDate <= thirtyDaysFromNow && endDate >= now)) return false;
                }
            }
            return true;
        });
    }, [allAssets, filters]);
    
    // Calculate client summaries from assets (no additional reads)
    // Match with actual clients data to get real Firestore document IDs
    const clientSummaries = useMemo(() => {
        if (!allAssets || allAssets.length === 0) return [];
        
        // Create a map of client name to client document ID from clients array
        const clientNameToIdMap = {};
        if (clients && clients.length > 0) {
            clients.forEach(client => {
                const clientName = client.companyName || client.client_name || '';
                if (clientName && client.id) {
                    clientNameToIdMap[clientName] = client.id;
                }
            });
        }
        
        const clientMap = {};
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        allAssets.forEach(asset => {
            const clientName = asset.client_name || 'Unknown';
            if (!clientMap[clientName]) {
                // Use actual client ID if available, otherwise fallback to client name
                const clientId = clientNameToIdMap[clientName] || clientName;
                clientMap[clientName] = {
                    client_id: clientId,
                    client_name: clientName,
                    total_assets: 0,
                    hardware_count: 0,
                    software_count: 0,
                    warranty_expiring: 0,
                };
            }
            
            clientMap[clientName].total_assets++;
            if (asset.asset_type === 'hardware') {
                clientMap[clientName].hardware_count++;
            } else if (asset.asset_type === 'software') {
                clientMap[clientName].software_count++;
            }
            
            if (asset.warranty_end) {
                const endDate = new Date(asset.warranty_end);
                if (endDate <= thirtyDaysFromNow && endDate >= now) {
                    clientMap[clientName].warranty_expiring++;
                }
            }
        });
        
        return Object.values(clientMap);
    }, [allAssets, clients]);
    
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const loading = assetsLoading || clientsLoading;

    // Update filters when clientFilter or userFilter props change
    useEffect(() => {
        if (clientFilter) {
            setFilters(prev => ({ ...prev, client_name: clientFilter }));
        }
        if (userFilter) {
            setFilters(prev => ({ ...prev, owner_uid: userFilter }));
        }
    }, [clientFilter, userFilter]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            asset_type: 'all',
            status: 'all',
            client_name: 'all',
            owner_uid: 'all',
            warranty_status: 'all',
        });
    };

    const handleAssetClick = (asset) => {
        // Navigate to asset detail page
        navigate(`/assets/${asset.id || asset.asset_id}`);
    };

    const handleBulkAction = async (action, data = {}) => {
        if (selectedAssets.length === 0) return;

        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/assets/bulk-action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    asset_ids: selectedAssets,
                    action,
                    data,
                }),
            });

            if (response.ok) {
                // Invalidate cache - real-time listener will update automatically
                SmartCacheManager.invalidateCache('assets_data', currentUser?.uid);
                SmartCacheManager.invalidateCache('asset_summary', currentUser?.uid);
                setSelectedAssets([]);
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
        }
    };
    
    const handleRefresh = () => {
        // Invalidate caches - real-time listeners will refresh automatically
        SmartCacheManager.invalidateCache('assets_data', currentUser?.uid);
        SmartCacheManager.invalidateCache('clients_data', currentUser?.uid);
        SmartCacheManager.invalidateCache('asset_summary', currentUser?.uid);
        refreshAssets();
        refreshClients();
    };

    const SummaryCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend }) => {
        const colorClasses = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-700', border: 'border-blue-500' },
            orange: { bg: 'bg-orange-50', icon: 'text-orange-700', border: 'border-orange-500' },
            red: { bg: 'bg-red-50', icon: 'text-red-700', border: 'border-red-500' },
            green: { bg: 'bg-green-50', icon: 'text-green-700', border: 'border-green-500' },
            purple: { bg: 'bg-purple-50', icon: 'text-purple-700', border: 'border-purple-500' },
        };
        const colors = colorClasses[color] || colorClasses.blue;

        return (
            <motion.div
                whileHover={{ y: -2 }}
                className={`bg-white rounded-lg p-4 shadow-sm hover:shadow transition-all duration-200`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{title}</p>
                        <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
                        {subtitle && (
                            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                </div>
            </motion.div>
        );
    };

    const handleClientClick = (client) => {
        // Navigate to dedicated client assets route
        navigate(`/assets/clients/${client.client_id}`);
    };


    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold">
                        <span className="text-gray-400 font-normal">Asset Management</span>
                    </h1>
                    <p className="text-xs text-gray-600 mt-0.5">Global overview of all assets across all clients</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-md text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                        <RefreshIcon className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Add Asset</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <SummaryCard
                        title="Total Assets"
                        value={summary.total_assets || 0}
                        icon={PackageIcon}
                        color="blue"
                    />
                    <SummaryCard
                        title="Hardware"
                        value={summary.hardware_count || 0}
                        icon={LaptopIcon}
                        color="blue"
                        subtitle={`${summary.software_count || 0} Software`}
                    />
                    <SummaryCard
                        title="Warranty Expiring"
                        value={summary.warranty_expiring_soon || 0}
                        icon={AlertTriangleIcon}
                        color="orange"
                        subtitle="Next 30 days"
                    />
                    <SummaryCard
                        title="High Risk Assets"
                        value={summary.high_risk_assets || 0}
                        icon={AlertTriangleIcon}
                        color="red"
                    />
                </div>
            )}

            {/* Clients List/Table */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Clients</h2>
                        <p className="text-xs text-gray-600 mt-0.5">Click on a client to view their assets</p>
                    </div>
                    {clientSummaries.length > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
                            {clientSummaries.length} {clientSummaries.length === 1 ? 'Client' : 'Clients'}
                        </span>
                    )}
                </div>
                {clientSummaries.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 font-medium text-sm">No clients found</p>
                        <p className="text-xs text-gray-400 mt-1">Clients will appear here once they are added</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Client Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Total Assets
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Hardware
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Software
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Warranty Expiring
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Array.isArray(clientSummaries) && clientSummaries.map(client => (
                                    <tr 
                                        key={client.client_id}
                                        onClick={() => handleClientClick(client)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <BuildingIcon className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                                                <div className="text-sm font-medium text-gray-900">
                                                    {client.client_name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {client.total_assets || 0}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-blue-700">
                                                {client.hardware_count || 0}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-purple-700">
                                                {client.software_count || 0}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-orange-700">
                                                {client.warranty_expiring || 0}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClientClick(client);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Assets
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Asset Modal */}
            <CreateAssetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(result) => {
                    // Invalidate cache - real-time listener will update automatically
                    SmartCacheManager.invalidateCache('assets_data', currentUser?.uid);
                    SmartCacheManager.invalidateCache('asset_summary', currentUser?.uid);
                    setIsCreateModalOpen(false);
                }}
                currentUser={currentUser}
            />
        </div>
    );
};

export default SuperAdminAssetManagement;

