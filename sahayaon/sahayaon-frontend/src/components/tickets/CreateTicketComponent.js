import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, X, AlertCircle, Send } from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';

/**
 * Component for creating a new support ticket with enterprise-style layout.
 * Designed with fieldsets, compact spacing, and validation.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object (includes firebaseUser and role).
 * @param {function} props.onClose - Callback function to close the ticket creation form/modal.
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @param {function} props.onTicketCreated - Callback function to notify parent after successful ticket creation.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @param {function} props.onSuccessStateChange - Function to notify parent about success state changes.
 * @param {function} props.onTicketSubmissionStart - Function to notify parent when ticket submission starts.
 * @param {function} props.onTicketSubmissionError - Function to notify parent when ticket submission fails.
 * @returns {JSX.Element} The ticket creation form.
 */
const CreateTicketComponent = ({ user, onClose, showFlashMessage, onTicketCreated, navigateTo, onSuccessStateChange, onTicketSubmissionStart, onTicketSubmissionError }) => {
    const [formData, setFormData] = useState({
        requestedBy: user?.email || '',
        requestFor: user?.email || '',
        category: 'troubleshoot',
        priority: 'Low',
        subject: '',
        description: '',
        contact: '',
        assetId: ''
    });
    const [loading, setLoading] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('idle');
    const [errors, setErrors] = useState({});
    const [isDragOver, setIsDragOver] = useState(false);
    const [unsupportedFileError, setUnsupportedFileError] = useState('');
    const fileInputRef = useRef();

    const categories = [
        { value: 'troubleshoot', label: 'Troubleshoot' },
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
    ];

    const priorities = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ 
                ...prev, 
                requestedBy: user.email,
                requestFor: user.email 
            }));
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        setSubmissionStatus('idle');
    };

    const handleDropdownChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        if (errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: '' }));
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        let totalSize = 0;
        let hasUnsupportedTypes = false;
        let hasOversizedFiles = false;
        let unsupportedTypeNames = [];
        let oversizedFileNames = [];

        for (const file of files) {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg', 
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip',
                'application/x-zip-compressed'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                hasUnsupportedTypes = true;
                unsupportedTypeNames.push(file.name);
                continue;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                hasOversizedFiles = true;
                oversizedFileNames.push(file.name);
                continue;
            }
            
            totalSize += file.size;
            validFiles.push(file);
        }

        const truncateFileName = (fileName, maxLength = 20) => {
            if (fileName.length <= maxLength) return fileName;
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex === -1) {
                return fileName.substring(0, maxLength - 3) + '...';
            }
            const name = fileName.substring(0, lastDotIndex);
            const extension = fileName.substring(lastDotIndex);
            if (name.length <= maxLength - extension.length - 3) {
                return fileName;
            }
            const truncatedName = name.substring(0, maxLength - extension.length - 3) + '...';
            return truncatedName + extension;
        };

        let errorMessage = '';
        if (hasUnsupportedTypes && hasOversizedFiles) {
            const truncatedUnsupported = unsupportedTypeNames.map(name => truncateFileName(name)).join(', ');
            const truncatedOversized = oversizedFileNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Unsupported file types: ${truncatedUnsupported}. Files too large (>10MB): ${truncatedOversized}.`;
        } else if (hasUnsupportedTypes) {
            const truncatedNames = unsupportedTypeNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Unsupported file types: ${truncatedNames}.`;
        } else if (hasOversizedFiles) {
            const truncatedNames = oversizedFileNames.map(name => truncateFileName(name)).join(', ');
            errorMessage = `Files too large (>10MB): ${truncatedNames}.`;
        }
        
        if (errorMessage) {
            setUnsupportedFileError(errorMessage);
            setTimeout(() => {
                setUnsupportedFileError('');
            }, 3000);
        } else {
            setUnsupportedFileError('');
        }

        if (totalSize > 50 * 1024 * 1024) {
            showFlashMessage('Total attachment size exceeds 50MB.', 'error');
            setAttachmentFiles([]);
        } else {
            setAttachmentFiles(prev => {
                const existingFileNames = prev.map(f => f.name);
                const newFiles = validFiles.filter(file => !existingFileNames.includes(file.name));
                return [...prev, ...newFiles];
            });
        }
        
        e.target.value = '';
    };

    const removeSelectedFile = (indexToRemove) => {
        setAttachmentFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const syntheticEvent = {
                target: {
                    files: files
                }
            };
            handleFileChange(syntheticEvent);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        if (!formData.requestedBy?.trim()) {
            newErrors.requestedBy = 'Please enter who is raising the request.';
            isValid = false;
        }

        if (!formData.requestFor?.trim()) {
            newErrors.requestFor = 'Please enter the intended recipient/asset/user.';
            isValid = false;
        }

        if (!formData.category) {
            newErrors.category = 'Please choose a category.';
            isValid = false;
        }

        if (!formData.priority) {
            newErrors.priority = 'Please set a priority.';
            isValid = false;
        }

        if (!formData.subject?.trim()) {
            newErrors.subject = 'Subject is required.';
            isValid = false;
        }

        if (!formData.contact?.trim()) {
            newErrors.contact = 'Please add a contact (email or phone).';
            isValid = false;
        } else {
            // Validate contact format
            const looksEmail = /.+@.+\..+/.test(formData.contact.trim());
            const looksPhone = /[0-9]{10,}/.test(formData.contact.trim());
            if (!looksEmail && !looksPhone) {
                newErrors.contact = 'Please enter a valid email or 10+ digit phone number.';
                isValid = false;
            }
        }

        if (!formData.assetId?.trim()) {
            newErrors.assetId = 'AssetID is required.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const uploadAttachments = async (idToken) => {
        if (attachmentFiles.length === 0) return [];

        setUploadingAttachments(true);
        
        try {
            // Upload all files in parallel for better performance
            const uploadPromises = attachmentFiles.map(async (file) => {
                const formDataObj = new FormData();
                formDataObj.append('attachment', file);

                try {
                    const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                        },
                        body: formDataObj,
                    });

                    const data = await response.json();
                    if (response.ok && data.files && data.files.length > 0) {
                        return { url: data.files[0].url, fileName: data.files[0].originalFilename };
                    } else {
                        console.error(`Failed to upload ${file.name}:`, data.error || 'Server error');
                        return null;
                    }
                } catch (error) {
                    console.error(`Network error during upload for ${file.name}:`, error);
                    return null;
                }
            });

            // Wait for all uploads to complete
            const results = await Promise.all(uploadPromises);
            const uploadedAttachmentData = results.filter(result => result !== null);
            
            // Show error if some files failed to upload
            const failedCount = results.length - uploadedAttachmentData.length;
            if (failedCount > 0 && failedCount < results.length) {
                showFlashMessage(`${failedCount} file(s) failed to upload.`, 'error');
            }
            
            setUploadingAttachments(false);
            return uploadedAttachmentData;
        } catch (error) {
            console.error('Error uploading attachments:', error);
            setUploadingAttachments(false);
            return [];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showFlashMessage('Please fix the highlighted fields.', 'error');
            return;
        }

        setLoading(true);
        setSubmissionStatus('creating');

        if (onTicketSubmissionStart) {
            onTicketSubmissionStart();
        }

        try {
            // Get token once for all operations
            const idToken = await user.firebaseUser.getIdToken();
            
            // Upload attachments in parallel (if any)
            const uploadedAttachmentData = await uploadAttachments(idToken);

            // Prepare ticket payload
            const payload = {
                request_for_email: formData.requestFor,
                category: formData.category === 'other' ? 'troubleshoot' : formData.category,
                short_description: formData.subject,
                long_description: formData.description,
                contact_number: formData.contact,
                priority: formData.priority,
                hostname_asset_id: formData.assetId,
                reporter_email: user?.email,
                attachments: uploadedAttachmentData
            };

            // Create ticket with attachments
            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                setSubmissionStatus('success');
                onTicketCreated();
                if (onSuccessStateChange) {
                    onSuccessStateChange(true, { id: data.id, display_id: data.display_id });
                }
                
                // Reset form
                setFormData({
                    requestedBy: user?.email || '',
                    requestFor: user?.email || '',
                    category: 'troubleshoot',
                    priority: 'Low',
                    subject: '',
                    description: '',
                    contact: '',
                    assetId: ''
                });
                setAttachmentFiles([]);
                setErrors({});
                
                // Close modal if onClose is provided (modal usage)
                // If used as a page, navigate after success
                if (onClose) {
                    onClose();
                }
            } else {
                setSubmissionStatus('error');
                const errorMsg = data.error || 'Failed to create ticket.';
                if (onTicketSubmissionError) {
                    onTicketSubmissionError(errorMsg);
                }
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            setSubmissionStatus('error');
            const errorMsg = 'Network error or server unreachable.';
            if (onTicketSubmissionError) {
                onTicketSubmissionError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (onClose) {
            onClose();
        } else {
            // If no onClose prop (used as page), navigate back
            navigateTo('/my-tickets');
        }
    };

    return (
        <div className="w-full min-h-[calc(100vh-48px)] bg-gray-50 flex items-start justify-center py-4">
            <div className="w-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 tracking-wide">New Ticket</h1>
                    </div>
                    <div className="text-sm text-gray-500" aria-hidden="true">* Required</div>
                </div>

                {/* Form Container */}
                <form onSubmit={handleSubmit} className="flex flex-col space-y-5" noValidate>
                {/* Small Fields Grid - 3 columns */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Requested by */}
                        <div className={`field flex flex-col ${errors.requestedBy ? 'invalid' : ''}`}>
                            <label htmlFor="requestedBy" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Requested by <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="requestedBy"
                                name="requestedBy"
                                value={formData.requestedBy}
                                onChange={handleChange}
                                required
                                autoComplete="name"
                                readOnly
                                disabled
                                className="w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all bg-gray-50 text-gray-600 cursor-not-allowed border-gray-300"
                            />
                            {errors.requestedBy && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.requestedBy}</div>
                            )}
                        </div>

                        {/* Request for */}
                        <div className={`field flex flex-col ${errors.requestFor ? 'invalid' : ''}`}>
                            <label htmlFor="requestFor" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Request for <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="requestFor"
                                name="requestFor"
                                value={formData.requestFor}
                                onChange={handleChange}
                                required
                                disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                className={`w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all ${
                                    errors.requestFor 
                                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                } ${submissionStatus === 'success' || submissionStatus === 'creating' ? 'bg-gray-50' : 'bg-white'}`}
                            />
                            {errors.requestFor && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.requestFor}</div>
                            )}
                        </div>

                        {/* Category */}
                        <div className={`field flex flex-col ${errors.category ? 'invalid' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Category <span className="text-red-600">*</span>
                            </label>
                            <div className="h-10 flex items-center">
                                <CustomDropdown
                                    value={formData.category}
                                    onChange={(value) => handleDropdownChange('category', value)}
                                    options={categories}
                                    placeholder="Select a category"
                                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                    size="sm"
                                    disableClickOutside={false}
                                    className="w-full"
                                />
                            </div>
                            {errors.category && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.category}</div>
                            )}
                        </div>

                        {/* Priority */}
                        <div className={`field flex flex-col ${errors.priority ? 'invalid' : ''}`}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Priority <span className="text-red-600">*</span>
                            </label>
                            <div className="h-10 flex items-center">
                                <CustomDropdown
                                    value={formData.priority}
                                    onChange={(value) => handleDropdownChange('priority', value)}
                                    options={priorities}
                                    placeholder="Select a priority"
                                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                    size="sm"
                                    disableClickOutside={false}
                                    className="w-full"
                                />
                            </div>
                            {errors.priority && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.priority}</div>
                            )}
                        </div>

                        {/* Contact */}
                        <div className={`field flex flex-col ${errors.contact ? 'invalid' : ''}`}>
                            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Contact <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="contact"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                required
                                placeholder="Email or phone"
                                disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                className={`w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all ${
                                    errors.contact 
                                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                } ${submissionStatus === 'success' || submissionStatus === 'creating' ? 'bg-gray-50' : 'bg-white'}`}
                            />
                            <div className="text-xs text-gray-500 mt-1.5">Enter a valid email or 10+ digit phone</div>
                            {errors.contact && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.contact}</div>
                            )}
                        </div>

                        {/* Asset ID */}
                        <div className={`field flex flex-col ${errors.assetId ? 'invalid' : ''}`}>
                            <label htmlFor="assetId" className="block text-sm font-medium text-gray-700 mb-1.5">
                                AssetID <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="assetId"
                                name="assetId"
                                value={formData.assetId}
                                onChange={handleChange}
                                required
                                placeholder="e.g., LAP-1023"
                                disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                className={`w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all ${
                                    errors.assetId 
                                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                } ${submissionStatus === 'success' || submissionStatus === 'creating' ? 'bg-gray-50' : 'bg-white'}`}
                            />
                            {errors.assetId && (
                                <div className="text-sm text-red-600 mt-1.5">{errors.assetId}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subject - Full width row */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1">
                        <div className={`field flex flex-col ${errors.subject ? 'invalid' : ''}`}>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Subject <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                maxLength={120}
                                placeholder="Short summary"
                                disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                className={`w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all ${
                                    errors.subject 
                                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                } ${submissionStatus === 'success' || submissionStatus === 'creating' ? 'bg-gray-50' : 'bg-white'}`}
                            />
                            <div className="flex justify-between items-center mt-1.5">
                                <div className="text-sm text-gray-500">
                                    {formData.subject.length} / 120 characters
                                </div>
                                {errors.subject && (
                                    <div className="text-sm text-red-600">{errors.subject}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description - Full width row */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1">
                        <div className="field flex flex-col">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                maxLength={1000}
                                placeholder="Optional details (steps, expected vs actual, notes)"
                                disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all resize-none ${
                                    'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                                } ${submissionStatus === 'success' || submissionStatus === 'creating' ? 'bg-gray-50' : 'bg-white'}`}
                                style={{ minHeight: '80px' }}
                            />
                            <div className="text-right text-sm text-gray-500 mt-1.5">
                                {formData.description.length} / 1000 characters
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attachments - Full width row */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1">
                        <div className="field flex flex-col">
                            <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Attachments (Optional)
                            </label>
                            <div className="h-10 flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white hover:border-gray-400 transition-colors">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="attachments"
                                    name="attachments"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                    className="w-full h-full px-3 text-sm outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                                />
                            </div>
                            <div className="text-xs text-gray-500 mt-1.5">You can attach multiple files</div>

                            {/* File upload area and selected files - Always visible when files are added */}
                            {attachmentFiles.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="text-sm font-medium text-gray-700 mb-3">Selected Files ({attachmentFiles.length}):</div>
                                    <div className="space-y-2.5 max-h-40 overflow-y-auto">
                                        {attachmentFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between bg-blue-50 px-3 py-2.5 rounded-md text-sm border border-blue-200">
                                                <span className="text-gray-700 truncate flex-1 mr-3">{file.name}</span>
                                                <span className="text-xs text-gray-500 mr-3 whitespace-nowrap">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSelectedFile(index)}
                                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                                                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {unsupportedFileError && (
                                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm">
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                    <span className="text-red-600">{unsupportedFileError}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions - Fixed at bottom */}
                <div className="flex gap-3 justify-end pt-5 mt-2 border-t border-gray-200 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading || uploadingAttachments}
                        className="px-5 py-2.5 h-10 border border-gray-300 bg-white text-gray-700 rounded-lg cursor-pointer font-semibold text-sm transition-all hover:shadow-md active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || uploadingAttachments || submissionStatus === 'creating'}
                        className="px-5 py-2.5 h-10 bg-blue-600 text-white border border-blue-600 rounded-lg cursor-pointer font-semibold text-sm transition-all hover:bg-blue-700 hover:border-blue-700 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading || uploadingAttachments ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                {uploadingAttachments ? 'Uploading...' : 'Creating...'}
                            </>
                        ) : (
                            'Create Ticket'
                        )}
                    </button>
                </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTicketComponent;
