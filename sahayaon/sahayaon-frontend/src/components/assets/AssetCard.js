// components/assets/AssetCard.js
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    LaptopIcon,
    PackageIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    XCircleIcon,
    ClockIcon,
    CalendarIcon,
    UserIcon,
    BuildingIcon,
    LinkIcon,
    WrenchIcon
} from './AssetIcons';

const AssetCard = ({ asset, onClick, selected = false }) => {
    const [imageError, setImageError] = useState(false);
    
    const getAssetIcon = (type, category) => {
        if (type === 'software') return PackageIcon;
        
        const categoryLower = (category || '').toLowerCase();
        if (categoryLower.includes('laptop')) return LaptopIcon;
        return PackageIcon;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-800 border-green-300';
            case 'Retired': return 'bg-gray-100 text-gray-800 border-gray-300';
            case 'Under Repair': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default: return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Active': return CheckCircleIcon;
            case 'Retired': return XCircleIcon;
            case 'Under Repair': return WrenchIcon;
            default: return ClockIcon;
        }
    };

    const getWarrantyStatus = () => {
        if (!asset.warranty_end) return { status: 'unknown', color: 'text-gray-500' };
        
        const endDate = new Date(asset.warranty_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600' };
        return { status: 'active', color: 'text-green-600' };
    };

    const AssetIcon = getAssetIcon(asset.asset_type, asset.category);
    const StatusIcon = getStatusIcon(asset.status);
    const warrantyStatus = getWarrantyStatus();

    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`bg-white rounded-lg border-2 ${
                selected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
            } shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden`}
            onClick={onClick}
        >
            {/* Image Section - Only for Hardware */}
            {asset.asset_type === 'hardware' && (
                <div className="w-full h-32 bg-gray-100 overflow-hidden flex items-center justify-center">
                    {asset.image_url && !imageError ? (
                        <img 
                            src={asset.image_url} 
                            alt={asset.asset_name || asset.name || 'Asset'} 
                            className="w-full h-full object-cover"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <AssetIcon className="w-8 h-8 text-gray-400" />
                    )}
                </div>
            )}

            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${
                            asset.asset_type === 'hardware' ? 'bg-blue-50' : 'bg-purple-50'
                        }`}>
                            <AssetIcon className={`w-5 h-5 ${
                                asset.asset_type === 'hardware' ? 'text-blue-600' : 'text-purple-600'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate text-sm">
                                {asset.asset_name || asset.name || 'Unnamed Asset'}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                                {asset.asset_id || asset.id?.substring(0, 8)}
                            </p>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md border text-xs font-medium flex items-center space-x-1 ${getStatusColor(asset.status)}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{asset.status || 'Active'}</span>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {asset.client_name && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <BuildingIcon className="w-3 h-3" />
                            <span className="truncate">{asset.client_name}</span>
                        </div>
                    )}
                    {asset.owner_name && (
                        <div className="flex items-center space-x-1 text-gray-600">
                            <UserIcon className="w-3 h-3" />
                            <span className="truncate">{asset.owner_name}</span>
                        </div>
                    )}
                    {asset.warranty_end && (
                        <div className={`flex items-center space-x-1 ${warrantyStatus.color}`}>
                            <CalendarIcon className="w-3 h-3" />
                            <span className="truncate">
                                {new Date(asset.warranty_end).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                    {asset.linked_assets && asset.linked_assets.length > 0 && (
                        <div className="flex items-center space-x-1 text-blue-600">
                            <LinkIcon className="w-3 h-3" />
                            <span>{asset.linked_assets.length} linked</span>
                        </div>
                    )}
                </div>

                {/* Warranty Alert */}
                {warrantyStatus.status === 'expiring' && (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md flex items-center space-x-2">
                        <AlertTriangleIcon className="w-4 h-4 text-orange-600" />
                        <span className="text-xs text-orange-800">Warranty expiring soon</span>
                    </div>
                )}

                {/* Footer Badges */}
                <div className="mt-3 flex flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        asset.asset_type === 'hardware' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                    }`}>
                        {asset.asset_type || 'Unknown'}
                    </span>
                    {asset.category && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {asset.category}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default AssetCard;

