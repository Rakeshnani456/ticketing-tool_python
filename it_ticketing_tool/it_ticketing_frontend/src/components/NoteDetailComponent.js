// src/components/NoteDetailComponent.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    ArrowLeft, 
    Edit3, 
    Trash2, 
    Pin, 
    PinOff, 
    Calendar,
    Clock,
    Tag
} from 'lucide-react';

// Styles for full-width layout
const styles = `
    .note-detail-full-width {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 16px 24px 16px !important;
    }
    
    .note-detail-full-width .note-content-container {
        width: 100% !important;
        max-width: 100% !important;
    }
`;

const NoteDetailComponent = ({ user, showFlashMessage }) => {
    const { noteId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [note, setNote] = useState(location.state?.note || null);
    const [loading, setLoading] = useState(!location.state?.note);
    const [deleting, setDeleting] = useState(false);

    const categories = [
        { value: 'general', label: 'General' },
        { value: 'technical', label: 'Technical' },
        { value: 'meeting', label: 'Meeting Notes' },
        { value: 'todo', label: 'To-Do' },
        { value: 'reference', label: 'Reference' }
    ];

    // Fetch single note
    const fetchNote = useCallback(async () => {
        if (!user?.firebaseUser || !noteId) return;

        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${noteId}`, {
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNote(data.note);
            } else             if (response.status === 404) {
                showFlashMessage('Note not found', 'error');
                navigate(-1);
            } else {
                showFlashMessage('Failed to fetch note', 'error');
                navigate(-1);
            }
        } catch (error) {
            console.error('Error fetching note:', error);
            showFlashMessage('Failed to fetch note', 'error');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [user?.firebaseUser, noteId, showFlashMessage, navigate]);

    // Load note on mount only if we don't have it from navigation state
    useEffect(() => {
        if (!location.state?.note) {
            fetchNote();
        }
    }, [fetchNote, location.state?.note]);

    // Toggle pin status
    const handleTogglePin = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${noteId}/pin`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNote(data.note);
                showFlashMessage(data.note.is_pinned ? 'Note pinned!' : 'Note unpinned!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to toggle pin status', 'error');
            }
        } catch (error) {
            console.error('Error toggling pin status:', error);
            showFlashMessage('Failed to toggle pin status', 'error');
        }
    };

    // Delete note
    const handleDeleteNote = async () => {
        if (!window.confirm('Are you sure you want to delete this note?')) {
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                showFlashMessage('Note deleted successfully!', 'success');
                navigate(-1);
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to delete note', 'error');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            showFlashMessage('Failed to delete note', 'error');
        } finally {
            setDeleting(false);
        }
    };

    // Edit note
    const handleEditNote = () => {
        navigate(`/notes/${noteId}/edit`);
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'No date';
        
        let date;
        if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
            date = new Date(dateValue._seconds * 1000);
        } else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
            date = new Date(dateValue.seconds * 1000);
        } else if (dateValue && typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
            date = dateValue.toDate();
        } else {
            date = new Date(dateValue);
        }
        
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        return date.toLocaleString();
    };

    const getCategoryColor = (category) => {
        const colors = {
            general: 'bg-yellow-100 text-yellow-800',
            technical: 'bg-blue-100 text-blue-800',
            meeting: 'bg-green-100 text-green-800',
            todo: 'bg-orange-100 text-orange-800',
            reference: 'bg-purple-100 text-purple-800'
        };
        return colors[category] || colors.general;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="text-center py-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Note not found</h3>
                <p className="text-gray-500 mb-4">The note you're looking for doesn't exist or has been deleted.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="w-full px-4 py-6" style={{ maxWidth: '100%', margin: '0' }}>
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </button>
                
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{note.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(note.category)}`}>
                                {categories.find(c => c.value === note.category)?.label}
                            </span>
                            {note.is_pinned && (
                                <span className="inline-flex items-center text-yellow-600">
                                    <Pin className="w-4 h-4 mr-1" />
                                    Pinned
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 ml-4">
                        <button
                            onClick={handleTogglePin}
                            className="flex items-center px-2 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            {note.is_pinned ? <PinOff className="w-3 h-3 mr-1" /> : <Pin className="w-3 h-3 mr-1" />}
                            {note.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                            onClick={handleEditNote}
                            className="flex items-center px-2 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit
                        </button>
                        <button
                            onClick={handleDeleteNote}
                            disabled={deleting}
                            className="flex items-center px-2 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Note Content */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Created: {formatDate(note.created_at)}</span>
                        </div>
                        {note.updated_at && note.created_at && note.updated_at !== note.created_at && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>Updated: {formatDate(note.updated_at)}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="prose max-w-none">
                    <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {note.content || 'No content available'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteDetailComponent;
