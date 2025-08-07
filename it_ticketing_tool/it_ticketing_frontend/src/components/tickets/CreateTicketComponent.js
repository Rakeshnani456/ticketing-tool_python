import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, XCircle, Send, UploadCloud } from 'lucide-react';

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
    }, [user]);

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

        for (const file of files) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}.`, 'error');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue;
            }
            totalSize += file.size;
            validFiles.push(file);
        }

        if (totalSize > 50 * 1024 * 1024) {
            showFlashMessage('Total attachment size exceeds 50MB.', 'error');
            setAttachmentFiles([]);
        } else {
            setAttachmentFiles(validFiles);
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
        // Main form container: max-w-full to ensure it doesn't overflow, p-4 for padding
        <div className="w-full max-w-full mx-auto p-4 overflow-hidden">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3"> {/* Increased gap for better spacing */}

                {/* Section 1: Request for, Category, Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"> {/* Responsive columns */}
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
                        rows={4} // Keep rows minimal
                        maxLength={10000}
                        className="w-full resize-none text-xs"
                    />
                </div>

                {/* Section 4: Contact Number and Hostname/AssetID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> {/* Responsive columns */}
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

                {/* Section 5: Attachments and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-2"> {/* Responsive layout for this section */}
                    <div className="flex-1 min-w-0"> {/* min-w-0 to allow content to shrink */}
                        <label htmlFor="attachments" className="block text-gray-700 text-xs font-semibold mb-0.5">
                            Attachments <span className="text-xs text-gray-400">(PDF, JPG, PNG, Word or Zip)</span>
                        </label>
                        <input
                            type="file"
                            id="attachments"
                            multiple
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            className="hidden"
                            disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded shadow hover:bg-blue-700 transition"
                            disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                        >
                            <UploadCloud size={12} /> Upload
                        </button>
                        {attachmentFiles.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1 truncate"> {/* Truncate long file names */}
                                Selected: {attachmentFiles.length} file(s)
                                {attachmentFiles.length > 0 && (
                                    <span className="ml-1 text-gray-500">
                                        ({attachmentFiles.map(file => file.name).join(', ').substring(0, 50)}
                                        {attachmentFiles.map(file => file.name).join(', ').length > 50 ? '...' : ''})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0 w-full sm:w-auto"> {/* Buttons stack on small screens */}
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
                </div>


            </form>
        </div>
    );
};

export default CreateTicketComponent;
