// src/components/tickets/TicketUpdatesSection.js

import React, { useRef } from 'react';
import { MessageSquare, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import UserProfilePopup from '../common/UserProfilePopup';

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
    visibleCommentCount,
    setVisibleCommentCount,
    isAtBottom,
    setIsAtBottom,
    user,
    profilePopup,
    showProfilePopup,
    cancelShowProfilePopup,
    hidePopup,
    popupHideTimeout
}) => {
    const commentsSectionRef = useRef(null);

    return (
        <div className="max-w-full w-full mx-auto py-1 space-y-1 min-w-0 overflow-x-hidden">
            <div ref={commentsSectionRef} id="comments-section" className="bg-white p-3 sm:p-4 w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="border-b border-gray-200 mb-2 sm:mb-3 w-full min-w-0 max-w-full overflow-x-hidden">
                    <nav className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-4 w-full min-w-0 max-w-full overflow-x-hidden">
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`py-1 sm:py-1.5 px-1.5 sm:px-2 border-b-2 font-semibold text-xs transition-all duration-200 rounded-t-md ${activeTab === 'comments'
                                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <MessageSquare className="w-3 h-3 inline mr-1" />
                            Comments
                        </button>
                        <button
                            onClick={() => setActiveTab('closure')}
                            className={`py-1 sm:py-1.5 px-1.5 sm:px-2 border-b-2 font-semibold text-xs transition-all duration-200 rounded-t-md ${activeTab === 'closure'
                                    ? 'border-blue-600 text-blue-700 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <CheckCircle2 className="w-3 h-3 inline mr-1" />
                            Closure
                        </button>
                    </nav>
                </div>

                {activeTab === 'comments' && (
                    <div className="bg-white border border-gray-300 rounded-lg p-2 sm:p-3 w-full min-w-0 max-w-full overflow-x-hidden">
                        <label className="block text-xs font-bold text-gray-800 mb-1 sm:mb-1.5">
                            Comments:
                        </label>
                        {/* Comments List with Smooth Scrolling */}
                        <div className="relative mb-2 sm:mb-3 w-full min-w-0 max-w-full overflow-x-hidden">
                            {/* Scrollable Comments Container */}
                            <div 
                                id="comments-container"
                                className="max-h-64 overflow-y-auto pr-1 w-full min-w-0 max-w-full overflow-x-hidden"
                                style={{
                                    scrollbarWidth: 'thin',
                                    scrollbarColor: '#cbd5e1 #f1f5f9'
                                }}
                                onScroll={(e) => {
                                    const container = e.target;
                                    const scrollTop = container.scrollTop;
                                    const scrollHeight = container.scrollHeight;
                                    const clientHeight = container.clientHeight;
                                    const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
                                    
                                    // Only update state if it's actually changing to prevent flickering
                                    if (isBottom !== isAtBottom) {
                                        setIsAtBottom(isBottom);
                                    }
                                }}
                                onWheel={(e) => {
                                    e.stopPropagation = false;
                                }}
                            >
                                <style>
                                    {`
                                        #comments-container::-webkit-scrollbar {
                                            width: 6px;
                                        }
                                        #comments-container::-webkit-scrollbar-track {
                                            background: #f1f5f9;
                                            border-radius: 3px;
                                        }
                                        #comments-container::-webkit-scrollbar-thumb {
                                            background: #cbd5e1;
                                            border-radius: 3px;
                                        }
                                        #comments-container::-webkit-scrollbar-thumb:hover {
                                            background: #94a3b8;
                                        }
                                    `}
                                </style>
                                
                                <div className="space-y-2 w-full min-w-0 max-w-full">
                                    {/* Comments Display */}
                                    {ticket.comments && ticket.comments.length > 0 ? (
                                        (() => {
                                            const sortedComments = [...ticket.comments].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                            const displayedComments = sortedComments.slice(-visibleCommentCount);

                                            return displayedComments.map((comment, index) => {
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
                                                                <div className={`inline-block px-2 py-1.5 rounded-2xl min-w-0 flex-1 overflow-hidden ${
                                                                    isCurrentUser 
                                                                        ? 'bg-green-100 rounded-tr-md' 
                                                                        : 'bg-gray-100 rounded-tl-md'
                                                                }`}>
                                                                    <div className="mb-0.5 min-w-0">
                                                                        <span className="font-semibold text-xs truncate block">
                                                                            {comment.commenter || 'Anonymous'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs whitespace-pre-wrap break-words min-w-0 overflow-hidden">
                                                                        {comment.text}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[10px] shrink-0">
                                                                    {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()
                                    ) : (
                                        <div className="text-center py-6 w-full min-w-0 max-w-full overflow-x-hidden">
                                            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                            <p className="text-xs text-gray-400">No comments yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Latest Comments Overlay Button */}
                            {ticket.comments && ticket.comments.length > 2 && !isAtBottom && (
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const commentsContainer = document.getElementById('comments-container');
                                            if (commentsContainer) {
                                                // Set isAtBottom to true immediately to prevent flickering
                                                setIsAtBottom(true);
                                                // Then scroll to bottom
                                                commentsContainer.scrollTo({
                                                    top: commentsContainer.scrollHeight,
                                                    behavior: 'smooth'
                                                });
                                            }
                                        }}
                                        className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-full px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-white text-xs font-medium flex items-center justify-center gap-1 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        Latest
                                        <span>↓</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Add Comment Form */}
                        {canAddComments && (
                            <div className="bg-white border border-gray-200 rounded-md p-1.5 w-full min-w-0 max-w-full overflow-x-hidden">
                                <div className="flex gap-1 w-full min-w-0 max-w-full overflow-x-hidden">
                                    <textarea
                                        value={commentText || ''}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={6}
                                        className="flex-1 rounded-md px-1.5 py-1 focus:outline-none text-xs resize-none min-w-0 max-w-full cursor-text placeholder:text-gray-400 placeholder:text-xs"
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
                                        className="px-2 py-1 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        style={{ height: '24px', minHeight: '24px' }}
                                    >
                                        {commentLoading ? <Loader2 className="animate-spin w-3 h-3" /> : 'Post'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
                                    className={`px-2 py-1 text-xs font-semibold text-white rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 ${
                                        closeButtonState === 'success' 
                                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-300' 
                                            : closeButtonState === 'error' 
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-300'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-300'
                                    }`}
                                    style={{ height: '24px', minHeight: '24px' }}
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