// src/components/PersonalNotesComponent.js

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from './common/CustomDropdown';
import { API_BASE_URL } from '../config/constants';
import { 
    Plus, 
    Search, 
    Filter, 
    Pin, 
    PinOff, 
    Edit3, 
    Trash2, 
    Save, 
    X, 
    FileText,
    Calendar,
    Tag,
    MoreVertical,
    Loader2,
    Eye,
    Clock
} from 'lucide-react';

// Optimized styles for clean note card layout
const styles = `
    /* Container and layout */
    .personal-notes-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 16px;
        width: 100%;
        box-sizing: border-box;
    }
    
    /* Note card container */
    .personal-notes-container .note-card {
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        margin-bottom: 12px;
        overflow: hidden;
        border-radius: 8px;
        transition: all 0.2s ease;
    }
    
    .personal-notes-container .note-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* Main flex container for note content */
    .personal-notes-container .note-card .flex {
        display: flex;
        align-items: stretch;
        gap: 12px;
        width: 100%;
        min-height: 100px;
    }
    
    /* Content area - takes up most space */
    .personal-notes-container .note-content {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 8px;
        justify-content: space-between;
    }
    
    /* Note title */
    .personal-notes-container .note-content h3 {
        font-size: 14px;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
        line-height: 1.4;
        word-break: break-word;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        transition: color 0.2s ease;
    }
    
    /* Hover effects for note title */
    .personal-notes-container .note-card:hover .note-content h3 {
        color: #3b82f6;
    }
    
    .personal-notes-container .note-content h3:hover {
        color: #3b82f6;
        text-decoration: underline;
    }
    
    /* Note content text */
    .personal-notes-container .note-content .line-clamp-2 {
        font-size: 12px;
        color: #6b7280;
        line-height: 1.4;
        margin: 0;
        word-break: break-word;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }
    
    /* Date container at bottom */
    .personal-notes-container .note-content .date-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        gap: 8px;
        flex-shrink: 0;
    }
    
    /* Created date */
    .personal-notes-container .note-content .created-date {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #9ca3af;
        flex-shrink: 0;
    }
    
    .personal-notes-container .note-content .created-date svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
    }
    
    /* Updated date */
    .personal-notes-container .note-content .updated-date {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #9ca3af;
        flex-shrink: 0;
    }
    
    .personal-notes-container .note-content .updated-date svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
    }
    
    /* Actions area - positioned at bottom right */
    .personal-notes-container .note-actions {
        flex-shrink: 0;
        width: 120px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 8px;
        align-self: stretch;
    }
    
    /* Category tag */
    .personal-notes-container .note-actions .category-tag {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }
    
    /* Action buttons container - positioned at bottom */
    .personal-notes-container .note-actions .action-buttons {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        justify-content: flex-end;
        margin-top: auto;
    }
    
    /* Individual action buttons - larger size */
    .personal-notes-container .note-actions .action-buttons button {
        padding: 6px;
        border-radius: 6px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
    }
    
    .personal-notes-container .note-actions .action-buttons button:hover {
        background-color: #f3f4f6;
        transform: scale(1.05);
    }
    
    .personal-notes-container .note-actions .action-buttons button svg {
        width: 16px;
        height: 16px;
    }
    
    
    /* Line clamp utility */
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    /* Add note button styles */
    .personal-notes-container .add-note-btn {
        background-color: #ea580c !important;
        background: #ea580c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    .personal-notes-container .add-note-btn:hover {
        background-color: #c2410c !important;
        background: #c2410c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    .personal-notes-container .add-note-btn:focus {
        background-color: #ea580c !important;
        background: #ea580c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    .personal-notes-container .add-note-btn:active {
        background-color: #c2410c !important;
        background: #ea580c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    
    /* Responsive design */
    @media (max-width: 768px) {
        .personal-notes-container .note-card .flex {
            flex-direction: column;
            gap: 8px;
        }
        
        .personal-notes-container .note-actions {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .personal-notes-container .note-actions .action-buttons {
            order: 2;
            margin-top: 0;
        }
        
        .personal-notes-container .note-actions .category-tag {
            order: 1;
        }
        
        .personal-notes-container .note-content .date-container {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
        }
    }
`;

// TooltipBubble component for hover tooltips
function TooltipBubble({ title, children }) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);

    useEffect(() => {
        if (show && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const tooltipWidth = 120; // Approximate tooltip width for button tooltips
            
            // Center the tooltip under the element
            let leftPosition = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            
            // Ensure tooltip doesn't go off-screen to the right
            if (leftPosition + tooltipWidth > viewportWidth - 10) {
                leftPosition = viewportWidth - tooltipWidth - 10;
            }
            
            // Ensure tooltip doesn't go off-screen to the left
            if (leftPosition < 10) {
                leftPosition = 10;
            }
            
            setCoords({
                top: rect.bottom + 8, // Position directly under the element
                left: leftPosition,
            });
        }
    }, [show]);

    return (
        <div
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            ref={iconRef}
        >
            {children}
            {show && createPortal(
                <div
                    className="fade-in"
                    style={{
                        position: 'fixed',
                        left: coords.left,
                        top: coords.top,
                        background: '#000000',
                        color: '#ffffff',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                >
                    {title}
                </div>,
                document.body
            )}
        </div>
    );
}

const PersonalNotesComponent = ({ user, showFlashMessage }) => {
    const navigate = useNavigate();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [addingNote, setAddingNote] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'general'
    });

    // Cache configuration - Extended cache duration for better performance
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    const CACHE_KEY = `personal_notes_${user?.uid}`;
    
    // Cache utility functions
    const getCachedNotes = useCallback(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const cacheTime = localStorage.getItem(`${CACHE_KEY}_time`);
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < CACHE_DURATION) {
                    console.log('📦 Loading notes from cache');
                    return JSON.parse(cached);
                }
            }
        } catch (error) {
            console.warn('Failed to read notes cache:', error);
        }
        return null;
    }, [CACHE_KEY, CACHE_DURATION]);
    
    const setCachedNotes = useCallback((data) => {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
        } catch (error) {
            console.warn('Failed to write notes cache:', error);
        }
    }, [CACHE_KEY]);

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'general', label: 'General' },
        { value: 'technical', label: 'Technical' },
        { value: 'meeting', label: 'Meeting Notes' },
        { value: 'todo', label: 'To-Do' },
        { value: 'reference', label: 'Reference' }
    ];

    // Fetch personal notes with optimized loading
    const fetchNotes = useCallback(async (forceRefresh = false) => {
        if (!user?.firebaseUser) return;

        try {
            // Check cache first unless force refresh
            if (!forceRefresh) {
                const cachedNotes = getCachedNotes();
                if (cachedNotes !== null) {
                    setNotes(cachedNotes);
                    setLoading(false);
                    return;
                }
            }
            
            // Only set loading when we actually need to fetch
            setLoading(true);
            console.log('🔄 Fetching fresh notes data');
            
            // Add request timeout and abort controller for better performance
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${API_BASE_URL}/api/personal-notes`, {
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched notes data:', data.notes);
                setNotes(data.notes || []);
                setCachedNotes(data.notes || []);
            } else {
                showFlashMessage('Failed to fetch my notes', 'error');
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was aborted due to timeout');
                showFlashMessage('Request timed out. Please try again.', 'error');
            } else {
                console.error('Error fetching my notes:', error);
                showFlashMessage('Failed to fetch my notes', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [user?.firebaseUser, getCachedNotes, setCachedNotes, showFlashMessage]);

    // Load notes on mount
    useEffect(() => {
        console.log('🔄 PersonalNotesComponent useEffect triggered');
        if (user?.firebaseUser) {
            // Check cache first - this is synchronous so no loading state needed
            const cachedNotes = getCachedNotes();
            if (cachedNotes !== null) {
                console.log('📦 Loading notes from cache on mount, notes count:', cachedNotes.length);
                setNotes(cachedNotes);
                setLoading(false);
                return; // Exit early, no loading state
            }
            
            console.log('🔄 No cached data found, fetching fresh data');
            // Only fetch if no cached data
            fetchNotes();
        } else {
            console.log('🔄 No user found, setting loading to false');
            setLoading(false);
        }
    }, [user?.firebaseUser, getCachedNotes, fetchNotes]);

    // Add new note
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            showFlashMessage('Title and content are required', 'error');
            return;
        }

        setAddingNote(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                const updatedNotes = [data.note, ...notes];
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                setFormData({ title: '', content: '', category: 'general' });
                setShowAddForm(false);
                showFlashMessage('Note added successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to add note', 'error');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            showFlashMessage('Failed to add note', 'error');
        } finally {
            setAddingNote(false);
        }
    };

    // Update note
    const handleUpdateNote = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            showFlashMessage('Title and content are required', 'error');
            return;
        }

        setAddingNote(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${editingNote.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                const updatedNotes = notes.map(note => note.id === editingNote.id ? data.note : note);
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                setEditingNote(null);
                setFormData({ title: '', content: '', category: 'general' });
                setShowAddForm(false);
                showFlashMessage('Note updated successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to update note', 'error');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            showFlashMessage('Failed to update note', 'error');
        } finally {
            setAddingNote(false);
        }
    };

    // Delete note
    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this note?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const updatedNotes = notes.filter(note => note.id !== noteId);
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
                showFlashMessage('Note deleted successfully!', 'success');
            } else {
                const errorData = await response.json();
                showFlashMessage(errorData.error || 'Failed to delete note', 'error');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            showFlashMessage('Failed to delete note', 'error');
        }
    };

    // Toggle pin status
    const handleTogglePin = async (noteId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/personal-notes/${noteId}/pin`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const updatedNotes = notes.map(note => note.id === noteId ? data.note : note);
                setNotes(updatedNotes);
                setCachedNotes(updatedNotes);
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

    // Start editing
    const startEditing = (note) => {
        setEditingNote(note);
        setFormData({
            title: note.title,
            content: note.content,
            category: note.category
        });
        setShowAddForm(true);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingNote(null);
        setFormData({ title: '', content: '', category: 'general' });
        setShowAddForm(false);
    };


    // Memoized filter and sort operations for better performance
    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                note.content.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [notes, searchTerm, selectedCategory]);

    // Memoized sorted notes
    const sortedNotes = useMemo(() => {
        return filteredNotes.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });
    }, [filteredNotes]);

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
            general: 'bg-yellow-100 text-black-800',
            technical: 'bg-blue-100 text-blue-800',
            meeting: 'bg-green-100 text-green-800',
            todo: 'bg-orange-100 text-orange-800',
            reference: 'bg-purple-100 text-purple-800'
        };
        return colors[category] || colors.general;
    };

    // Loading skeleton component for better UX
    const LoadingSkeleton = () => (
        <div className="space-y-2 w-full">
            {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-md p-3 animate-pulse">
                    <div className="flex items-start justify-between w-full">
                        <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                            <div className="flex items-center gap-4">
                                <div className="h-3 bg-gray-200 rounded w-24"></div>
                                <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-24">
                            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                            <div className="flex gap-1">
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                                <div className="h-6 w-6 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // Only show loading skeleton if we're actually loading AND don't have any notes
    if (loading && notes.length === 0) {
        return (
            <div className="personal-notes-container">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <>
            <style>{styles}</style>
            <div className="personal-notes-container">
            {/* Compact Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">My Notes</h1>
                        <p className="text-sm text-gray-600">Your personal knowledge base</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="add-note-btn flex items-center px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                        style={{ backgroundColor: '#ea580c' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#c2410c'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ea580c'}
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Note
                    </button>
                </div>

                {/* Compact Search and Filter */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="w-48">
                        <CustomDropdown
                            value={selectedCategory}
                            onChange={(value) => setSelectedCategory(value)}
                            options={categories}
                            placeholder="All Categories"
                            className="w-full"
                            size="sm"
                        />
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                        {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Compact Add/Edit Form */}
            {showAddForm && (
                <div className="mb-4 bg-white border border-orange-500 rounded-lg p-4 shadow-lg animate-in slide-in-from-top-2 duration-300" style={{
                    boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.1), 0 4px 6px -2px rgba(249, 115, 22, 0.05)',
                    borderColor: '#f97316'
                }}>
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            {editingNote ? 'Edit Note' : 'Add New Note'}
                        </h3>
                    </div>
                    <form onSubmit={editingNote ? handleUpdateNote : handleAddNote}>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                            <div className="lg:col-span-2">
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Note title..."
                                    disabled={addingNote}
                                    required
                                />
                            </div>
                            <div>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={addingNote}
                                >
                                    {categories.slice(1).map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-1 justify-end">
                                <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={addingNote}
                                    className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingNote}
                                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {addingNote ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            {editingNote ? 'Updating...' : 'Adding...'}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3 h-3 mr-1" />
                                            {editingNote ? 'Update' : 'Add'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Enter note content..."
                                disabled={addingNote}
                                required
                            />
                        </div>
                    </form>
                </div>
            )}

            {/* Compact Notes List */}
            {sortedNotes.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No notes found</h3>
                    <p className="text-xs text-gray-500 mb-3">
                        {searchTerm || selectedCategory !== 'all' 
                            ? 'Try adjusting your search or filter criteria'
                            : 'Get started by creating your first personal note'
                        }
                    </p>
                    {!searchTerm && selectedCategory === 'all' && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="add-note-btn px-3 py-1.5 text-xs bg-orange-600 text-white rounded-md hover:bg-orange-700"
                            style={{ backgroundColor: '#ea580c' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#c2410c'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ea580c'}
                        >
                            Create Your First Note
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-2 w-full">
                    {sortedNotes.map((note) => (
                        <div
                            key={note.id}
                            className={`note-card bg-white border rounded-md p-3 hover:shadow-sm transition-all duration-200 w-full ${
                                note.is_pinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                            }`}
                        >
                            <div className="flex items-start justify-between w-full">
                                {/* Content area */}
                                <div className="note-content">
                                    <h3 
                                        className="font-medium text-sm text-gray-900 mb-2 cursor-pointer"
                                        onClick={() => navigate(`/notes/${note.id}`, { state: { note } })}
                                    >
                                        {note.title}
                                    </h3>
                                    
                                    <div className="text-xs text-gray-600 line-clamp-2 mb-3">
                                        {note.content || 'No content available'}
                                    </div>
                                    
                                    <div className="date-container">
                                        <div className="created-date">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            <span>Created: {formatDate(note.created_at || note.updated_at)}</span>
                                        </div>
                                        
                                        {note.updated_at && note.created_at && note.updated_at !== note.created_at && (
                                            <div className="updated-date">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                <span>Updated: {formatDate(note.updated_at)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Actions area */}
                                <div className="note-actions">
                                    <span className={`category-tag ${getCategoryColor(note.category)}`}>
                                        {categories.find(c => c.value === note.category)?.label}
                                    </span>
                                    
                                    <div className="action-buttons">
                                        <TooltipBubble title={note.is_pinned ? 'Unpin note' : 'Pin note'}>
                                            <button
                                                onClick={() => handleTogglePin(note.id)}
                                                className="text-gray-400 hover:text-yellow-600 transition-colors"
                                            >
                                                {note.is_pinned ? <Pin className="w-3 h-3" /> : <PinOff className="w-3 h-3" />}
                                            </button>
                                        </TooltipBubble>
                                        <TooltipBubble title="Edit note">
                                            <button
                                                onClick={() => startEditing(note)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </button>
                                        </TooltipBubble>
                                        <TooltipBubble title="Delete note">
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </TooltipBubble>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            </div>
        </>
    );
};

export default PersonalNotesComponent;