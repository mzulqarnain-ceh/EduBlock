import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { openTransactionInExplorer, shortenHash } from '../utils/blockchain';
import { degreesAPI, analyticsAPI, auditAPI } from '../services/api';

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

// Validation Helper Functions
const scanInjections = (val) => {
    if (!val) return null;
    const lower = String(val).toLowerCase();
    const sqlKeywords = ['select ', 'union ', 'insert ', 'update ', 'delete ', 'drop ', 'alter ', '--', '/*', 'xp_cmdshell'];
    for (const kw of sqlKeywords) {
        if (lower.includes(kw)) {
            return "Potentially unsafe database keywords detected.";
        }
    }
    const xssPatterns = ['<script', 'javascript:', 'onload', 'onerror'];
    for (const pattern of xssPatterns) {
        if (lower.includes(pattern)) {
            return "Potentially unsafe HTML or script tags detected.";
        }
    }
    return null;
};

const validateStudentName = (val) => {
    const trimmed = val ? String(val).trim() : '';
    if (!trimmed) return "Student name is required.";
    if (trimmed.length < 2 || trimmed.length > 100) return "Student name must be between 2 and 100 characters.";
    
    // Scan for SQL/XSS injections
    const injectionErr = scanInjections(trimmed);
    if (injectionErr) return injectionErr;

    // Only allow letters, spaces, dots, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    if (!nameRegex.test(trimmed)) {
        return "Student name must only contain letters, spaces, or dots.";
    }
    return null;
};

const validateRegistrationNumber = (val) => {
    const trimmed = val ? String(val).trim() : '';
    if (!trimmed) return "Registration number is required.";
    if (trimmed.length < 3 || trimmed.length > 50) return "Registration number must be between 3 and 50 characters.";
    
    // Scan for SQL/XSS injections
    const injectionErr = scanInjections(trimmed);
    if (injectionErr) return injectionErr;

    // Allow alphanumeric, spaces, hyphens, slashes
    const regRegex = /^[a-zA-Z0-9\s/-]+$/;
    if (!regRegex.test(trimmed)) {
        return "Registration number must contain only letters, numbers, hyphens, or slashes.";
    }
    return null;
};

const validateDegreeName = (val) => {
    const trimmed = val ? String(val).trim() : '';
    if (!trimmed) return "Degree name is required.";
    if (trimmed.length < 3 || trimmed.length > 100) return "Degree name must be between 3 and 100 characters.";
    
    // Scan for SQL/XSS injections
    const injectionErr = scanInjections(trimmed);
    if (injectionErr) return injectionErr;

    // Allow letters, numbers, spaces, dots, hyphens, parentheses, slashes, or ampersands
    const degreeRegex = /^[a-zA-Z0-9\s.()'/&-]+$/;
    if (!degreeRegex.test(trimmed)) {
        return "Degree name must contain only letters, numbers, spaces, or standard symbols.";
    }
    return null;
};

const validateGradeOrCGPA = (val) => {
    const trimmed = val ? String(val).trim() : '';
    if (!trimmed) return "Grade or CGPA is required.";

    // Scan for SQL/XSS injections
    const injectionErr = scanInjections(trimmed);
    if (injectionErr) return injectionErr;

    // Check if it is a number (CGPA)
    // Accept standard integers or decimals like 3, 3., 3.8, 3.15, 4, 4.00, etc.
    const isNumeric = /^\d+(\.\d*)?$/.test(trimmed);
    if (isNumeric) {
        const num = parseFloat(trimmed);
        if (isNaN(num)) {
            return "Invalid CGPA format.";
        }
        if (num < 0 || num > 4.0) {
            return "CGPA must be between 0.0 and 4.0.";
        }
        // Check decimal places
        if (trimmed.includes('.')) {
            const decimalPart = trimmed.split('.')[1];
            if (decimalPart && decimalPart.length > 2) {
                return "CGPA allows at most 2 decimal places (e.g., 3.1 or 3.15).";
            }
        }
        return null; // Valid CGPA
    }

    // Check if it is a valid letter grade
    const validGrades = ['A', 'A+', 'B', 'B+', 'C', 'D', 'F'];
    const upperGrade = trimmed.toUpperCase();
    if (!validGrades.includes(upperGrade)) {
        return "Grade must be one of: A, A+, B, B+, C, D, F.";
    }

    return null; // Valid Grade
};

const validateIssueDate = (val) => {
    if (!val) return "Issue date is required.";
    const selectedDate = new Date(val);
    if (isNaN(selectedDate.getTime())) {
        return "Invalid date format.";
    }
    const today = new Date();
    
    // Normalize to midnight to avoid hour differences blocking today's dates
    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        return "Issue date cannot be in the future.";
    }
    return null;
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AdminDashboard = () => {
    // Get logged-in user's university name
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const adminUniversityName = storedUser.university_name || '';

    const [formData, setFormData] = useState({
        studentName: '',
        studentId: '',
        registrationNumber: '',
        degreeName: '',
        universityName: adminUniversityName,
        grade: '',
        issueDate: '',
        certificateHash: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [searchParams] = useSearchParams();
    const validTabs = ['issue', 'certificates', 'pending', 'audit', 'bulk'];
    const initialTab = validTabs.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'issue';
    const [activeTab, setActiveTab] = useState(initialTab); // 'issue', 'certificates', 'pending', 'audit', 'bulk'
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [notification, setNotification] = useState({ show: false, type: '', message: '' });
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedCert, setSelectedCert] = useState(null);
    const [revokeReason, setRevokeReason] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [certToDelete, setCertToDelete] = useState(null);

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
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);
    const [auditFilter, setAuditFilter] = useState('all');

    // Certificates Tab Pagination State
    const [certsPage, setCertsPage] = useState(1);

    // Bulk Upload Preview Pagination State
    const [bulkPage, setBulkPage] = useState(1);

    // Pending Transactions Data
    const [pendingTransactions, setPendingTransactions] = useState([]);

    // Fetch certificates and stats from backend on mount
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
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
                    status: cert.status?.toLowerCase() === 'issued' ? 'Issued' : cert.status?.toLowerCase() === 'revoked' ? 'Revoked' : 'Pending',
                    hash: cert.blockchain_hash || '',
                    txHash: cert.tx_hash || '',
                    revokeReason: cert.revoke_reason || '',
                }));

                setIssuedCertificates(certs);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                showNotification('error', 'Failed to load dashboard data. Please refresh.');
            } finally {
                setDataLoading(false);
            }
        };
        fetchData();
    }, []);

    // Fetch audit logs
    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const filterValue = auditFilter === 'all' ? '' : auditFilter;
                const res = await auditAPI.getLogs(auditPage, 20, filterValue);
                setAuditLog(res.data.logs || []);
                setAuditTotal(res.data.total || 0);
            } catch (err) {
                console.error('Error fetching audit logs:', err);
            }
        };
        if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab, auditPage, auditFilter]);


    const showNotification = (type, message) => {
        setNotification({ show: true, type, message });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    };

    // Smooth scroll to top of viewport when page or tab changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [certsPage, auditPage, bulkPage, activeTab]);

    // Filter certificates based on search and status
    const filteredCertificates = issuedCertificates.filter(cert => {
        const matchesSearch =
            cert.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cert.degreeName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const CERTS_PER_PAGE = 20;
    const totalCertsPages = Math.ceil(filteredCertificates.length / CERTS_PER_PAGE) || 1;
    const paginatedCertificates = useMemo(() => {
        const startIndex = (certsPage - 1) * CERTS_PER_PAGE;
        return filteredCertificates.slice(startIndex, startIndex + CERTS_PER_PAGE);
    }, [filteredCertificates, certsPage]);

    // Reset certsPage if filter changes make current page invalid
    useEffect(() => {
        if (certsPage > totalCertsPages) {
            setCertsPage(1);
        }
    }, [filteredCertificates.length, totalCertsPages, certsPage]);

    const BULK_PER_PAGE = 20;
    const totalBulkPages = Math.ceil(csvData.length / BULK_PER_PAGE) || 1;
    const paginatedCsvData = useMemo(() => {
        const startIndex = (bulkPage - 1) * BULK_PER_PAGE;
        return csvData.slice(startIndex, startIndex + BULK_PER_PAGE);
    }, [csvData, bulkPage]);

    // Reset bulkPage when new CSV is uploaded or cleared
    useEffect(() => {
        setBulkPage(1);
    }, [csvData]);

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

    // Handle status change (persists to backend + audit log)
    const handleStatusChange = async (certId, newStatus) => {
        try {
            const statusMap = { 'Issued': 'issued', 'Pending': 'pending', 'Revoked': 'revoked' };
            const backendStatus = statusMap[newStatus] || newStatus.toLowerCase();
            await degreesAPI.updateStatus(certId, backendStatus);
            setIssuedCertificates(prev => prev.map(cert =>
                cert.id === certId
                    ? { ...cert, status: newStatus, revokeReason: newStatus !== 'Revoked' ? '' : cert.revokeReason }
                    : cert
            ));
            showNotification('success', `Certificate status changed to ${newStatus}.`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to change status.');
        }
    };

    // Handle certificate deletion button click
    const handleDelete = (cert) => {
        setCertToDelete(cert);
        setShowDeleteModal(true);
    };

    // Confirm deletion
    const confirmDelete = async () => {
        if (!certToDelete) return;
        
        try {
            await degreesAPI.delete(certToDelete.id);
            setIssuedCertificates(prev => prev.filter(c => c.id !== certToDelete.id));
            showNotification('success', `Certificate for ${certToDelete.studentName} has been deleted.`);
        } catch (err) {
            showNotification('error', err.response?.data?.detail || 'Failed to delete certificate.');
        }
        setShowDeleteModal(false);
        setCertToDelete(null);
    };

    // Chart data dynamically calculated
    const monthlyData = useMemo(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const colors = ['#fbbf24', '#10b981', '#f59e0b', '#34d399', '#3b82f6', '#8b5cf6'];
        
        const counts = Array(12).fill(0);
        issuedCertificates.forEach(cert => {
            if (cert.issueDate) {
                const month = new Date(cert.issueDate).getMonth();
                if (!isNaN(month)) counts[month]++;
            }
        });

        // Get last 6 months
        const currentMonth = new Date().getMonth();
        const result = [];
        for (let i = 5; i >= 0; i--) {
            const m = (currentMonth - i + 12) % 12;
            result.push({
                label: monthNames[m],
                value: counts[m],
                color: colors[i % colors.length],
                colorEnd: colors[(i + 1) % colors.length],
            });
        }
        return result;
    }, [issuedCertificates]);

    const degreeDistribution = useMemo(() => {
        const colors = ['#fbbf24', '#10b981', '#f59e0b', '#34d399', '#3b82f6', '#8b5cf6'];
        const counts = {};
        issuedCertificates.forEach(cert => {
            const name = cert.degreeName || 'Unknown';
            counts[name] = (counts[name] || 0) + 1;
        });
        
        return Object.entries(counts)
            .map(([label, value], index) => ({
                label,
                value,
                color: colors[index % colors.length],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // top 5
    }, [issuedCertificates]);

    const validateForm = () => {
        const newErrors = {};

        const studentNameErr = validateStudentName(formData.studentName);
        if (studentNameErr) newErrors.studentName = studentNameErr;

        const regErr = validateRegistrationNumber(formData.registrationNumber);
        if (regErr) newErrors.registrationNumber = regErr;

        const degErr = validateDegreeName(formData.degreeName);
        if (degErr) newErrors.degreeName = degErr;

        const gradeErr = validateGradeOrCGPA(formData.grade);
        if (gradeErr) newErrors.grade = gradeErr;

        const dateErr = validateIssueDate(formData.issueDate);
        if (dateErr) newErrors.issueDate = dateErr;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        let errorMsg = null;
        if (name === 'studentName') errorMsg = validateStudentName(value);
        else if (name === 'registrationNumber') errorMsg = validateRegistrationNumber(value);
        else if (name === 'degreeName') errorMsg = validateDegreeName(value);
        else if (name === 'grade') errorMsg = validateGradeOrCGPA(value);
        else if (name === 'issueDate') errorMsg = validateIssueDate(value);

        setErrors(prev => ({
            ...prev,
            [name]: errorMsg
        }));
    };

    const handleInputChange = (e) => {
        let { name, value } = e.target;
        
        if (name === 'grade') {
            value = value.toUpperCase();
        }

        setFormData({
            ...formData,
            [name]: value,
        });

        if (errors[name]) {
            let errorMsg = null;
            if (name === 'studentName') errorMsg = validateStudentName(value);
            else if (name === 'registrationNumber') errorMsg = validateRegistrationNumber(value);
            else if (name === 'degreeName') errorMsg = validateDegreeName(value);
            else if (name === 'grade') errorMsg = validateGradeOrCGPA(value);
            else if (name === 'issueDate') errorMsg = validateIssueDate(value);

            setErrors(prev => ({
                ...prev,
                [name]: errorMsg
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const isValid = validateForm();
        if (!isValid) {
            showNotification('error', 'Please fix the errors in the form.');
            return;
        }

        setLoading(true);

        try {
            // Call backend API to issue certificate
            const response = await degreesAPI.issue({
                student_name: formData.studentName.trim(),
                student_id: formData.registrationNumber.trim(), // Fallback student_id to registration_no
                registration_no: formData.registrationNumber.trim(),
                degree_name: formData.degreeName.trim(),
                grade: formData.grade.trim(),
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
                universityName: adminUniversityName,
                grade: '',
                issueDate: '',
                certificateHash: cert.blockchain_hash || '',
            });
            setErrors({});

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
                registration_no: row['Registration No'] || row['registrationNo'] || '',
                student_name: row['Student Name'] || row['studentName'] || 'Unknown',
                student_id: row['Registration No'] || row['registrationNo'] || 'BULK-' + Date.now(), // Fallback to reg no for legacy student_id field
                degree_name: row['Degree Name'] || row['degreeName'] || 'Unknown',
                grade: row['Grade'] || row['grade'] || '',
                issue_date: row['Issue Date'] || row['issueDate'] || new Date().toISOString().split('T')[0],
            }));

            // Validate bulk uploaded data
            const errorsList = [];
            const validatedDegrees = degrees.map((deg, index) => {
                const rowNum = index + 1;
                const nameErr = validateStudentName(deg.student_name);
                const regErr = validateRegistrationNumber(deg.registration_no);
                const degErr = validateDegreeName(deg.degree_name);
                
                // Trim and uppercase grade
                const rawGrade = deg.grade ? String(deg.grade).toUpperCase().trim() : '';
                const gradeErr = validateGradeOrCGPA(rawGrade);
                const dateErr = validateIssueDate(deg.issue_date);

                if (nameErr) errorsList.push(`Row ${rowNum} Name: ${nameErr}`);
                if (regErr) errorsList.push(`Row ${rowNum} Reg No: ${regErr}`);
                if (degErr) errorsList.push(`Row ${rowNum} Degree: ${degErr}`);
                if (gradeErr) errorsList.push(`Row ${rowNum} Grade/CGPA: ${gradeErr}`);
                if (dateErr) errorsList.push(`Row ${rowNum} Date: ${dateErr}`);

                return {
                    ...deg,
                    registration_no: deg.registration_no.trim(),
                    student_name: deg.student_name.trim(),
                    degree_name: deg.degree_name.trim(),
                    grade: rawGrade,
                };
            });

            if (errorsList.length > 0) {
                setBulkUploading(false);
                setBulkProgress(0);
                // Show first error in notification
                showNotification('error', `Validation failed in CSV: ${errorsList[0]} (and ${errorsList.length - 1} other errors). Please correct and upload again.`);
                return;
            }

            setBulkProgress(50);

            // Send to backend
            const response = await degreesAPI.bulkIssue(validatedDegrees);

            setBulkProgress(90);

            // Refresh certificates list
            const certsRes = await degreesAPI.list();
            const certs = certsRes.data.map(cert => ({
                id: cert.id,
                studentName: cert.student_name,
                studentId: cert.student_id,
                degreeName: cert.degree_name,
                issueDate: cert.issue_date,
                status: cert.status?.toLowerCase() === 'issued' ? 'Issued' : cert.status?.toLowerCase() === 'revoked' ? 'Revoked' : 'Pending',
                hash: cert.blockchain_hash || '',
                txHash: cert.tx_hash || '',
                revokeReason: cert.revoke_reason || '',
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
        const csvContent = `Registration No,Student Name,Degree Name,Grade,Issue Date\n2020-AG-001,John Doe,BS Computer Science,A+,2025-01-15\n2020-AG-002,Jane Smith,BS Data Science,A,2025-01-14\n2020-AG-003,Mike Johnson,BS Electrical Engineering,B+,2025-01-13`;
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
                        {[
                            { id: 'issue', icon: '📝', label: 'Issue' },
                            { id: 'certificates', icon: '📋', label: `Certificates (${issuedCertificates.length})` },
                            { id: 'pending', icon: '⏳', label: `Pending (${pendingTransactions.length})` },
                            { id: 'audit', icon: '📊', label: 'Audit Log' },
                            { id: 'bulk', icon: '📤', label: 'Bulk Upload' },
                        ].map(tab => (
                            <a
                                key={tab.id}
                                href={`/admin?tab=${tab.id}`}
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
                                        <div className="grid grid-cols-1 gap-4">
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
                                                        onBlur={handleBlur}
                                                        placeholder="Enter student full name"
                                                        className={`input-field w-full pl-12 ${errors.studentName ? 'border-red-500 focus:border-red-500/50' : ''}`}
                                                        required
                                                    />
                                                </div>
                                                {errors.studentName && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-red-400 text-xs mt-1"
                                                    >
                                                        ⚠️ {errors.studentName}
                                                    </motion.p>
                                                )}
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
                                                    onBlur={handleBlur}
                                                    placeholder="Enter registration number"
                                                    className={`input-field w-full pl-12 ${errors.registrationNumber ? 'border-red-500 focus:border-red-500/50' : ''}`}
                                                    required
                                                />
                                            </div>
                                            {errors.registrationNumber && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-red-400 text-xs mt-1"
                                                >
                                                    ⚠️ {errors.registrationNumber}
                                                </motion.p>
                                            )}
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
                                                    onBlur={handleBlur}
                                                    placeholder="e.g., Bachelor of Science in Computer Science"
                                                    className={`input-field w-full pl-12 ${errors.degreeName ? 'border-red-500 focus:border-red-500/50' : ''}`}
                                                    required
                                                />
                                            </div>
                                            {errors.degreeName && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-red-400 text-xs mt-1"
                                                >
                                                    ⚠️ {errors.degreeName}
                                                </motion.p>
                                            )}
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
                                                    placeholder="Linked to your admin account"
                                                    className="input-field w-full pl-12 bg-white/5 opacity-60 cursor-not-allowed"
                                                    readOnly
                                                />
                                            </div>
                                            <p className="text-xs text-white/40 mt-1">Auto-filled from your admin profile</p>
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
                                                        onBlur={handleBlur}
                                                        placeholder="e.g., A+ or 3.8"
                                                        className={`input-field w-full pl-12 ${errors.grade ? 'border-red-500 focus:border-red-500/50' : ''}`}
                                                        required
                                                    />
                                                </div>
                                                {errors.grade && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-red-400 text-xs mt-1"
                                                    >
                                                        ⚠️ {errors.grade}
                                                    </motion.p>
                                                )}
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
                                                        max={getTodayDateString()}
                                                        value={formData.issueDate}
                                                        onChange={handleInputChange}
                                                        onBlur={handleBlur}
                                                        className={`input-field w-full pl-12 ${errors.issueDate ? 'border-red-500 focus:border-red-500/50' : ''}`}
                                                        required
                                                    />
                                                </div>
                                                {errors.issueDate && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="text-red-400 text-xs mt-1"
                                                    >
                                                        ⚠️ {errors.issueDate}
                                                    </motion.p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="certificateHash" className="block text-sm font-medium mb-2 text-white/70">
                                                Certificate Hash / ID
                                            </label>
                                            <div className="relative flex gap-2">
                                                <div className="relative flex-1">
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
                                                {formData.certificateHash && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(formData.certificateHash);
                                                            showNotification('success', 'Hash copied to clipboard!');
                                                        }}
                                                        className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-500/30 transition-all text-sm font-medium whitespace-nowrap"
                                                    >
                                                        📋 Copy
                                                    </button>
                                                )}
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
                                        {paginatedCertificates.map((cert) => (
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
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(cert)}
                                                            className="border-red-700 text-red-500 hover:bg-red-700/10"
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

                            {filteredCertificates.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-white/50">No certificates found matching your criteria.</p>
                                </div>
                            )}

                            {filteredCertificates.length > CERTS_PER_PAGE && (
                                <div className="flex justify-center gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={certsPage <= 1}
                                        onClick={() => setCertsPage(p => Math.max(1, p - 1))}
                                    >
                                        ← Previous
                                    </Button>
                                    <span className="text-white/50 text-sm py-2">Page {certsPage} of {totalCertsPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={certsPage >= totalCertsPages}
                                        onClick={() => setCertsPage(p => p + 1)}
                                    >
                                        Next →
                                    </Button>
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
                                <div className="text-center py-16 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                                        <span className="text-3xl text-emerald-400">⚡</span>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">All Transactions Confirmed</h3>
                                    <p className="text-white/50 max-w-md text-sm">
                                        All blockchain transactions are successfully mined and confirmed. No transactions are currently pending in the mempool (Ganache instant-mining active).
                                    </p>
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
                                    <select
                                        className="input-field w-48"
                                        value={auditFilter}
                                        onChange={(e) => { setAuditFilter(e.target.value); setAuditPage(1); }}
                                    >
                                        <option value="all">All Actions</option>
                                        <option value="certificate_issued">Certificate Issued</option>
                                        <option value="certificate_revoked">Certificate Revoked</option>
                                        <option value="certificate_deleted">Certificate Deleted</option>
                                        <option value="certificate_status_changed">Status Changed</option>
                                        <option value="bulk_issue">Bulk Issue</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setAuditPage(1); setAuditFilter('all'); }}
                                    >
                                        🔄 Refresh
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {auditLog.length > 0 ? auditLog.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <span className={`w-2 h-2 rounded-full ${
                                                log.action.includes('issued') ? 'bg-green-400' :
                                                log.action.includes('revoked') ? 'bg-orange-400' :
                                                log.action.includes('deleted') ? 'bg-red-400' :
                                                    'bg-blue-400'
                                                }`}></span>
                                            <div>
                                                <p className="font-semibold">{log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                                <p className="text-white/50 text-sm">{log.target_name || log.details}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white/70 text-sm">{log.user_name} <span className="text-white/40">({log.user_role})</span></p>
                                            <p className="text-white/40 text-xs">{new Date(log.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-12">
                                        <span className="text-4xl mb-4 block">📋</span>
                                        <p className="text-white/50">No audit logs found. Actions will appear here as you issue, revoke, or delete certificates.</p>
                                    </div>
                                )}
                            </div>

                            {auditTotal > 20 && (
                                <div className="flex justify-center gap-3 mt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={auditPage <= 1}
                                        onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                                    >
                                        ← Previous
                                    </Button>
                                    <span className="text-white/50 text-sm py-2">Page {auditPage} of {Math.ceil(auditTotal / 20)}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={auditPage >= Math.ceil(auditTotal / 20)}
                                        onClick={() => setAuditPage(p => p + 1)}
                                    >
                                        Next →
                                    </Button>
                                </div>
                            )}
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
                                        Registration No, Student Name, Degree Name, Grade, Issue Date
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
                                                {paginatedCsvData.map((row, index) => {
                                                    const globalIndex = (bulkPage - 1) * BULK_PER_PAGE + index + 1;
                                                    return (
                                                        <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="py-3 px-4 text-white/40 text-sm">{globalIndex}</td>
                                                            {Object.values(row).map((value, vIndex) => (
                                                                <td key={vIndex} className="py-3 px-4 text-white/80 text-sm">
                                                                    {value}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {csvData.length > BULK_PER_PAGE && (
                                        <div className="flex justify-center gap-3 mt-6">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={bulkPage <= 1}
                                                onClick={() => setBulkPage(p => Math.max(1, p - 1))}
                                            >
                                                ← Previous
                                            </Button>
                                            <span className="text-white/50 text-sm py-2">Page {bulkPage} of {totalBulkPages}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={bulkPage >= totalBulkPages}
                                                onClick={() => setBulkPage(p => p + 1)}
                                            >
                                                Next →
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && certToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                    >
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-red-400">Confirm Deletion</h2>
                                <button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCertToDelete(null);
                                    }}
                                    className="text-white/60 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center space-y-3">
                                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
                                    🗑️
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-white">Delete Certificate?</p>
                                    <p className="text-sm text-red-400 mt-1">This action cannot be undone.</p>
                                </div>
                            </div>

                            <div className="mb-6 text-center space-y-1">
                                <p className="text-white/60 text-sm">You are about to permanently delete the certificate for:</p>
                                <p className="font-semibold text-lg">{certToDelete.studentName}</p>
                                <p className="text-white/50 text-sm">{certToDelete.degreeName}</p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setCertToDelete(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    className="flex-1 bg-red-500 hover:bg-red-600"
                                    onClick={confirmDelete}
                                >
                                    Delete Permanently
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            )}

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
