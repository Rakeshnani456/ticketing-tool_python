import React, { useState } from 'react';

const InlineCommentsInterface = ({ 
    comments = [], 
    onAddComment, 
    onAddReply, 
    loading = false,
    user,
    commentText,
    setCommentText
}) => {

    const handleSubmitComment = (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (commentText.trim()) {
            onAddComment(e);
        }
    };



    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const commentTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - commentTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    };


    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="modern-comments-container">
            {/* Resizer Button - At bottom right of entire container */}
            <div
                className="resizer-btn"
                title="Resize textarea"
            >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14ZM22 10H20V8H22V10ZM18 14H16V12H18V14ZM18 10H16V8H18V10ZM14 18H12V16H14V18ZM14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 22H8V20H10V22ZM10 18H8V16H10V18ZM10 14H8V12H10V14ZM10 10H8V8H10V10Z"/>
                </svg>
            </div>
            {/* Comment Input Area */}
            <div className="comment-input-section">
                <div className="comment-input-container">
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Share some thoughts..."
                        className="comment-textarea"
                        rows={3}
                    />
                </div>
                
                {/* Submit Button - Outside textarea container */}
                <div className="submit-button-container">
                    <button
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || loading}
                        className={`submit-btn ${commentText.trim() ? 'active' : 'inactive'}`}
                    >
                        {loading ? 'Adding...' : 'Submit'}
                    </button>
                </div>
                
            </div>

            {/* Comments Header */}
            <div className="comments-header">
                <div className="comments-title-section">
                    <h3 className="comments-title">Comments</h3>
                    <div className="comment-count-badge">
                        {comments.length}
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="comments-list">
                {comments.length === 0 ? (
                    <div className="empty-comments">
                        <p>No comments yet</p>
                    </div>
                ) : (
                    comments.map((comment, index) => (
                        <div key={comment.id || index} className="comment-item">
                            {/* Main Comment */}
                            <div className="main-comment">
                                <div className="comment-avatar">
                                    <span>{getInitials(comment.commenter_name || comment.commenter)}</span>
                                </div>
                                
                                <div className="comment-content">
                                    <div className="comment-header">
                                        <span className="commenter-name">
                                            {comment.commenter_name || comment.commenter || 'Anonymous'}
                                        </span>
                                        <span className="comment-timestamp">
                                            {formatTimeAgo(comment.timestamp || comment.created_at)}
                                        </span>
                                    </div>
                                    
                                    <p className="comment-text">
                                        {comment.comment || comment.comment_text || comment.text}
                                    </p>
                                    
                                </div>
                            </div>

                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InlineCommentsInterface;