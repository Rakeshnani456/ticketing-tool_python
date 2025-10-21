// src/components/tickets/TicketUpdatesSection.js

import React, { useRef, useState } from 'react';
import { MessageSquare, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import UserProfilePopup from '../common/UserProfilePopup';
import InlineCommentsInterface from './InlineCommentsInterface';
import sendMailIcon from '../../assets/icons/send_mail.png';

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

    // Debug logging
    console.log('TicketUpdatesSection - isSupportUser:', isSupportUser, 'user role:', user?.role, 'activeTab:', activeTab);
    

    return (
        <div className="max-w-full w-full mx-auto py-2 space-y-2 min-w-0 overflow-x-hidden">
            <div ref={commentsSectionRef} id="comments-section" className="bg-white rounded-lg shadow-sm border border-gray-200 w-full min-w-0 max-w-full overflow-x-hidden">
                {/* Enhanced Tab Navigation */}
                <div className="border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <nav className="flex space-x-0 w-full min-w-0 max-w-full overflow-x-hidden">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`flex-1 py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'comments'
                                    ? 'border-blue-600 text-blue-700 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Comments</span>
                            <span className="sm:hidden">Comments</span>
                            {ticket?.comments?.length > 0 && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-1.5 sm:px-2 py-0.5 rounded-full hidden sm:inline">
                                    {ticket.comments.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('closure')}
                            className={`flex-1 py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'closure'
                                    ? 'border-blue-600 text-blue-700 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Closure</span>
                            <span className="sm:hidden">Close</span>
                        </button>
                    </nav>
                </div>

                {activeTab === 'comments' && (
                        <InlineCommentsInterface
                            comments={ticket?.comments || []}
                            onAddComment={handleAddComment}
                            onAddReply={(commentId, replyText) => {
                                // Handle reply functionality
                                console.log('Reply to comment:', commentId, replyText);
                            }}
                            loading={commentLoading}
                            user={user}
                            commentText={commentText}
                            setCommentText={setCommentText}
                        />
                )}


                {activeTab === 'closure' && (
                    <div className="p-4 sm:p-6 w-full min-w-0 max-w-full overflow-x-hidden">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Closure Notes
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    Provide detailed notes about how this ticket was resolved or closed.
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
                            
                            {canEdit && !isTicketClosedOrResolved && (
                                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-0 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleUpdateTicket('close')}
                                        disabled={
                                            !canEdit ||
                                            isTicketClosedOrResolved ||
                                            closeButtonState === 'closing' ||
                                            (closureNotes.trim() === '' && closeButtonState === 'default') ||
                                            assignedToHasError || timeSpentHasError || closureNotesError
                                        }
                                        className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                            closeButtonState === 'success' 
                                                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300' 
                                                : closeButtonState === 'error' 
                                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                                        }`}
                                    >
                                        {closeButtonState === 'closing' && <Loader2 className="animate-spin w-4 h-4" />}
                                        {closeButtonState === 'success' && <CheckCircle2 className="w-4 h-4" />}
                                        {closeButtonState === 'error' && <XCircle className="w-4 h-4" />}
                                        {closeButtonState === 'closing' && 'Closing...'}
                                        {closeButtonState === 'success' && 'Closed!'}
                                        {closeButtonState === 'error' && 'Error!'}
                                        {closeButtonState === 'default' && 'Close Ticket'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export default TicketUpdatesSection; 