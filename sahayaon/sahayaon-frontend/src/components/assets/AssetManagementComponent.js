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

    // Route based on user role
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
        return <SuperAdminAssetManagement currentUser={currentUser} clientFilter={clientFilter} userFilter={userFilter} />;
    } else if (currentUser.role === 'site_admin') {
        return <SiteAdminAssetManagement currentUser={currentUser} clientFilter={clientFilter} userFilter={userFilter} />;
    } else if (currentUser.role === 'user') {
        return <UserAssetManagement currentUser={currentUser} />;
    } else {
        return <AccessDeniedComponent />;
    }
};

export default AssetManagementComponent;

