// components/assets/UserAssetManagement.js
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LaptopIcon, PackageIcon } from './AssetIcons';
import useRealtimeAssets from '../../hooks/useRealtimeAssets';
import Spinner from '../common/Spinner';

const UserAssetManagement = ({ currentUser }) => {
    const navigate = useNavigate();
    
    // Use real-time hook for optimized Firebase reads with caching
    // Note: For non-user roles, this fetches all assets (or client assets for site_admin)
    // We'll filter client-side to show only assets assigned to current user
    const { assets: allAssets, loading, error } = useRealtimeAssets(currentUser);
    
    // Filter assets assigned to current user (works for all roles)
    const myAssets = useMemo(() => {
        if (!allAssets || !currentUser?.uid) return [];
        return Array.isArray(allAssets) 
            ? allAssets.filter(a => a.owner_uid === currentUser.uid)
            : [];
    }, [allAssets, currentUser?.uid]);
    
    // Filter assets by type (client-side, no additional reads)
    const hardwareAssets = useMemo(() => {
        return myAssets.filter(a => a.asset_type === 'hardware');
    }, [myAssets]);
    
    const softwareAssets = useMemo(() => {
        return myAssets.filter(a => a.asset_type === 'software');
    }, [myAssets]);

    const handleAssetClick = (asset) => {
        navigate(`/assets/${asset.id || asset.asset_id}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading assets...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <p className="text-sm text-red-600 mb-2">Error loading assets</p>
                    <p className="text-xs text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4 bg-white rounded-lg p-3 shadow-sm">
                    <h1 className="text-xl font-bold text-gray-900">My Assets</h1>
                    <p className="text-xs text-gray-600 mt-0.5">Assets assigned to you</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Assigned Hardware */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <LaptopIcon className="w-5 h-5 text-gray-600" />
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Assigned Hardware</h2>
                                <p className="text-xs text-gray-600">Hardware assets currently assigned to you</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {hardwareAssets.length > 0 ? (
                                hardwareAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => handleAssetClick(asset)}
                                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer relative"
                                    >
                                        <div className="absolute top-2 right-2">
                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-md text-xs font-semibold">
                                                assigned
                                            </span>
                                        </div>
                                        <div className="pr-20">
                                            <h3 className="font-bold text-gray-900 text-sm mb-1">
                                                {asset.asset_name || asset.name}
                                            </h3>
                                            <p className="text-xs text-gray-600 mb-1">
                                                {asset.category || 'Hardware'}
                                            </p>
                                            {asset.serial_number && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    Serial: {asset.serial_number}
                                                </p>
                                            )}
                                            {asset.model && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    Model: {asset.model}
                                                </p>
                                            )}
                                            {asset.manufacturer && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    {asset.manufacturer}
                                                </p>
                                            )}
                                            {asset.assigned_date && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Assigned: {new Date(asset.assigned_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-500 text-center py-4">No hardware assets assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Allocated Software */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center space-x-2 mb-3">
                            <PackageIcon className="w-5 h-5 text-gray-600" />
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Allocated Software</h2>
                                <p className="text-xs text-gray-600">Software licenses assigned to you</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {softwareAssets.length > 0 ? (
                                softwareAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => handleAssetClick(asset)}
                                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer relative"
                                    >
                                        <div className="absolute top-2 right-2">
                                            <span className="px-2 py-0.5 bg-orange-600 text-white rounded-md text-xs font-semibold">
                                                {asset.license_type || 'Licensed'}
                                            </span>
                                        </div>
                                        <div className="pr-20">
                                            <h3 className="font-bold text-gray-900 text-sm mb-1">
                                                {asset.asset_name || asset.name}
                                            </h3>
                                            {asset.version && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    Version {asset.version}
                                                </p>
                                            )}
                                            {asset.license_type && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    License Type: {asset.license_type}
                                                </p>
                                            )}
                                            {asset.publisher || asset.manufacturer || asset.vendor && (
                                                <p className="text-xs text-gray-600 mb-1">
                                                    {asset.publisher || asset.manufacturer || asset.vendor}
                                                </p>
                                            )}
                                            {asset.assigned_date && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Assigned: {new Date(asset.assigned_date).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-500 text-center py-4">No software licenses allocated</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserAssetManagement;
