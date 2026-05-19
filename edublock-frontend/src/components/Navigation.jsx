import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';

const Navigation = ({ walletAddress, onConnectWallet, onDisconnectWallet }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [user, setUser] = useState(null);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const [isWalletHovered, setIsWalletHovered] = useState(false);
    const userMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, [location]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);

            // Track active section on home page
            if (location.pathname === '/') {
                const sections = ['faq', 'how-it-works', 'features'];
                let found = '';
                for (const sectionId of sections) {
                    const element = document.getElementById(sectionId);
                    if (element) {
                        const rect = element.getBoundingClientRect();
                        if (rect.top <= 200 && rect.bottom >= 200) {
                            found = sectionId;
                            break;
                        }
                    }
                }
                setActiveSection(found);
            } else {
                setActiveSection('');
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [location.pathname]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const isActive = (path) => location.pathname === path;

    const isSectionActive = (sectionId) => {
        return location.pathname === '/' && activeSection === sectionId;
    };

    const navLinkClass = (path) => {
        const baseClass = "relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg";
        // Don't highlight Home when a section is active
        const active = isActive(path) && !(path === '/' && activeSection);
        const activeClass = active
            ? "text-amber-400 bg-amber-500/10 after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-gradient-to-r after:from-amber-500 after:to-emerald-500 after:rounded-full"
            : "text-white/70 hover:text-white hover:bg-white/5";
        return `${baseClass} ${activeClass}`;
    };

    const sectionLinkClass = (sectionId) => {
        const baseClass = "relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg cursor-pointer";
        const activeClass = isSectionActive(sectionId)
            ? "text-amber-400 bg-amber-500/10 after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-gradient-to-r after:from-amber-500 after:to-emerald-500 after:rounded-full"
            : "text-white/70 hover:text-white hover:bg-white/5";
        return `${baseClass} ${activeClass}`;
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setShowUserMenu(false);
        setIsOpen(false);
        if (onDisconnectWallet) {
            onDisconnectWallet();
        }
        navigate('/');
    };

    const scrollToSection = (sectionId) => {
        if (location.pathname !== '/') {
            // Navigate to home with state telling ScrollToTop to scroll to section
            navigate('/', { state: { scrollToSection: sectionId } });
        } else {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
        setIsOpen(false);
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled || isOpen
            ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl'
            : 'bg-transparent'
            }`}>
            <div className="container-custom">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <div className="w-11 h-11 bg-gradient-to-br from-amber-400 via-amber-500 to-emerald-500 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-amber-500/30">
                            <span className="text-black font-bold text-xl">E</span>
                        </div>
                        <span className="text-2xl font-bold gradient-text">EduBlock</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        <Link to="/" className={navLinkClass('/')}>
                            Home
                        </Link>
                        <button onClick={() => scrollToSection('features')} className={sectionLinkClass('features')}>
                            Features
                        </button>
                        <button onClick={() => scrollToSection('how-it-works')} className={sectionLinkClass('how-it-works')}>
                            How It Works
                        </button>
                        <Link to="/verify" className={navLinkClass('/verify')}>
                            Verify
                        </Link>
                        <button onClick={() => scrollToSection('faq')} className={sectionLinkClass('faq')}>
                            FAQ
                        </button>
                        {user && user.role?.toLowerCase() === 'superadmin' && (
                            <Link to="/superadmin" className={navLinkClass('/superadmin')}>
                                Super Admin
                            </Link>
                        )}
                        {user && user.role?.toLowerCase() === 'admin' && (
                            <Link to="/admin" className={navLinkClass('/admin')}>
                                Admin Dashboard
                            </Link>
                        )}
                        {user && user.role?.toLowerCase() === 'student' && (
                            <Link to="/student" className={navLinkClass('/student')}>
                                Student Dashboard
                            </Link>
                        )}
                        <Link to="/contact" className={navLinkClass('/contact')}>
                            Contact
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-3 ml-4">
                                {/* Connect Wallet button for students */}
                                {user.role?.toLowerCase() === 'student' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={walletAddress ? onDisconnectWallet : onConnectWallet}
                                        onMouseEnter={() => setIsWalletHovered(true)}
                                        onMouseLeave={() => setIsWalletHovered(false)}
                                        className={`transition-all duration-300 ${
                                            walletAddress 
                                                ? 'border-emerald-500/50 text-emerald-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10' 
                                                : 'border-amber-500 text-amber-400 hover:bg-amber-500/10'
                                        }`}
                                    >
                                        {walletAddress ? (
                                            isWalletHovered ? (
                                                <span className="flex items-center gap-2">
                                                    🔌 Disconnect
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    🟢 {formatAddress(walletAddress)}
                                                </span>
                                            )
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                🔗 Connect Wallet
                                            </span>
                                        )}
                                    </Button>
                                )}

                                {/* User Profile Dropdown */}
                                <div ref={userMenuRef} className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                            <span className="text-black font-bold text-sm">
                                                {user.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-white font-medium">{user.name}</span>
                                        <svg className={`w-4 h-4 text-white/60 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-3 w-56 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
                                            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-emerald-500/10">
                                                <p className="text-white/50 text-xs uppercase tracking-wider">Logged in as</p>
                                                <p className="text-white font-semibold mt-1">{user.email}</p>
                                                <p className="text-amber-400 text-xs mt-1 capitalize font-medium">{user.role}</p>
                                            </div>
                                            {walletAddress && (
                                                <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
                                                    <div>
                                                        <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Wallet</p>
                                                        <p className="text-white font-mono text-sm" title={walletAddress}>{formatAddress(walletAddress)}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            onDisconnectWallet();
                                                            setShowUserMenu(false);
                                                        }}
                                                        className="px-2 py-1 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg border border-red-500/20 transition-all duration-300"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </div>
                                            )}
                                            <Link
                                                to="/settings"
                                                onClick={() => setShowUserMenu(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200"
                                            >
                                                <span className="text-lg">⚙️</span>
                                                <span>Settings</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-white/70 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                                            >
                                                <span className="text-lg">🚪</span>
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 ml-4">
                                <Link to="/login">
                                    <Button variant="secondary" size="sm">
                                        Login
                                    </Button>
                                </Link>
                                <Link to="/signup">
                                    <Button variant="primary" size="sm">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu Overlay - click outside to close */}
                {isOpen && (
                    <div
                        className="md:hidden fixed inset-0 top-20 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                )}

                {/* Mobile Menu */}
                <div className={`md:hidden fixed top-20 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-2xl border-t border-white/10 transition-all duration-300 ease-in-out z-40 ${isOpen ? 'opacity-100 visible translate-y-0 overflow-y-auto' : 'opacity-0 invisible -translate-y-4 pointer-events-none'}`}>
                    <div className="container-custom py-8 space-y-2 pb-24">
                        <Link to="/" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                            Home
                        </Link>
                        <button onClick={() => scrollToSection('features')} className="block w-full text-left text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg">
                            Features
                        </button>
                        <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg">
                            How It Works
                        </button>
                        <Link to="/verify" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                            Verify
                        </Link>
                        <button onClick={() => scrollToSection('faq')} className="block w-full text-left text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg">
                            FAQ
                        </button>
                        <Link to="/contact" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                            Contact
                        </Link>

                        {user ? (
                            <div className="border-t border-white/10 pt-4 mt-4">
                                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-lg mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-black font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{user.name}</p>
                                        <p className="text-amber-400 text-xs capitalize">{user.role}</p>
                                    </div>
                                </div>

                                {/* Dashboard Links for Mobile */}
                                <div className="space-y-1 mb-4">
                                    {user.role?.toLowerCase() === 'superadmin' && (
                                        <Link to="/superadmin" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                                            Super Admin Dashboard
                                        </Link>
                                    )}
                                    {user.role?.toLowerCase() === 'admin' && (
                                        <Link to="/admin" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                                            Admin Dashboard
                                        </Link>
                                    )}
                                    {user.role?.toLowerCase() === 'student' && (
                                        <Link to="/student" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                                            Student Dashboard
                                        </Link>
                                    )}
                                    <Link to="/settings" className="block text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 py-3 px-4 rounded-lg" onClick={() => setIsOpen(false)}>
                                        Settings
                                    </Link>
                                </div>

                                {user.role?.toLowerCase() === 'student' && (
                                    <div className="px-4 mb-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (walletAddress) {
                                                    onDisconnectWallet();
                                                } else {
                                                    onConnectWallet();
                                                }
                                                setIsOpen(false);
                                            }}
                                            className={`w-full justify-center transition-all duration-300 ${
                                                walletAddress 
                                                    ? 'border-emerald-500/50 text-emerald-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10' 
                                                     : 'border-amber-500 text-amber-400 hover:bg-amber-500/10'
                                            }`}
                                        >
                                            {walletAddress ? (
                                                <span className="flex items-center gap-2 justify-center">
                                                    🟢 {formatAddress(walletAddress)} (Disconnect)
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 justify-center">
                                                    🔗 Connect Wallet
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                <Button variant="secondary" size="sm" onClick={handleLogout} className="w-full">
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-3 pt-4">
                                <Link to="/login" className="flex-1" onClick={() => setIsOpen(false)}>
                                    <Button variant="secondary" size="sm" className="w-full">Login</Button>
                                </Link>
                                <Link to="/signup" className="flex-1" onClick={() => setIsOpen(false)}>
                                    <Button variant="primary" size="sm" className="w-full">Sign Up</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
