// components/KnowledgeBaseComponent.js
import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Plus,
    Upload,
    FileText,
    HelpCircle,
    Edit,
    Trash2,
    Eye,
    Filter,
    Download,
    Tag,
    Calendar,
    User,
    ChevronDown,
    ChevronUp,
    X,
    Save,
    AlertCircle,
    CheckCircle,
    BookOpen,
    MessageSquare,
    File,
    FolderOpen
} from 'lucide-react';
import { API_BASE_URL } from '../config/constants';
import { authClient } from '../config/firebase';
import Spinner from './common/Spinner';

const KnowledgeBaseComponent = ({ currentUser, showFlashMessage }) => {
    const [activeTab, setActiveTab] = useState('documents');
    const [documents, setDocuments] = useState([]);
    const [faqs, setFaqs] = useState([]);

    // Helper function to get Firebase ID token
    const getAuthToken = async () => {
        console.log('getAuthToken called, currentUser:', currentUser);
        if (!currentUser || !currentUser.firebaseUser) {
            console.error('User not authenticated or firebaseUser missing');
            throw new Error('User not authenticated');
        }
        try {
            console.log('Getting ID token from firebaseUser...');
            const idToken = await currentUser.firebaseUser.getIdToken();
            console.log('ID token obtained:', idToken ? 'Yes' : 'No');
            if (!idToken) {
                throw new Error('No valid token found');
            }
            return idToken;
        } catch (error) {
            console.error('Error getting ID token:', error);
            throw new Error('Failed to get authentication token');
        }
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ documents: [], faqs: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [expandedItems, setExpandedItems] = useState(new Set());
    
    // Form states
    const [documentForm, setDocumentForm] = useState({
        title: '',
        content: '',
        category: 'General',
        tags: '',
        isPublic: false
    });
    
    const [faqForm, setFaqForm] = useState({
        question: '',
        answer: '',
        category: 'General',
        tags: '',
        isPublic: false
    });

    const fileInputRef = useRef(null);

    // Check if user has admin/support permissions
    const canManage = currentUser && ['admin', 'support', 'super_admin'].includes(currentUser.role);

    useEffect(() => {
        if (currentUser) {
            loadData();
            loadCategories();
        }
    }, [currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            // OPTIMIZED: Check cache first
            const cacheKey = `knowledge_base_data_${currentUser?.uid || 'anonymous'}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTime = localStorage.getItem(`${cacheKey}_time`);
            const now = Date.now();
            const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

            if (cachedData && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
                console.log('📦 Using cached knowledge base data');
                const data = JSON.parse(cachedData);
                setDocuments(data.documents || []);
                setFaqs(data.faqs || []);
                setLoading(false);
                return;
            }

            console.log('🔄 Fetching fresh knowledge base data');
            const token = await getAuthToken();
            const [docResponse, faqResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/knowledge-base/documents`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }),
                fetch(`${API_BASE_URL}/api/knowledge-base/faqs`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            ]);

            let documents = [];
            let faqs = [];

            if (docResponse.ok) {
                const docData = await docResponse.json();
                documents = docData.documents || [];
                setDocuments(documents);
            }

            if (faqResponse.ok) {
                const faqData = await faqResponse.json();
                faqs = faqData.faqs || [];
                setFaqs(faqs);
            }

            // Cache the data
            const dataToCache = { documents, faqs };
            localStorage.setItem(cacheKey, JSON.stringify(dataToCache));
            localStorage.setItem(`${cacheKey}_time`, now.toString());
        } catch (error) {
            console.error('Error loading data:', error);
            showFlashMessage('Failed to load knowledge base data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            // OPTIMIZED: Check cache first for categories
            const cacheKey = `knowledge_base_categories_${currentUser?.uid || 'anonymous'}`;
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTime = localStorage.getItem(`${cacheKey}_time`);
            const now = Date.now();
            const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (categories change less frequently)

            if (cachedData && cacheTime && (now - parseInt(cacheTime)) < CACHE_DURATION) {
                console.log('📦 Using cached categories');
                const data = JSON.parse(cachedData);
                setCategories(data.categories || []);
                return;
            }

            console.log('🔄 Fetching fresh categories');
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/categories`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                const categories = data.categories || [];
                setCategories(categories);
                
                // Cache the categories
                localStorage.setItem(cacheKey, JSON.stringify({ categories }));
                localStorage.setItem(`${cacheKey}_time`, now.toString());
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults({ documents: [], faqs: [] });
            return;
        }

        setIsSearching(true);
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: searchQuery })
            });

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Error searching:', error);
            showFlashMessage('Search failed', 'error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleCreateDocument = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...documentForm,
                    tags: documentForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                })
            });

            if (response.ok) {
                showFlashMessage('Document created successfully', 'success');
                setShowCreateModal(false);
                setDocumentForm({ title: '', content: '', category: 'General', tags: '', isPublic: false });
                loadData();
            } else {
                const error = await response.json();
                showFlashMessage(error.error || 'Failed to create document', 'error');
            }
        } catch (error) {
            console.error('Error creating document:', error);
            showFlashMessage('Failed to create document', 'error');
        }
    };

    const handleUploadDocument = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', documentForm.title);
        formData.append('category', documentForm.category);
        formData.append('tags', documentForm.tags);
        formData.append('isPublic', documentForm.isPublic);

        try {
            const token = await getAuthToken();
            console.log('Auth token obtained:', token ? 'Yes' : 'No');
            console.log('Current user:', currentUser);
            console.log('API URL:', `${API_BASE_URL}/api/knowledge-base/documents/upload`);
            
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (response.ok) {
                showFlashMessage('Document uploaded successfully', 'success');
                setShowUploadModal(false);
                setDocumentForm({ title: '', content: '', category: 'General', tags: '', isPublic: false });
                loadData();
            } else {
                const responseText = await response.text();
                console.log('Error response text:', responseText);
                try {
                    const error = JSON.parse(responseText);
                    showFlashMessage(error.error || 'Failed to upload document', 'error');
                } catch (parseError) {
                    console.error('Failed to parse error response as JSON:', parseError);
                    showFlashMessage(`Server error: ${response.status} - ${responseText.substring(0, 100)}`, 'error');
                }
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            showFlashMessage('Failed to upload document', 'error');
        }
    };

    const handleCreateFaq = async () => {
        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/faqs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...faqForm,
                    tags: faqForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                })
            });

            if (response.ok) {
                showFlashMessage('FAQ created successfully', 'success');
                setShowFaqModal(false);
                setFaqForm({ question: '', answer: '', category: 'General', tags: '', isPublic: false });
                loadData();
            } else {
                const error = await response.json();
                showFlashMessage(error.error || 'Failed to create FAQ', 'error');
            }
        } catch (error) {
            console.error('Error creating FAQ:', error);
            showFlashMessage('Failed to create FAQ', 'error');
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            const token = await getAuthToken();
            const response = await fetch(`${API_BASE_URL}/api/knowledge-base/${type}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showFlashMessage(`${type === 'documents' ? 'Document' : 'FAQ'} deleted successfully`, 'success');
                loadData();
            } else {
                const error = await response.json();
                showFlashMessage(error.error || `Failed to delete ${type}`, 'error');
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            showFlashMessage(`Failed to delete ${type}`, 'error');
        }
    };

    const toggleExpanded = (id) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    const filteredDocuments = documents.filter(doc => 
        !selectedCategory || doc.category === selectedCategory
    );

    const filteredFaqs = faqs.filter(faq => 
        !selectedCategory || faq.category === selectedCategory
    );

    const displayDocuments = searchQuery ? searchResults.documents : filteredDocuments;
    const displayFaqs = searchQuery ? searchResults.faqs : filteredFaqs;

    // Show loading if currentUser is not available
    if (!currentUser) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-center items-center py-12">
                    <Spinner size="md" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
                <p className="text-gray-600">Find answers, documents, and helpful information</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search documents and FAQs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSearching ? (
                            <Spinner size="sm" color="white" />
                        ) : (
                            <Search className="w-5 h-5" />
                        )}
                        Search
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'documents'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <FileText className="w-5 h-5 inline mr-2" />
                            Documents ({displayDocuments.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('faqs')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'faqs'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <HelpCircle className="w-5 h-5 inline mr-2" />
                            FAQs ({displayFaqs.length})
                        </button>
                    </nav>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="mb-6 flex justify-between items-center">
                <div className="flex gap-4">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </div>

                {canManage && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Document
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Document
                        </button>
                        <button
                            onClick={() => setShowFaqModal(true)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add FAQ
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <Spinner size="md" />
                </div>
            ) : (
                <div className="space-y-6">
                    {activeTab === 'documents' && (
                        <div className="grid gap-4">
                            {displayDocuments.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                                    <p className="text-gray-500">
                                        {searchQuery ? 'Try adjusting your search terms' : 'No documents available yet'}
                                    </p>
                                </div>
                            ) : (
                                displayDocuments.map(doc => (
                                    <DocumentCard
                                        key={doc.id}
                                        document={doc}
                                        onDelete={() => handleDelete('documents', doc.id)}
                                        onToggleExpanded={() => toggleExpanded(doc.id)}
                                        isExpanded={expandedItems.has(doc.id)}
                                        canManage={canManage}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'faqs' && (
                        <div className="grid gap-4">
                            {displayFaqs.length === 0 ? (
                                <div className="text-center py-12">
                                    <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
                                    <p className="text-gray-500">
                                        {searchQuery ? 'Try adjusting your search terms' : 'No FAQs available yet'}
                                    </p>
                                </div>
                            ) : (
                                displayFaqs.map(faq => (
                                    <FaqCard
                                        key={faq.id}
                                        faq={faq}
                                        onDelete={() => handleDelete('faqs', faq.id)}
                                        onToggleExpanded={() => toggleExpanded(faq.id)}
                                        isExpanded={expandedItems.has(faq.id)}
                                        canManage={canManage}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Create Document Modal */}
            {showCreateModal && (
                <CreateDocumentModal
                    form={documentForm}
                    setForm={setDocumentForm}
                    onSubmit={handleCreateDocument}
                    onClose={() => setShowCreateModal(false)}
                    categories={categories}
                />
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
                <UploadDocumentModal
                    form={documentForm}
                    setForm={setDocumentForm}
                    onSubmit={handleUploadDocument}
                    onClose={() => setShowUploadModal(false)}
                    categories={categories}
                    fileInputRef={fileInputRef}
                />
            )}

            {/* Create FAQ Modal */}
            {showFaqModal && (
                <CreateFaqModal
                    form={faqForm}
                    setForm={setFaqForm}
                    onSubmit={handleCreateFaq}
                    onClose={() => setShowFaqModal(false)}
                    categories={categories}
                />
            )}
        </div>
    );
};

// Document Card Component
const DocumentCard = ({ document, onDelete, onToggleExpanded, isExpanded, canManage }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                    {document.isPublic && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Public</span>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {document.category}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(document.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {document.created_by_email}
                    </span>
                </div>

                {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {document.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="text-gray-600 text-sm">
                    {isExpanded ? (
                        <div className="whitespace-pre-wrap">{document.content}</div>
                    ) : (
                        <div className="line-clamp-3">{document.content}</div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                <button
                    onClick={onToggleExpanded}
                    className="p-2 text-gray-400 hover:text-gray-600"
                >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {canManage && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-400 hover:text-red-600"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    </div>
);

// FAQ Card Component
const FaqCard = ({ faq, onDelete, onToggleExpanded, isExpanded, canManage }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                    {faq.isPublic && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Public</span>
                    )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {faq.category}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(faq.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {faq.created_by_email}
                    </span>
                </div>

                {faq.tags && faq.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {faq.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="text-gray-600 text-sm">
                    {isExpanded ? (
                        <div className="whitespace-pre-wrap">{faq.answer}</div>
                    ) : (
                        <div className="line-clamp-3">{faq.answer}</div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                <button
                    onClick={onToggleExpanded}
                    className="p-2 text-gray-400 hover:text-gray-600"
                >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                {canManage && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-400 hover:text-red-600"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    </div>
);

// Create Document Modal
const CreateDocumentModal = ({ form, setForm, onSubmit, onClose, categories }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create Document</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                        value={form.content}
                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Paste your content here..."
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="General">General</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tag1, tag2, tag3"
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isPublic"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                        Make this document public
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Create Document
                    </button>
                </div>
            </form>
        </div>
    </div>
);

// Upload Document Modal
const UploadDocumentModal = ({ form, setForm, onSubmit, onClose, categories, fileInputRef }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Upload Document</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); const file = fileInputRef.current.files[0]; if (file) onSubmit(file); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.doc,.docx,.md"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, TXT, DOC, DOCX, MD (Max 10MB)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Leave empty to use filename"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="General">General</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tag1, tag2, tag3"
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isPublic"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                        Make this document public
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Document
                    </button>
                </div>
            </form>
        </div>
    </div>
);

// Create FAQ Modal
const CreateFaqModal = ({ form, setForm, onSubmit, onClose, categories }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create FAQ</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                    <input
                        type="text"
                        value={form.question}
                        onChange={(e) => setForm({ ...form, question: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                    <textarea
                        value={form.answer}
                        onChange={(e) => setForm({ ...form, answer: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="General">General</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                        <input
                            type="text"
                            value={form.tags}
                            onChange={(e) => setForm({ ...form, tags: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="tag1, tag2, tag3"
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isPublic"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                        Make this FAQ public
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Create FAQ
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default KnowledgeBaseComponent;
