// AssignmentNotesModal.js - Simple popup for capturing notes when reassigning a ticket

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Loader2 } from 'lucide-react';
import Spinner from './Spinner';

const AssignmentNotesModal = ({
    isOpen,
    onClose,
    onConfirm,
    assignmentNotes,
    setAssignmentNotes,
    loading = false,
    ticket = null,
    user = null,
    fromUser = null,
    toUser = null
}) => {
    const [errors, setErrors] = useState({
        assignmentNotes: ''
    });
    const notesInputRef = useRef(null);
    const drawerRef = useRef(null);
    const overlayRef = useRef(null);
    const closeButtonRef = useRef(null);
    const confirmButtonRef = useRef(null);

    // Lock body scroll when popup is open
    const originalStylesRef = useRef(null);

    const handleClose = useCallback(() => {
        if (loading) return;
        onClose();
    }, [loading, onClose]);
    
    useEffect(() => {
        if (isOpen) {
            // Store original styles only once
            if (!originalStylesRef.current) {
                originalStylesRef.current = {
                    bodyOverflow: window.getComputedStyle(document.body).overflow,
                    scrollY: window.scrollY
                };
            }
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            // Auto-focus notes input when popup opens
            setTimeout(() => {
                if (notesInputRef.current) {
                    notesInputRef.current.focus();
                }
            }, 100);

            // Handle ESC key - only allow closing if not loading
            const handleEscape = (e) => {
                if (e.key === 'Escape' && !loading) {
                    handleClose();
                }
            };
            
            document.addEventListener('keydown', handleEscape);

            // Focus trap - keep focus within popup
            const handleTabKey = (e) => {
                if (e.key !== 'Tab') return;
                
                if (!drawerRef.current) return;
                
                const focusableElements = drawerRef.current.querySelectorAll(
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
                // Restore original styles
                if (originalStylesRef.current) {
                    document.body.style.overflow = originalStylesRef.current.bodyOverflow;
                    originalStylesRef.current = null;
                }
                
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('keydown', handleTabKey);
            };
        }
    }, [isOpen, loading, handleClose]);

    const validateAndConfirm = () => {
        const newErrors = {
            assignmentNotes: ''
        };

        // Validate assignment notes
        if (!assignmentNotes.trim()) {
            newErrors.assignmentNotes = 'Assignment notes are required';
        }

        setErrors(newErrors);

        if (!newErrors.assignmentNotes) {
            onConfirm();
        }
    };

    const handleNotesChange = (e) => {
        setAssignmentNotes(e.target.value);
        if (errors.assignmentNotes) {
            setErrors({ ...errors, assignmentNotes: '' });
        }
    };

    if (!isOpen) return null;

    // Render simple popup using portal to document.body
    const popupContent = (
        <>
            <style>{`
                .assignment-modal-content::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            aria-labelledby="popup-title" 
            role="dialog" 
            aria-modal="true"
        >
            {/* Overlay backdrop */}
            <div 
                ref={overlayRef}
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={handleClose}
                style={{ 
                    zIndex: 99998,
                }}
            />

            {/* Simple popup panel */}
            <div 
                ref={drawerRef}
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col z-[99999]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900" id="popup-title">
                        Reassign Ticket
                    </h3>
                    <button
                        ref={closeButtonRef}
                        onClick={handleClose}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Close popup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div 
                    className="assignment-modal-content overflow-y-auto px-6 py-4 space-y-4"
                    style={{
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none', /* IE and Edge */
                    }}
                >
                    {/* Ticket info */}
                    {ticket && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-3">
                            <p className="text-sm text-gray-600 mb-1">
                                <span className="font-semibold">Ticket:</span> {ticket.tracking_id || ticket.display_id || ticket.id?.substring(0, 10).toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-900 font-medium line-clamp-2">
                                {ticket.short_description || ticket.subject || 'N/A'}
                            </p>
                        </div>
                    )}

                    {/* Assignment change */}
                    {(fromUser || toUser) && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-gray-700">
                                <span className="font-semibold">From:</span> {fromUser || 'Unassigned'}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                                <span className="font-semibold">To:</span> {toUser || 'Unassigned'}
                            </p>
                        </div>
                    )}

                    {/* Notes input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Assignment Notes <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            ref={notesInputRef}
                            value={assignmentNotes}
                            onChange={handleNotesChange}
                            rows={5}
                            placeholder="Explain why this ticket is being reassigned..."
                            disabled={loading}
                            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                                errors.assignmentNotes 
                                    ? 'border-red-500 bg-red-50' 
                                    : 'border-gray-300'
                            } ${loading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                        {errors.assignmentNotes && (
                            <p className="mt-1 text-xs text-red-600">{errors.assignmentNotes}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={validateAndConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && <Spinner size="sm" />}
                        {loading ? 'Reassigning...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
        </>
    );

    // Use portal to render at document.body level
    return createPortal(popupContent, document.body);
};

export default AssignmentNotesModal;

