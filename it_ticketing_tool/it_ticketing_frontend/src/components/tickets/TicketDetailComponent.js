// src/components/tickets/TicketDetailComponent.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Loader2,
    CheckCircle,
    XCircle,
    UploadCloud,
    Download,
    ChevronLeft,
    ArrowLeft,
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
    FileText,
    Info,
    List,
    AlertTriangle,
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
import Timeline from './Timeline';
import UserProfilePopup from '../common/UserProfilePopup';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const FieldBox = ({ children, className = "", isDisplayOnly = false, hasError = false }) => (
    <div className={`FieldBox border px-2 py-0.5 min-h-[32px] flex items-center
        ${isDisplayOnly ? 'bg-white text-gray-700 cursor-text border-gray-300 overflow-hidden text-wrap' : 'bg-white border-gray-300'}
        ${hasError ? 'border-red-500 ring-red-500 ring-2' : ''}
        ${className}`}>
        {children}
    </div>
);

const EditableTextarea = ({ id, value, onChange, rows = 3, className = "", disabled, hasError = false, inputRef, maxLength }) => (
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
        maxLength={maxLength}
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
    const [supportUsers, setSupportUsers] = useState([]);
    const [supportUsersLoading, setSupportUsersLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({}); // { fileName: percent }
    const [uploadingFiles, setUploadingFiles] = useState([]); // [{file, previewUrl, isImage}]

    const commentsSectionRef = useRef(null);
    const closureNotesRef = useRef(null);
    const timeSpentRef = useRef(null);
    const assignedToRef = useRef(null);

    // Add refs for each field
    const requestedForRef = useRef(null);
    const assignedToRefProfile = useRef(null);
    const closedByRef = useRef(null);

    const [editableFields, setEditableFields] = useState({
        short_description: '',
        long_description: '',
        priority: '',
        status: '',
        assigned_to_email: '',
        closed_by_email: '',
        category: '',
    });

    const [assignedToHasError, setAssignedToHasError] = useState(false);
    const [timeSpentHasError, setTimeSpentHasError] = useState(false);
    const [closureNotesHasError, setClosureNotesHasError] = useState(false);

    const [subjectExpanded, setSubjectExpanded] = useState(false);
    const [isSubjectTruncated, setIsSubjectTruncated] = useState(false);
    const subjectRef = useRef(null);

    // Add state and ref for the popup at the top of the component
    const [profilePopup, setProfilePopup] = useState({ visible: false, user: null, anchorRef: null });
    const [popupHovered, setPopupHovered] = useState(false);
    const requestedByRef = useRef(null);
    const popupHideTimeout = useRef(null);
    const popupShowTimeout = useRef(null);

    const showPopup = () => {
      if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
      setProfilePopup({ visible: true, user: { email: ticket.reporter_email, fullName: ticket.reporter_name }, anchorRef: requestedByRef });
    };

    const hidePopup = () => {
      popupHideTimeout.current = setTimeout(() => {
        setProfilePopup((prev) => ({ ...prev, visible: false }));
      }, 150);
    };

    // Helper to show popup for any field with delay
    const showProfilePopup = (user, anchorRef) => {
      if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
      if (popupShowTimeout.current) clearTimeout(popupShowTimeout.current);
      popupShowTimeout.current = setTimeout(() => {
        setProfilePopup({ visible: true, user, anchorRef });
      }, 1000); // 1 second delay
    };

    const cancelShowProfilePopup = () => {
      if (popupShowTimeout.current) clearTimeout(popupShowTimeout.current);
    };

    useEffect(() => {
        // Check if the subject is truncated
        if (subjectRef.current) {
            setIsSubjectTruncated(subjectRef.current.scrollWidth > subjectRef.current.clientWidth);
        }
    }, [ticket?.short_description, subjectExpanded]);

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
        // Handle priority_history timestamps
        if (newData.priority_history && Array.isArray(newData.priority_history)) {
            newData.priority_history = newData.priority_history.map(history => {
                if (history.timestamp && history.timestamp.toDate) {
                    return { ...history, timestamp: history.timestamp.toDate().toISOString() };
                }
                return history;
            });
        }
        // Handle category_history timestamps
        if (newData.category_history && Array.isArray(newData.category_history)) {
            newData.category_history = newData.category_history.map(history => {
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

        // Event: Status Changes (from history) - Ensures ALL status changes are captured
        if (ticketData.status_history && Array.isArray(ticketData.status_history)) {
            console.log('Status history:', ticketData.status_history); // Debug log
            ticketData.status_history.forEach(history => {
                if (history.timestamp && history.new_status) {
                    // Skip status_change event for 'Resolved' to avoid duplicate with resolved event
                    if (history.new_status === 'Resolved') return;
                    console.log('Processing status history entry:', history); // Debug log
                    let color = 'text-blue-600';
                    if (history.new_status === 'In Progress') color = 'text-yellow-600';
                    else if (history.new_status === 'Hold') color = 'text-purple-600';
                    else if (history.new_status === 'Resolved') color = 'text-green-600';
                    else if (history.new_status === 'Cancelled') color = 'text-red-600';
                    events.push({
                        type: 'status_change',
                        timestamp: history.timestamp,
                        label: `Status: ${history.new_status}`,
                        icon: Tag,
                        iconColor: color,
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
        if (ticketData.attachments && Array.isArray(ticketData.attachments)) {
            ticketData.attachments.forEach(attachment => {
                const timestamp = attachment.added_at || ticketData.created_at;
                events.push({
                    type: 'attachment_added',
                    timestamp,
                    label: `Attachment`,
                    icon: Paperclip,
                    detail: attachment.fileName || ''
                });
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

        // Priority changes
        if (ticketData.priority_history && Array.isArray(ticketData.priority_history)) {
            ticketData.priority_history.forEach(history => {
                if (history.timestamp && history.new_priority) {
                    let color = 'text-green-600';
                    if (history.new_priority === 'Medium') color = 'text-yellow-500';
                    else if (history.new_priority === 'High') color = 'text-orange-500';
                    else if (history.new_priority === 'Critical') color = 'text-red-600';
                    events.push({
                        type: 'priority_change',
                        timestamp: history.timestamp,
                        label: `Priority: ${history.new_priority}`,
                        icon: AlertTriangle,
                        iconColor: color,
                        detail: history.user_email ? history.user_email.split('@')[0] : 'System'
                    });
                }
            });
        }
        // Category changes
        if (ticketData.category_history && Array.isArray(ticketData.category_history)) {
            ticketData.category_history.forEach(history => {
                if (history.timestamp && history.new_category) {
                    events.push({
                        type: 'category_change',
                        timestamp: history.timestamp,
                        label: `Category: ${history.new_category}`,
                        icon: List,
                        detail: history.user_email ? history.user_email.split('@')[0] : 'System'
                    });
                }
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
                        short_description: fetchedTicket.short_description || '',
                        long_description: fetchedTicket.long_description || '',
                        priority: fetchedTicket.priority || '',
                        status: fetchedTicket.status || '',
                        assigned_to_email: fetchedTicket.assigned_to_email || '',
                        closed_by_email: fetchedTicket.closed_by_email || '',
                        category: fetchedTicket.category || '',
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
                            closed_by_email: fetchedTicket.closed_by_email,
                            category: fetchedTicket.category || '',
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
                short_description: ticket.short_description || '',
                long_description: ticket.long_description || '',
                priority: ticket.priority || '',
                status: ticket.status || '',
                assigned_to_email: ticket.assigned_to_email || '',
                closed_by_email: ticket.closed_by_email || '',
                category: ticket.category || '',
            });
            setClosureNotes(ticket.closure_notes || '');
            setTimeSpent(ticket.time_spent || '');
        }
    }, [isEditing, ticket]);

    useEffect(() => {
        if (isEditing && isSupportUser) {
            setSupportUsersLoading(true);
            fetch(`${API_BASE_URL}/api/users`)
                .then(res => res.json())
                .then(data => {
                    setSupportUsers(Array.isArray(data) ? data.filter(u => u.role === 'support') : []);
                    setSupportUsersLoading(false);
                })
                .catch(() => {
                    setSupportUsers([]);
                    setSupportUsersLoading(false);
                });
        }
    }, [isEditing, isSupportUser]);

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
        let val = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
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

                if (!timeSpent.trim() || !/^\d{1,4}$/.test(timeSpent.trim())) {
                    setTimeSpentHasError(true);
                    setTimeSpentErrorMessage('Please enter time spent (in minutes, max 4 digits).');
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

            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
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
                    showFlashMessage(data.error === 'Only the assigned engineer can update status or priority.' ? 'You cannot change the status or priority of this ticket unless it is assigned to you.' : (data.error || 'Failed to close ticket.'), 'error');
                } else {
                    setSaveButtonState('error');
                    showFlashMessage(data.error === 'Only the assigned engineer can update status or priority.' ? 'You cannot change the status or priority of this ticket unless it is assigned to you.' : (data.error || 'Failed to update ticket.'), 'error');
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
            short_description: ticket.short_description || '',
            long_description: ticket.long_description || '',
            priority: ticket.priority || '',
            status: ticket.status || '',
            assigned_to_email: ticket.assigned_to_email || '',
            closed_by_email: ticket.closed_by_email || '',
            category: ticket.category || '',
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
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/add_comment`, {
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
        const newUploadingFiles = [];
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
            const isImage = file.type.startsWith('image/');
            newUploadingFiles.push({
                file,
                previewUrl: isImage ? URL.createObjectURL(file) : null,
                isImage
            });
        }
        if (validFiles.length > 0) {
            setAttachmentFiles(prevFiles => [...prevFiles, ...validFiles]);
            setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
            await handleAddAttachmentsToTicket(validFiles, newUploadingFiles);
        } else {
            setUploadButtonState('upload');
        }
    };

    const uploadFileWithProgress = (file, onProgress, idToken) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('attachment', file);
            xhr.open('POST', `${API_BASE_URL}/upload-attachment`);
            xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };
            xhr.onload = () => {
                if (xhr.status === 200) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(xhr.responseText);
                }
            };
            xhr.onerror = () => reject(xhr.responseText);
            xhr.send(formData);
        });
    };

    const handleAddAttachmentsToTicket = async (filesToUpload, uploadingFileObjs) => {
        if (filesToUpload.length === 0) {
            setUploadButtonState('upload');
            return;
        }
        setUploadButtonState('uploading');
        const uploadedAttachmentData = [];
        let anyUploadFailed = false;
        const idToken = await user.firebaseUser.getIdToken();
        const uploadPromises = filesToUpload.map((file, idx) => {
            return uploadFileWithProgress(file, (percent) => {
                setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
            }, idToken).then(data => {
                if (data.files && data.files.length > 0) {
                    uploadedAttachmentData.push({ url: data.files[0].url, fileName: data.files[0].originalFilename });
                }
            }).catch(err => {
                showFlashMessage(`Failed to upload ${file.name}: ${err || 'Server error'}`, 'error');
                anyUploadFailed = true;
            });
        });
        await Promise.all(uploadPromises);
        setUploadingFiles(prev => prev.filter(f => !filesToUpload.some(file => file.name === f.file.name)));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            filesToUpload.forEach(file => { delete newProgress[file.name]; });
            return newProgress;
        });
        if (uploadedAttachmentData.length > 0) {
            try {
                const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
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

    const handleRemoveFile = (fileToRemove) => {
        setAttachmentFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
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
            case 'priority_change': return 'text-purple-600';
            case 'category_change': return 'text-blue-600';
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
        <div className="bg-white min-h-screen p-6 pl-4 px-0 overflow-x-hidden">
            <div className="max-w-full w-full mx-auto px-0 sm:px-0 md:px-0 min-w-0"> {/* Fluid and responsive */}
                {/* Header */}
                <div className="max-w-full w-full mx-auto px-0 sm:px-0 md:px-0 min-w-0">
                    <div className="bg-white rounded-lg py-2 pl-0 pr-6 sm:pl-0 sm:pr-4 flex items-center w-full min-w-0 justify-between">
                        <div className="flex items-center w-full min-w-0">
                            {/* Back button and ticket ID */}
                            <div className="flex items-center space-x-2 flex-shrink-0 mr-4">
                                <button
                                    onClick={() => navigateTo(isSupportUser ? 'allTickets' : 'myTickets')}
                                    className="flex items-center justify-center w-8 h-8 bg-red-400 hover:bg-red-500 text-white shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 scale-100 hover:scale-110 rounded-none"
                                    title="Back"
                                >
                                    <ArrowLeft className="w-4 h-4 text-white" />
                                </button>
                                <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap truncate">{ticket.display_id}</h1>
                            </div>
                            {/* Subject line */}
                            <div className="flex items-center min-w-0">
                                <span className="text-sm font-bold text-gray-500 mr-1 shrink-0">Subject Line:</span>
                                <span className="text-sm text-black truncate" style={{ maxWidth: 600 }}>
                                    {ticket.short_description || <span className="text-gray-400">N/A</span>}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Timeline Section below header */}
                <Timeline events={timelineEvents} />

                {/* Info bar for comments and attachments */}
                {ticket && (
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2 ml-2">
                    <button
                      className="flex items-center gap-1 hover:underline focus:outline-none"
                      onClick={() => {
                        const commentsSection = document.getElementById('comments-section');
                        if (commentsSection) commentsSection.scrollIntoView({ behavior: 'smooth' });
                      }}
                      title="Go to comments"
                    >
                      <MessageSquare className="w-4 h-4 mr-1 text-blue-500" />
                      {ticket.comments && ticket.comments.length > 0 ? `${ticket.comments.length} comment${ticket.comments.length > 1 ? 's' : ''}` : '0 comments'}
                    </button>
                    <button
                      className="flex items-center gap-1 hover:underline focus:outline-none"
                      onClick={() => {
                        const attachmentsSection = document.getElementById('attachments-section');
                        if (attachmentsSection) attachmentsSection.scrollIntoView({ behavior: 'smooth' });
                      }}
                      title="Go to attachments"
                    >
                      <Paperclip className="w-4 h-4 mr-1 text-green-500" />
                      {ticket.attachments && ticket.attachments.length > 0 ? `${ticket.attachments.length} attachment${ticket.attachments.length > 1 ? 's' : ''}` : '0 attachments'}
                    </button>
                  </div>
                )}

                {/* Main Content Area - Split into two columns for details and progress */}
                <div className="max-w-full w-full mx-auto px-0 sm:px-0 md:px-0 py-0 grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0"> {/* Fluid and responsive */}
                    {/* Left Column: Ticket Details and Descriptions */}
                    <div className="lg:col-span-2 bg-white rounded-lg pt-1 pl-1 pr-6 pb-3">
                        <div className="mb-2 flex items-center gap-1.5">
                            <span className="text-base font-bold text-gray-500">Details</span>
                            <Info className="w-4 h-4 text-gray-500 ml-2" />
                        </div>
                        {/* Ticket Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Left column */}
    <div className="flex flex-col gap-6">
        {/* Ticket ID */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Ticket ID:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <span className="text-sm text-blue-700 text-wrap overflow-hidden flex-1 min-w-0">{ticket.display_id}</span>
            </FieldBox>
        </div>
        {/* Requested by */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Requested by:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <span
                    ref={requestedByRef}
                    className="text-sm text-blue-700 text-wrap overflow-hidden flex-1 min-w-0 cursor-pointer"
                    onMouseEnter={() => showProfilePopup({ email: ticket.reporter_email, fullName: ticket.reporter_name }, requestedByRef)}
                    onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                >
                    {ticket.reporter_email ? ticket.reporter_email : <span className="text-gray-400">N/A</span>}
                </span>
                <UserProfilePopup
                    user={profilePopup.user}
                    anchorRef={profilePopup.anchorRef}
                    visible={profilePopup.visible}
                    onMouseEnter={() => {
                      if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                      setPopupHovered(true);
                    }}
                    onMouseLeave={() => {
                      setPopupHovered(false);
                      hidePopup();
                    }}
                />
            </FieldBox>
        </div>
        {/* Asset ID */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Asset ID:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <span className="text-sm text-orange-700 text-wrap overflow-hidden flex-1 min-w-0">{ticket.hostname_asset_id ? ticket.hostname_asset_id : <span className="text-gray-400">N/A</span>}</span>
            </FieldBox>
        </div>
    </div>
    {/* Right column */}
    <div className="flex flex-col gap-6">
        {/* Requested for */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Requested for:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <span
                    ref={requestedForRef}
                    className="text-sm text-blue-700 text-wrap overflow-hidden flex-1 min-w-0 cursor-pointer"
                    onMouseEnter={() => showProfilePopup({ email: ticket.request_for_email, fullName: ticket.request_for_name }, requestedForRef)}
                    onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                >
                    {ticket.request_for_email ? ticket.request_for_email : <span className="text-gray-400">N/A</span>}
                </span>
                <UserProfilePopup
                    user={profilePopup.user}
                    anchorRef={profilePopup.anchorRef}
                    visible={profilePopup.visible && profilePopup.anchorRef === requestedForRef}
                    onMouseEnter={() => {
                      if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                      setPopupHovered(true);
                    }}
                    onMouseLeave={() => {
                      setPopupHovered(false);
                      hidePopup();
                    }}
                />
            </FieldBox>
        </div>
        {/* Contact No */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Contact No:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <span className="text-sm text-indigo-700 text-wrap overflow-hidden flex-1 min-w-0">{ticket.contact_number ? ticket.contact_number : <span className="text-gray-400">N/A</span>}</span>
            </FieldBox>
        </div>
        {/* Created */}
        <div className="flex items-center">
            <label className="text-sm font-semibold text-gray-800 w-32 shrink-0">Created:</label>
            <FieldBox className="w-full flex-1" isDisplayOnly={true}>
                <Calendar className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <span className="text-sm text-gray-700 text-wrap overflow-hidden flex-1 min-w-0">{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : <span className="text-gray-400">N/A</span>}</span>
            </FieldBox>
        </div>
    </div>
</div>

                        {/* Long Description */}
                        <div className="mb-8 mt-8">
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Long description:
                                </label>
                            {isEditing && canEdit ? (
                                <>
                                    <EditableTextarea
                                        id="long_description"
                                        value={editableFields.long_description}
                                        onChange={handleEditChange}
                                        rows={10}
                                        disabled={!canEdit}
                                        className="FieldBox border border-blue-300 px-2 py-0.5 min-h-[32px] flex items-center bg-white rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent max-w-none"
                                        maxLength={1200}
                                    />
                                    {isEditing && canEdit && (
                                        <div className="text-xs text-gray-400 mt-1 text-right w-full">{editableFields.long_description.length}/1200 characters</div>
                                    )}
                                </>
                            ) : (
                                <FieldBox className="overflow-y-auto flex flex-col justify-start items-start w-full bg-gray-50 max-w-none" isDisplayOnly={true} style={{ minHeight: '220px', maxHeight: '220px' }}>
                                    {ticket.long_description ? (
                                        <span className="text-sm text-gray-700 whitespace-pre-wrap text-wrap" style={{ lineHeight: 1.5 }}>
                                            {ticket.long_description}
                                        </span>
                            ) : (
                                        <span className="text-sm text-gray-400 italic whitespace-pre-wrap text-wrap mt-0" style={{ lineHeight: 1.5 }}>
                                            No description provided.
                                            </span>
                                    )}
                                </FieldBox>
                        )}
                    </div>

                    {/* Start of moved Attachments section */}
                    <div className="bg-white rounded-lg pt-1 pl-1 pr-6 pb-3">
                        <div className="flex items-center mb-4 justify-between">
                            <h3 className="text-sm font-medium text-gray-900 flex items-center">
                                Attachments
                            </h3>
                            {canAddAttachments && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('attachment-upload-btn');
                                        if (input) input.click();
                                    }}
                                    className="ml-2 p-1 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    title="Upload attachments"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                            )}
                            <input
                                id="attachment-upload-btn"
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                hidden
                                disabled={uploadButtonState === 'uploading' || !canAddAttachments}
                                value=""
                            />
                        </div>
                        <div id="attachments-section" className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-x-0 gap-y-1">
                            {uploadingFiles.map((fileObj, idx) => (
                                <div key={fileObj.file.name} className="relative w-10 h-20 flex flex-col items-center justify-start text-center group overflow-hidden">
                                    {fileObj.isImage ? (
                                        <img src={fileObj.previewUrl} alt={fileObj.file.name} className="w-10 h-10 object-cover rounded" />
                                    ) : (
                                        <FileIcon fileName={fileObj.file.name} className="w-10 h-10" />
                                    )}
                                    <div className="absolute top-0 left-0 w-10 h-10 flex items-center justify-center">
                                        <CircularProgressbar
                                            value={uploadProgress[fileObj.file.name] || 0}
                                            text={`${uploadProgress[fileObj.file.name] || 0}%`}
                                            styles={buildStyles({ pathColor: '#2563eb', textColor: '#2563eb', trailColor: '#e5e7eb', textSize: '20px' })}
                                        />
                                    </div>
                                    <span className="text-[10px] mt-10 truncate w-full px-0.5">{fileObj.file.name}</span>
                                </div>
                            ))}
                            {/* Existing attachments */}
                            {ticket.attachments && ticket.attachments.length > 0 ? (
                                ticket.attachments.map((attachment, index) => {
                                    const isImage = attachment.fileName && /\.(jpg|jpeg|png)$/i.test(attachment.fileName);
                                    return (
                                        <a
                                            key={index}
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={attachment.fileName}
                                            className="flex flex-col items-center justify-start transition-colors text-center group w-10 h-20 overflow-hidden relative"
                                            title={attachment.fileName}
                                        >
                                            <div className="absolute inset-x-0 top-0 flex items-center justify-center h-10 w-10 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                                                {isImage ? (
                                                    <img src={attachment.url} alt={attachment.fileName} className="w-10 h-10 object-cover rounded" />
                                                ) : (
                                                    <FileIcon fileName={attachment.fileName} className="w-10 h-10" />
                                                )}
                                            </div>
                                            <div className="absolute inset-x-0 top-0 flex items-center justify-center h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <Download className="w-8 h-8 text-blue-600" />
                                            </div>
                                            <span className="text-[10px] text-gray-700 mt-10 font-medium leading-tight truncate w-full px-0.5">
                                                {attachment.fileName}
                                            </span>
                                        </a>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 text-[11px] col-span-full">No attachments yet.</p>
                            )}
                        </div>
                    </div>
                    {/* End of moved Attachments section */}
                </div>

                    {/* Right Column: Ticket Progress */}
                    <div className="lg:col-span-1 bg-white rounded-lg pt-1 pl-1 pr-6 pb-3 h-fit">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-extrabold text-gray-500 flex items-center">
                                Ticket Progress
                                <TrendingUp className="w-4 h-4 text-gray-500 ml-2" />
                            </h3>

                            {/* Edit button moved to top right of progress box */}
                            {canEdit && !isEditing && (
                                <Button
                                    onClick={() => setIsEditing(true)}
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    sx={{ textTransform: 'none', fontWeight: 600, minHeight: 28, fontSize: '0.85rem', px: 1.5, py: 0.25 }}
                                >
                                    Edit
                                </Button>
                            )}
                            {isEditing && canEdit && (
                                <div className="flex items-center space-x-1">
                                    {/* Only show Cancel button if not saving */}
                                    {saveButtonState === 'save' && (
                                        <Button
                                            onClick={handleCancelEdit}
                                            disabled={updateLoading}
                                            variant="outlined"
                                            color="secondary"
                                            size="small"
                                            sx={{ textTransform: 'none', fontWeight: 600, ml: 1, minHeight: 28, fontSize: '0.85rem', px: 1.5, py: 0.25 }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    {/* Save button always shown */}
                                    <Button
                                        onClick={() => handleUpdateTicket('save')}
                                        disabled={updateLoading || !hasChanges()}
                                        variant="contained"
                                        color={saveButtonState === 'error' ? 'error' : saveButtonState === 'success' ? 'success' : 'primary'}
                                        size="small"
                                        sx={{ textTransform: 'none', fontWeight: 600, ml: 1, minHeight: 28, fontSize: '0.85rem', px: 1.5, py: 0.25 }}
                                    >
                                        {saveButtonState === 'saving' && 'Saving...'}
                                        {saveButtonState === 'success' && 'Saved!'}
                                        {saveButtonState === 'error' && 'Error!'}
                                        {saveButtonState === 'save' && 'Save'}
                                    </Button>
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

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-2">
                                    Category:
                                </label>
                                {isEditing && canEdit ? (
                                    <Select
                                        id="category"
                                        value={editableFields.category || ''}
                                        onChange={e => handleEditChange({ target: { id: 'category', value: e.target.value } })}
                                        fullWidth
                                        size="small"
                                        displayEmpty
                                        disabled={!canEdit}
                                        sx={{
                                            backgroundColor: 'white',
                                            width: '100%',
                                            height: '32px',
                                            minHeight: '32px',
                                            border: isEditing && canEdit ? '1.5px solid #60a5fa' : '1px solid #d1d5db', // blue-400 when editing
                                            borderRadius: 0,
                                            px: 2,
                                            fontSize: '0.875rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            boxSizing: 'border-box',
                                            '& .MuiSelect-select': {
                                                height: '32px',
                                                minHeight: '32px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                paddingTop: 0,
                                                paddingBottom: 0,
                                                paddingLeft: 0,
                                                paddingRight: '24px',
                                            },
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                border: 'none',
                                            },
                                            '& fieldset': {
                                                border: 'none',
                                            },
                                        }}
                                        name="category"
                                        renderValue={(selected) => selected ? selected.charAt(0).toUpperCase() + selected.slice(1) : 'Select Category'}
                                        MenuProps={{
                                            PaperProps: {
                                                style: {
                                                    marginTop: 2,
                                                    fontSize: '0.85rem',
                                                },
                                            },
                                        }}
                                    >
                                        <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>Select Category</MenuItem>
                                        <MenuItem value="software" sx={{ fontSize: '0.85rem' }}>Software</MenuItem>
                                        <MenuItem value="hardware" sx={{ fontSize: '0.85rem' }}>Hardware</MenuItem>
                                        <MenuItem value="troubleshoot" sx={{ fontSize: '0.85rem' }}>Troubleshoot</MenuItem>
                                    </Select>
                                ) : (
                                    <FieldBox isDisplayOnly={true} className="w-full">
                                        <span className="text-sm text-black text-wrap overflow-hidden flex-1 min-w-0">
                                            {ticket.category || 'N/A'}
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
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <User className="w-4 h-4 text-gray-400" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 2 }} />
                                        <Select
                                            id="assigned_to_email"
                                            value={editableFields.assigned_to_email || ''}
                                            onChange={e => handleEditChange({ target: { id: 'assigned_to_email', value: e.target.value } })}
                                            fullWidth
                                            size="small"
                                            displayEmpty
                                            disabled={!isSupportUser || isTicketClosedOrResolved || supportUsersLoading}
                                            sx={{
                                                backgroundColor: 'white',
                                                width: '100%',
                                                height: '32px',
                                                minHeight: '32px',
                                                border: isEditing && isSupportUser && !isTicketClosedOrResolved ? '1.5px solid #60a5fa' : '1px solid #d1d5db', // blue-400 when editing
                                                borderRadius: 0,
                                                pl: 3.5,
                                                pr: 2,
                                                fontSize: '0.875rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                boxSizing: 'border-box',
                                                minWidth: 0,
                                                maxWidth: '100%',
                                                '& .MuiSelect-select': {
                                                    height: '32px',
                                                    minHeight: '32px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingTop: 0,
                                                    paddingBottom: 0,
                                                    paddingLeft: 0,
                                                    paddingRight: '24px',
                                                    minWidth: 0,
                                                    maxWidth: '100%',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': {
                                                    border: 'none',
                                                },
                                                '& fieldset': {
                                                    border: 'none',
                                                },
                                            }}
                                            name="assigned_to_email"
                                            renderValue={selected => {
                                                if (!selected) return 'Unassigned';
                                                const found = supportUsers.find(u => u.email === selected);
                                                const display = found ? (found.name ? `${found.name} (${found.email})` : found.email) : selected;
                                                return (
                                                    <span style={{
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        minWidth: 0,
                                                        maxWidth: '100%'
                                                    }} title={display}>{display}</span>
                                                );
                                            }}
                                            MenuProps={{
                                                PaperProps: {
                                                    style: {
                                                        marginTop: 2,
                                                        fontSize: '0.85rem',
                                                    },
                                                },
                                            }}
                                            inputProps={{ 'aria-label': 'Assigned To' }}
                                        >
                                            <MenuItem value="" sx={{ fontSize: '0.85rem' }}>Unassigned</MenuItem>
                                            {supportUsers.map(u => (
                                                <MenuItem key={u.email} value={u.email} sx={{ fontSize: '0.85rem' }}>
                                                    {u.name ? `${u.name} (${u.email})` : u.email}
                                                </MenuItem>
                                            ))}
                                            {/* If the current assigned_to_email is not in the list, show it as a disabled option */}
                                            {editableFields.assigned_to_email &&
                                                !supportUsers.some(u => u.email === editableFields.assigned_to_email) && (
                                                    <MenuItem value={editableFields.assigned_to_email} disabled>
                                                        {editableFields.assigned_to_email} (not a support user)
                                                    </MenuItem>
                                            )}
                                        </Select>
                                        {assignedToErrorMessage && (
                                            <p className="text-xs text-red-600 mt-1">{assignedToErrorMessage}</p>
                                        )}
                                    </div>
                                ) : (
                                    <FieldBox isDisplayOnly={true} className="w-full">
                                        <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                        <span
                                            ref={assignedToRefProfile}
                                            className="text-sm text-blue-700 text-wrap overflow-hidden flex-1 min-w-0 cursor-pointer"
                                            onMouseEnter={() => {
                                                if (ticket.assigned_to_email) {
                                                    showProfilePopup({ email: ticket.assigned_to_email, fullName: ticket.assigned_to_name }, assignedToRefProfile);
                                                }
                                            }}
                                            onMouseLeave={() => {
                                                if (ticket.assigned_to_email) {
                                                    cancelShowProfilePopup();
                                                    hidePopup();
                                                }
                                            }}
                                        >
                                            {ticket.assigned_to_email ? ticket.assigned_to_email : <span className="text-gray-400">Unassigned</span>}
                                        </span>
                                        <UserProfilePopup
                                            user={profilePopup.user}
                                            anchorRef={profilePopup.anchorRef}
                                            visible={profilePopup.visible && profilePopup.anchorRef === assignedToRefProfile}
                                            onMouseEnter={() => {
                                              if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                                              setPopupHovered(true);
                                            }}
                                            onMouseLeave={() => {
                                              setPopupHovered(false);
                                              hidePopup();
                                            }}
                                        />
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
                                        <span
                                            ref={closedByRef}
                                            className="text-sm text-blue-700 text-wrap overflow-hidden flex-1 min-w-0 cursor-pointer"
                                            onMouseEnter={() => showProfilePopup({ email: (isEditing ? editableFields.closed_by_email : ticket.closed_by_email), fullName: null }, closedByRef)}
                                            onMouseLeave={() => { cancelShowProfilePopup(); hidePopup(); }}
                                        >
                                            {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                            (isEditing ? editableFields.status : ticket.status) === 'Cancelled'
                                              ? (isEditing && editableFields.closed_by_email
                                                  ? editableFields.closed_by_email
                                                  : ticket.closed_by_email
                                                      ? ticket.closed_by_email
                                                      : <span className="text-gray-400">N/A</span>)
                                              : <span className="text-gray-400">N/A</span>}
                                        </span>
                                        <UserProfilePopup
                                            user={profilePopup.user}
                                            anchorRef={profilePopup.anchorRef}
                                            visible={profilePopup.visible && profilePopup.anchorRef === closedByRef}
                                            onMouseEnter={() => {
                                              if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
                                              setPopupHovered(true);
                                            }}
                                            onMouseLeave={() => {
                                              setPopupHovered(false);
                                              hidePopup();
                                            }}
                                        />
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
                                    <span className="text-sm text-emerald-700 text-wrap overflow-hidden flex-1 min-w-0">
                                        {(isEditing ? editableFields.status : ticket.status) === 'Resolved' ||
                                            (isEditing ? editableFields.status : ticket.status) === 'Cancelled'
                                              ? (isEditing && editableFields.resolved_at
                                                  ? new Date(editableFields.resolved_at).toLocaleString()
                                                  : ticket.resolved_at
                                                      ? new Date(ticket.resolved_at).toLocaleString()
                                                      : <span className="text-gray-400">N/A</span>)
                                              : <span className="text-gray-400">N/A</span>}
                                    </span>
                                </FieldBox>
                            </div>

                            {/* Time Spent - Only for support/admin and when status is Resolved or closing or already resolved/cancelled */}
                            {isSupportUser && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-800 mb-2">
                                        Time Spent <span className="text-xs text-gray-500 font-normal"></span>:
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
                                                    className="FieldBox border border-blue-300 px-2 py-0.5 min-h-[32px] flex items-center bg-white rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                                                    disabled={!isSupportUser || isTicketClosedOrResolved}
                                                    placeholder="in minutes (e.g., 45)"
                                                    style={{ minWidth: 0 }}
                                                />
                                                <span className="ml-2 text-xs text-gray-500">minutes</span>
                                            </FieldBox>
                                            {timeSpentErrorMessage && (
                                                <p className="text-xs text-red-600 mt-1">{timeSpentErrorMessage}</p>
                                            )}
                                        </>
                                    ) : (
                                        <FieldBox className="w-full" isDisplayOnly={true}>
                                            <Clock className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                                            <span className="text-sm text-amber-700 text-wrap overflow-hidden flex-1 min-w-0">
                                                {ticket.time_spent ? `${ticket.time_spent} minutes` : <span className="text-gray-400">N/A</span>}
                                            </span>
                                        </FieldBox>
                                    )}
                                </div>
                            )}
                        </div>
                        </div>
                    </div>

                {/* Updates Section (Comments & Closure Tabs) */}
                <div className="max-w-full w-full mx-auto px-0 sm:px-0 md:px-0 py-3 space-y-3 min-w-0"> {/* This div now only holds the comments/closure section */}
                    <div ref={commentsSectionRef} id="comments-section" className="bg-white rounded-lg pt-1 pl-1 pr-6 pb-3">
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
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(e);
                                          }
                                        }}
                                    ></textarea>
                                    <div className="flex justify-end mt-3">
                                        <Button
                                            onClick={handleAddComment}
                                            disabled={commentLoading || !commentText.trim() || !canAddComments}
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            startIcon={commentLoading ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare className="w-4 h-4" />}
                                            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 28, fontSize: '0.85rem', px: 1.5, py: 0.25 }}
                                        >
                                            Add Comment
                                        </Button>
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
                                className="FieldBox border border-blue-300 px-2 py-0.5 min-h-[32px] flex items-center bg-white rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                                placeholder="Enter closure notes here..."
                            />
                            {closureNotesErrorMessage && (
                                <p className="text-xs text-red-600 mt-1">
                                    {closureNotesErrorMessage}
                                </p>
                            )}
                            {isSupportUser && !isTicketClosedOrResolved && (
                                <div className="flex justify-end mt-3">
                                    <Button
                                        onClick={() => handleUpdateTicket('close')}
                                        disabled={
                                            !isSupportUser ||
                                            isTicketClosedOrResolved ||
                                            closeButtonState === 'closing' ||
                                            (editableFields.status === 'Resolved' && !closureNotes.trim()) ||
                                            assignedToHasError || timeSpentHasError || closureNotesHasError
                                        }
                                        variant="contained"
                                        color={closeButtonState === 'error' ? 'error' : closeButtonState === 'success' ? 'success' : 'primary'}
                                        size="small"
                                        startIcon={
                                            closeButtonState === 'closing' ? <Loader2 className="animate-spin" size={16} /> :
                                            closeButtonState === 'success' ? <CheckCircle size={16} /> :
                                            closeButtonState === 'error' ? <XCircle size={16} /> : null
                                        }
                                        sx={{ textTransform: 'none', fontWeight: 600, ml: 1, minHeight: 28, fontSize: '0.85rem', px: 1.5, py: 0.25 }}
                                    >
                                        {closeButtonState === 'closing' && 'Closing...'}
                                        {closeButtonState === 'success' && 'Closed!'}
                                        {closeButtonState === 'error' && 'Error!'}
                                        {closeButtonState === 'default' && 'Close Ticket'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketDetailComponent;