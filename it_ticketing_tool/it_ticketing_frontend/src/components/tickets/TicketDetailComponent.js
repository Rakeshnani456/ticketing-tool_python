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
    Calendar,
    User,
    CheckCircle2,
    File,
    Clock,
    Hourglass,
    Tag,
    ArrowRight,
    FileText,
    Info,
    List,
    AlertTriangle,
} from 'lucide-react';
import { Paperclip } from '../common/AnimatedPaperclip';
import { Activity } from '../common/AnimatedActivity';
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


// Import the new modular components
import TicketDetailHeader from './TicketDetailHeader';
import TicketDetailsSection from './TicketDetailsSection';
import TicketProgressSection from './TicketProgressSection';
import TicketUpdatesSection from './TicketUpdatesSection';

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
    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [commentPage, setCommentPage] = useState(0);
    const commentsPerPage = 6;
    const [visibleCommentCount, setVisibleCommentCount] = useState(6);
    const [isAtBottom, setIsAtBottom] = useState(false);

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
        }, 1000);
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

    const isSupportUser = user?.role === 'support' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'site_admin';
    const isEngineer = user?.role === 'support' || user?.role === 'super_admin';

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
            ticketData.status_history.forEach(history => {
                if (history.timestamp && history.new_status) {
                    if (history.new_status === 'Resolved') return;
                    let colorClass = ''; // Use neutral color by default
                    if (history.new_status === 'Critical') colorClass = 'text-red-600';

                    events.push({
                        type: 'status_change',
                        timestamp: history.timestamp,
                        label: `Status: ${history.new_status}`,
                        icon: Tag,
                        iconColor: colorClass,
                        detail: history.user_email ? history.user_email.split('@')[0] : 'System'
                    });
                }
            });
        } else {
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
            ticketData.assigned_to_history.forEach(history => {
                if (history.timestamp && history.new_assigned_to) {
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
                    let colorClass = ''; // Neutral default
                    if (history.new_priority === 'Critical') colorClass = 'text-red-600';
                    else if (history.new_priority === 'High') colorClass = 'text-orange-500';

                    events.push({
                        type: 'priority_change',
                        timestamp: history.timestamp,
                        label: `Priority: ${history.new_priority}`,
                        icon: AlertTriangle,
                        iconColor: colorClass,
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
            return !isNaN(date.getTime());
        });

        validEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return validEvents;
    }, []);

    useEffect(() => {
        if (!ticketId || !user?.firebaseUser || !db) {
            setLoading(false);
            showFlashMessage('Authentication or ticket ID missing to view details.', 'info');
            return () => { };
        }

        setError(null);

        // OPTIMIZED: Check cache first
        const cacheKey = `ticket_detail_${ticketId}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        const now = Date.now();
        
        // Use cached data if it's less than 1 minute old
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 60000) {
            try {
                const parsedData = JSON.parse(cachedData);
                setTicket(parsedData.ticket);
                setTimelineEvents(parsedData.timelineEvents || []);
                setLoading(false);
                
                if (['Resolved', 'Cancelled'].includes(parsedData.ticket.status)) {
                    setIsEditing(false);
                }
            } catch (e) {
                console.warn('Failed to parse cached ticket detail data:', e);
            }
        }

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
                const timelineEventsData = generateTimelineEvents(fetchedTicket);
                setTimelineEvents(timelineEventsData);
                
                if (['Resolved', 'Cancelled'].includes(fetchedTicket.status)) {
                    setIsEditing(false);
                }
                
                // Cache the data
                const dataToCache = {
                    ticket: fetchedTicket,
                    timelineEvents: timelineEventsData,
                    timestamp: now
                };
                localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
                localStorage.setItem(`${cacheKey}_time`, now.toString());
                
                setLoading(false);
                setError(null);
            } else {
                setError('Ticket not found.');
                showFlashMessage('Ticket not found.', 'error');
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
    }, [ticketId, user, db, isSupportUser]);

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
        if (isEditing && (isSupportUser || isEngineer)) {
            setSupportUsersLoading(true);
            user.firebaseUser.getIdToken()
                .then(idToken => {
                    return fetch(`${API_BASE_URL}/api/users`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                })
                .then(res => res.json())
                .then(data => {
                    setSupportUsers(Array.isArray(data) ? data.filter(u => u.role === 'support' || u.role === 'super_admin') : []);
                    setSupportUsersLoading(false);
                })
                .catch(() => {
                    setSupportUsers([]);
                    setSupportUsersLoading(false);
                });
        }
    }, [isEditing, isSupportUser, isEngineer, user]);

    const isTicketClosedOrResolved = ticket && ['Resolved', 'Cancelled'].includes(ticket.status);
    const isTicketCreator = ticket && ticket.reporter_id === user?.uid;
    
    // Only Engineers can edit tickets (not ticket creators or other support users)
    const canEdit = !isTicketClosedOrResolved && isEngineer;
    
    // Comments and attachments can be added by anyone if ticket is not closed/resolved
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
                    
                    showFlashMessage('Ticket resolved successfully!', 'success');
                    
                    setTimeout(() => {
                        if (user.role === 'user') {
                            navigateTo('/my-tickets');
                        } else {
                            navigateTo('/all-tickets');
                        }
                    }, 2000);
                } else {
                    setSaveButtonState('success');
                    
                    if (payload.status === 'Resolved' && !oldStatusWasTerminal) {
                        showFlashMessage('Ticket resolved successfully!', 'success');
                        
                        setTimeout(() => {
                            if (user.role === 'user') {
                                navigateTo('/my-tickets');
                            } else {
                                navigateTo('/all-tickets');
                            }
                        }, 2000);
                    }
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
                setVisibleCommentCount(6);
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
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip',
                'application/x-zip-compressed'
            ];
            if (!allowedTypes.includes(file.type)) {
                showFlashMessage(`File type "${file.type}" not allowed for ${file.name}. Allowed types: PNG, JPG, PDF, Word, Excel, ZIP.`, 'error');
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
        
        // Don't remove uploading files immediately - let them stay until ticket data refreshes
        // This prevents the brief disappearance and position jumping
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
                    
                    // Now that the ticket has been updated, remove the uploading files
                    // This ensures smooth transition without gaps or position jumping
                    setUploadingFiles(prev => prev.filter(f => !filesToUpload.some(file => file.name === f.file.name)));
                    
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
                    
                    // Clean up uploading files on error too
                    setUploadingFiles(prev => prev.filter(f => !filesToUpload.some(file => file.name === f.file.name)));
                    
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
            
            // Clean up uploading files when no attachments were uploaded
            setUploadingFiles(prev => prev.filter(f => !filesToUpload.some(file => file.name === f.file.name)));
            
            setTimeout(() => {
                setUploadButtonState('upload');
            }, 2000);
        }
    };

    const handleRemoveFile = (fileToRemove) => {
        setAttachmentFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
    };

    // Navigation handlers for header component
    const handleCommentsClick = () => {
        const commentsSection = document.getElementById('comments-section');
        if (commentsSection) commentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAttachmentsClick = () => {
        const attachmentsSection = document.getElementById('attachments-section');
        if (attachmentsSection) attachmentsSection.scrollIntoView({ behavior: 'smooth' });
    };

    if (error) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-red-200 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-3 text-red-600 mb-4">
                    <XCircle size={24} className="text-red-500" />
                    <span className="text-lg font-semibold">Error</span>
                </div>
                <p className="text-gray-700 text-center">{error}</p>
            </div>
        </div>
    );
    
    if (!ticket || loading) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 max-w-md mx-auto">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
                <p className="text-gray-700 text-center font-medium">Loading ticket details...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white min-h-screen pt-2 pb-4 pl-1 pr-4 sm:pt-3 sm:pb-6 sm:pl-2 sm:pr-6 w-full ticket-detail-container">
            <div className="w-full max-w-full mx-auto">
                {/* Header Component */}
                <TicketDetailHeader
                    ticket={ticket}
                    isSupportUser={isSupportUser}
                    navigateTo={navigateTo}
                    timelineEvents={timelineEvents}
                />

                {/* Main Content Area - Split into two columns for details and progress */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* Left Column: Ticket Details and Descriptions */}
                    <div className="lg:col-span-7">
                        <TicketDetailsSection
                            ticket={ticket}
                            isEditing={isEditing}
                            canEdit={canEdit}
                            editableFields={editableFields}
                            handleEditChange={handleEditChange}
                            uploadingFiles={uploadingFiles}
                            uploadProgress={uploadProgress}
                            canAddAttachments={canAddAttachments}
                            handleFileChange={handleFileChange}
                            profilePopup={profilePopup}
                            showProfilePopup={showProfilePopup}
                            cancelShowProfilePopup={cancelShowProfilePopup}
                            hidePopup={hidePopup}
                            popupHideTimeout={popupHideTimeout}
                            onCommentsClick={handleCommentsClick}
                            onAttachmentsClick={handleAttachmentsClick}
                        />
                    </div>

                    {/* Right Column: Ticket Progress */}
                    <div className="lg:col-span-3">
                        <TicketProgressSection
                            ticket={ticket}
                            isEditing={isEditing}
                            canEdit={canEdit}
                            isSupportUser={isSupportUser}
                            isTicketClosedOrResolved={isTicketClosedOrResolved}
                            editableFields={editableFields}
                            handleEditChange={handleEditChange}
                            handleButtonSelection={handleButtonSelection}
                            updateLoading={updateLoading}
                            saveButtonState={saveButtonState}
                            hasChanges={hasChanges}
                            handleUpdateTicket={handleUpdateTicket}
                            handleCancelEdit={handleCancelEdit}
                            setIsEditing={setIsEditing}
                            supportUsers={supportUsers}
                            supportUsersLoading={supportUsersLoading}
                            assignedToErrorMessage={assignedToErrorMessage}
                            timeSpent={timeSpent}
                            timeSpentErrorMessage={timeSpentErrorMessage}
                            timeSpentHasError={timeSpentHasError}
                            handleTimeSpentChange={handleTimeSpentChange}
                            profilePopup={profilePopup}
                            showProfilePopup={showProfilePopup}
                            cancelShowProfilePopup={cancelShowProfilePopup}
                            hidePopup={hidePopup}
                            popupHideTimeout={popupHideTimeout}
                        />
                    </div>
                </div>

                {/* Updates Section (Comments & Closure Tabs) */}
                <div className="w-full mt-6">
                    <TicketUpdatesSection
                        ticket={ticket}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isSupportUser={isSupportUser}
                        isTicketClosedOrResolved={isTicketClosedOrResolved}
                        canEdit={canEdit}
                        canAddComments={canAddComments}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        commentLoading={commentLoading}
                        handleAddComment={handleAddComment}
                        closureNotes={closureNotes}
                        closureNotesErrorMessage={closureNotesErrorMessage}
                        closureNotesHasError={closureNotesHasError}
                        handleClosureNotesChange={handleClosureNotesChange}
                        closeButtonState={closeButtonState}
                        handleUpdateTicket={handleUpdateTicket}
                        assignedToHasError={assignedToHasError}
                        timeSpentHasError={timeSpentHasError}
                        visibleCommentCount={visibleCommentCount}
                        setVisibleCommentCount={setVisibleCommentCount}
                        isAtBottom={isAtBottom}
                        setIsAtBottom={setIsAtBottom}
                        user={user}
                        profilePopup={profilePopup}
                        showProfilePopup={showProfilePopup}
                        cancelShowProfilePopup={cancelShowProfilePopup}
                        hidePopup={hidePopup}
                        popupHideTimeout={popupHideTimeout}
                    />
                </div>
            </div>
        </div>
    );
};

export default TicketDetailComponent;