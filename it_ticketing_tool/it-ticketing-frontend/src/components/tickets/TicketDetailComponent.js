// src/components/tickets/TicketDetailComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, UploadCloud, Send, Download } from 'lucide-react'; // Icons
import { doc, onSnapshot, getFirestore } from 'firebase/firestore'; // NEW: Firestore imports

// Import common UI components
import FormInput from '../common/FormInput';
import FormTextarea from '../common/FormTextarea';
import FormSelect from '../common/FormSelect';

// Import utility function
import { getFileNameFromUrl } from '../../utils/utils';
// Import API Base URL from constants
import { API_BASE_URL } from '../../config/constants';
// Import Firebase client (now including dbClient)
import { app, dbClient } from '../../config/firebase'; // Import 'app' and 'dbClient'


/**
 * Component to display and manage details of a single ticket.
 * Allows editing certain fields (based on user role), adding comments, and attaching files.
 * @param {object} props - Component props.
 * @param {string} props.ticketId - The ID of the ticket to display.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {object} props.user - The current authenticated user object.
 * @param {function} props.showFlashMessage - Function to display temporary messages.
 * @returns {JSX.Element} The ticket detail view.
 */
const TicketDetailComponent = ({ ticketId, navigateTo, user, showFlashMessage }) => {
    const [ticket, setTicket] = useState(null); // Stores the fetched ticket data
    const [loading, setLoading] = useState(true); // Loading state for initial ticket fetch
    const [error, setError] = useState(null); // Error state for fetch operations
    const [isEditing, setIsEditing] = useState(false); // Controls whether the ticket details are in edit mode
    const [commentText, setCommentText] = useState(''); // State for the new comment text
    const [commentLoading, setCommentLoading] = useState(false); // Loading state for adding comments
    const [updateLoading, setUpdateLoading] = useState(false); // Loading state for updating ticket details
    // State to manage the visual feedback of the save button ('save', 'saving', 'success', 'error')
    const [saveButtonState, setSaveButtonState] = useState('save');
    const [attachmentFiles, setAttachmentFiles] = useState([]); // Stores files selected for new attachments
    // State to manage the visual feedback of the attachment upload button
    const [uploadButtonState, setUploadButtonState] = useState('upload'); // 'upload', 'uploading', 'success', 'error'


    // State for fields that can be edited, initialized from ticket data once fetched
    const [editableFields, setEditableFields] = useState({
        request_for_email: '',
        short_description: '',
        long_description: '',
        contact_number: '',
        priority: '',
        status: '',
        assigned_to_email: ''
    });

    // Determine if the current user has 'support' role
    const isSupportUser = user?.role === 'support';

    // Predefined options for select inputs
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

    const statuses = [
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Hold', label: 'On Hold' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Closed', label: 'Closed' },
    ];

    // Initialize Firestore DB client.
    const db = dbClient; // Use the already initialized dbClient

    /**
     * Helper function to convert Firestore Timestamp to ISO string or Date object.
     * This ensures consistency for display and client-side sorting/filtering.
     * @param {object} data - The raw data from Firestore document.
     * @returns {object} Data with timestamps converted.
     */
    const formatTicketData = (data) => {
        const newData = { ...data };
        if (newData.created_at && newData.created_at.toDate) {
            newData.created_at = newData.created_at.toDate().toISOString();
        }
        if (newData.updated_at && newData.updated_at.toDate) {
            newData.updated_at = newData.updated_at.toDate().toISOString();
        }
        if (newData.resolved_at && newData.resolved_at.toDate) {
            newData.resolved_at = newData.resolved_at.toDate().toISOString();
        }
        if (newData.comments && Array.isArray(newData.comments)) {
            newData.comments = newData.comments.map(comment => {
                if (comment.timestamp && comment.timestamp.toDate) {
                    return { ...comment, timestamp: comment.timestamp.toDate().toISOString() };
                }
                return comment;
            });
        }
        return newData;
    };


    /**
     * Effect hook to set up real-time Firestore listener for a single ticket document.
     * This provides continuous updates for the ticket details.
     */
    useEffect(() => {
        if (!ticketId || !user?.firebaseUser || !db) {
            setLoading(false);
            showFlashMessage('Authentication or ticket ID missing to view details.', 'info');
            return () => {};
        }

        setLoading(true);
        setError(null);

        const ticketDocRef = doc(db, 'tickets', ticketId);

        const unsubscribe = onSnapshot(ticketDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const fetchedTicket = { id: docSnapshot.id, ...formatTicketData(docSnapshot.data()) };

                // Authorization check: Only reporter or support associate can view
                if (fetchedTicket.reporter_id !== user.firebaseUser.uid && user.role !== 'support') {
                    setError('Forbidden: You do not have permission to view this ticket.');
                    showFlashMessage('Forbidden: You do not have permission to view this ticket.', 'error');
                    setTicket(null); // Clear ticket data
                    setLoading(false);
                    return; // Stop processing if unauthorized
                }

                setTicket(fetchedTicket);
                // Also update editable fields if not currently editing
                // or if the ticket object itself has changed (e.g., status updated by another user)
                if (!isEditing) {
                    setEditableFields({
                        request_for_email: fetchedTicket.request_for_email || '',
                        short_description: fetchedTicket.short_description || '',
                        long_description: fetchedTicket.long_description || '',
                        contact_number: fetchedTicket.contact_number || '',
                        priority: fetchedTicket.priority || '',
                        status: fetchedTicket.status || '',
                        assigned_to_email: fetchedTicket.assigned_to_email || ''
                    });
                } else {
                    // If editing, ensure critical fields like status, assignment, etc., reflect real-time updates
                    // even if the user is typing in other fields.
                    setEditableFields(prev => ({
                        ...prev,
                        status: fetchedTicket.status,
                        priority: fetchedTicket.priority,
                        assigned_to_email: fetchedTicket.assigned_to_email
                    }));
                }
                setLoading(false);
                setError(null);
            } else {
                setError(`Ticket with ID ${ticketId} not found.`);
                showFlashMessage(`Ticket with ID ${ticketId} not found.`, 'error');
                setTicket(null);
                setLoading(false);
            }
        }, (err) => {
            console.error("Firestore onSnapshot error (TicketDetailComponent):", err);
            setError(`Failed to load ticket details: ${err.message}`);
            showFlashMessage(`Failed to load ticket details: ${err.message}`, 'error');
            setLoading(false);
        });

        // Cleanup function: unsubscribe from the listener when component unmounts or ticketId/user changes
        return () => unsubscribe();
    }, [ticketId, user, db, showFlashMessage, isEditing]); // Added isEditing to dependencies for a more robust update of editable fields

    // Determine if the ticket is closed or resolved
    const isTicketClosedOrResolved = ticket && ['Resolved', 'Closed'].includes(ticket.status);
    // Determine if the user can edit the ticket (support user or reporter and not closed/resolved)
    const canEdit = isSupportUser || (ticket && ticket.reporter_id === user?.firebaseUser.uid && !isTicketClosedOrResolved);
    // Determine if comments can be added (not closed/resolved)
    const canAddComments = !isTicketClosedOrResolved;
    // Determine if attachments can be added (not closed/resolved)
    const canAddAttachments = !isTicketClosedOrResolved;

    /**
     * Checks if there are any changes in the editable fields compared to the original ticket data.
     * @returns {boolean} True if changes exist, false otherwise.
     */
    const hasChanges = useCallback(() => {
        if (!ticket) return false;
        // Compare editable fields with the *current* ticket state
        return (
            editableFields.request_for_email !== ticket.request_for_email ||
            editableFields.short_description !== ticket.short_description ||
            editableFields.long_description !== ticket.long_description ||
            editableFields.contact_number !== ticket.contact_number ||
            editableFields.priority !== ticket.priority ||
            editableFields.status !== ticket.status ||
            editableFields.assigned_to_email !== ticket.assigned_to_email
        );
    }, [editableFields, ticket]); // Dependencies for useCallback

    /**
     * Handles changes in editable form fields.
     * @param {Event} e - The change event.
     */
    const handleEditChange = (e) => {
        const { id, value } = e.target;
        setEditableFields(prev => ({ ...prev, [id]: value }));
        // Reset save button state if user makes changes after a success/error
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
    };

    /**
     * Handles updating the ticket details on the backend.
     */
    const handleUpdateTicket = async () => {
        setUpdateLoading(true); // Start update loading
        setSaveButtonState('saving'); // Set button state to 'saving'

        try {
            const idToken = await user.firebaseUser.getIdToken();
            const payload = { ...editableFields }; // Payload includes all editable fields

            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                method: 'PATCH', // Use PATCH for partial updates
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                setSaveButtonState('success'); // Set button state to 'success'
               // showFlashMessage('Ticket updated successfully!', 'success'); // Show success message
                // No need to loadTicket(ticketId) explicitly, onSnapshot will handle it
                setError(null); // Clear any previous errors
                setTimeout(() => {
                    setIsEditing(false); // Exit edit mode after a delay
                    setSaveButtonState('save'); // Reset button state
                }, 1500);
            } else {
                setSaveButtonState('error'); // Set button state to 'error'
                showFlashMessage(data.error || 'Failed to update ticket.', 'error');
                setTimeout(() => {
                    setSaveButtonState('save'); // Reset button state after a delay
                }, 2000);
            }
        } catch (error) {
            console.error('Update ticket error:', error);
            setSaveButtonState('error'); // Set button state to 'error'
            showFlashMessage('Network error or server unreachable during update.', 'error');
            setTimeout(() => {
                setSaveButtonState('save'); // Reset button state after a delay
            }, 2000);
        } finally {
            setUpdateLoading(false); // End update loading
        }
    };

    /**
     * Cancels the editing mode and reverts changes to original ticket data.
     */
    const handleCancelEdit = () => {
        // Reset editable fields to the original ticket data
        setEditableFields({
            request_for_email: ticket.request_for_email || '',
            short_description: ticket.short_description || '',
            long_description: ticket.long_description || '',
            contact_number: ticket.contact_number || '',
            priority: ticket.priority || '',
            status: ticket.status || '',
            assigned_to_email: ticket.assigned_to_email || ''
        });
        setIsEditing(false); // Exit edit mode
        setSaveButtonState('save'); // Reset save button state
    };

    /**
     * Handles adding a new comment to the ticket.
     * @param {Event} e - The form submission event.
     */
    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showFlashMessage('Comment text cannot be empty.', 'error');
            return;
        }
        setCommentLoading(true); // Start comment loading
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ comment_text: commentText, commenter_name: user?.email }), // Send comment text and commenter name
            });
            const data = await response.json();
            if (response.ok) {
                setCommentText(''); // Clear comment input
                // No need to loadTicket(ticketId) explicitly, onSnapshot will handle it
                //showFlashMessage('Comment added successfully!', 'success'); // Show success message
            } else {
                showFlashMessage(data.error || 'Failed to add comment.', 'error');
            }
        } catch (error) {
            console.error('Add comment error:', error);
            showFlashMessage('Network error or server unreachable during comment addition.', 'error');
        } finally {
            setCommentLoading(false); // End comment loading
        }
    };

    /**
     * Handles selecting files for new attachments.
     * Performs client-side validation for file types and sizes.
     * @param {Event} e - The change event from the file input.
     */
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PDF, JPG, PNG, Word.`, 'error');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) { // Max 10MB per file
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue;
            }
            validFiles.push(file);
        }
        setAttachmentFiles(prevFiles => [...prevFiles, ...validFiles]); // Append new valid files to existing
        // Reset upload button state if files are selected after a previous success/error
        if (uploadButtonState !== 'upload') {
            setUploadButtonState('upload');
        }
    };

    /**
     * Removes a selected file from the list of files to be uploaded.
     * @param {File} fileToRemove - The file object to remove.
     */
    const handleRemoveFile = (fileToRemove) => {
        setAttachmentFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
        // Reset upload button state if files are removed after a previous success/error
        if (uploadButtonState !== 'upload') {
            setUploadButtonState('upload');
        }
    };

    /**
     * Handles uploading the selected attachment files and adding their URLs to the ticket.
     */
    const handleAddAttachmentsToTicket = async () => {
        if (attachmentFiles.length === 0) {
            return; // No files to upload
        }

        setUploadButtonState('uploading'); // Set button state to 'uploading'

        // Change uploadedUrls to store objects { url, fileName }
        const uploadedAttachmentData = []; //
        let anyUploadFailed = false;

        // Use Promise.all to upload all files concurrently
        const uploadPromises = attachmentFiles.map(async (file) => {
            const formData = new FormData();
            formData.append('attachment', file);

            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/upload-attachment`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` },
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.files && data.files.length > 0) {
                        // Crucial: Return the entire object that includes originalFilename
                        return { url: data.files[0].url, fileName: data.files[0].originalFilename }; //
                    }
                } else {
                    const errorData = await response.json();
                    showFlashMessage(`Failed to upload ${file.name}: ${errorData.error || 'Server error'}`, 'error');
                    anyUploadFailed = true;
                }
            } catch (error) {
                console.error('Attachment upload error:', error);
                showFlashMessage(`Network error during upload for ${file.name}.`, 'error');
                anyUploadFailed = true;
            }
            return null; // Return null if upload failed
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(attachmentObject => { // Now expecting an object, not just a URL
            if (attachmentObject) {
                uploadedAttachmentData.push(attachmentObject); // Collect successfully uploaded objects
            }
        });

        if (uploadedAttachmentData.length > 0) { // Check if any files were successfully uploaded
            try {
                const idToken = await user.firebaseUser.getIdToken();
                // Patch the ticket with new attachment URLs and original filenames
                const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    // Send the array of objects with url and fileName
                    body: JSON.stringify({ attachments: uploadedAttachmentData }), //
                });
                if (response.ok) {
                    setAttachmentFiles([]); // Clear selected files after successful addition
                    // Optimistically update ticket state with new attachments (or re-fetch for accuracy)
                    // No need to manually update `ticket` state; onSnapshot will handle it.
                    showFlashMessage('Attachments added successfully!', 'success'); // Show success message

                    if (!anyUploadFailed) {
                        setUploadButtonState('success');
                    } else {
                        setUploadButtonState('error'); // If some failed but some succeeded
                    }

                    setTimeout(() => {
                        setUploadButtonState('upload'); // Reset button state after a delay
                    }, 1500);
                } else {
                    const errorData = await response.json();
                    setUploadButtonState('error'); // Set button state to 'error'
                    showFlashMessage(`Failed to update ticket with attachments: ${errorData.error || 'Server error'}`, 'error');
                    setTimeout(() => {
                        setUploadButtonState('upload'); // Reset button state after a delay
                    }, 2000);
                }
            } catch (error) {
                console.error('Update ticket with attachments error:', error);
                setUploadButtonState('error'); // Set button state to 'error'
                showFlashMessage('Network error during updating ticket with attachments.', 'error');
                setTimeout(() => {
                    setUploadButtonState('upload'); // Reset button state after a delay
                }, 2000);
            }
        } else {
            // If no files were successfully uploaded at all
            setUploadButtonState('error');
            if (!anyUploadFailed) { // Only show this if no specific file upload error was shown
                 showFlashMessage('No attachments were successfully uploaded to add to the ticket.', 'error');
            }
            setTimeout(() => {
                setUploadButtonState('upload');
            }, 2000);
        }
    };

    /**
     * Determines CSS classes for a ticket's status badge.
     * @param {string} status - The status of the ticket.
     * @returns {string} Tailwind CSS classes.
     */
    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-green-100 text-green-800';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800';
            case 'Hold': return 'bg-purple-100 text-purple-800';
            case 'Closed': case 'Resolved': return 'bg-gray-100 text-gray-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    /**
     * Determines CSS classes for a ticket's priority badge.
     * @param {string} priority - The priority of the ticket.
     * @returns {string} Tailwind CSS classes.
     */
    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-blue-100 text-blue-800';
            case 'Medium': return 'bg-orange-100 text-orange-800';
            case 'High': return 'bg-red-100 text-red-800';
            case 'Critical': return 'bg-red-200 text-red-900 border border-red-500';
            default: return 'bg-purple-100 text-purple-800';
        }
    };

    // Conditional rendering for loading, error, or no ticket found states
    if (loading) return <div className="text-center text-gray-600 mt-8 text-base flex items-center justify-center space-x-2"><Loader2 className="animate-spin" size={20} /> <span>Loading ticket details...</span></div>;
    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;
    if (!ticket) return <div className="text-center text-gray-600 mt-8 text-base">Ticket not found.</div>;

    return (
        <div className="p-4 bg-gray-100 min-h-screen flex-1 overflow-auto font-sans">
            {/* Header with back button and edit/save actions */}
            <div className="flex items-center bg-white border-b border-gray-200 px-4 py-3 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigateTo(user?.role === 'support' ? 'allTickets' : 'myTickets')} className="text-gray-500 hover:text-gray-700 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-800 flex-grow">TASK{ticket.display_id} (Portal view)</h1>

                <div className="flex space-x-2">
                    {/* Edit Button (visible if not editing and can edit) */}
                    {canEdit && !isEditing && !isTicketClosedOrResolved && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                        >
                            Edit Ticket
                        </button>
                    )}
                    {/* Cancel and Save Buttons (visible when editing) */}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                disabled={updateLoading}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateTicket}
                                disabled={updateLoading || !hasChanges()} // Disable if loading or no changes made
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ease-in-out flex items-center justify-center
                                ${saveButtonState === 'saving'
                                        ? 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                        : saveButtonState === 'success'
                                            ? 'bg-green-500 text-white'
                                            : saveButtonState === 'error'
                                                ? 'bg-red-500 text-white'
                                                : hasChanges() // Only enable if changes exist
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                    }`}
                            >
                                {saveButtonState === 'saving' && <Loader2 className="animate-spin mr-2" size={16} />}
                                {saveButtonState === 'success' && <CheckCircle className="mr-2" size={16} />}
                                {saveButtonState === 'error' && <XCircle className="mr-2" size={16} />}
                                {saveButtonState === 'saving' && 'Saving...'}
                                {saveButtonState === 'success' && 'Success!'}
                                {saveButtonState === 'error' && 'Error!'}
                                {saveButtonState === 'save' && 'Save'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Ticket Details Content */}
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl mx-auto mt-4 border border-gray-200">
                {/* Grid for key ticket information */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Number:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.display_id}</span>
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Customer:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_for_email}</span>
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Request:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_item_id || 'N/A'}</span>
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Request Item:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.request_item_id || 'RITM000000'}</span>
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Due date:</label>
                            <span className="text-gray-900 text-sm font-medium flex-1">{ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Priority:</label>
                            {isEditing && canEdit ? (
                                <FormSelect
                                    id="priority"
                                    value={editableFields.priority}
                                    onChange={handleEditChange}
                                    options={priorities}
                                    disabled={!canEdit || isTicketClosedOrResolved}
                                    className="flex-1 max-w-xs"
                                    label="" // Hide label for compact layout
                                />
                            ) : (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)} flex-1 max-w-fit`}>
                                    {ticket.priority}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center">
                            <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Status:</label>
                            {isEditing && isSupportUser ? (
                                <FormSelect
                                    id="status"
                                    value={editableFields.status}
                                    onChange={handleEditChange}
                                    options={statuses}
                                    disabled={!isSupportUser}
                                    className="flex-1 max-w-xs"
                                    label="" // Hide label
                                />
                            ) : (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)} flex-1 max-w-fit`}>
                                    {ticket.status}
                                </span>
                            )}
                        </div>
                        {isSupportUser && ( // Only show for support users
                            <div className="flex items-center">
                                <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Assignment group:</label>
                                <span className="text-gray-900 text-sm font-medium flex-1">{ticket.assignment_group || 'ITS-FieldSupport.CentralCampus'}</span>
                            </div>
                        )}
                        {isSupportUser && ( // Only show for support users
                            <div className="flex items-center">
                                <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Assigned to:</label>
                                {isEditing && isSupportUser ? (
                                    <FormInput
                                        id="assigned_to_email"
                                        type="email"
                                        value={editableFields.assigned_to_email || ''}
                                        onChange={handleEditChange}
                                        placeholder="Enter email to assign"
                                        disabled={!isSupportUser || isTicketClosedOrResolved}
                                        className="flex-1 max-w-xs"
                                        label="" // Hide label
                                    />
                                ) : (
                                    <span className="text-gray-900 text-sm font-medium flex-1">{ticket.assigned_to_email || 'Unassigned'}</span>
                                )}

                            </div>
                        )}
                    </div>
                </div>

                {/* Short Description */}
                <div className="mb-6 border-t border-gray-200 pt-6">
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 text-sm font-semibold w-36 shrink-0">Short description:</label>
                        {isEditing && canEdit ? (
                            <FormTextarea
                                id="short_description"
                                value={editableFields.short_description}
                                onChange={handleEditChange}
                                rows={2}
                                maxLength={250}
                                disabled={!canEdit || isTicketClosedOrResolved}
                                className="flex-1"
                                label=""
                            />
                        ) : (
                            <span className="text-gray-900 text-sm bg-gray-50 p-2 rounded-sm border border-gray-200 flex-1">{ticket.short_description}</span>
                        )}
                    </div>
                    {/* Character count for short description */}
                    <div className="flex justify-end text-xs text-gray-500 mt-1">
                        Characters left: {isEditing && canEdit ? 250 - editableFields.short_description.length : ticket.short_description.length ? 250 - ticket.short_description.length : 250}
                    </div>
                </div>

                {/* Long Description */}
                <div className="mb-6">
                    <div className="flex items-start mb-2">
                        <label className="text-gray-700 text-sm font-semibold w-36 shrink-0 pt-2">Description:</label>
                        {isEditing && canEdit ? (
                            <FormTextarea
                                id="long_description"
                                value={editableFields.long_description}
                                onChange={handleEditChange}
                                rows={6}
                                disabled={!canEdit || isTicketClosedOrResolved}
                                className="flex-1"
                                label=""
                            />
                        ) : (
                            <span className="text-gray-900 text-sm bg-gray-50 p-2 rounded-sm border border-gray-200 whitespace-pre-wrap flex-1">{ticket.long_description || 'No long description provided.'}</span>
                        )}
                    </div>
                    {/* Character count for long description */}
                    <div className="flex justify-end text-xs text-gray-500 mt-1">
                        Characters left: {isEditing && canEdit ? 4000 - editableFields.long_description.length : ticket.long_description.length ? 4000 - ticket.long_description.length : 4000}
                    </div>
                </div>

                {/* Other details like Reporter Email and Category */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 border-t border-gray-200 pt-6">
                    <div className="flex items-center">
                        <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Reporter Email:</label>
                        <span className="text-gray-900 text-sm font-medium flex-1">{ticket.reporter_email}</span>
                    </div>
                    <div className="flex items-center">
                        <label className="text-gray-700 text-sm font-semibold w-28 shrink-0">Category:</label>
                        <span className="text-gray-900 text-sm font-medium flex-1">{ticket.category}</span>
                    </div>
                </div>

                {/* --- Attachments Section --- */}
                <hr className="my-6 border-gray-200" />
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Attachments</h2>
                <div className="mb-4">
                    {ticket.attachments && ticket.attachments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {ticket.attachments.map((attachment, index) => (
                                <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank" // Opens in a new tab
                                    rel="noopener noreferrer"
                                    download={attachment.fileName} // Prompts download with original file name
                                    className="flex items-center p-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50 transition-colors text-sm truncate"
                                >
                                    <Download size={16} className="mr-2 shrink-0 hover:text-blue-800" /> {/* Download icon with hover effect */}
                                    <span className="truncate">{attachment.fileName}</span>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No attachments yet.</p>
                    )}
                </div>

                {/* Add Attachments Section (visible if can add attachments) */}
                {canAddAttachments && (
                    <div className="border border-gray-300 p-3 rounded-md mt-4 bg-gray-50">
                        <div className="flex items-center space-x-2 mb-3">
                            <label
                                htmlFor="attachment-upload"
                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md cursor-pointer hover:bg-blue-200 transition-colors"
                            >
                                <UploadCloud className="mr-1" size={14} />
                                Choose Files
                            </label>
                            <input
                                id="attachment-upload"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={uploadButtonState === 'uploading'}
                                // Clear input value so selecting the same file again triggers change
                                value=""
                            />
                            {attachmentFiles.length === 0 && (
                                <span className="text-sm text-gray-600 flex-grow">No files chosen</span>
                            )}
                            <button
                                onClick={handleAddAttachmentsToTicket}
                                disabled={attachmentFiles.length === 0 || uploadButtonState === 'uploading'}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ease-in-out flex items-center justify-center h-7 ${
                                    uploadButtonState === 'uploading'
                                        ? 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                        : uploadButtonState === 'success'
                                            ? 'bg-green-500 text-white'
                                            : uploadButtonState === 'error'
                                                ? 'bg-red-500 text-white'
                                                : attachmentFiles.length > 0
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                }`}
                            >
                                {uploadButtonState === 'uploading' && <Loader2 className="animate-spin mr-1" size={14} />}
                                {uploadButtonState === 'success' && <CheckCircle className="mr-1" size={14} />}
                                {uploadButtonState === 'error' && <XCircle className="mr-1" size={14} />}
                                {uploadButtonState === 'uploading' && 'Uploading...'}
                                {uploadButtonState === 'success' && 'Success!'}
                                {uploadButtonState === 'error' && 'Failed!'}
                                {uploadButtonState === 'upload' && 'Upload'}
                            </button>
                        </div>

                        {/* List of selected files to be uploaded */}
                        {attachmentFiles.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {attachmentFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-md border border-gray-200 text-sm">
                                        <span className="truncate mr-2">{file.name}</span>
                                        <button
                                            onClick={() => handleRemoveFile(file)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                                            title={`Remove ${file.name}`}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- Comments Section --- */}
                <hr className="my-6 border-gray-200" />
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Comments</h2>
                <div className="space-y-4 mb-6">
                     {ticket.comments && ticket.comments.length > 0 ? (
                    // Sort comments by timestamp before mapping
                    // Ensure comment.timestamp is a valid Date object or ISO string for sorting
                    [...ticket.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((comment, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                                <strong className="text-gray-800 mr-2">{comment.commenter || 'Anonymous'}</strong>
                                <span className="text-xs text-gray-500">
                                    {new Date(comment.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.text}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-sm">No comments yet.</p>
                )}
                </div>

                {/* Add Comment Form (visible if can add comments) */}
                {canAddComments && (
                    <form onSubmit={handleAddComment} className="mt-4 p-4 border border-gray-300 rounded-md bg-white shadow-sm">
                        <h3 className="text-md font-semibold text-gray-800 mb-3">Add a Comment</h3>
                        <textarea
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows="4"
                            placeholder="Type your comment here..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            disabled={commentLoading}
                        ></textarea>
                        <div className="flex justify-end mt-3">
                            <button
                                type="submit"
                                disabled={commentLoading || !commentText.trim()} // Disable if loading or text is empty
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 flex items-center justify-center
                                ${commentLoading
                                        ? 'bg-blue-200 text-blue-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {commentLoading && <Loader2 className="animate-spin mr-2" size={16} />}
                                Add Comment
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TicketDetailComponent;
