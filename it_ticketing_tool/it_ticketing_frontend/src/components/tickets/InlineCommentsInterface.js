import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, MoreVertical, Heart, Reply, Edit2, Trash2 } from 'lucide-react';

const EnhancedCommentsInterface = ({ 
    comments = [], 
    onAddComment, 
    onAddReply, 
    onDeleteComment,
    onEditComment,
    onLikeComment,
    loading = false,
    user = { name: 'Current User', id: 'user-1' },
    commentText,
    setCommentText
}) => {
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [editingComment, setEditingComment] = useState(null);
    const [editText, setEditText] = useState('');
    const [openMenus, setOpenMenus] = useState({});
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

    const handleEdit = async (commentId) => {
        if (editText.trim()) {
            await onEditComment?.(commentId, editText);
            setEditingComment(null);
            setEditText('');
        }
    };

    const handleLike = (commentId) => {
        setLikedComments(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
        onLikeComment?.(commentId);
    };

    const toggleMenu = (commentId) => {
        setOpenMenus(prev => ({
            ...prev,
            [commentId]: !prev[commentId]
        }));
    };

    const startEdit = (comment) => {
        setEditingComment(comment.id);
        setEditText(comment.comment || comment.comment_text || comment.text);
        setOpenMenus({});
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
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3">
            <style>{`
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
            `}</style>

            {/* Header intentionally omitted to avoid duplication with parent tabs */}

            {/* Comment Input */}
            <div className="mb-3">
                <div className="flex gap-2">
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-white antialiased font-bold text-[12px] sm:text-[12px] flex-shrink-0 ring-1 ring-white/80 shadow-sm`}>
                        {getInitials(user.name)}
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
                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    handleSubmitComment(e);
                                }
                            }}
                            placeholder="What are your thoughts?"
                            className="w-full px-3 py-3 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none min-h-[120px] bg-white text-sm"
                            rows={1}
                        />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] text-slate-400">
                                Tip: Press Cmd/Ctrl + Enter to submit
                            </span>
                            <button
                                onClick={handleSubmitComment}
                                disabled={!commentText.trim() || loading}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    commentText.trim() && !loading
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span className="loading-dots">Posting</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Post</span>
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
                            <MessageSquare className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-base font-medium">No comments yet</p>
                        <p className="text-slate-400 text-sm mt-1">Be the first to share your thoughts!</p>
                    </div>
                ) : (
                    sortedComments.map((comment, index) => {
                        const commentId = comment.id || index;
                        const isEditing = editingComment === commentId;
                        const isLiked = likedComments[commentId];
                        const likesCount = (comment.likes || 0) + (isLiked ? 1 : 0);

                        return (
                            <div key={commentId} className="comment-item">
                                <div className="flex gap-3 group">
                                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(comment.commenter_name || comment.commenter)} flex items-center justify-center text-white antialiased font-bold text-[12px] flex-shrink-0 ring-1 ring-white/80 shadow-sm`}>
                                        {getInitials(comment.commenter_name || comment.commenter)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="bg-slate-50 rounded-lg px-3 py-2 relative">
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div>
                                                    <span className="font-semibold text-slate-900 text-[13px]">
                                                        {comment.commenter_name || comment.commenter || 'Anonymous'}
                                                    </span>
                                                    <span className="text-slate-500 text-xs ml-2">
                                                        {formatTimeAgo(comment.timestamp || comment.created_at)}
                                                    </span>
                                                </div>
                                                
                                                <div className="relative">
                                                    <button
                                                        onClick={() => toggleMenu(commentId)}
                                                        className="p-1 hover:bg-slate-200 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                                                    </button>
                                                    
                                                    {openMenus[commentId] && (
                                                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-10">
                                                            <button
                                                                onClick={() => startEdit(comment)}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onDeleteComment?.(commentId);
                                                                    setOpenMenus({});
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {isEditing ? (
                                                <div>
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:border-indigo-500 outline-none resize-none bg-white text-sm"
                                                        rows={3}
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <button
                                                            onClick={() => handleEdit(commentId)}
                                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingComment(null);
                                                                setEditText('');
                                                            }}
                                                            className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-md hover:bg-slate-300"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-700 leading-relaxed text-sm">
                                                    {comment.comment || comment.comment_text || comment.text}
                                                </p>
                                            )}
                                        </div>
                                        
                                        {!isEditing && (
                                            <div className="flex items-center gap-2.5 mt-1.5 ml-1">
                                                <button
                                                    onClick={() => handleLike(commentId)}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                                                        isLiked
                                                            ? 'bg-red-50 text-red-600'
                                                            : 'text-slate-500 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <Heart
                                                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-600 heart-bounce' : ''}`}
                                                    />
                                                    {likesCount > 0 && (
                                                        <span className="text-xs font-medium">{likesCount}</span>
                                                    )}
                                                </button>
                                                
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === commentId ? null : commentId)}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
                                                >
                                                    <Reply className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Reply</span>
                                                </button>
                                            </div>
                                        )}
                                        
                                        {replyingTo === commentId && (
                                            <div className="mt-2.5 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Write a reply..."
                                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-md focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleReply(commentId);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleReply(commentId)}
                                                    disabled={!replyText.trim()}
                                                    className={`px-3.5 py-2 rounded-md text-xs font-medium ${
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
                                            <div className="mt-3 space-y-2 pl-3 border-l border-slate-200">
                                                {comment.replies.map((reply, ridx) => (
                                                    <div key={reply.id || ridx} className="flex gap-2">
                                                        <div className={`w-7 h-7 rounded-full ${getAvatarColor(reply.commenter)} flex items-center justify-center text-white antialiased text-[10px] font-bold flex-shrink-0 ring-1 ring-white/80`}>
                                                            {getInitials(reply.commenter)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="bg-white rounded-lg px-3 py-2 shadow-none border border-slate-100">
                                                                <div>
                                                                    <span className="font-semibold text-[13px] text-slate-900">
                                                                        {reply.commenter}
                                                                    </span>
                                                                    <span className="text-slate-500 text-[11px] ml-2">
                                                                        {formatTimeAgo(reply.timestamp)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-slate-700 mt-1">
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