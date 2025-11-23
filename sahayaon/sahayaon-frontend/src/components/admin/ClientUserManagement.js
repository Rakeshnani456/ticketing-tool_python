import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import UserManagementComponent from './UserManagementComponent';

/**
 * Client-specific User Management Component
 * This component wraps UserManagementComponent and pre-filters by client name
 */
const ClientUserManagement = ({ user, showFlashMessage, navigateTo }) => {
    const { clientName } = useParams();
    const navigate = useNavigate();

    // If no client name, redirect to main user management
    if (!clientName) {
        navigate('/user-management', { replace: true });
        return null;
    }

    // Decode the client name from URL immediately
    const decodedClientName = decodeURIComponent(clientName);

    return (
        <UserManagementComponent 
            user={user} 
            showFlashMessage={showFlashMessage} 
            navigateTo={navigateTo}
            preFilterClient={decodedClientName}
        />
    );
};

export default ClientUserManagement;

