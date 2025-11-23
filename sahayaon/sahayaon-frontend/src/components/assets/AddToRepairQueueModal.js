// components/assets/AddToRepairQueueModal.js
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, WrenchIcon, AlertTriangleIcon, PlusIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';

const AddToRepairQueueModal = ({ isOpen, onClose, assetId, assetName, onSuccess }) => {
    const [formData, setFormData] = useState({
        issue_description: '',
        priority: 'Medium',
        assigned_to_uid: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);

    React.useEffect(() => {
        if (isOpen) {
            fetchUsers();
            // Reset form when modal opens
            setFormData({
                issue_description: '',
                priority: 'Medium',
                assigned_to_uid: '',
            });
            setError(null);
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const usersData = await response.json();
                // Filter for admin/support roles who can handle repairs
                const eligibleUsers = usersData.filter(user => 
                    ['admin', 'super_admin', 'site_admin', 'support'].includes(user.role)
                );
                setUsers(eligibleUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.issue_description.trim()) {
            setError('Issue description is required');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const token = await authClient.currentUser?.getIdToken();
            
            const requestBody = {
                issue_description: formData.issue_description.trim(),
                priority: formData.priority,
            };

            if (formData.assigned_to_uid) {
                requestBody.assigned_to_uid = formData.assigned_to_uid;
            }

            const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}/repair-queue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add asset to repair queue');
            }

            // Success
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error) {
            console.error('Error adding to repair queue:', error);
            setError(error.message || 'Failed to add asset to repair queue');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            issue_description: '',
            priority: 'Medium',
            assigned_to_uid: '',
        });
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

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
                className="fixed inset-0 flex items-center justify-center p-4 pt-16 pointer-events-none" 
                style={{ 
                    position: 'fixed',
                    zIndex: 100000
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[calc(95vh-2rem)] overflow-hidden flex flex-col pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-orange-50 rounded-md">
                                <WrenchIcon className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <PlusIcon className="w-4 h-4 text-gray-600" />
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">Add to Repair Queue</h2>
                                    <p className="text-xs text-gray-500">Report an issue for {assetName || 'this hardware asset'}</p>
                                </div>
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
                    <form id="add-repair-queue-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {error && (
                            <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                                {error}
                            </div>
                        )}

                        {/* Repair Information */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Repair Information</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Issue Description <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        id="issue_description"
                                        value={formData.issue_description}
                                        onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                                        placeholder="Describe the issue or problem with the asset..."
                                        rows="4"
                                        required
                                        className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 resize-none ${
                                            error && !formData.issue_description.trim() ? 'bg-red-50' : 'bg-white'
                                        }`}
                                    />
                                    {error && !formData.issue_description.trim() && (
                                        <p className="mt-0.5 text-xs text-red-600">{error}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        id="priority"
                                        name="priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Assign To (Optional)
                                    </label>
                                    <select
                                        id="assigned_to_uid"
                                        name="assigned_to_uid"
                                        value={formData.assigned_to_uid}
                                        onChange={(e) => setFormData({ ...formData, assigned_to_uid: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(user => (
                                            <option key={user.uid} value={user.uid}>
                                                {user.firstName && user.lastName 
                                                    ? `${user.firstName} ${user.lastName}` 
                                                    : user.name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Actions - Fixed at bottom */}
                    <div className="bg-white px-4 py-3 flex items-center justify-end space-x-2 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-repair-queue-form"
                            disabled={loading || !formData.issue_description.trim()}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                    <span>Adding...</span>
                                </>
                            ) : (
                                <>
                                    <WrenchIcon className="w-3.5 h-3.5" />
                                    <span>Add to Queue</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default AddToRepairQueueModal;

