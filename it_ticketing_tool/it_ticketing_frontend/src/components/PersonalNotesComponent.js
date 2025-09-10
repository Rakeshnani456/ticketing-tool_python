// src/components/PersonalNotesComponent.js

import React, { useState, useEffect } from 'react';
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
    Loader2
} from 'lucide-react';

// Add custom styles for line clamping and button overrides
const styles = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    /* Override global button styles specifically for Add Note buttons */
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
        background: #c2410c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    /* Override any global button styles that might be applied */
    .personal-notes-container .add-note-btn.MuiButton-root,
    .personal-notes-container .add-note-btn.compact-ui {
        background-color: #ea580c !important;
        background: #ea580c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
    
    .personal-notes-container .add-note-btn.MuiButton-root:hover,
    .personal-notes-container .add-note-btn.compact-ui:hover {
        background-color: #c2410c !important;
        background: #c2410c !important;
        background-image: none !important;
        background-gradient: none !important;
    }
`;

const PersonalNotesComponent = ({ user, showFlashMessage }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
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

    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'general', label: 'General' },
        { value: 'technical', label: 'Technical' },
        { value: 'meeting', label: 'Meeting Notes' },
        { value: 'todo', label: 'To-Do' },
        { value: 'reference', label: 'Reference' }
    ];

    // Fetch personal notes
    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes`, {
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched notes data:', data.notes);
                // Log each note's date fields
                if (data.notes) {
                    data.notes.forEach((note, index) => {
                        console.log(`Note ${index}:`, {
                            title: note.title,
                            updated_at: note.updated_at,
                            created_at: note.created_at,
                            updated_at_type: typeof note.updated_at
                        });
                    });
                }
                setNotes(data.notes || []);
            } else {
                showFlashMessage('Failed to fetch my notes', 'error');
            }
        } catch (error) {
            console.error('Error fetching my notes:', error);
            showFlashMessage('Failed to fetch my notes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.firebaseUser) {
            fetchNotes();
        }
    }, [user]);

    // Add new note
    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) {
            showFlashMessage('Title and content are required', 'error');
            return;
        }

        setAddingNote(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(prev => [data.note, ...prev]);
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
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${editingNote.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(prev => prev.map(note => note.id === editingNote.id ? data.note : note));
                setEditingNote(null);
                setFormData({ title: '', content: '', category: 'general' });
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
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                setNotes(prev => prev.filter(note => note.id !== noteId));
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
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/personal-notes/${noteId}/pin`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${await user.firebaseUser.getIdToken()}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(prev => prev.map(note => note.id === noteId ? data.note : note));
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

    // Filter notes
    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            note.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Sort notes (pinned first, then by updated date)
    const sortedNotes = filteredNotes.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        // Handle Firestore timestamp objects for sorting
        const getDateValue = (dateValue) => {
            if (!dateValue) return new Date(0); // Default to epoch for null/undefined
            
            if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
                return new Date(dateValue._seconds * 1000);
            }
            if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
                return new Date(dateValue.seconds * 1000);
            }
            if (dateValue && typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
                return dateValue.toDate();
            }
            return new Date(dateValue);
        };
        
        return getDateValue(b.updated_at) - getDateValue(a.updated_at);
    });

    const formatDate = (dateValue) => {
        // Debug logging
        console.log('formatDate input:', dateValue, 'type:', typeof dateValue);
        
        // Handle null/undefined
        if (!dateValue) {
            return 'No date';
        }
        
        let date;
        
        // Handle Firestore timestamp objects (with underscores)
        if (dateValue && typeof dateValue === 'object' && dateValue._seconds) {
            date = new Date(dateValue._seconds * 1000);
            console.log('Firestore timestamp (_seconds) converted to:', date);
        }
        // Handle Firestore timestamp objects (without underscores)
        else if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
            date = new Date(dateValue.seconds * 1000);
            console.log('Firestore timestamp (seconds) converted to:', date);
        }
        // Handle Firestore timestamp with toDate method
        else if (dateValue && typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
            date = dateValue.toDate();
            console.log('Firestore timestamp (toDate) converted to:', date);
        }
        // Handle regular date strings or Date objects
        else {
            date = new Date(dateValue);
            console.log('Regular date converted to:', date, 'isValid:', !isNaN(date.getTime()));
        }
        
        if (isNaN(date.getTime())) {
            console.error('Invalid date after conversion:', dateValue, '->', date);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <style>{styles}</style>
            <div className="personal-notes-container max-w-7xl mx-auto p-4">
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
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {categories.map(category => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                    <div className="text-xs text-gray-500">
                        {sortedNotes.length} note{sortedNotes.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* Compact Add/Edit Form */}
            {showAddForm && (
                <div className="mb-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-800">
                            {editingNote ? 'Edit Note' : 'Add New Note'}
                        </h3>
                        <button
                            onClick={cancelEditing}
                            className="text-gray-400 hover:text-gray-600 p-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={editingNote ? handleUpdateNote : handleAddNote}>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                            <div className="lg:col-span-2">
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Note title..."
                                    disabled={addingNote}
                                    required
                                />
                            </div>
                            <div>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    disabled={addingNote}
                                >
                                    {categories.slice(1).map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-1">
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
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="space-y-2">
                    {sortedNotes.map((note) => (
                        <div
                            key={note.id}
                            className={`bg-white border rounded-md p-3 hover:shadow-sm transition-all duration-200 ${
                                note.is_pinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0 mr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-medium text-sm text-gray-900 truncate">
                                            {note.title}
                                        </h3>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getCategoryColor(note.category)}`}>
                                            {categories.find(c => c.value === note.category)?.label}
                                        </span>
                                        {note.is_pinned && (
                                            <Pin className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                                        {note.content}
                                    </p>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {formatDate(note.updated_at)}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-0.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleTogglePin(note.id)}
                                        className="p-1.5 text-gray-400 hover:text-yellow-600 transition-colors rounded"
                                        title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                                    >
                                        {note.is_pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => startEditing(note)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded"
                                        title="Edit note"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
                                        title="Delete note"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
