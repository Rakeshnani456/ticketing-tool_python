// components/assets/AssignAssetModal.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, UserIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';

const AssignAssetModal = ({ isOpen, onClose, onSuccess, asset }) => {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingUsers, setFetchingUsers] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen && asset) {
            setSelectedUserId(asset.owner_uid || '');
            if (asset.client_name) {
                fetchUsersForClient(asset.client_name);
            }
        }
    }, [isOpen, asset]);

    const fetchUsersForClient = async (clientName) => {
        if (!clientName) {
            setUsers([]);
            return;
        }
        setFetchingUsers(true);
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users?client_name=${encodeURIComponent(clientName)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                const filteredUsers = Array.isArray(data) ? data.filter(user => {
                    const userClientName = user.client_name || user.companyName;
                    return userClientName === clientName;
                }) : [];
                setUsers(filteredUsers);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching users for client:', error);
            setUsers([]);
        } finally {
            setFetchingUsers(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setLoading(true);
        setErrors({});
        
        try {
            const token = await authClient.currentUser?.getIdToken();
            
            const updateData = {
                owner_uid: selectedUserId || null,
                assigned_date: selectedUserId ? new Date().toISOString() : null,
            };

            const response = await fetch(`${API_BASE_URL}/api/assets/${asset.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to assign asset');
            }

            const result = await response.json();
            onSuccess && onSuccess(result);
            handleClose();
        } catch (error) {
            console.error('Error assigning asset:', error);
            setErrors({ submit: error.message || 'Failed to assign asset. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedUserId('');
        setErrors({});
        onClose();
    };

    if (!isOpen || !asset) return null;

    const isCurrentlyAssigned = !!asset.owner_uid;
    const currentOwner = users.find(u => u.uid === asset.owner_uid);

    const modalContent = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-40"
                onClick={handleClose}
                style={{ 
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 99999
                }}
            />
            <div 
                className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none" 
                style={{ 
                    position: 'fixed',
                    zIndex: 100000
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-lg shadow-xl max-w-md w-full pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-blue-50 rounded-md">
                                <UserIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">
                                    {isCurrentlyAssigned ? 'Reassign Asset' : 'Assign Asset'}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {isCurrentlyAssigned ? 'Change asset assignment' : 'Assign asset to a user'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-150"
                            type="button"
                        >
                            <CloseIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {errors.submit && (
                            <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                                {errors.submit}
                            </div>
                        )}

                        {/* Current Assignment Info */}
                        {isCurrentlyAssigned && currentOwner && (
                            <div className="p-3 bg-blue-50 rounded-md">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Currently Assigned To:</p>
                                <p className="text-sm text-gray-900">
                                    {currentOwner.name || currentOwner.email}
                                </p>
                            </div>
                        )}

                        {/* Asset Info */}
                        <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Asset:</p>
                            <p className="text-sm text-gray-900 font-medium">
                                {asset.asset_name || asset.name || asset.asset_id || asset.id}
                            </p>
                            {asset.asset_id && (
                                <p className="text-xs text-gray-600 mt-0.5 font-mono">
                                    {asset.asset_id}
                                </p>
                            )}
                        </div>

                        {/* User Selection */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Select User
                            </label>
                            {fetchingUsers ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white border border-gray-300"
                                >
                                    <option value="">Unassigned</option>
                                    {users.length > 0 ? (
                                        users.map(user => (
                                            <option key={user.uid} value={user.uid}>
                                                {user.name || user.email}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No users found for this client</option>
                                    )}
                                </select>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                                Select "Unassigned" to remove current assignment
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || fetchingUsers}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                        <span>{selectedUserId ? 'Assigning...' : 'Unassigning...'}</span>
                                    </>
                                ) : (
                                    <span>{selectedUserId ? (isCurrentlyAssigned ? 'Reassign' : 'Assign') : 'Unassign'}</span>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default AssignAssetModal;

