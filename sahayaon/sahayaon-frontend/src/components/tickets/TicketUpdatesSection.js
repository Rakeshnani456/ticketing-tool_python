// src/components/tickets/TicketUpdatesSection.js

import React, { useRef, useState, useEffect } from 'react';
import { MessageSquare, CheckCircle2, Loader2, XCircle, FileText, Plus } from 'lucide-react';
import UserProfilePopup from '../common/UserProfilePopup';
import InlineCommentsInterface from './InlineCommentsInterface';
import sendMailIcon from '../../assets/icons/send_mail.png';
import { API_BASE_URL } from '../../config/constants';

const EditableTextarea = ({ id, value, onChange, rows = 3, className = "", disabled, hasError = false, inputRef, maxLength }) => (
    <textarea
        id={id}
        value={value}
        onChange={onChange}
        rows={rows}
        ref={inputRef}
        className={`rounded-md px-2 py-1.5 focus:outline-none resize-none flex-shrink-0 w-full transition-all duration-200 text-sm border border-gray-300
            ${disabled ? 'bg-gradient-to-r from-gray-50 to-gray-100 cursor-not-allowed text-gray-600' : 'bg-white hover:border-blue-400'}
            ${hasError ? 'border-red-500 bg-red-50' : ''}
            ${className}`}
        disabled={disabled}
        maxLength={maxLength}
    />
);

const TicketUpdatesSection = ({
    ticket,
    activeTab,
    setActiveTab,
    isSupportUser,
    isTicketClosedOrResolved,
    canEdit,
    canAddComments,
    commentText,
    setCommentText,
    commentLoading,
    handleAddComment,
    closureNotes,
    closureNotesErrorMessage,
    closureNotesHasError,
    handleClosureNotesChange,
    closeButtonState,
    handleUpdateTicket,
    assignedToHasError,
    timeSpentHasError,
    closureNotesHasError: closureNotesError,
    user,
    showFlashMessage,
    profilePopup,
    showProfilePopup,
    cancelShowProfilePopup,
    hidePopup,
    popupHideTimeout
}) => {
    const commentsSectionRef = useRef(null);
    const [showAllComments, setShowAllComments] = React.useState(false);
    
    // Notes state
    const [notes, setNotes] = useState(ticket?.notes || []);
    const [notesLoading, setNotesLoading] = useState(false);
    const [addingNote, setAddingNote] = useState(false);
    const [noteFormData, setNoteFormData] = useState({ note_text: '' });

    // Update notes when ticket changes
    useEffect(() => {
        setNotes(ticket?.notes || []);
    }, [ticket?.notes]);

    // Debug logging
    console.log('TicketUpdatesSection - isSupportUser:', isSupportUser, 'user role:', user?.role, 'activeTab:', activeTab, 'setActiveTab:', typeof setActiveTab);
    
    // Fallback for activeTab if not provided
    const currentTab = activeTab || 'comments';
    
    // Check if user can view/manage notes
    const canViewNotes = isSupportUser || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'site_admin';
    const canEditAllNotes = user?.role === 'admin' || user?.role === 'super_admin';
    
    // Notes handlers
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteFormData.note_text.trim()) {
            return;
        }

        setAddingNote(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/tickets/${ticket.id}/add_note`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    note_text: noteFormData.note_text.trim(),
                    note_type: 'internal' // Always internal for ticket notes
                })
            });

            const data = await response.json();

            if (response.ok) {
                setNotes([...notes, data.note]);
                setNoteFormData({ note_text: '' });
                // Don't show flash message for internal notes - keep it quiet
            } else {
                showFlashMessage(data.error || 'Failed to add note', 'error');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            showFlashMessage('Failed to add note', 'error');
        } finally {
            setAddingNote(false);
        }
    };

    

    return (
        <div className="w-full py-2 space-y-2 min-w-0 overflow-x-hidden">
            <div ref={commentsSectionRef} id="comments-section" className="bg-white rounded-xl shadow-sm border border-gray-200 w-full min-w-0 overflow-x-hidden">
                {/* Modern Minimal Tab Navigation */}
                <div className="border-b border-gray-200 bg-white">
                    <nav className="flex space-x-0 w-full min-w-0 max-w-full overflow-x-hidden">
                        <button
                            onClick={() => setActiveTab && setActiveTab('comments')}
                            className={`flex-1 py-2.5 px-4 border-b-2 transition-all duration-200 flex items-center justify-center gap-2 relative border-r border-gray-200 ${
                                currentTab === 'comments'
                                    ? 'border-b-blue-600 text-blue-700 font-semibold'
                                    : 'border-b-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="text-sm">Comments</span>
                            {ticket?.comments?.length > 0 && (
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                    currentTab === 'comments' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {ticket.comments.length}
                                </span>
                            )}
                        </button>
                        {canViewNotes && (
                            <button
                                onClick={() => setActiveTab && setActiveTab('notes')}
                                className={`flex-1 py-2.5 px-4 border-b-2 transition-all duration-200 flex items-center justify-center gap-2 relative border-r border-gray-200 ${
                                    currentTab === 'notes'
                                        ? 'border-b-purple-600 text-purple-700 font-semibold'
                                        : 'border-b-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                <span className="text-sm">Notes</span>
                                {notes.length > 0 && (
                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                        currentTab === 'notes' 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {notes.length}
                                    </span>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab && setActiveTab('closure')}
                            className={`flex-1 py-2.5 px-4 border-b-2 transition-all duration-200 flex items-center justify-center relative ${
                                currentTab === 'closure'
                                    ? 'border-b-green-600 text-green-700 font-semibold'
                                    : 'border-b-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span className="text-sm">Resolution</span>
                        </button>
                    </nav>
                </div>

                {currentTab === 'comments' && (
                    <div className="p-4 sm:p-6 w-full">
                        <InlineCommentsInterface
                            comments={ticket?.comments || []}
                            onAddComment={handleAddComment}
                            onAddReply={(commentId, replyText) => {
                                console.log('Reply to comment:', commentId, replyText);
                            }}
                            loading={commentLoading}
                            user={user}
                            commentText={commentText}
                            setCommentText={setCommentText}
                        />
                    </div>
                )}

                {currentTab === 'notes' && canViewNotes && (
                    <div className="p-4 sm:p-6 w-full">
                        <div className="space-y-4">
                            {/* Header with Internal Notice */}
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                                <p className="text-xs font-medium text-amber-800 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span><strong>Internal Use Only:</strong> These notes are only visible to engineers and administrators. They are not shown to ticket creators or regular users.</span>
                                </p>
                            </div>

                            {/* Simple Add Note Form */}
                            <form onSubmit={handleAddNote} className="border-b border-gray-200 pb-4 mb-4">
                                <div className="flex gap-2 items-start">
                                    <textarea
                                        value={noteFormData.note_text}
                                        onChange={(e) => setNoteFormData({ ...noteFormData, note_text: e.target.value })}
                                        rows={2}
                                        placeholder="Add internal note (e.g., troubleshooting steps, findings, reassignment reason)..."
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        disabled={addingNote}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={addingNote || !noteFormData.note_text.trim()}
                                        className="px-3 py-1 text-xs font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap h-[calc(2.5rem+4px)]"
                                    >
                                        {addingNote ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span className="hidden sm:inline">Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-3 h-3" />
                                                <span className="hidden sm:inline">Add</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Notes List - Simple and Compact */}
                            <div>
                                {notes.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm italic">
                                        No internal notes yet
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {notes.map((note, index) => {
                                            // Check if this is a reassignment note
                                            const isReassignmentNote = note.text && note.text.includes('**Ticket Reassigned**');
                                            
                                            // Parse reassignment note
                                            let reassignmentData = null;
                                            if (isReassignmentNote) {
                                                const fromMatch = note.text.match(/From:\s*(.+)/);
                                                const toMatch = note.text.match(/To:\s*(.+)/);
                                                const notesMatch = note.text.match(/\*\*Notes:\*\*\s*([\s\S]*)/);
                                                
                                                reassignmentData = {
                                                    from: fromMatch ? fromMatch[1].trim() : 'Unknown',
                                                    to: toMatch ? toMatch[1].trim() : 'Unknown',
                                                    notes: notesMatch ? notesMatch[1].trim() : null
                                                };
                                            }
                                            
                                            const noteDate = note.timestamp ? new Date(note.timestamp) : 
                                                           note.created_at ? new Date(note.created_at) : null;
                                            const formattedDate = noteDate ? noteDate.toLocaleString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            }) : 'N/A';
                                            
                                            return (
                                                <div key={index} className="bg-gray-50 border-l-3 border-gray-400 rounded-r-md p-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-semibold text-gray-700">
                                                            {note.author || note.author_email?.split('@')[0] || 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">•</span>
                                                        <span className="text-xs text-gray-500">
                                                            {formattedDate}
                                                        </span>
                                                        {isReassignmentNote && (
                                                            <>
                                                                <span className="text-xs text-gray-500">•</span>
                                                                <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                                                                    Reassigned
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    {isReassignmentNote && reassignmentData ? (
                                                        <div className="space-y-2">
                                                            <div className="text-xs text-gray-600">
                                                                <span className="font-medium">From:</span> {reassignmentData.from === 'Unassigned' ? <span className="italic text-gray-500">Unassigned</span> : reassignmentData.from} 
                                                                {' → '}
                                                                <span className="font-medium">To:</span> {reassignmentData.to === 'Unassigned' ? <span className="italic text-gray-500">Unassigned</span> : reassignmentData.to}
                                                            </div>
                                                            {reassignmentData.notes && (
                                                                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mt-2 pl-2 border-l-2 border-gray-300">
                                                                    {reassignmentData.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {currentTab === 'closure' && (
                    <div className="p-4 sm:p-6 w-full min-w-0 max-w-full overflow-x-hidden">
                        {/* Show closure notes only to super_admin, admin, and support users */}
                        {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support') ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2 tracking-tight" style={{ fontWeight: 700, color: '#111827' }}>
                                        Closure Notes
                                    </label>
                                    <p className="text-xs text-gray-600 mb-3 font-medium">
                                        Internal notes for engineers and admins about how this ticket was resolved or closed.
                                    </p>
                                    <EditableTextarea
                                        id="closure_notes"
                                        value={closureNotes}
                                        onChange={handleClosureNotesChange}
                                        rows={6}
                                        disabled={!canEdit || isTicketClosedOrResolved}
                                        hasError={closureNotesHasError}
                                        className={`w-full min-w-0 max-w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                            closureNotesHasError 
                                                ? 'border-red-300 bg-red-50' 
                                                : 'border-gray-300 bg-white hover:border-gray-400'
                                        } ${!canEdit || isTicketClosedOrResolved ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                        placeholder="Describe the resolution steps, final status, and any important details..."
                                    />
                                    {closureNotesErrorMessage && (
                                        <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                            <XCircle className="w-4 h-4" />
                                            {closureNotesErrorMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Show different message for regular users and site admins
                            <div className="space-y-4">
                                {closureNotes && isTicketClosedOrResolved ? (
                                    // Show closure notes when ticket is closed
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight" style={{ fontWeight: 700, color: '#111827' }}>
                                                    Ticket Closed
                                                </h3>
                                                <div className="bg-white rounded-md p-3 text-left">
                                                    <p className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide" style={{ fontWeight: 700, color: '#111827' }}>Resolution Summary:</p>
                                                    <p className="text-sm text-gray-800 font-normal whitespace-pre-wrap leading-relaxed" style={{ fontWeight: 500, color: '#1f2937' }}>{closureNotes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Show "being reviewed" message when ticket is not yet closed or has no closure notes
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                                        <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight" style={{ fontWeight: 700, color: '#111827' }}>
                                            Ticket Closure Information
                                        </h3>
                                        <p className="text-sm text-gray-700 font-medium" style={{ fontWeight: 500, color: '#374151' }}>
                                            {/* Show contextual message based on ticket ownership */}
                                            {ticket?.created_by === user?.email || ticket?.reporter_email === user?.email ? (
                                                "This ticket is being reviewed by our support team. You will be notified once it's closed with the resolution details."
                                            ) : (
                                                "This ticket is being reviewed by our support team. The ticket creator will be notified once it's closed with the resolution details."
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                            
                    </div>
                )}
            </div>
        </div>
    );
};


export default TicketUpdatesSection; 