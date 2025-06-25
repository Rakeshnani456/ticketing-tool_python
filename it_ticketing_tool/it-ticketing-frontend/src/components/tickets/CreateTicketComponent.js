// src/components/tickets/CreateTicketComponent.js

import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Send, UploadCloud } from 'lucide-react'; // Icons

// Import common UI components
import FormInput from '../common/FormInput';
import FormTextarea from '../common/FormTextarea';
import FormSelect from '../common/FormSelect';
import PrimaryButton from '../common/PrimaryButton';
import SecondaryButton from '../common/SecondaryButton';

// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';
// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase'; // Import 'app' and 'dbClient'

/**
 * Component for creating a new support ticket.
 * Allows users to fill out a form with ticket details and attach files.
 * @param {object} props - Component props.
 * @param {object} props.user - The current authenticated user object (includes firebaseUser and role).
 * @param {function} props.onClose - Callback function to close the ticket creation form/modal.
 * @param {function} props.showFlashMessage - Function to display a temporary message to the user.
 * @param {function} props.onTicketCreated - Callback function to notify parent after successful ticket creation.
 * @param {function} props.navigateTo - Function to navigate to different pages in the app.
 * @returns {JSX.Element} The ticket creation form.
 */
const CreateTicketComponent = ({ user, onClose, showFlashMessage, onTicketCreated, navigateTo }) => {
    // State for form data
    const [formData, setFormData] = useState({
        request_for_email: user?.email || '', // Pre-fill with user's email
        category: '',
        short_description: '',
        long_description: '',
        contact_number: '',
        priority: '',
        hostname_asset_id: '',
        attachments: [] // Stores URLs of uploaded attachments
    });
    // State for overall form submission loading
    const [loading, setLoading] = useState(false);
    // State for selected files to be uploaded as attachments
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    // State for attachment upload specific loading
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    // State for controlling the submission message/status display
    const [submissionStatus, setSubmissionStatus] = useState('idle'); // 'idle', 'creating', 'success', 'error'
    // State to store the actual database ID of the created ticket (for navigation)
    const [createdTicketId, setCreatedTicketId] = useState(null);
    // State to store the user-friendly display ID of the created ticket
    const [createdTicketDisplayId, setCreatedTicketDisplayId] = useState(null);
    // State for displaying specific error messages related to submission
    const [errorMessage, setErrorMessage] = useState('');

    // Predefined categories for the select input
    const categories = [
        { value: '', label: 'Select Category' },
        { value: 'software', label: 'Software' },
        { value: 'hardware', label: 'Hardware' },
        { value: 'troubleshoot', label: 'Troubleshoot' },
    ];
    // Predefined priorities for the select input
    const priorities = [
        { value: '', label: 'Select Priority' },
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];

    // Effect to pre-fill email if user data changes
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({ ...prev, request_for_email: user.email }));
        }
    }, [user]);

    /**
     * Handles changes to form input fields.
     * @param {Event} e - The change event from the input.
     */
    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        // Reset submission status messages when user starts typing again
        setSubmissionStatus('idle');
        setErrorMessage('');
    };

    /**
     * Handles file selection for attachments.
     * Performs basic client-side validation for file type and size.
     * @param {Event} e - The change event from the file input.
     */
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];
        let totalSize = 0;

        for (const file of files) {
            // Define allowed file types
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PDF, JPG, PNG, Word.`, 'error');
                continue; // Skip this file
            }
            // Check individual file size (max 10MB per file)
            if (file.size > 10 * 1024 * 1024) {
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue; // Skip this file
            }
            totalSize += file.size;
            validFiles.push(file);
        }

        // Check total upload size limit (e.g., 50MB)
        if (totalSize > 50 * 1024 * 1024) {
            showFlashMessage('Total attachment size exceeds 50MB. Please select fewer files.', 'error');
            setAttachmentFiles([]); // Clear all selected files if total size is too large
        } else {
            setAttachmentFiles(validFiles); // Update state with valid files
        }
    };

    /**
     * Uploads selected attachment files to the backend.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of uploaded file objects ({url, fileName}).
     */
    const uploadAttachments = async () => {
        if (attachmentFiles.length === 0) return []; // No files to upload

        setUploadingAttachments(true); // Indicate attachment upload is in progress
        const uploadedAttachmentData = []; // Will store objects like { url, fileName }

        for (const file of attachmentFiles) {
            const formData = new FormData();
            formData.append('attachment', file); // Append file to FormData

            try {
                const idToken = await user.firebaseUser.getIdToken(); // Get Firebase ID token for authorization
                const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`, // Include token for authentication
                    },
                    body: formData, // Send form data with the file
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.files && data.files.length > 0) {
                        // Store the URL and originalFilename of the uploaded file
                        uploadedAttachmentData.push({ url: data.files[0].url, fileName: data.files[0].originalFilename });
                    }
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`, 'error');
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
            }
        }
        setUploadingAttachments(false); // End attachment upload loading
        return uploadedAttachmentData; // Return all successfully uploaded data (objects)
    };

    /**
     * Handles the overall form submission, including attachment upload and ticket creation.
     * @param {Event} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // Start general loading
        setSubmissionStatus('creating'); // Set status to 'creating'
        setErrorMessage(''); // Clear any previous error messages

        try {
            // 1. Upload attachments first
            // uploadedAttachmentUrls will now be an array of objects: [{url: '...', fileName: '...'}, ...]
            const uploadedAttachmentData = await uploadAttachments();

            // Check if attachments were selected but none were successfully uploaded
            if (attachmentFiles.length > 0 && uploadedAttachmentData.length === 0) {
                setErrorMessage('No attachments were uploaded successfully. Ticket not created.');
                setSubmissionStatus('error');
                setLoading(false);
                return; // Stop the submission process
            }

            // 2. Create ticket with the form data and uploaded attachment data
            const idToken = await user.firebaseUser.getIdToken(); // Get ID token for authorization
            const payload = {
                ...formData,
                attachments: uploadedAttachmentData // Include the array of attachment objects
            };

            const response = await fetch(`${API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}` // Include token
                },
                body: JSON.stringify(payload), // Send ticket data as JSON
            });

            const data = await response.json();
            if (response.ok) {
                setSubmissionStatus('success'); // Set status to 'success'
                setCreatedTicketId(data.id); // Store actual DB ID
                setCreatedTicketDisplayId(data.display_id); // Store display ID
                showFlashMessage('Ticket created successfully!', 'success'); // Show success flash message
                // Reset form fields after successful submission
                setFormData({
                    request_for_email: user?.email || '',
                    category: '',
                    short_description: '',
                    long_description: '',
                    contact_number: '',
                    priority: '',
                    hostname_asset_id: '',
                    attachments: []
                });
                setAttachmentFiles([]); // Clear selected attachment files
                onTicketCreated(); // Notify parent component to refresh ticket list (which will trigger onSnapshot)
            } else {
                setSubmissionStatus('error'); // Set status to 'error'
                setErrorMessage(data.error || 'Failed to create ticket.'); // Display specific error from backend
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            setSubmissionStatus('error'); // Set status to 'error'
            setErrorMessage('Network error or server unreachable during ticket creation.');
        } finally {
            setLoading(false); // End general loading
        }
    };

    /**
     * Navigates to the detail page of the newly created ticket.
     */
    const handleViewTicket = () => {
        if (createdTicketId) {
            navigateTo('ticketDetail', createdTicketId);
        }
    };

    /**
     * Navigates to the user's "My Tickets" page.
     */
    const handleGoToMyTickets = () => {
        navigateTo('myTickets');
    };

    return (
        <div className="p-2">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput
                    id="request_for_email"
                    label="*Request for (Email)"
                    type="email"
                    value={formData.request_for_email}
                    onChange={handleChange}
                    required
                    placeholder="e.g., user@company.com"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormSelect
                    id="category"
                    label="*Category"
                    value={formData.category}
                    onChange={handleChange}
                    options={categories}
                    required
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormInput
                    id="short_description"
                    label="*Short Description (max 250 characters)"
                    type="text"
                    value={formData.short_description}
                    onChange={handleChange}
                    required
                    maxLength={250}
                    placeholder="Brief summary of the issue"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormTextarea
                    id="long_description"
                    label="Long Description"
                    value={formData.long_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Provide detailed information about the issue"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <div>
                    <label htmlFor="attachments" className="block text-gray-700 text-sm font-semibold mb-1">Attachments (PDF, JPG, PNG, Word - max 10MB per file):</label>
                    <input
                        type="file"
                        id="attachments"
                        multiple // Allow multiple file selection
                        onChange={handleFileChange}
                        className="w-full text-gray-700 text-sm bg-white border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                    />
                    {/* Display selected file names */}
                    {attachmentFiles.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                            Selected files: {attachmentFiles.map(file => file.name).join(', ')}
                        </div>
                    )}
                </div>
                <FormInput
                    id="contact_number"
                    label="*Contact Number"
                    type="text"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                    placeholder="e.g., +91-9876543210"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormSelect
                    id="priority"
                    label="*Priority"
                    value={formData.priority}
                    onChange={handleChange}
                    options={priorities}
                    required
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />
                <FormInput
                    id="hostname_asset_id"
                    label="*Hostname / LaptopID / AssetID"
                    type="text"
                    value={formData.hostname_asset_id}
                    onChange={handleChange}
                    required
                    placeholder="e.g., LPT-XYZ-001, Server-ABC"
                    disabled={submissionStatus === 'success' || submissionStatus === 'creating'}
                />

                {/* Conditional rendering for submission status messages */}
                {submissionStatus === 'creating' && (
                    <div className="flex items-center justify-center p-3 text-sm text-blue-800 bg-blue-50 rounded-md animate-pulse">
                        <Loader2 size={16} className="animate-spin mr-2" />
                        <span>Creating ticket...</span>
                    </div>
                )}

                {submissionStatus === 'success' && (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-green-800 bg-green-50 rounded-md border border-green-200">
                        <CheckCircle size={24} className="text-green-600 mb-2" />
                        <p className="font-semibold text-base">
                            Ticket <span onClick={handleViewTicket} className="text-blue-600 hover:underline cursor-pointer">
                                {createdTicketDisplayId}
                            </span> created successfully!
                        </p>
                        <div className="flex space-x-3 mt-4">
                            <PrimaryButton onClick={handleViewTicket} Icon={CheckCircle} className="w-auto px-4 py-1.5 bg-green-600 hover:bg-green-700">
                                View Ticket
                            </PrimaryButton>
                            <SecondaryButton onClick={handleGoToMyTickets} className="w-auto px-4 py-1.5">
                                Go to My Tickets
                            </SecondaryButton>
                        </div>
                    </div>
                )}

                {submissionStatus === 'error' && errorMessage && (
                    <div className="flex items-center justify-center p-3 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                        <XCircle size={16} className="mr-2" />
                        <span>Error: {errorMessage}</span>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-3">
                    {/* Hide buttons after successful submission */}
                    {submissionStatus !== 'success' && (
                        <>
                            <SecondaryButton onClick={onClose} className="w-auto px-4 py-1.5" disabled={loading}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                loading={loading || uploadingAttachments ? (uploadingAttachments ? "Uploading Files..." : "Creating Ticket...") : null}
                                Icon={Send}
                                className="w-auto px-4 py-1.5"
                                disabled={loading}
                            >
                                Submit Ticket
                            </PrimaryButton>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CreateTicketComponent;
