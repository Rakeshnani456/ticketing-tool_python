// components/assets/AssetManagementComponent.js
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import SuperAdminAssetManagement from './SuperAdminAssetManagement';
import UserAssetManagement from './UserAssetManagement';
import SiteAdminAssetManagement from './SiteAdminAssetManagement';
import AccessDeniedComponent from '../AccessDeniedComponent';

const AssetManagementComponent = ({ currentUser }) => {
    const [searchParams] = useSearchParams();
    const clientFilter = searchParams.get('client');
    const userFilter = searchParams.get('user');

    if (!currentUser) {
        return <div>Loading...</div>;
    }

    // Route based on user role - show full management view
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'engineer' || currentUser.role === 'support') {
        // Super admin, admin, engineer, support see all assets
        return <SuperAdminAssetManagement currentUser={currentUser} clientFilter={clientFilter} userFilter={userFilter} />;
    } else if (currentUser.role === 'site_admin') {
        // Site admin sees all assets for their client
        return <SiteAdminAssetManagement currentUser={currentUser} clientFilter={clientFilter} userFilter={userFilter} />;
    } else {
        // For other roles (user, etc.), show their own assets
        return <UserAssetManagement currentUser={currentUser} />;
    }
};

export default AssetManagementComponent;

