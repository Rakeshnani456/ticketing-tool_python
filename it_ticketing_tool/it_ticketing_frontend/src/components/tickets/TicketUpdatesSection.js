// src/components/tickets/TicketUpdatesSection.js

import React, { useRef, useState } from 'react';
import { MessageSquare, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import UserProfilePopup from '../common/UserProfilePopup';
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
                    <>
                        
                        {/* Comments List with Smooth Scrolling */}
                        <div className="relative mb-2 sm:mb-3 w-full min-w-0 max-w-full overflow-x-hidden border border-gray-200 rounded-lg p-3 bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm">
                            {/* Scrollable Comments Container */}
                            <div 
                                id="comments-container"
                                className="w-full min-w-0 max-w-full overflow-x-hidden"
                            >

                                
                                <div className="space-y-2 w-full min-w-0 max-w-full">
                                    {/* Comments Display */}
                                    {ticket.comments && ticket.comments.length > 0 ? (
                                        (() => {
                                            const sortedComments = [...ticket.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                            const initialCommentCount = 6;
                                            const displayedComments = showAllComments 
                                                ? sortedComments 
                                                : sortedComments.slice(-initialCommentCount);

                                            return (
                                                <>
                                                    {displayedComments.map((comment, index) => {
                                                        const isCurrentUser = comment.commenter === user?.email;
                                                        return (
                                                            <div key={index} className={`flex comment-item ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full min-w-0 max-w-full`}>
                                                                <div className={`flex gap-2 max-w-[80%] min-w-0 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                                                    {/* Avatar */}
                                                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                                                        isCurrentUser 
                                                                            ? 'bg-gradient-to-br from-green-500 to-green-600' 
                                                                            : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                                                    }`}>
                                                                        <span className="text-white text-xs font-semibold">
                                                                            {(comment.commenter || 'A').charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* Comment Content */}
                                                                    <div className={`flex items-end gap-1 min-w-0 flex-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                                                                                                                        <div className={`relative inline-block px-3 py-2 rounded-lg min-w-0 flex-1 overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 ${
                                                                    isCurrentUser ? 'ml-2' : 'mr-2'
                                                                }`}>
                                                                    {/* Orange vertical bar - left for others, right for current user */}
                                                                    <div className={`absolute top-0 bottom-0 w-1 bg-orange-600 ${
                                                                        isCurrentUser ? 'right-0 rounded-r-lg' : 'left-0 rounded-l-lg'
                                                                    }`}></div>
                                                                    
                                                                    {/* Comment content with padding to account for orange bar */}
                                                                    <div className={`${isCurrentUser ? 'pr-3' : 'pl-3'}`}>
                                                                        {/* Commenter email - orange underlined */}
                                                                        <div className="mb-1 min-w-0">
                                                                            <span className="text-xs text-orange-600 underline font-medium block">
                                                                                {comment.commenter || 'Anonymous'}
                                                                            </span>
                                                                        </div>
                                                                                {/* Comment text on next line */}
                                                                                <p className="text-xs text-black whitespace-pre-wrap break-words min-w-0 overflow-hidden mb-2">
                                                                                    {comment.text}
                                                                                </p>
                                                                                {/* Commented datetime */}
                                                                                                                                                        <span className="text-[10px] text-gray-500">
                                                                            {new Date(comment.timestamp).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {/* Show More/Less button - positioned below the comments */}
                                                    {ticket.comments.length > initialCommentCount && (
                                                        <div className="mt-3 text-center">
                                                            <button
                                                                onClick={() => setShowAllComments(!showAllComments)}
                                                                className="text-[10px] text-orange-600 hover:text-orange-800 hover:underline font-medium"
                                                            >
                                                                {showAllComments 
                                                                    ? 'Show Less' 
                                                                    : `Show More (${ticket.comments.length - initialCommentCount} older comments)`
                                                                }
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()
                                    ) : (
                                        <div className="text-center py-6 w-full min-w-0 max-w-full overflow-x-hidden">
                                            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                            <p className="text-xs text-gray-400">No comments yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* Add Comment Form */}
                        {canAddComments && (
                            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
                                <div className="relative w-full min-w-0 max-w-full overflow-x-hidden">
                                    <textarea
                                        value={commentText || ''}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={6}
                                        className="w-full rounded-lg px-3 py-2 pr-12 focus:outline-none text-sm resize-none min-w-0 max-w-full cursor-text placeholder:text-gray-700 placeholder:text-sm bg-gradient-to-br from-gray-50 to-white border border-orange-300 shadow-sm focus:shadow-md transition-all duration-200"
                                        placeholder="Add a comment..."
                                        disabled={commentLoading || !canAddComments}
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment(e);
                                            }
                                        }}
                                    ></textarea>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={commentLoading || !commentText.trim() || !canAddComments}
                                        className="absolute bottom-2 right-2 p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:bg-gray-100 hover:shadow-md shadow-sm"
                                        title="Send comment"
                                    >
                                        {commentLoading ? (
                                            <Loader2 className="animate-spin w-4 h-4 text-orange-600" />
                                        ) : (
                                            <img 
                                                src={sendMailIcon} 
                                                alt="Send" 
                                                className="w-8 h-8"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
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