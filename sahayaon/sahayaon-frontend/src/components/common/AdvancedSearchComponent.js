import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, FileText, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';
import Spinner from './Spinner';

/**
 * Advanced search component with integrated search window
 * Features:
 * - Integrated search window that extends from search bar
 * - Real-time search with debouncing
 * - Search results with highlighting
 * - Modern UI with theme shadows
 * - Keyboard navigation support
 */
const AdvancedSearchComponent = ({ 
    onSearchSubmit, 
    navigateTo,
    placeholder = "Search ...",
    className = "",
    width = 400 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState([]);
    
    const searchRef = useRef(null);
    const searchWindowRef = useRef(null);
    const inputRef = useRef(null);
    const debounceTimeoutRef = useRef(null);

    // Debounced search function - only searches tickets
    const performSearch = useCallback(async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsLoading(true);
        try {
            // Get auth token from Firebase
            const currentUser = authClient.currentUser;
            if (!currentUser) {
                setSearchResults([]);
                setIsLoading(false);
                return;
            }
            const token = await currentUser.getIdToken();
            
            const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.results || []);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Debounced search effect
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            performSearch(searchTerm);
        }, 200);

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [searchTerm, performSearch]);

    // Handle input change
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        setSelectedIndex(-1);
        
        if (value.trim()) {
            setIsSearchOpen(true);
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        setIsSearchOpen(true);
    };

    // Check if search window should open upward
    const [openUpward, setOpenUpward] = useState(false);

    useEffect(() => {
        if (isSearchOpen && searchRef.current) {
            const rect = searchRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // If there's not enough space below but enough above, open upward
            setOpenUpward(spaceBelow < 300 && spaceAbove > 300);
        }
    }, [isSearchOpen]);

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            addToRecentSearches(searchTerm);
            onSearchSubmit(searchTerm);
            setIsSearchOpen(false);
            inputRef.current?.blur();
        }
    };

    // Add to recent searches
    const addToRecentSearches = (term) => {
        const newRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    };

    // Load recent searches from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (error) {
                console.error('Error loading recent searches:', error);
            }
        }
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e) => {
        if (!isSearchOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                    handleResultClick(searchResults[selectedIndex]);
                } else if (searchTerm.trim()) {
                    handleSubmit(e);
                }
                break;
            case 'Escape':
                setIsSearchOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    // Handle result click
    const handleResultClick = (result) => {
        addToRecentSearches(searchTerm);
        onSearchSubmit(searchTerm);
        setIsSearchOpen(false);
        inputRef.current?.blur();
        
        // Navigate to the result if navigateTo is provided
        if (navigateTo && result.url) {
            navigateTo(result.url);
        }
    };

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsSearchOpen(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Highlight text function
    const highlightText = (text, query) => {
        if (!query.trim()) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => 
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">
                    {part}
                </mark>
            ) : part
        );
    };

    // Get result icon - only tickets now
    const getResultIcon = (type) => {
        return <FileText className="w-4 h-4 text-blue-500" />;
    };

    // Clear search
    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setIsSearchOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    // Close search window
    const closeSearch = () => {
        setIsSearchOpen(false);
        setSelectedIndex(-1);
    };

    return (
        <div className={`relative ${className}`} ref={searchRef}>
            {/* Search Input Bar */}
            <div 
                className={`bg-gray-100 border border-gray-400 shadow-sm hover:shadow-md focus-within:shadow-lg focus-within:border-blue-300 focus-within:bg-white transition-all duration-300 ${
                    isSearchOpen 
                        ? openUpward 
                            ? 'rounded-t-none shadow-lg border-blue-300 bg-white' 
                            : 'rounded-b-none shadow-lg border-blue-300 bg-white'
                        : 'rounded-lg'
                }`}
                style={{ width: width }}
            >
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={handleInputFocus}
                            placeholder={placeholder}
                            className={`w-full pl-9 pr-8 py-1 text-sm border-0 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 font-medium transition-all duration-300 ${
                                isSearchOpen ? 'text-blue-600' : ''
                            }`}
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        />
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 transition-colors duration-300" />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 flex items-center justify-center"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Search Window Extension */}
            {isSearchOpen && (
                <div
                    ref={searchWindowRef}
                    className={`absolute left-0 right-0 bg-white border border-gray-200 shadow-xl animate-in slide-in-from-top-2 duration-300 overflow-hidden z-50 ${
                        openUpward 
                            ? 'bottom-full border-b-0 rounded-b-lg' 
                            : 'top-full border-t-0 rounded-b-lg'
                    }`}
                    style={{ 
                        width: width,
                        maxHeight: '400px',
                        minHeight: '100px'
                    }}
                >
                    {/* Search Header */}
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Search Tickets</h3>
                            <button
                                onClick={closeSearch}
                                className="p-1.5 hover:bg-gray-200 rounded-full transition-all duration-200 hover:scale-105"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="p-6 text-center text-gray-500">
                            <div className="inline-flex items-center space-x-3">
                                <Spinner size="md" />
                                <span className="text-sm font-medium" style={{ fontFamily: 'Manrope, sans-serif' }}>Searching...</span>
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {!isLoading && searchResults.length > 0 && (
                        <div className="max-h-80 overflow-y-auto">
                            {searchResults.map((result, index) => (
                                <div
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleResultClick(result)}
                                    className={`flex items-center space-x-3 p-4 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 cursor-pointer transition-all duration-200 group border-b border-gray-100 last:border-b-0 ${
                                        selectedIndex === index ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-r-4 border-blue-500' : ''
                                    }`}
                                >
                                    <div className="flex-shrink-0">
                                        {getResultIcon(result.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {highlightText(result.title, searchTerm)}
                                            </span>
                                        </div>
                                        {result.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                {highlightText(result.description, searchTerm)}
                                            </p>
                                        )}
                                        {result.meta && (
                                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                                {result.meta.status && (
                                                    <span className="flex items-center space-x-1">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            result.meta.status === 'open' ? 'bg-green-500' :
                                                            result.meta.status === 'closed' ? 'bg-red-500' :
                                                            'bg-yellow-500'
                                                        }`}></div>
                                                        <span>{result.meta.status}</span>
                                                    </span>
                                                )}
                                                {result.meta.priority && (
                                                    <span>Priority: {result.meta.priority}</span>
                                                )}
                                                {result.meta.date && (
                                                    <span>{result.meta.date}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {!isLoading && searchTerm && searchResults.length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No results found for "{searchTerm}"</p>
                            <p className="text-xs text-gray-400 mt-1">Try different keywords or search types</p>
                        </div>
                    )}

                    {/* Recent Searches */}
                    {!isLoading && !searchTerm && recentSearches.length > 0 && (
                        <div className="border-t border-gray-100">
                            <div className="p-3 text-xs font-medium text-gray-500 bg-gray-50">
                                Recent Searches
                            </div>
                            {recentSearches.map((search, index) => (
                                <div
                                    key={index}
                                    onClick={() => {
                                        setSearchTerm(search);
                                        performSearch(search);
                                    }}
                                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700">{search}</span>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default AdvancedSearchComponent;
