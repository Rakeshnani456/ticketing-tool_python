// components/assets/SiteAdminAssetManagement.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    PackageIcon,
    LaptopIcon,
    AlertTriangleIcon,
    RefreshIcon,
    PlusIcon,
    WrenchIcon,
    FileTextIcon
} from './AssetIcons';
import { motion } from 'framer-motion';
import AssetTable from './AssetTable';
import DynamicAssetFilters from './DynamicAssetFilters';
import useRealtimeAssets from '../../hooks/useRealtimeAssets';
import useRealtimeUsers from '../../hooks/useRealtimeUsers';

const SiteAdminAssetManagement = ({ currentUser }) => {
    const navigate = useNavigate();
    
    // Use real-time hooks for optimized Firebase reads
    const { assets, summary, loading, error, refresh } = useRealtimeAssets(currentUser);
    const { users } = useRealtimeUsers(currentUser?.client_name);
    
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [mainTab, setMainTab] = useState('hardware'); // 'hardware' or 'software'
    const [hardwareSubTab, setHardwareSubTab] = useState('allocated'); // 'allocated', 'available', 'repair-queue', 'retired'

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
        // Navigate to asset detail page
        navigate(`/assets/${asset.id || asset.asset_id}`);
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
            // For software, we'll use quantity as total licenses
            // and count assets with same name and assigned owner as allocated
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

    // Show error if there's an issue with real-time connection
    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-red-800 font-bold mb-2">Connection Error</h2>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button 
                        onClick={refresh}
                        className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold"
                    >
                        Retry Connection
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
                    <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Manage assets for {currentUser?.client_name || 'your organization'}
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                            Live
                        </span>
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={refresh}
                        className="px-3 py-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-md text-xs font-semibold text-gray-700 flex items-center space-x-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-300"
                        title="Assets auto-refresh in real-time"
                    >
                        <RefreshIcon className="w-3.5 h-3.5" />
                        <span>Auto-Sync Active</span>
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
                        {/* Hardware Sub-Tabs */}
                        <div className="mb-4 border-b border-gray-200">
                            <nav className="flex space-x-6 overflow-x-auto">
                                <button
                                    onClick={() => setHardwareSubTab('allocated')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-150 ${
                                        hardwareSubTab === 'allocated'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                    } focus:outline-none`}
                                >
                                    Allocated ({getAllocatedHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('available')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-150 ${
                                        hardwareSubTab === 'available'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                    } focus:outline-none`}
                                >
                                    Available ({getAvailableHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('repair-queue')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-150 ${
                                        hardwareSubTab === 'repair-queue'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                    } focus:outline-none`}
                                >
                                    Repair Queue ({getRepairQueueHardware().length})
                                </button>
                                <button
                                    onClick={() => setHardwareSubTab('retired')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-150 ${
                                        hardwareSubTab === 'retired'
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                    } focus:outline-none`}
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
        </div>
    );
};

export default SiteAdminAssetManagement;

