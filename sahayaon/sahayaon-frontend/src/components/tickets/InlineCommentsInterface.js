import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Heart, Reply } from 'lucide-react';

const EnhancedCommentsInterface = ({ 
    comments = [], 
    onAddComment, 
    onAddReply, 
    onLikeComment,
    loading = false,
    user = { name: 'Current User', id: 'user-1' },
    commentText,
    setCommentText
}) => {
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [likedComments, setLikedComments] = useState({});
    const textareaRef = useRef(null);

    // Auto-resize textarea
    const adjustTextareaHeight = (element) => {
        if (element) {
            element.style.height = 'auto';
            element.style.height = element.scrollHeight + 'px';
        }
    };

    useEffect(() => {
        adjustTextareaHeight(textareaRef.current);
    }, [commentText]);

    const handleSubmitComment = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (commentText.trim()) {
            await onAddComment?.(e);
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleReply = async (commentId) => {
        if (replyText.trim()) {
            await onAddReply?.(commentId, replyText);
            setReplyText('');
            setReplyingTo(null);
        }
    };

    const handleLike = (commentId) => {
        setLikedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
        onLikeComment?.(commentId);
    };

    const formatTimeAgo = (timestamp) => {
        const now = new Date();
        const commentTime = new Date(timestamp);
        const diffInMinutes = Math.floor((now - commentTime) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return commentTime.toLocaleDateString();
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (name) => {
        const colors = [
            'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 
            'bg-green-500', 'bg-yellow-500', 'bg-red-500',
            'bg-indigo-500', 'bg-teal-500'
        ];
        const index = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    const sortedComments = [...comments].sort((a, b) => {
        const at = new Date(a.timestamp || a.created_at || a.time || 0).getTime();
        const bt = new Date(b.timestamp || b.created_at || b.time || 0).getTime();
        return bt - at;
    });

    return (
        <div id="comments-interface" className="max-w-5xl mx-auto px-2 sm:px-3 py-2">
            <style>{`
                /* Absolute override for profile icons */
                #comments-interface .rounded-full {
                    color: #ffffff !important;
                }
                
                #comments-interface .rounded-full span {
                    color: #ffffff !important;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .comment-item {
                    animation: slideIn 0.3s ease-out;
                }

                .loading-dots::after {
                    content: '';
                    animation: dots 1.5s steps(4, end) infinite;
                }

                @keyframes dots {
                    0%, 20% { content: ''; }
                    40% { content: '.'; }
                    60% { content: '..'; }
                    80%, 100% { content: '...'; }
                }

                .heart-bounce {
                    animation: heartBounce 0.3s ease-in-out;
                }

                @keyframes heartBounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                }
                
                /* Force white text in profile icons and buttons with ultra high specificity */
                div.rounded-full span.text-white,
                div.rounded-full span,
                div.bg-blue-500 span,
                div.bg-purple-500 span,
                div.bg-pink-500 span,
                div.bg-green-500 span,
                div.bg-yellow-500 span,
                div.bg-red-500 span,
                div.bg-indigo-500 span,
                div.bg-teal-500 span {
                    color: #ffffff !important;
                    opacity: 1 !important;
                }
                
                .text-white,
                span.text-white {
                    color: #ffffff !important;
                    opacity: 1 !important;
                }
                
                button.bg-indigo-600,
                button.bg-indigo-600:hover,
                button.bg-indigo-700,
                button.bg-indigo-700:hover {
                    color: #ffffff !important;
                }
                
                button.bg-indigo-600 svg,
                button.bg-indigo-600 span,
                button.bg-indigo-700 svg,
                button.bg-indigo-700 span,
                button.bg-indigo-600:hover svg,
                button.bg-indigo-600:hover span {
                    color: #ffffff !important;
                    fill: #ffffff !important;
                    stroke: #ffffff !important;
                }
            `}</style>

            {/* Header intentionally omitted to avoid duplication with parent tabs */}

            {/* Comment Input */}
            <div className="mb-2">
                <div className="flex gap-1.5">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center antialiased font-bold text-[12px] sm:text-[12px] flex-shrink-0 ring-1 ring-white/80 shadow-sm`}>
                        <span style={{ color: 'rgb(255, 255, 255)', fontWeight: 'bold' }}>{getInitials(user.name)}</span>
                    </div>
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={commentText}
                            onChange={(e) => {
                                setCommentText(e.target.value);
                                adjustTextareaHeight(e.target);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    // Shift+Enter creates a new line (default behavior)
                                    if (e.shiftKey) {
                                        // Allow default behavior for new line
                                        return;
                                    }
                                    // Plain Enter submits the comment
                                    e.preventDefault();
                                    handleSubmitComment(e);
                                }
                            }}
                            placeholder="What are your thoughts?"
                            className="w-full px-2.5 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none min-h-[100px] bg-white text-sm font-normal text-gray-900"
                            rows={1}
                        />
                        <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[11px] text-gray-500 font-medium">
                                Tip: Press Shift + Enter for new line
                            </span>
                            <button
                                onClick={handleSubmitComment}
                                disabled={!commentText.trim() || loading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                                    commentText.trim() && !loading
                                        ? 'bg-indigo-600 hover:bg-indigo-700 !text-white'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-white font-bold">Posting</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className={`w-3.5 h-3.5 ${commentText.trim() ? 'text-white' : ''}`} />
                                        <span className={commentText.trim() ? 'text-white font-bold' : 'font-bold'}>Post</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
                {sortedComments.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-7 h-7 text-slate-600" />
                        </div>
                        <p className="text-gray-900 text-base font-bold tracking-tight">No comments available</p>
                        <p className="text-gray-600 text-sm mt-1 font-medium">Add a comment to provide updates or additional information</p>
                    </div>
                ) : (
                    sortedComments.map((comment, index) => {
                        const commentId = comment.id || index;
                        const isLiked = likedComments[commentId];
                        const likesCount = (comment.likes || 0) + (isLiked ? 1 : 0);

                        return (
                            <div key={commentId} className="comment-item bg-white pb-3 border-b border-gray-100 last:border-b-0 transition-all duration-200">
                                <div className="flex gap-2 group">
                                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(comment.commenter_name || comment.commenter)} flex items-center justify-center antialiased font-bold text-[12px] flex-shrink-0 ring-1 ring-white/80 shadow-sm`}>
                                        <span style={{ color: 'rgb(255, 255, 255)', fontWeight: 'bold' }}>{getInitials(comment.commenter_name || comment.commenter)}</span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 relative">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-gray-900 text-[13px] tracking-tight">
                                                        {comment.commenter_name || comment.commenter || 'Anonymous'}
                                                    </span>
                                                    <span className="text-gray-600 text-xs ml-2 font-semibold">
                                                        {formatTimeAgo(comment.timestamp || comment.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <p className="text-gray-900 leading-relaxed text-sm break-words font-normal">
                                                {comment.comment || comment.comment_text || comment.text}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1 ml-0.5">
                                                <button
                                                    onClick={() => handleLike(commentId)}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors ${
                                                        isLiked
                                                            ? 'bg-red-50 text-red-600'
                                                            : 'text-gray-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <Heart
                                                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600 heart-bounce' : ''}`}
                                                    />
                                                    {likesCount > 0 && (
                                                        <span className="text-xs font-bold">{likesCount}</span>
                                                    )}
                                                </button>
                                                
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === commentId ? null : commentId)}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 text-gray-700 hover:bg-slate-100 rounded-md transition-colors"
                                                >
                                                    <Reply className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-semibold">Reply</span>
                                                </button>
                                        </div>
                                        
                                        {replyingTo === commentId && (
                                            <div className="mt-1.5 flex gap-1.5">
                                                <input
                                                    type="text"
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Write a reply..."
                                                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-normal text-gray-900"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleReply(commentId);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleReply(commentId)}
                                                    disabled={!replyText.trim()}
                                                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold ${
                                                        replyText.trim()
                                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Reply
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-2 space-y-1.5 pl-2.5 border-l border-slate-200">
                                                {comment.replies.map((reply, ridx) => (
                                                    <div key={reply.id || ridx} className="flex gap-1.5">
                                                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(reply.commenter)} flex items-center justify-center antialiased text-[10px] font-bold flex-shrink-0 ring-1 ring-white/80`}>
                                                            <span style={{ color: 'rgb(255, 255, 255)', fontWeight: 'bold' }}>{getInitials(reply.commenter)}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="bg-white rounded-lg px-2.5 py-1.5 shadow-none border border-slate-100">
                                                                <div>
                                                                    <span className="font-bold text-[13px] text-gray-900 tracking-tight">
                                                                        {reply.commenter}
                                                                    </span>
                                                                    <span className="text-gray-600 text-[11px] ml-2 font-semibold">
                                                                        {formatTimeAgo(reply.timestamp)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-900 font-normal mt-1">
                                                                    {reply.text}
                                                                </p>
                                                            </div>
                                                            {reply.likes > 0 && (
                                                                <div className="flex items-center gap-1 mt-1.5 ml-2 text-slate-400">
                                                                    <Heart className="w-3 h-3 fill-slate-400" />
                                                                    <span className="text-[11px]">{reply.likes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default EnhancedCommentsInterface;