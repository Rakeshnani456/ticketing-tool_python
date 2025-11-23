// components/assets/SuperAdminAssetManagement.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
    PackageIcon,
    LaptopIcon,
    AlertTriangleIcon,
    CalendarIcon,
    BuildingIcon,
    RefreshIcon,
    PlusIcon
} from './AssetIcons';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { useNavigate } from 'react-router-dom';
import AssetCard from './AssetCard';
import AssetTable from './AssetTable';
import DynamicAssetFilters from './DynamicAssetFilters';
import CreateAssetModal from './CreateAssetModal';
import { authClient } from '../../config/firebase';

const SuperAdminAssetManagement = ({ currentUser, clientFilter = null, userFilter = null }) => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [clientSummaries, setClientSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode] = useState('table'); // Only table view
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [filters, setFilters] = useState({
        asset_type: 'all',
        status: 'all',
        client_name: clientFilter || 'all',
        owner_uid: userFilter || 'all',
        warranty_status: 'all',
    });
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userAssets, setUserAssets] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        // OPTIMIZED: Run all fetches in parallel instead of sequential
        Promise.all([
            fetchAssets(),
            fetchClients(),
            fetchUsers(),
            fetchSummary(),
            fetchClientSummaries()
        ]).catch(error => {
            console.error('Error loading initial data:', error);
        });
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchClientUsers(selectedClient);
        }
    }, [selectedClient]);

    useEffect(() => {
        if (selectedUser) {
            fetchUserAssets(selectedUser);
        }
    }, [selectedUser]);

    // OPTIMIZED: Get token once and reuse for all requests
    const getAuthToken = async () => {
        return await authClient.currentUser?.getIdToken(false); // Use cached token
    };

    const fetchAssets = async () => {
        try {
            const token = await getAuthToken();
            const queryParams = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                const value = filters[key];
                if (value && value !== 'all') {
                    // Handle both array and single values
                    if (Array.isArray(value)) {
                        value.forEach(v => {
                            if (v && v !== 'all') {
                                queryParams.append(key, v);
                            }
                        });
                    } else {
                        queryParams.append(key, value);
                    }
                }
            });

            const response = await fetch(`${API_BASE_URL}/api/assets?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            // Ensure data is always an array
            setAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setAssets([]); // Ensure assets is always an array
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            setClients([]);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const fetchSummary = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/assets/summary`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            setSummary(data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const fetchClientSummaries = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/assets/client-summary`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setClientSummaries(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching client summaries:', error);
            setClientSummaries([]);
        }
    };

    const fetchClientUsers = async (client) => {
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users?client_name=${encodeURIComponent(client.companyName || client.client_name)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            // Store users for the selected client
        } catch (error) {
            console.error('Error fetching client users:', error);
        }
    };

    const fetchUserAssets = async (user) => {
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/assets/user/${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            setUserAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching user assets:', error);
            setUserAssets([]);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [filters]);

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
                fetchAssets();
                fetchSummary();
                setSelectedAssets([]);
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
        }
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

    const ClientCard = ({ clientSummary, onClick }) => (
        <motion.div
            whileHover={{ y: -2 }}
            onClick={() => onClick(clientSummary)}
            className="bg-white rounded-lg p-4 shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">
                        {clientSummary.client_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">ID: {clientSummary.client_id}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-md p-2">
                    <p className="text-gray-600 text-xs font-semibold mb-1">Total Assets</p>
                    <p className="text-lg font-bold text-gray-900">{clientSummary.total_assets || 0}</p>
                </div>
                <div className="bg-blue-50 rounded-md p-2">
                    <p className="text-blue-700 text-xs font-semibold mb-1">Hardware</p>
                    <p className="text-lg font-bold text-blue-800">{clientSummary.hardware_count || 0}</p>
                </div>
                <div className="bg-purple-50 rounded-md p-2">
                    <p className="text-purple-700 text-xs font-semibold mb-1">Software</p>
                    <p className="text-lg font-bold text-purple-800">{clientSummary.software_count || 0}</p>
                </div>
                <div className="bg-orange-50 rounded-md p-2">
                    <p className="text-orange-700 text-xs font-semibold mb-1">Warranty Expiring</p>
                    <p className="text-lg font-bold text-orange-800">{clientSummary.warranty_expiring || 0}</p>
                </div>
            </div>
        </motion.div>
    );

    if (selectedClient && !selectedUser) {
        // Show client users view
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => setSelectedClient(null)}
                            className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                        >
                            ← Back to Clients
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedClient.companyName || selectedClient.client_name} - Users</h2>
                    </div>
                </div>
                {/* User grid would go here */}
            </div>
        );
    }

    if (selectedUser) {
        // Show user assets view
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => {
                                setSelectedUser(null);
                                setSelectedClient(null);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                        >
                            ← Back to Clients
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name || selectedUser.email} - Assets</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.isArray(userAssets) && userAssets.map(asset => (
                        <AssetCard
                            key={asset.id}
                            asset={asset}
                            onClick={() => handleAssetClick(asset)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
                    <p className="text-xs text-gray-600 mt-0.5">Global overview of all assets across all clients</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            fetchAssets();
                            fetchSummary();
                            fetchClientSummaries();
                        }}
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

            {/* Client Grid */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Clients Overview</h2>
                        <p className="text-xs text-gray-600 mt-0.5">Manage assets by client organization</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {Array.isArray(clientSummaries) && clientSummaries.map(client => (
                            <ClientCard
                                key={client.client_id}
                                clientSummary={client}
                                onClick={(client) => {
                                    setSelectedClient(client);
                                    fetchClientUsers(client);
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Asset Master Table Section */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Asset Master Table</h2>
                        <p className="text-xs text-gray-600 mt-0.5">View and manage all assets in one place</p>
                    </div>
                    {assets.length > 0 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">
                            {assets.length} {assets.length === 1 ? 'Asset' : 'Assets'}
                        </span>
                    )}
                </div>

                {/* Dynamic Filters */}
                <div className="mb-3 bg-gray-50 rounded-md p-3">
                    <DynamicAssetFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        clients={clients}
                        users={users}
                    />
                </div>

                {/* Bulk Actions */}
                {selectedAssets.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-3 p-3 bg-blue-50 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                        <span className="text-xs font-semibold text-blue-900">
                            {selectedAssets.length} {selectedAssets.length === 1 ? 'asset' : 'assets'} selected
                        </span>
                        <div className="flex items-center space-x-2 flex-wrap">
                            <button
                                onClick={() => handleBulkAction('retire')}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                type="button"
                            >
                                Retire Selected
                            </button>
                            <button
                                onClick={() => handleBulkAction('update_status', { status: 'Active' })}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                                type="button"
                            >
                                Mark Active
                            </button>
                            <button
                                onClick={() => setSelectedAssets([])}
                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-md text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                type="button"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Asset View - List Only */}
                <AssetTable
                    assets={Array.isArray(assets) ? assets : []}
                    onAssetClick={handleAssetClick}
                    onBulkSelect={setSelectedAssets}
                    selectedAssets={selectedAssets}
                    loading={loading}
                />
            </div>

            {/* Create Asset Modal */}
            <CreateAssetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(result) => {
                    fetchAssets();
                    fetchSummary();
                    fetchClientSummaries();
                    setIsCreateModalOpen(false);
                }}
                currentUser={currentUser}
            />
        </div>
    );
};

export default SuperAdminAssetManagement;

