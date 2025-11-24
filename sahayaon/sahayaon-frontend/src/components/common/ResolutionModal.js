// ResolutionModal.js - Modal for capturing time spent and closure notes before resolving a ticket

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XCircle, Clock, FileText, AlertCircle, Loader2, Ticket, User } from 'lucide-react';
import Spinner from './Spinner';

const ResolutionModal = ({
    isOpen,
    onClose,
    onConfirm,
    timeSpent,
    setTimeSpent,
    closureNotes,
    setClosureNotes,
    loading = false,
    ticket = null,
    user = null
}) => {
    const [activeTab, setActiveTab] = useState('resolution'); // 'notes' or 'resolution'
    const [notes, setNotes] = useState(''); // For general notes (reassignment, steps, findings)
    const [errors, setErrors] = useState({
        timeSpent: '',
        closureNotes: ''
    });
    const timeSpentInputRef = useRef(null);
    const modalRef = useRef(null);
    const closeButtonRef = useRef(null);
    const confirmButtonRef = useRef(null);
    const originalStylesRef = useRef(null);

    // Reset notes when modal opens
    useEffect(() => {
        if (isOpen) {
            setNotes('');
            setActiveTab('resolution');
        }
    }, [isOpen]);

    // Lock body scroll and prevent background interaction when modal is open
    useEffect(() => {
        if (isOpen) {
            // Store original styles only once
            if (!originalStylesRef.current) {
                originalStylesRef.current = {
                    bodyOverflow: window.getComputedStyle(document.body).overflow,
                    bodyPosition: document.body.style.position,
                    bodyTop: document.body.style.top,
                    scrollY: window.scrollY
                };
            }
            
            // Add class to body to style header/sidebar
            document.body.classList.add('resolution-modal-open');
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Prevent scrolling on iOS
            document.body.style.position = 'fixed';
            document.body.style.top = `-${originalStylesRef.current.scrollY}px`;
            document.body.style.width = '100%';
            
            // Store references to avoid re-querying on every render
            const header = document.querySelector('header');
            const sidebar = document.querySelector('.sidebar-glass');
            
            // Only modify if elements exist and haven't been modified yet
            if (header && header.style.pointerEvents !== 'none') {
                header.style.pointerEvents = 'none';
                header.style.opacity = '0.3';
                header.style.transition = 'opacity 0.2s ease';
            }
            
            if (sidebar && sidebar.style.pointerEvents !== 'none') {
                sidebar.style.pointerEvents = 'none';
                sidebar.style.opacity = '0.3';
                sidebar.style.transition = 'opacity 0.2s ease';
            }
            
            // Auto-focus time spent input when modal opens
            setTimeout(() => {
                if (timeSpentInputRef.current) {
                    timeSpentInputRef.current.focus();
                }
            }, 100);

            // Handle ESC key - only allow closing if not loading
            const handleEscape = (e) => {
                if (e.key === 'Escape' && !loading) {
                    onClose();
                }
            };
            
            document.addEventListener('keydown', handleEscape);

            // Focus trap - keep focus within modal
            const handleTabKey = (e) => {
                if (e.key !== 'Tab') return;
                
                if (!modalRef.current) return;
                
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };
            
            document.addEventListener('keydown', handleTabKey);

            return () => {
                // Remove class from body
                document.body.classList.remove('resolution-modal-open');
                
                // Restore header and sidebar - query again in cleanup
                const headerEl = document.querySelector('header');
                const sidebarEl = document.querySelector('.sidebar-glass');
                
                if (headerEl) {
                    headerEl.style.pointerEvents = '';
                    headerEl.style.opacity = '';
                    headerEl.style.transition = '';
                }
                
                if (sidebarEl) {
                    sidebarEl.style.pointerEvents = '';
                    sidebarEl.style.opacity = '';
                    sidebarEl.style.transition = '';
                }
                
                // Restore original styles
                if (originalStylesRef.current) {
                    document.body.style.overflow = originalStylesRef.current.bodyOverflow;
                    document.body.style.position = originalStylesRef.current.bodyPosition;
                    document.body.style.top = originalStylesRef.current.bodyTop;
                    document.body.style.width = '';
                    window.scrollTo(0, originalStylesRef.current.scrollY);
                    originalStylesRef.current = null; // Reset for next open
                }
                
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('keydown', handleTabKey);
            };
        }
    }, [isOpen, loading, onClose]);

    const validateAndConfirm = () => {
        const newErrors = {
            timeSpent: '',
            closureNotes: ''
        };

        // Validate time spent
        if (!timeSpent.trim()) {
            newErrors.timeSpent = 'Time spent is required';
        } else if (!/^\d{1,4}$/.test(timeSpent.trim())) {
            newErrors.timeSpent = 'Please enter a valid number (1-4 digits)';
        }

        // Validate closure notes (resolution comments)
        if (!closureNotes.trim()) {
            newErrors.closureNotes = 'Resolution comments are required';
        }

        setErrors(newErrors);

        if (!newErrors.timeSpent && !newErrors.closureNotes) {
            // Pass both notes and resolution comments to the handler
            onConfirm(notes);
        }
    };

    const handleTimeSpentChange = (e) => {
        const value = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
        setTimeSpent(value);
        if (errors.timeSpent) {
            setErrors({ ...errors, timeSpent: '' });
        }
    };

    const handleClosureNotesChange = (e) => {
        setClosureNotes(e.target.value);
        if (errors.closureNotes) {
            setErrors({ ...errors, closureNotes: '' });
        }
    };

    if (!isOpen) return null;

    // Render modal using portal to document.body to ensure it's above everything
    const modalContent = (
        <div 
            className="fixed inset-0 overflow-y-auto" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true" 
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingTop: '60px',
                zIndex: 99999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh'
            }}
        >
            {/* Background overlay - covers entire viewport including header and sidebar */}
            <div 
                className="fixed inset-0 bg-gray-900 transition-opacity"
                style={{ 
                    pointerEvents: 'auto',
                    zIndex: 99998,
                    opacity: 0.92,
                    backdropFilter: 'blur(8px)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    margin: 0,
                    padding: 0
                }}
                onClick={(e) => {
                    // Prevent closing on backdrop click - user must use cancel button
                    e.stopPropagation();
                    e.preventDefault();
                }}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }}
            ></div>

            {/* Modal panel - Centered */}
            <div 
                ref={modalRef}
                className="relative inline-block align-middle bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all max-w-2xl w-full mx-4 max-h-[calc(90vh-60px)] overflow-y-auto"
                style={{ 
                    zIndex: 99999,
                    position: 'relative',
                    pointerEvents: 'auto' // Enable pointer events on modal itself
                }}
                onClick={(e) => e.stopPropagation()}
            >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 px-4 py-3 border-b border-green-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-emerald-600" />
                                Resolve Ticket
                            </h3>
                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                disabled={loading}
                                aria-label="Close modal"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="mt-1 text-xs text-emerald-700 font-medium">
                            Provide the following information to resolve this ticket.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="bg-white px-4 py-3">
                        {/* Ticket Details Section */}
                        {ticket && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Ticket className="w-4 h-4 text-indigo-600" />
                                    <h4 className="font-semibold text-xs text-indigo-900">Ticket Details</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="font-bold text-indigo-700">Ticket ID:</span>
                                        <span className="ml-2 text-indigo-900 font-semibold">{ticket.tracking_id || ticket.display_id || ticket.id?.substring(0, 10).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-indigo-700">Priority:</span>
                                        <span className={`ml-2 px-2 py-0.5 rounded font-semibold ${
                                            ticket.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                            ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                            ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-green-100 text-green-800'
                                        }`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="font-bold text-indigo-700">Subject:</span>
                                        <p className="ml-2 text-indigo-900 font-medium line-clamp-2">{ticket.short_description || ticket.subject || 'N/A'}</p>
                                    </div>
                                    {ticket.assigned_to_email && (
                                        <div className="sm:col-span-2">
                                            <span className="font-bold text-indigo-700">Assigned To:</span>
                                            <span className="ml-2 text-indigo-900 font-semibold">{ticket.assigned_to_email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Closed By Information */}
                        {user && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-600" />
                                    <div>
                                        <p className="text-xs font-semibold text-purple-900">Closed By:</p>
                                        <p className="text-sm font-semibold text-purple-700">{user.email || user.name || 'Current User'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Time Spent */}
                            <div>
                                <label className="block text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                    Time Spent (minutes) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={timeSpentInputRef}
                                    type="text"
                                    value={timeSpent}
                                    onChange={handleTimeSpentChange}
                                    placeholder="Enter time in minutes (e.g., 45)"
                                    disabled={loading}
                                    className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                                        errors.timeSpent 
                                            ? 'border-red-500 bg-red-50' 
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                    autoFocus
                                />
                                {errors.timeSpent && (
                                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        {errors.timeSpent}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-blue-600 font-medium">
                                    Enter the total time spent working on this ticket in minutes
                                </p>
                            </div>

                            {/* Tabs for Notes and Resolution Comments */}
                            <div className="border-b border-gray-200 mb-3">
                                <nav className="flex gap-1" aria-label="Tabs">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('resolution')}
                                        disabled={loading}
                                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === 'resolution'
                                                ? 'border-emerald-600 text-emerald-700'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Resolution Comments
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('notes')}
                                        disabled={loading}
                                        className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === 'notes'
                                                ? 'border-blue-600 text-blue-700'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Notes
                                    </button>
                                </nav>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'resolution' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                        Resolution Comments <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={closureNotes}
                                        onChange={handleClosureNotesChange}
                                        rows={4}
                                        placeholder="Describe the resolution steps, final status, and any important details for closing this ticket..."
                                        disabled={loading}
                                        className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${
                                            errors.closureNotes 
                                                ? 'border-red-500 bg-red-50' 
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                        } ${loading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                    />
                                    {errors.closureNotes && (
                                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                            <XCircle className="w-3 h-3" />
                                            {errors.closureNotes}
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-emerald-600 font-medium">
                                        Provide details about how this ticket was resolved (required for closing)
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={4}
                                        placeholder="Add notes for reassignment, steps, findings, or any information for other engineers/super admins or yourself..."
                                        disabled={loading}
                                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none bg-white hover:border-gray-400"
                                    />
                                    <p className="mt-1 text-xs text-blue-600 font-medium">
                                        Optional: Add notes for reassignment, troubleshooting steps, findings, or any information for other engineers/super admins
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            ref={confirmButtonRef}
                            onClick={validateAndConfirm}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-md hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Spinner size="sm" />}
                            {loading ? 'Resolving...' : 'Resolve Ticket'}
                        </button>
                    </div>
            </div>
        </div>
    );

    // Use portal to render at document.body level to ensure highest stacking context
    return createPortal(modalContent, document.body);
};

export default ResolutionModal;

