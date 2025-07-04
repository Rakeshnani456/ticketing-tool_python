// src/components/tickets/TicketDetailComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Loader2,
    CheckCircle,
    XCircle,
    UploadCloud,
    Download,
    ChevronLeft,
    Edit3,
    Save,
    X,
    MessageSquare,
    Paperclip,
    Calendar,
    User,
    CheckCircle2,
    File,
    Clock,
    TrendingUp,
    Hourglass,
    Tag,
    ArrowRight, // Import ArrowRight icon
} from 'lucide-react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { getFileNameFromUrl } from '../../utils/utils';
import { API_BASE_URL } from '../../config/constants';
import { app, dbClient } from '../../config/firebase';

import PdfIcon from '../../assets/icons/PdfIcon.svg';
import DocIcon from '../../assets/icons/DocIcon.svg';
import JpgIcon from '../../assets/icons/JpgIcon.svg';
import PngIcon from '../../assets/icons/PngIcon.svg';
import TxtIcon from '../../assets/icons/TxtIcon.svg';
import GenericFileIcon from '../../assets/icons/FileIcon.svg';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`border rounded-md px-2 py-0.5 min-h-[32px] flex items-center
        ${isDisplayOnly ? 'bg-gray-50 text-gray-700 cursor-text border-gray-300 overflow-hidden text-wrap' : 'bg-white border-gray-300'}
        ${hasError ? 'border-red-500 ring-red-500 ring-2' : ''}
        ${className}`}>
        {children}
    </div>
);

const EditableTextarea = ({ id, value, onChange, rows = 3, className = "", disabled, hasError = false, inputRef }) => (
    <textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        ref={inputRef}
        className={`border-2 rounded-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent resize-none flex-shrink-0 w-full
            ${disabled ? 'bg-gray-50 border-gray-300 cursor-not-allowed text-gray-700' : 'bg-white border-gray-300'}
            ${hasError ? 'border-red-500 ring-red-500' : ''}
            ${className}`}
        disabled={disabled}
    />
);

const FileIcon = ({ fileName, className = "w-14 h-14" }) => {
    const fileExtension = fileName.split('.').pop().toLowerCase();

    switch (fileExtension) {
        case 'pdf':
            return <img src={PdfIcon} alt="PDF Icon" className={className} />;
        case 'doc':
        case 'docx':
            return <img src={DocIcon} alt="Word Icon" className={className} />;
        case 'jpg':
        case 'jpeg':
            return <img src={JpgIcon} alt="JPG Icon" className={className} />;
        case 'png':
            return <img src={PngIcon} alt="PNG Icon" className={className} />;
        case 'txt':
            return <img src={TxtIcon} alt="Text Icon" className={className} />;
        default:
            return <img src={GenericFileIcon} alt="Generic File Icon" className={className} />;
    }
};

const TicketDetailComponent = ({ navigateTo, user, showFlashMessage }) => {
    const { ticketId } = useParams();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [saveButtonState, setSaveButtonState] = useState('save');
    const [attachmentFiles, setAttachmentFiles] = useState([]);
    const [uploadButtonState, setUploadButtonState] = useState('upload');
    const [activeTab, setActiveTab] = useState('comments');
    const [closureNotes, setClosureNotes] = useState('');
    const [closureNotesErrorMessage, setClosureNotesErrorMessage] = useState('');
    const [closeButtonState, setCloseButtonState] = useState('default');
    const [timeSpent, setTimeSpent] = useState('');
    const [timeSpentErrorMessage, setTimeSpentErrorMessage] = useState('');
    const [assignedToErrorMessage, setAssignedToErrorMessage] = useState('');
    const [timelineEvents, setTimelineEvents] = useState([]);

    const commentsSectionRef = useRef(null);
    const closureNotesRef = useRef(null);
    const timeSpentRef = useRef(null);
    const assignedToRef = useRef(null);

    const [editableFields, setEditableFields] = useState({
        request_for_email: '',
        short_description: '',
        long_description: '',
        contact_number: '',
        priority: '',
        status: '',
        assigned_to_email: '',
        closed_by_email: ''
    });

    const [assignedToHasError, setAssignedToHasError] = useState(false);
    const [timeSpentHasError, setTimeSpentHasError] = useState(false);
    const [closureNotesHasError, setClosureNotesHasError] = useState(false);

    const isSupportUser = user?.role === 'support' || user?.role === 'admin';

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
        { value: 'Cancelled', label: 'Cancelled' },
    ];

    const db = dbClient;

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
        
        // Handle status_history timestamps
        if (newData.status_history && Array.isArray(newData.status_history)) {
            newData.status_history = newData.status_history.map(history => {
                if (history.timestamp && history.timestamp.toDate) {
                    return { ...history, timestamp: history.timestamp.toDate().toISOString() };
                }
                return history;
            });
        }
        
        // Handle assigned_to_history timestamps
        if (newData.assigned_to_history && Array.isArray(newData.assigned_to_history)) {
            newData.assigned_to_history = newData.assigned_to_history.map(history => {
                if (history.timestamp && history.timestamp.toDate) {
                    return { ...history, timestamp: history.timestamp.toDate().toISOString() };
                }
                return history;
            });
        }
        
        return newData;
    };

    // Helper to generate timeline events - MODIFIED TO CAPTURE ALL UPDATES
    const generateTimelineEvents = useCallback((ticketData) => {
        const events = [];

        // Event: Ticket Created
        if (ticketData.created_at) {
            events.push({
                type: 'created',
                timestamp: ticketData.created_at,
                label: `Created`,
                icon: Calendar,
                detail: ticketData.reporter_email
            });
        }

        // Event: Initial Priority (if not 'Low' at creation)
         if (ticketData.priority && ticketData.priority !== 'Low' && ticketData.created_at) {
             events.push({
                type: 'priority_init',
                timestamp: ticketData.created_at,
                label: `Priority: ${ticketData.priority}`, // More descriptive label
                icon: Tag,
                detail: ''
            });
        }

        // Event: Status Changes (from history) - Ensures ALL status changes are captured
        if (ticketData.status_history && Array.isArray(ticketData.status_history)) {
            console.log('Status history:', ticketData.status_history); // Debug log
            ticketData.status_history.forEach(history => {
                if (history.timestamp && history.new_status) {
                    console.log('Processing status history entry:', history); // Debug log
                    events.push({
                        type: 'status_change',
                        timestamp: history.timestamp,
                        label: `Status: ${history.new_status}`,
                        icon: Tag,
                        detail: history.user_email ? history.user_email.split('@')[0] : 'System'
                    });
                }
            });
        } else {
            // For existing tickets without history, show current status as initial
            if (ticketData.status && ticketData.status !== 'Open' && ticketData.created_at) {
                events.push({
                    type: 'status_init',
                    timestamp: ticketData.created_at,
                    label: `Status: ${ticketData.status}`,
                    icon: Tag,
                    detail: ''
                });
            }
        }
        
        // Event: Assigned To Changes (from history) - Ensures ALL assigned_to changes are captured
        if (ticketData.assigned_to_history && Array.isArray(ticketData.assigned_to_history)) {
            console.log('Assignment history:', ticketData.assigned_to_history); // Debug log
            ticketData.assigned_to_history.forEach(history => {
                if (history.timestamp && history.new_assigned_to) {
                    console.log('Processing assignment history entry:', history); // Debug log
                    events.push({
                        type: 'assigned_change',
                        timestamp: history.timestamp,
                        label: `Assigned`,
                        icon: User,
                        detail: history.new_assigned_to.split('@')[0]
                    });
                }
            });
        } else {
            // For existing tickets without history, show current assignment as initial
            if (ticketData.assigned_to_email && ticketData.created_at) {
                events.push({
                    type: 'assigned_init',
                    timestamp: ticketData.created_at,
                    label: `Assigned`,
                    icon: User,
                    detail: ticketData.assigned_to_email.split('@')[0]
                });
            }
        }

        // Event: Comments
        if (ticketData.comments && Array.isArray(ticketData.comments)) {
            ticketData.comments.forEach(comment => {
                if (comment.timestamp) {
                    events.push({
                        type: 'comment',
                        timestamp: comment.timestamp,
                        label: `Comment`,
                        icon: MessageSquare,
                        detail: comment.commenter ? comment.commenter.split('@')[0] : 'Anonymous'
                    });
                }
            });
        }

        // Event: Attachments (simplified, assumes one general event for attachments)
        if (ticketData.attachments && Array.isArray(ticketData.attachments) && ticketData.attachments.length > 0) {
             events.push({
                 type: 'attachment_added',
                 timestamp: ticketData.updated_at || ticketData.created_at,
                 label: `Attachment`,
                 icon: Paperclip,
                 detail: ''
             });
        }

        // Event: Ticket Resolved/Cancelled
        if (ticketData.resolved_at) {
            events.push({
                type: 'resolved',
                timestamp: ticketData.resolved_at,
                label: `${ticketData.status === 'Resolved' ? 'Resolved' : 'Cancelled'}`,
                icon: CheckCircle,
                detail: ticketData.closed_by_email ? ticketData.closed_by_email.split('@')[0] : 'System'
            });
        }

        // Sort events chronologically, filtering out events with invalid timestamps
        const validEvents = events.filter(event => {
            const date = new Date(event.timestamp);
            return !isNaN(date.getTime()); // Check if the date is valid
        });
        
        validEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log('Final timeline events:', validEvents); // Debug log

        // IMPORTANT: Removed the filtering for consecutive duplicates.
        // This ensures all distinct events are shown as long as they exist in the history data.
        return validEvents;
    }, []);

    useEffect(() => {
        if (!ticketId || !user?.firebaseUser || !db) {
            setLoading(false);
            showFlashMessage('Authentication or ticket ID missing to view details.', 'info');
            return () => { };
        }

        setError(null);

        const ticketDocRef = doc(db, 'tickets', ticketId);

        const unsubscribe = onSnapshot(ticketDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const fetchedTicket = { id: docSnapshot.id, ...formatTicketData(docSnapshot.data()) };

                if (fetchedTicket.reporter_id !== user.firebaseUser.uid && !isSupportUser) {
                    setError('Forbidden: You do not have permission to view this ticket.');
                    showFlashMessage('Forbidden: You do not have permission to view this ticket.', 'error');
                    setTicket(null);
                    setLoading(false);
                    return;
                }

                setTicket(fetchedTicket);
                setTimelineEvents(generateTimelineEvents(fetchedTicket));
                if (['Resolved', 'Cancelled'].includes(fetchedTicket.status)) {
                    setIsEditing(false);
                }

                if (!isEditing || !ticket) {
                    setEditableFields({
                        request_for_email: fetchedTicket.request_for_email || '',
                        short_description: fetchedTicket.short_description || '',
                        long_description: fetchedTicket.long_description || '',
                        contact_number: fetchedTicket.contact_number || '',
                        priority: fetchedTicket.priority || '',
                        status: fetchedTicket.status || '',
                        assigned_to_email: fetchedTicket.assigned_to_email || '',
                        closed_by_email: fetchedTicket.closed_by_email || ''
                    });
                    setClosureNotes(fetchedTicket.closure_notes || '');
                    setTimeSpent(fetchedTicket.time_spent || '');
                } else if (isEditing) {
                    if (['Resolved', 'Cancelled'].includes(fetchedTicket.status)) {
                        setEditableFields(prev => ({
                            ...prev,
                            status: fetchedTicket.status,
                            priority: fetchedTicket.priority,
                            assigned_to_email: fetchedTicket.assigned_to_email,
                            closed_by_email: fetchedTicket.closed_by_email
                        }));
                        setClosureNotes(fetchedTicket.closure_notes || '');
                        setTimeSpent(fetchedTicket.time_spent || '');
                    }
                }

                setLoading(false);
                setError(null);
                setAssignedToErrorMessage('');
                setClosureNotesErrorMessage('');
                setTimeSpentErrorMessage('');
                setAssignedToHasError(false);
                setTimeSpentHasError(false);
                setClosureNotesHasError(false);

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

        return () => unsubscribe();
    }, [ticketId, db, generateTimelineEvents]);

    useEffect(() => {
        if (isEditing && ticket) {
            setEditableFields({
                request_for_email: ticket.request_for_email || '',
                short_description: ticket.short_description || '',
                long_description: ticket.long_description || '',
                contact_number: ticket.contact_number || '',
                priority: ticket.priority || '',
                status: ticket.status || '',
                assigned_to_email: ticket.assigned_to_email || '',
                closed_by_email: ticket.closed_by_email || ''
            });
            setClosureNotes(ticket.closure_notes || '');
            setTimeSpent(ticket.time_spent || '');
        }
    }, [isEditing, ticket]);

    const isTicketClosedOrResolved = ticket && ['Resolved', 'Cancelled'].includes(ticket.status);
    const canEdit = !isTicketClosedOrResolved && (isSupportUser || (ticket && ticket.reporter_id === user?.firebaseUser.uid));
    const canAddComments = !isTicketClosedOrResolved;
    const canAddAttachments = !isTicketClosedOrResolved;

    const hasChanges = useCallback(() => {
        if (!ticket) return false;
        const fieldsChanged = Object.keys(editableFields).some(key => editableFields[key] !== (ticket[key] || ''));
        const closureNotesChanged = closureNotes !== (ticket.closure_notes || '');
        const timeSpentChanged = timeSpent !== (ticket.time_spent || '');

        return fieldsChanged || closureNotesChanged || timeSpentChanged;
    }, [editableFields, ticket, closureNotes, timeSpent]);

    const handleEditChange = useCallback((e) => {
        const { id, value } = e.target;
        setEditableFields(prev => ({ ...prev, [id]: value }));
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
        if (id === 'assigned_to_email') {
            setAssignedToHasError(false);
            setAssignedToErrorMessage('');
        }
    }, [saveButtonState]);

    const handleButtonSelection = useCallback((field, value) => {
        setEditableFields(prev => {
            let updated = { ...prev, [field]: value };
            if (field === 'status' && value === 'Resolved') {
                updated.closed_by_email = user?.email || '';
                updated.resolved_at = new Date().toISOString();
            }
            return updated;
        });
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
        if (field === 'status') {
            setAssignedToHasError(false);
            setAssignedToErrorMessage('');
            setClosureNotesHasError(false);
            setClosureNotesErrorMessage('');
            setTimeSpentHasError(false);
            setTimeSpentErrorMessage('');
        }
    }, [saveButtonState, user]);

    const handleClosureNotesChange = useCallback((e) => {
        setClosureNotes(e.target.value);
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
        setClosureNotesHasError(false);
        setClosureNotesErrorMessage('');
    }, [saveButtonState]);

    const handleTimeSpentChange = useCallback((e) => {
        let val = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
        setTimeSpent(val);
        if (saveButtonState !== 'save') {
            setSaveButtonState('save');
        }
        setTimeSpentHasError(false);
        setTimeSpentErrorMessage('');
    }, [saveButtonState]);

    const handleUpdateTicket = async (actionType = 'save') => {
        if (actionType === 'close') {
            setCloseButtonState('closing');
        } else {
            setUpdateLoading(true);
            setSaveButtonState('saving');
        }

        setAssignedToHasError(false);
        setAssignedToErrorMessage('');
        setTimeSpentHasError(false);
        setTimeSpentErrorMessage('');
        setClosureNotesHasError(false);
        setClosureNotesErrorMessage('');

        try {
            const idToken = await user.firebaseUser.getIdToken();
            const payload = { ...editableFields };

            if (actionType === 'close') {
                payload.status = 'Resolved';
            }

            const newStatusIsTerminalForClosure = ['Resolved'].includes(payload.status);
            const oldStatusWasTerminal = ['Resolved', 'Cancelled'].includes(ticket.status);

            let validationFailed = false;

            if (isSupportUser && newStatusIsTerminalForClosure && !oldStatusWasTerminal) {
                if (!payload.assigned_to_email) {
                    setAssignedToHasError(true);
                    setAssignedToErrorMessage('Assigned to field cannot be empty when resolving.');
                    validationFailed = true;
                    setTimeout(() => assignedToRef.current?.focus(), 0);
                }

                if (!timeSpent.trim() || !/^\d{1,3}$/.test(timeSpent.trim())) {
                    setTimeSpentHasError(true);
                    setTimeSpentErrorMessage('Please enter time spent (in hours, max 3 digits).');
                    validationFailed = true;
                    setTimeout(() => timeSpentRef.current?.focus(), 0);
                }

                if (!closureNotes.trim()) {
                    setClosureNotesHasError(true);
                    setClosureNotesErrorMessage('Closure notes are required to resolve this ticket.');
                    validationFailed = true;
                    setActiveTab('closure');
                    setTimeout(() => closureNotesRef.current?.focus(), 0);
                }
            }

            if (validationFailed) {
                if (actionType === 'close') setCloseButtonState('error');
                else setSaveButtonState('error');
                setUpdateLoading(false);
                showFlashMessage('Please correct the highlighted fields.', 'error');
                setTimeout(() => {
                    if (actionType === 'close') setCloseButtonState('default');
                    else setSaveButtonState('save');
                }, 2000);
                return;
            }

            payload.closure_notes = closureNotes.trim() || null;
            payload.time_spent = timeSpent.trim() || null;

            if (payload.status === 'Resolved' && !oldStatusWasTerminal) {
                payload.closed_by_email = user.email;
                payload.resolved_at = new Date().toISOString();
                setEditableFields(prev => ({
                    ...prev,
                    closed_by_email: user.email,
                    resolved_at: payload.resolved_at,
                }));
            } else if (payload.status === 'Cancelled' && !oldStatusWasTerminal) {
                payload.closed_by_email = user.email;
                payload.resolved_at = new Date().toISOString();
                payload.closure_notes = closureNotes.trim() || null;
                setEditableFields(prev => ({
                    ...prev,
                    closed_by_email: user.email,
                    resolved_at: payload.resolved_at,
                }));
            }
            else if (!newStatusIsTerminalForClosure && oldStatusWasTerminal) {
                if (payload.status !== 'Cancelled') {
                    payload.closed_by_email = null;
                    payload.resolved_at = null;
                    payload.closure_notes = null;
                    payload.time_spent = null;
                    setEditableFields(prev => ({
                        ...prev,
                        closed_by_email: '',
                        resolved_at: null,
                    }));
                    setClosureNotes('');
                    setTimeSpent('');
                }
            }

            if (payload.status === 'Resolved' && !ticket.resolved_at && !payload.resolved_at) {
                payload.resolved_at = new Date().toISOString();
                setEditableFields(prev => ({ ...prev, resolved_at: payload.resolved_at }));
            }

            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
                if (actionType === 'close') {
                    setCloseButtonState('success');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    setSaveButtonState('success');
                }
                setError(null);

                setTimeout(() => {
                    setIsEditing(false);
                    if (actionType === 'close') {
                        setCloseButtonState('default');
                    } else {
                        setSaveButtonState('save');
                    }
                    setAssignedToErrorMessage('');
                    setClosureNotesErrorMessage('');
                    setTimeSpentErrorMessage('');
                    setAssignedToHasError(false);
                    setTimeSpentHasError(false);
                    setClosureNotesHasError(false);
                }, 1500);
            } else {
                if (actionType === 'close') {
                    setCloseButtonState('error');
                    showFlashMessage(data.error || 'Failed to close ticket.', 'error');
                } else {
                    setSaveButtonState('error');
                    showFlashMessage(data.error || 'Failed to update ticket.', 'error');
                }
                setTimeout(() => {
                    if (actionType === 'close') setCloseButtonState('default');
                    else setSaveButtonState('save');
                }, 2000);
            }
        } catch (error) {
            console.error('Update ticket error:', error);
            if (actionType === 'close') {
                setCloseButtonState('error');
                showFlashMessage('Network error or server unreachable during ticket closure.', 'error');
            } else {
                setSaveButtonState('error');
                showFlashMessage('Network error or server unreachable during update.', 'error');
            }
            setTimeout(() => {
                if (actionType === 'close') setCloseButtonState('default');
                else setSaveButtonState('save');
            }, 2000);
        } finally {
            if (actionType !== 'close') {
                setUpdateLoading(false);
            }
        }
    };

    const handleCancelEdit = useCallback(() => {
        setEditableFields({
            request_for_email: ticket.request_for_email || '',
            short_description: ticket.short_description || '',
            long_description: ticket.long_description || '',
            contact_number: ticket.contact_number || '',
            priority: ticket.priority || '',
            status: ticket.status || '',
            assigned_to_email: ticket.assigned_to_email || '',
            closed_by_email: ticket.closed_by_email || ''
        });
        setClosureNotes(ticket.closure_notes || '');
        setTimeSpent(ticket.time_spent || '');
        setIsEditing(false);
        setSaveButtonState('save');
        setAssignedToErrorMessage('');
        setClosureNotesErrorMessage('');
        setTimeSpentErrorMessage('');
        setAssignedToHasError(false);
        setTimeSpentHasError(false);
        setClosureNotesHasError(false);
    }, [ticket]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showFlashMessage('Comment text cannot be empty.', 'error');
            return;
        }
        setCommentLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ comment_text: commentText, commenter_name: user?.email }),
            });
            const data = await response.json();
            if (response.ok) {
                setCommentText('');
            } else {
                showFlashMessage(data.error || 'Failed to add comment.', 'error');
            }
        } catch (error) {
            console.error('Add comment error:', error);
            showFlashMessage('Network error or server unreachable during comment addition.', 'error');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PDF, JPG, PNG, Word, TXT.`, 'error');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showFlashMessage(`File "${file.name}" exceeds the 10MB limit.`, 'error');
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            setAttachmentFiles(prevFiles => [...prevFiles, ...validFiles]);
            await handleAddAttachmentsToTicket(validFiles);
        } else {
            setUploadButtonState('upload');
        }
    };

    const handleRemoveFile = (fileToRemove) => {
        setAttachmentFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    };

    const handleAddAttachmentsToTicket = async (filesToUpload) => {
        if (filesToUpload.length === 0) {
            setUploadButtonState('upload');
            return;
        }

        setUploadButtonState('uploading');

        const uploadedAttachmentData = [];
        let anyUploadFailed = false;

        const uploadPromises = filesToUpload.map(async (file) => {
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
                        return { url: data.files[0].url, fileName: data.files[0].originalFilename };
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
            return null;
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(attachmentObject => {
            if (attachmentObject) {
                uploadedAttachmentData.push(attachmentObject);
            }
        });

        if (uploadedAttachmentData.length > 0) {
            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/ticket/${ticketId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ attachments: uploadedAttachmentData }),
                });
                if (response.ok) {
                    setAttachmentFiles([]);
                    showFlashMessage('Attachments added successfully!', 'success');
                    console.log('Attachments updated successfully:', uploadedAttachmentData);

                    if (!anyUploadFailed) {
                        setUploadButtonState('success');
                    } else {
                        setUploadButtonState('error');
                    }

                    setTimeout(() => {
                        setUploadButtonState('upload');
                    }, 1500);
                } else {
                    const errorData = await response.json();
                    setUploadButtonState('error');
                    showFlashMessage(`Failed to update ticket with attachments: ${errorData.error || 'Server error'}`, 'error');
                    setTimeout(() => {
                        setUploadButtonState('upload');
                    }, 2000);
            }
        } catch (error) {
                console.error('Update ticket with attachments error:', error);
                setUploadButtonState('error');
                showFlashMessage('Network error during updating ticket with attachments.', 'error');
                setTimeout(() => {
                    setUploadButtonState('upload');
                }, 2000);
            }
        } else {
            setUploadButtonState('error');
            if (!anyUploadFailed) {
                showFlashMessage('No attachments were successfully uploaded to add to the ticket.', 'error');
            }
            setTimeout(() => {
                setUploadButtonState('upload');
            }, 2000);
        }
    };

    const getStatusClasses = (status) => {
        switch (status) {
            case 'Open': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Hold': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
            case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityClasses = (priority) => {
        switch (priority) {
            case 'Low': return 'bg-green-100 text-green-800 border-green-200';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Function to get color for icons based on event type
    const getIconColorClass = (eventType) => {
        switch (eventType) {
            case 'created': return 'text-blue-600';
            case 'priority_init': return 'text-purple-600';
            case 'status_change': return 'text-yellow-600';
            case 'status_init': return 'text-yellow-600';
            case 'assigned_change': return 'text-indigo-600';
            case 'assigned_init': return 'text-indigo-600';
            case 'comment': return 'text-green-600';
            case 'attachment_added': return 'text-teal-600';
            case 'resolved': return 'text-green-800'; // Darker green for resolved state
            default: return 'text-gray-600';
        }
    };


    if (error) return <div className="text-center text-red-600 mt-8 text-base flex items-center justify-center space-x-2"><XCircle size={20} /> <span>Error: {error}</span></div>;
    if (!ticket || loading) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <Loader2 className="animate-spin text-gray-700" size={48} />
            <span className="text-gray-700 ml-3">Loading ticket details...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200" style={{ height: '70px' }}>
                <div className="flex items-center h-full px-2">
                    {/* Fixed left section with back button and ticket info */}
                    <div className="flex items-center space-x-2 flex-shrink-0 mr-4">
                        <button
                            onClick={() => navigateTo(isSupportUser ? 'allTickets' : 'myTickets')}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap">{ticket.display_id}</h1>
                            <p className="text-xs text-gray-500 whitespace-nowrap">Request Item</p>
                        </div>
                    </div>

                    {/* Scrollable timeline section */}
                    {timelineEvents.length > 0 && (
                        <div className="flex-1 min-w-0 h-full flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {/* The inner div now contains the actual scrollable content */}
                            <div className="flex items-center h-full py-2 whitespace-nowrap min-w-max"> {/* Added whitespace-nowrap and min-w-max */}
                                {timelineEvents.map((event, index) => (
                                    <React.Fragment key={index}>
                                        {/* Colored Arrow between events */}
                                        {index > 0 && ( 
                                            <div className="flex items-center mx-1 flex-shrink-0">
                                                <ArrowRight size={14} className="text-gray-400" /> {/* Default arrow color */}
                                            </div>
                                        )}
                                        {/* Individual Event Box */}
                                        <div className="flex flex-col items-start leading-tight min-w-[70px] flex-shrink-0 px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-700">
                                            <div className="flex items-center text-xs font-semibold whitespace-nowrap mb-0.5">
                                                {event.icon && <event.icon size={12} className={`mr-1 ${getIconColorClass(event.type)}`} />}
                                                <span>{event.label}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 whitespace-nowrap">
                                                {new Date(event.timestamp).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] text-gray-500 whitespace-nowrap">
                                                {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </p>
                                            {event.detail && (
                                                <p className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                                                    {event.detail.split('@')[0]}
                                                </p>
                                            )}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area - Split into two columns for details and progress */}
            <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Ticket Details and Descriptions */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Ticket Information Grid */}
                    <div className="space-y-4 mb-8">
                        {/* Row 1: Ticket ID and Contact Number */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Ticket ID:
                                </label>
                                <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.display_id}
                                    </span>
                                </FieldBox>
                            </div>
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Contact No:
                                </label>
                                {isEditing && canEdit ? (
                                    <input
                                        id="contact_number"
                                        type="text"
                                        value={editableFields.contact_number}
                                        onChange={handleEditChange}
                                        className="border-2 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full flex-1 text-sm"
                                        disabled={!canEdit}
                                        style={{ minWidth: 0 }}
                                    />
                                ) : (
                                    <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                        <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                            {ticket.contact_number || 'N/A'}
                                        </span>
                                    </FieldBox>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Requested by and Requested for */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Requested by:
                                </label>
                                <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.reporter_email || 'N/A'}
                                    </span>
                                </FieldBox>
                            </div>
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Requested for:
                                </label>
                                {isEditing && canEdit ? (
                                    <input
                                        id="request_for_email"
                                        type="email"
                                        value={editableFields.request_for_email}
                                        onChange={handleEditChange}
                                        className="border-2 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full flex-1 text-sm"
                                        disabled={!canEdit}
                                        style={{ minWidth: 0 }}
                                    />
                                ) : (
                                    <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                        <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                        <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                            {ticket.request_for_email || 'N/A'}
                                        </span>
                                    </FieldBox>
                                )}
                            </div>
                        </div>

                        {/* Row 3: Category and Asset ID */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Category:
                                </label>
                                <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.category || 'N/A'}
                                    </span>
                                </FieldBox>
                            </div>
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Asset ID:
                                </label>
                                <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.hostname_asset_id || 'N/A'}
                                    </span>
                                </FieldBox>
                            </div>
                        </div>

                        {/* Row 4: Created Date and Due Date (if exists) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center">
                                <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                    Created:
                                </label>
                                <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                    <Calendar className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}
                                    </span>
                                </FieldBox>
                            </div>
                            {ticket.due_date && (
                                <div className="flex items-center">
                                    <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">
                                        Due date:
                                    </label>
                                    <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                                        <Calendar className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                        <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                            {new Date(ticket.due_date).toLocaleDateString()}
                                        </span>
                                    </FieldBox>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Short Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Short description:
                        </label>
                        {isEditing && canEdit ? (
                            <EditableTextarea
                                id="short_description"
                                value={editableFields.short_description}
                                onChange={handleEditChange}
                                rows={2}
                                disabled={!canEdit}
                                className="max-w-none w-full text-sm"
                            />
                        ) : (
                            <FieldBox className="min-h-[60px] max-h-[120px] overflow-y-auto items-start py-3 w-full bg-gray-50 max-w-none" isDisplayOnly={true}>
                                <span className="text-sm text-gray-700 whitespace-pre-wrap text-wrap">
                                    {ticket.short_description}
                                </span>
                            </FieldBox>
                        )}
                    </div>

                    {/* Long Description */}
                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Long description:
                        </label>
                        {isEditing && canEdit ? (
                            <EditableTextarea
                                id="long_description"
                                value={editableFields.long_description}
                                onChange={handleEditChange}
                                rows={6}
                                disabled={!canEdit}
                                className="max-w-none w-full text-sm"
                            />
                        ) : (
                            <FieldBox className="min-h-[120px] max-h-[240px] overflow-y-auto items-start py-3 w-full bg-gray-50 max-w-none" isDisplayOnly={true}>
                                <span className="text-sm text-gray-700 whitespace-pre-wrap text-wrap">
                                    {ticket.long_description || 'No long description provided.'}
                                </span>
                            </FieldBox>
                        )}
                    </div>
                </div>

                {/* Right Column: Ticket Progress */}
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-fit">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-medium text-gray-900 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Ticket Progress
                        </h3>
                        
                        {/* Edit button moved to top right of progress box */}
                        {canEdit && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-2 py-1 bg-gray-700 text-yellow-300 rounded text-xs hover:bg-gray-800 transition-colors"
                            >
                                Edit
                            </button>
                        )}
                        {isEditing && canEdit && (
                            <div className="flex items-center space-x-1">
                                {/* Cancel button */}
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={updateLoading}
                                    className={`px-2 py-1 rounded text-xs transition-colors
                                        ${updateLoading
                                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                            : 'bg-gray-500 text-white hover:bg-gray-600'
                                        }`}
                                >
                                    Cancel
                                </button>
                                {/* Save button */}
                                <button
                                    onClick={() => handleUpdateTicket('save')}
                                    disabled={updateLoading || !hasChanges()}
                                    className={`px-2 py-1 rounded text-xs transition-colors
                                        ${saveButtonState === 'saving'
                                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                            : saveButtonState === 'success'
                                                ? 'bg-green-600 text-white'
                                                : saveButtonState === 'error'
                                                    ? 'bg-red-600 text-white'
                                                    : hasChanges()
                                                        ? 'bg-gray-700 text-yellow-300 hover:bg-gray-800'
                                                        : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                        }`}
                                >
                                    {saveButtonState === 'saving' && 'Saving...'}
                                    {saveButtonState === 'success' && 'Saved!'}
                                    {saveButtonState === 'error' && 'Error!'}
                                    {saveButtonState === 'save' && 'Save'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Status:
                            </label>
                            {isEditing && isSupportUser && !isTicketClosedOrResolved ? (
                                <div className="flex flex-wrap gap-2">
                                    {statuses.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => handleButtonSelection('status', s.value)}
                                            className={`px-2.5 py-0.5 rounded-md text-xs font-medium border transition-colors
                                                ${getStatusClasses(s.value)}
                                                ${editableFields.status === s.value
                                                    ? 'ring-2 ring-offset-1 ring-gray-700'
                                                    : 'hover:opacity-80'
                                                }
                                                ${updateLoading ? 'opacity-70 cursor-not-allowed' : ''}
                                            `}
                                            disabled={updateLoading}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <FieldBox isDisplayOnly={true} className="w-full">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-normal border ${getStatusClasses(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </FieldBox>
                            )}
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Priority:
                            </label>
                            {isEditing && canEdit ? (
                                <div className="flex flex-wrap gap-2">
                                    {priorities.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => handleButtonSelection('priority', p.value)}
                                            className={`px-2.5 py-0.5 rounded-md text-xs font-medium border transition-colors
                                                ${getPriorityClasses(p.value)}
                                                ${editableFields.priority === p.value
                                                    ? 'ring-2 ring-offset-1 ring-gray-700'
                                                    : 'hover:opacity-80'
                                                }
                                                ${updateLoading ? 'opacity-70 cursor-not-allowed' : ''}
                                            `}
                                            disabled={updateLoading}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <FieldBox isDisplayOnly={true} className="w-full">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-normal border ${getPriorityClasses(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </FieldBox>
                            )}
                        </div>

                        {/* Assigned to */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Assigned to:
                            </label>
                            {isEditing && isSupportUser && !isTicketClosedOrResolved ? (
                                <>
                                    <FieldBox hasError={assignedToHasError} className={`w-full`}>
                                        <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                        <input
                                            id="assigned_to_email"
                                            ref={assignedToRef}
                                            type="email"
                                            value={editableFields.assigned_to_email || ''}
                                            onChange={handleEditChange}
                                            className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-full text-sm`}
                                            disabled={!isSupportUser || isTicketClosedOrResolved}
                                            style={{ minWidth: 0 }}
                                        />
                                    </FieldBox>
                                    {assignedToErrorMessage && (
                                        <p className="text-xs text-red-600 mt-1">{assignedToErrorMessage}</p>
                                    )}
                                </>
                            ) : (
                                <FieldBox isDisplayOnly={true} className="w-full">
                                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {ticket.assigned_to_email || 'Unassigned'}
                                    </span>
                                </FieldBox>
                            )}
                        </div>

                        {/* Closed By (Always rendered for support, but only if resolved/cancelled) */}
                        {isSupportUser && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Closed by:
                                </label>
                                <FieldBox className="w-full" isDisplayOnly={true}>
                                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                    <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                            (isEditing ? editableFields.status : ticket.status) === 'Cancelled' ?
                                            (isEditing && editableFields.closed_by_email
                                                ? editableFields.closed_by_email
                                                : ticket.closed_by_email || 'N/A')
                                            : 'N/A'}
                                    </span>
                                </FieldBox>
                            </div>
                        )}

                        {/* Resolved Date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Resolved Date:
                            </label>
                            <FieldBox className="w-full" isDisplayOnly={true}>
                                <Calendar className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                    {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                        (isEditing ? editableFields.status : ticket.status) === 'Cancelled' ?
                                        (isEditing && editableFields.resolved_at
                                            ? new Date(editableFields.resolved_at).toLocaleString()
                                            : ticket.resolved_at
                                                ? new Date(ticket.resolved_at).toLocaleString()
                                                : 'N/A')
                                        : 'N/A'}
                                </span>
                            </FieldBox>
                        </div>

                        {/* Time Spent - Only for support/admin and when status is Resolved or closing or already resolved/cancelled */}
                        {isSupportUser && (
                            <div>
                                <label className="text-sm font-semibold text-gray-800 mb-2">
                                    Time Spent:
                                </label>
                                {(isEditing && (editableFields.status === 'Resolved' || editableFields.status === 'Cancelled')) || isTicketClosedOrResolved ? (
                                    <>
                                        <FieldBox hasError={timeSpentHasError} className={`w-full`}>
                                            <Clock className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                            <input
                                                id="time_spent"
                                                ref={timeSpentRef}
                                                type="text"
                                                value={timeSpent}
                                                onChange={handleTimeSpentChange}
                                                className={`flex-1 bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-full text-sm`}
                                                disabled={!isSupportUser || isTicketClosedOrResolved}
                                                placeholder="in hours (e.g., 2.5)"
                                                style={{ minWidth: 0 }}
                                            />
                                        </FieldBox>
                                        {timeSpentErrorMessage && (
                                            <p className="text-xs text-red-600 mt-1">{timeSpentErrorMessage}</p>
                                        )}
                                    </>
                                ) : (
                                    <FieldBox className="w-full" isDisplayOnly={true}>
                                        <Clock className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                        <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">
                                            {ticket.time_spent || 'N/A'}
                                        </span>
                                    </FieldBox>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Sections (Full Width) */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Attachments */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 flex items-center">
                            <Paperclip className="w-5 h-5 mr-2" />
                            Attachments
                        </h3>
                        {canAddAttachments && (
                            <label
                                htmlFor="attachment-upload-btn"
                                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ml-3
                                    ${uploadButtonState === 'uploading'
                                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                        : uploadButtonState === 'success'
                                            ? 'bg-green-600 text-white'
                                            : uploadButtonState === 'error'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-700 text-yellow-300 hover:bg-gray-800'
                                    }`}
                            >
                                {uploadButtonState === 'uploading' && <Loader2 className="animate-spin mr-1" size={12} />}
                                {uploadButtonState === 'success' && <CheckCircle className="mr-1" size={12} />}
                                {uploadButtonState === 'error' && <XCircle className="mr-1" size={12} />}
                                {uploadButtonState === 'uploading' && 'Uploading...'}
                                {uploadButtonState === 'success' && 'Uploaded!'}
                                {uploadButtonState === 'error' && 'Failed!'}
                                {uploadButtonState === 'upload' && (
                                    <>
                                        <UploadCloud className="w-4 h-4" />
                                        <span>Upload</span>
                                    </>
                                )}
                                <input
                                    id="attachment-upload-btn"
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={uploadButtonState === 'uploading' || !canAddAttachments}
                                    value=""
                                />
                            </label>
                        )}
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-x-0 gap-y-1">
                        {console.log('Current ticket attachments:', ticket.attachments)}
                        {ticket.attachments && ticket.attachments.length > 0 ? (
                            ticket.attachments.map((attachment, index) => (
                                <a
                                    key={index}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={attachment.fileName}
                                    className="flex flex-col items-center justify-start transition-colors text-center group w-14 h-24 overflow-hidden relative"
                                    title={attachment.fileName}
                                >
                                    <div className="absolute inset-x-0 top-0 flex items-center justify-center h-14 w-14 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                                        <FileIcon fileName={attachment.fileName} />
                                    </div>

                                    <div className="absolute inset-x-0 top-0 flex items-center justify-center h-14 w-14 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Download className="w-10 h-10 text-blue-600" />
                                    </div>

                                    <span className="text-xs text-gray-700 mt-14 font-medium leading-tight truncate w-full px-0.5">
                                        {attachment.fileName}
                                    </span>
                                </a>
                            ))
                        ) : (
                            <p className="text-gray-500 text-sm col-span-full">No attachments yet.</p>
                        )}
                    </div>

                    {attachmentFiles.length > 0 && (
                        <div className="mt-4 p-4 border border-gray-200 rounded-md bg-white">
                            <p className="text-sm font-semibold mb-3">Files selected for upload:</p>
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-x-0 gap-y-1 mb-4">
                                {attachmentFiles.map((file, index) => (
                                    <div key={index} className="flex flex-col items-center justify-start text-center relative group w-14 h-24 overflow-hidden">
                                        <div className="absolute inset-x-0 top-0 flex items-center justify-center h-14 w-14 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                                            <FileIcon fileName={file.name} />
                                        </div>
                                        <div className="absolute inset-x-0 top-0 flex items-center justify-center h-14 w-14 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Download className="w-10 h-10 text-blue-600" />
                                        </div>

                                        <span className="text-xs text-gray-700 mt-14 font-medium leading-tight truncate w-full px-0.5">
                                            {file.name}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveFile(file)}
                                            className="absolute top-0 right-0 text-gray-400 hover:text-red-600 bg-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title={`Remove ${file.name}`}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Updates Section (Comments & Closure Tabs) */}
                <div ref={commentsSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab('comments')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'comments'
                                        ? 'border-gray-700 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <MessageSquare className="w-4 h-4 inline mr-2" />
                                Comments
                            </button>
                            <button
                                onClick={() => setActiveTab('closure')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'closure'
                                        ? 'border-gray-700 text-gray-900'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                                Closure
                            </button>
                        </nav>
                    </div>

                    {activeTab === 'comments' && (
                        <div>
                            {/* Comments List */}
                            <div className="space-y-4 mb-6">
                                {ticket.comments && ticket.comments.length > 0 ? (
                                    [...ticket.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((comment, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-gray-900">{comment.commenter || 'Anonymous'}</span>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(comment.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap text-wrap">
                                                {comment.text}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-sm">No comments yet.</p>
                                )}
                            </div>

                            {/* Add Comment Form */}
                            {canAddComments && (
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                                        Add a comment:
                                    </label>
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={4}
                                        className="w-full border-2 border-gray-300 rounded-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                                        placeholder="Type your comment here..."
                                        disabled={commentLoading || !canAddComments}
                                    ></textarea>
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={handleAddComment}
                                            disabled={commentLoading || !commentText.trim() || !canAddComments}
                                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 flex items-center justify-center
                                            ${commentLoading || !commentText.trim() || !canAddComments
                                                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                    : 'bg-gray-700 text-yellow-300 hover:bg-gray-800'
                                                }`}
                                        >
                                            {commentLoading && <Loader2 className="animate-spin mr-2" size={16} />}
                                            <MessageSquare className="w-4 h-4 inline mr-2" />
                                            <span>Add Comment</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'closure' && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Closure notes:
                            </label>
                            <EditableTextarea
                                id="closure_notes"
                                inputRef={closureNotesRef}
                                value={closureNotes}
                                onChange={handleClosureNotesChange}
                                rows={6}
                                disabled={!isSupportUser || isTicketClosedOrResolved}
                                hasError={closureNotesHasError}
                                className="w-full text-sm"
                                placeholder="Enter closure notes here..."
                            />
                            {closureNotesErrorMessage && (
                                <p className="text-xs text-red-600 mt-1">
                                    {closureNotesErrorMessage}
                                </p>
                            )}
                            {isSupportUser && !isTicketClosedOrResolved && (
                                <div className="flex justify-end mt-3">
                                    <button
                                        onClick={() => handleUpdateTicket('close')}
                                        disabled={
                                            !isSupportUser ||
                                            isTicketClosedOrResolved ||
                                            closeButtonState === 'closing' ||
                                            (editableFields.status === 'Resolved' && !closureNotes.trim()) ||
                                            assignedToHasError || timeSpentHasError || closureNotesHasError
                                        }
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors flex items-center justify-center
                                            ${closeButtonState === 'closing' || (editableFields.status === 'Resolved' && !closureNotes.trim()) || assignedToHasError || timeSpentHasError || closureNotesHasError
                                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                : closeButtonState === 'success'
                                                    ? 'bg-green-600 text-white'
                                                    : closeButtonState === 'error'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-700 text-yellow-300 hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        {closeButtonState === 'closing' && <Loader2 className="animate-spin mr-2" size={16} />}
                                        {closeButtonState === 'success' && <CheckCircle className="mr-2" size={16} />}
                                        {closeButtonState === 'error' && <XCircle className="mr-2" size={16} />}
                                        {closeButtonState === 'closing' && 'Closing...'}
                                        {closeButtonState === 'success' && 'Closed!'}
                                        {closeButtonState === 'error' && 'Error!'}
                                        {closeButtonState === 'default' && (
                                            <>
                                                <span>Close Ticket</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketDetailComponent;