// components/assets/AssetDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    CloseIcon,
    CalendarIcon,
    UserIcon,
    BuildingIcon,
    PackageIcon,
    LaptopIcon,
    LinkIcon,
    FileTextIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    WrenchIcon,
    EditIcon,
    DeleteIcon,
    ArrowLeftIcon
} from './AssetIcons';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';
import AddToRepairQueueModal from './AddToRepairQueueModal';

const AssetDetailPage = ({ currentUser, showFlashMessage }) => {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRepairQueueModalOpen, setIsRepairQueueModalOpen] = useState(false);
    const [createdByName, setCreatedByName] = useState(null);

    useEffect(() => {
        fetchAssetDetails();
    }, [assetId]);

    const fetchAssetDetails = async () => {
        try {
            setLoading(true);
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch asset details');
            }

            const data = await response.json();
            
            // Fetch owner information if owner_uid exists
            if (data.owner_uid) {
                try {
                    const userResponse = await fetch(`${API_BASE_URL}/api/users/${data.owner_uid}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        data.owner_name = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || '';
                        data.owner_email = userData.email || '';
                    }
                } catch (err) {
                    console.error('Error fetching owner info:', err);
                }
            }

            // Fetch created by user information if created_by_uid exists
            if (data.created_by_uid) {
                try {
                    const creatorResponse = await fetch(`${API_BASE_URL}/api/users/${data.created_by_uid}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (creatorResponse.ok) {
                        const creatorData = await creatorResponse.json();
                        const creatorName = `${creatorData.firstName || ''} ${creatorData.lastName || ''}`.trim() || creatorData.name || '';
                        const creatorEmail = creatorData.email || '';
                        setCreatedByName(creatorName || creatorEmail || 'Unknown');
                    } else {
                        setCreatedByName(data.created_by_name || data.created_by_email || 'Unknown');
                    }
                } catch (err) {
                    console.error('Error fetching creator info:', err);
                    setCreatedByName(data.created_by_name || data.created_by_email || 'Unknown');
                }
            } else {
                setCreatedByName(data.created_by_name || data.created_by_email || 'Unknown');
            }
            
            setAsset(data);
        } catch (error) {
            console.error('Error fetching asset details:', error);
            setError(error.message || 'Failed to load asset details');
        } finally {
            setLoading(false);
        }
    };

    const handleRepairQueueSuccess = () => {
        if (showFlashMessage) {
            showFlashMessage('Asset added to repair queue successfully', 'success');
        }
        fetchAssetDetails();
    };

    const getWarrantyStatus = () => {
        if (!asset?.warranty_end) return { status: 'unknown', color: 'text-gray-500', label: 'No warranty info' };
        
        const endDate = new Date(asset.warranty_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', label: `Expires in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', label: `Active (${daysUntilExpiry} days remaining)` };
    };

    const getSubscriptionStatus = () => {
        if (!asset?.subscription_end) return { status: 'unknown', color: 'text-gray-500', label: 'No subscription' };
        
        const endDate = new Date(asset.subscription_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', label: `Renews in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', label: `Active (${daysUntilExpiry} days remaining)` };
    };

    const getWarrantyPeriodStatus = (warrantyStart, warrantyEnd) => {
        if (!warrantyStart || !warrantyEnd) return { status: 'unknown', color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Incomplete' };
        
        const startDate = new Date(warrantyStart);
        const endDate = new Date(warrantyEnd);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (now < startDate) return { status: 'upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Upcoming' };
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', bgColor: 'bg-orange-100', label: `Expires in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', bgColor: 'bg-green-100', label: `Active (${daysUntilExpiry} days)` };
    };

    const getSubscriptionPeriodStatus = (subscriptionStart, subscriptionEnd) => {
        if (!subscriptionStart || !subscriptionEnd) return { status: 'unknown', color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Incomplete' };
        
        const startDate = new Date(subscriptionStart);
        const endDate = new Date(subscriptionEnd);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (now < startDate) return { status: 'upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Upcoming' };
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', bgColor: 'bg-orange-100', label: `Renews in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', bgColor: 'bg-green-100', label: `Active (${daysUntilExpiry} days)` };
    };

    const InfoRow = ({ label, value, icon: Icon, className = '' }) => (
        <div className={`flex items-start space-x-2 py-1.5 ${className}`}>
            {Icon && (
                <div className="p-1 bg-gray-100 rounded flex-shrink-0">
                    <Icon className="w-3 h-3 text-gray-600" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-xs font-medium text-gray-900 break-words">{value || <span className="text-gray-400">Not specified</span>}</div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading asset details...</p>
                </div>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <AlertTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-900 font-semibold mb-1">Error loading asset</p>
                    <p className="text-xs text-gray-600 mb-3">{error || 'Asset not found'}</p>
                    <button
                        onClick={() => navigate('/assets')}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold"
                    >
                        Back to Assets
                    </button>
                </div>
            </div>
        );
    }

    const warrantyStatus = getWarrantyStatus();
    const subscriptionStatus = getSubscriptionStatus();

    return (
        <div className="bg-gray-50 min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-3">
                    <button
                        onClick={() => navigate('/assets')}
                        className="flex items-center space-x-1.5 text-gray-600 hover:text-gray-900 mb-2 transition-colors text-xs font-medium"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        <span>Back to Assets</span>
                    </button>
                    
                    <div className="bg-white rounded-lg px-4 py-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-lg shrink-0 ${
                                asset.asset_type === 'hardware' 
                                    ? 'bg-blue-100' 
                                    : 'bg-purple-100'
                            }`}>
                                {asset.asset_type === 'hardware' ? (
                                    <LaptopIcon className="w-4 h-4 text-blue-700" />
                                ) : (
                                    <PackageIcon className="w-4 h-4 text-purple-700" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-bold text-gray-900 truncate">
                                    {asset.asset_name || 'Unnamed Asset'}
                                </h1>
                                <div className="flex items-center space-x-2 mt-0.5">
                                    <p className="text-xs text-gray-600 truncate font-mono">{asset.asset_id || asset.id}</p>
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                        asset.status === 'Active' 
                                            ? 'bg-green-100 text-green-800' 
                                            : asset.status === 'Under Repair'
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {asset.status || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {(currentUser?.role === 'super_admin' || currentUser?.role === 'site_admin') && (
                            <div className="flex items-center space-x-2 shrink-0">
                                <button
                                    onClick={() => {
                                        // Handle edit - navigate to edit page or open edit modal
                                        console.log('Edit asset:', asset);
                                        // TODO: Implement edit functionality
                                        if (showFlashMessage) {
                                            showFlashMessage('Edit functionality coming soon', 'info');
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 rounded-md transition-all duration-150 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 flex items-center space-x-1.5"
                                    title="Edit Asset"
                                    type="button"
                                >
                                    <EditIcon className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete "${asset.asset_name || 'this asset'}"? This action cannot be undone.`)) {
                                            try {
                                                const token = await authClient.currentUser?.getIdToken();
                                                const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
                                                    method: 'DELETE',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                    },
                                                });

                                                if (response.ok) {
                                                    if (showFlashMessage) {
                                                        showFlashMessage('Asset deleted successfully', 'success');
                                                    }
                                                    navigate('/assets');
                                                } else {
                                                    const errorData = await response.json();
                                                    throw new Error(errorData.message || 'Failed to delete asset');
                                                }
                                            } catch (error) {
                                                console.error('Error deleting asset:', error);
                                                if (showFlashMessage) {
                                                    showFlashMessage(error.message || 'Failed to delete asset', 'error');
                                                } else {
                                                    alert(error.message || 'Failed to delete asset');
                                                }
                                            }
                                        }
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 hover:text-red-900 rounded-md transition-all duration-150 active:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center space-x-1.5"
                                    title="Delete Asset"
                                    type="button"
                                >
                                    <DeleteIcon className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                    {/* Asset Image - Only for Hardware */}
                    {asset.asset_type === 'hardware' && asset.image_url && (
                        <div className="bg-gray-100 rounded-lg p-3">
                            <div className="aspect-video rounded-md overflow-hidden bg-white">
                                <img 
                                    src={asset.image_url} 
                                    alt={asset.asset_name || 'Asset'} 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* Basic Information */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                            <PackageIcon className="w-4 h-4 text-gray-600" />
                            <span>Basic Information</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <InfoRow label="Asset Name" value={asset.asset_name || asset.name} icon={PackageIcon} />
                            <InfoRow label="Asset ID" value={asset.asset_id || asset.id} />
                            <InfoRow label="Category" value={asset.category} />
                            {asset.asset_type === 'hardware' && (
                                <>
                                    <InfoRow label="Manufacturer" value={asset.manufacturer} />
                                    <InfoRow label="Model" value={asset.model} />
                                    <InfoRow label="Serial Number" value={asset.serial_number} />
                                </>
                            )}
                            {asset.asset_type === 'software' && (
                                <>
                                    <InfoRow label="Version" value={asset.version} />
                                    <InfoRow label="Publisher/Vendor" value={asset.publisher || asset.vendor || asset.manufacturer} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Assignment Information */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                            <UserIcon className="w-4 h-4 text-gray-600" />
                            <span>{asset.asset_type === 'software' ? 'User Assignment' : 'Assignment'}</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {asset.asset_type === 'hardware' && (
                                <InfoRow label="Client" value={asset.client_name} icon={BuildingIcon} />
                            )}
                            <InfoRow label={asset.asset_type === 'software' ? 'Assigned To' : 'Owner'} value={asset.owner_name || asset.owner_email} icon={UserIcon} />
                            {asset.asset_type === 'software' && asset.owner_name && asset.owner_email && asset.owner_email !== asset.owner_name && (
                                <InfoRow label="User Email" value={asset.owner_email} icon={UserIcon} />
                            )}
                            <InfoRow label="Assigned Date" value={
                                asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString() : '-'
                            } icon={CalendarIcon} />
                        </div>
                    </div>

                    {/* License Information (Software Only) */}
                    {asset.asset_type === 'software' && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <FileTextIcon className="w-4 h-4 text-gray-600" />
                                <span>License Information</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <InfoRow label="License Type" value={asset.license_type} />
                                <InfoRow label="License Key" value={asset.license_key} />
                                <InfoRow label="Number of Licenses" value={asset.number_of_licenses || asset.license_count} />
                                <InfoRow label="License Status" value={asset.license_status} />
                                <InfoRow label="Purchase Date" value={
                                    asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'
                                } icon={CalendarIcon} />
                                <InfoRow label="Purchase Cost" value={
                                    asset.purchase_cost ? `$${asset.purchase_cost}` : '-'
                                } />
                                {asset.license_terms && (
                                    <InfoRow label="License Terms" value={asset.license_terms} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Current Warranty Information */}
                    {(asset.warranty_start || asset.warranty_end) && (
                        <div className={`rounded-lg p-4 shadow-sm ${
                            warrantyStatus.status === 'expiring' 
                                ? 'bg-orange-50' 
                                : warrantyStatus.status === 'expired'
                                ? 'bg-red-50'
                                : 'bg-white'
                        }`}>
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <CalendarIcon className="w-4 h-4 text-gray-600" />
                                <span>Current Warranty</span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${warrantyStatus.color} ${
                                    warrantyStatus.status === 'expiring' ? 'bg-orange-100' :
                                    warrantyStatus.status === 'expired' ? 'bg-red-100' :
                                    'bg-green-100'
                                }`}>
                                    {warrantyStatus.label}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <InfoRow label="Warranty Start" value={
                                    asset.warranty_start ? new Date(asset.warranty_start).toLocaleDateString() : '-'
                                } icon={CalendarIcon} />
                                <InfoRow label="Warranty End" value={
                                    asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : '-'
                                } icon={CalendarIcon} />
                            </div>
                            {warrantyStatus.status === 'expiring' && (
                                <div className="mt-2 p-2 bg-orange-100 rounded-md flex items-center space-x-1.5">
                                    <AlertTriangleIcon className="w-3.5 h-3.5 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-900">Warranty expiring soon - Action required</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warranty Trail */}
                    {asset.asset_type === 'hardware' && asset.warranty_trail && asset.warranty_trail.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
                                <CalendarIcon className="w-4 h-4 text-gray-600" />
                                <span>Warranty Trail</span>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">
                                    {asset.warranty_trail.length} {asset.warranty_trail.length === 1 ? 'Period' : 'Periods'}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {asset.warranty_trail
                                    .sort((a, b) => {
                                        const dateA = a.warranty_start ? new Date(a.warranty_start).getTime() : 0;
                                        const dateB = b.warranty_start ? new Date(b.warranty_start).getTime() : 0;
                                        return dateA - dateB; // Oldest first (chronological trail)
                                    })
                                    .map((warranty, index) => {
                                        const periodStatus = getWarrantyPeriodStatus(warranty.warranty_start, warranty.warranty_end);
                                        const duration = warranty.warranty_start && warranty.warranty_end
                                            ? Math.ceil((new Date(warranty.warranty_end) - new Date(warranty.warranty_start)) / (1000 * 60 * 60 * 24))
                                            : null;
                                        
                                        return (
                                            <div key={index} className={`border-l-4 ${periodStatus.bgColor.replace('bg-', 'border-')} bg-gray-50 p-3 rounded-r-md hover:bg-gray-100 transition-colors`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className="text-xs font-bold text-gray-700">
                                                                Period #{index + 1}
                                                            </span>
                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${periodStatus.color} ${periodStatus.bgColor}`}>
                                                                {periodStatus.label}
                                                            </span>
                                                        </div>
                                                        {warranty.renewal_date && (
                                                            <span className="text-xs text-gray-500">
                                                                Renewed: {new Date(warranty.renewal_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="font-semibold text-gray-600">Start: </span>
                                                        <span className="text-gray-900">
                                                            {warranty.warranty_start ? new Date(warranty.warranty_start).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-600">End: </span>
                                                        <span className="text-gray-900">
                                                            {warranty.warranty_end ? new Date(warranty.warranty_end).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                    {duration && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Duration: </span>
                                                            <span className="text-gray-900">{duration} days</span>
                                                        </div>
                                                    )}
                                                    {warranty.provider && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Provider: </span>
                                                            <span className="text-gray-900">{warranty.provider}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {warranty.notes && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <p className="text-xs text-gray-600">{warranty.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Current Subscription Information (Software) */}
                    {asset.asset_type === 'software' && (asset.subscription_start || asset.subscription_end) && (
                        <div className={`rounded-lg p-4 shadow-sm ${
                            subscriptionStatus.status === 'expiring' 
                                ? 'bg-orange-50' 
                                : subscriptionStatus.status === 'expired'
                                ? 'bg-red-50'
                                : 'bg-white'
                        }`}>
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <CalendarIcon className="w-4 h-4 text-gray-600" />
                                <span>Current Subscription</span>
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${subscriptionStatus.color} ${
                                    subscriptionStatus.status === 'expiring' ? 'bg-orange-100' :
                                    subscriptionStatus.status === 'expired' ? 'bg-red-100' :
                                    'bg-green-100'
                                }`}>
                                    {subscriptionStatus.label}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <InfoRow label="Subscription Start" value={
                                    asset.subscription_start ? new Date(asset.subscription_start).toLocaleDateString() : '-'
                                } icon={CalendarIcon} />
                                <InfoRow label="Subscription End" value={
                                    asset.subscription_end ? new Date(asset.subscription_end).toLocaleDateString() : '-'
                                } icon={CalendarIcon} />
                            </div>
                            {subscriptionStatus.status === 'expiring' && (
                                <div className="mt-2 p-2 bg-orange-100 rounded-md flex items-center space-x-1.5">
                                    <AlertTriangleIcon className="w-3.5 h-3.5 text-orange-600" />
                                    <span className="text-xs font-medium text-orange-900">Subscription renewing soon - Action required</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Subscription Trail (Software) */}
                    {asset.asset_type === 'software' && asset.subscription_trail && asset.subscription_trail.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
                                <CalendarIcon className="w-4 h-4 text-gray-600" />
                                <span>Subscription Trail</span>
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md text-xs font-semibold">
                                    {asset.subscription_trail.length} {asset.subscription_trail.length === 1 ? 'Period' : 'Periods'}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {asset.subscription_trail
                                    .sort((a, b) => {
                                        const dateA = a.subscription_start ? new Date(a.subscription_start).getTime() : 0;
                                        const dateB = b.subscription_start ? new Date(b.subscription_start).getTime() : 0;
                                        return dateA - dateB; // Oldest first (chronological trail)
                                    })
                                    .map((subscription, index) => {
                                        const periodStatus = getSubscriptionPeriodStatus(subscription.subscription_start, subscription.subscription_end);
                                        const duration = subscription.subscription_start && subscription.subscription_end
                                            ? Math.ceil((new Date(subscription.subscription_end) - new Date(subscription.subscription_start)) / (1000 * 60 * 60 * 24))
                                            : null;
                                        
                                        return (
                                            <div key={index} className={`border-l-4 ${periodStatus.bgColor.replace('bg-', 'border-')} bg-gray-50 p-3 rounded-r-md hover:bg-gray-100 transition-colors`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1">
                                                            <span className="text-xs font-bold text-gray-700">
                                                                Period #{index + 1}
                                                            </span>
                                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${periodStatus.color} ${periodStatus.bgColor}`}>
                                                                {periodStatus.label}
                                                            </span>
                                                        </div>
                                                        {subscription.renewal_date && (
                                                            <span className="text-xs text-gray-500">
                                                                Renewed: {new Date(subscription.renewal_date).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div>
                                                        <span className="font-semibold text-gray-600">Start: </span>
                                                        <span className="text-gray-900">
                                                            {subscription.subscription_start ? new Date(subscription.subscription_start).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-gray-600">End: </span>
                                                        <span className="text-gray-900">
                                                            {subscription.subscription_end ? new Date(subscription.subscription_end).toLocaleDateString() : 'Not set'}
                                                        </span>
                                                    </div>
                                                    {duration && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Duration: </span>
                                                            <span className="text-gray-900">{duration} days</span>
                                                        </div>
                                                    )}
                                                    {subscription.license_type && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">License: </span>
                                                            <span className="text-gray-900">{subscription.license_type}</span>
                                                        </div>
                                                    )}
                                                    {subscription.version && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Version: </span>
                                                            <span className="text-gray-900">{subscription.version}</span>
                                                        </div>
                                                    )}
                                                    {subscription.provider && (
                                                        <div>
                                                            <span className="font-semibold text-gray-600">Provider: </span>
                                                            <span className="text-gray-900">{subscription.provider}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {subscription.notes && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                                        <p className="text-xs text-gray-600">{subscription.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Configuration Details */}
                    {asset.configuration && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <FileTextIcon className="w-4 h-4 text-gray-600" />
                                <span>Configuration</span>
                            </h3>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded-md overflow-x-auto">
                                {typeof asset.configuration === 'string' 
                                    ? asset.configuration 
                                    : JSON.stringify(asset.configuration, null, 2)}
                            </div>
                        </div>
                    )}

                    {/* Linked Assets */}
                    {asset.linked_assets && asset.linked_assets.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <LinkIcon className="w-4 h-4 text-gray-600" />
                                <span>Linked Assets</span>
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">
                                    {asset.linked_assets.length}
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {asset.linked_assets.map((linkedId, index) => (
                                    <div key={index} className="bg-gray-50 p-2 rounded-md text-xs font-mono hover:bg-gray-100 transition-colors">
                                        {linkedId}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes & Comments */}
                    {asset.notes && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <FileTextIcon className="w-4 h-4 text-gray-600" />
                                <span>Notes & Comments</span>
                            </h3>
                            <div className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                                {asset.notes}
                            </div>
                        </div>
                    )}

                    {/* Repair Queue (Hardware Only) */}
                    {asset.asset_type === 'hardware' && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-1.5">
                                    <WrenchIcon className="w-4 h-4 text-gray-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Repair Queue</h3>
                                    {asset.repair_queue && asset.repair_queue.length > 0 && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-xs font-semibold">
                                            {asset.repair_queue.length} {asset.repair_queue.length === 1 ? 'Item' : 'Items'}
                                        </span>
                                    )}
                                </div>
                                {(currentUser?.role === 'super_admin' || currentUser?.role === 'admin') && (
                                    <button
                                        onClick={() => setIsRepairQueueModalOpen(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150"
                                    >
                                        <span>+</span>
                                        <span>Add to Queue</span>
                                    </button>
                                )}
                            </div>
                            {asset.repair_queue && asset.repair_queue.length > 0 ? (
                                <div className="space-y-2">
                                    {asset.repair_queue.map((queueItem, index) => {
                                        const getStatusColor = (status) => {
                                            const colors = {
                                                'Queued': 'bg-gray-100 text-gray-800',
                                                'In Progress': 'bg-blue-100 text-blue-800',
                                                'Retesting': 'bg-yellow-100 text-yellow-800',
                                                'Completed': 'bg-green-100 text-green-800',
                                            };
                                            return colors[status] || 'bg-gray-100 text-gray-800';
                                        };

                                        return (
                                            <div 
                                                key={queueItem.id || index} 
                                                className="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/assets/${assetId}/repair-queue/${queueItem.id}`)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs font-bold text-gray-700">
                                                            {queueItem.id || `Queue Item #${index + 1}`}
                                                        </span>
                                                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${getStatusColor(queueItem.status)}`}>
                                                            {queueItem.status}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {queueItem.created_at ? new Date(queueItem.created_at).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-700 mb-1">{queueItem.issue_description}</p>
                                                {queueItem.priority && (
                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                                                        queueItem.priority === 'High' ? 'bg-red-100 text-red-800' :
                                                        queueItem.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                        {queueItem.priority} Priority
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 text-center py-4">No repair queue items yet</p>
                            )}
                        </div>
                    )}

                    {/* Repair History */}
                    {asset.repair_history && asset.repair_history.length > 0 && (
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                <WrenchIcon className="w-4 h-4 text-gray-600" />
                                <span>Repair History</span>
                                <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded-md text-xs font-semibold">
                                    {asset.repair_history.length}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {asset.repair_history.map((repair, index) => (
                                    <div key={index} className="bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold text-gray-900">
                                                {repair.date ? new Date(repair.date).toLocaleDateString() : 'Unknown Date'}
                                            </span>
                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                                                repair.status === 'Completed' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : repair.status === 'In Progress'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {repair.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-700">{repair.description || repair.notes}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Metadata</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <InfoRow label="Created" value={
                                asset.created_at ? new Date(asset.created_at).toLocaleString() : '-'
                            } icon={CalendarIcon} />
                            <InfoRow label="Last Updated" value={
                                asset.updated_at ? new Date(asset.updated_at).toLocaleString() : '-'
                            } icon={ClockIcon} />
                            <InfoRow label="Created By" value={createdByName || 'Unknown'} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Add to Repair Queue Modal */}
            {asset && asset.asset_type === 'hardware' && (
                <AddToRepairQueueModal
                    isOpen={isRepairQueueModalOpen}
                    onClose={() => setIsRepairQueueModalOpen(false)}
                    assetId={assetId}
                    assetName={asset.asset_name || asset.name}
                    onSuccess={handleRepairQueueSuccess}
                />
            )}
        </div>
    );
};

export default AssetDetailPage;

