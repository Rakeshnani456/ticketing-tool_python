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
        <div className="max-w-full w-full mx-auto py-1 space-y-1 min-w-0 overflow-x-hidden">
            <div ref={commentsSectionRef} id="comments-section" className="bg-white p-3 sm:p-4 w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="border-b border-gray-200 mb-2 sm:mb-3 w-full min-w-0 max-w-full overflow-x-hidden">
                    
                    <nav className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-4 w-full min-w-0 max-w-full overflow-x-hidden">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`py-1 sm:py-1.5 px-1.5 sm:px-2 border-b-2 font-semibold text-xs transition-all duration-200 rounded-t-md ${activeTab === 'comments'
                                    ? 'border-orange-600 text-orange-700 bg-orange-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            Comments
                        </button>
                        <button
                            onClick={() => setActiveTab('closure')}
                            className={`py-1 sm:py-1.5 px-1.5 sm:px-2 border-b-2 font-semibold text-xs transition-all duration-200 rounded-t-md ${activeTab === 'closure'
                                    ? 'border-orange-600 text-orange-700 bg-orange-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Closure
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
                    <div className="bg-white border border-gray-300 rounded-lg p-2 sm:p-3 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs font-bold text-gray-800 mb-1 sm:mb-1.5">
                            Closure notes:
                        </label>
                        <EditableTextarea
                            id="closure_notes"
                            value={closureNotes}
                            onChange={handleClosureNotesChange}
                            rows={10}
                            disabled={!canEdit || isTicketClosedOrResolved}
                            hasError={closureNotesHasError}
                            className="FieldBox border border-gray-400 px-1.5 py-0.5 bg-white rounded w-full min-w-0 max-w-full text-xs focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                            placeholder="Enter closure notes here..."
                        />
                        {closureNotesErrorMessage && (
                            <p className="text-xs text-red-600 mt-0.5">
                                {closureNotesErrorMessage}
                            </p>
                        )}
                        {canEdit && !isTicketClosedOrResolved && (
                            <div className="flex justify-end mt-2 sm:mt-3 w-full min-w-0 max-w-full overflow-x-hidden">
                                <button
                                    onClick={() => handleUpdateTicket('close')}
                                    disabled={
                                        !canEdit ||
                                        isTicketClosedOrResolved ||
                                        closeButtonState === 'closing' ||
                                        (closureNotes.trim() === '' && closeButtonState === 'default') ||
                                        assignedToHasError || timeSpentHasError || closureNotesError
                                    }
                                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${
                                        closeButtonState === 'success' 
                                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-300' 
                                            : closeButtonState === 'error' 
                                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300'
                                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
                                    }`}
                                >
                                    {closeButtonState === 'closing' && <Loader2 className="animate-spin w-3 h-3" />}
                                    {closeButtonState === 'success' && <CheckCircle2 className="w-3 h-3" />}
                                    {closeButtonState === 'error' && <XCircle className="w-3 h-3" />}
                                    {closeButtonState === 'closing' && 'Closing...'}
                                    {closeButtonState === 'success' && 'Closed!'}
                                    {closeButtonState === 'error' && 'Error!'}
                                    {closeButtonState === 'default' && 'Close Ticket'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


export default TicketUpdatesSection; 