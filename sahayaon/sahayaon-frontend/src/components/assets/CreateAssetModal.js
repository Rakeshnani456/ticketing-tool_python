// components/assets/CreateAssetModal.js
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, SaveIcon, PackageIcon, LaptopIcon, CalendarIcon, UploadIcon, ImageIcon, PlusIcon } from './AssetIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';

const CreateAssetModal = ({ isOpen, onClose, onSuccess, currentUser, preselectedClient = null, preselectedOwner = null }) => {
    const [formData, setFormData] = useState({
        asset_name: '',
        asset_id: '',
        asset_type: 'hardware',
        category: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        client_name: preselectedClient || '',
        owner_uid: preselectedOwner || '',
        status: 'Active',
        warranty_start: '',
        warranty_end: '',
        subscription_start: '',
        subscription_end: '',
        license_type: '',
        version: '',
        configuration: '',
        notes: '',
        risk_level: 'Low',
        flagged: false,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchClients();
            if (formData.client_name) {
                fetchUsersForClient(formData.client_name);
            }
        }
    }, [isOpen, formData.client_name]);

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
        try {
            const token = await authClient.currentUser?.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/users?client_name=${encodeURIComponent(clientName)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
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
        
        if (!formData.asset_name.trim()) {
            newErrors.asset_name = 'Asset name is required';
        }
        if (!formData.asset_id.trim()) {
            newErrors.asset_id = 'Asset ID is required';
        }
        if (!formData.asset_type) {
            newErrors.asset_type = 'Asset type is required';
        }
        if (!formData.client_name) {
            newErrors.client_name = 'Client is required';
        }
        if (formData.asset_type === 'software' && !formData.version) {
            newErrors.version = 'Version is required for software';
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
            
            // Upload image first if it's a hardware asset
            let imageUrl = null;
            if (formData.asset_type === 'hardware' && imageFile) {
                imageUrl = await uploadImage();
                if (!imageUrl) {
                    throw new Error('Failed to upload image. Please try again.');
                }
            }

            // Prepare data for submission
            const submitData = {
                ...formData,
                image_url: imageUrl,
                warranty_start: formData.warranty_start || null,
                warranty_end: formData.warranty_end || null,
                subscription_start: formData.subscription_start || null,
                subscription_end: formData.subscription_end || null,
            };

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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setErrors({ ...errors, image: 'Please select a valid image file (JPG, PNG, or WEBP)' });
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setErrors({ ...errors, image: 'Image size must be less than 5MB' });
                return;
            }

            setImageFile(file);
            setErrors({ ...errors, image: null });
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async () => {
        if (!imageFile) return null;

        setUploadingImage(true);
        try {
            const token = await authClient.currentUser?.getIdToken();
            const formDataObj = new FormData();
            formDataObj.append('image', imageFile);

            const response = await fetch(`${API_BASE_URL}/api/assets/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formDataObj,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload image');
            }

            const data = await response.json();
            return data.image.url;
        } catch (error) {
            console.error('Error uploading image:', error);
            setErrors({ ...errors, image: error.message || 'Failed to upload image' });
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleClose = () => {
        setFormData({
            asset_name: '',
            asset_id: '',
            asset_type: 'hardware',
            category: '',
            manufacturer: '',
            model: '',
            serial_number: '',
            client_name: preselectedClient || '',
            owner_uid: preselectedOwner || '',
            status: 'Active',
            warranty_start: '',
            warranty_end: '',
            subscription_start: '',
            subscription_end: '',
            license_type: '',
            version: '',
            configuration: '',
            notes: '',
            risk_level: 'Low',
            flagged: false,
        });
        setErrors({});
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
                        <div className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between z-10 border-b border-gray-200">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-50 rounded-md">
                                    <PackageIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <PlusIcon className="w-4 h-4 text-gray-600" />
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900">Create New Asset</h2>
                                        <p className="text-xs text-gray-500">Add a new hardware or software asset</p>
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
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Select Asset Type</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, asset_type: 'hardware' }))}
                                        className={`p-3 rounded-md transition-all ${
                                            formData.asset_type === 'hardware'
                                                ? 'bg-blue-50'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                    >
                                        <LaptopIcon className="w-5 h-5 mx-auto mb-1.5 text-gray-600" />
                                        <p className="text-xs font-semibold text-gray-900">Hardware</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Physical devices</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, asset_type: 'software' }))}
                                        className={`p-3 rounded-md transition-all ${
                                            formData.asset_type === 'software'
                                                ? 'bg-blue-50'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                        }`}
                                    >
                                        <PackageIcon className="w-5 h-5 mx-auto mb-1.5 text-gray-600" />
                                        <p className="text-xs font-semibold text-gray-900">Software</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Applications & licenses</p>
                                    </button>
                                </div>
                            </div>

                            {/* Hardware Form */}
                            {formData.asset_type === 'hardware' && (
                                <>
                                    {/* Basic Information */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Hardware Information</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Asset Name <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="asset_name"
                                                    value={formData.asset_name}
                                                    onChange={handleChange}
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.asset_name ? 'bg-red-50' : 'bg-white'
                                                    }`}
                                                    placeholder="e.g., Dell Laptop XPS 15"
                                                />
                                                {errors.asset_name && (
                                                    <p className="mt-0.5 text-xs text-red-600">{errors.asset_name}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Asset ID <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="asset_id"
                                                    value={formData.asset_id}
                                                    onChange={handleChange}
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.asset_id ? 'bg-red-50' : 'bg-white'
                                                    }`}
                                                    placeholder="e.g., ASSET-001"
                                                />
                                                {errors.asset_id && (
                                                    <p className="mt-0.5 text-xs text-red-600">{errors.asset_id}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Category
                                                </label>
                                                <input
                                                    type="text"
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., Laptop, Desktop, Mobile, Server"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Manufacturer
                                                </label>
                                                <input
                                                    type="text"
                                                    name="manufacturer"
                                                    value={formData.manufacturer}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., Dell, HP, Apple, Lenovo"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Model
                                                </label>
                                                <input
                                                    type="text"
                                                    name="model"
                                                    value={formData.model}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., XPS 15, MacBook Pro"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Serial Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="serial_number"
                                                    value={formData.serial_number}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="Device serial number"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Status
                                                </label>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Retired">Retired</option>
                                                    <option value="Under Repair">Under Repair</option>
                                                    <option value="Pending">Pending</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Image Upload */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                Asset Image
                                            </label>
                                            <div className="space-y-1.5">
                                                {imagePreview ? (
                                                    <div className="relative">
                                                        <img 
                                                            src={imagePreview} 
                                                            alt="Preview" 
                                                            className="w-full h-32 object-cover rounded-md"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setImagePreview(null);
                                                                setImageFile(null);
                                                                if (fileInputRef.current) {
                                                                    fileInputRef.current.value = '';
                                                                }
                                                            }}
                                                            className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <CloseIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <ImageIcon className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                                        <p className="text-xs text-gray-600 mb-0.5">Click to upload image</p>
                                                        <p className="text-xs text-gray-400">JPG, PNG, or WEBP (max 5MB)</p>
                                                    </div>
                                                )}
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                                {errors.image && (
                                                    <p className="text-xs text-red-600">{errors.image}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warranty Information */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Warranty Information</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Warranty Start
                                                </label>
                                                <input
                                                    type="date"
                                                    name="warranty_start"
                                                    value={formData.warranty_start}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Warranty End
                                                </label>
                                                <input
                                                    type="date"
                                                    name="warranty_end"
                                                    value={formData.warranty_end}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
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
                                        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Software Information</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Asset Name <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="asset_name"
                                                    value={formData.asset_name}
                                                    onChange={handleChange}
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.asset_name ? 'bg-red-50' : 'bg-white'
                                                    }`}
                                                    placeholder="e.g., Microsoft Office 365"
                                                />
                                                {errors.asset_name && (
                                                    <p className="mt-0.5 text-xs text-red-600">{errors.asset_name}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Asset ID <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="asset_id"
                                                    value={formData.asset_id}
                                                    onChange={handleChange}
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.asset_id ? 'bg-red-50' : 'bg-white'
                                                    }`}
                                                    placeholder="e.g., ASSET-001"
                                                />
                                                {errors.asset_id && (
                                                    <p className="mt-0.5 text-xs text-red-600">{errors.asset_id}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Category
                                                </label>
                                                <input
                                                    type="text"
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., Operating System, Application, Security"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Manufacturer/Vendor
                                                </label>
                                                <input
                                                    type="text"
                                                    name="manufacturer"
                                                    value={formData.manufacturer}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., Microsoft, Adobe, Oracle"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Version <span className="text-red-600">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="version"
                                                    value={formData.version}
                                                    onChange={handleChange}
                                                    className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                        errors.version ? 'bg-red-50' : 'bg-white'
                                                    }`}
                                                    placeholder="e.g., 11.0.1, 2023"
                                                />
                                                {errors.version && (
                                                    <p className="mt-0.5 text-xs text-red-600">{errors.version}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    License Type
                                                </label>
                                                <input
                                                    type="text"
                                                    name="license_type"
                                                    value={formData.license_type}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="e.g., Perpetual, Annual, Monthly"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    License Key/Serial Number
                                                </label>
                                                <input
                                                    type="text"
                                                    name="serial_number"
                                                    value={formData.serial_number}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                    placeholder="License key or serial number"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Status
                                                </label>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Retired">Retired</option>
                                                    <option value="Pending">Pending</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Subscription Start
                                                </label>
                                                <input
                                                    type="date"
                                                    name="subscription_start"
                                                    value={formData.subscription_start}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                    Subscription End
                                                </label>
                                                <input
                                                    type="date"
                                                    name="subscription_end"
                                                    value={formData.subscription_end}
                                                    onChange={handleChange}
                                                    className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Assignment - Common for both */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assignment</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Client <span className="text-red-600">*</span>
                                        </label>
                                        <select
                                            name="client_name"
                                            value={formData.client_name}
                                            onChange={handleChange}
                                            className={`w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 ${
                                                errors.client_name ? 'bg-red-50' : 'bg-white'
                                            }`}
                                            disabled={!!preselectedClient}
                                        >
                                            <option value="">Select Client</option>
                                            {clients.map(client => (
                                                <option key={client.id || client.companyName} value={client.companyName || client.client_name}>
                                                    {client.companyName || client.client_name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.client_name && (
                                            <p className="mt-0.5 text-xs text-red-600">{errors.client_name}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Owner (User)
                                        </label>
                                        <select
                                            name="owner_uid"
                                            value={formData.owner_uid}
                                            onChange={handleChange}
                                            className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                            disabled={!formData.client_name || !!preselectedOwner}
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(user => (
                                                <option key={user.uid} value={user.uid}>
                                                    {user.name || user.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information - Common for both */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Additional Information</h3>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Configuration / Specifications
                                    </label>
                                    <textarea
                                        name="configuration"
                                        value={formData.configuration}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="Technical specifications, configuration details, etc."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="Additional notes or comments"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Risk Level
                                        </label>
                                        <select
                                            name="risk_level"
                                            value={formData.risk_level}
                                            onChange={handleChange}
                                            className="w-full px-2.5 py-1.5 text-sm rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center space-x-2 pt-6">
                                        <input
                                            type="checkbox"
                                            name="flagged"
                                            id="flagged"
                                            checked={formData.flagged}
                                            onChange={handleChange}
                                            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="flagged" className="text-xs font-semibold text-gray-700">
                                            Flagged for Attention
                                        </label>
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
                                form="create-asset-form"
                                disabled={loading || uploadingImage}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                    {(loading || uploadingImage) ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                                            <span>{uploadingImage ? 'Uploading...' : 'Creating...'}</span>
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

