import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, ChevronDown, UserCircle } from 'lucide-react';
import AdvancedSearchComponent from './AdvancedSearchComponent';

// Import assets
import KriasolLogo from '../../assets/logo/Logo2.png';
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
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 shadow-sm" style={{ backgroundColor: '#f0eeed' }}>
            <div className="flex items-center justify-between h-12 px-4 md:px-6">
                {/* Left Section: Logo */}
                <div className="flex items-center flex-shrink-0 -ml-4">
                    {/* Logo */}
                    <Link 
                        to={currentUser ? (isAdminRole ? '/dashboard' : '/my-tickets') : '/login'} 
                        className="flex items-center flex-shrink-0"
                    >
                        <img 
                            src={KriasolLogo} 
                            alt="Sahayaon Logo" 
                            className="h-9 w-auto"
                            style={{
                                objectFit: 'contain',
                                display: 'block',
                                maxHeight: '36px'
                            }}
                            onError={(e) => {
                                console.error('Logo failed to load:', e);
                                e.target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.textContent = 'KRIASOL';
                                fallback.className = 'text-base font-bold text-gray-800';
                                e.target.parentNode.appendChild(fallback);
                            }}
                        />
                    </Link>
                </div>

                {/* Center Section: Search Bar */}
                <div className="flex-1 max-w-2xl mx-4 hidden md:flex items-center gap-3">
                    {/* Search Bar */}
                    <div className="flex-1 max-w-sm lg:max-w-md">
                        <AdvancedSearchComponent
                            key={currentUser?.uid || 'no-user'} // Reset component when user changes
                            onSearchSubmit={onSearchSubmit}
                            navigateTo={navigateTo}
                            placeholder="Search tickets..."
                            width="100%"
                        />
                    </div>
                </div>

                {/* Mobile: Search Button */}
                <div className="md:hidden flex items-center gap-2">
                    <button
                        onClick={() => {
                            const searchTerm = prompt("Search");
                            if (searchTerm) {
                                onSearchSubmit(searchTerm);
                            }
                        }}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                </div>

                {/* Right Section: Support + Profile */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Support Button */}
                    <div className="relative" ref={supportMenuRef}>
                        <button
                            onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900 transition-all duration-200 flex-shrink-0 focus:outline-none"
                        >
                            <span className="hidden sm:inline">Support</span>
                            <ChevronDown 
                                className={`w-4 h-4 transition-transform duration-200 ${isSupportMenuOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        
                        {isSupportMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-72 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900">Contact Support</h3>
                                </div>
                                <div className="px-4 py-3">
                                    <div className="space-y-3">
                                        <a 
                                            href="mailto:HelloIT@kriasol.com" 
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                        >
                                            <img src={mailImg} alt="Email" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100" />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                HelloIT@kriasol.com
                                            </span>
                                        </a>
                                        <a 
                                            href="tel:9391930393" 
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                        >
                                            <img src={phoneImg} alt="Phone" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100" />
                                            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                +91 9391930393
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Button */}
                    <div className="relative" ref={profileMenuRef}>
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center justify-center p-1 text-gray-600 hover:text-gray-900 transition-colors duration-200 focus:outline-none"
                        >
                            <UserCircle className="w-7 h-7" strokeWidth={1.5} />
                        </button>
                        
                        {isProfileMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-64 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-700 font-semibold text-base">
                                            {(currentUser?.firstName?.charAt(0) || currentUser?.fullName?.charAt(0) || currentUser?.email?.charAt(0))?.toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {currentUser?.fullName || currentUser?.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="py-1.5">
                                    <Link
                                        to="/profile"
                                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                                        onClick={() => setIsProfileMenuOpen(false)}
                                    >
                                        <User className="w-4 h-4 mr-3 text-gray-500" />
                                        View Profile
                                    </Link>
                                    <div className="w-full h-px bg-gray-200 my-1"></div>
                                    <button
                                        onClick={() => {
                                            setIsProfileMenuOpen(false);
                                            onSignOut();
                                        }}
                                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
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
