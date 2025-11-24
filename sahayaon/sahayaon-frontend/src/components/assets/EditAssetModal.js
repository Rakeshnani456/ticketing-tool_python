// components/assets/EditAssetModal.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, PackageIcon, LaptopIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';
import Spinner from '../common/Spinner';

const EditAssetModal = ({ isOpen, onClose, onSuccess, currentUser, asset }) => {
    const [formData, setFormData] = useState({
        asset_id: '',
        asset_type: 'hardware',
        category: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        owner_uid: '',
        warranty_start: '',
        warranty_end: '',
        subscription_start: '',
        subscription_end: '',
        billing_type: '',
        license_quantity: '',
        version: '',
        configuration: '',
        notes: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    // Helper function to format date for input field
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        
        try {
            let date;
            // Handle Firestore Timestamp
            if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
                date = dateValue.toDate();
            } else if (typeof dateValue === 'string') {
                date = new Date(dateValue);
            } else if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                return '';
            }
            
            if (isNaN(date.getTime())) return '';
            
            // Return in YYYY-MM-DD format for HTML date input
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    useEffect(() => {
        if (isOpen && asset) {
            // Populate form with asset data
            setFormData({
                asset_id: asset.asset_id || asset.id || '',
                asset_type: asset.asset_type || 'hardware',
                category: asset.category || '',
                manufacturer: asset.manufacturer || '',
                model: asset.model || '',
                serial_number: asset.serial_number || '',
                owner_uid: asset.owner_uid || '',
                warranty_start: formatDateForInput(asset.warranty_start),
                warranty_end: formatDateForInput(asset.warranty_end),
                subscription_start: formatDateForInput(asset.subscription_start),
                subscription_end: formatDateForInput(asset.subscription_end),
                billing_type: asset.billing_type || '',
                license_quantity: asset.license_quantity || asset.quantity || '',
                version: asset.version || '',
                configuration: asset.configuration || '',
                notes: asset.notes || '',
            });

            // Fetch users for the client
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
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors = {};
        
        if (formData.asset_type === 'hardware') {
            if (!formData.asset_id.trim()) {
                newErrors.asset_id = 'Asset ID is required';
            }
            if (!formData.category) {
                newErrors.category = 'Category is required';
            }
            if (!formData.serial_number.trim()) {
                newErrors.serial_number = 'Serial Number is required';
            }
        } else if (formData.asset_type === 'software') {
            if (!formData.version) {
                newErrors.version = 'Version is required for software';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const token = await authClient.currentUser?.getIdToken();

            // Prepare data for submission - send all form fields
            const submitData = {
                asset_id: formData.asset_id,
                asset_type: formData.asset_type,
                category: formData.category,
                manufacturer: formData.manufacturer || '',
                model: formData.model || '',
                serial_number: formData.serial_number,
                version: formData.version || '',
                billing_type: formData.billing_type || '',
                license_quantity: formData.license_quantity || '',
                configuration: formData.configuration || '',
                notes: formData.notes || '',
            };

            // Handle owner assignment for hardware
            if (formData.asset_type === 'hardware') {
                if (formData.owner_uid) {
                    submitData.owner_uid = formData.owner_uid;
                    submitData.assigned_date = new Date().toISOString();
                } else {
                    // Explicitly set to null to unassign
                    submitData.owner_uid = null;
                    submitData.assigned_date = null;
                }
            } else {
                // Software doesn't have owner - ensure it's null
                submitData.owner_uid = null;
            }

            // Handle dates - send null to clear, or date string to set
            submitData.warranty_start = formData.warranty_start || null;
            submitData.warranty_end = formData.warranty_end || null;
            submitData.subscription_start = formData.subscription_start || null;
            submitData.subscription_end = formData.subscription_end || null;

            console.log('Updating asset:', asset.id);
            console.log('Submit data:', { ...submitData, owner_uid: submitData.owner_uid ? `${submitData.owner_uid.substring(0, 8)}...` : 'null' });

            const response = await fetch(`${API_BASE_URL}/api/assets/${asset.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update asset');
            }

            const result = await response.json();
            onSuccess && onSuccess(result);
            handleClose();
        } catch (error) {
            console.error('Error updating asset:', error);
            setErrors({ submit: error.message || 'Failed to update asset. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            asset_id: '',
            asset_type: 'hardware',
            category: '',
            manufacturer: '',
            model: '',
            serial_number: '',
            owner_uid: '',
            warranty_start: '',
            warranty_end: '',
            subscription_start: '',
            subscription_end: '',
            billing_type: '',
            license_quantity: '',
            version: '',
            configuration: '',
            notes: '',
        });
        setErrors({});
        onClose();
    };

    if (!isOpen || !asset) return null;

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
                    className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[calc(95vh-2rem)] overflow-hidden flex flex-col pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 flex items-center justify-between z-10 border-b-2 border-indigo-200">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-indigo-500 rounded-lg shadow-sm">
                                <PackageIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900">Edit Asset</h2>
                                <p className="text-xs text-gray-600 font-medium">Update asset information</p>
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
                    <form id="edit-asset-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {errors.submit && (
                            <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                                {errors.submit}
                            </div>
                        )}

                        {/* Hardware Form */}
                        {formData.asset_type === 'hardware' && (
                            <>
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center space-x-2">
                                        <div className="w-1 h-4 bg-blue-500 rounded"></div>
                                        <span>Hardware Information</span>
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                                                Asset ID <span className="text-red-600 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="asset_id"
                                                value={formData.asset_id}
                                                onChange={handleChange}
                                                className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 border ${
                                                    errors.asset_id ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                                                }`}
                                            />
                                            {errors.asset_id && (
                                                <p className="mt-0.5 text-xs text-red-600">{errors.asset_id}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                                                Category <span className="text-red-600 font-bold">*</span>
                                            </label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 border ${
                                                    errors.category ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                                                }`}
                                            >
                                                <option value="">Select Category</option>
                                                <option value="laptop">Laptop</option>
                                                <option value="desktop">Desktop</option>
                                                <option value="mouse">Mouse</option>
                                                <option value="keyboard">Keyboard</option>
                                                <option value="server">Server</option>
                                                <option value="printer">Printer</option>
                                                <option value="scanner">Scanner</option>
                                                <option value="monitor">Monitor</option>
                                                <option value="firewall">Firewall</option>
                                                <option value="headset">Headset</option>
                                                <option value="network switch">Network Switch</option>
                                                <option value="access points">Access Points</option>
                                            </select>
                                            {errors.category && (
                                                <p className="mt-0.5 text-xs text-red-600">{errors.category}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Manufacturer
                                            </label>
                                            <input
                                                type="text"
                                                name="manufacturer"
                                                value={formData.manufacturer}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Model
                                            </label>
                                            <input
                                                type="text"
                                                name="model"
                                                value={formData.model}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                                                Serial Number <span className="text-red-600 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="serial_number"
                                                value={formData.serial_number}
                                                onChange={handleChange}
                                                className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 border ${
                                                    errors.serial_number ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                                                }`}
                                            />
                                            {errors.serial_number && (
                                                <p className="mt-0.5 text-xs text-red-600">{errors.serial_number}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Warranty Information */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center space-x-2">
                                        <div className="w-1 h-4 bg-orange-500 rounded"></div>
                                        <span>Warranty Information</span>
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Warranty Start
                                            </label>
                                            <input
                                                type="date"
                                                name="warranty_start"
                                                value={formData.warranty_start}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-orange-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Warranty End
                                            </label>
                                            <input
                                                type="date"
                                                name="warranty_end"
                                                value={formData.warranty_end}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-orange-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Assignment - Hardware Only */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center space-x-2">
                                        <div className="w-1 h-4 bg-green-500 rounded"></div>
                                        <span>Assignment</span>
                                    </h3>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                            Owner (User)
                                        </label>
                                        <select
                                            name="owner_uid"
                                            value={formData.owner_uid}
                                            onChange={handleChange}
                                            className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-green-500 bg-white border border-gray-300 font-medium"
                                            disabled={!asset.client_name}
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
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Software Form */}
                        {formData.asset_type === 'software' && (
                            <>
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center space-x-2">
                                        <div className="w-1 h-4 bg-purple-500 rounded"></div>
                                        <span>Software Information</span>
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Manufacturer/Vendor
                                            </label>
                                            <input
                                                type="text"
                                                name="manufacturer"
                                                value={formData.manufacturer}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-purple-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-800 mb-1.5">
                                                Version <span className="text-red-600 font-bold">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="version"
                                                value={formData.version}
                                                onChange={handleChange}
                                                className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 border ${
                                                    errors.version ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                                                }`}
                                            />
                                            {errors.version && (
                                                <p className="mt-0.5 text-xs text-red-600">{errors.version}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Billing Type
                                            </label>
                                            <input
                                                type="text"
                                                name="billing_type"
                                                value={formData.billing_type}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-purple-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                License Quantity
                                            </label>
                                            <input
                                                type="number"
                                                name="license_quantity"
                                                value={formData.license_quantity}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-purple-500 bg-white border border-gray-300 font-medium"
                                                min="1"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Subscription Start
                                            </label>
                                            <input
                                                type="date"
                                                name="subscription_start"
                                                value={formData.subscription_start}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-purple-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Subscription End
                                            </label>
                                            <input
                                                type="date"
                                                name="subscription_end"
                                                value={formData.subscription_end}
                                                onChange={handleChange}
                                                className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-purple-500 bg-white border border-gray-300 font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Additional Information - Common for both */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-2">
                                <div className="w-1 h-4 bg-gray-400 rounded"></div>
                                <span>Additional Information</span>
                            </h3>
                            
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                    Configuration / Specifications
                                </label>
                                <textarea
                                    name="configuration"
                                    value={formData.configuration}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-gray-500 bg-white border border-gray-300 font-normal"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-2.5 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-gray-500 bg-white border border-gray-300 font-normal"
                                />
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
                            form="edit-asset-form"
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {loading ? (
                                <>
                                    <Spinner size="sm" color="white" />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <span>Update Asset</span>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default EditAssetModal;

