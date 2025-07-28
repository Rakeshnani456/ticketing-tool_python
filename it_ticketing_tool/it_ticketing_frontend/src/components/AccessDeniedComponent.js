// src/components/AccessDeniedComponent.js

import React from 'react';
import { XCircle } from 'lucide-react'; // Icon for error message

/**
 * A simple component to display an "Access Denied" message.
 * Used when a user tries to access a page they don't have permission for.
 * @returns {JSX.Element} An access denied message.
 */
const AccessDeniedComponent = () => (
    <div className="text-center text-red-600 mt-8 text-base font-bold p-6 bg-white rounded-lg shadow-md border border-red-200">
        <XCircle size={24} className="inline-block mr-2" /> Access Denied. You do not have permission to view this page.
    </div>
);

export default AccessDeniedComponent;
