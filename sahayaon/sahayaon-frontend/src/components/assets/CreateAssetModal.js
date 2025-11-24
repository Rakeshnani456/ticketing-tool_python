// components/assets/CreateAssetModal.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, PackageIcon, LaptopIcon, PlusIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';

const CreateAssetModal = ({ isOpen, onClose, onSuccess, currentUser, preselectedClient = null, preselectedOwner = null, defaultClient = null }) => {
    // Get client name from defaultClient prop
    const getClientName = () => {
        if (defaultClient) {
            return defaultClient.companyName || defaultClient.client_name || '';
        }
        return preselectedClient || '';
    };

    const [formData, setFormData] = useState({
        asset_id: '',
        asset_type: 'hardware',
        category: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        client_name: getClientName(),
        owner_uid: preselectedOwner || '',
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
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const clientName = getClientName();
            if (clientName) {
                setFormData(prev => ({ ...prev, client_name: clientName }));
                // Fetch users for this specific client
                fetchUsersForClient(clientName);
            } else if (formData.client_name) {
                // Fallback: if client_name is already in formData, fetch users for it
                fetchUsersForClient(formData.client_name);
            }
        }
    }, [isOpen, defaultClient]);

    const fetchClients = async () => {
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setClients(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };

    const fetchUsersForClient = async (clientName) => {
        if (!clientName) {
            setUsers([]);
            return;
        }
        try {
            const token = await authClient.currentUser?.getIdToken();
            // Fetch users filtered by client_name
            const response = await fetch(`${API_BASE_URL}/api/users?client_name=${encodeURIComponent(clientName)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                // Filter users to ensure they belong to the client (double-check)
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
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        // If client changed, fetch users for that client
        if (name === 'client_name' && value) {
            fetchUsersForClient(value);
            setFormData(prev => ({ ...prev, owner_uid: '' })); // Reset owner when client changes
        }
    };

    const validate = () => {
        const newErrors = {};
        
        // Ensure client_name is set from context
        const clientName = getClientName();
        if (!clientName && !formData.client_name) {
            newErrors.client_name = 'Client is required';
        }
        
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

            // Ensure client_name is set from context
            const clientName = getClientName() || formData.client_name;
            if (!clientName) {
                setErrors({ submit: 'Client is required. Please navigate from a client page or select a client.' });
                setLoading(false);
                return;
            }

            // Prepare data for submission
            const submitData = {
                ...formData,
                client_name: clientName, // Always use client from context
                status: 'Active', // Default status
                warranty_start: formData.warranty_start || null,
                warranty_end: formData.warranty_end || null,
                subscription_start: formData.subscription_start || null,
                subscription_end: formData.subscription_end || null,
            };
            
            // Remove owner_uid for software
            if (formData.asset_type === 'software') {
                delete submitData.owner_uid;
            }

            const response = await fetch(`${API_BASE_URL}/api/assets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create asset');
            }

            const result = await response.json();
            onSuccess && onSuccess(result);
            handleClose();
        } catch (error) {
            console.error('Error creating asset:', error);
            setErrors({ submit: error.message || 'Failed to create asset. Please try again.' });
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
            client_name: getClientName(),
            owner_uid: preselectedOwner || '',
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
                        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-center justify-between z-10 border-b-2 border-blue-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                                    <PackageIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <PlusIcon className="w-4 h-4 text-blue-600" />
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">Create New Asset</h2>
                                        <p className="text-xs text-gray-600 font-medium">Add a new hardware or software asset</p>
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
                        <form id="create-asset-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
                            {errors.submit && (
                                <div className="p-2 bg-red-50 rounded-md text-xs text-red-800">
                                    {errors.submit}
                                </div>
                            )}

                            {/* Asset Type Selection */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Select Asset Type</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, asset_type: 'hardware' }))}
                                        className={`p-3 rounded-lg transition-all border-2 ${
                                            formData.asset_type === 'hardware'
                                                ? 'bg-blue-50 border-blue-400 shadow-sm'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <LaptopIcon className={`w-5 h-5 mx-auto mb-1.5 ${formData.asset_type === 'hardware' ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <p className={`text-xs font-bold ${formData.asset_type === 'hardware' ? 'text-blue-900' : 'text-gray-700'}`}>Hardware</p>
                                        <p className="text-xs text-gray-500 mt-0.5 font-normal">Physical devices</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, asset_type: 'software' }))}
                                        className={`p-3 rounded-lg transition-all border-2 ${
                                            formData.asset_type === 'software'
                                                ? 'bg-purple-50 border-purple-400 shadow-sm'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <PackageIcon className={`w-5 h-5 mx-auto mb-1.5 ${formData.asset_type === 'software' ? 'text-purple-600' : 'text-gray-500'}`} />
                                        <p className={`text-xs font-bold ${formData.asset_type === 'software' ? 'text-purple-900' : 'text-gray-700'}`}>Software</p>
                                        <p className="text-xs text-gray-500 mt-0.5 font-normal">Applications & licenses</p>
                                    </button>
                                </div>
                            </div>

                            {/* Hardware Form */}
                            {formData.asset_type === 'hardware' && (
                                <>
                                    {/* Basic Information */}
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
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.asset_id ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'
                                                    } border`}
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
                                </>
                            )}

                            {/* Software Form */}
                            {formData.asset_type === 'software' && (
                                <>
                                    {/* Basic Information */}
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

                            {/* Assignment - Common for both */}
                            {formData.asset_type === 'hardware' && (
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
                                            disabled={!getClientName() && !formData.client_name || !!preselectedOwner}
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
                                form="create-asset-form"
                                disabled={loading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <span>Create Asset</span>
                                    )}
                            </button>
                        </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

export default CreateAssetModal;

