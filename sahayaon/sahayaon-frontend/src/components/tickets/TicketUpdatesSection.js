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
    console.log('TicketUpdatesSection - isSupportUser:', isSupportUser, 'user role:', user?.role, 'activeTab:', activeTab, 'setActiveTab:', typeof setActiveTab);
    
    // Fallback for activeTab if not provided
    const currentTab = activeTab || 'comments';
    

    return (
        <div className="w-full py-2 space-y-2 min-w-0 overflow-x-hidden">
            <div ref={commentsSectionRef} id="comments-section" className="bg-white rounded-xl shadow-sm border border-gray-200 w-full min-w-0 overflow-x-hidden">
                {/* Enhanced Modern Tab Navigation */}
                <div className="border-b-2 border-gray-200 bg-white rounded-t-xl">
                    <nav className="flex space-x-0 w-full min-w-0 max-w-full overflow-x-hidden">
                        <button
                            onClick={() => setActiveTab && setActiveTab('comments')}
                            className={`flex-1 py-3 px-4 border-b-3 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 tracking-wide relative ${
                                currentTab === 'comments'
                                    ? 'border-blue-600 text-blue-800 bg-blue-50 shadow-md'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            <div className={`p-2 rounded-lg transition-all duration-200 ${
                                currentTab === 'comments' ? 'bg-blue-200 shadow-sm' : 'bg-gray-200'
                            }`}>
                                <MessageSquare className={`w-4 h-4 ${
                                    currentTab === 'comments' ? 'text-blue-700' : 'text-gray-600'
                                }`} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm">Comments</span>
                                <span className="text-xs font-medium text-gray-600">Discussion & Updates</span>
                            </div>
                            {ticket?.comments?.length > 0 && (
                                <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    currentTab === 'comments' 
                                        ? 'bg-blue-200 text-blue-800 shadow-sm' 
                                        : 'bg-gray-300 text-gray-700'
                                }`}>
                                    {ticket.comments.length}
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab && setActiveTab('closure')}
                            className={`flex-1 py-3 px-4 border-b-3 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3 tracking-wide relative ${
                                currentTab === 'closure'
                                    ? 'border-green-600 text-green-800 bg-green-50 shadow-md'
                                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            <div className={`p-2 rounded-lg transition-all duration-200 ${
                                currentTab === 'closure' ? 'bg-green-200 shadow-sm' : 'bg-gray-200'
                            }`}>
                                <CheckCircle2 className={`w-4 h-4 ${
                                    currentTab === 'closure' ? 'text-green-700' : 'text-gray-600'
                                }`} />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-sm">Resolution</span>
                                <span className="text-xs font-medium text-gray-600">Close & Document</span>
                            </div>
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

                {currentTab === 'closure' && (
                    <div className="p-4 sm:p-6 w-full min-w-0 max-w-full overflow-x-hidden">
                        {/* Show closure notes only to super_admin, admin, and support users */}
                        {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'support') ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-2 tracking-tight">
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
                                                <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight">
                                                    Ticket Closed
                                                </h3>
                                                <div className="bg-white rounded-md p-3 text-left">
                                                    <p className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Resolution Summary:</p>
                                                    <p className="text-sm text-gray-800 font-normal whitespace-pre-wrap leading-relaxed">{closureNotes}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Show "being reviewed" message when ticket is not yet closed or has no closure notes
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                        <CheckCircle2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                                        <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight">
                                            Ticket Closure Information
                                        </h3>
                                        <p className="text-sm text-gray-700 font-medium">
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