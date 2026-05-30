import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCode } from 'react-qr-code';
import Button from '../components/Button';
import Card from '../components/Card';
import { generateCertificatePDF } from '../utils/pdfGenerator';
import { openTransactionInExplorer } from '../utils/blockchain';
import { degreesAPI, usersAPI, universitiesAPI } from '../services/api';

const StudentDashboard = () => {
    const [showQRModal, setShowQRModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedCert, setSelectedCert] = useState(null);
    const [user, setUser] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date-desc');
    const [certificates, setCertificates] = useState([]);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileImageFile, setProfileImageFile] = useState(null);

    // Claim state
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [universities, setUniversities] = useState([]);
    const [claimData, setClaimData] = useState({ universityId: '', degreeName: '' });
    const [submittingClaim, setSubmittingClaim] = useState(false);

    // Fetch public universities
    useEffect(() => {
        const fetchUnis = async () => {
            try {
                const res = await universitiesAPI.listPublic();
                setUniversities(res.data);
            } catch (err) {
                console.error('Error fetching universities:', err);
            }
        };
        fetchUnis();
    }, []);

    const handleSubmitClaim = async () => {
        if (!claimData.universityId) {
            showNotification('Please select a university');
            return;
        }
        if (!claimData.degreeName.trim()) {
            showNotification('Please enter a degree name');
            return;
        }
        if (!user?.registration_no) {
            showNotification('Please update your registration number in your profile first');
            return;
        }
        setSubmittingClaim(true);
        try {
            await degreesAPI.claim({
                university_id: parseInt(claimData.universityId),
                degree_name: claimData.degreeName.trim(),
            });
            showNotification('Degree claim request submitted successfully! Pending approval.');
            setShowClaimModal(false);
            setClaimData({ universityId: '', degreeName: '' });
            // Refresh certificates
            const res = await degreesAPI.list();
            const certs = res.data.map(cert => ({
                id: cert.id,
                studentName: cert.student_name,
                courseName: cert.degree_name,
                institution: cert.university_name || 'Unknown University',
                grade: cert.grade || 'N/A',
                issueDate: cert.issue_date || 'Pending Approval',
                status: cert.status?.toLowerCase() === 'issued' ? 'Issued' : cert.status?.toLowerCase() === 'revoked' ? 'Revoked' : 'Pending',
                hash: cert.blockchain_hash || '',
                txHash: cert.tx_hash || '',
                txStatus: cert.status?.toLowerCase() === 'issued' ? 'Confirmed' : 'Pending',
            }));
            setCertificates(certs);
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Failed to submit degree request');
        } finally {
            setSubmittingClaim(false);
        }
    };

    // Get user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Fetch certificates from backend
    useEffect(() => {
        const fetchCerts = async () => {
            try {
                const res = await degreesAPI.list();
                const certs = res.data.map(cert => ({
                    id: cert.id,
                    studentName: cert.student_name,
                    courseName: cert.degree_name,
                    institution: cert.university_name || 'Unknown University',
                    grade: cert.grade || 'N/A',
                    issueDate: cert.issue_date || 'Pending Approval',
                    status: cert.status?.toLowerCase() === 'issued' ? 'Issued' : cert.status?.toLowerCase() === 'revoked' ? 'Revoked' : 'Pending',
                    hash: cert.blockchain_hash || '',
                    txHash: cert.tx_hash || '',
                    txStatus: cert.status?.toLowerCase() === 'issued' ? 'Confirmed' : 'Pending',
                }));
                setCertificates(certs);
            } catch (err) {
                console.error('Error fetching certificates:', err);
            }
        };
        fetchCerts();
    }, []);

    const showNotification = (message) => {
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

        setNotification({ show: true, message: safeMessage });
        setTimeout(() => setNotification({ show: false, message: '' }), 3500);
    };

    const handleUpdateProfile = async () => {
        // 1. Password change validation
        if (profileData.newPassword || profileData.confirmPassword) {
            if (!profileData.currentPassword) {
                showNotification('Please enter current password to set a new one');
                return;
            }
            if (profileData.newPassword.length < 6 || profileData.newPassword.length > 100) {
                showNotification('New password must be between 6 and 100 characters');
                return;
            }
            if (profileData.newPassword !== profileData.confirmPassword) {
                showNotification('New passwords do not match');
                return;
            }
        }

        // 2. Profile Image validation
        if (profileImageFile) {
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            const fileExtension = profileImageFile.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                showNotification('Invalid image format. Allowed formats: JPG, JPEG, PNG, GIF, WEBP');
                return;
            }
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (profileImageFile.size > maxSize) {
                showNotification('Image file size must be less than 5MB');
                return;
            }
        }

        setSavingProfile(true);
        let passwordUpdated = false;
        let photoUpdated = false;
        let newProfileImage = user?.profile_image;

        try {
            // 1. Update password if provided
            if (profileData.newPassword) {
                await usersAPI.updatePassword(profileData.currentPassword, profileData.newPassword);
                passwordUpdated = true;
            }
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Failed to update password');
            setSavingProfile(false);
            return;
        }

        try {
            // 2. Upload photo if provided
            if (profileImageFile) {
                const formData = new FormData();
                formData.append('file', profileImageFile);
                const res = await usersAPI.uploadPhoto(formData);
                newProfileImage = res.data.profile_image;
                photoUpdated = true;
            }
        } catch (err) {
            showNotification(err.response?.data?.detail || 'Failed to upload profile photo');
            if (passwordUpdated) {
                setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
                showNotification('Password updated, but photo upload failed!');
            }
            setSavingProfile(false);
            return;
        }

        try {
            // 3. Update local storage and state
            const updatedUser = { ...user, profile_image: newProfileImage };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            window.dispatchEvent(new Event('userProfileUpdated'));

            // Clear password fields on success
            setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
            setProfileImageFile(null);

            if (passwordUpdated && photoUpdated) {
                showNotification('Password and profile photo updated successfully!');
            } else if (passwordUpdated) {
                showNotification('Password updated successfully!');
            } else if (photoUpdated) {
                showNotification('Profile photo updated successfully!');
            } else {
                showNotification('Profile saved successfully!');
            }
            
            setShowProfileModal(false);
        } catch (err) {
            showNotification('Error saving profile changes locally');
        } finally {
            setSavingProfile(false);
        }
    };

    // Filter and sort certificates
    const filteredCertificates = certificates
        .filter(cert => {
            const matchesSearch =
                cert.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cert.institution.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.issueDate) - new Date(a.issueDate);
                case 'date-asc':
                    return new Date(a.issueDate) - new Date(b.issueDate);
                case 'name-asc':
                    return a.courseName.localeCompare(b.courseName);
                case 'name-desc':
                    return b.courseName.localeCompare(a.courseName);
                default:
                    return 0;
            }
        });

    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <div className="mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h2 className="text-2xl text-white/80 mb-2">
                                Hello, <span className="gradient-text font-semibold">{user?.name || 'Student'}!</span> 👋
                            </h2>
                        </motion.div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">
                                    My <span className="gradient-text">Certificates</span>
                                </h1>
                                <p className="text-white/60">View and manage your earned certificates</p>
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <Button
                                    variant="primary"
                                    className="flex-1 sm:flex-none justify-center whitespace-nowrap text-sm"
                                    onClick={() => setShowClaimModal(true)}
                                >
                                    🎓 Request Degree
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="flex-1 sm:flex-none justify-center whitespace-nowrap text-sm"
                                    onClick={() => {
                                        setProfileData({
                                            name: user?.name || '',
                                            email: user?.email || '',
                                            currentPassword: '',
                                            newPassword: '',
                                            confirmPassword: '',
                                        });
                                        setShowProfileModal(true);
                                    }}
                                >
                                    👤 My Profile
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <Card>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">🎓</span>
                                </div>
                                <div>
                                    <p className="text-white/60 text-sm">Total Certificates</p>
                                    <p className="text-2xl font-bold">{certificates.length}</p>
                                </div>
                            </div>
                        </Card>
                        <Card>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">✓</span>
                                </div>
                                <div>
                                    <p className="text-white/60 text-sm">Verified</p>
                                    <p className="text-2xl font-bold">{certificates.filter(c => c.status === 'Issued').length}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="🔍 Search by course name or institution..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input-field w-full"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field w-full md:w-40"
                        >
                            <option value="all">All Status</option>
                            <option value="Issued">Issued</option>
                            <option value="Pending">Pending</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="input-field w-full md:w-48"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                        </select>
                    </div>

                    {/* Certificates Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCertificates.map((cert, index) => (
                            <motion.div
                                key={cert.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card className="h-full flex flex-col">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="text-3xl">📜</div>
                                            <div className={`rounded-full px-3 py-1 text-xs font-semibold border ${cert.status === 'Issued'
                                                ? 'bg-green-500/20 text-green-400 border-green-500'
                                                : cert.status === 'Pending'
                                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                                                    : 'bg-red-500/20 text-red-400 border-red-500'
                                                }`}>
                                                {cert.status}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{cert.courseName}</h3>
                                        <p className="text-white/60 mb-4">{cert.institution}</p>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex justify-between">
                                                <span className="text-white/60 text-sm">Grade:</span>
                                                <span className="font-semibold">{cert.grade}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-white/60 text-sm">Issued:</span>
                                                <span className="font-semibold">{cert.issueDate}</span>
                                            </div>
                                            {cert.status !== 'Pending' ? (
                                                <>
                                                    <div>
                                                        <span className="text-white/60 text-sm">Certificate Hash:</span>
                                                        <p className="font-mono text-xs text-blue-400 break-all">{cert.hash ? `${cert.hash.slice(0, 20)}...${cert.hash.slice(-10)}` : 'N/A'}</p>
                                                    </div>
                                                    <div className="pt-2 border-t border-white/10">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-white/60 text-sm">Transaction Hash:</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${cert.txStatus === 'Confirmed'
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-yellow-500/20 text-yellow-400'
                                                                }`}>
                                                                {cert.txStatus}
                                                            </span>
                                                        </div>
                                                        <p className="font-mono text-xs text-cyan-400 break-all mb-2">
                                                            {cert.txHash ? `${cert.txHash.slice(0, 15)}...${cert.txHash.slice(-10)}` : 'N/A'}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(cert.txHash);
                                                                    showNotification('Transaction hash copied!');
                                                                }}
                                                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                            >
                                                                📋 Copy
                                                            </button>
                                                            <a
                                                                href={`https://sepolia.etherscan.io/tx/${cert.txHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                                            >
                                                                🔗 Explorer
                                                            </a>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="pt-4 border-t border-white/10">
                                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-400/90 leading-relaxed">
                                                        ⏳ Your claim request is pending review by the university administration. Once approved, the degree will be officially recorded on the blockchain.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
 
                                    {/* QR Code */}
                                    {cert.status !== 'Pending' ? (
                                        <div className="mb-6 flex justify-center">
                                            <div className="bg-white p-3 rounded-lg">
                                                <QRCode
                                                    value={`https://edublock.com/verify/${cert.hash}`}
                                                    size={120}
                                                    level="H"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-6 flex justify-center items-center h-[146px] border border-dashed border-white/10 rounded-xl bg-white/5">
                                            <div className="text-center text-xs text-white/40">
                                                <span className="text-3xl block mb-1">🔒</span>
                                                QR Code Locked
                                            </div>
                                        </div>
                                    )}
 
                                    <div className="space-y-3">
                                        {cert.status !== 'Pending' ? (
                                            <>
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => {
                                                        setSelectedCert(cert);
                                                        setShowDetailsModal(true);
                                                    }}
                                                >
                                                    👁️ View Details
                                                </Button>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={async () => {
                                                            await generateCertificatePDF(cert);
                                                            showNotification('PDF downloaded successfully!');
                                                        }}
                                                    >
                                                        📥 Download PDF
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(cert.hash);
                                                            showNotification('Certificate hash copied!');
                                                        }}
                                                    >
                                                        📋 Copy Hash
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full opacity-50 cursor-not-allowed"
                                                disabled
                                            >
                                                Awaiting Issuance
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {certificates.length === 0 && (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📚</div>
                            <h3 className="text-2xl font-bold mb-2">No Certificates Yet</h3>
                            <p className="text-white/60">Your earned certificates will appear here</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* QR Code Modal */}
            {showQRModal && selectedCert && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setShowQRModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Certificate QR Code</h2>
                                <button
                                    onClick={() => setShowQRModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold mb-2">{selectedCert.courseName}</h3>
                                <p className="text-white/60 text-sm">{selectedCert.institution}</p>
                            </div>

                            <div className="bg-white p-6 rounded-xl mb-6 flex justify-center">
                                <QRCode
                                    value={`https://edublock.com/verify/${selectedCert.hash}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="bg-white/5 p-4 rounded-lg mb-6">
                                <p className="text-white/60 text-xs mb-2">Verification Link</p>
                                <p className="text-blue-400 text-sm break-all font-mono">
                                    https://edublock.com/verify/{selectedCert.hash}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://edublock.com/verify/${selectedCert.hash}`);
                                        showNotification('Verification link copied!');
                                    }}
                                >
                                    📋 Copy Verification Link
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => setShowQRModal(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}


            {/* Share Modal */}
            {showShareModal && selectedCert && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowShareModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card hover={false}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Share Certificate</h2>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold mb-2">{selectedCert.courseName}</h3>
                                <p className="text-white/60 text-sm">{selectedCert.institution}</p>
                            </div>

                            <div className="bg-white/5 p-4 rounded-lg mb-6">
                                <p className="text-white/60 text-xs mb-2">Verification Link</p>
                                <p className="text-blue-400 text-sm break-all font-mono mb-3">
                                    {`${window.location.origin}/verify?hash=${selectedCert.hash}`}
                                </p>
                                <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/verify?hash=${selectedCert.hash}`);
                                        showNotification('Verification link copied!');
                                    }}
                                >
                                    📋 Copy Link
                                </Button>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <p className="text-white/60 text-xs mb-3">Share via:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const text = `Check out my ${selectedCert.courseName} certificate!`;
                                            const url = `${window.location.origin}/verify?hash=${selectedCert.hash}`;
                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                                        }}
                                    >
                                        🐦 Twitter
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const url = `${window.location.origin}/verify?hash=${selectedCert.hash}`;
                                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                                        }}
                                    >
                                        💼 LinkedIn
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const subject = `My ${selectedCert.courseName} Certificate`;
                                            const body = `I've earned a certificate in ${selectedCert.courseName}! Verify it here: ${window.location.origin}/verify?hash=${selectedCert.hash}`;
                                            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                        }}
                                    >
                                        ✉️ Email
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const text = `Check out my ${selectedCert.courseName} certificate: ${window.location.origin}/verify?hash=${selectedCert.hash}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                        }}
                                    >
                                        💬 WhatsApp
                                    </Button>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                className="w-full mt-4"
                                onClick={() => setShowShareModal(false)}
                            >
                                Close
                            </Button>
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Certificate Details Modal */}
            {showDetailsModal && selectedCert && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowDetailsModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl w-full my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card hover={false}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">{selectedCert.courseName}</h2>
                                    <p className="text-white/60">{selectedCert.institution}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Certificate Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60">Student Name</span>
                                        <span className="font-semibold">{selectedCert.studentName}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60">Grade</span>
                                        <span className="font-semibold text-amber-400">{selectedCert.grade}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60">Issue Date</span>
                                        <span className="font-semibold">{selectedCert.issueDate}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60">Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedCert.status === 'Issued'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {selectedCert.status}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60 text-sm">Certificate Hash</span>
                                        <p className="font-mono text-xs text-blue-400 break-all mt-1">{selectedCert.hash}</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-lg">
                                        <span className="text-white/60 text-sm">Transaction Hash</span>
                                        <p className="font-mono text-xs text-blue-400 break-all mt-1">{selectedCert.txHash}</p>
                                    </div>
                                </div>

                                {/* QR Code */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-white p-4 rounded-xl mb-4">
                                        <QRCode
                                            value={`${window.location.origin}/verify?hash=${selectedCert.hash}`}
                                            size={180}
                                            level="H"
                                        />
                                    </div>
                                    <p className="text-white/50 text-sm text-center">Scan to verify certificate</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setShowShareModal(true);
                                    }}
                                >
                                    🔗 Share Certificate
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => openTransactionInExplorer(selectedCert.txHash)}
                                >
                                    ⛓️ View on Blockchain
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
                    className="fixed top-24 right-4 z-[100]"
                >
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 flex items-center gap-3 backdrop-blur-md">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400 font-medium">{notification.message}</span>
                    </div>
                </motion.div>
            )}

            {/* Profile Modal */}
            {showProfileModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowProfileModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card className="p-4 sm:p-6" hover={false}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">👤 My Profile</h2>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="text-white/60 hover:text-white p-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Profile Picture Section - Compact */}
                            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10">
                                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                                    {(profileImageFile || user?.profile_image) ? (
                                        <img 
                                            src={profileImageFile ? URL.createObjectURL(profileImageFile) : `http://127.0.0.1:8000${user.profile_image}`} 
                                            alt="Profile" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        profileData.name ? profileData.name.charAt(0).toUpperCase() : '👤'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{profileData.name || 'Student'}</p>
                                    <label className="cursor-pointer inline-block mt-1">
                                        <span className="text-xs px-2 py-1 border border-white/20 rounded hover:bg-white/10 transition-colors">
                                            📷 {user?.profile_image || profileImageFile ? 'Change Photo' : 'Upload Image'}
                                        </span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setProfileImageFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Profile Form - Compact */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-white/60 text-xs mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={profileData.name}
                                        disabled
                                        className="input-field w-full py-2 text-sm opacity-50 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/60 text-xs mb-1">Email / Registration No</label>
                                    <input
                                        type="text"
                                        value={profileData.email}
                                        disabled
                                        className="input-field w-full py-2 text-sm opacity-50 cursor-not-allowed"
                                    />
                                </div>

                                <div className="border-t border-white/10 pt-3">
                                    <h3 className="font-semibold text-sm mb-2">🔐 Change Password</h3>
                                    <div className="space-y-2">
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            value={profileData.currentPassword}
                                            onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                                            className="input-field w-full py-2 text-sm"
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            value={profileData.newPassword}
                                            onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                            className="input-field w-full py-2 text-sm"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm New Password"
                                            value={profileData.confirmPassword}
                                            onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                                            className="input-field w-full py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    size="sm"
                                    loading={savingProfile}
                                    disabled={savingProfile}
                                    onClick={handleUpdateProfile}
                                >
                                    💾 Save
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowProfileModal(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}

            {/* Request Degree Modal */}
            {showClaimModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setShowClaimModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card className="p-4 sm:p-6" hover={false}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">🎓 Request New Degree</h2>
                                <button
                                    onClick={() => setShowClaimModal(false)}
                                    className="text-white/60 hover:text-white p-1"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/60 text-xs mb-2">Select Your University</label>
                                    <select
                                        value={claimData.universityId}
                                        onChange={(e) => setClaimData({ ...claimData, universityId: e.target.value })}
                                        className="input-field w-full text-sm"
                                    >
                                        <option value="">-- Choose University --</option>
                                        {universities.map((uni) => (
                                            <option key={uni.id} value={uni.id}>
                                                {uni.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-white/60 text-xs mb-2">Degree Program Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. BS Software Engineering, BS Computer Science"
                                        value={claimData.degreeName}
                                        onChange={(e) => setClaimData({ ...claimData, degreeName: e.target.value })}
                                        className="input-field w-full text-sm"
                                    />
                                    <p className="text-white/40 text-[10px] mt-1">
                                        Note: Ensure spelling matches exactly with your official degree details.
                                    </p>
                                </div>

                                <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-xs text-white/60 leading-relaxed">
                                    💡 <strong>Your Info:</strong> Name and Registration Number will be fetched directly from your profile: <br />
                                    Name: <strong className="text-white">{user?.name}</strong> <br />
                                    Reg No: <strong className="text-white">{user?.registration_no || '(Update profile first!)'}</strong>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="primary"
                                    className="flex-1"
                                    size="sm"
                                    loading={submittingClaim}
                                    disabled={submittingClaim}
                                    onClick={handleSubmitClaim}
                                >
                                    Submit Request
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowClaimModal(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}
        </div >
    );
};

export default StudentDashboard;
