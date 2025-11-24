// components/assets/ClientAssetsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    PackageIcon,
    LaptopIcon,
    AlertTriangleIcon,
    PlusIcon,
    FileTextIcon
} from './AssetIcons';
import { motion } from 'framer-motion';
import AssetTable from './AssetTable';
import DynamicAssetFilters from './DynamicAssetFilters';
import CreateAssetModal from './CreateAssetModal';
import { authClient } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import Spinner from '../common/Spinner';

const ClientAssetsPage = ({ currentUser }) => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [clientInfo, setClientInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [mainTab, setMainTab] = useState('hardware'); // 'hardware' or 'software'
    const [hardwareSubTab, setHardwareSubTab] = useState('allocated'); // 'allocated', 'available', 'repair-queue', 'retired'
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        asset_type: 'all',
        status: 'all',
        client_name: 'all',
        owner_uid: 'all',
        warranty_status: 'all',
    });

    useEffect(() => {
        setLoading(true);
        fetchClientInfo();
        fetchClients();
    }, [clientId]);

    useEffect(() => {
        if (clientInfo) {
            fetchUsers();
        }
    }, [clientInfo]);

    useEffect(() => {
        // Fetch assets and summary when clientInfo is available or filters change
        if (clientInfo) {
            fetchAssets();
            fetchSummary();
        }
    }, [filters, clientInfo]);

    const getAuthToken = async () => {
        return await authClient.currentUser?.getIdToken(false);
    };

    const fetchClientInfo = async () => {
        try {
            const token = await getAuthToken();
            console.log(`[ClientAssetsPage] Fetching client info for: ${clientId}`);
            
            // Try to fetch by ID/name first
            let response = await fetch(`${API_BASE_URL}/api/clients/${encodeURIComponent(clientId)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (response.ok) {
                const client = await response.json();
                console.log(`[ClientAssetsPage] Client found:`, client);
                
                // For site_admin, verify they can only access their own client
                if (currentUser?.role === 'site_admin') {
                    const userClientName = currentUser?.client_name || currentUser?.companyName;
                    const clientName = client.companyName || client.client_name;
                    
                    if (userClientName && clientName && userClientName !== clientName) {
                        console.warn(`[ClientAssetsPage] Site admin tried to access different client. User client: ${userClientName}, Requested: ${clientName}`);
                        setLoading(false);
                        return;
                    }
                }
                
                setClientInfo(client);
                if (client) {
                    const clientName = client.companyName || client.client_name;
                    setFilters(prev => ({ ...prev, client_name: clientName }));
                }
            } else {
                const errorText = await response.text();
                console.error(`[ClientAssetsPage] Failed to fetch client: ${response.status} - ${errorText}`);
                
                // Fallback: fetch all clients and find by id or name
                response = await fetch(`${API_BASE_URL}/api/clients`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const clientsArray = Array.isArray(data) ? data : [];
                
                // Try to find by ID first
                let client = clientsArray.find(c => c.id === clientId);
                
                // If not found by ID, try to find by company name (case-insensitive)
                if (!client) {
                    client = clientsArray.find(c => {
                        const companyName = (c.companyName || '').toLowerCase().trim();
                        const clientName = (c.client_name || '').toLowerCase().trim();
                        const searchId = clientId.toLowerCase().trim();
                        return companyName === searchId || clientName === searchId;
                    });
                }
                
                if (client) {
                    console.log(`[ClientAssetsPage] Client found via fallback:`, client);
                    
                    // For site_admin, verify they can only access their own client
                    if (currentUser?.role === 'site_admin') {
                        const userClientName = currentUser?.client_name || currentUser?.companyName;
                        const clientName = client.companyName || client.client_name;
                        
                        if (userClientName && clientName && userClientName !== clientName) {
                            console.warn(`[ClientAssetsPage] Site admin tried to access different client. User client: ${userClientName}, Requested: ${clientName}`);
                            setLoading(false);
                            return;
                        }
                    }
                    
                    setClientInfo(client);
                    const clientName = client.companyName || client.client_name;
                    setFilters(prev => ({ ...prev, client_name: clientName }));
                } else {
                    console.error(`[ClientAssetsPage] Client not found in fallback search. Searched for: ${clientId}`);
                    console.log(`[ClientAssetsPage] Available clients:`, clientsArray.map(c => ({ id: c.id, companyName: c.companyName, client_name: c.client_name })));
                    setLoading(false);
                }
            }
        } catch (error) {
            console.error('[ClientAssetsPage] Error fetching client info:', error);
            setLoading(false);
        }
    };

    const fetchAssets = async () => {
        if (!clientInfo) {
            console.log('ClientAssetsPage: clientInfo not available yet, skipping fetchAssets');
            return;
        }
        
        try {
            setLoading(true);
            const token = await getAuthToken();
            const queryParams = new URLSearchParams();
            
            // Always filter by client name
            const clientName = clientInfo.companyName || clientInfo.client_name;
            if (!clientName) {
                console.error('ClientAssetsPage: No client name available');
                setLoading(false);
                return;
            }
            
            queryParams.append('client_name', clientName);
            console.log('ClientAssetsPage: Fetching assets for client:', clientName);
            
            Object.keys(filters).forEach(key => {
                const value = filters[key];
                if (value && value !== 'all' && key !== 'client_name') {
                    // Don't override client_name filter
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
            console.log('ClientAssetsPage: Fetched assets:', Array.isArray(data) ? data.length : 0);
            setAssets(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setAssets([]);
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
            if (clientInfo) {
                const clientName = clientInfo.companyName || clientInfo.client_name;
                if (clientName) {
                    const response = await fetch(`${API_BASE_URL}/api/users?client_name=${encodeURIComponent(clientName)}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    setUsers(Array.isArray(data) ? data : []);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        }
    };

    const fetchSummary = async () => {
        try {
            const token = await getAuthToken();
            const queryParams = new URLSearchParams();
            if (clientInfo) {
                const clientName = clientInfo.companyName || clientInfo.client_name;
                if (clientName) {
                    queryParams.append('client_name', clientName);
                }
            }
            
            const response = await fetch(`${API_BASE_URL}/api/assets/summary?${queryParams}`, {
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

    // Get hardware assets
    const getHardwareAssets = () => {
        return Array.isArray(assets) ? assets.filter(a => a.asset_type === 'hardware') : [];
    };

    // Get software assets
    const getSoftwareAssets = () => {
        return Array.isArray(assets) ? assets.filter(a => a.asset_type === 'software') : [];
    };

    // Get allocated hardware (has owner_uid)
    const getAllocatedHardware = () => {
        return getHardwareAssets().filter(a => a.owner_uid && a.status !== 'Retired');
    };

    // Get available hardware (no owner_uid and Active status)
    const getAvailableHardware = () => {
        return getHardwareAssets().filter(a => !a.owner_uid && a.status === 'Active');
    };

    // Get repair queue hardware
    const getRepairQueueHardware = () => {
        return getHardwareAssets().filter(a => a.status === 'Under Repair');
    };

    // Get retired hardware
    const getRetiredHardware = () => {
        return getHardwareAssets().filter(a => a.status === 'Retired');
    };

    // Get software renewals (expiring in next 30 days)
    const getSoftwareRenewals = () => {
        if (!Array.isArray(assets)) return [];
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return getSoftwareAssets().filter(a => {
            if (!a.subscription_end) return false;
            const endDate = new Date(a.subscription_end);
            return endDate <= thirtyDaysFromNow && endDate >= now;
        });
    };

    const handleAssetClick = (asset) => {
        navigate(`/assets/${asset.id || asset.asset_id}`);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            asset_type: 'all',
            status: 'all',
            client_name: clientInfo ? (clientInfo.client_name || clientInfo.companyName) : 'all',
            owner_uid: 'all',
            warranty_status: 'all',
        });
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

    const SummaryCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
        const colorClasses = {
            blue: { bg: 'bg-blue-50', icon: 'text-blue-700' },
            orange: { bg: 'bg-orange-50', icon: 'text-orange-700' },
            red: { bg: 'bg-red-50', icon: 'text-red-700' },
            green: { bg: 'bg-green-50', icon: 'text-green-700' },
            purple: { bg: 'bg-purple-50', icon: 'text-purple-700' },
            yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-700' },
        };
        const colors = colorClasses[color] || colorClasses.blue;

        return (
            <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow transition-all duration-200"
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

    // Software table component
    const SoftwareTable = ({ softwareAssets }) => {
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        const getRenewalTag = (subscriptionEnd) => {
            if (!subscriptionEnd) return null;
            const endDate = new Date(subscriptionEnd);
            const now = new Date();
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-semibold">Expired</span>;
            } else if (daysLeft <= 30) {
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-semibold">Renew Soon</span>;
            } else if (daysLeft <= 90) {
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md text-xs font-semibold">Upcoming</span>;
            }
            return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">Active</span>;
        };

        const getLicenseAllocation = (software) => {
            const totalLicenses = software.quantity || 0;
            const allocatedLicenses = softwareAssets.filter(s => 
                s.name === software.name && 
                s.owner_uid && 
                s.status !== 'Retired'
            ).length;
            
            return `${allocatedLicenses}/${totalLicenses}`;
        };

        // Group software by name to show unique entries
        const uniqueSoftware = [];
        const seenNames = new Set();
        
        softwareAssets.forEach(software => {
            if (!seenNames.has(software.name)) {
                seenNames.add(software.name);
                uniqueSoftware.push(software);
            }
        });

        if (loading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Spinner size="md" />
                </div>
            );
        }

        if (uniqueSoftware.length === 0) {
            return (
                <div className="text-center py-12">
                    <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No software assets found</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Software Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Distributor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Version
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Period
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Renewal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Allocated/Available
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {uniqueSoftware.map((software) => (
                            <tr key={software.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{software.name || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">{software.manufacturer || software.vendor || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">{software.version || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                        {software.subscription_start && software.subscription_end ? (
                                            <div>
                                                <div>{formatDate(software.subscription_start)}</div>
                                                <div className="text-xs text-gray-500">to {formatDate(software.subscription_end)}</div>
                                            </div>
                                        ) : 'N/A'}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {getRenewalTag(software.subscription_end)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">
                                        {getLicenseAllocation(software)}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <button
                                        onClick={() => handleAssetClick(software)}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    if (!clientInfo && !loading) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-red-800 font-bold mb-2">Client Not Found</h2>
                    <p className="text-red-700 text-sm">The requested client could not be found.</p>
                    <button 
                        onClick={() => navigate('/assets')}
                        className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold"
                    >
                        Back to Assets
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg p-4 shadow-sm">
                <div>
                    <button
                        onClick={() => navigate('/assets')}
                        className="text-sm text-blue-600 hover:text-blue-800 mb-2 block"
                    >
                        ← Back to Assets
                    </button>
                    <h1 className="text-2xl font-bold">
                        <span className="text-gray-400 font-normal">Asset Management</span>
                        {' '}
                        <span className="text-blue-600 font-semibold">
                            {clientInfo ? (clientInfo.companyName || clientInfo.client_name) : 'Loading...'}
                        </span>
                    </h1>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Manage assets for this client organization
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Add Asset</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards - Top 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SummaryCard
                    title="Total Hardware"
                    value={getHardwareAssets().length}
                    icon={LaptopIcon}
                    color="blue"
                    subtitle="All hardware assets"
                />
                <SummaryCard
                    title="Allocated Hardware"
                    value={getAllocatedHardware().length}
                    icon={PackageIcon}
                    color="green"
                    subtitle="Assigned to users"
                />
                <SummaryCard
                    title="Available Hardware"
                    value={getAvailableHardware().length}
                    icon={PackageIcon}
                    color="purple"
                    subtitle="Ready for allocation"
                />
                <SummaryCard
                    title="Software Renewals"
                    value={getSoftwareRenewals().length}
                    icon={AlertTriangleIcon}
                    color="orange"
                    subtitle="Due in next 30 days"
                />
            </div>

            {/* Main Tabs: Hardware and Software */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                        <button
                            onClick={() => setMainTab('hardware')}
                            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-150 ${
                                mainTab === 'hardware'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } focus:outline-none`}
                        >
                            Hardware
                        </button>
                        <button
                            onClick={() => setMainTab('software')}
                            className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all duration-150 ${
                                mainTab === 'software'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } focus:outline-none`}
                        >
                            Software
                        </button>
                    </nav>
                </div>

                {/* Hardware Tab Content */}
                {mainTab === 'hardware' && (
                    <div className="p-4">
                        {/* Hardware Sub-Tabs - Pipe Style with Borders */}
                        <div className="mb-4">
                            <nav className="inline-flex items-center border border-gray-300 rounded-md bg-white">
                                <button
                                    onClick={() => setHardwareSubTab('allocated')}
                                    className={`py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-150 focus:outline-none border-r border-gray-300 first:rounded-l-md ${
                                        hardwareSubTab === 'allocated'
                                            ? 'text-blue-600 font-semibold bg-blue-50'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    Allocated ({getAllocatedHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('available')}
                                    className={`py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-150 focus:outline-none border-r border-gray-300 ${
                                        hardwareSubTab === 'available'
                                            ? 'text-blue-600 font-semibold bg-blue-50'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    Available ({getAvailableHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('repair-queue')}
                                    className={`py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-150 focus:outline-none border-r border-gray-300 ${
                                        hardwareSubTab === 'repair-queue'
                                            ? 'text-blue-600 font-semibold bg-blue-50'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    Repair Queue ({getRepairQueueHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('retired')}
                                    className={`py-2 px-4 font-medium text-sm whitespace-nowrap transition-all duration-150 focus:outline-none last:rounded-r-md ${
                                        hardwareSubTab === 'retired'
                                            ? 'text-blue-600 font-semibold bg-blue-50'
                                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                                    }`}
                                >
                                    Retired ({getRetiredHardware().length})
                                </button>
                            </nav>
                        </div>

                        {/* Hardware Sub-Tab Content */}
                        <div>
                            {hardwareSubTab === 'allocated' && (
                                <AssetTable
                                    assets={getAllocatedHardware()}
                                    onAssetClick={handleAssetClick}
                                    loading={loading}
                                    hideClientColumn={true}
                                    hideSubscriptionColumn={true}
                                />
                            )}
                            {hardwareSubTab === 'available' && (
                                <AssetTable
                                    assets={getAvailableHardware()}
                                    onAssetClick={handleAssetClick}
                                    loading={loading}
                                    hideClientColumn={true}
                                    hideSubscriptionColumn={true}
                                />
                            )}
                            {hardwareSubTab === 'repair-queue' && (
                                <AssetTable
                                    assets={getRepairQueueHardware()}
                                    onAssetClick={handleAssetClick}
                                    loading={loading}
                                    hideClientColumn={true}
                                    hideSubscriptionColumn={true}
                                />
                            )}
                            {hardwareSubTab === 'retired' && (
                                <AssetTable
                                    assets={getRetiredHardware()}
                                    onAssetClick={handleAssetClick}
                                    loading={loading}
                                    hideClientColumn={true}
                                    hideOwnerColumn={true}
                                    hideSubscriptionColumn={true}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Software Tab Content */}
                {mainTab === 'software' && (
                    <div className="p-4">
                        <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">All Software</h3>
                            <p className="text-xs text-gray-600">View all software licenses and subscriptions</p>
                        </div>
                        <SoftwareTable softwareAssets={getSoftwareAssets()} />
                    </div>
                )}
            </div>

            {/* Create Asset Modal */}
            <CreateAssetModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(result) => {
                    fetchAssets();
                    fetchSummary();
                    setIsCreateModalOpen(false);
                }}
                currentUser={currentUser}
                defaultClient={clientInfo}
            />
        </div>
    );
};

export default ClientAssetsPage;

