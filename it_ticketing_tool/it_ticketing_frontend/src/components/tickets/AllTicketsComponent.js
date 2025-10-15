// src/components/tickets/AllTicketsComponent.js

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, XCircle, ListFilter, User, ChevronLeft, ChevronRight, ChevronDown, Plus, Search, Pin, PinOff, Edit3, Trash2, Save, X, FileText, Calendar, ExternalLink, Copy, Link, Eye, ArrowRight, RefreshCw } from 'lucide-react';
import selectionIcon from '../../assets/icons/selection.png';
import stickyNoteIcon from '../../assets/icons/sticky-note.png';
import { collection, query, where, orderBy, getFirestore, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import ReactDOM, { createPortal } from 'react-dom';
import { API_BASE_URL } from '../../config/constants';
import { app, dbClient } from '../../config/firebase';
import CustomDropdown from '../common/CustomDropdown';
import CompactDropdown from '../common/CompactDropdown';
import SelectButton from '../common/SelectButton';
import { useTickets } from '../../hooks/useDataManager';

// NotesTooltipBubble component for notes button - positions tooltip to the left
function NotesTooltipBubble({ title, children }) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);

    useEffect(() => {
        if (show && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const tooltipWidth = 200; // Approximate tooltip width
            const tooltipHeight = 40; // Approximate tooltip height
            
            // Position tooltip directly under the icon (like other tooltips)
            let topPosition = rect.bottom + 8; // Position directly under the element
            let leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2); // Center horizontally
            
            // Ensure tooltip doesn't go off-screen to the right
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
                leftPosition = viewportWidth - tooltipWidth - 10;
            }
            
            // Ensure tooltip doesn't go off-screen to the left
            if (leftPosition < 10) {
                leftPosition = 10;
            }
            
            // Check if tooltip would go off the bottom of viewport
            if (topPosition + tooltipHeight > viewportHeight - 10) {
                // Position above the icon instead
                topPosition = rect.top - tooltipHeight - 8;
            }
            
            setCoords({
                top: topPosition,
                left: leftPosition
            });
        }
    }, [show]);

    return (
        <div
            ref={iconRef}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            style={{ position: 'relative', display: 'inline-block', isolation: 'isolate' }}
        >
            {children}
            {show && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        left: coords.left,
                        backgroundColor: '#1f2937',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        zIndex: 9999,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    {title}
                </div>,
                document.body
            )}
        </div>
    );
}

// TooltipBubble component for hover tooltips
function TooltipBubble({ title, children }) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);

    useEffect(() => {
        if (show && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const tooltipWidth = 120; // Approximate tooltip width for button tooltips
            
            // Center the tooltip under the element
            let leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            
            // Ensure tooltip doesn't go off-screen to the right
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
                leftPosition = viewportWidth - tooltipWidth - 10;
            }
            
            // Ensure tooltip doesn't go off-screen to the left
            if (leftPosition < 10) {
                leftPosition = 10;
            }
            
            setCoords({
                top: rect.bottom + 8, // Position directly under the element
                left: leftPosition,
            });
        }
    }, [show]);

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            ref={iconRef}
        >
            {children}
            {show && createPortal(
                <div
                    className="fade-in"
                    style={{
                        position: 'fixed',
                        left: coords.left,
                        top: coords.top,
                        background: '#000000',
                        color: '#ffffff',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        // No transform needed - positioned directly under text
                    }}
                >
                    {title}
                </div>,
                document.body
            )}
        </div>
    );
}

// Add custom styles for line clamping and dropdown animations
const styles = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .line-clamp-4 {
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    .mr-160 {
        margin-right: 160px;
    }
`;

// ProfilePopup Component
const ProfilePopup = ({ visible, position, user, copyStatus, onMouseEnter, onMouseLeave, onCopyEmail, onCopyName, currentUser }) => {
    if (!visible || !user) return null;

    // Calculate smart positioning
    const calculateSmartPosition = () => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popupHeight = 200; // Estimated popup height
        const popupWidth = 200; // Estimated popup width
        
        let top = position.y;
        let left = position.x - 100; // Center the popup
        
        // Check if popup would go off the bottom of viewport
        const shouldOpenAbove = position.y + popupHeight > viewportHeight;
        if (shouldOpenAbove) {
            // Position above the element instead
            top = position.y - popupHeight - 10;
        }
        
        // Check if popup would go off the right edge
        if (left + popupWidth > viewportWidth) {
            left = viewportWidth - popupWidth - 10;
        }
        
        // Check if popup would go off the left edge
        if (left < 10) {
            left = 10;
        }
        
        return { top, left, shouldOpenAbove };
    };

    const smartPosition = calculateSmartPosition();

    const getStatusMessage = () => {
        switch (copyStatus) {
            case 'email_copied':
                return '✓ Email Copied!';
            case 'email_error':
                return '✗ Copy Failed';
            case 'name_copied':
                return '✓ Name Copied!';
            case 'name_error':
                return '✗ Copy Failed';
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        if (copyStatus && copyStatus.includes('copied')) {
            return 'text-green-600';
        } else if (copyStatus && copyStatus.includes('error')) {
            return 'text-red-600';
        }
        return 'text-gray-500';
    };

    return ReactDOM.createPortal(
        <div
            data-profile-popup
            className="fixed z-50 bg-white border border-gray-300 rounded-xl shadow-2xl py-2 min-w-[220px] backdrop-blur-sm"
            style={{
                left: smartPosition.left,
                top: smartPosition.top,
                zIndex: 9999,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Arrow pointing to the element */}
            {smartPosition.shouldOpenAbove ? (
                // Arrow pointing down (popup is above)
                <>
                    <div 
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid #d1d5db' // border-gray-200
                        }}
                    />
                    <div 
                        className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '7px solid white'
                        }}
                    />
                </>
            ) : (
                // Arrow pointing up (popup is below)
                <>
                    <div 
                        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '8px solid #d1d5db' // border-gray-200
                        }}
                    />
                    <div 
                        className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderBottom: '7px solid white'
                        }}
                    />
                </>
            )}
            
            {/* Header */}
            <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800 tracking-wide">User Profile</h3>
            </div>
            
            {/* Content */}
            <div className="px-4 py-3 space-y-3">
                {/* Requested By Email */}
                <div className="flex items-center justify-between group">
                    <div className="flex-1">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Requested By</div>
                        <span className="text-sm text-gray-600 leading-tight break-all">{user.email}</span>
                    </div>
                    <button
                        onClick={() => onCopyEmail(user.email)}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-blue-50 rounded-md"
                        title="Copy email"
                    >
                        <Copy className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 transition-colors" />
                    </button>
                </div>
                
                {/* Client Info - Hide for site admins */}
                {user.clientName && currentUser?.role !== 'site_admin' && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client</div>
                        <div className="text-sm text-gray-800 font-medium">{user.clientName}</div>
                    </div>
                )}
                
                {/* Contact Info */}
                {user.contactNumber && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contact</div>
                        <div className="text-sm text-gray-800 font-medium">{user.contactNumber}</div>
                    </div>
                )}
                
                {/* Status Message */}
                {copyStatus && (
                    <div className={`px-3 py-2 text-sm font-medium text-center rounded-lg border-t border-gray-100 ${getStatusColor()}`}>
                        {getStatusMessage()}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

// TicketIdPopup Component
const TicketIdPopup = ({ visible, position, ticketId, documentId, copyStatus, onOpen, onCopyId, onCopyUrl, onMouseEnter, onMouseLeave }) => {
    if (!visible || !ticketId) return null;

    // Calculate smart positioning
    const calculateSmartPosition = () => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const popupHeight = 150; // Estimated popup height
        const popupWidth = 180; // Estimated popup width
        
        let top = position.y;
        let left = position.x - 90; // Center the popup
        
        // Check if popup would go off the bottom of viewport
        const shouldOpenAbove = position.y + popupHeight > viewportHeight;
        if (shouldOpenAbove) {
            // Position above the element instead
            top = position.y - popupHeight - 10;
        }
        
        // Check if popup would go off the right edge
        if (left + popupWidth > viewportWidth) {
            left = viewportWidth - popupWidth - 10;
        }
        
        // Check if popup would go off the left edge
        if (left < 10) {
            left = 10;
        }
        
        return { top, left, shouldOpenAbove };
    };

    const smartPosition = calculateSmartPosition();

    const getStatusMessage = () => {
        switch (copyStatus) {
            case 'id_copied':
                return '✓ ID Copied!';
            case 'id_error':
                return '✗ Copy Failed';
            case 'url_copied':
                return '✓ URL Copied!';
            case 'url_error':
                return '✗ Copy Failed';
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        if (copyStatus && copyStatus.includes('copied')) {
            return 'text-green-600';
        } else if (copyStatus && copyStatus.includes('error')) {
            return 'text-red-600';
        }
        return 'text-gray-500';
    };

    return ReactDOM.createPortal(
        <div
            data-ticket-id-popup
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-xl py-1 min-w-[180px] backdrop-blur-sm"
            style={{
                left: smartPosition.left,
                top: smartPosition.top,
                zIndex: 9999,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Arrow pointing to ticket ID */}
            {smartPosition.shouldOpenAbove ? (
                // Arrow pointing down (popup is above)
                <>
                    <div 
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid #d1d5db' // border-gray-300
                        }}
                    />
                    <div 
                        className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '7px solid white'
                        }}
                    />
                </>
            ) : (
                // Arrow pointing up (popup is below)
                <>
                    <div 
                        className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderBottom: '8px solid #d1d5db' // border-gray-200
                        }}
                    />
                    <div 
                        className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-0 h-0"
                        style={{
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderBottom: '7px solid white'
                        }}
                    />
                </>
            )}
            
            <div className="py-1">
                {/* Header */}
                <div className="px-3 py-1 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-800 tracking-wide">Ticket Actions</h3>
                </div>
                
                {/* Actions */}
                <div>
                    <a
                        href={`/tickets/${documentId}`}
                        onClick={(e) => {
                            e.preventDefault();
                            onOpen(documentId);
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-all duration-200 group"
                    >
                        <ExternalLink className="w-4 h-4 mr-2 text-blue-600 group-hover:text-blue-700 transition-colors" />
                        <span className="font-medium">Open Ticket</span>
                    </a>
                    <button
                        onClick={() => onCopyId(ticketId)}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
                    >
                        <Copy className="w-4 h-4 mr-2 text-gray-500 group-hover:text-gray-700 transition-colors" />
                        <span className="font-medium">Copy Ticket ID</span>
                    </button>
                    <button
                        onClick={() => onCopyUrl(documentId)}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200 group"
                    >
                        <Link className="w-4 h-4 mr-2 text-gray-500 group-hover:text-gray-700 transition-colors" />
                        <span className="font-medium">Copy Ticket URL</span>
                    </button>
                </div>
                
                {/* Status Message */}
                {copyStatus && (
                    <div className={`px-3 py-2 text-sm font-medium text-center border-t border-gray-100 ${getStatusColor()}`}>
                        {getStatusMessage()}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

/**
 * Component to display all tickets, primarily for support users.
 * Includes filtering capabilities by status, assignment, and date range, and an export function.
 * 
 * ENGINEER CONFIGURATION:
 * Engineers are automatically fetched from the Firestore 'users' collection
 * where users have the role 'support'. No manual configuration needed.
 * 
 * @param {object} props - Component props.
 * @param {function} props.navigateTo - Function to navigate to different pages.
 * @param {function} props.showFlashMessage - Function to display temporary messages.
 * @param {object} props.user - The current authenticated user object.
 * @param {string} props.searchKeyword - Keyword to filter tickets by (e.g., ticket ID, description).
 * @param {string} [props.initialFilterAssignment=''] - Initial assignment filter ('unassigned', 'assigned_to_me', or '').
 * @param {boolean} [props.showFilters=true] - Whether to display the filter and export section.
 * @returns {JSX.Element} The list of all tickets or a loading/error message.
 */
const AllTicketsComponent = ({ navigateTo, showFlashMessage, user, searchKeyword, initialFilterAssignment = '', showFilters = true }) => {
    // Cache configuration
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const CACHE_KEY = `all_tickets_${user?.uid}_${user?.role}`;
    
    // Cache utility functions
    const getCachedData = () => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < CACHE_DURATION) {
                    return JSON.parse(cached);
                }
            }
        } catch (error) {
            console.warn('Failed to read cache:', error);
        }
        return null;
    };
    
    const setCachedData = (data) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
        } catch (error) {
            console.warn('Failed to write cache:', error);
        }
    };
    
    const clearCache = () => {
        try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(`${CACHE_KEY}_time`);
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    };
    
    // Use centralized data manager for tickets
    const { data: ticketsData, loading: ticketsLoading, error: ticketsError, refresh: refreshTicketsData } = useTickets(
        user?.uid,
        user?.role,
        user?.client_name
    );

    // Manual refresh function
    const refreshTickets = useCallback(() => {
        console.log('🔄 Manual refresh triggered');
        clearCache();
        setLoading(true);
        setCacheStatus('loading');
        // Force refresh through the data manager
        refreshTicketsData();
        // Update last refresh timestamp
        if (user?.uid) {
            localStorage.setItem(`last_tickets_refresh_${user.uid}`, Date.now().toString());
        }
    }, [refreshTicketsData, user?.uid]);
    
    // Expose refresh function globally for cache invalidation
    useEffect(() => {
        window.refreshAllTicketsCache = refreshTickets;
        return () => {
            delete window.refreshAllTicketsCache;
        };
    }, [refreshTickets]);
    
    // State to hold ALL tickets fetched from Firestore (before client-side filtering)
    const [allTickets, setAllTickets] = useState([]);
    // State for the tickets currently being displayed in the table (after client-side filtering)
    const [displayedTickets, setDisplayedTickets] = useState([]);

    const [loading, setLoading] = useState(false); // Start with false to avoid spinner flash
    const [error, setError] = useState(null);
    // MODIFIED: Default filterStatus to '' to show all active tickets initially
    const [filterStatus, setFilterStatus] = useState(''); // State for status filter
    const [filterAssignment, setFilterAssignment] = useState(initialFilterAssignment); // State for assignment filter
    const [startDate, setStartDate] = useState(''); // State for start date filter for export
    const [endDate, setEndDate] = useState('');     // State for end date filter for export
    // State to control the visibility of the informational message at the top
    const [showMessage, setShowMessage] = useState(true);
    // State to control the message box's opacity and position for fade-out effect
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [messageTransform, setMessageTransform] = useState('translateY(0)');
    // NEW: State to control the margin-bottom for the "move up" effect on grid content
    const [messageMarginBottom, setMessageMarginBottom] = useState('1rem'); // Use explicit px/rem for margin-bottom for smoother transition

    // NEW: Ref to get the actual height of the message box for accurate margin adjustment
    const messageBoxRef = useRef(null);
    const initialMessageBoxHeight = useRef(0); // Store initial height including its margin

    // New state for export date range popup visibility
    const [showExportPopup, setShowExportPopup] = useState(false);
    // Ref to detect clicks outside the export popup
    const exportPopupRef = useRef(null);
    const exportButtonRef = useRef(null);

    // New state for export success message on the export button
    const [exportSuccess, setExportSuccess] = useState(false);

    // Add state for export status filter
    const [exportStatus, setExportStatus] = useState('');

    // Add state for assign functionality
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [showAssignPopup, setShowAssignPopup] = useState(false);
    const [availableEngineers, setAvailableEngineers] = useState([]);
    const [engineersLoading, setEngineersLoading] = useState(false);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignSuccess, setAssignSuccess] = useState(false);
    const [assignPopupRef] = useState(useRef(null));
    // State to track loading for individual ticket assignments
    const [assigningTickets, setAssigningTickets] = useState(new Set());
    // State to track loading for individual ticket status changes
    const [changingStatusTickets, setChangingStatusTickets] = useState(new Set());
    
    // Add state for profile popup functionality
    const [profilePopup, setProfilePopup] = useState({ visible: false, user: null, position: { x: 0, y: 0 }, copyStatus: null });
    const [popupHovered, setPopupHovered] = useState(false);
    const popupHideTimeout = useRef(null);
    const popupShowTimeout = useRef(null);
    
    // Add state for ticket ID popup functionality
    const [ticketIdPopup, setTicketIdPopup] = useState({ visible: false, ticketId: null, documentId: null, copyStatus: null, position: { x: 0, y: 0 } });
    const [ticketIdPopupHovered, setTicketIdPopupHovered] = useState(false);
    const ticketIdPopupHideTimeout = useRef(null);
    const ticketIdPopupShowTimeout = useRef(null);
    
    // New state for dynamic checkbox behavior
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [assignMode, setAssignMode] = useState(false);
    
    // State for notes panel
    const [showNotesPanel, setShowNotesPanel] = useState(false);
    
    // State for ticket peek panel
    const [showPeekPanel, setShowPeekPanel] = useState(false);
    const [peekedTicket, setPeekedTicket] = useState(null);
    
    // State for cache status
    const [cacheStatus, setCacheStatus] = useState('loading'); // 'loading', 'cached', 'fresh'
    
    // Ref to track if engineers have been fetched to prevent unnecessary re-fetching
    const engineersFetchedRef = useRef(false);
    const engineersCacheRef = useRef(null);
    
    // Engineers cache configuration
    const ENGINEERS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
    const ENGINEERS_CACHE_KEY = `engineers_${user?.uid}_${user?.role}`;
    
    // Engineers cache utility functions
    const getEngineersCache = useCallback(() => {
        try {
            const cached = localStorage.getItem(ENGINEERS_CACHE_KEY);
            const cacheTime = localStorage.getItem(`${ENGINEERS_CACHE_KEY}_time`);
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < ENGINEERS_CACHE_DURATION) {
                    return JSON.parse(cached);
                }
            }
        } catch (error) {
            console.warn('Failed to read engineers cache:', error);
        }
        return null;
    }, [ENGINEERS_CACHE_KEY, ENGINEERS_CACHE_DURATION]);
    
    const setEngineersCache = (data) => {
        try {
            localStorage.setItem(ENGINEERS_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(`${ENGINEERS_CACHE_KEY}_time`, Date.now().toString());
        } catch (error) {
            console.warn('Failed to write engineers cache:', error);
        }
    };
    const [notes, setNotes] = useState([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [notesSearchTerm, setNotesSearchTerm] = useState('');
    const [notesSelectedCategory, setNotesSelectedCategory] = useState('all');
    const [showAddNoteForm, setShowAddNoteForm] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [viewingNote, setViewingNote] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [addingNote, setAddingNote] = useState(false);
    const [noteFormData, setNoteFormData] = useState({
        title: '',
        content: '',
        category: 'general'
    });
    

    // Add at the top of the component (after useState declarations)
    const [filterBy, setFilterBy] = useState('status'); // 'status', 'priority', 'company', or 'history'
    const [filterPriority, setFilterPriority] = useState('');
    const [filterCompany, setFilterCompany] = useState(''); // New state for company filter
    const [companies, setCompanies] = useState([]); // New state for companies list
    const [loadingCompanies, setLoadingCompanies] = useState(false); // New state for companies loading
    
    // Ref to track if companies have been fetched to prevent duplicate API calls
    const companiesFetchedRef = useRef(false);

    // Get today's date in ISO-MM-DD format for the max attribute of the end date input
    const today = new Date().toISOString().split('T')[0];

    // Notes categories
    const noteCategories = [
        { value: 'all', label: 'All Categories' },
        { value: 'general', label: 'General' },
        { value: 'technical', label: 'Technical' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'todo', label: 'To-Do' },
        { value: 'reference', label: 'Reference' }
    ];

    // Helper function to get category color - elegant tag style
    const getCategoryColor = (category) => {
        const colors = {
            general: 'text-amber-600 border-amber-200 bg-amber-50',
            technical: 'text-blue-600 border-blue-200 bg-blue-50',
            meeting: 'text-emerald-600 border-emerald-200 bg-emerald-50',
            todo: 'text-orange-600 border-orange-200 bg-orange-50',
            reference: 'text-purple-600 border-purple-200 bg-purple-50'
        };
        return colors[category] || colors.general;
    };

    // Format date helper
    const formatDate = (dateString) => {
        try {
            // Handle null/undefined
            if (!dateString) {
                return 'No date';
            }
            
            // Handle different date formats
            let date;
            if (dateString instanceof Date) {
                date = dateString;
            } else if (typeof dateString === 'string') {
                // Try parsing the string
                date = new Date(dateString);
            } else if (dateString && dateString._seconds) {
                // Handle Firestore timestamp format (with underscores)
                date = new Date(dateString._seconds * 1000);
            } else if (dateString && dateString.seconds) {
                // Handle Firestore timestamp format (without underscores)
                date = new Date(dateString.seconds * 1000);
            } else if (dateString && dateString.toDate) {
                // Handle Firestore Timestamp object
                date = dateString.toDate();
            } else {
                console.warn('Unknown date format:', dateString);
                return 'Invalid Date';
            }
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return 'Invalid Date';
            }
            
            return date.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return 'Invalid Date';
        }
    };

    // Initialize Firestore DB client. This will be the same instance as exported from firebase.js.
    const db = dbClient; // Use the already initialized dbClient

    // Notes cache configuration
    const NOTES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    const NOTES_CACHE_KEY = `personal_notes_${user?.uid}`;
    
    // Notes cache utility functions
    const getCachedNotes = useCallback(() => {
        try {
            const cached = localStorage.getItem(NOTES_CACHE_KEY);
            const cacheTime = localStorage.getItem(`${NOTES_CACHE_KEY}_time`);
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < NOTES_CACHE_DURATION) {
                    console.log('📦 Loading notes from cache');
                    return JSON.parse(cached);
                }
            }
        } catch (error) {
            console.warn('Failed to read notes cache:', error);
        }
        return null;
    }, [NOTES_CACHE_KEY, NOTES_CACHE_DURATION]);
    
    const setCachedNotes = useCallback((data) => {
        try {
            localStorage.setItem(NOTES_CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(`${NOTES_CACHE_KEY}_time`, Date.now().toString());
        } catch (error) {
            console.warn('Failed to write notes cache:', error);
        }
    }, [NOTES_CACHE_KEY]);

    // Notes API functions
    const fetchNotes = useCallback(async (forceRefresh = false) => {
        if (!user?.firebaseUser) return;

        try {
            // Check cache first unless force refresh
            if (!forceRefresh) {
                const cachedNotes = getCachedNotes();
                if (cachedNotes !== null) {
                    setNotes(cachedNotes);
                    setNotesLoading(false);
                    return;
                }
            }
            
            // Only set loading when we actually need to fetch
            setNotesLoading(true);
            console.log('🔄 Fetching fresh notes data');
            
            const response = await fetch(`${API_BASE_URL}/api/personal-notes`, {
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Notes fetched successfully:', data.notes);
                setNotes(data.notes || []);
                setCachedNotes(data.notes || []);
            } else {
                console.error('Failed to fetch notes:', response.status, response.statusText);
                showFlashMessage('Failed to fetch notes', 'error');
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
            showFlashMessage('Failed to fetch notes', 'error');
        } finally {
            setNotesLoading(false);
        }
    }, [user?.firebaseUser, getCachedNotes, setCachedNotes, showFlashMessage]);

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteFormData.title.trim() || !noteFormData.content.trim()) {
            showFlashMessage('Title and content are required', 'error');
            return;
        }

        setAddingNote(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(noteFormData)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Note added successfully:', data.note);
                // Update local state and cache
                const updatedNotes = [data.note, ...notes];
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                setNoteFormData({ title: '', content: '', category: 'general' });
                setShowAddNoteForm(false);
                showFlashMessage('Note added successfully!', 'success');
            } else {
                const errorData = await response.json();
                console.error('Failed to add note:', response.status, errorData);
                showFlashMessage(errorData.error || 'Failed to add note', 'error');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            showFlashMessage('Failed to add note', 'error');
        } finally {
            setAddingNote(false);
        }
    };

    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!noteFormData.title.trim() || !noteFormData.content.trim()) {
            showFlashMessage('Title and content are required', 'error');
            return;
        }

        setAddingNote(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${editingNote.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(noteFormData)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Note updated successfully:', data.note);
                // Update local state and cache
                const updatedNotes = notes.map(note => 
                    note.id === editingNote.id 
                        ? { ...note, ...data.note }
                        : note
                );
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                setEditingNote(null);
                setNoteFormData({ title: '', content: '', category: 'general' });
                setShowAddNoteForm(false);
                showFlashMessage('Note updated successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to update note', 'error');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            showFlashMessage('Failed to update note', 'error');
        } finally {
            setAddingNote(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                console.log('Note deleted successfully');
                // Update local state and cache
                const updatedNotes = notes.filter(note => note.id !== noteId);
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                showFlashMessage('Note deleted successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to delete note', 'error');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            showFlashMessage('Failed to delete note', 'error');
        }
    };

    const handleTogglePin = async (noteId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${noteId}/pin`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Note pin toggled successfully:', data.note);
                // Update local state and cache
                const updatedNotes = notes.map(note => 
                    note.id === noteId 
                        ? { ...note, is_pinned: data.note.is_pinned, updated_at: data.note.updated_at }
                        : note
                );
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                showFlashMessage(data.note.is_pinned ? 'Note pinned!' : 'Note unpinned!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to toggle pin status', 'error');
            }
        } catch (error) {
            console.error('Error toggling pin status:', error);
            showFlashMessage('Failed to toggle pin status', 'error');
        }
    };

    const startEditing = (note) => {
        setEditingNote(note);
        setNoteFormData({
            title: note.title,
            content: note.content,
            category: note.category
        });
        setShowAddNoteForm(true);
    };

    const cancelEditing = () => {
        setEditingNote(null);
        setNoteFormData({ title: '', content: '', category: 'general' });
        setShowAddNoteForm(false);
    };

    const handleViewNote = (note) => {
        setViewingNote(note);
    };

    const handleBackToList = () => {
        setViewingNote(null);
    };

    const handleDeleteClick = (noteId) => {
        setShowDeleteConfirm(noteId);
    };

    const handleDeleteConfirm = async (noteId) => {
        await handleDeleteNote(noteId);
        setShowDeleteConfirm(null);
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(null);
    };

    // Close delete confirmation when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDeleteConfirm && !event.target.closest('.delete-confirmation-container')) {
                setShowDeleteConfirm(null);
            }
        };

        if (showDeleteConfirm) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showDeleteConfirm]);

    // Function to fetch companies for filtering (super_admin only)
    const fetchCompanies = useCallback(async () => {
        // Only super_admin can access the companies endpoint
        if (user?.role !== 'super_admin') {
            console.log('Companies filtering not available for role:', user?.role);
            return;
        }
        
        if (loadingCompanies || companiesFetchedRef.current) return;
        
        setLoadingCompanies(true);
        try {
            console.log('Fetching companies from:', `${API_BASE_URL}/api/clients`);
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch companies: ${response.status} ${response.statusText}`);
            }
            const companiesData = await response.json();
            setCompanies(companiesData);
            companiesFetchedRef.current = true; // Mark as fetched
        } catch (error) {
            console.error('Error fetching companies:', error);
            // Don't call showFlashMessage here to avoid dependency issues
            console.error('Failed to load companies for filtering');
        } finally {
            setLoadingCompanies(false);
        }
    }, [loadingCompanies, user]); // Added user dependency

    // Function to fetch available engineers
    const fetchEngineers = useCallback(async () => {
        // Check persistent cache first
        const cachedEngineers = getEngineersCache();
        if (cachedEngineers && cachedEngineers.length > 0) {
            console.log('📦 Using cached engineers from localStorage');
            setAvailableEngineers(cachedEngineers);
            engineersCacheRef.current = cachedEngineers;
            engineersFetchedRef.current = true;
            return;
        }

        // Check in-memory cache
        if (engineersCacheRef.current && engineersCacheRef.current.length > 0) {
            console.log('Using cached engineers from memory');
            setAvailableEngineers(engineersCacheRef.current);
            return;
        }

        // Prevent unnecessary re-fetching if engineers are already loaded
        if (engineersFetchedRef.current) {
            console.log('Engineers already fetched, skipping fetch');
            return;
        }

        try {
            setEngineersLoading(true);
            // Fetch engineers directly from Firestore users collection
            // Look for users with roles 'support', 'admin', and 'site_admin' for assignment
            const usersRef = collection(db, 'users');
            
            // For site_admin users, show all available engineers (support, admin, site_admin)
            // For other users, show only support engineers as before
            let engineersQuery;
            if (user && user.role === 'site_admin') {
                // Site admin can see all engineers for assignment
                engineersQuery = query(usersRef, where('role', 'in', ['support', 'admin', 'site_admin']));
            } else {
                // Other users see support engineers and super admins
                engineersQuery = query(usersRef, where('role', 'in', ['support', 'super_admin']));
            }
            
            const snapshot = await getDocs(engineersQuery);
            
            if (!snapshot.empty) {
                const engineers = snapshot.docs.map(doc => {
                    const userData = doc.data();
                    return {
                        id: doc.id,
                        name: userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.email),
                        email: userData.email,
                        role: userData.role
                    };
                });
                
                setAvailableEngineers(engineers);
                engineersCacheRef.current = engineers; // Cache in memory
                setEngineersCache(engineers); // Cache in localStorage
                engineersFetchedRef.current = true;
                return;
            } else {
                setAvailableEngineers([]);
                if (user && user.role === 'site_admin') {
                    showFlashMessage('No engineers found in the system. Please add users with support, admin, or site_admin roles.', 'info');
                } else {
                    showFlashMessage('No engineers found in the system. Please add users with "support" or "super_admin" role.', 'info');
                }
            }
            
        } catch (error) {
            console.error('Error in fetchEngineers:', error);
            setAvailableEngineers([]);
            showFlashMessage('Failed to load engineers. Please check your connection and try again.', 'error');
        } finally {
            setEngineersLoading(false);
        }
    }, [showFlashMessage, db, user?.role]);

    // Function to handle ticket selection
    const handleTicketSelection = (ticketId) => {
        setSelectedTickets(prev => {
            if (prev.includes(ticketId)) {
                return prev.filter(id => id !== ticketId);
            } else {
                return [...prev, ticketId];
            }
        });
    };

    // Function to handle individual ticket assignment
    const handleTicketAssignment = async (ticketId, assignedToEmail) => {
        try {
            // Add ticket to loading set
            setAssigningTickets(prev => new Set(prev).add(ticketId));
            
            // If unassigned, set to null
            const assignmentValue = assignedToEmail === 'unassigned' ? null : assignedToEmail;
            
            // Update the ticket assignment via API
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify({
                    assigned_to_email: assignmentValue
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to assign ticket');
            }

            // Update local state immediately for better UX
            setAllTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId 
                        ? { ...ticket, assigned_to_email: assignmentValue, updated_at: new Date().toISOString() }
                        : ticket
                )
            );

            showFlashMessage(
                assignmentValue 
                    ? `Ticket assigned to ${assignedToEmail}` 
                    : 'Ticket unassigned successfully', 
                'success'
            );

            // Refresh data to ensure consistency
            if (refreshTicketsData) {
                refreshTicketsData();
            }

        } catch (error) {
            console.error('Error assigning ticket:', error);
            showFlashMessage(`Failed to assign ticket: ${error.message}`, 'error');
        } finally {
            // Remove ticket from loading set
            setAssigningTickets(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticketId);
                return newSet;
            });
        }
    };

    // Function to handle individual ticket status change
    const handleTicketStatusChange = async (ticketId, newStatus) => {
        try {
            // Add ticket to loading set
            setChangingStatusTickets(prev => new Set(prev).add(ticketId));
            
            // Update the ticket status via API
            const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update ticket status');
            }

            // Update local state immediately for better UX
            setAllTickets(prevTickets => 
                prevTickets.map(ticket => 
                    ticket.id === ticketId 
                        ? { ...ticket, status: newStatus, updated_at: new Date().toISOString() }
                        : ticket
                )
            );

            showFlashMessage(`Ticket status updated to ${newStatus}`, 'success');

        } catch (error) {
            console.error('Error updating ticket status:', error);
            showFlashMessage(`Failed to update ticket status: ${error.message}`, 'error');
        } finally {
            // Remove ticket from loading set
            setChangingStatusTickets(prev => {
                const newSet = new Set(prev);
                newSet.delete(ticketId);
                return newSet;
            });
        }
    };


    // Function to enter assign mode
    const enterAssignMode = () => {
        if (!canAssign || user?.role === 'site_admin') return;
        setAssignMode(true);
        setShowCheckboxes(true);
        setSelectedTickets([]); // Clear previous selections - NO auto-selection
    };

    // Function to exit assign mode
    const exitAssignMode = () => {
        setAssignMode(false);
        setShowCheckboxes(false);
        setSelectedTickets([]);
        setShowAssignPopup(false);
    };

    // Function to copy ticket ID to clipboard
    const copyTicketId = async (ticketId) => {
        try {
            await navigator.clipboard.writeText(ticketId);
            // Update popup state to show success
            setTicketIdPopup(prev => ({ ...prev, copyStatus: 'id_copied' }));
            setTimeout(() => {
                setTicketIdPopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy ticket ID:', err);
            setTicketIdPopup(prev => ({ ...prev, copyStatus: 'id_error' }));
            setTimeout(() => {
                setTicketIdPopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        }
    };

    // Function to copy ticket URL to clipboard
    const copyTicketUrl = async (documentId) => {
        try {
            const ticketUrl = `${window.location.origin}/tickets/${documentId}`;
            await navigator.clipboard.writeText(ticketUrl);
            // Update popup state to show success
            setTicketIdPopup(prev => ({ ...prev, copyStatus: 'url_copied' }));
            setTimeout(() => {
                setTicketIdPopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy ticket URL:', err);
            setTicketIdPopup(prev => ({ ...prev, copyStatus: 'url_error' }));
            setTimeout(() => {
                setTicketIdPopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        }
    };

    // Function to open ticket
    const openTicket = (documentId) => {
        navigateTo(`/tickets/${documentId}`);
    };

    // Function to copy user email to clipboard
    const copyUserEmail = async (email) => {
        try {
            await navigator.clipboard.writeText(email);
            // Update popup state to show success
            setProfilePopup(prev => ({ ...prev, copyStatus: 'email_copied' }));
            setTimeout(() => {
                setProfilePopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy email:', err);
            setProfilePopup(prev => ({ ...prev, copyStatus: 'email_error' }));
            setTimeout(() => {
                setProfilePopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        }
    };

    // Function to copy user full name to clipboard
    const copyUserName = async (fullName) => {
        try {
            await navigator.clipboard.writeText(fullName);
            // Update popup state to show success
            setProfilePopup(prev => ({ ...prev, copyStatus: 'name_copied' }));
            setTimeout(() => {
                setProfilePopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy name:', err);
            setProfilePopup(prev => ({ ...prev, copyStatus: 'name_error' }));
            setTimeout(() => {
                setProfilePopup(prev => ({ ...prev, copyStatus: null }));
            }, 2000);
        }
    };

    // Function to show ticket ID popup
    const showTicketIdPopup = (ticketId, documentId, event) => {
        if (ticketIdPopupHideTimeout.current) {
            clearTimeout(ticketIdPopupHideTimeout.current);
        }
        
        // Store the event target reference to avoid null reference errors
        const targetElement = event.currentTarget;
        
        // Show popup immediately on hover
        // Check if the element still exists and is in the DOM
        if (!targetElement || !document.contains(targetElement)) {
            return;
        }
        
        try {
            const rect = targetElement.getBoundingClientRect();
            setTicketIdPopup({
                visible: true,
                ticketId: ticketId,
                documentId: documentId,
                position: {
                    x: rect.left + rect.width / 2,
                    y: rect.bottom - 10// Position very close to the ticket ID
                }
            });
        } catch (error) {
            console.warn('Error getting bounding rect for popup:', error);
        }
    };

    // Function to hide ticket ID popup
    const hideTicketIdPopup = () => {
        // Clear the show timeout if it exists
        if (ticketIdPopupShowTimeout.current) {
            clearTimeout(ticketIdPopupShowTimeout.current);
            ticketIdPopupShowTimeout.current = null;
        }
        
        ticketIdPopupHideTimeout.current = setTimeout(() => {
            if (!ticketIdPopupHovered) {
                setTicketIdPopup(prev => ({ ...prev, visible: false }));
            }
        }, 150);
    };

    // Function to handle popup hover
    const handleTicketIdPopupHover = () => {
        setTicketIdPopupHovered(true);
        if (ticketIdPopupHideTimeout.current) {
            clearTimeout(ticketIdPopupHideTimeout.current);
        }
        // Also clear any pending show timeout
        if (ticketIdPopupShowTimeout.current) {
            clearTimeout(ticketIdPopupShowTimeout.current);
            ticketIdPopupShowTimeout.current = null;
        }
    };

    // Function to handle popup leave
    const handleTicketIdPopupLeave = () => {
        setTicketIdPopupHovered(false);
        // Clear any pending timeouts
        if (ticketIdPopupHideTimeout.current) {
            clearTimeout(ticketIdPopupHideTimeout.current);
        }
        if (ticketIdPopupShowTimeout.current) {
            clearTimeout(ticketIdPopupShowTimeout.current);
        }
        // Immediately hide the popup
        setTicketIdPopup(prev => ({ ...prev, visible: false }));
    };

    // Function to exit export selection mode
    const exitExportSelectionMode = () => {
        setAssignMode(false);
        setShowCheckboxes(false);
        setSelectedTickets([]);
        setShowExportPopup(false);
    };

    // Function to clear all filters
    const clearAllFilters = () => {
        setFilterBy('status');
        setFilterStatus('');
        setFilterPriority('');
        setFilterAssignment('');
        setFilterCompany('');
    };

    // Profile popup functions
    const showProfilePopup = (user, event) => {
        if (popupHideTimeout.current) clearTimeout(popupHideTimeout.current);
        if (popupShowTimeout.current) clearTimeout(popupShowTimeout.current);
        // Show popup immediately on hover
        const rect = event.target.getBoundingClientRect();
        setProfilePopup({ 
            visible: true, 
            user, 
            position: { 
                x: rect.left + rect.width / 2, 
                y: rect.bottom + 8 // Position further away from the element
            } 
        });
    };

    const cancelShowProfilePopup = () => {
        if (popupShowTimeout.current) clearTimeout(popupShowTimeout.current);
    };

    const hideProfilePopup = () => {
        popupHideTimeout.current = setTimeout(() => {
            if (!popupHovered) {
                setProfilePopup((prev) => ({ ...prev, visible: false }));
            }
        }, 150);
    };

    // Function to enter export selection mode
    const enterExportSelectionMode = () => {
        setAssignMode(false);
        setShowCheckboxes(true);
        setSelectedTickets([]); // Clear previous selections - NO auto-selection
    };

    // Function to select only unassigned tickets for assignment
    const selectUnassignedTickets = () => {
        const unassignedTicketIds = paginatedTickets
            .filter(ticket => !ticket.assigned_to_email)
            .map(ticket => ticket.id);
        setSelectedTickets(unassignedTicketIds);
    };

    // Function to handle bulk assignment
    const handleBulkAssign = async () => {
        if (!selectedEngineer || selectedTickets.length === 0) {
            showFlashMessage('Please select an engineer and tickets to assign', 'error');
            return;
        }

        setAssignLoading(true);
        try {
            // Firebase SDK handles authentication automatically when user is signed in
            // No need to manually check for tokens
            
            // Get the assigned user information first
            const assignedUserQuery = query(
                collection(dbClient, 'users'),
                where('email', '==', selectedEngineer)
            );
            const assignedUserSnapshot = await getDocs(assignedUserQuery);
            if (assignedUserSnapshot.empty) {
                throw new Error(`Engineer ${selectedEngineer} not found in users collection`);
            }
            const assignedUser = assignedUserSnapshot.docs[0];
            
            // First, test if the backend is reachable
            console.log('Testing backend connectivity...');
            console.log('API_BASE_URL:', API_BASE_URL);
            console.log('User role:', user.role);
            console.log('User email:', user.email);

            // Test backend connectivity first
            try {
                const testResponse = await fetch(`${API_BASE_URL}/tickets/summary-counts`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                    }
                });
                console.log('Backend connectivity test result:', testResponse.status, testResponse.statusText);
            } catch (testError) {
                console.error('Backend connectivity test failed:', testError);
                showFlashMessage('Cannot connect to backend server. Please check if the server is running.', 'error');
                return;
            }

            // Process each ticket individually since there's no bulk endpoint
            const assignmentPromises = selectedTickets.map(async (ticketId) => {
                try {
                    // Find the ticket data to get the current assignment
                    const ticket = allTickets.find(t => t.id === ticketId);
                    if (!ticket) {
                        console.warn(`Ticket ${ticketId} not found in current data`);
                        return { success: false, ticketId, error: 'Ticket not found' };
                    }

                    // Update the ticket assignment in Firestore directly
                    const ticketRef = doc(db, 'tickets', ticketId);
                    
                    // Trigger the existing backend assignment email system FIRST (before updating Firestore)
                    // This ensures the backend sees the original assignment value and can detect the change
                    try {
                        console.log(`Attempting to trigger email for ticket ${ticket.display_id}...`);
                        console.log(`Current assignment: ${ticket.assigned_to_email || 'unassigned'}`);
                        console.log(`New assignment: ${selectedEngineer}`);
                        console.log(`Ticket data:`, {
                            id: ticket.id,
                            display_id: ticket.display_id,
                            reporter_email: ticket.reporter_email,
                            request_for_email: ticket.request_for_email,
                            current_assigned: ticket.assigned_to_email
                        });
                        
                        const token = await user.firebaseUser.getIdToken();
                        console.log(`Got token, calling backend for ticket ${ticket.display_id}...`);
                        
                        const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
                            method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                                assigned_to_email: selectedEngineer
                })
            });

                        console.log(`Backend response for ticket ${ticket.display_id}:`, response.status, response.statusText);
                        
                        if (response.ok) {
                            const responseData = await response.json();
                            console.log(`Email notification triggered for ticket ${ticket.display_id}:`, responseData);
                        } else {
                            const errorData = await response.text();
                            console.warn(`Failed to trigger email for ticket ${ticket.display_id}:`, response.status, response.statusText, errorData);
                        }
                    } catch (emailError) {
                        console.error(`Error triggering email for ticket ${ticket.display_id}:`, emailError);
                        // Don't fail the assignment if email fails
                    }

                    // Now update the ticket in Firestore
                    await updateDoc(ticketRef, {
                        assigned_to_email: selectedEngineer,
                        assigned_to_id: assignedUser.id,
                        updated_at: new Date()
                    });

                    return { success: true, ticketId };
                } catch (error) {
                    console.error(`Error assigning ticket ${ticketId}:`, error);
                    return { success: false, ticketId, error: error.message };
                }
            });

            // Wait for all assignments to complete
            const results = await Promise.all(assignmentPromises);
            
            // Count successful and failed assignments
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            if (successful.length > 0) {
                showFlashMessage(`Successfully assigned ${successful.length} tickets to ${selectedEngineer}`, 'success');
                
                // Update local state immediately for real-time UI updates
                console.log('🔄 Updating local state immediately for real-time updates...');
                setAllTickets(prevTickets => 
                    prevTickets.map(ticket => {
                        if (selectedTickets.includes(ticket.id)) {
                            return {
                                ...ticket,
                                assigned_to_email: selectedEngineer,
                                assigned_to_id: assignedUser?.id,
                                updated_at: new Date().toISOString()
                            };
                        }
                        return ticket;
                    })
                );
                
                // Clear cache to ensure WebSocket updates are processed
                clearCache();
                
                // Trigger WebSocket refresh
                if (refreshTicketsData) {
                    console.log('🔄 Triggering WebSocket data refresh...');
                    refreshTicketsData();
                }
                
                // Show success state in popup
                setAssignSuccess(true);
            }
            
            if (failed.length > 0) {
                showFlashMessage(`Failed to assign ${failed.length} tickets. Check console for details.`, 'error');
                console.error('Failed assignments:', failed);
            }

            // Clear selection and close popup
            setSelectedTickets([]);
            setSelectedEngineer('');
            setShowAssignPopup(false);
            
            // Exit assign mode after successful assignment
            exitAssignMode();
            
            // The real-time listener will automatically update the UI
            // since we're updating the Firestore documents directly
            
        } catch (error) {
            console.error('Error in bulk assignment:', error);
            showFlashMessage(`Failed to assign tickets: ${error.message}`, 'error');
        } finally {
            setAssignLoading(false);
        }
    };



    // Get location for URL parameters
    const location = useLocation();

    // Read URL parameters for initial filtering - only run once on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const statusParam = urlParams.get('status');
        const assignmentParam = urlParams.get('assignment');
        
        
        if (statusParam) {
            setFilterStatus(statusParam);
            setFilterBy('status');
        }
        
        if (assignmentParam) {
            setFilterAssignment(assignmentParam);
        }
    }, []); // Only run once on mount, not on every location change

    // Check and reset company filter if user doesn't have permission
    useEffect(() => {
        const hasCompanyFilterPermission = user?.role === 'super_admin';
        
        
        if (filterBy === 'company' && !hasCompanyFilterPermission) {
            setFilterBy('status');
            // Don't reset the company filter - preserve the selection for when they switch back
        }
    }, [user?.role, filterBy]);

    // Fetch companies when filterBy changes to 'company' (if not already loaded) - super_admin only
    useEffect(() => {
        if (user?.role === 'super_admin' && filterBy === 'company' && companies.length === 0 && !loadingCompanies) {
            fetchCompanies();
        }
    }, [filterBy, user?.role]); // Remove companies.length from dependencies to prevent unnecessary re-fetching

    // Fetch companies when component mounts (only once) - super_admin only
    useEffect(() => {
        // Only fetch if user is super_admin and companies haven't been loaded yet
        if (user?.role === 'super_admin' && !companiesFetchedRef.current && !loadingCompanies) {
            fetchCompanies();
        }
    }, [user?.role]); // Only run when user role changes


    // Only allow assign mode and engineer loading for super_admin, admin, support (NOT site_admin)
    const canAssign = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support';

    // Fetch notes when panel opens
    useEffect(() => {
        if (showNotesPanel && user?.firebaseUser) {
            // Check cache first - this is synchronous so no loading state needed
            const cachedNotes = getCachedNotes();
            if (cachedNotes !== null) {
                console.log('📦 Loading notes from cache on panel open, notes count:', cachedNotes.length);
                setNotes(cachedNotes);
                setNotesLoading(false);
                return; // Exit early, no loading state
            }
            
            // Only fetch if no cached data
            fetchNotes();
        }
    }, [showNotesPanel, user, getCachedNotes, fetchNotes]);

    // Filter notes
    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(notesSearchTerm.toLowerCase()) ||
                            note.content.toLowerCase().includes(notesSearchTerm.toLowerCase());
        const matchesCategory = notesSelectedCategory === 'all' || note.category === notesSelectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Separate pinned and unpinned notes
    const pinnedNotes = filteredNotes.filter(note => note.is_pinned).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const unpinnedNotes = filteredNotes.filter(note => !note.is_pinned).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Peek functionality
    const handlePeekTicket = (ticket) => {
        setPeekedTicket(ticket);
        setShowPeekPanel(true);
    };

    const handleClosePeek = () => {
        setShowPeekPanel(false);
        setPeekedTicket(null);
    };


    // Fetch engineers for assignment dropdowns - single useEffect with better caching
    useEffect(() => {
        if (user?.role === 'support' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'engineer') {
            // Check persistent cache first
            const cachedEngineers = getEngineersCache();
            if (cachedEngineers && cachedEngineers.length > 0) {
                console.log('📦 Loading engineers from localStorage cache');
                setAvailableEngineers(cachedEngineers);
                engineersCacheRef.current = cachedEngineers;
                engineersFetchedRef.current = true;
                return;
            }
            
            // Check if we have cached engineers in memory
            if (engineersCacheRef.current && engineersCacheRef.current.length > 0) {
                setAvailableEngineers(engineersCacheRef.current);
                engineersFetchedRef.current = true; // Mark as fetched
                return;
            }
            
            // Only fetch if not already fetched and no cache
            if (!engineersFetchedRef.current) {
                fetchEngineers();
            }
        }
    }, [user?.role]); // Only depend on user role to prevent infinite loop

    // No cleanup needed - let cache persist across component mounts
    // This prevents unnecessary re-fetching of engineers data

    // Status options for dropdown
    const statusOptions = [
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Hold', label: 'Hold' },
        { value: 'Cancelled', label: 'Cancelled' }
    ];



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

    // Initialize with cached data on mount
    useEffect(() => {
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('📦 Loading tickets from cache');
            setAllTickets(cachedData);
            setLoading(false);
            setError(null);
            setCacheStatus('cached');
        } else {
            setCacheStatus('loading');
        }
    }, []); // Only run once on mount

    // Update local state when tickets data changes
    useEffect(() => {
        if (ticketsData) {
            console.log('🔄 Loading tickets from API - ticketsData received:', ticketsData.length, 'tickets');
            // Apply search filtering if needed
            let filteredTickets = ticketsData;
            
            if (searchKeyword && searchKeyword.toUpperCase().startsWith('TICKET-')) {
                const exactId = searchKeyword.toUpperCase();
                filteredTickets = ticketsData.filter(ticket => 
                    ticket.display_id === exactId
                );
            }
            
            setAllTickets(filteredTickets);
            setCachedData(filteredTickets); // Cache the data
            setLoading(false);
            setError(null);
            setCacheStatus('fresh');
        }
    }, [ticketsData, searchKeyword]);

    // Only refresh tickets data when user changes (not on every mount)
    useEffect(() => {
        if (user?.uid) {
            // Check if we have cached data first
            const cachedData = getCachedData();
            if (!cachedData) {
                console.log('🔄 No cached data found, loading tickets data');
                refreshTicketsData();
            } else {
                console.log('📦 Using cached data, no refresh needed');
            }
        }
    }, [user?.uid]); // Removed refreshTicketsData from dependencies to prevent unnecessary refreshes

    // Listen for real-time updates via WebSocket instead of polling
    useEffect(() => {
        if (!user?.uid) return;

        // Set up a more efficient refresh strategy
        const handleVisibilityChange = () => {
            if (!document.hidden && user?.uid) {
                // Only refresh when user returns to the tab and data might be stale
                const lastRefresh = localStorage.getItem(`last_tickets_refresh_${user.uid}`);
                const now = Date.now();
                const fiveMinutes = 5 * 60 * 1000;
                
                if (!lastRefresh || (now - parseInt(lastRefresh)) > fiveMinutes) {
                    console.log('🔄 Refreshing tickets on tab focus (data may be stale)');
                    refreshTicketsData();
                    localStorage.setItem(`last_tickets_refresh_${user.uid}`, now.toString());
                }
            }
        };

        // Listen for custom events that indicate data changes
        const handleDataChange = (event) => {
            if (event.detail?.type === 'ticket_created' || event.detail?.type === 'ticket_updated') {
                console.log('🔄 Data change detected, refreshing tickets');
                refreshTicketsData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('ticketDataChanged', handleDataChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('ticketDataChanged', handleDataChange);
        };
    }, [user?.uid, refreshTicketsData]);

    // Handle loading and error states
    useEffect(() => {
        if (ticketsLoading !== undefined) {
            setLoading(ticketsLoading);
        }
        if (ticketsError) {
            setError(`Failed to load tickets: ${ticketsError}`);
            showFlashMessage(`Failed to load tickets: ${ticketsError}`, 'error');
            setLoading(false);
        }
    }, [ticketsLoading, ticketsError]);


    /**
     * Effect hook to apply client-side filtering (status, assignment, general search)
     * whenever `allTickets` (the raw data from Firestore) or filter states change.
     */
    useEffect(() => {
        let currentFilteredTickets = [...allTickets]; // Start with all tickets fetched by Firestore

        // If user is a site_admin, filter tickets by their company/client
        if (user && user.role === 'site_admin') {
            if (user.client_name) {
        // Site admin filtering tickets
                currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                    const ticketClientName = ticket.client_name || ticket.companyName;
                    const matches = ticketClientName === user.client_name || ticketClientName === user.companyName;
                    // Filtered out ticket
                    return matches;
                });
                // After site admin filtering
            } else {
                console.warn("Site admin user doesn't have client_name field - showing all tickets");
                showFlashMessage('Warning: Site admin profile missing company information. Showing all tickets.', 'warning');
            }
        } else {
        }

        // Always filter out 'Closed', 'Resolved', and 'Cancelled' tickets from being displayed in the grid
        // UNLESS there's a search keyword or history filter is active, in which case include all tickets
        if (!searchKeyword && filterBy !== 'history') {
            currentFilteredTickets = currentFilteredTickets.filter(ticket => !['Closed', 'Resolved', 'Cancelled'].includes(ticket.status));
        }
        // Apply status filter based on filterStatus state
        // If filterStatus is an empty string, no status filter is applied, showing all statuses
        if (filterBy === 'status' && filterStatus) {
            console.log('Applying status filter:', filterStatus);
            const beforeCount = currentFilteredTickets.length;
            currentFilteredTickets = currentFilteredTickets.filter(ticket => ticket.status === filterStatus);
            console.log(`Status filter applied: ${beforeCount} -> ${currentFilteredTickets.length} tickets`);
        }

        // Apply assignment filter
        if (filterAssignment) {
            if (filterAssignment === 'unassigned') {
                currentFilteredTickets = currentFilteredTickets.filter(ticket => !ticket.assigned_to_email);
            } else if (filterAssignment === 'assigned_to_me') {
                currentFilteredTickets = currentFilteredTickets.filter(ticket => ticket.assigned_to_email === user?.email);
            }
        }

        // Apply client-side search keyword filter (only if it wasn't handled fully by Firestore query)
        if (searchKeyword && !searchKeyword.toUpperCase().startsWith('TICKET-')) {
            const lowercasedKeyword = searchKeyword.toLowerCase();
            currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                const displayId = (ticket.display_id || '').toLowerCase();
                const shortDescription = (ticket.short_description || '').toLowerCase();
                const reporterEmail = (ticket.reporter_email || '').toLowerCase();
                const assignedToEmail = (ticket.assigned_to_email || '').toLowerCase();

                return (
                    displayId.includes(lowercasedKeyword) ||
                    shortDescription.includes(lowercasedKeyword) || // Corrected typo here
                    reporterEmail.includes(lowercasedKeyword) ||
                    assignedToEmail.includes(lowercasedKeyword)
                );
            });
        }

        // Apply priority filter
        if (filterBy === 'priority' && filterPriority) {
            // Debug: log priorities
            console.log('Filtering by priority:', filterPriority);
            console.log('Ticket priorities:', currentFilteredTickets.map(t => t.priority));
            currentFilteredTickets = currentFilteredTickets.filter(ticket => (ticket.priority || '').toLowerCase() === filterPriority.toLowerCase());
        }

        // Apply history filter - show only closed and cancelled tickets
        if (filterBy === 'history') {
            console.log('Applying history filter - showing closed and cancelled tickets only');
            const beforeCount = currentFilteredTickets.length;
            currentFilteredTickets = currentFilteredTickets.filter(ticket => ['Closed', 'Resolved', 'Cancelled'].includes(ticket.status));
            console.log(`History filter applied: ${beforeCount} -> ${currentFilteredTickets.length} tickets`);
        }

        // Always apply company filter if filterCompany is set
        if (filterCompany) {
            currentFilteredTickets = currentFilteredTickets.filter(ticket => {
                const ticketCompany = ticket.client_name || ticket.companyName;
                return ticketCompany === filterCompany;
            });
        }
        
        // Final filtered tickets count

        setDisplayedTickets(currentFilteredTickets); // Update displayed tickets
    }, [allTickets, filterStatus, filterPriority, filterBy, filterAssignment, filterCompany, searchKeyword, user?.uid, user?.role, user?.client_name]); // Removed companies.length to prevent unnecessary re-renders


    // Effect hook to measure message box height and set up auto-hide timer - only run once on mount
    useEffect(() => {
        // Reset message visibility and animation states
        setShowMessage(true);
        setMessageOpacity(1);
        setMessageTransform('translateY(0)');
        setMessageMarginBottom('1rem'); // Reset margin to initial Tailwind 'mb-4' which is 1rem

        // NEW: Measure the message box height once it's rendered
        if (messageBoxRef.current) {
            // Get clientHeight (includes padding) + any rendered margin-bottom
            const computedStyle = getComputedStyle(messageBoxRef.current);
            const height = messageBoxRef.current.offsetHeight; // Includes padding and border
            const marginBottom = parseFloat(computedStyle.marginBottom);
            initialMessageBoxHeight.current = height + marginBottom; // Total space occupied
        }

        // NEW: Automatically close message after 2 seconds when the component mounts
        const timer = setTimeout(() => {
            handleCloseMessage();
        }, 2000); // 2000 milliseconds = 2 seconds

        // Cleanup the timer if the component unmounts
        return () => clearTimeout(timer);
    }, []); // Only run once on mount


    // Effect hook to handle clicks outside the export popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if click is outside the popup and not on the export button itself
            if (exportPopupRef.current && !exportPopupRef.current.contains(event.target) &&
                exportButtonRef.current && !exportButtonRef.current.contains(event.target)) {
                setShowExportPopup(false);
                setExportSuccess(false); // Reset success message when closing popup
            }
        };

        if (showExportPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showExportPopup]);

    // Effect hook to handle clicks outside the assign popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if click is outside the assign popup
            if (assignPopupRef.current && !assignPopupRef.current.contains(event.target)) {
                setShowAssignPopup(false);
            }
        };

        if (showAssignPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAssignPopup]);

    // Effect hook to handle clicks outside the profile popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close profile popup if clicking outside
            if (profilePopup.visible) {
                // Check if the click is on the popup itself
                const popupElement = document.querySelector('[data-profile-popup]');
                if (popupElement && popupElement.contains(event.target)) {
                    return; // Don't close if clicking on the popup
                }
                setProfilePopup(prev => ({ ...prev, visible: false }));
            }
        };

        if (profilePopup.visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [profilePopup.visible]);

    // Cleanup effect for ticket ID popup timeouts
    useEffect(() => {
        return () => {
            if (ticketIdPopupHideTimeout.current) {
                clearTimeout(ticketIdPopupHideTimeout.current);
                ticketIdPopupHideTimeout.current = null;
            }
            if (ticketIdPopupShowTimeout.current) {
                clearTimeout(ticketIdPopupShowTimeout.current);
                ticketIdPopupShowTimeout.current = null;
            }
        };
    }, []);

    // Effect hook to handle clicks outside the ticket ID popup to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close ticket ID popup if clicking outside
            if (ticketIdPopup.visible) {
                // Check if the click is on the popup itself
                const popupElement = document.querySelector('[data-ticket-id-popup]');
                if (popupElement && popupElement.contains(event.target)) {
                    return; // Don't close if clicking on the popup
                }
                setTicketIdPopup(prev => ({ ...prev, visible: false }));
            }
        };

        if (ticketIdPopup.visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ticketIdPopup.visible]);

    /**
     * Helper function to safely get a date string in ISO-MM-DD format.
     * Returns an empty string if the date is invalid or an error occurs.
     * @param {Date | string} dateInput - The date object or date string.
     * @returns {string} Formatted date string or empty string.
     */
    const getSafeDateStringForFilename = (dateInput) => {
        try {
            const d = new Date(dateInput);
            // Check if the date is valid (not "Invalid Date")
            if (isNaN(d.getTime())) {
                return ''; // Return empty string for invalid dates
            }
            return d.toISOString().slice(0, 10);
        } catch (e) {
            console.error("Error formatting date for filename:", e);
            return ''; // Return empty string on error
        }
    };


    /**
     * Handles the export of tickets as a CSV file.
     * Uses start and end date filters for the export.
     */
    const handleExport = async () => {
        setExportSuccess(false); // Reset success state at the start of a new export attempt

        // If tickets are selected for export, use those instead of date range
        if (selectedTickets.length > 0 && !assignMode) {
            // Export selected tickets directly
            await exportSelectedTickets();
            return;
        }

        // Otherwise, use date range export (existing logic)
        if (!startDate || !endDate) {
            showFlashMessage('Please select both a start and an end date for the export.', 'error');
            return;
        }

        if (new Date(endDate) > new Date(today)) {
            showFlashMessage('End date cannot be in the future.', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showFlashMessage('Start date cannot be after the end date.', 'error');
            return;
        }

        setLoading(true); // Indicate loading for export
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const queryParams = new URLSearchParams();
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (exportStatus) queryParams.append('status', exportStatus);

            // Note: The backend endpoint '/tickets/export' still uses HTTP fetch,
            // as real-time export directly from Firestore client is not a typical use case.
            const response = await fetch(`${API_BASE_URL}/tickets/export?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const blob = await response.blob(); // Get response as Blob
                const url = window.URL.createObjectURL(blob); // Create a URL for the Blob
                const a = document.createElement('a'); // Create a temporary anchor element
                a.href = url;
                const exportDateString = getSafeDateStringForFilename(new Date());
                const fileName = `tickets_export_${exportDateString}.csv`;
                a.download = String(fileName);
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                // Instead of a flash message, set success state for the button
                setExportSuccess(true);
                
                // Clear selected tickets after successful export (if any were selected)
                if (selectedTickets.length > 0) {
                    setSelectedTickets([]);
                }
                
                // Exit export selection mode after successful export
                setShowCheckboxes(false);
                
                // Optionally close popup after a short delay
                setTimeout(() => {
                    setShowExportPopup(false);
                    setExportSuccess(false); // Reset for next time
                }, 2000); // Close after 2 seconds
            } else {
                const errorData = await response.json();
                showFlashMessage(`Export failed: ${errorData.error || 'Server error'}`, 'error');
                setExportSuccess(false); // Ensure success state is false on error
            }
        } catch (error) {
            console.error('Export error:', error);
            showFlashMessage('Network error during export.', 'error');
            setExportSuccess(false); // Ensure success state is false on error
        } finally {
            // Keep loading true briefly if success message is displayed on button,
            // or set to false immediately if a different loading indicator is desired.
            // For button-based success, we'll control loading with `exportSuccess` as well.
            if (!exportSuccess) { // Only stop loading if it's not a success scenario (i.e., error occurred)
                 setLoading(false);
            }
        }
    };

    /**
     * Exports selected tickets directly without date range filtering
     */
    const exportSelectedTickets = async () => {
        setLoading(true);
        try {
            // Get the selected ticket data from all displayed tickets (not just current page)
            const selectedTicketData = displayedTickets.filter(ticket => 
                selectedTickets.includes(ticket.id)
            );

            // Create CSV content for selected tickets
            const csvContent = createCSVFromTickets(selectedTicketData);
            
            // Download the CSV file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const exportDateString = getSafeDateStringForFilename(new Date());
            const fileName = `selected_tickets_export_${exportDateString}.csv`;
            a.download = String(fileName);
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setExportSuccess(true);
            
            // Clear selected tickets after successful export
            setSelectedTickets([]);
            
            // Exit export selection mode after successful export
            setShowCheckboxes(false);
            
            // Close popup after success
            setTimeout(() => {
                setShowExportPopup(false);
                setExportSuccess(false);
            }, 2000);
            
        } catch (error) {
            console.error('Export selected tickets error:', error);
            showFlashMessage('Error exporting selected tickets', 'error');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Creates CSV content from ticket data
     */
    const createCSVFromTickets = (tickets) => {
        const headers = [
            'Ticket ID',
            'Short Description',
            'Created Date',
            'Priority',
            'Status',
            'Assigned To',
            'Reporter Email',
            'Request For Email',
            'Created At'
        ];

        const csvRows = [headers.join(',')];

        tickets.forEach(ticket => {
            const row = [
                ticket.display_id || '',
                `"${(ticket.short_description || '').replace(/"/g, '""')}"`, // Escape quotes in description
                ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '',
                ticket.priority || '',
                ticket.status || '',
                ticket.assigned_to_email || 'Unassigned',
                ticket.reporter_email || '',
                ticket.request_for_email || '',
                ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ''
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    };

    /**
     * Toggles the visibility of the export date range popup.
     */
    const toggleExportPopup = () => {
        setShowExportPopup(prev => !prev);
        // Reset dates and success message when showing the popup for a fresh start
        if (!showExportPopup) {
            setStartDate('');
            setEndDate('');
            setExportSuccess(false);
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

    // Memoize assignment options to prevent re-rendering
    const assignmentOptions = useMemo(() => [
        { value: 'unassigned', label: 'Unassigned' },
        ...availableEngineers.map(engineer => ({
            value: engineer.email,
            label: engineer.name || engineer.email.split('@')[0], // Show name or username part of email
            fullLabel: engineer.name ? `${engineer.name} (${engineer.email})` : engineer.email // Full label for tooltip
        }))
    ], [availableEngineers]);

    // Memoize status options to prevent re-rendering
    const memoizedStatusOptions = useMemo(() => 
        statusOptions.map(option => ({
            ...option,
            label: option.label
        }))
    , [statusOptions]);

    // Calculate counts based on the tickets after company filtering
    let ticketsForCounts = filterCompany
        ? allTickets.filter(ticket => {
            const ticketCompany = ticket.client_name || ticket.companyName;
            return ticketCompany === filterCompany;
        })
        : allTickets;

    // Apply site admin filtering to counts if user is site admin
    if (user && user.role === 'site_admin' && user.client_name) {
        ticketsForCounts = ticketsForCounts.filter(ticket => {
            const ticketClientName = ticket.client_name || ticket.companyName;
            const matches = ticketClientName === user.client_name || ticketClientName === user.companyName;
            return matches;
        });
    }
    const counts = {
        total_tickets: searchKeyword 
            ? ticketsForCounts.length 
            : ticketsForCounts.filter(t => ['Open', 'In Progress', 'Hold'].includes(t.status)).length,
        open_tickets: ticketsForCounts.filter(t => t.status === 'Open').length,
        in_progress_tickets: ticketsForCounts.filter(t => t.status === 'In Progress').length,
        hold_tickets: ticketsForCounts.filter(t => t.status === 'Hold').length,
        closed_resolved_tickets: ticketsForCounts.filter(t => ['Closed', 'Resolved'].includes(t.status)).length,
        unassigned: searchKeyword 
            ? ticketsForCounts.filter(t => !t.assigned_to_email).length
            : ticketsForCounts.filter(t => !t.assigned_to_email && !['Closed', 'Resolved', 'Cancelled'].includes(t.status)).length,
        assigned_to_me: allTickets.filter(t => t.assigned_to_email === user?.email).length,
    };
    // Function to determine the page heading based on active filters
    const getPageHeading = useCallback(() => {
        if (searchKeyword) {
            return `Search Results for "${searchKeyword}" (including resolved and cancelled tickets)`;
        }
        return 'Workflow'; // Always show Workflow as the main title
    }, [searchKeyword]);

    // Function to handle closing the message with a fade-out effect and upward movement
    const handleCloseMessage = useCallback(() => {
        if (messageBoxRef.current) {
            // Calculate total height to move up
            const currentHeight = messageBoxRef.current.offsetHeight; // Get current rendered height
            const currentComputedStyle = getComputedStyle(messageBoxRef.current);
            const currentMarginBottom = parseFloat(currentComputedStyle.marginBottom);

            // Set transform to move up by its full height (including its original margin)
            setMessageTransform(`translateY(-${currentHeight + currentMarginBottom}px)`);
            setMessageOpacity(0); // Start fade out
            setMessageMarginBottom(`-${currentHeight}px`); // Set negative margin to pull content up

            // After animation, hide completely
            setTimeout(() => {
                setShowMessage(false);
                setMessageMarginBottom('0'); // Ensure no lingering negative margin
                setMessageTransform('translateY(0)'); // Reset transform for next time it might show
                setMessageOpacity(1); // Reset opacity for next time it might show
            }, 500); // Matches the CSS transition duration
        } else {
            // Fallback if ref is not yet set (e.g., during initial render)
            setMessageOpacity(0);
            setMessageTransform('translateY(-100%)'); // Generic large move up
            setMessageMarginBottom('-5rem'); // Generic large negative margin
            setTimeout(() => {
                setShowMessage(false);
                setMessageMarginBottom('0');
                setMessageTransform('translateY(0)');
                setMessageOpacity(1);
            }, 500);
        }
    }, []); // No dependencies for handleCloseMessage itself, uses refs

    // Conditional rendering for error states only
    const [currentPage, setCurrentPage] = useState(1);
    const ticketsPerPage = 30;
    const totalPages = Math.ceil(displayedTickets.length / ticketsPerPage);
    const paginatedTickets = displayedTickets.slice((currentPage - 1) * ticketsPerPage, currentPage * ticketsPerPage);

    // Only reset to page 1 if the current page is beyond the new total pages
    useEffect(() => { 
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1); 
        }
    }, [displayedTickets.length, currentPage, totalPages]);

    const handlePageChange = (page) => {
      if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    function renderPagination() {
      if (totalPages <= 1) return null;
      const pages = [];
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, start + 2);
      if (end - start < 2) start = Math.max(1, end - 2);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} onClick={() => handlePageChange(i)} className={`mx-0.5 w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors duration-200 border ${i === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}>{i}</button>
        );
      }
      const firstTicket = (currentPage - 1) * ticketsPerPage + 1;
      const lastTicket = Math.min(currentPage * ticketsPerPage, displayedTickets.length);
      return (
        <div className="inline-flex items-center gap-1 align-middle">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={10} /></button>
          {pages}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-6 h-6 flex items-center justify-center rounded-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={10} /></button>
        </div>
      );
    }

    return (
        <>
            <style>{styles}</style>
            {/* Export Popup Overlay and Modal rendered at document.body level for full coverage */}
            {showExportPopup && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black bg-opacity-30" />
                    <div ref={exportPopupRef} className="relative z-10 bg-white border border-gray-300 rounded-md shadow-lg p-6 w-full max-w-md">
                        <button
                            onClick={() => setShowExportPopup(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-semibold mb-4">Export Tickets</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="p-1 border border-gray-300 rounded-md text-sm w-full"
                                max={today}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="p-1 border border-gray-300 rounded-md text-sm w-full"
                                max={today}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <CustomDropdown
                                value={exportStatus}
                                onChange={value => setExportStatus(value)}
                                options={[
                                    { value: '', label: 'All' },
                                    { value: 'Open', label: 'Open' },
                                    { value: 'In Progress', label: 'In Progress' },
                                    { value: 'Hold', label: 'Hold' },
                                    { value: 'Resolved', label: 'Resolved' },
                                    { value: 'Cancelled', label: 'Cancelled' }
                                ]}
                                className="w-full"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowExportPopup(false)}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                disabled={loading || !startDate || !endDate}
                                className="px-3 py-1.5 text-sm font-bold text-green-600 bg-white border border-green-600 rounded-md shadow-sm hover:bg-green-50 hover:border-green-700 hover:text-green-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Exporting...' : 'Confirm Export'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {showAssignPopup && assignMode && user?.role !== 'site_admin' && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-30" 
                        onClick={(e) => {
                            // Only close if clicking directly on the backdrop, not on child elements
                            if (e.target === e.currentTarget) {
                                setShowAssignPopup(false);
                            }
                        }}
                    />
                    <div ref={assignPopupRef} className="relative z-10 bg-white border border-gray-300 rounded-md shadow-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowAssignPopup(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                        <h3 className="text-lg font-semibold mb-4">Assign Tickets to Engineer</h3>
                        
                        {assignLoading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <span className="loader mb-4"></span>
                                <p className="text-sm text-gray-700 text-center">
                                    Assigning selected tickets to <strong>{selectedEngineer}</strong>
                                </p>
                            </div>
                        ) : assignSuccess ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-lg font-semibold text-green-700 text-center mb-2">
                                    Assigned Successfully!
                                </p>
                                <p className="text-sm text-gray-600 text-center">
                                    Tickets have been assigned to <strong>{selectedEngineer}</strong>
                                </p>
                                <button
                                    onClick={() => {
                                        setShowAssignPopup(false);
                                        setAssignSuccess(false);
                                        setSelectedEngineer('');
                                    }}
                                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Engineer</label>
                                    <CustomDropdown
                                        value={selectedEngineer}
                                        onChange={value => setSelectedEngineer(value)}
                                        options={[
                                            { value: '', label: 'Choose an engineer...' },
                                            ...availableEngineers.map(engineer => ({
                                                value: engineer.email,
                                                label: `${engineer.name} (${engineer.email})`
                                            }))
                                        ]}
                                        className="w-full"
                                        disableClickOutside={true}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowAssignPopup(false)}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkAssign}
                                        disabled={!selectedEngineer || assignLoading || availableEngineers.length === 0}
                                        className={`px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-md shadow-sm hover:from-blue-700 hover:to-blue-800 hover:shadow-md transition-all duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        Assign Tickets
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
            {/* Main App Content */}
            <div className={`p-4 pb-2 bg-white flex-1 overflow-auto transition-all duration-300 ${
                showNotesPanel && showPeekPanel ? 'mr-160' : 
                showNotesPanel || showPeekPanel ? 'mr-80' : ''
            }`}>
                {/* Top Bar: Title (left) | Filter Options (center) | Export Tickets (right) */}
                <div className="flex flex-wrap items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-gray-800">
                            {getPageHeading()}
                        </h2>
                        <button
                            onClick={refreshTickets}
                            disabled={loading}
                            className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh tickets data"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    
                    {/* Centered Filter Options */}
                    <div className="flex items-center gap-3 flex-wrap justify-center flex-1">
                        {/* Companies dropdown - super_admin only */}
                        {user?.role === 'super_admin' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">Client:</span>
                            <CompactDropdown
                                value={filterCompany}
                                onChange={value => {
                                    setFilterCompany(value);
                                }}
                                options={[
                                    { value: '', label: 'All Companies' },
                                    ...(loadingCompanies ? 
                                        [{ value: '', label: 'Loading companies...', disabled: true }] :
                                        companies.length === 0 ? 
                                        [{ value: '', label: 'No companies found', disabled: true }] :
                                        companies.map(company => ({
                                            value: company.companyName,
                                            label: company.companyName
                                        }))
                                    )
                                ]}
                                className="w-32"
                            />
                        </div>
                        )}
                        <span className="text-sm font-semibold text-gray-700">Filter By:</span>
                        <div>
                            <CompactDropdown
                                value={filterBy}
                                onChange={value => { 
                                    const newFilterBy = value;
                                    console.log('Filter By changed to:', newFilterBy, 'Current company filter:', filterCompany);
                                    setFilterBy(newFilterBy); 
                                    // Only reset filters that are not compatible with the new filter type
                                    if (newFilterBy === 'status') {
                                        setFilterPriority(''); 
                                        console.log('Keeping company filter:', filterCompany);
                                    } else if (newFilterBy === 'priority') {
                                        setFilterStatus(''); 
                                        console.log('Keeping company filter:', filterCompany);
                                    }
                                    // Don't reset filterCompany - preserve the selection
                                }}
                                options={[
                                    { value: 'status', label: 'Status' },
                                    { value: 'priority', label: 'Priority' },
                                    { value: 'history', label: 'History' }
                                ]}
                                className="w-24"
                            />
                        </div>
                        {/* Clear Filters Button - Always reserve space to prevent layout shift */}
                        <div className="min-w-[120px] flex justify-center">
                            {(filterBy !== 'status' || filterStatus !== '' || filterPriority !== '' || filterAssignment !== '' || filterCompany !== '' || filterBy === 'history') && (
                                <button
                                    onClick={clearAllFilters}
                                    className="px-2 py-1 text-xs font-medium text-red-500 bg-transparent rounded-md border border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1"
                                >
                                    <svg className="w-2.5 h-2.5 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (!assignMode && selectedTickets.length > 0) {
                                    await exportSelectedTickets();
                                } else {
                                    toggleExportPopup();
                                }
                            }}
                            disabled={loading}
                            ref={exportButtonRef}
                            className={`group relative inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                                !assignMode && selectedTickets.length > 0
                                    ? 'text-white bg-green-600 hover:bg-green-700'
                                    : 'text-green-700 bg-[#f8f9fa] hover:bg-green-50'
                            }`}
                            title={!assignMode && selectedTickets.length > 0 ? 'Export selected tickets' : 'Export tickets with filters'}
                        >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                            </svg>
                            {!assignMode && selectedTickets.length > 0 ? `Export Selected (${selectedTickets.length})` : 'Export Tickets'}
                        </button>
                    </div>
                </div>
                {/* Divider line between workflow/filter bar and filters/action buttons line */}
                <div className="w-full h-px bg-gray-200 mb-4" />

                {/* Second Line: Filters (left) | Pagination, Assign, Select, Notes (right) */}
                <div className="flex flex-wrap items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Filters Section */}
                        {filterBy === 'company' && user?.role === 'super_admin' && (
                            <div>
                                <CompactDropdown
                                    value={filterCompany}
                                    onChange={value => setFilterCompany(value)}
                                    options={[
                                        { value: '', label: 'All' },
                                        ...(loadingCompanies ? 
                                            [{ value: '', label: 'Loading companies...', disabled: true }] :
                                            companies.length === 0 ? 
                                            [{ value: '', label: 'No companies found', disabled: true }] :
                                            companies.map(company => ({
                                                value: company.companyName,
                                                label: company.companyName
                                            }))
                                        )
                                    ]}
                                    className="w-28"
                                />
                            </div>
                        )}
                        {filterBy === 'status' && (
                            <div className="inline-flex bg-white shadow-sm overflow-visible">
                                <button 
                                    onClick={() => { setFilterStatus(''); setFilterAssignment(''); }} 
                                    className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterStatus === '' && filterAssignment === '' ? 'text-gray-700 border-b-2 border-orange-600' : 'text-gray-700 border-b border-transparent'}`}
                                >
                                    All Tickets
                                    {counts.total_tickets > 0 && (
                                        <span className="absolute -top-2 -right-1 bg-blue-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                            {counts.total_tickets}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => { setFilterStatus('Open'); setFilterAssignment(''); }} 
                                    className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterStatus === 'Open' && filterAssignment === '' ? 'text-gray-700 border-b-2 border-orange-600' : 'text-gray-700 border-b border-transparent'}`}
                                >
                                    Open
                                    {counts.open_tickets > 0 && (
                                        <span className="absolute -top-2 -right-1 bg-green-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                            {counts.open_tickets}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => { setFilterStatus('In Progress'); setFilterAssignment(''); }} 
                                    className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterStatus === 'In Progress' && filterAssignment === '' ? 'text-gray-700 border-b-2 border-orange-600' : 'text-gray-700 border-b border-transparent'}`}
                                >
                                    In Progress
                                    {counts.in_progress_tickets > 0 && (
                                        <span className="absolute -top-2 -right-1 bg-orange-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                            {counts.in_progress_tickets}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => { setFilterStatus('Hold'); setFilterAssignment(''); }} 
                                    className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterStatus === 'Hold' && filterAssignment === '' ? 'text-gray-700 border-b-2 border-orange-600' : 'text-gray-700 border-b border-transparent'}`}
                                >
                                    On Hold
                                    {counts.hold_tickets > 0 && (
                                        <span className="absolute -top-2 -right-1 bg-red-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                            {counts.hold_tickets}
                                        </span>
                                    )}
                                </button>
                                <button 
                                    onClick={() => { setFilterAssignment('unassigned'); setFilterStatus(''); }} 
                                    className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterAssignment === 'unassigned' && filterStatus === '' ? 'text-gray-700 border-b-2 border-orange-600' : 'text-gray-700 border-b border-transparent'}`}
                                >
                                    Unassigned
                                    {counts.unassigned > 0 && (
                                        <span className="absolute -top-2 -right-1 bg-gray-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                            {counts.unassigned}
                                        </span>
                                    )}
                                </button>
                                {/* Assigned to Me filter - Only for engineers and super admin */}
                                {(() => {
                                    console.log('Debug - User role:', user?.role);
                                    const shouldShow = (user?.role === 'engineer' || user?.role === 'senior_engineer' || user?.role === 'lead_engineer' || user?.role === 'principal_engineer' || user?.role === 'super_admin' || user?.role === 'support');
                                    console.log('Debug - Should show assigned to me:', shouldShow);
                                    return shouldShow;
                                })() && (
                                    <button 
                                        onClick={() => { setFilterAssignment('assigned_to_me'); setFilterStatus(''); }} 
                                        className={`relative px-3 py-1.5 text-xs font-medium transition-all duration-200 ${filterAssignment === 'assigned_to_me' && filterStatus === '' ? 'text-gray-700 border-b-2 border-blue-600' : 'text-gray-700 border-b border-transparent'}`}
                                    >
                                        Assigned to Me
                                        {counts.assigned_to_me > 0 && (
                                            <span className="absolute -top-2 -right-1 bg-blue-500 text-white font-bold text-[9px] rounded-full min-h-2 min-w-4 px-1 flex items-center justify-center">
                                                {counts.assigned_to_me}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {!assignMode && !showCheckboxes && selectedTickets.length === 0 && (
                                    <TooltipBubble title="Select tickets for export or assignment">
                                        <img 
                                            src={selectionIcon} 
                                            alt="Select" 
                                            onClick={enterExportSelectionMode}
                                            className="w-6 h-6 ml-4 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                        />
                                    </TooltipBubble>
                                )}
                                {(assignMode || showCheckboxes || (selectedTickets.length > 0 && !assignMode)) && (
                                    <button 
                                        onClick={exitExportSelectionMode}
                                        className="group relative inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 ml-6"
                                    >
                                        <X className="w-3 h-3 mr-1 group-hover:scale-110 transition-transform duration-200" />
                                        Cancel
                                    </button>
                                )}
                            </div>
                        )}
                        {filterBy === 'priority' && (
                            <div className="inline-flex bg-white shadow-sm overflow-visible">
                                <button 
                                    onClick={() => setFilterPriority('')} 
                                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${filterPriority === '' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setFilterPriority('Low')} 
                                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${filterPriority === 'Low' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    Low
                                </button>
                                <button 
                                    onClick={() => setFilterPriority('Medium')} 
                                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${filterPriority === 'Medium' ? 'bg-orange-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    Medium
                                </button>
                                <button 
                                    onClick={() => setFilterPriority('High')} 
                                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${filterPriority === 'High' ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    High
                                </button>
                                <button 
                                    onClick={() => setFilterPriority('Critical')} 
                                    className={`px-3 py-1.5 text-sm font-medium transition-all duration-200 ${filterPriority === 'Critical' ? 'bg-red-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                    Critical
                                </button>
                            </div>
                        )}
                        {filterBy === 'history' && (
                            <div className="inline-flex bg-white shadow-sm overflow-visible">
                                <button 
                                    className="px-3 py-1.5 text-sm font-medium text-blue"
                                >
                                    Resolved & Cancelled Tickets
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        {renderPagination()}
                        {/* Ticket Count Display */}
                        <div className="text-[12px] text-gray-500 ml-4">
                            Showing <span className="text-blue-600 font-semibold">{((currentPage - 1) * ticketsPerPage) + 1}-{Math.min(currentPage * ticketsPerPage, displayedTickets.length)}</span> of <span className="text-blue-600 font-semibold">{displayedTickets.length}</span> Tickets
                            {filterBy === 'company' && (
                                <span className="ml-2 text-gray-600">
                                       Companies: {companies.length}, Selected: {filterCompany || 'None'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                            {/* Action Buttons: Assign, Select, Notes (copy logic from original) */}
                            {/* Copy from original code, lines 1291-1357 */}
                            {canAssign && assignMode && user?.role !== 'site_admin' ? (
                                // Assign mode - show Assign button with count and Cancel button
                                <>
                                <button 
                                    onClick={() => {
                                        setShowAssignPopup(true);
                                        setAssignSuccess(false);
                                        setAssignLoading(false);
                                    }}
                                    disabled={selectedTickets.length === 0}
                                            className={`group relative inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                        selectedTickets.length === 0 
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                                                    : 'text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-md focus:ring-green-500'
                                    }`}
                                >
                                            <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                    Assign {selectedTickets.length > 0 && `(${selectedTickets.length})`}
                                </button>
                                        <button 
                                            onClick={exitAssignMode}
                                            className="group relative inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-red-400 to-red-500 rounded-md shadow-sm hover:from-red-500 hover:to-red-600 hover:shadow-md transition-all duration-200 ease-in-out border-0 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                        >
                                            <svg className="w-3 h-3 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Cancel
                                </button>
                                </>
                            ) : !canAssign && assignMode ? null : null}
                            <NotesTooltipBubble title="Open your personal notes">
                                <img 
                                    src={stickyNoteIcon} 
                                    alt="My Notes" 
                                    onClick={() => setShowNotesPanel(!showNotesPanel)}
                                    className={`w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity duration-200 ${
                                        showNotesPanel ? 'opacity-100' : 'opacity-70'
                                    }`}
                                />
                            </NotesTooltipBubble>
                        </div>
                    </div>
                    {(assignMode || showCheckboxes || selectedTickets.length > 0) && (
                        <div className={`w-full mt-2 px-3 py-2 text-sm rounded-md border ${
                            selectedTickets.length === 0
                                ? 'text-blue-800 bg-blue-50/80 border-blue-300'
                                : 'text-blue-900 bg-blue-50 border-blue-400'
                        }`}>
                            {selectedTickets.length === 0 ? (
                                'No tickets selected. Please select one or more tickets to proceed.'
                            ) : (
                                <div className="flex items-center justify-between gap-2">
                                    <span>{`${selectedTickets.length} ${selectedTickets.length === 1 ? 'ticket' : 'tickets'} selected.`}</span>
                                    <div className="flex items-center gap-2">
                                        {canAssign && user?.role !== 'site_admin' && (
                                            <button 
                                                onClick={() => {
                                                    if (!assignMode) {
                                                        setAssignMode(true);
                                                        setShowCheckboxes(true);
                                                    }
                                                    setShowAssignPopup(true);
                                                    setAssignSuccess(false);
                                                    setAssignLoading(false);
                                                }}
                                                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                                            >
                                                Assign Selected
                                            </button>
                                        )}
                                        
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {displayedTickets.length === 0 ? (
                    loading || ticketsLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mb-3" />
                            <p className="text-gray-600 text-sm">Loading tickets...</p>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-sm text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                            {searchKeyword ? `No tickets found matching "${searchKeyword}".` : "No tickets found matching the criteria."}
                        </p>
                    )
                ) : (
                    <>
                        <div className="w-full max-w-full overflow-x-auto border border-gray-200 bg-white">
                         <table className={`w-full min-w-0 bg-white text-xs ${(showCheckboxes || assignMode) ? 'border border-orange-400' : ''}`} style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontOpticalSizing: 'auto', fontStyle: 'normal' }}>
                             <thead className="hidden sm:table-header-group bg-gray-100 border-b border-gray-200">
                                <tr className="h-10">
                                    {(showCheckboxes || assignMode) && (
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[60px]">
                                            <div className="flex flex-col items-start space-y-1">
                                                {assignMode && (
                                                    <span className="text-sm text-gray-500 font-normal">
                                                        
                                                    </span>
                                                )}
                                            <input 
                                                type="checkbox" 
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                            if (assignMode) {
                                                                // In assign mode, select only unassigned tickets
                                                        const unassignedTicketIds = paginatedTickets
                                                            .filter(ticket => !ticket.assigned_to_email)
                                                            .map(ticket => ticket.id);
                                                        setSelectedTickets(unassignedTicketIds);
                                                            } else if (showCheckboxes) {
                                                                // In export mode, select all tickets
                                                                const allTicketIds = paginatedTickets.map(ticket => ticket.id);
                                                                setSelectedTickets(allTicketIds);
                                                            }
                                                    } else {
                                                        setSelectedTickets([]);
                                                    }
                                                }}
                                                    checked={
                                                        assignMode 
                                                            ? selectedTickets.length > 0 && selectedTickets.length === paginatedTickets.filter(ticket => !ticket.assigned_to_email).length
                                                            : selectedTickets.length > 0 && selectedTickets.length === paginatedTickets.length
                                                    }
                                                    disabled={!assignMode && !showCheckboxes}
                                                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${
                                                        !assignMode && !showCheckboxes ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                    }`}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[50px]">#</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[120px]">Ticket ID</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[200px]">Short Description</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[140px]">Created Date</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[100px]">Priority</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[120px]">Status</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[180px]">Requested by</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[180px]">Assigned To</th>
                                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-normal break-words min-w-[80px]">Peek</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontOpticalSizing: 'auto', fontStyle: 'normal' }}>
                                {paginatedTickets.map((ticket, index) => (
                                    <tr key={ticket.id} 
                                        className={`block sm:table-row bg-white border-b border-gray-200 hover:bg-gray-100 transition-colors duration-150 text-xs cursor-pointer group ${
                                            showPeekPanel && peekedTicket && peekedTicket.id === ticket.id 
                                                ? 'bg-orange-50 border-orange-200' 
                                                : 'bg-white'
                                        }`}
                                        onClick={(e) => {
                                            // Check if the click was on a dropdown or interactive element
                                            const target = e.target;
                                            const isDropdown = target.closest('.custom-dropdown') || 
                                                             target.closest('[role="button"]') || 
                                                             target.closest('input') || 
                                                             target.closest('button') ||
                                                             target.closest('a');
                                            
                                            // Check if click was in checkbox column (either regular or hover checkbox)
                                            const isCheckboxColumn = target.closest('.checkbox-column');
                                            
                                            if (!isDropdown && !isCheckboxColumn) {
                                                navigateTo('/tickets', ticket.id);
                                            }
                                        }}
                                    >
                                        {(showCheckboxes || assignMode) && (
                                            <td className="checkbox-column block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[60px] border-r border-gray-200 cursor-default">
                                                <span className="block sm:hidden font-semibold text-gray-600">Select:</span>
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedTickets.includes(ticket.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleTicketSelection(ticket.id);
                                                    }}
                                                    disabled={(!assignMode && !showCheckboxes) || (assignMode && ticket.assigned_to_email)}
                                                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 ${
                                                        (!assignMode && !showCheckboxes) || (assignMode && ticket.assigned_to_email) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                    }`}
                                                />
                                            </td>
                                        )}
                                        <td className="checkbox-column block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[50px] border-r border-gray-200 group-hover:bg-blue-50 cursor-default">
                                            <span className="block sm:hidden font-semibold text-gray-600">#:</span>
                                            <div className="relative">
                                                <span className={`${selectedTickets.includes(ticket.id) ? 'hidden' : 'group-hover:hidden'} inline-block`}>{index + 1}</span>
                                                {/* Only show hover checkbox when regular selection checkboxes are not visible */}
                                                {!(showCheckboxes || assignMode) && (
                                                    <div className={`${selectedTickets.includes(ticket.id) ? 'inline-block' : 'hidden group-hover:inline-block'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedTickets.includes(ticket.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                console.log('Hover checkbox clicked for ticket:', ticket.id);
                                                                handleTicketSelection(ticket.id);
                                                                // Don't automatically show all checkboxes - let user manually enter selection mode
                                                            }}
                                                            disabled={false}
                                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-blue-700 hover:underline font-medium cursor-pointer whitespace-normal break-words min-w-[120px] border-r border-gray-200" 
                                            onMouseEnter={(e) => showTicketIdPopup(ticket.display_id, ticket.id, e)}
                                            onMouseLeave={hideTicketIdPopup}
                                        >
                                            <span className="block sm:hidden font-semibold text-gray-600">Ticket ID:</span>
                                            <a
                                                href={`/tickets/${ticket.id}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    navigateTo('/tickets', ticket.id);
                                                }}
                                            >
                                                {ticket.display_id}
                                            </a>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 max-w-xs truncate whitespace-normal break-words min-w-[200px] border-r border-gray-200" title={ticket.short_description}>
                                            <span className="block sm:hidden font-semibold text-gray-600">Short Description:</span>
                                            <div 
                                                className="line-clamp-2 text-ellipsis overflow-hidden text-gray-800"
                                            >
                                                {ticket.short_description}
                                            </div>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[140px] border-r border-gray-200">
                                            <span className="block sm:hidden font-semibold text-gray-600">Created Date:</span>
                                            <div className="truncate">
                                                {ticket.created_at ? (
                                                    <TooltipBubble title={`Created on ${new Date(ticket.created_at).toLocaleDateString('en-US', { 
                                                        weekday: 'short', 
                                                        month: 'short', 
                                                        day: '2-digit', 
                                                        year: 'numeric'
                                                    })} at ${new Date(ticket.created_at).toLocaleTimeString('en-US', { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit', 
                                                        hour12: true 
                                                    })}`}>
                                                        <span className="cursor-pointer">
                                                            {new Date(ticket.created_at).toLocaleDateString('en-US', { 
                                                                weekday: 'short', 
                                                                month: 'short', 
                                                                day: '2-digit', 
                                                                year: 'numeric'
                                                            }).replace(',', '-')}
                                                        </span>
                                                    </TooltipBubble>
                                                ) : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[100px] border-r border-gray-200">
                                            <span className="block sm:hidden font-semibold text-gray-600">Priority:</span>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityClasses(ticket.priority)}`}>{ticket.priority}</span>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 whitespace-normal break-words text-xs text-gray-800 text-left min-w-[120px] border-r border-gray-200">
                                            <span className="block sm:hidden font-semibold text-gray-600">Status:</span>
                                            {/* Show status dropdown for engineers and super admins */}
                                            {(user?.role === 'support' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'engineer') ? (
                                                <div className="w-full">
                                                    {changingStatusTickets.has(ticket.id) ? (
                                                        <div className="flex items-center gap-1 text-sm text-blue-600">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Updating...</span>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="custom-dropdown"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <CustomDropdown
                                                                value={ticket.status}
                                                                onChange={(value) => handleTicketStatusChange(ticket.id, value)}
                                                                options={memoizedStatusOptions}
                                                                placeholder={ticket.status}
                                                                className="text-sm w-full"
                                                                disabled={['Resolved', 'Cancelled', 'Closed'].includes(ticket.status)}
                                                                variant="minimal"
                                                                customDisplay={(
                                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full truncate ${getStatusClasses(ticket.status)}`}>
                                                                        {ticket.status}
                                                                    </span>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusClasses(ticket.status)}`}>{ticket.status}</span>
                                            )}
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[180px] border-r border-gray-200">
                                            <span className="block sm:hidden font-semibold text-gray-600">Requested by:</span>
                                            <div className="truncate">
                                            <span 
                                                className="text-black hover:text-gray-800 hover:underline cursor-pointer"
                                                onMouseEnter={(e) => {
                                                    if (ticket.reporter_email) {
                                                        showProfilePopup(
                                                            { 
                                                                email: ticket.reporter_email, 
                                                                fullName: ticket.reporter_name,
                                                                clientName: ticket.client_name || ticket.companyName,
                                                                contactNumber: ticket.contact_number
                                                            },
                                                            e
                                                        );
                                                    }
                                                }}
                                                onMouseLeave={() => {
                                                    cancelShowProfilePopup();
                                                    hideProfilePopup();
                                                }}
                                            >
                                                {ticket.reporter_email || 'N/A'}
                                            </span>
                                            </div>
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-xs text-gray-800 whitespace-normal break-words min-w-[180px] border-r border-gray-200" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontOpticalSizing: 'auto', fontStyle: 'normal' }}>
                                            <span className="block sm:hidden font-semibold text-gray-600">Assigned To:</span>
                                            {/* Show assignment dropdown for engineers and super admins */}
                                            {(user?.role === 'support' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'engineer') ? (
                                                <div className="min-w-[180px] max-w-[280px] w-full">
                                                    {engineersLoading && availableEngineers.length === 0 ? (
                                                        <span className="text-sm text-gray-500">Loading...</span>
                                                    ) : assigningTickets.has(ticket.id) ? (
                                                        <div className="flex items-center gap-1 text-sm text-blue-600">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Assigning...</span>
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className="custom-dropdown"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <CustomDropdown
                                                                value={ticket.assigned_to_email || 'unassigned'}
                                                                onChange={(value) => handleTicketAssignment(ticket.id, value)}
                                                                options={assignmentOptions}
                                                                placeholder={ticket.assigned_to_email || 'Unassigned'}
                                                                className="text-sm w-full"
                                                                disabled={['Resolved', 'Cancelled', 'Closed'].includes(ticket.status)}
                                                                variant="minimal"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="truncate" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 400, fontOpticalSizing: 'auto', fontStyle: 'normal' }}>
                                                <span className="text-sm">{ticket.assigned_to_email || 'Unassigned'}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="block sm:table-cell px-2 py-4 text-center whitespace-normal break-words text-xs text-gray-800 min-w-[80px]">
                                            <span className="block sm:hidden font-semibold text-gray-600">Peek:</span>
                                            {showPeekPanel && peekedTicket && peekedTicket.id === ticket.id ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleClosePeek();
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-full transition-colors duration-200"
                                                    title="Close preview"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePeekTicket(ticket);
                                                    }}
                                                    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
                                                    title="Peek at ticket details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}
                
                {/* Bottom Pagination */}
                {displayedTickets.length > 0 && (
                    <div className="flex justify-center items-center mt-4 mb-2 px-4">
                        {renderPagination()}
                    </div>
                )}
            </div>
            
            {/* Notes Panel */}
            <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col transform transition-all duration-300 ease-in-out ${
                showNotesPanel 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0 pointer-events-none'
            }`}>
                    {/* Notes Panel Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">My Notes</h3>
                            <button
                                onClick={() => setShowNotesPanel(false)}
                                className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 group"
                                title="Close Notes Panel"
                            >
                                <X className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        {/* Search and Filter - Hide when adding/editing/viewing note */}
                        {!showAddNoteForm && !editingNote && !viewingNote && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search notes..."
                                        value={notesSearchTerm}
                                        onChange={(e) => setNotesSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <CustomDropdown
                                    value={notesSelectedCategory}
                                    onChange={(value) => setNotesSelectedCategory(value)}
                                    options={noteCategories}
                                    placeholder="All Categories"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>

                    {/* Notes Content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Add Note Form */}
                        {showAddNoteForm && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold text-gray-800">
                                        {editingNote ? 'Edit Note' : 'Add New Note'}
                                    </h4>
                                    <button
                                        onClick={cancelEditing}
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <form onSubmit={editingNote ? handleUpdateNote : handleAddNote}>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={noteFormData.title}
                                            onChange={(e) => setNoteFormData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Note title..."
                                            disabled={addingNote}
                                            required
                                        />
                                        <CustomDropdown
                                            value={noteFormData.category}
                                            onChange={(value) => setNoteFormData(prev => ({ ...prev, category: value }))}
                                            options={noteCategories.slice(1)}
                                            placeholder="Select category..."
                                            className="w-full"
                                            disabled={addingNote}
                                        />
                                        <textarea
                                            value={noteFormData.content}
                                            onChange={(e) => setNoteFormData(prev => ({ ...prev, content: e.target.value }))}
                                            rows={3}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            placeholder="Enter note content..."
                                            disabled={addingNote}
                                            required
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                type="button"
                                                onClick={cancelEditing}
                                                disabled={addingNote}
                                                className="px-2 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={addingNote}
                                                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {addingNote ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                        {editingNote ? 'Updating...' : 'Adding...'}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-3 h-3 mr-1" />
                                                        {editingNote ? 'Update' : 'Add'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Add Note Button */}
                        {!showAddNoteForm && !viewingNote && (
                            <button
                                onClick={() => setShowAddNoteForm(true)}
                                className="w-full mb-4 px-2 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md"
                            >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Note
                            </button>
                        )}

                        {/* Note Detail View */}
                       {viewingNote && (
  <div className="mb-6">
    {/* Back Button */}
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={handleBackToList}
        className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Notes
      </button>
    </div>

    {/* Note Card */}
    <div
      className={`p-6 border rounded-2xl shadow-sm transition-shadow bg-white ${
        viewingNote.is_pinned
          ? "border-orange-300 hover:shadow-md"
          : "border-gray-200 hover:shadow-md"
      }`}
    >
      {/* Title */}
      <h3 className="text-l font-semibold text-gray-900 leading-tight mb-3">
        {viewingNote.title}
      </h3>

      {/* Category + Actions */}
      <div className="flex items-center justify-between mb-5">
        {/* Category Tag */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 border text-sm font-medium rounded ${getCategoryColor(
              viewingNote.category
            )} whitespace-nowrap`}
          >
            {
              noteCategories.find((c) => c.value === viewingNote.category)
                ?.label
            }
          </span>
          {viewingNote.is_pinned && (
            <Pin className="w-4 h-4 text-orange-600 flex-shrink-0" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <TooltipBubble title={viewingNote.is_pinned ? "Unpin note" : "Pin note"}>
            <button
              onClick={() => handleTogglePin(viewingNote.id)}
              className={`p-1.5 rounded-md border text-gray-400 hover:text-orange-600 hover:border-orange-300 transition`}
            >
              {viewingNote.is_pinned ? (
                <Pin className="w-4 h-4" />
              ) : (
                <PinOff className="w-4 h-4" />
              )}
            </button>
          </TooltipBubble>

          <TooltipBubble title="Edit note">
            <button
              onClick={() => startEditing(viewingNote)}
              className="p-1.5 rounded-md border text-gray-400 hover:text-blue-600 hover:border-blue-300 transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </TooltipBubble>

           <div className="relative">
             <TooltipBubble title="Delete note">
               <button
                 onClick={() => handleDeleteClick(viewingNote.id)}
                 className="p-1.5 rounded-md border text-gray-400 hover:text-red-600 hover:border-red-300 transition"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             </TooltipBubble>
             
             {/* Delete Confirmation Popup */}
             {showDeleteConfirm === viewingNote.id && (
               <div className="delete-confirmation-container absolute top-8 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                 <div className="text-sm text-gray-700 mb-3">
                   Are you sure you want to delete this note?
                 </div>
                 <div className="flex gap-2">
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleDeleteConfirm(viewingNote.id);
                     }}
                     className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                   >
                     Delete
                   </button>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       handleDeleteCancel();
                     }}
                     className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                   >
                     Cancel
                   </button>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="whitespace-pre-wrap text-gray-700 text-[13px] mb-6">
        {viewingNote.content}
      </div>

      {/* Date (bottom with separator) */}
      <div className="flex justify-end pt-4 mt-4 border-t text-sm text-gray-400">
        <Calendar className="w-4 h-4 mr-1.5" />
        {formatDate(viewingNote.updated_at)}
      </div>
    </div>
  </div>
)}



                        {/* Notes List - Hide when adding/editing/viewing note */}
                        {!showAddNoteForm && !editingNote && !viewingNote && (
                            <>
                                {notesLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (pinnedNotes.length === 0 && unpinnedNotes.length === 0) ? (
                                    <div className="text-center py-8">
                                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No notes found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Pinned Notes Section */}
                                        {pinnedNotes.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-center gap-2 mb-3 px-1">
                                                    <div className="flex-1 h-px bg-yellow-200"></div>
                                                    <Pin className="w-4 h-4 text-yellow-600" />
                                                    <h3 className="text-sm font-semibold text-gray-700">Pinned Notes</h3>
                                                    <div className="flex-1 h-px bg-yellow-200"></div>
                                                </div>
                                    <div className="space-y-2">
                                                    {pinnedNotes.map((note) => (
                                                        <div
                                                            key={note.id}
                                                            onClick={() => handleViewNote(note)}
                                                            className="p-3 border border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer group"
                                                        >
                                                            {/* Header with category and pin indicator */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-medium rounded ${getCategoryColor(note.category)} whitespace-nowrap`}>
                                                                        {noteCategories.find(c => c.value === note.category)?.label}
                                                                    </span>
                                                                    <Pin className="w-3 h-3 text-orange-600" />
                                                                </div>
                                                                <div className="flex items-center text-xs text-gray-500">
                                                                    <Calendar className="w-3 h-3 mr-1" />
                                                                    {formatDate(note.updated_at)}
                                                                </div>
                                                            </div>

                                                            {/* Title */}
                                                            <h4 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-1">
                                                                {note.title}
                                                            </h4>

                                                            {/* Content preview */}
                                                            <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                                                                {note.content}
                                                            </p>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
                                                                <TooltipBubble title="Unpin note">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTogglePin(note.id);
                                                                        }}
                                                                        className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors duration-200"
                                                                    >
                                                                        <PinOff className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </TooltipBubble>
                                                                <TooltipBubble title="Edit note">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            startEditing(note);
                                                                        }}
                                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </TooltipBubble>
                                                                <div className="relative">
                                                                    <TooltipBubble title="Delete note">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteClick(note.id);
                                                                            }}
                                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </TooltipBubble>
                                                                    
                                                                    {/* Delete Confirmation Popup */}
                                                                    {showDeleteConfirm === note.id && (
                                                                        <div className="delete-confirmation-container absolute top-8 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                                                                            <div className="text-sm text-gray-700 mb-2">
                                                                                Delete this note?
                                                                            </div>
                                                                            <div className="flex gap-1.5">
                                                                                <button
                                                                                    onClick={() => handleDeleteConfirm(note.id)}
                                                                                    className="px-2.5 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                                <button
                                                                                    onClick={handleDeleteCancel}
                                                                                    className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Other Notes Section */}
                                        {unpinnedNotes.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-center gap-2 mb-3 px-1">
                                                    <div className="flex-1 h-px bg-gray-200"></div>
                                                    <FileText className="w-4 h-4 text-gray-500" />
                                                    <h3 className="text-sm font-semibold text-gray-700">Other Notes</h3>
                                                    <div className="flex-1 h-px bg-gray-200"></div>
                                                </div>
                                                <div className="space-y-2">
                                                    {unpinnedNotes.map((note) => (
                                                        <div
                                                            key={note.id}
                                                            onClick={() => handleViewNote(note)}
                                                            className="p-3 border border-gray-200 bg-white rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer group"
                                                        >
                                                            {/* Header with category and date */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-medium rounded ${getCategoryColor(note.category)} whitespace-nowrap`}>
                                                                        {noteCategories.find(c => c.value === note.category)?.label}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center text-xs text-gray-500">
                                                                    <Calendar className="w-3 h-3 mr-1" />
                                                                    {formatDate(note.updated_at)}
                                                                </div>
                                                            </div>

                                                            {/* Title */}
                                                            <h4 className="font-semibold text-sm text-gray-900 mb-2 line-clamp-1">
                                                                {note.title}
                                                            </h4>

                                                            {/* Content preview */}
                                                            <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                                                                {note.content}
                                                            </p>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
                                                                <TooltipBubble title="Pin note">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTogglePin(note.id);
                                                                        }}
                                                                        className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors duration-200"
                                                                    >
                                                                        <Pin className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </TooltipBubble>
                                                                <TooltipBubble title="Edit note">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            startEditing(note);
                                                                        }}
                                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </TooltipBubble>
                                                                <div className="relative">
                                                                    <TooltipBubble title="Delete note">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteClick(note.id);
                                                                            }}
                                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </TooltipBubble>
                                                                    
                                                                    {/* Delete Confirmation Popup */}
                                                                    {showDeleteConfirm === note.id && (
                                                                        <div className="delete-confirmation-container absolute top-8 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                                                                            <div className="text-sm text-gray-700 mb-2">
                                                                                Delete this note?
                                                                            </div>
                                                                            <div className="flex gap-1.5">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteConfirm(note.id);
                                                                                    }}
                                                                                    className="px-2.5 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDeleteCancel();
                                                                                    }}
                                                                                    className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 transition-colors"
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            
            {/* Ticket Peek Panel */}
            <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col transform transition-all duration-300 ease-in-out ${
                showPeekPanel 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0 pointer-events-none'
            }`} style={{ right: showNotesPanel ? '320px' : '0px' }}>
                {/* Peek Panel Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <h3 className="text-sm font-semibold text-gray-900">Preview</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {peekedTicket && (
                                <a
                                    href={`/tickets/${peekedTicket.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigateTo('/tickets', peekedTicket.id);
                                    }}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Full Details
                                </a>
                            )}
                            <button
                                onClick={handleClosePeek}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors duration-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {peekedTicket && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">#{peekedTicket.display_id}</span>
                            <span className="text-gray-400">•</span>
                            <span>{peekedTicket.created_at ? new Date(peekedTicket.created_at).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: '2-digit', 
                                year: 'numeric'
                            }).replace(',', '-') : 'N/A'}</span>
                        </div>
                    )}
                </div>

                {/* Peek Panel Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {peekedTicket ? (
                        <div className="space-y-6">
                            {/* Status & Priority Row */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Status</label>
                                    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full ${getStatusClasses(peekedTicket.status)}`}>
                                        {peekedTicket.status}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Priority</label>
                                    <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full ${getPriorityClasses(peekedTicket.priority)}`}>
                                        {peekedTicket.priority}
                                    </span>
                                </div>
                            </div>

                            {/* Description Card */}
                            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                                <p className="text-sm text-gray-900 leading-relaxed">{peekedTicket.short_description}</p>
                            </div>

                            {/* People Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">People</h4>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500">Requested by</p>
                                            <p className="text-sm text-gray-900 truncate">{peekedTicket.reporter_email || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500">Assigned to</p>
                                            <p className="text-sm text-gray-900 truncate">{peekedTicket.assigned_to_email || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Section */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">Timeline</h4>
                                
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500">Created</p>
                                            <p className="text-sm text-gray-900">
                                                {peekedTicket.created_at ? new Date(peekedTicket.created_at).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: '2-digit', 
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true 
                                                }) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500">Last Updated</p>
                                            <p className="text-sm text-gray-900">
                                                {peekedTicket.updated_at ? new Date(peekedTicket.updated_at).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: '2-digit', 
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true 
                                                }) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Full Description */}
                            {peekedTicket.description && (
                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                    <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Description</label>
                                    <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                                        {peekedTicket.description}
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No ticket selected</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Profile Popup */}
            <ProfilePopup
                visible={profilePopup.visible}
                position={profilePopup.position}
                user={profilePopup.user}
                copyStatus={profilePopup.copyStatus}
                currentUser={user}
                onMouseEnter={() => setPopupHovered(true)}
                onMouseLeave={() => {
                    setPopupHovered(false);
                    // Clear any pending timeouts
                    if (popupHideTimeout.current) {
                        clearTimeout(popupHideTimeout.current);
                    }
                    if (popupShowTimeout.current) {
                        clearTimeout(popupShowTimeout.current);
                    }
                    // Immediately hide the popup
                    setProfilePopup(prev => ({ ...prev, visible: false }));
                }}
                onCopyEmail={copyUserEmail}
                onCopyName={copyUserName}
            />
            
            {/* Ticket ID Popup */}
            <TicketIdPopup
                visible={ticketIdPopup.visible}
                position={ticketIdPopup.position}
                ticketId={ticketIdPopup.ticketId}
                documentId={ticketIdPopup.documentId}
                copyStatus={ticketIdPopup.copyStatus}
                onOpen={openTicket}
                onCopyId={copyTicketId}
                onCopyUrl={copyTicketUrl}
                onMouseEnter={handleTicketIdPopupHover}
                onMouseLeave={handleTicketIdPopupLeave}
            />
            
        </>
    );
};

export default AllTicketsComponent;