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
import ResolutionModal from '../common/ResolutionModal';
import AssignmentNotesModal from '../common/AssignmentNotesModal';


// Import the new modular components
import TicketDetailHeader from './TicketDetailHeader';
import TicketDetailsSection from './TicketDetailsSection';
import TicketProgressSection from './TicketProgressSection';
import TicketUpdatesSection from './TicketUpdatesSection';

const TicketDetailComponent = ({ navigateTo, user, showFlashMessage }) => {
    const { ticketId } = useParams();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false); // Start with false to avoid spinner flash
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
    
    // Add state for field update feedback
    const [fieldUpdateStates, setFieldUpdateStates] = useState({
        assigned_to_email: { loading: false, success: false, error: false },
        status: { loading: false, success: false, error: false },
        priority: { loading: false, success: false, error: false }
    });

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
    const [attemptedHoldWithoutComment, setAttemptedHoldWithoutComment] = useState(false);

    const [assignedToHasError, setAssignedToHasError] = useState(false);
    const [timeSpentHasError, setTimeSpentHasError] = useState(false);
    const [closureNotesHasError, setClosureNotesHasError] = useState(false);

    const [subjectExpanded, setSubjectExpanded] = useState(false);
    const [isSubjectTruncated, setIsSubjectTruncated] = useState(false);
    const subjectRef = useRef(null);
    
    // State for resolution modal
    const [showResolutionModal, setShowResolutionModal] = useState(false);
    const [pendingResolutionStatus, setPendingResolutionStatus] = useState(null);
    const [modalTimeSpent, setModalTimeSpent] = useState('');
    const [modalClosureNotes, setModalClosureNotes] = useState('');
    const [isResolvingViaModal, setIsResolvingViaModal] = useState(false);
    const [updateModeLoading, setUpdateModeLoading] = useState(false);
    const [pendingFieldUpdates, setPendingFieldUpdates] = useState({});
    
    // State for assignment notes modal
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [pendingAssignmentEmail, setPendingAssignmentEmail] = useState(null);
    const [assignmentNotes, setAssignmentNotes] = useState('');
    const [isReassigningViaModal, setIsReassigningViaModal] = useState(false);

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
        // Safety check: only show popup if user has an email
        if (!user || !user.email) return;
        
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
    
    // Determine if Hold should be disabled (requires comment for engineers/super_admins)
    const isHoldDisabled = useCallback(() => {
        if (user?.role === 'super_admin') {
            const hasComments = ticket?.comments && ticket.comments.length > 0;
            return !hasComments;
        }
        return false;
    }, [user, ticket]);

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

        // Handle notes timestamps
        if (newData.notes && Array.isArray(newData.notes)) {
            newData.notes = newData.notes.map(note => {
                if (note.timestamp && note.timestamp.toDate) {
                    return { ...note, timestamp: note.timestamp.toDate().toISOString() };
                }
                if (note.created_at && note.created_at.toDate) {
                    return { ...note, created_at: note.created_at.toDate().toISOString() };
                }
                return note;
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
                        detail: comment.commenter ? comment.commenter.split('@')[0] : 'Anonymous',
                        comment_text: comment.comment || comment.text || '',
                        comment: comment.comment || comment.text || ''
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

        // Add timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (loading) {
                console.warn('Ticket loading timeout - ticket may not exist yet');
                setError('Ticket is still being created. Please wait a moment and refresh.');
                showFlashMessage('Ticket is still being created. Please wait a moment and refresh.', 'warning');
                setLoading(false);
            }
        }, 10000); // 10 second timeout

        const unsubscribe = onSnapshot(ticketDocRef, (docSnapshot) => {
            clearTimeout(loadingTimeout); // Clear timeout when data is received
            
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
                // Ticket doesn't exist yet - this might be a newly created ticket
                console.log('Ticket not found in Firestore yet, waiting...');
                // Don't set error immediately, keep loading for a bit
            }
        }, (err) => {
            clearTimeout(loadingTimeout);
            console.error("Firestore onSnapshot error (TicketDetailComponent):", err);
            setError(`Failed to load ticket details: ${err.message}`);
            showFlashMessage(`Failed to load ticket details: ${err.message}`, 'error');
            setLoading(false);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
        };
    }, [ticketId, user, db, isSupportUser]);

    // Derived permissions and helpers (placed before effects that depend on them)
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

    // Listen for description blur autosave events and trigger save if changes present
    useEffect(() => {
        const handler = () => {
            if (canEdit && hasChanges()) {
                handleUpdateTicket('save');
            }
        };
        window.addEventListener('ticket-autosave', handler);
        return () => window.removeEventListener('ticket-autosave', handler);
    }, [canEdit, hasChanges]);

    // Initialize editableFields when ticket loads (for users who can edit)
    useEffect(() => {
        if (ticket && canEdit) {
            setEditableFields({
                short_description: ticket.short_description || '',
                long_description: ticket.long_description || '',
                priority: ticket.priority || '',
                status: ticket.status || '',
                assigned_to_email: ticket.assigned_to_email || '',
                closed_by_email: ticket.closed_by_email || '',
                category: ticket.category || '',
            });
        }
    }, [ticket, canEdit]);

    // Initialize time_spent and closure_notes when ticket loads (regardless of editing mode)
    useEffect(() => {
        if (ticket) {
            setTimeSpent(ticket.time_spent || '');
            setClosureNotes(ticket.closure_notes || '');
        }
    }, [ticket]);

    // Load support users early - start loading as soon as ticket loads and user is a support user/engineer
    // This improves UX by pre-fetching users before they need to assign
    const hasFetchedUsersRef = useRef(false);
    useEffect(() => {
        // Start loading if user has permission to view/edit tickets (not just when canEdit is true)
        // This way users are ready when they click the dropdown
        if (ticket && (isSupportUser || isEngineer) && user?.firebaseUser && !hasFetchedUsersRef.current) {
            hasFetchedUsersRef.current = true;
            setSupportUsersLoading(true);
            user.firebaseUser.getIdToken()
                .then(idToken => {
                    // Add cache-busting query parameter and forAssignment flag to ensure fresh data and correct filtering
                    return fetch(`${API_BASE_URL}/api/users?t=${Date.now()}&forAssignment=true`, {
                        headers: {
                            'Authorization': `Bearer ${idToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    // Filter users based on current user's role and assignment permissions
                    // Include all engineer roles (support, engineer, senior_engineer, lead_engineer, principal_engineer) and super_admin
                    const engineerRoles = ['support', 'engineer', 'senior_engineer', 'lead_engineer', 'principal_engineer'];
                    let filteredUsers = [];
                    if (Array.isArray(data)) {
                        if (user?.role === 'site_admin') {
                            // Site admin can assign to all engineers, super_admin, and site_admin users
                            filteredUsers = data.filter(u => 
                                engineerRoles.includes(u.role) || 
                                u.role === 'super_admin' ||
                                u.role === 'site_admin'
                            );
                        } else {
                            // Other users (engineers, super_admin, etc.) can assign to all engineers AND super_admin users
                            // This ensures both superadmins and support engineers are included
                            filteredUsers = data.filter(u => 
                                engineerRoles.includes(u.role) || 
                                u.role === 'super_admin'
                            );
                        }
                    }
                    console.log('Fetched users for assignment:', {
                        total: data?.length || 0,
                        filtered: filteredUsers.length,
                        engineers: filteredUsers.filter(u => engineerRoles.includes(u.role)).length,
                        superadmins: filteredUsers.filter(u => u.role === 'super_admin').length,
                        allRoles: [...new Set(filteredUsers.map(u => u.role))]
                    });
                    setSupportUsers(filteredUsers);
                    setSupportUsersLoading(false);
                })
                .catch((error) => {
                    console.error('Error fetching support users:', error);
                    setSupportUsers([]);
                    setSupportUsersLoading(false);
                    hasFetchedUsersRef.current = false; // Allow retry on error
                });
        } else if (!ticket || !(isSupportUser || isEngineer)) {
            // If conditions not met, clear loading state and reset ref
            setSupportUsersLoading(false);
            hasFetchedUsersRef.current = false;
        }
    }, [ticket, isSupportUser, isEngineer, user]);

    // Disable auto-enable editing - now controlled by Update button
    // Only disable editing if ticket is closed/resolved
    useEffect(() => {
        if (isTicketClosedOrResolved) {
            setIsEditing(false);
        }
    }, [isTicketClosedOrResolved]);

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

    // Handle Update button click - enables editing mode
    const handleUpdateClick = useCallback(() => {
        if (!ticket || !canEdit) return;
        setIsEditing(true);
        // Initialize editable fields with current ticket values
        setEditableFields({
            short_description: ticket.short_description || '',
            long_description: ticket.long_description || '',
            priority: ticket.priority || '',
            status: ticket.status || '',
            assigned_to_email: ticket.assigned_to_email || '',
            closed_by_email: ticket.closed_by_email || '',
            category: ticket.category || '',
        });
        setPendingFieldUpdates({});
    }, [ticket, canEdit]);

    // Handle Confirm Update - batch save all pending changes with optimistic updates
    const handleConfirmUpdate = useCallback(async () => {
        if (!ticket || !canEdit) return;

        // Check if trying to resolve or cancel
        if (editableFields.status === 'Resolved') {
            // Check if ticket is assigned
            if (!editableFields.assigned_to_email) {
                showFlashMessage('Please assign this ticket before resolving it.', 'error');
                // Restore original status
                setEditableFields(prev => ({ ...prev, status: ticket.status }));
                return;
            }
            
            // Show resolution modal instead - use current timeSpent state value, not ticket.time_spent
            setPendingResolutionStatus('Resolved');
            setModalTimeSpent(timeSpent || ticket.time_spent || '');
            setModalClosureNotes(closureNotes || ticket.closure_notes || '');
            setShowResolutionModal(true);
            return;
        }

        // Handle cancellation - just update directly (no modal needed)
        if (editableFields.status === 'Cancelled') {
            // Check if ticket is assigned
            if (!editableFields.assigned_to_email) {
                showFlashMessage('Please assign this ticket before cancelling it.', 'error');
                // Restore original status
                setEditableFields(prev => ({ ...prev, status: ticket.status }));
                return;
            }
        }

        // Store original state for rollback
        const originalTicket = { ...ticket };
        const originalEditableFields = { ...editableFields };

        setUpdateModeLoading(true);

        try {
            // Build update payload with only changed fields
            const updates = {};
            if (editableFields.status !== ticket.status) {
                updates.status = editableFields.status;
                // If cancelling, set closed_by_email and resolved_at
                if (editableFields.status === 'Cancelled') {
                    updates.closed_by_email = user.email;
                    updates.resolved_at = new Date().toISOString();
                }
            }
            if (editableFields.priority !== ticket.priority) {
                updates.priority = editableFields.priority;
            }
            if (editableFields.assigned_to_email !== (ticket.assigned_to_email || '')) {
                updates.assigned_to_email = editableFields.assigned_to_email || null;
                // Include assigned_to_id for faster backend lookup (avoids slow email query)
                if (updates.assigned_to_email) {
                    const assignedUser = supportUsers.find(u => u.email === updates.assigned_to_email);
                    if (assignedUser?.uid) {
                        updates.assigned_to_id = assignedUser.uid;
                    }
                } else {
                    updates.assigned_to_id = null;
                }
            }

            // If no changes, just return
            if (Object.keys(updates).length === 0) {
                setUpdateModeLoading(false);
                return;
            }

            // OPTIMISTIC UPDATE: Update UI immediately
            const optimisticUpdate = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            setTicket(prev => prev ? ({ ...prev, ...optimisticUpdate }) : prev);
            setEditableFields(prev => ({ ...prev, ...updates }));
            setPendingFieldUpdates({});
            
            // Show immediate feedback
            showFlashMessage('Updating ticket...', 'info');

            // Send batch update in background
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (response.ok) {
                // Success - confirm optimistic update
                showFlashMessage('Ticket updated successfully!', 'success');
            } else {
                // ERROR: Rollback optimistic update
                setTicket(originalTicket);
                setEditableFields(originalEditableFields);
                showFlashMessage(data.error || 'Failed to update ticket.', 'error');
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            // ERROR: Rollback optimistic update
            setTicket(originalTicket);
            setEditableFields(originalEditableFields);
            showFlashMessage('Network error while updating ticket.', 'error');
        } finally {
            setUpdateModeLoading(false);
        }
    }, [ticket, canEdit, editableFields, user, ticketId, showFlashMessage, supportUsers, timeSpent, closureNotes]);

    // Handle individual field updates - update local state (no auto-save)
    const handleFieldUpdate = useCallback((fieldName, value) => {
        if (!ticket || !canEdit) return;

        // INTERCEPT: If trying to resolve ticket, immediately open the resolution modal
        if (fieldName === 'status' && value === 'Resolved') {
            // Check if ticket is assigned
            if (!editableFields.assigned_to_email && !ticket.assigned_to_email) {
                showFlashMessage('Please assign this ticket before resolving it.', 'error');
                return;
            }
            
            // Update local state first
            setEditableFields(prev => ({ ...prev, [fieldName]: value, closed_by_email: user?.email || '' }));
            setPendingFieldUpdates(prev => ({ ...prev, [fieldName]: value }));
            
            // Immediately open the resolution modal
            setPendingResolutionStatus('Resolved');
            setModalTimeSpent(timeSpent || ticket.time_spent || '');
            setModalClosureNotes(closureNotes || ticket.closure_notes || '');
            setShowResolutionModal(true);
            return;
        }

        // INTERCEPT: If reassigning from one user to another (not from unassigned), require notes
        if (fieldName === 'assigned_to_email') {
            const currentAssignment = ticket.assigned_to_email || '';
            const newAssignment = value || '';
            
            // Check if this is a reassignment (from one user to another, not initial assignment)
            if (currentAssignment && newAssignment && currentAssignment !== newAssignment) {
                // This is a reassignment - show modal for notes
                setPendingAssignmentEmail(newAssignment);
                setAssignmentNotes('');
                setShowAssignmentModal(true);
                // Don't update the field yet - wait for notes
                return;
            }
            // If it's initial assignment (from unassigned) or unassigning, allow it without notes
        }

        // Update local state (no auto-save)
        setEditableFields(prev => ({ ...prev, [fieldName]: value }));
        setPendingFieldUpdates(prev => ({ ...prev, [fieldName]: value }));
        
        // Update field update states for visual feedback (but don't save yet)
        setFieldUpdateStates(prev => ({
            ...prev,
            [fieldName]: { loading: false, success: false, error: false }
        }));
    }, [ticket, canEdit, editableFields, showFlashMessage, user, timeSpent, closureNotes]);

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
            
            // If changing to Hold and user is engineer/super_admin, require a comment
            if (value === 'Hold' && user?.role === 'super_admin') {
                const hasComments = ticket?.comments && ticket.comments.length > 0;
                if (!hasComments) {
                    // Revert the change silently and show warning
                    setEditableFields(prev => ({ ...prev, status: ticket.status }));
                    setAttemptedHoldWithoutComment(true);
                    // Clear the warning after 5 seconds
                    setTimeout(() => setAttemptedHoldWithoutComment(false), 5000);
                    return;
                } else {
                    setAttemptedHoldWithoutComment(false);
                }
            }
        }
    }, [saveButtonState, user, ticket, showFlashMessage]);

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

        // Store original ticket state for rollback on error
        const originalTicket = ticket ? { ...ticket } : null;
        const originalEditableFields = { ...editableFields };

        try {
            const idToken = await user.firebaseUser.getIdToken();
            
            // Build payload with only changed fields (not entire editableFields)
            const payload = {};
            const newStatusIsTerminalForClosure = ['Resolved'].includes(editableFields.status);
            const oldStatusWasTerminal = ['Resolved', 'Cancelled'].includes(ticket.status);

            // Status change
            if (actionType === 'close') {
                payload.status = 'Resolved';
            } else if (editableFields.status !== ticket.status) {
                payload.status = editableFields.status;
            }

            // Priority change
            if (editableFields.priority !== ticket.priority) {
                payload.priority = editableFields.priority;
            }

            // Assignment change
            if (editableFields.assigned_to_email !== (ticket.assigned_to_email || '')) {
                payload.assigned_to_email = editableFields.assigned_to_email || null;
                // Include assigned_to_id for faster backend lookup (avoids slow email query)
                if (payload.assigned_to_email) {
                    const assignedUser = supportUsers.find(u => u.email === payload.assigned_to_email);
                    if (assignedUser?.uid) {
                        payload.assigned_to_id = assignedUser.uid;
                    }
                } else {
                    payload.assigned_to_id = null;
                }
            }

            // Closure notes and time spent (only for resolution)
            const finalStatus = payload.status || editableFields.status;
            if (finalStatus === 'Resolved' && !oldStatusWasTerminal) {
                payload.closure_notes = closureNotes.trim() || null;
                payload.time_spent = timeSpent.trim() || null;
            }

            // Validation
            let validationFailed = false;

            // Validation for Hold status - require comment for engineers/super_admins
            if (user?.role === 'super_admin' && (payload.status || editableFields.status) === 'Hold' && ticket.status !== 'Hold') {
                const hasComments = ticket?.comments && ticket.comments.length > 0;
                if (!hasComments) {
                    if (actionType === 'close') setCloseButtonState('error');
                    else setSaveButtonState('error');
                    setUpdateLoading(false);
                    setTimeout(() => {
                        if (actionType === 'close') setCloseButtonState('default');
                        else setSaveButtonState('save');
                    }, 2000);
                    return;
                }
            }

            if (isSupportUser && newStatusIsTerminalForClosure && !oldStatusWasTerminal) {
                if (!editableFields.assigned_to_email) {
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

            // Handle resolved/cancelled status metadata
            if (finalStatus === 'Resolved' && !oldStatusWasTerminal) {
                payload.closed_by_email = user.email;
                payload.resolved_at = new Date().toISOString();
            } else if (finalStatus === 'Cancelled' && !oldStatusWasTerminal) {
                payload.closed_by_email = user.email;
                payload.resolved_at = new Date().toISOString();
            } else if (!newStatusIsTerminalForClosure && oldStatusWasTerminal && finalStatus !== 'Cancelled') {
                payload.closed_by_email = null;
                payload.resolved_at = null;
                payload.closure_notes = null;
                payload.time_spent = null;
            }

            // If no changes, just return
            if (Object.keys(payload).length === 0) {
                if (actionType === 'close') setCloseButtonState('default');
                else {
                    setSaveButtonState('save');
                    setUpdateLoading(false);
                }
                return;
            }

            // OPTIMISTIC UPDATE: Update UI immediately before API call
            const optimisticUpdate = {
                ...payload,
                updated_at: new Date().toISOString()
            };
            
            // Update ticket state optimistically
            setTicket(prev => prev ? ({ ...prev, ...optimisticUpdate }) : prev);
            
            // Update editableFields to match
            setEditableFields(prev => ({ ...prev, ...payload }));
            
            // Show immediate feedback
            if (actionType === 'close') {
                setCloseButtonState('saving');
                showFlashMessage('Resolving ticket...', 'info');
            } else {
                showFlashMessage('Updating ticket...', 'info');
            }

            // Make API call in background
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
                // Success - confirm optimistic update
                if (actionType === 'close') {
                    setCloseButtonState('success');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    showFlashMessage('Ticket resolved successfully!', 'success');
                } else {
                    setSaveButtonState('success');
                    if (finalStatus === 'Resolved' && !oldStatusWasTerminal) {
                        showFlashMessage('Ticket resolved successfully!', 'success');
                    } else {
                        showFlashMessage('Ticket updated successfully!', 'success');
                    }
                }
                setError(null);

                // Reset button states after short delay
                setTimeout(() => {
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
                }, 500);
            } else {
                // ERROR: Rollback optimistic update
                if (originalTicket) {
                    setTicket(originalTicket);
                }
                setEditableFields(originalEditableFields);
                
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
            
            // ERROR: Rollback optimistic update
            if (originalTicket) {
                setTicket(originalTicket);
            }
            setEditableFields(originalEditableFields);
            
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
        if (!ticket) return;
        // Reset editable fields to original ticket values
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
        setSaveButtonState('save');
        setAssignedToErrorMessage('');
        setClosureNotesErrorMessage('');
        setTimeSpentErrorMessage('');
        setAssignedToHasError(false);
        setTimeSpentHasError(false);
        setClosureNotesHasError(false);
        setPendingFieldUpdates({});
        // Reset field update states
        setFieldUpdateStates({
            assigned_to_email: { loading: false, success: false, error: false },
            status: { loading: false, success: false, error: false },
            priority: { loading: false, success: false, error: false }
        });
    }, [ticket]);

    // Handler for closing the resolution modal
    const handleModalClose = useCallback(() => {
        // Restore original status if modal is cancelled
        if (pendingResolutionStatus && ticket) {
            setEditableFields(prev => ({ ...prev, status: ticket.status, closed_by_email: ticket.closed_by_email || '' }));
        }
        setShowResolutionModal(false);
        setPendingResolutionStatus(null);
        setModalTimeSpent('');
        setModalClosureNotes('');
    }, [pendingResolutionStatus, ticket]);

    // Handler for confirming resolution via modal
    const handleModalConfirm = useCallback(async (notes = '') => {
        if (!ticket || !canEdit) return;

        // Validate modal inputs
        if (!modalTimeSpent.trim() || !/^\d{1,4}$/.test(modalTimeSpent.trim())) {
            return;
        }
        if (!modalClosureNotes.trim()) {
            return;
        }

        setIsResolvingViaModal(true);

        try {
            const idToken = await user.firebaseUser.getIdToken();
            const payload = {
                ...editableFields,
                status: 'Resolved',
                time_spent: modalTimeSpent.trim(),
                closure_notes: modalClosureNotes.trim(),
                closed_by_email: user.email,
                resolved_at: new Date().toISOString()
            };

            // Make API calls in parallel: update ticket and add notes as comment (if provided)
            const promises = [
                fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify(payload)
                })
            ];

            // Add notes as a comment if provided
            if (notes && notes.trim()) {
                promises.push(
                    fetch(`${API_BASE_URL}/tickets/${ticketId}/add_comment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({ 
                            comment_text: `**Resolution Notes**\n\n${notes.trim()}` 
                        })
                    })
                );
            }

            const [ticketResponse, ...commentResponses] = await Promise.all(promises);
            const data = await ticketResponse.json();

            if (ticketResponse.ok) {
                // Check if comment was added successfully
                if (notes && notes.trim() && commentResponses[0] && !commentResponses[0].ok) {
                    console.error('Failed to add resolution notes as comment');
                }

                // Close modal
                setShowResolutionModal(false);
                setPendingResolutionStatus(null);
                setModalTimeSpent('');
                setModalClosureNotes('');

                // Update local state
                setTicket(prev => prev ? ({ ...prev, ...payload }) : prev);
                setEditableFields(prev => ({ ...prev, ...payload }));
                setTimeSpent(modalTimeSpent.trim());
                setClosureNotes(modalClosureNotes.trim());
                setIsEditing(false); // Exit editing mode after resolving
                setPendingFieldUpdates({});

                // Show success message
                showFlashMessage('Ticket resolved successfully!', 'success');

                // Do NOT auto-redirect - user stays on the ticket detail page
                // They can use the back button to return to the page they came from
            } else {
                showFlashMessage(data.error || 'Failed to resolve ticket.', 'error');
                setIsResolvingViaModal(false);
            }
        } catch (error) {
            console.error('Error resolving ticket:', error);
            showFlashMessage('Network error while resolving ticket.', 'error');
            setIsResolvingViaModal(false);
        }
    }, [ticket, canEdit, modalTimeSpent, modalClosureNotes, user, ticketId, showFlashMessage, navigateTo, editableFields]);

    // Handle assignment modal confirmation
    const handleAssignmentModalConfirm = useCallback(async () => {
        if (!ticket || !canEdit || !pendingAssignmentEmail) return;

        // Store values before closing modal
        const newAssignmentEmail = pendingAssignmentEmail;
        const notesToAdd = assignmentNotes.trim();
        const fromUser = ticket.assigned_to_email || 'Unassigned';
        const toUser = newAssignmentEmail || 'Unassigned';

        // Store original state for rollback
        const originalTicket = { ...ticket };
        const originalEditableFields = { ...editableFields };

        // Find assigned user for optimistic update
        const assignedUser = newAssignmentEmail 
            ? supportUsers.find(u => u.email === newAssignmentEmail)
            : null;

        // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
        const optimisticUpdates = {
            assigned_to_email: newAssignmentEmail || null,
            assigned_to_name: assignedUser?.name || null,
            assigned_to_id: assignedUser?.uid || null,
            updated_at: new Date().toISOString()
        };
        setTicket(prev => prev ? ({ ...prev, ...optimisticUpdates }) : prev);
        setEditableFields(prev => ({ ...prev, assigned_to_email: newAssignmentEmail || null }));

        // Close modal immediately - don't wait for API
        setShowAssignmentModal(false);
        setPendingAssignmentEmail(null);
        setAssignmentNotes('');
        setPendingFieldUpdates({});

        // Show immediate success message
        const assignedName = assignedUser?.name || newAssignmentEmail || 'Unassigned';
        showFlashMessage(`Assigning to ${assignedName}...`, 'info');

        // Process API calls in background (non-blocking)
        try {
            const idToken = await user.firebaseUser.getIdToken();
            
            // Prepare assignment notes text
            const noteText = notesToAdd
                ? `**Ticket Reassigned**\n\nFrom: ${fromUser}\nTo: ${toUser}\n\n**Notes:**\n${notesToAdd}`
                : `**Ticket Reassigned**\n\nFrom: ${fromUser}\nTo: ${toUser}`;
            
            // Update assignment (critical operation)
            // Include assigned_to_id for faster backend lookup (avoids slow email query)
            const assignmentPayload = {
                assigned_to_email: newAssignmentEmail || null
            };
            if (assignedUser?.uid) {
                assignmentPayload.assigned_to_id = assignedUser.uid;
            } else if (!newAssignmentEmail) {
                assignmentPayload.assigned_to_id = null;
            }
            
            const assignmentResponse = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(assignmentPayload)
            });

            const assignmentData = await assignmentResponse.json();

            if (!assignmentResponse.ok) {
                // ERROR: Revert optimistic update on failure
                setTicket(originalTicket);
                setEditableFields(originalEditableFields);
                showFlashMessage(assignmentData.error || 'Failed to reassign ticket.', 'error');
                return;
            }

            // Success - show confirmation
            showFlashMessage(`Ticket assigned to ${assignedName}!`, 'success');

            // Add notes in background (non-blocking, don't wait)
            if (notesToAdd) {
                fetch(`${API_BASE_URL}/tickets/${ticketId}/add_note`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ 
                        note_text: noteText,
                        note_type: 'internal'
                    })
                }).catch(error => {
                    console.error('Failed to add assignment notes:', error);
                    // Don't show error to user since reassignment succeeded
                });
            }
        } catch (error) {
            console.error('Error reassigning ticket:', error);
            // ERROR: Revert optimistic update on error
            setTicket(originalTicket);
            setEditableFields(originalEditableFields);
            showFlashMessage('Network error while reassigning ticket.', 'error');
        }
    }, [ticket, canEdit, pendingAssignmentEmail, assignmentNotes, supportUsers, user, ticketId, showFlashMessage, editableFields]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showFlashMessage('Comment text cannot be empty.', 'error');
            return;
        }
        
        // Store original comment text for potential retry
        const originalCommentText = commentText;
        
        setCommentLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/add_comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ comment_text: commentText, commenter_name: user?.email }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();
            
            if (response.ok) {
                setCommentText('');
                setVisibleCommentCount(6);
                showFlashMessage('Comment added successfully!', 'success');
            } else {
                showFlashMessage(data.error || 'Failed to add comment.', 'error');
            }
        } catch (error) {
            console.error('Add comment error:', error);
            if (error.name === 'AbortError') {
                showFlashMessage('Comment submission timed out. Please try again.', 'error');
            } else {
                showFlashMessage('Network error or server unreachable during comment addition.', 'error');
            }
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
                <p className="text-gray-500 text-center text-sm mt-2">Preparing ticket view...</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-6">
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
                            isHoldDisabled={isHoldDisabled()}
                            user={user}
                            attemptedHoldWithoutComment={attemptedHoldWithoutComment}
                            fieldUpdateStates={fieldUpdateStates}
                            handleFieldUpdate={handleFieldUpdate}
                            onConfirmUpdate={handleConfirmUpdate}
                            updateModeLoading={updateModeLoading}
                        />
                    </div>
                </div>

                {/* Updates Section (Comments & Closure Tabs) */}
                <div className="w-full mt-4 sm:mt-6">
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
                        showFlashMessage={showFlashMessage}
                        profilePopup={profilePopup}
                        showProfilePopup={showProfilePopup}
                        cancelShowProfilePopup={cancelShowProfilePopup}
                        hidePopup={hidePopup}
                        popupHideTimeout={popupHideTimeout}
                    />
                </div>

            </div>
            
            {/* Resolution Modal */}
            <ResolutionModal
                isOpen={showResolutionModal}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
                timeSpent={modalTimeSpent}
                setTimeSpent={setModalTimeSpent}
                closureNotes={modalClosureNotes}
                setClosureNotes={setModalClosureNotes}
                loading={isResolvingViaModal}
                ticket={ticket}
                user={user}
            />
            
            {/* Assignment Notes Modal */}
            <AssignmentNotesModal
                isOpen={showAssignmentModal}
                onClose={() => {
                    setShowAssignmentModal(false);
                    setPendingAssignmentEmail(null);
                    setAssignmentNotes('');
                    // Revert the assignment change in editableFields
                    setEditableFields(prev => ({
                        ...prev,
                        assigned_to_email: ticket.assigned_to_email || ''
                    }));
                }}
                onConfirm={handleAssignmentModalConfirm}
                assignmentNotes={assignmentNotes}
                setAssignmentNotes={setAssignmentNotes}
                loading={false}
                ticket={ticket}
                user={user}
                fromUser={ticket.assigned_to_email || null}
                toUser={pendingAssignmentEmail || null}
            />
        </div>
    );
};

export default TicketDetailComponent;