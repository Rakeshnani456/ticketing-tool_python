import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Send, UploadCloud, AlertCircle, X, ArrowLeft } from 'lucide-react';
import markIcon from '../../assets/icons/mark.png';

// Import common UI components
import FormInput from '../common/FormInput';
import FormTextarea from '../common/FormTextarea';
import FormSelect from '../common/FormSelect';
import CustomDropdown from '../common/CustomDropdown';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';
import Spinner from '../common/Spinner';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';
// Import Firebase client
import { app, dbClient } from '../../config/firebase';
// Import enterprise notification hook

/**
 * Full-page component for creating a new support ticket.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object (includes firebaseUser and role).
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @returns {JSX.Element} The ticket creation page.
 */
const CreateTicketPage = ({ user, showFlashMessage, navigateTo }) => {
    const navigate = useNavigate();
    
    // Form state
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

    // UI state
    const [loading, setLoading] = useState(false);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [submissionStatus, setSubmissionStatus] = useState('idle');
    const [successMessage, setSuccessMessage] = useState('');
    const [createdTicketId, setCreatedTicketId] = useState('');
    const [createdTicketDocId, setCreatedTicketDocId] = useState('');

    // Form validation
    const [errors, setErrors] = useState({});

    // File input ref
    const fileInputRef = useRef(null);
    // Success message ref for scrolling
    const successRef = useRef(null);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, id } = e.target;
        const fieldName = name || id; // Use name if available, otherwise use id
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
        
        // Clear error when user starts typing
        if (errors[fieldName]) {
            setErrors(prev => ({
                ...prev,
                [fieldName]: ''
            }));
        }
    };

    // Restrict contact number to digits only
    const handleContactNumberChange = (e) => {
        const rawValue = e.target.value || '';
        const numericOnly = rawValue.replace(/\D/g, '').slice(0, 15);
        setFormData(prev => ({
            ...prev,
            contact_number: numericOnly
        }));
        if (errors.contact_number) {
            setErrors(prev => ({ ...prev, contact_number: '' }));
        }
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setAttachmentFiles(prev => [...prev, ...files]);
    };

    // Remove attachment
    const removeAttachment = (index) => {
        setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Upload attachments using backend API (optimized for speed)
    const uploadAttachments = async () => {
        if (attachmentFiles.length === 0) return [];

        setUploadingAttachments(true);
        
        try {
            // OPTIMIZATION: Upload all files in parallel with timeout and error handling
            const uploadPromises = attachmentFiles.map(async (file, index) => {
                const formData = new FormData();
                formData.append('attachment', file);

                const idToken = await user.firebaseUser.getIdToken();
                
                // Add timeout to prevent hanging uploads
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                try {
                    const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                        },
                        body: formData,
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    const data = await response.json();
                    
                    if (response.ok && data.files && data.files.length > 0) {
                        return { 
                            url: data.files[0].url, 
                            fileName: data.files[0].originalFilename,
                            index 
                        };
                    } else {
                        throw new Error(`Failed to upload ${file.name}: ${data.error || 'Server error'}`);
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        throw new Error(`Upload timeout for ${file.name}`);
                    }
                    throw error;
                }
            });

            // Wait for all uploads to complete with better error handling
            const results = await Promise.allSettled(uploadPromises);
            const successfulUploads = results
                .filter(result => result.status === 'fulfilled')
                .map(result => result.value)
                .sort((a, b) => a.index - b.index); // Maintain original order
            
            const failedUploads = results
                .filter(result => result.status === 'rejected')
                .map(result => result.reason.message);

            if (failedUploads.length > 0) {
                console.warn('Some uploads failed:', failedUploads);
                showFlashMessage(`Some files failed to upload: ${failedUploads.join(', ')}`, 'warning');
            }

            return successfulUploads;
        } catch (error) {
            console.error('Attachment upload error:', error);
            showFlashMessage(`Upload error: ${error.message}`, 'error');
            return [];
        } finally {
            setUploadingAttachments(false);
        }
    };

    // Scroll to success message when created
    useEffect(() => {
        if (submissionStatus === 'success' && successRef.current) {
            successRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [submissionStatus]);

    // Form validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.subject.trim()) {
            newErrors.subject = 'Subject is required';
        }

        if (!formData.contact_number.trim()) {
            newErrors.contact_number = 'Contact number is required';
        }

        if (!formData.hostname_asset_id.trim()) {
            newErrors.hostname_asset_id = 'AssetID is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission (optimized for speed)
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setSubmissionStatus('creating');
        setErrorMessage('');

        try {
            // OPTIMIZATION: No notifications needed

            // OPTIMIZATION: Skip attachment upload if no files
            let attachmentData = [];
            if (attachmentFiles.length > 0) {
                const [uploadedAttachmentData] = await Promise.allSettled([
                    uploadAttachments()
                ]);
                attachmentData = uploadedAttachmentData.status === 'fulfilled' ? uploadedAttachmentData.value : [];

                if (attachmentData.length === 0) {
                    setSubmissionStatus('error');
                    setErrorMessage('No attachments were uploaded successfully.');
                    setLoading(false);
                    return;
                }
            }

            // OPTIMIZATION: Get token with force refresh disabled for speed
            const idToken = await user.firebaseUser.getIdToken(false);
            const payload = {
                ...formData,
                short_description: formData.subject,
                reporter_email: user?.email,
                attachments: attachmentData
            };
            delete payload.subject;

            // OPTIMIZATION: Reduce timeout to 10 seconds for faster failure detection
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const data = await response.json();
            
            if (response.ok) {
                setSubmissionStatus('success');
                
                // Show simple ticket creation success message
                const ticketDocId = data.ticket_id || data.id;
                const displayId = data.display_id || ticketDocId;
                
                console.log('🎫 Ticket created successfully:', ticketDocId, 'displayId:', displayId);
                
                // Show success message in the form
                setSuccessMessage(`Ticket ${displayId} created successfully!`);
                setCreatedTicketId(displayId);
                setCreatedTicketDocId(ticketDocId);
                
                // User will choose where to go via success message buttons
            } else {
                setSubmissionStatus('error');
                setErrorMessage(data.error || 'Failed to create ticket');
                showFlashMessage(data.error || 'Failed to create ticket', 'error');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            setSubmissionStatus('error');
            if (error.name === 'AbortError') {
                setErrorMessage('Request timeout - please try again');
                showFlashMessage('Request timeout - please try again', 'error');
            } else {
                setErrorMessage('An unexpected error occurred');
                showFlashMessage('An unexpected error occurred', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle back navigation
    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-4 sm:py-6">
            <div className="w-full px-3 sm:px-4 lg:px-6 xl:px-8">
                {/* Header */}
                <div className="mb-3 sm:mb-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 text-gray-600 hover:text-orange-600 transition-colors text-sm"
                        >
                            <ArrowLeft size={18} />
                            <span>Back</span>
                        </button>
                        <h1 className="text-lg sm:text-lg font-medium text-gray-900 flex-1 text-center">Create New Ticket</h1>
                        <div className="w-16"></div> {/* Spacer to balance the back button */}
                    </div>
                </div>


                {/* Error State */}
                {submissionStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2">
                            <XCircle className="text-red-600 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="text-red-800 font-semibold text-sm">Error Creating Ticket</h3>
                                <p className="text-red-700 text-sm">{errorMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Message - moved up and centered */}
                {successMessage && (
                    <div ref={successRef} className="border-2 border-orange-300 rounded-lg p-4 mb-4 bg-orange-50">
                        <div className="flex items-center justify-center gap-2 mb-3 text-center">
                            <img src={markIcon} alt="Success" className="w-4 h-4" />
                            <span className="text-gray-800 font-medium">Ticket {createdTicketId} created successfully!</span>
                        </div>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => navigate(`/tickets/${createdTicketDocId}`)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                            >
                                View Ticket
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                            >
                                Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Form */}
                <div className="bg-white rounded-lg shadow-lg border border-orange-200">
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        {/* Requested by and Request for Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <FormInput
                                    id="reporter_email"
                                    label="Requested by *"
                                    type="email"
                                    value={user?.email || ''}
                                    onChange={() => {}} // No-op since it's read-only
                                    placeholder="Your email"
                                    required
                                    disabled={true}
                                    className="bg-gray-50"
                                />
                            </div>
                            <div>
                                <FormInput
                                    id="request_for_email"
                                    label="Request for *"
                                    type="email"
                                    value={formData.request_for_email}
                                    onChange={handleInputChange}
                                    placeholder="e.g., user@company.com"
                                    required
                                    disabled={submissionStatus === 'success'}
                                />
                            </div>
                        </div>

                        {/* Category and Priority Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category *
                                </label>
                                <CustomDropdown
                                    value={formData.category}
                                    onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                    options={[
                                        { value: 'troubleshoot', label: 'Troubleshoot' },
                                        { value: 'hardware', label: 'Hardware' },
                                        { value: 'software', label: 'Software' }
                                    ]}
                                    placeholder="Select Category"
                                    className="w-full"
                                    disabled={submissionStatus === 'success'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Priority *
                                </label>
                                <CustomDropdown
                                    value={formData.priority}
                                    onChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                                    options={[
                                        { value: 'Low', label: 'Low' },
                                        { value: 'Medium', label: 'Medium' },
                                        { value: 'High', label: 'High' },
                                        { value: 'Critical', label: 'Critical' }
                                    ]}
                                    placeholder="Select Priority"
                                    className="w-full"
                                    disabled={submissionStatus === 'success'}
                                />
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <FormTextarea
                                id="subject"
                                label="Subject *"
                                value={formData.subject}
                                onChange={handleInputChange}
                                placeholder="Brief description of the issue"
                                rows={2}
                                maxLength={150}
                                error={errors.subject}
                                required
                                disabled={submissionStatus === 'success'}
                            />
                            <div className="text-right text-xs text-gray-500 mt-0.5">Max 150 characters</div>
                        </div>

                        {/* Description */}
                        <div>
                            <FormTextarea
                                id="long_description"
                                label="Description"
                                value={formData.long_description}
                                onChange={handleInputChange}
                                placeholder="Please provide detailed information about the issue..."
                                rows={6}
                                maxLength={10000}
                                error={errors.long_description}
                                disabled={submissionStatus === 'success'}
                            />
                        </div>

                        {/* Contact Number and Asset ID Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <FormInput
                                    id="contact_number"
                                    label="Contact *"
                                    type="text"
                                    value={formData.contact_number}
                                    onChange={handleContactNumberChange}
                                    placeholder="Your contact number"
                                    maxLength={15}
                                    error={errors.contact_number}
                                    required
                                    disabled={submissionStatus === 'success'}
                                />
                            </div>
                            <div>
                                <FormInput
                                    id="hostname_asset_id"
                                    label="AssetID *"
                                    type="text"
                                    value={formData.hostname_asset_id}
                                    onChange={handleInputChange}
                                    placeholder="Hostname or AssetID"
                                    error={errors.hostname_asset_id}
                                    required
                                    disabled={submissionStatus === 'success'}
                                />
                            </div>
                        </div>

                        {/* Attachments */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Attachments (Optional)
                            </label>
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${submissionStatus === 'success' ? 'border-gray-300 bg-gray-50' : 'border-orange-300 hover:border-orange-400'}`}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                                    disabled={submissionStatus === 'success'}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex items-center gap-2 mx-auto transition-colors text-sm ${submissionStatus === 'success' ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:text-orange-700'}`}
                                    disabled={loading || submissionStatus === 'success'}
                                >
                                    <UploadCloud size={18} />
                                    <span>{submissionStatus === 'success' ? 'Files Uploaded' : 'Choose Files'}</span>
                                </button>
                                <p className="text-xs text-gray-500 mt-1">
                                    Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF
                                </p>
                            </div>

                            {/* Selected Files */}
                            {attachmentFiles.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                                    {attachmentFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                                                <span className="text-xs text-gray-500 flex-shrink-0">
                                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                                                disabled={loading}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Success Message moved above form */}

                        {/* Action Buttons - Only show if not successful */}
                        {submissionStatus !== 'success' && (
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-4 sm:pt-5 border-t border-orange-200">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="w-full sm:w-auto text-sm border border-gray-300 text-gray-700 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto text-sm bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md font-semibold flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={loading}
                                >
                                    {loading || uploadingAttachments ? (
                                        <>
                                            <Spinner size="sm" />
                                            <span>{uploadingAttachments ? "Uploading..." : "Creating..."}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>Create Ticket</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateTicketPage;
