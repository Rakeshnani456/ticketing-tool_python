import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Plus, User, Key, LogOut, ChevronDown } from 'lucide-react';
import AdvancedSearchComponent from './AdvancedSearchComponent';
import TooltipBubble from './TooltipBubble';

// Import assets
import KriasolLogo from '../../assets/logo/logo.png';
import plusImg from '../../assets/icons/plus.png';
import phoneImg from '../../assets/icons/phone.png';
import mailImg from '../../assets/icons/mail.png';

const FlexibleHeader = ({ 
    currentUser, 
    onSearchSubmit, 
    navigateTo, 
    searchWidths,
    ticketDisplayId,
    ticketDisplayIdLoading,
    onSignOut 
}) => {
    const location = useLocation();
    const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const supportMenuRef = useRef(null);
    const profileMenuRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supportMenuRef.current && !supportMenuRef.current.contains(event.target)) {
                setIsSupportMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getBreadcrumbPath = () => {
        if (location.pathname.startsWith('/tickets/')) {
            return (
                <>
                    <span className="text-gray-700 font-medium">All Tickets</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-700 font-medium truncate max-w-32">
                        {ticketDisplayIdLoading ? '...' : (ticketDisplayId || location.pathname.split('/').pop())}
                    </span>
                </>
            );
        }

        const pathMap = {
            '/dashboard': 'Overview',
            '/my-tickets': 'My Tickets',
            '/create-ticket': 'Create Ticket',
            '/all-tickets': 'All Tickets',
            '/knowledge-base': 'Knowledge Base',
            '/admin': 'Admin Panel',
            '/user-management': 'Users',
            '/user-management/create-user': 'Users / Add User',
            '/user-management/edit-user': 'Users / Edit User',
            '/user-management/create-engineer': 'Users / Add Engineer',
            '/user-management/edit-engineer': 'Users / Edit Engineer',
            '/user-management/import-users': 'Users / Import Users',
            '/client-management': 'Client Management',
            '/client-management/create-client': 'Clients / Add Client',
            '/client-management/edit-client': 'Clients / Edit Client',
            '/personal-notes': 'Personal Notes'
        };

        if (pathMap[location.pathname]) {
            return <span className="text-gray-700 font-medium">{pathMap[location.pathname]}</span>;
        }

        if (location.pathname.startsWith('/user-management/')) {
            const lastSegment = location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return <span className="text-gray-700 font-medium">Users / {lastSegment}</span>;
        }

        if (location.pathname.startsWith('/client-management/')) {
            const lastSegment = location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return <span className="text-gray-700 font-medium">Clients / {lastSegment}</span>;
        }

        const lastSegment = location.pathname.split('/').pop();
        return <span className="text-gray-700 font-medium">{lastSegment?.charAt(0).toUpperCase() + lastSegment?.slice(1) || 'Home'}</span>;
    };

    const isAdminRole = ['admin', 'super_admin', 'site_admin'].includes(currentUser?.role);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between h-14 px-4">
                {/* Left Section: Logo + Breadcrumb */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Logo */}
                    <Link 
                        to={currentUser ? (isAdminRole ? '/dashboard' : '/my-tickets') : '/login'} 
                        className="flex items-center"
                    >
                        <img 
                            src={KriasolLogo} 
                            alt="Kriasol Logo" 
                            className="h-8 w-auto transition-all duration-300 ease-in-out"
                            style={{
                                objectFit: 'contain',
                                display: 'block',
                                maxHeight: '32px'
                            }}
                            onError={(e) => {
                                console.error('Logo failed to load:', e);
                                e.target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.textContent = 'KRIASOL';
                                fallback.className = 'text-lg font-bold text-gray-800';
                                e.target.parentNode.appendChild(fallback);
                            }}
                        />
                    </Link>

                    {/* Divider - Temporarily disabled with breadcrumb */}
                    {/* <div className="hidden sm:block w-px h-6 bg-gray-300"></div> */}

                    {/* Breadcrumb - Temporarily disabled */}
                    {/* <div className="hidden lg:flex items-center gap-1">
                        <div className="flex items-center gap-1 text-sm text-gray-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            <span className="hover:text-gray-700 cursor-pointer transition-colors duration-200">
                                {currentUser?.role === 'site_admin' && currentUser?.client_name ? currentUser.client_name : 'Kriasol'}
                            </span>
                            <span className="text-gray-400">/</span>
                            {getBreadcrumbPath()}
                        </div>
                    </div> */}
                </div>

                {/* Center Section: Search Bar */}
                <div className="flex-1 max-w-2xl mx-2 md:mx-4 hidden md:block">
                    <div className="flex justify-center">
                        <div className="w-full max-w-sm lg:max-w-md">
                            <AdvancedSearchComponent
                                onSearchSubmit={onSearchSubmit}
                                navigateTo={navigateTo}
                                placeholder="Search tickets, users, or content..."
                                width="100%"
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Search Button */}
                <div className="md:hidden flex items-center">
                    <button
                        onClick={() => {
                            const searchTerm = prompt("Search");
                            if (searchTerm) {
                                onSearchSubmit(searchTerm);
                            }
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Right Section: Create + Support + Profile */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Create Button */}
                    <TooltipBubble title="Create a new ticket">
                        <Link 
                            to="/create-ticket" 
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium whitespace-nowrap text-orange-500 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 flex-shrink-0 focus:outline-none ${
                                location.pathname === '/create-ticket' 
                                    ? 'bg-orange-50 text-orange-600' 
                                    : 'bg-[#f8f9fa]'
                            }`}
                        >
                            <img src={plusImg} alt="Create" className="w-3 h-3 object-contain" />
                            <span className="hidden sm:inline">Create</span>
                        </Link>
                    </TooltipBubble>

                    {/* Support Button */}
                    <div className="relative" ref={supportMenuRef}>
                        <button
                            onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium whitespace-nowrap bg-[#f8f9fa] text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 focus:outline-none"
                        >
                            <span className="hidden sm:inline">Support</span>
                            <svg 
                                className={`w-3 h-3 transition-transform duration-200 ${isSupportMenuOpen ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {isSupportMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-64">
                                <div className="px-4 py-3">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Contact Support</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <img src={mailImg} alt="Email" className="w-4 h-4 object-contain" />
                                            <a 
                                                href="mailto:HelloIT@kriasol.com" 
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                HelloIT@kriasol.com
                                            </a>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <img src={phoneImg} alt="Phone" className="w-4 h-4 object-contain" />
                                            <a 
                                                href="tel:9391930393" 
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                +91 9391930393
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Button */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-700 font-semibold text-base border border-gray-200 hover:bg-gray-200 hover:border-gray-300 transition-all duration-200"
                        >
                            {currentUser?.email?.charAt(0).toUpperCase()}
                        </button>
                        
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-56">
                                <div className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm border border-gray-200">
                                            {currentUser?.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {currentUser?.email}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize truncate">
                                                {currentUser?.role?.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-gray-200"></div>
                                <div className="py-1">
                                    <Link
                                        to="/profile"
                                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4 mr-3 text-gray-500" />
                                        View Profile
                                    </Link>
                                    <Link
                                        to="/change-password"
                                        className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                    >
                                        <Key className="w-4 h-4 mr-3 text-gray-500" />
                                        Change Password
                                    </Link>
                                    <div className="w-full h-px bg-gray-200 my-1"></div>
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            onSignOut();
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200"
                                    >
                                        <LogOut className="w-4 h-4 mr-3" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default FlexibleHeader;
