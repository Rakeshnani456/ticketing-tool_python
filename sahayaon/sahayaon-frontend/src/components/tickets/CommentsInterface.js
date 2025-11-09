import React, { useState } from 'react';
import { X, Smile, MoreHorizontal } from 'lucide-react';

const CommentsInterface = ({ 
    comments = [], 
    onAddComment, 
    onAddReply, 
    loading = false,
    user 
}) => {
    const [newComment, setNewComment] = useState('');
    const [isOpen, setIsOpen] = useState(true);

    const handleSubmitComment = (e) => {
        e.preventDefault();
        if (newComment.trim()) {
            onAddComment(newComment.trim());
            setNewComment('');
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

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="comments-toggle-btn"
            >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
            </button>
        );
    }

    return (
        <div className="comments-interface">
            {/* Header */}
            <div className="comments-header">
                <h3 className="comments-title">Comments</h3>
                <button
                    onClick={() => setIsOpen(false)}
                    className="comments-close-btn"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Comments List */}
            <div className="comments-list">
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>No comments yet</p>
                    </div>
                ) : (
                    comments.map((comment, index) => (
                        <div key={comment.id || index} className="comment-item">
                            {/* Avatar */}
                            <div className="comment-avatar">
                                <span>
                                    {getInitials(comment.commenter_name || comment.commenter)}
                                </span>
                            </div>

                            {/* Comment Content */}
                            <div className="comment-content">
                                <div className="comment-header">
                                    <div className="flex items-center">
                                        <span className="comment-author">
                                            {comment.commenter_name || comment.commenter || 'Anonymous'}
                                        </span>
                                        <span className="comment-timestamp">
                                            {formatTimeAgo(comment.timestamp || comment.created_at)}
                                        </span>
                                    </div>
                                    <button className="comment-options">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <p className="comment-text">
                                    {comment.comment || comment.comment_text || comment.text}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Input */}
            <div className="new-comment-container">
                <form onSubmit={handleSubmitComment} className="new-comment-form">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Enter your comment"
                        className="new-comment-input"
                    />
                    <button className="new-comment-smile-btn">
                        <Smile className="w-4 h-4" />
                    </button>
                    <button
                        type="submit"
                        disabled={!newComment.trim() || loading}
                        className={`new-comment-send-btn ${
                            newComment.trim() ? 'active' : 'inactive'
                        }`}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CommentsInterface;