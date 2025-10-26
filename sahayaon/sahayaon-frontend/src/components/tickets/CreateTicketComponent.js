import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, Send, UploadCloud, AlertCircle, X, X as XThick } from 'lucide-react';

// Import common UI components
import FormInput from '../common/FormInput';
import FormTextarea from '../common/FormTextarea';
import FormSelect from '../common/FormSelect';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';
// Import Firebase client
import { app, dbClient } from '../../config/firebase';

/**
 * Component for creating a new support ticket with a compact, non-scrolling layout.
 * Designed to adapt to various screen resolutions without introducing scrollbars.
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
    // CSS to hide scrollbars - more aggressive approach
    const scrollbarStyles = `
        .no-scrollbar::-webkit-scrollbar,
        .no-scrollbar::-webkit-scrollbar-track,
        .no-scrollbar::-webkit-scrollbar-thumb,
        .no-scrollbar::-webkit-scrollbar-corner {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
        }
        .no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
            overflow: hidden !important;
        }
        body, html {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
        }
        body::-webkit-scrollbar,
        html::-webkit-scrollbar {
            display: none !important;
        }
    `;
    const [formData, setFormData] = useState({
        request_for_email: user?.email || '',
        category: 'troubleshoot',
        subject: '',
        long_description: '',
        contact_number: '',
        priority: 'Low',
        hostname_asset_id: '',
        attachments: []
    });
    const [loading, setLoading] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [unsupportedFileError, setUnsupportedFileError] = useState('');
    const fileInputRef = useRef();

    const categories = [
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'troubleshoot', label: 'Troubleshoot' },
    ];
    const priorities = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, request_for_email: user.email }));
        }
        
        // Apply scrollbar hiding globally
        const styleElement = document.createElement('style');
        styleElement.textContent = scrollbarStyles;
        document.head.appendChild(styleElement);
        
        // Cleanup function to remove the style when component unmounts
        return () => {
            if (document.head.contains(styleElement)) {
                document.head.removeChild(styleElement);
            }
        };
    }, [user, scrollbarStyles]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        setSubmissionStatus('idle');
        setErrorMessage('');
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

        // Helper function to truncate filenames while keeping extensions
        const truncateFileName = (fileName, maxLength = 20) => {
            if (fileName.length <= maxLength) return fileName;
            
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex === -1) {
                // No extension, truncate from middle
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

        // Set error message for different types of issues
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
            
            // Clear error after 3 seconds
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
            // Add new files to existing selection instead of replacing
            setAttachmentFiles(prev => {
                const existingFileNames = prev.map(f => f.name);
                const newFiles = validFiles.filter(file => !existingFileNames.includes(file.name));
                return [...prev, ...newFiles];
            });
        }
        
        // Clear the input value to allow reselection of the same file
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
            // Create a synthetic event object to pass to handleFileChange
            const syntheticEvent = {
                target: {
                    files: files
                }
            };
            handleFileChange(syntheticEvent);
        }
    };

    const uploadAttachments = async () => {
        if (attachmentFiles.length === 0) return [];

        setUploadingAttachments(true);
        const uploadedAttachmentData = [];

        for (const file of attachmentFiles) {
            const formData = new FormData();
            formData.append('attachment', file);

            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: formData,
                });

                const data = await response.json();
                console.log('Upload response:', data);
                if (response.ok && data.files && data.files.length > 0) {
                    uploadedAttachmentData.push({ url: data.files[0].url, fileName: data.files[0].originalFilename });
                } else {
                    showFlashMessage(`Failed to upload ${file.name}: ${data.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
            }
        }
        setUploadingAttachments(false);
        return uploadedAttachmentData;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSubmissionStatus('creating');
        setErrorMessage('');

        // Close the modal immediately and notify parent that submission is starting
        onClose();
        if (onTicketSubmissionStart) {
            onTicketSubmissionStart();
        }

        try {
            const uploadedAttachmentData = await uploadAttachments();

            if (attachmentFiles.length > 0 && uploadedAttachmentData.length === 0) {
                if (onTicketSubmissionError) {
                    onTicketSubmissionError('No attachments were uploaded successfully.');
                }
                setSubmissionStatus('error');
                setLoading(false);
                return;
            }

            const idToken = await user.firebaseUser.getIdToken();
            const payload = {
                ...formData,
                short_description: formData.subject, // Map subject to short_description
                reporter_email: user?.email,
                attachments: uploadedAttachmentData
            };
            delete payload.subject; // Remove subject to avoid confusion

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
                
                // Notify parent about success
                onTicketCreated();
                if (onSuccessStateChange) {
                    onSuccessStateChange(true, { id: data.id, display_id: data.display_id });
                }
                
                // Reset form
                setFormData({
                    request_for_email: user?.email || '',
                    category: 'troubleshoot',
                    subject: '',
                    long_description: '',
                    contact_number: '',
                    priority: 'Low',
                    hostname_asset_id: '',
                    attachments: []
                });
                setAttachmentFiles([]);
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

    const handleContactNumberChange = (e) => {
        let value = e.target.value;
        value = value.replace(/[^\d+]/g, '');
        if (value.length > 15) value = value.slice(0, 15);
        setFormData(prev => ({ ...prev, contact_number: value }));
        setSubmissionStatus('idle');
        setErrorMessage('');
    };

    return (
        <>
            <style>{scrollbarStyles}</style>
            {/* Main form container: max-w-full to ensure it doesn't overflow, p-4 for padding */}
            <div 
                className="w-full max-w-full mx-auto p-4 overflow-hidden no-scrollbar" 
                style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none'
                }}
            >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2"> {/* Reduced gap for more compact layout */}

                {/* Section 1: Requested by, Request for, Category, Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"> {/* Responsive columns */}
                    <FormInput
                        id="reporter_email"
                        label="Requested by *"
                        type="email"
                        value={user?.email || ''}
                        onChange={() => {}} // No-op since it's read-only
                        required
                        placeholder="Your email"
                        disabled={true}
                        className="w-full text-xs bg-gray-50"
                    />
                    <FormInput
                        id="request_for_email"
                        label="Request for *"
                        type="email"
                        value={formData.request_for_email}
                        onChange={handleChange}
                        required
                        placeholder="e.g., user@company.com"
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        className="w-full text-xs"
                    />
                    <FormSelect
                        id="category"
                        label="Category *"
                        value={formData.category}
                        onChange={handleChange}
                        options={categories}
                        required
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        placeholder="Select Category"
                        className="w-full text-xs"
                    />
                    <FormSelect
                        id="priority"
                        label="Priority *"
                        value={formData.priority}
                        onChange={handleChange}
                        options={priorities}
                        required
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        placeholder="Select Priority"
                        className="w-full text-xs"
                    />
                </div>

                {/* Section 2: Subject */}
                <div>
                    <FormTextarea
                        id="subject"
                        label="Subject *"
                        value={formData.subject}
                        onChange={handleChange}
                        maxLength={150}
                        required
                        rows={2} // Keep rows minimal
                        className="w-full resize-none text-xs"
                    />
                    <div className="text-right text-xs text-gray-500 mt-0.5">Max 150 characters</div>
                </div>

                {/* Section 3: Description */}
                <div>
                    <FormTextarea
                        id="long_description"
                        label="Description"
                        value={formData.long_description}
                        onChange={handleChange}
                        rows={6} // Increased height for better user experience
                        maxLength={10000}
                        className="w-full resize-none text-xs"
                    />
                </div>

                {/* Section 4: Contact Number and Hostname/AssetID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1"> {/* Responsive columns with reduced bottom margin */}
                    <FormInput
                        id="contact_number"
                        label="Contact*"
                        type="text"
                        value={formData.contact_number}
                        onChange={handleContactNumberChange}
                        required
                       
                        maxLength={15}
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        className="w-full text-xs"
                    />
                    <FormInput
                        id="hostname_asset_id"
                        label="AssetID *"
                        type="text"
                        value={formData.hostname_asset_id}
                        onChange={handleChange}
                        required
                        placeholder="Hostname or AssetID"
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        className="w-full text-xs"
                    />
                </div>

                {/* Section 5: Attachments */}
                <div className="mt-1">
                    <label htmlFor="attachments" className="block text-gray-700 text-xs font-semibold mb-0.5">
                        Attachments <span className="text-xs text-gray-400"></span>
                    </label>
                    
                    {/* Drag and Drop Zone - Full width with fixed height */}
                    <div
                        className={`mb-2 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer w-full ${
                            isDragOver 
                                ? 'border-blue-400 bg-blue-50 scale-105' 
                                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        style={{ height: '70px' }}
                    >
                        <div className="flex flex-col items-center justify-center h-full p-3 text-center">
                            <UploadCloud className={`w-4 h-4 mb-1 transition-colors duration-200 ${
                                isDragOver ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <p className={`text-xs font-medium transition-colors duration-200 ${
                                isDragOver ? 'text-blue-700' : 'text-gray-600'
                            }`}>
                                {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
                            </p>
                            <p className="text-[10px] text-gray-500">
                                png, jpg, pdf, word, excel, zip (max 10mb)
                            </p>
                        </div>
                    </div>
                    
                    {/* Error Message Display - Fixed height container */}
                    <div className="mb-2 min-h-[32px] flex items-center">
                        {unsupportedFileError && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md w-full">
                                <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                <div className="text-xs text-red-600 font-medium">
                                    <span className="font-semibold">Error: </span>
                                    <span className="font-normal">{unsupportedFileError}</span>
                                    <span className="font-normal">. Allowed types: </span>
                                    <span className="font-semibold text-blue-600">png, jpg, pdf, word, excel, zip (max 10mb)</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <input
                        type="file"
                        id="attachments"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="hidden"
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                    />
                    
                    {/* Files Display - Fixed height container */}
                    <div className="min-h-[80px]">
                        {attachmentFiles.length > 0 && (
                            <>
                                {/* Selected Files Header */}
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1">
                                        Selected Files
                                    </h4>
                                    <button
                                        onClick={() => setAttachmentFiles([])}
                                        className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors duration-200 font-medium"
                                        title="Remove all files"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                
                                {/* File List */}
                                <div className="space-y-0.5">
                                    {attachmentFiles.map((file, index) => (
                                        <div key={`${file.name}-${index}`} className="flex items-center py-0.5">
                                            <span className="text-xs text-blue-600 underline font-medium truncate min-w-0">
                                                {file.name}
                                            </span>
                                            <button
                                                onClick={() => removeSelectedFile(index)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors duration-200 flex-shrink-0 ml-1"
                                                title="Remove file"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Section 6: Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 -mt-2 justify-end"> {/* Buttons positioned to the right and moved up */}
                    <SecondaryButton onClick={onClose} className="w-full sm:w-auto px-2 py-1 text-xs" disabled={loading}>
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton
                        type="submit"
                        loading={loading || uploadingAttachments ? (uploadingAttachments ? "Uploading..." : "Creating...") : null}
                        Icon={Send}
                        className="w-full sm:w-auto px-2 py-1 text-xs"
                        disabled={loading}
                    >
                        Submit
                    </PrimaryButton>
                </div>


            </form>
        </div>
        </>
    );
};

export default CreateTicketComponent;
