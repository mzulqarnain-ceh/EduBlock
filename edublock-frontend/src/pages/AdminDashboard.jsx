import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { openTransactionInExplorer, shortenHash } from '../utils/blockchain';
import { degreesAPI, analyticsAPI } from '../services/api';

// Custom Bar Chart Component
const BarChart = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-medium text-white/60 mb-4">{title}</h4>
            {data.map((item, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-1"
                >
                    <div className="flex justify-between text-sm">
                        <span className="text-white/70">{item.label}</span>
                        <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / maxValue) * 100}%` }}
                            transition={{ duration: 1, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${item.color}, ${item.colorEnd || item.color})` }}
                        />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// Custom Donut Chart Component
const DonutChart = ({ data, title, centerValue, centerLabel }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-sm font-medium text-white/60 mb-4">{title}</h4>
            <div className="relative w-48 h-48">
                <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full transform -rotate-90">
                    {data.map((item, index) => {
                        const percent = item.value / total;
                        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                        cumulativePercent += percent;
                        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                        const largeArcFlag = percent > 0.5 ? 1 : 0;

                        const pathData = [
                            `M ${startX * 0.6} ${startY * 0.6}`,
                            `L ${startX} ${startY}`,
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            `L ${endX * 0.6} ${endY * 0.6}`,
                            `A 0.6 0.6 0 ${largeArcFlag} 0 ${startX * 0.6} ${startY * 0.6}`,
                        ].join(' ');

                        return (
                            <motion.path
                                key={index}
                                d={pathData}
                                fill={item.color}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.2, duration: 0.5 }}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold gradient-text">{centerValue}</span>
                    <span className="text-xs text-white/50">{centerLabel}</span>
                </div>
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                {data.map((item, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-white/60">{item.label}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Stats Card with animated number
const StatsCard = ({ icon, label, value, color, delay = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all duration-300 group"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${color}`}>
                    {icon}
                </div>
                <p className="text-white/50 text-sm">{label}</p>
            </div>
            <motion.p
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.2, type: "spring" }}
                className="text-3xl font-bold gradient-text"
            >
                {value}
            </motion.p>
        </motion.div>
    );
};

const AdminDashboard = () => {
    const [formData, setFormData] = useState({
        studentName: '',
        studentId: '',
        registrationNumber: '',
        degreeName: '',
        universityName: '',
        grade: '',
        issueDate: '',
        certificateHash: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'certificates', 'pending', 'audit', 'bulk'
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedCert, setSelectedCert] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');

    // Bulk Upload State
    const [csvData, setCsvData] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);

    // Certificates from backend
    const [issuedCertificates, setIssuedCertificates] = useState([]);

    // Dashboard stats from backend
    const [stats, setStats] = useState({ total_issued: 0, total_pending: 0, total_revoked: 0, total: 0 });

    // Audit Log Data
    const [auditLog, setAuditLog] = useState([]);

    // Pending Transactions Data
    const [pendingTransactions, setPendingTransactions] = useState([]);

    // Fetch certificates and stats from backend on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [certsRes, statsRes] = await Promise.all([
                    degreesAPI.list(),
                    analyticsAPI.getDashboard(),
                ]);

                // Map backend data to frontend format
                const certs = certsRes.data.map(cert => ({
                    id: cert.id,
                    studentName: cert.student_name,
                    studentId: cert.student_id,
                    degreeName: cert.degree_name,
                    issueDate: cert.issue_date,
                    status: cert.status === 'issued' ? 'Issued' : cert.status === 'revoked' ? 'Revoked' : 'Pending',
                    hash: cert.blockchain_hash || '',
                    txHash: cert.tx_hash || '',
                    revokeReason: cert.revoke_reason || '',
                }));

                setIssuedCertificates(certs);
                setStats(statsRes.data);

                // Set pending from certs
                const pending = certs.filter(c => c.status === 'Pending');
                setPendingTransactions(pending.map(c => ({
                    id: c.id,
                    studentName: c.studentName,
                    degreeName: c.degreeName,
                    txHash: c.txHash,
                    status: 'Pending',
                    submittedAt: c.issueDate,
                })));

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            }
        };
        fetchData();
    }, []);


    const showNotification = (type, message) => {
        setNotification({ show: true, type, message });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    };

    // Filter certificates based on search and status
    const filteredCertificates = issuedCertificates.filter(cert => {
        const matchesSearch =
            cert.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.degreeName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleRevoke = async () => {
        if (!selectedCert || !revokeReason.trim()) return;

        try {
            await degreesAPI.revoke(selectedCert.id, revokeReason);

            setIssuedCertificates(prev => prev.map(cert =>
                cert.id === selectedCert.id
                    ? { ...cert, status: 'Revoked', revokeReason: revokeReason }
                    : cert
            ));

            showNotification('success', `Certificate for ${selectedCert.studentName} has been revoked.`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to revoke certificate.');
        }
        setShowRevokeModal(false);
        setSelectedCert(null);
        setRevokeReason('');
    };

    // Handle status change
    const handleStatusChange = (certId, newStatus) => {
        setIssuedCertificates(prev => prev.map(cert =>
            cert.id === certId
                ? { ...cert, status: newStatus }
                : cert
        ));
        showNotification('success', `Certificate status changed to ${newStatus}.`);
    };

    // Chart data
    const monthlyData = [
        { label: 'January', value: 45, color: '#fbbf24', colorEnd: '#f59e0b' },
        { label: 'February', value: 38, color: '#10b981', colorEnd: '#059669' },
        { label: 'March', value: 52, color: '#fbbf24', colorEnd: '#10b981' },
        { label: 'April', value: 23, color: '#f59e0b', colorEnd: '#fbbf24' },
        { label: 'May', value: 67, color: '#10b981', colorEnd: '#34d399' },
        { label: 'June', value: 41, color: '#fbbf24', colorEnd: '#f59e0b' },
    ];

    const degreeDistribution = [
        { label: 'Computer Science', value: 45, color: '#fbbf24' },
        { label: 'Engineering', value: 30, color: '#10b981' },
        { label: 'Business', value: 25, color: '#f59e0b' },
        { label: 'Arts', value: 15, color: '#34d399' },
    ];

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Call backend API to issue certificate
            const response = await degreesAPI.issue({
                student_name: formData.studentName,
                student_id: formData.studentId,
                registration_no: formData.registrationNumber,
                degree_name: formData.degreeName,
                grade: formData.grade,
                issue_date: formData.issueDate,
            });

            const cert = response.data;
            setSuccess(true);

            // Add to local state
            const newCert = {
                id: cert.id,
                studentName: cert.student_name,
                studentId: cert.student_id,
                degreeName: cert.degree_name,
                issueDate: cert.issue_date,
                status: 'Issued',
                hash: cert.blockchain_hash || '',
                txHash: cert.tx_hash || '',
            };
            setIssuedCertificates(prev => [newCert, ...prev]);

            setFormData({
                studentName: '',
                studentId: '',
                registrationNumber: '',
                degreeName: '',
                universityName: '',
                grade: '',
                issueDate: '',
                certificateHash: cert.blockchain_hash || '',
            });

            showNotification('success', 'Certificate issued successfully!');
            setTimeout(() => setSuccess(false), 5000);
        } catch (error) {
            console.error('Error issuing certificate:', error);
            const msg = error.response?.data?.detail || 'Failed to issue certificate.';
            showNotification('error', msg);
        } finally {
            setLoading(false);
        }
    };

    // CSV Parsing
    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx];
                });
                rows.push(row);
            }
        }
        return rows;
    };

    const handleCSVUpload = (file) => {
        if (!file || !file.name.endsWith('.csv')) {
            showNotification('error', 'Please upload a valid .csv file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
                showNotification('error', 'CSV file is empty or invalid format');
                return;
            }
            setCsvData(parsed);
            setCsvFileName(file.name);
            showNotification('success', `${parsed.length} records loaded from CSV`);
        };
        reader.readAsText(file);
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleCSVUpload(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        handleCSVUpload(file);
    };

    const handleBulkMint = async () => {
        setBulkUploading(true);
        setBulkProgress(10);

        try {
            // Map CSV data to backend format
            const degrees = csvData.map(row => ({
                student_name: row['Student Name'] || row['studentName'] || 'Unknown',
                student_id: row['Student ID'] || row['studentId'] || 'BULK-' + Date.now(),
                degree_name: row['Degree Name'] || row['degreeName'] || 'Unknown',
                grade: row['Grade'] || row['grade'] || '',
                issue_date: row['Issue Date'] || row['issueDate'] || new Date().toISOString().split('T')[0],
            }));

            setBulkProgress(50);

            // Send to backend
            const response = await degreesAPI.bulkIssue(degrees);

            setBulkProgress(90);

            // Refresh certificates list
            const certsRes = await degreesAPI.list();
            const certs = certsRes.data.map(cert => ({
                id: cert.id,
                studentName: cert.student_name,
                studentId: cert.student_id,
                degreeName: cert.degree_name,
                issueDate: cert.issue_date,
                status: cert.status === 'issued' ? 'Issued' : cert.status === 'revoked' ? 'Revoked' : 'Pending',
                hash: cert.blockchain_hash || '',
                txHash: cert.tx_hash || '',
            }));
            setIssuedCertificates(certs);

            setBulkProgress(100);
            showNotification('success', response.data.message || `${csvData.length} certificates minted successfully!`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Bulk minting failed.');
        }

        setCsvData([]);
        setCsvFileName('');
        setBulkUploading(false);
        setBulkProgress(0);
    };

    const downloadSampleCSV = () => {
        const csvContent = `Student Name,Student ID,Degree Name,Issue Date\nJohn Doe,STU-2024-001,BS Computer Science,2025-01-15\nJane Smith,STU-2024-002,BS Data Science,2025-01-14\nMike Johnson,STU-2024-003,BS Electrical Engineering,2025-01-13`;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_certificates.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                                Admin <span className="gradient-text">Dashboard</span>
                            </h1>
                            <p className="text-white/50">Issue and manage certificates</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('issue')}
                            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'issue'
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            📝 Issue
                        </button>
                        <button
                            onClick={() => setActiveTab('certificates')}
                            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'certificates'
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            📋 Certificates ({issuedCertificates.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'pending'
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            ⏳ Pending ({pendingTransactions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'audit'
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            📊 Audit Log
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            className={`px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'bulk'
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-black'
                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                }`}
                        >
                            📤 Bulk Upload
                        </button>
                    </div>

                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatsCard icon="📜" label="Total Issued" value={issuedCertificates.length.toString()} color="bg-amber-500/20" delay={0} />
                        <StatsCard icon="📅" label="This Month" value={issuedCertificates.filter(c => c.status === 'Issued').length.toString()} color="bg-emerald-500/20" delay={0.1} />
                        <StatsCard icon="⏳" label="Pending" value={issuedCertificates.filter(c => c.status === 'Pending').length.toString()} color="bg-orange-500/20" delay={0.2} />
                        <StatsCard icon="❌" label="Revoked" value={issuedCertificates.filter(c => c.status === 'Revoked').length.toString()} color="bg-red-500/20" delay={0.3} />
                    </div>

                    {/* Success Message */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-emerald-400 font-semibold">Certificate issued successfully on blockchain!</span>
                        </motion.div>
                    )}

                    {/* Issue Certificate Tab Content */}
                    {activeTab === 'issue' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Issue Certificate Form */}
                            <div className="lg:col-span-2">
                                <Card className="border-white/10 hover:border-amber-500/20">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-lg flex items-center justify-center">
                                            <span className="text-xl">📝</span>
                                        </div>
                                        <h2 className="text-2xl font-bold">Issue New Certificate</h2>
                                    </div>
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="studentName" className="block text-sm font-medium mb-2 text-white/70">
                                                    Student Name
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">👤</span>
                                                    <input
                                                        id="studentName"
                                                        name="studentName"
                                                        type="text"
                                                        value={formData.studentName}
                                                        onChange={handleInputChange}
                                                        placeholder="Enter student full name"
                                                        className="input-field w-full pl-12"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="studentId" className="block text-sm font-medium mb-2 text-white/70">
                                                    Student ID
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🆔</span>
                                                    <input
                                                        id="studentId"
                                                        name="studentId"
                                                        type="text"
                                                        value={formData.studentId}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g., STU-2024-001"
                                                        className="input-field w-full pl-12"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="registrationNumber" className="block text-sm font-medium mb-2 text-white/70">
                                                Registration Number
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🔢</span>
                                                <input
                                                    id="registrationNumber"
                                                    name="registrationNumber"
                                                    type="text"
                                                    value={formData.registrationNumber}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter registration number"
                                                    className="input-field w-full pl-12"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="degreeName" className="block text-sm font-medium mb-2 text-white/70">
                                                Degree Name
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🎓</span>
                                                <input
                                                    id="degreeName"
                                                    name="degreeName"
                                                    type="text"
                                                    value={formData.degreeName}
                                                    onChange={handleInputChange}
                                                    placeholder="e.g., Bachelor of Science in Computer Science"
                                                    className="input-field w-full pl-12"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="universityName" className="block text-sm font-medium mb-2 text-white/70">
                                                University Name
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">🏛️</span>
                                                <input
                                                    id="universityName"
                                                    name="universityName"
                                                    type="text"
                                                    value={formData.universityName}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter university name"
                                                    className="input-field w-full pl-12"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="grade" className="block text-sm font-medium mb-2 text-white/70">
                                                    Grade / CGPA
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">⭐</span>
                                                    <input
                                                        id="grade"
                                                        name="grade"
                                                        type="text"
                                                        value={formData.grade}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g., A+ or 3.8"
                                                        className="input-field w-full pl-12"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="issueDate" className="block text-sm font-medium mb-2 text-white/70">
                                                    Issue Date
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">📅</span>
                                                    <input
                                                        id="issueDate"
                                                        name="issueDate"
                                                        type="date"
                                                        value={formData.issueDate}
                                                        onChange={handleInputChange}
                                                        className="input-field w-full pl-12"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="certificateHash" className="block text-sm font-medium mb-2 text-white/70">
                                                Certificate Hash / ID
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">⛓️</span>
                                                <input
                                                    id="certificateHash"
                                                    name="certificateHash"
                                                    type="text"
                                                    value={formData.certificateHash}
                                                    onChange={handleInputChange}
                                                    placeholder="Will be auto-generated on blockchain"
                                                    className="input-field w-full pl-12 bg-white/5"
                                                    readOnly
                                                />
                                            </div>
                                            <p className="text-xs text-white/40 mt-1">This hash will be generated after blockchain transaction</p>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            loading={loading}
                                            disabled={loading}
                                            className="w-full"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Issuing on Blockchain...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    Issue Certificate
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </span>
                                            )}
                                        </Button>
                                    </form>
                                </Card>
                            </div>

                            {/* Charts Sidebar */}
                            <div className="space-y-6">
                                {/* Donut Chart */}
                                <Card className="border-white/10 hover:border-amber-500/20">
                                    <DonutChart
                                        data={degreeDistribution}
                                        title="Certificates by Degree"
                                        centerValue="115"
                                        centerLabel="Total"
                                    />
                                </Card>

                                {/* Bar Chart */}
                                <Card className="border-white/10 hover:border-amber-500/20">
                                    <BarChart
                                        data={monthlyData}
                                        title="Monthly Certificates Issued"
                                    />
                                </Card>

                                {/* Recent Activity */}
                                <Card className="border-white/10 hover:border-amber-500/20">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-lg">📋</span>
                                        </div>
                                        <h3 className="text-lg font-bold">Recent Activity</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {issuedCertificates.slice(0, 3).map((cert, index) => (
                                            <motion.div
                                                key={cert.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-white">{cert.studentName}</p>
                                                        <p className="text-white/40 text-xs">{cert.degreeName}</p>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${cert.status === 'Issued' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        cert.status === 'Pending' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                        {cert.status}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Certificates Tab Content */}
                    {activeTab === 'certificates' && (
                        <Card>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h2 className="text-2xl font-bold">Issued Certificates</h2>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID, degree..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input-field w-full sm:w-64"
                                    />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="input-field w-full sm:w-40"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="Issued">Issued</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Revoked">Revoked</option>
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-4 text-white/80">Student</th>
                                            <th className="text-left py-3 px-4 text-white/80">Degree</th>
                                            <th className="text-left py-3 px-4 text-white/80">Issue Date</th>
                                            <th className="text-left py-3 px-4 text-white/80">Status</th>
                                            <th className="text-left py-3 px-4 text-white/80">Hash</th>
                                            <th className="text-center py-3 px-4 text-white/80">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCertificates.map((cert) => (
                                            <tr key={cert.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-4 px-4">
                                                    <p className="font-semibold">{cert.studentName}</p>
                                                    <p className="text-white/50 text-xs">{cert.studentId}</p>
                                                </td>
                                                <td className="py-4 px-4 text-white/70">{cert.degreeName}</td>
                                                <td className="py-4 px-4 text-white/70">{cert.issueDate}</td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cert.status === 'Issued' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        cert.status === 'Pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        }`}>
                                                        {cert.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <p className="text-blue-400 font-mono text-xs">{shortenHash(cert.hash)}</p>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex gap-2 justify-center flex-wrap">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => openTransactionInExplorer(cert.txHash)}
                                                        >
                                                            🔗 View
                                                        </Button>
                                                        {cert.status !== 'Issued' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleStatusChange(cert.id, 'Issued')}
                                                                className="border-green-500 text-green-400 hover:bg-green-500/10"
                                                            >
                                                                ✓ Issue
                                                            </Button>
                                                        )}
                                                        {cert.status !== 'Pending' && cert.status !== 'Revoked' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleStatusChange(cert.id, 'Pending')}
                                                                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                                                            >
                                                                ⏳ Pending
                                                            </Button>
                                                        )}
                                                        {cert.status !== 'Revoked' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCert(cert);
                                                                    setShowRevokeModal(true);
                                                                }}
                                                                className="border-red-500 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                🚫 Revoke
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredCertificates.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-white/50">No certificates found matching your criteria.</p>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Pending Transactions Tab */}
                    {activeTab === 'pending' && (
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">⏳ Pending Transactions</h2>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showNotification('info', 'Refreshing transactions...')}
                                >
                                    🔄 Refresh
                                </Button>
                            </div>

                            {pendingTransactions.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingTransactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.status === 'Pending' ? 'bg-orange-500/20' :
                                                    tx.status === 'Processing' ? 'bg-blue-500/20' :
                                                        'bg-emerald-500/20'
                                                    }`}>
                                                    <span className="text-xl">
                                                        {tx.status === 'Pending' ? '⏳' :
                                                            tx.status === 'Processing' ? '⚙️' : '✓'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{tx.studentName}</p>
                                                    <p className="text-white/50 text-sm">{tx.degreeName}</p>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tx.status === 'Pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                    tx.status === 'Processing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                                <p className="text-white/40 text-xs mt-1">{tx.submittedAt}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => showNotification('info', 'Checking transaction status...')}
                                                >
                                                    🔍 Check
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                                                    onClick={() => {
                                                        setPendingTransactions(prev => prev.filter(t => t.id !== tx.id));
                                                        showNotification('warning', 'Transaction cancelled');
                                                    }}
                                                >
                                                    ❌ Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <span className="text-4xl mb-4 block">✅</span>
                                    <p className="text-white/50">No pending transactions! All caught up.</p>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Audit Log Tab */}
                    {activeTab === 'audit' && (
                        <Card>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <h2 className="text-2xl font-bold">📊 Activity / Audit Log</h2>
                                <div className="flex gap-3">
                                    <select className="input-field w-40">
                                        <option value="all">All Actions</option>
                                        <option value="issued">Certificate Issued</option>
                                        <option value="revoked">Certificate Revoked</option>
                                        <option value="login">Login</option>
                                    </select>
                                    <input
                                        type="date"
                                        className="input-field w-40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                {auditLog.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-400' :
                                                log.type === 'warning' ? 'bg-orange-400' :
                                                    'bg-blue-400'
                                                }`}></span>
                                            <div>
                                                <p className="font-semibold">{log.action}</p>
                                                <p className="text-white/50 text-sm">{log.target}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/70 text-sm">{log.user}</p>
                                            <p className="text-white/40 text-xs">{log.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center mt-6">
                                <Button variant="outline" size="sm">
                                    Load More
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Bulk Upload Tab */}
                    {activeTab === 'bulk' && (
                        <div className="space-y-6">
                            <Card className="border-white/10 hover:border-amber-500/20">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-lg flex items-center justify-center">
                                            <span className="text-xl">📤</span>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">Bulk Issue Certificates</h2>
                                            <p className="text-white/50 text-sm">Upload a CSV file to issue multiple certificates at once</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={downloadSampleCSV}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-amber-400 hover:bg-white/10 hover:border-amber-500/30 transition-all text-sm font-medium"
                                    >
                                        📥 Download Sample CSV
                                    </button>
                                </div>

                                {/* Drop Zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleFileDrop}
                                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${dragOver
                                        ? 'border-amber-500 bg-amber-500/10'
                                        : csvFileName
                                            ? 'border-emerald-500/50 bg-emerald-500/5'
                                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                                        }`}
                                    onClick={() => document.getElementById('csvFileInput').click()}
                                >
                                    <input
                                        id="csvFileInput"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    {csvFileName ? (
                                        <div>
                                            <span className="text-5xl block mb-4">✅</span>
                                            <p className="text-emerald-400 font-semibold text-lg">{csvFileName}</p>
                                            <p className="text-white/50 mt-2">{csvData.length} records loaded</p>
                                            <p className="text-white/30 text-sm mt-2">Click or drop to replace</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-5xl block mb-4">📁</span>
                                            <p className="text-white/70 font-semibold text-lg">Drag & Drop your CSV file here</p>
                                            <p className="text-white/40 mt-2">or click to browse files</p>
                                            <p className="text-white/30 text-sm mt-4">Supported format: .csv</p>
                                        </div>
                                    )}
                                </div>

                                {/* CSV Format Info */}
                                <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                    <p className="text-amber-400 text-sm font-medium mb-2">📋 Required CSV Format:</p>
                                    <code className="text-white/60 text-xs block bg-black/30 p-3 rounded-lg font-mono">
                                        Student Name, Student ID, Degree Name, Issue Date
                                    </code>
                                </div>
                            </Card>

                            {/* Preview Table */}
                            {csvData.length > 0 && (
                                <Card className="border-white/10 hover:border-amber-500/20">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                        <h3 className="text-xl font-bold">📋 Preview ({csvData.length} records)</h3>
                                        <div className="flex gap-3">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => { setCsvData([]); setCsvFileName(''); }}
                                            >
                                                ❌ Clear
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleBulkMint}
                                                disabled={bulkUploading}
                                            >
                                                {bulkUploading ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Minting... {bulkProgress}%
                                                    </span>
                                                ) : (
                                                    `⛓️ Mint All (${csvData.length})`
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {bulkUploading && (
                                        <div className="mb-6">
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${bulkProgress}%` }}
                                                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full"
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                            <p className="text-white/50 text-sm mt-2 text-center">
                                                Processing {Math.round((bulkProgress / 100) * csvData.length)} of {csvData.length} certificates
                                            </p>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left py-3 px-4 text-white/60 text-sm">#</th>
                                                    {Object.keys(csvData[0]).map((header) => (
                                                        <th key={header} className="text-left py-3 px-4 text-white/60 text-sm">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvData.slice(0, 20).map((row, index) => (
                                                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-3 px-4 text-white/40 text-sm">{index + 1}</td>
                                                        {Object.values(row).map((value, vIndex) => (
                                                            <td key={vIndex} className="py-3 px-4 text-white/80 text-sm">
                                                                {value}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {csvData.length > 20 && (
                                        <p className="text-center text-white/40 text-sm mt-4">
                                            Showing first 20 of {csvData.length} records
                                        </p>
                                    )}
                                </Card>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Revoke Certificate Modal */}
            {showRevokeModal && selectedCert && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-red-400">Revoke Certificate</h2>
                                <button
                                    onClick={() => {
                                        setShowRevokeModal(false);
                                        setSelectedCert(null);
                                        setRevokeReason('');
                                    }}
                                    className="text-white/60 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-red-400">⚠️ Warning: This action cannot be undone.</p>
                            </div>

                            <div className="mb-4">
                                <p className="text-white/60 text-sm mb-1">Certificate for:</p>
                                <p className="font-semibold">{selectedCert.studentName}</p>
                                <p className="text-white/50 text-sm">{selectedCert.degreeName}</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2 text-white/80">
                                    Reason for Revocation *
                                </label>
                                <textarea
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    placeholder="Enter reason for revoking this certificate..."
                                    className="input-field w-full h-24 resize-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowRevokeModal(false);
                                        setSelectedCert(null);
                                        setRevokeReason('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 bg-red-500 hover:bg-red-600"
                                    onClick={handleRevoke}
                                    disabled={!revokeReason.trim()}
                                >
                                    Revoke Certificate
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
        </div>
    );
};

export default AdminDashboard;
