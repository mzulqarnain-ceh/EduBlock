import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { universitiesAPI, usersAPI, analyticsAPI } from '../services/api';

const SuperAdminDashboard = () => {
    const [universities, setUniversities] = useState([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUniversity, setSelectedUniversity] = useState(null);
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [universityToDelete, setUniversityToDelete] = useState(null);
    const [showUserDeleteModal, setShowUserDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showUserDetailModal, setShowUserDetailModal] = useState(false);
    const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
    const [searchParams] = useSearchParams();
    const validTabs = ['universities', 'users', 'settings', 'analytics'];
    const initialTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'universities';
    const [activeTab, setActiveTab] = useState(initialTab);



    // User Management State
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [userStatusFilter, setUserStatusFilter] = useState('all');

    // Blockchain/Smart Contract Settings
    const [blockchainSettings, setBlockchainSettings] = useState({
        network: 'Sepolia Testnet',
        contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f28aBc',
        chainId: '11155111',
        gasPrice: '25',
        blockNumber: '4,892,341',
        connectionStatus: 'Connected',
        lastSync: new Date().toISOString(),
        transactionsPending: 0,
        transactionsConfirmed: 0,
    });

    // System Analytics
    const [analytics, setAnalytics] = useState({
        totalCertificates: 0,
        thisMonth: 0,
        verifications: 0,
        activeUsers: 0,
        totalIssued: 0,
        totalPending: 0,
        totalRevoked: 0,
        monthly_issued: [],
        university_issued: [],
        recent_activity: []
    });

    const formatDateTime = (dateString) => {
        if (!dateString || dateString === 'Never') return 'Never';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateString;
        }
    };

    const fetchData = async () => {
        try {
            const [uniRes, usersRes, statsRes] = await Promise.all([
                universitiesAPI.list(),
                usersAPI.list(),
                analyticsAPI.getDashboard(),
            ]);

            // Map universities
            setUniversities(uniRes.data.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                status: u.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive',
                students: u.students || 0,
            })));

            // Map users
            setUsers(usersRes.data.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                universityName: u.university_name || '',
                registrationNo: u.registration_no || '',
                status: u.status?.toLowerCase() === 'active' ? 'Active' : 
                        u.status?.toLowerCase() === 'suspended' ? 'Suspended' : 
                        u.status?.toLowerCase() === 'pending' ? 'Pending' : 'Inactive',
                lastLogin: formatDateTime(u.last_login),
                createdAt: formatDateTime(u.created_at),
                walletAddress: u.wallet_address || 'Not Connected',
                selected: false,
            })));

            // Set analytics
            const s = statsRes.data;
            setAnalytics({
                totalCertificates: s.total_certificates || 0,
                thisMonth: s.monthly_issued?.length > 0 ? s.monthly_issued[s.monthly_issued.length - 1].count : 0,
                verifications: 0,
                activeUsers: s.total_users || 0,
                totalIssued: s.total_issued || 0,
                totalPending: s.total_pending || 0,
                totalRevoked: s.total_revoked || 0,
                monthly_issued: s.monthly_issued || [],
                university_issued: s.university_issued || [],
                recent_activity: s.recent_activity || []
            });

        } catch (err) {
            console.error('Error fetching SuperAdmin data:', err);
        }
    };

    // Fetch all data from backend
    useEffect(() => {
        fetchData();
    }, []);

    const [newUniversity, setNewUniversity] = useState({
        name: '',
        email: '',
        adminName: '',
        password: '',
    });

    const [editUniversity, setEditUniversity] = useState({
        id: null,
        name: '',
        email: '',
        status: 'Active',
    });

    const showNotification = (type, message) => {
        let safeMessage = '';
        if (typeof message === 'string') {
            safeMessage = message;
        } else if (Array.isArray(message)) {
            if (message.length > 0 && typeof message[0] === 'object' && message[0] !== null) {
                safeMessage = message.map(err => {
                    const locStr = err.loc ? err.loc.filter(l => l !== 'body').join('.') : '';
                    const fieldPrefix = locStr ? `[${locStr}]: ` : '';
                    return `${fieldPrefix}${err.msg || 'Invalid value'}`;
                }).join(', ');
            } else {
                safeMessage = message.map(item => String(item)).join(', ');
            }
        } else if (typeof message === 'object' && message !== null) {
            safeMessage = message.detail || message.message || message.error || JSON.stringify(message);
        } else {
            safeMessage = String(message || '');
        }

        // Final safety check
        safeMessage = String(safeMessage);
        if (safeMessage.length > 300) {
            safeMessage = safeMessage.slice(0, 300) + '...';
        }

        setNotification({ show: true, type, message: safeMessage });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3500);
    };

    const handleAddUniversity = async (e) => {
        e.preventDefault();

        // 1. Inputs cleanup
        const trimmedName = newUniversity.name ? String(newUniversity.name).trim() : '';
        const trimmedEmail = newUniversity.email ? String(newUniversity.email).trim() : '';
        const trimmedAdminName = newUniversity.adminName ? String(newUniversity.adminName).trim() : '';
        const trimmedPassword = newUniversity.password ? String(newUniversity.password).trim() : '';

        // Injection Scanner Helper
        const scanInjections = (val, fieldName) => {
            if (!val) return null;
            const lower = String(val).toLowerCase();
            const sqlKeywords = ['select ', 'union ', 'insert ', 'update ', 'delete ', 'drop ', 'alter ', '--', '/*', 'xp_cmdshell'];
            for (const kw of sqlKeywords) {
                if (lower.includes(kw)) {
                    return `Unsafe database keywords detected in ${fieldName}.`;
                }
            }
            const xssPatterns = ['<script', 'javascript:', 'onload', 'onerror'];
            for (const pattern of xssPatterns) {
                if (lower.includes(pattern)) {
                    return `Unsafe HTML or script tags detected in ${fieldName}.`;
                }
            }
            return null;
        };

        // 2. University Name Validation
        if (!trimmedName) {
            showNotification('error', "University name is required.");
            return;
        }
        if (trimmedName.length < 3 || trimmedName.length > 100) {
            showNotification('error', "University name must be between 3 and 100 characters.");
            return;
        }
        const nameErr = scanInjections(trimmedName, "University Name");
        if (nameErr) {
            showNotification('error', nameErr);
            return;
        }
        const nameRegex = /^[a-zA-Z0-9\s.()'/&-]+$/;
        if (!nameRegex.test(trimmedName)) {
            showNotification('error', "University name must only contain alphanumeric characters, spaces, and standard symbols.");
            return;
        }

        // 3. Admin Email Validation
        if (!trimmedEmail) {
            showNotification('error', "Admin email is required.");
            return;
        }
        if (trimmedEmail.length < 3 || trimmedEmail.length > 100) {
            showNotification('error', "Admin email must be between 3 and 100 characters.");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            showNotification('error', "Please enter a valid email address.");
            return;
        }

        // 4. Admin Name Validation
        if (!trimmedAdminName) {
            showNotification('error', "Admin name is required.");
            return;
        }
        if (trimmedAdminName.length < 2 || trimmedAdminName.length > 100) {
            showNotification('error', "Admin name must be between 2 and 100 characters.");
            return;
        }
        const adminNameErr = scanInjections(trimmedAdminName, "Admin Name");
        if (adminNameErr) {
            showNotification('error', adminNameErr);
            return;
        }
        const adminNameRegex = /^[a-zA-Z\s.'-]+$/;
        if (!adminNameRegex.test(trimmedAdminName)) {
            showNotification('error', "Admin name must only contain letters, spaces, or dots.");
            return;
        }

        // 5. Default Password Validation
        if (!trimmedPassword) {
            showNotification('error', "Default password is required.");
            return;
        }
        if (trimmedPassword.length < 6 || trimmedPassword.length > 100) {
            showNotification('error', "Default password must be between 6 and 100 characters.");
            return;
        }

        try {
            const res = await universitiesAPI.create({
                name: trimmedName,
                email: trimmedEmail,
                admin_name: trimmedAdminName,
                admin_password: trimmedPassword,
            });
            const uni = res.data;
            setUniversities(prev => [...prev, {
                id: uni.id,
                name: uni.name,
                email: uni.email,
                status: 'Active',
                students: 0,
            }]);

            // Refresh users list to show the new admin
            try {
                const usersRes = await usersAPI.list();
                setUsers(usersRes.data.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    universityName: u.university_name || '',
                    status: u.status?.toLowerCase() === 'active' ? 'Active' : 
                            u.status?.toLowerCase() === 'suspended' ? 'Suspended' : 
                            u.status?.toLowerCase() === 'pending' ? 'Pending' : 'Inactive',
                    lastLogin: formatDateTime(u.last_login),
                    selected: false,
                })));
            } catch (err) {
                console.error('Failed to refresh users:', err);
            }

            setNewUniversity({ name: '', email: '', adminName: '', password: '' });
            setShowAddModal(false);
            showNotification('success', `${uni.name} has been added successfully!`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to add university.');
        }
    };

    const handleDeleteUniversity = (id) => {
        const university = universities.find(uni => uni.id === id);
        if (!university) {
            showNotification('error', 'University not found!');
            return;
        }
        setUniversityToDelete(university);
        setShowDeleteModal(true);
    };

    const confirmDeleteUniversity = async () => {
        if (!universityToDelete) return;
        try {
            await universitiesAPI.delete(universityToDelete.id);
            setUniversities(universities.filter(uni => uni.id !== universityToDelete.id));
            showNotification('success', `${universityToDelete.name} has been deleted.`);
            setShowDeleteModal(false);
            setUniversityToDelete(null);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to delete university.');
        }
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setShowUserDeleteModal(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await usersAPI.delete(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            showNotification('success', `${userToDelete.name} has been deleted.`);
            setShowUserDeleteModal(false);
            setUserToDelete(null);
            fetchData();
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to delete user');
        }
    };

    const handleToggleUserStatus = async (user) => {
        const nextStatus = user.status === 'Active' ? 'inactive' : 'active';
        try {
            await usersAPI.updateStatus(user.id, nextStatus);
            const displayStatus = nextStatus === 'active' ? 'Active' : 'Inactive';
            setUsers(prev => prev.map(u =>
                u.id === user.id ? { ...u, status: displayStatus } : u
            ));
            showNotification('success', `${user.name} status updated to ${displayStatus}.`);
            fetchData();
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to update user status.');
        }
    };



    const openEditModal = (university) => {
        setEditUniversity({
            id: university.id,
            name: university.name,
            email: university.email,
            status: university.status,
        });
        setShowEditModal(true);
    };

    const handleEditUniversity = (e) => {
        e.preventDefault();
        setUniversities(universities.map(uni =>
            uni.id === editUniversity.id
                ? { ...uni, name: editUniversity.name, email: editUniversity.email, status: editUniversity.status }
                : uni
        ));
        setShowEditModal(false);
        showNotification('success', `${editUniversity.name} has been updated successfully!`);
    };

    const handleToggleStatus = async (id) => {
        try {
            const res = await universitiesAPI.toggleStatus(id);
            const newStatus = res.data.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive';
            setUniversities(universities.map(uni =>
                uni.id === id ? { ...uni, status: newStatus } : uni
            ));
            showNotification('success', `Status changed to ${newStatus}`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to toggle status.');
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const stats = {
        totalUniversities: analytics.totalUniversities || universities.length,
        activeUniversities: universities.filter(u => u.status === 'Active').length,
        totalStudents: analytics.activeUsers || universities.reduce((sum, uni) => sum + uni.students, 0),
        totalDegrees: analytics.totalCertificates || 0,
    };

    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                                Super Admin <span className="gradient-text">Dashboard</span>
                            </h1>
                            <p className="text-white/60">Manage universities and system settings</p>
                        </div>
                        {activeTab === 'universities' && (
                            <Button variant="primary" onClick={() => setShowAddModal(true)}>
                                + Add University
                            </Button>
                        )}

                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { id: 'universities', icon: '🏛️', label: `Universities (${universities.length})` },
                            { id: 'users', icon: '👥', label: `Users (${users.length})` },
                            { id: 'settings', icon: '⚙️', label: 'Settings' },
                            { id: 'analytics', icon: '📊', label: 'Analytics' },
                        ].map(tab => (
                            <a
                                key={tab.id}
                                href={`/superadmin?tab=${tab.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab(tab.id);
                                }}
                                className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base cursor-pointer inline-block ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </a>
                        ))}
                    </div>

                    {/* Universities Tab Content */}
                    {activeTab === 'universities' && (
                        <>
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">🏛️</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Total Universities</p>
                                            <p className="text-3xl font-bold">{stats.totalUniversities}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">✓</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Active</p>
                                            <p className="text-3xl font-bold">{stats.activeUniversities}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">🎓</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Total Users</p>
                                            <p className="text-3xl font-bold">{stats.totalStudents}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">📜</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Issued Degrees</p>
                                            <p className="text-3xl font-bold">{stats.totalDegrees}</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Universities Table */}
                            <Card>
                                <h2 className="text-2xl font-bold mb-6">Universities Management</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-4 text-white/80">University Name</th>
                                                <th className="text-left py-3 px-4 text-white/80">Admin Email</th>
                                                <th className="text-left py-3 px-4 text-white/80">Students</th>
                                                <th className="text-left py-3 px-4 text-white/80">Status</th>
                                                <th className="text-center py-3 px-4 text-white/80">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {universities.map((uni) => (
                                                <tr key={uni.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="py-4 px-4 font-semibold">{uni.name}</td>
                                                    <td className="py-4 px-4 text-white/70">{uni.email}</td>
                                                    <td className="py-4 px-4">{uni.students}</td>
                                                    <td className="py-4 px-4">
                                                        <button
                                                            onClick={() => handleToggleStatus(uni.id)}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${uni.status === 'Active'
                                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                                                                }`}
                                                            title="Click to toggle status"
                                                        >
                                                            {uni.status}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex gap-2 justify-center">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => openEditModal(uni)}
                                                            >
                                                                Edit
                                                            </Button>

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteUniversity(uni.id)}
                                                                className="border-red-500 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </>
                    )}

                    {/* Users Tab Content */}
                    {activeTab === 'users' && (
                        <Card>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h2 className="text-2xl font-bold">User Management</h2>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="input-field w-full sm:w-64"
                                    />
                                    <select
                                        value={userRoleFilter}
                                        onChange={(e) => setUserRoleFilter(e.target.value)}
                                        className="input-field w-full sm:w-32"
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="student">Student</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <select
                                        value={userStatusFilter}
                                        onChange={(e) => setUserStatusFilter(e.target.value)}
                                        className="input-field w-full sm:w-32"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-white/80">User</th>
                                            <th className="text-left py-3 px-4 text-white/80">Role</th>
                                            <th className="text-left py-3 px-4 text-white/80">Status</th>
                                            <th className="text-left py-3 px-4 text-white/80">Last Login</th>
                                            <th className="text-center py-3 px-4 text-white/80">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users
                                            .filter(user => {
                                                const matchesSearch =
                                                    user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    user.email.toLowerCase().includes(userSearch.toLowerCase());
                                                const matchesRole = userRoleFilter === 'all' || user.role?.toLowerCase() === userRoleFilter.toLowerCase();
                                                const matchesStatus = userStatusFilter === 'all' || user.status === userStatusFilter;
                                                return matchesSearch && matchesRole && matchesStatus;
                                            })
                                            .map((user) => (
                                                <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <p className="font-semibold">{user.name}</p>
                                                        <p className="text-white/50 text-xs">{user.email}</p>
                                                        {user.role?.toLowerCase() === 'admin' && user.universityName && (
                                                            <p className="text-cyan-400/85 text-xs mt-1 font-medium flex items-center gap-1">
                                                                🏛️ {user.universityName}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role?.toLowerCase() === 'admin'
                                                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <button
                                                            onClick={() => handleToggleUserStatus(user)}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                                                                user.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' :
                                                                user.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' :
                                                                user.status === 'Inactive' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30' :
                                                                'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                                            }`}
                                                            title="Click to toggle status"
                                                        >
                                                            {user.status}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-4 text-white/60 text-sm">{user.lastLogin}</td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex gap-2 justify-center flex-wrap">
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedUserForDetail(user);
                                                                    setShowUserDetailModal(true);
                                                                }}
                                                            >
                                                                👁 Details
                                                            </Button>
                                                            {user.status !== 'Active' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await usersAPI.updateStatus(user.id, 'active');
                                                                            setUsers(prev => prev.map(u =>
                                                                                u.id === user.id ? { ...u, status: 'Active' } : u
                                                                            ));
                                                                            showNotification('success', `${user.name} is now Active.`);
                                                                            fetchData();
                                                                        } catch (err) {
                                                                            showNotification('error', err.response?.data?.detail || 'Failed to update status');
                                                                        }
                                                                    }}
                                                                    className="border-green-500 text-green-400 hover:bg-green-500/10"
                                                                >
                                                                    ✓ {user.status === 'Pending' ? 'Approve' : 'Active'}
                                                                </Button>
                                                            )}
                                                            {user.status !== 'Inactive' && user.status !== 'Suspended' && user.status !== 'Pending' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await usersAPI.updateStatus(user.id, 'inactive');
                                                                            setUsers(prev => prev.map(u =>
                                                                                u.id === user.id ? { ...u, status: 'Inactive' } : u
                                                                            ));
                                                                            showNotification('success', `${user.name} is now Inactive.`);
                                                                            fetchData();
                                                                        } catch (err) {
                                                                            showNotification('error', err.response?.data?.detail || 'Failed to update status');
                                                                        }
                                                                    }}
                                                                    className="border-gray-500 text-gray-400 hover:bg-gray-500/10"
                                                                >
                                                                    ⦾ Inactive
                                                                </Button>
                                                            )}
                                                            {user.status !== 'Suspended' && user.status !== 'Pending' && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            await usersAPI.updateStatus(user.id, 'suspended');
                                                                            setUsers(prev => prev.map(u =>
                                                                                u.id === user.id ? { ...u, status: 'Suspended' } : u
                                                                            ));
                                                                            showNotification('success', `${user.name} has been suspended.`);
                                                                            fetchData();
                                                                        } catch (err) {
                                                                            showNotification('error', err.response?.data?.detail || 'Failed to suspend');
                                                                        }
                                                                    }}
                                                                    className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                                                                >
                                                                    ⏸ Suspend
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDeleteUser(user)}
                                                                className="border-red-500 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                🗑 Delete
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Settings Tab Content */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Blockchain Network Status */}
                            <Card>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold">🌐 Blockchain Network Status</h2>
                                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${blockchainSettings.connectionStatus === 'Connected'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${blockchainSettings.connectionStatus === 'Connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                                            }`}></span>
                                        {blockchainSettings.connectionStatus}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Network</p>
                                        <p className="text-lg font-semibold text-cyan-400">{blockchainSettings.network}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Chain ID</p>
                                        <p className="text-lg font-semibold">{blockchainSettings.chainId}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Gas Price</p>
                                        <p className="text-lg font-semibold text-amber-400">{blockchainSettings.gasPrice} Gwei</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Latest Block</p>
                                        <p className="text-lg font-semibold text-emerald-400">{blockchainSettings.blockNumber}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Pending Transactions</p>
                                        <p className="text-2xl font-bold text-orange-400">{blockchainSettings.transactionsPending}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-white/60 text-sm mb-1">Confirmed Transactions</p>
                                        <p className="text-2xl font-bold text-green-400">{blockchainSettings.transactionsConfirmed}</p>
                                    </div>
                                </div>

                                <p className="text-white/40 text-sm mt-4">Last synced: {blockchainSettings.lastSync}</p>
                            </Card>

                            {/* Smart Contract Settings */}
                            <Card>
                                <h2 className="text-2xl font-bold mb-6">📜 Smart Contract Settings</h2>

                                <div className="space-y-4">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white/60 text-sm mb-1">Contract Address</p>
                                                <p className="font-mono text-blue-400 break-all text-sm sm:text-base pr-2">{blockchainSettings.contractAddress}</p>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full sm:w-auto justify-center whitespace-nowrap"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(blockchainSettings.contractAddress);
                                                    showNotification('success', 'Contract address copied!');
                                                }}
                                            >
                                                📋 Copy
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <p className="text-white/60 text-sm mb-1">Contract Status</p>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                <span className="text-green-400 font-semibold">Deployed & Active</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <p className="text-white/60 text-sm mb-1">Contract Version</p>
                                            <p className="font-semibold">v1.2.0</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-4">
                                            <p className="text-white/60 text-sm mb-1">Owner Address</p>
                                            <p className="font-mono text-sm text-white/70">0x1234...abcd</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.open(`https://sepolia.etherscan.io/address/${blockchainSettings.contractAddress}`, '_blank')}
                                        >
                                            🔗 View on Etherscan
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => showNotification('success', 'Contract health check passed!')}
                                        >
                                            🔄 Check Health
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* System Configuration */}
                            <Card>
                                <h2 className="text-2xl font-bold mb-6">⚙️ System Configuration</h2>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div>
                                            <p className="font-semibold">Auto-verify Certificates</p>
                                            <p className="text-white/60 text-sm">Automatically verify certificates after blockchain confirmation</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div>
                                            <p className="font-semibold">Email Notifications</p>
                                            <p className="text-white/60 text-sm">Send email notifications for important events</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Analytics Tab Content */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6">
                            {/* Overview Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">📜</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Total Certificates</p>
                                            <p className="text-3xl font-bold">{analytics.totalCertificates}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">📈</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">This Month</p>
                                            <p className="text-3xl font-bold text-emerald-400">+{analytics.thisMonth}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">✓</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Verifications</p>
                                            <p className="text-3xl font-bold">{analytics.verifications}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                            <span className="text-2xl">👥</span>
                                        </div>
                                        <div>
                                            <p className="text-white/60 text-sm">Active Users</p>
                                            <p className="text-3xl font-bold">{analytics.activeUsers}</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Certificate Status Breakdown */}
                            <div className="mt-8">
                                <h3 className="text-xl font-bold mb-4">📜 Certificate Status Breakdown</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                                <span className="text-2xl">✅</span>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm">Verified Certificates</p>
                                                <p className="text-3xl font-bold text-green-400">{analytics.totalIssued}</p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                                <span className="text-2xl">⏳</span>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm">Pending Claims</p>
                                                <p className="text-3xl font-bold text-amber-400">{analytics.totalPending}</p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                                <span className="text-2xl">🚫</span>
                                            </div>
                                            <div>
                                                <p className="text-white/60 text-sm">Revoked Certificates</p>
                                                <p className="text-3xl font-bold text-red-400">{analytics.totalRevoked}</p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Monthly Certificates Chart */}
                                <Card>
                                    <h3 className="text-xl font-bold mb-4">📊 Monthly Certificates Issued</h3>
                                    <div className="space-y-3">
                                        {analytics.monthly_issued.length > 0 ? (
                                            analytics.monthly_issued.map((item, idx) => {
                                                const colors = ['bg-amber-500', 'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500'];
                                                return (
                                                    <div key={idx} className="flex items-center gap-4">
                                                        <span className="w-20 text-white/60 text-sm">{item.month}</span>
                                                        <div className="flex-1 bg-white/10 rounded-full h-4">
                                                            <div
                                                                className={`${colors[idx % colors.length]} h-4 rounded-full transition-all`}
                                                                style={{ width: `${Math.min((item.count / Math.max(...analytics.monthly_issued.map(m => m.count), 1)) * 100, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="w-12 text-right font-semibold">{item.count}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-white/40 text-center py-8">No data available for the last 6 months</p>
                                        )}
                                    </div>
                                </Card>

                                {/* University Distribution */}
                                <Card>
                                    <h3 className="text-xl font-bold mb-4">🏛️ Certificates by University</h3>
                                    <div className="space-y-3">
                                        {analytics.university_issued.length > 0 ? (
                                            analytics.university_issued.map((uni, idx) => (
                                                <div key={idx} className="flex items-center gap-4">
                                                    <span className="w-32 text-white/60 text-sm truncate">{uni.name}</span>
                                                    <div className="flex-1 bg-white/10 rounded-full h-4">
                                                        <div
                                                            className="bg-gradient-to-r from-amber-500 to-emerald-500 h-4 rounded-full"
                                                            style={{ width: `${Math.min((uni.count / Math.max(...analytics.university_issued.map(u => u.count), 1)) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="w-12 text-right font-semibold">{uni.count}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-white/40 text-center py-8">No universities with issued degrees</p>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Recent Activity */}
                            <Card>
                                <h3 className="text-xl font-bold mb-4">📋 Recent System Activity</h3>
                                <div className="space-y-3">
                                    {analytics.recent_activity.length > 0 ? (
                                        analytics.recent_activity.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        item.type === 'success' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                                                        item.type === 'warning' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]' : 
                                                        'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                                                    }`}></span>
                                                    <div>
                                                        <p className="font-semibold text-sm sm:text-base">{item.action}</p>
                                                        <p className="text-white/50 text-xs sm:text-sm">{item.user}</p>
                                                    </div>
                                                </div>
                                                <span className="text-white/40 text-xs sm:text-sm whitespace-nowrap">{formatTimeAgo(item.time)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-white/40 text-center py-8">No recent activity found</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Add University Modal */}
                    {showAddModal && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowAddModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold">Add New University</h2>
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            className="text-white/60 hover:text-white"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddUniversity} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                University Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newUniversity.name}
                                                onChange={(e) => setNewUniversity({ ...newUniversity, name: e.target.value })}
                                                placeholder="Enter university name"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                Admin Email
                                            </label>
                                            <input
                                                type="email"
                                                value={newUniversity.email}
                                                onChange={(e) => setNewUniversity({ ...newUniversity, email: e.target.value })}
                                                placeholder="admin@university.edu"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                Admin Name
                                            </label>
                                            <input
                                                type="text"
                                                value={newUniversity.adminName}
                                                onChange={(e) => setNewUniversity({ ...newUniversity, adminName: e.target.value })}
                                                placeholder="Enter admin name"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                Default Password
                                            </label>
                                            <input
                                                type="password"
                                                value={newUniversity.password}
                                                onChange={(e) => setNewUniversity({ ...newUniversity, password: e.target.value })}
                                                placeholder="Set initial password"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setShowAddModal(false)}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="primary" className="flex-1">
                                                Add University
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Edit University Modal */}
                    {showEditModal && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowEditModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold">Edit University</h2>
                                        <button
                                            onClick={() => setShowEditModal(false)}
                                            className="text-white/60 hover:text-white"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <form onSubmit={handleEditUniversity} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                University Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editUniversity.name}
                                                onChange={(e) => setEditUniversity({ ...editUniversity, name: e.target.value })}
                                                placeholder="Enter university name"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                Admin Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editUniversity.email}
                                                onChange={(e) => setEditUniversity({ ...editUniversity, email: e.target.value })}
                                                placeholder="admin@university.edu"
                                                className="input-field"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-white/80">
                                                Status
                                            </label>
                                            <select
                                                value={editUniversity.status}
                                                onChange={(e) => setEditUniversity({ ...editUniversity, status: e.target.value })}
                                                className="input-field"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setShowEditModal(false)}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="primary" className="flex-1">
                                                Update University
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </motion.div>
                        </div>
                    )}





                    {/* Delete Confirmation Modal */}
                    {showDeleteModal && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card>
                                    <div className="flex flex-col items-center text-center p-4">
                                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">Are you sure?</h2>
                                        <p className="text-white/60 mb-8">
                                            Do you really want to delete <span className="text-white font-semibold">{universityToDelete?.name}</span>? This action cannot be undone.
                                        </p>
                                        <div className="flex gap-3 w-full">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowDeleteModal(false)}
                                                className="flex-1"
                                            >
                                                No, Keep it
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={confirmDeleteUniversity}
                                                className="flex-1 bg-red-500 hover:bg-red-600 border-none text-white"
                                            >
                                                Yes, Delete
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* User Delete Confirmation Modal */}
                    {showUserDeleteModal && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowUserDeleteModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-md w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card>
                                    <div className="flex flex-col items-center text-center p-4">
                                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">Delete User?</h2>
                                        <p className="text-white/60 mb-8">
                                            Are you sure you want to delete <span className="text-white font-semibold">{userToDelete?.name}</span>? This action will permanently remove the user from the system.
                                        </p>
                                        <div className="flex gap-3 w-full">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowUserDeleteModal(false)}
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={confirmDeleteUser}
                                                className="flex-1 bg-red-500 hover:bg-red-600 border-none text-white"
                                            >
                                                Delete User
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                     {/* User Details Modal */}
                    {showUserDetailModal && selectedUserForDetail && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowUserDetailModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="max-w-lg w-full"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card className="border-white/10">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <span>👤</span> User Details
                                        </h2>
                                        <button
                                            onClick={() => setShowUserDetailModal(false)}
                                            className="text-white/60 hover:text-white"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                            <span className="text-white/50 text-sm">Account Status</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                selectedUserForDetail.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                selectedUserForDetail.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                selectedUserForDetail.status === 'Inactive' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                                                'bg-red-500/20 text-red-400 border border-red-500/30'
                                            }`}>
                                                {selectedUserForDetail.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Full Name</span>
                                            <span className="text-white font-semibold col-span-2">{selectedUserForDetail.name}</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Email</span>
                                            <span className="text-white/80 font-mono text-sm col-span-2 break-all">{selectedUserForDetail.email}</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Role</span>
                                            <span className="text-white/80 col-span-2 font-semibold">
                                                {selectedUserForDetail.role?.toUpperCase() === 'ADMIN' ? '🏛️ Institute Admin' : '🎓 Student'}
                                            </span>
                                        </div>

                                        {selectedUserForDetail.role?.toUpperCase() === 'ADMIN' && selectedUserForDetail.universityName && (
                                            <div className="grid grid-cols-3 gap-1 py-1">
                                                <span className="text-white/50 text-sm col-span-1">University</span>
                                                <span className="text-cyan-400 font-semibold col-span-2">{selectedUserForDetail.universityName}</span>
                                            </div>
                                        )}

                                        {selectedUserForDetail.role?.toUpperCase() === 'STUDENT' && selectedUserForDetail.registrationNo && (
                                            <div className="grid grid-cols-3 gap-1 py-1">
                                                <span className="text-white/50 text-sm col-span-1">Reg No</span>
                                                <span className="text-amber-400 font-semibold col-span-2">{selectedUserForDetail.registrationNo}</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Wallet</span>
                                            <span className="text-white/60 font-mono text-xs col-span-2 break-all">{selectedUserForDetail.walletAddress}</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Registered</span>
                                            <span className="text-white/60 text-sm col-span-2">{selectedUserForDetail.createdAt || 'N/A'}</span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 py-1">
                                            <span className="text-white/50 text-sm col-span-1">Last Login</span>
                                            <span className="text-white/60 text-sm col-span-2">{selectedUserForDetail.lastLogin || 'Never'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 mt-6 flex gap-3">
                                        <Button
                                            variant="secondary"
                                            onClick={() => setShowUserDetailModal(false)}
                                            className="w-full justify-center"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        </div>
                    )}

                    {/* Notification Toast */}
                    {notification.show && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className="fixed top-24 right-4 z-50"
                        >
                            <div className={`px-6 py-4 rounded-lg shadow-lg backdrop-blur-lg border ${notification.type === 'success'
                                ? 'bg-green-500/20 border-green-500 text-green-400'
                                : 'bg-red-500/20 border-red-500 text-red-400'
                                } flex items-center gap-3`}>
                                {notification.type === 'success' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                                <span className="font-medium">{notification.message}</span>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
