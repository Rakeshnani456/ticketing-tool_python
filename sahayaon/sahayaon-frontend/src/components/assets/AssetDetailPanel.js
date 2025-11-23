// components/assets/AssetDetailPanel.js
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    EditIcon
} from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';

const AssetDetailPanel = ({ asset, onClose, onEdit, isOpen }) => {
    // Disable body scroll when panel is open
    useEffect(() => {
        if (isOpen) {
            // Save current overflow style
            const originalOverflow = document.body.style.overflow;
            // Disable scrolling on body
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Restore original overflow when panel closes
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (!asset || !isOpen) return null;

    const getWarrantyStatus = () => {
        if (!asset.warranty_end) return { status: 'unknown', color: 'text-gray-500', label: 'No warranty info' };
        
        const endDate = new Date(asset.warranty_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', label: `Expires in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', label: `Active (${daysUntilExpiry} days remaining)` };
    };

    const getSubscriptionStatus = () => {
        if (!asset.subscription_end) return { status: 'unknown', color: 'text-gray-500', label: 'No subscription' };
        
        const endDate = new Date(asset.subscription_end);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return { status: 'expired', color: 'text-red-600', label: 'Expired' };
        if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'text-orange-600', label: `Renews in ${daysUntilExpiry} days` };
        return { status: 'active', color: 'text-green-600', label: `Active (${daysUntilExpiry} days remaining)` };
    };

    const warrantyStatus = getWarrantyStatus();
    const subscriptionStatus = getSubscriptionStatus();

    const InfoRow = ({ label, value, icon: Icon, className = '' }) => (
        <div className={`flex items-start space-x-3 py-3 ${className}`}>
            {Icon && (
                <div className="p-1.5 bg-gray-100 rounded-lg flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>
                <div className="text-sm font-medium text-gray-900 break-words">{value || <span className="text-gray-400">Not specified</span>}</div>
            </div>
        </div>
    );

    if (!isOpen) return null;

    const panelContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed bg-black"
                        onClick={onClose}
                        style={{ 
                            position: 'fixed',
                            top: '48px', // Header height (h-12 = 3rem = 48px)
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.5, // More visible overlay
                            zIndex: 9998 // High z-index to cover all content
                        }}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 w-full max-w-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
                        style={{ 
                            position: 'fixed',
                            top: '48px', // Start below header (h-12 = 3rem = 48px)
                            bottom: 0,
                            height: 'calc(100vh - 48px)', // Full height minus header
                            zIndex: 9999 // Highest z-index for the panel
                        }}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-5 flex items-center justify-between z-10 shrink-0 shadow-sm">
                            <div className="flex items-center space-x-4 min-w-0 flex-1">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    asset.asset_type === 'hardware' 
                                        ? 'bg-blue-100' 
                                        : 'bg-purple-100'
                                }`}>
                                    {asset.asset_type === 'hardware' ? (
                                        <LaptopIcon className="w-6 h-6 text-blue-700" />
                                    ) : (
                                        <PackageIcon className="w-6 h-6 text-purple-700" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-xl font-bold text-gray-900 truncate">
                                        {asset.asset_name || 'Unnamed Asset'}
                                    </h2>
                                    <div className="flex items-center space-x-3 mt-1">
                                        <p className="text-sm text-gray-600 truncate font-mono">{asset.asset_id || asset.id}</p>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                            <div className="flex items-center space-x-2 shrink-0">
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(asset)}
                                        className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-150 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        title="Edit Asset"
                                        type="button"
                                    >
                                        <EditIcon className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-all duration-150 active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                    type="button"
                                >
                                    <CloseIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ 
                            WebkitOverflowScrolling: 'touch',
                            overscrollBehavior: 'contain'
                        }}>

                            {/* Asset Image - Only for Hardware */}
                            {asset.asset_type === 'hardware' && asset.image_url && (
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                                    <div className="aspect-video rounded-lg overflow-hidden bg-white shadow-inner">
                                        <img 
                                            src={asset.image_url} 
                                            alt={asset.asset_name || 'Asset'} 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Basic Information */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                    <PackageIcon className="w-5 h-5 text-gray-600" />
                                    <span>Basic Information</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoRow label="Asset Name" value={asset.asset_name || asset.name} icon={PackageIcon} />
                                    <InfoRow label="Asset ID" value={asset.asset_id || asset.id} />
                                    <InfoRow label="Category" value={asset.category} />
                                    <InfoRow label="Manufacturer" value={asset.manufacturer} />
                                    <InfoRow label="Model" value={asset.model} />
                                    <InfoRow label="Serial Number" value={asset.serial_number} />
                                </div>
                            </div>

                            {/* Assignment Information */}
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                    <UserIcon className="w-5 h-5 text-gray-600" />
                                    <span>Assignment</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoRow label="Client" value={asset.client_name} icon={BuildingIcon} />
                                    <InfoRow label="Owner" value={asset.owner_name || asset.owner_email} icon={UserIcon} />
                                    <InfoRow label="Assigned Date" value={
                                        asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString() : '-'
                                    } icon={CalendarIcon} />
                                </div>
                            </div>

                            {/* Warranty Information */}
                            {(asset.warranty_start || asset.warranty_end) && (
                                <div className={`rounded-xl border p-5 shadow-sm ${
                                    warrantyStatus.status === 'expiring' 
                                        ? 'bg-orange-50 border-orange-200' 
                                        : warrantyStatus.status === 'expired'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-white border-gray-200'
                                }`}>
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <CalendarIcon className="w-5 h-5 text-gray-600" />
                                        <span>Warranty Information</span>
                                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${warrantyStatus.color} ${
                                            warrantyStatus.status === 'expiring' ? 'bg-orange-100' :
                                            warrantyStatus.status === 'expired' ? 'bg-red-100' :
                                            'bg-green-100'
                                        }`}>
                                            {warrantyStatus.label}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoRow label="Warranty Start" value={
                                            asset.warranty_start ? new Date(asset.warranty_start).toLocaleDateString() : '-'
                                        } icon={CalendarIcon} />
                                        <InfoRow label="Warranty End" value={
                                            asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString() : '-'
                                        } icon={CalendarIcon} />
                                    </div>
                                    {warrantyStatus.status === 'expiring' && (
                                        <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-center space-x-2">
                                            <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm font-medium text-orange-900">Warranty expiring soon - Action required</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Subscription Information (Software) */}
                            {asset.asset_type === 'software' && (asset.subscription_start || asset.subscription_end) && (
                                <div className={`rounded-xl border p-5 shadow-sm ${
                                    subscriptionStatus.status === 'expiring' 
                                        ? 'bg-orange-50 border-orange-200' 
                                        : subscriptionStatus.status === 'expired'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-white border-gray-200'
                                }`}>
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <CalendarIcon className="w-5 h-5 text-gray-600" />
                                        <span>Subscription Information</span>
                                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${subscriptionStatus.color} ${
                                            subscriptionStatus.status === 'expiring' ? 'bg-orange-100' :
                                            subscriptionStatus.status === 'expired' ? 'bg-red-100' :
                                            'bg-green-100'
                                        }`}>
                                            {subscriptionStatus.label}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoRow label="Subscription Start" value={
                                            asset.subscription_start ? new Date(asset.subscription_start).toLocaleDateString() : '-'
                                        } icon={CalendarIcon} />
                                        <InfoRow label="Subscription End" value={
                                            asset.subscription_end ? new Date(asset.subscription_end).toLocaleDateString() : '-'
                                        } icon={CalendarIcon} />
                                        <InfoRow label="License Type" value={asset.license_type} />
                                        <InfoRow label="Version" value={asset.version} />
                                    </div>
                                    {subscriptionStatus.status === 'expiring' && (
                                        <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg flex items-center space-x-2">
                                            <AlertTriangleIcon className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm font-medium text-orange-900">Subscription renewing soon - Action required</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Configuration Details */}
                            {asset.configuration && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <FileTextIcon className="w-5 h-5 text-gray-600" />
                                        <span>Configuration</span>
                                    </h3>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
                                        {typeof asset.configuration === 'string' 
                                            ? asset.configuration 
                                            : JSON.stringify(asset.configuration, null, 2)}
                                    </div>
                                </div>
                            )}

                            {/* Linked Assets */}
                            {asset.linked_assets && asset.linked_assets.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <LinkIcon className="w-5 h-5 text-gray-600" />
                                        <span>Linked Assets</span>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                            {asset.linked_assets.length}
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {asset.linked_assets.map((linkedId, index) => (
                                            <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm font-mono hover:bg-gray-100 transition-colors">
                                                {linkedId}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes & Comments */}
                            {asset.notes && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <FileTextIcon className="w-5 h-5 text-gray-600" />
                                        <span>Notes & Comments</span>
                                    </h3>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        {asset.notes}
                                    </div>
                                </div>
                            )}

                            {/* Repair History */}
                            {asset.repair_history && asset.repair_history.length > 0 && (
                                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                    <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center space-x-2">
                                        <WrenchIcon className="w-5 h-5 text-gray-600" />
                                        <span>Repair History</span>
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                            {asset.repair_history.length}
                                        </span>
                                    </h3>
                                    <div className="space-y-3">
                                        {asset.repair_history.map((repair, index) => (
                                            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {repair.date ? new Date(repair.date).toLocaleDateString() : 'Unknown Date'}
                                                    </span>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                        repair.status === 'Completed' 
                                                            ? 'bg-green-100 text-green-800'
                                                            : repair.status === 'In Progress'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {repair.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{repair.description || repair.notes}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                                <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">Metadata</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InfoRow label="Created" value={
                                        asset.created_at ? new Date(asset.created_at).toLocaleString() : '-'
                                    } icon={CalendarIcon} />
                                    <InfoRow label="Last Updated" value={
                                        asset.updated_at ? new Date(asset.updated_at).toLocaleString() : '-'
                                    } icon={ClockIcon} />
                                    <InfoRow label="Created By" value={asset.created_by_name || asset.created_by_uid} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(panelContent, document.body);
};

export default AssetDetailPanel;

