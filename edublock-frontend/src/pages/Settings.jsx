import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';

import { usersAPI } from '../services/api';

const Settings = () => {
    const [user, setUser] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Profile Settings State
    const [profileData, setProfileData] = useState({ email: '' });
    const [savingProfile, setSavingProfile] = useState(false);
    const [sendingTestEmail, setSendingTestEmail] = useState(false);

    // Get user from localStorage and fetch preferences
    React.useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setProfileData({
                email: parsedUser.email || '',
            });
        }
        
        // Fetch preferences from API
        const fetchPreferences = async () => {
            try {
                const res = await usersAPI.getPreferences();
                if (res.data.preferences && Object.keys(res.data.preferences).length > 0) {
                    setEmailPreferences(res.data.preferences);
                }
            } catch (err) {
                console.error("Failed to load preferences:", err);
            }
        };
        fetchPreferences();
    }, []);

    // Email notification preferences
    const [emailPreferences, setEmailPreferences] = useState({
        certificateIssued: { enabled: true, email: true, sms: false },
        statusChanged: { enabled: true, email: true, sms: false },
        newRegistration: { enabled: false, email: false, sms: false },
        systemUpdates: { enabled: true, email: true, sms: false },
        weeklyDigest: { enabled: false, email: false, sms: false },
    });

    // Email templates
    const emailTemplates = {
        certificateIssued: {
            subject: 'Your Certificate is Ready! 🎓',
            preview: `Dear [Student Name],

Congratulations! Your certificate for [Degree Name] has been successfully issued and verified on the blockchain.

Certificate Details:
- Student Name: [Student Name]
- Degree: [Degree Name]
- Institution: [University Name]
- Issue Date: [Date]
- Certificate Hash: [Hash]
- Transaction Hash: [TX Hash]

You can download your certificate and view it on the blockchain explorer.

Download Certificate: [Link]
View on Blockchain: [Link]

This certificate is tamper-proof and can be verified by anyone using the hash above.

Best regards,
EduBlock Team`
        },
        statusChanged: {
            subject: 'Certificate Status Update',
            preview: `Dear [Student Name],

The status of your certificate has been updated.

Certificate: [Degree Name]
Previous Status: [Old Status]
New Status: [New Status]
Updated on: [Date]

If you have any questions, please contact your institution.

Best regards,
EduBlock Team`
        },
        newRegistration: {
            subject: 'New Student Registration',
            preview: `Dear Admin,

A new student has registered on the platform.

Student Details:
- Name: [Student Name]
- Email: [Student Email]
- Registration Number: [Reg Number]
- Registration Date: [Date]

Please review and approve the registration.

View Details: [Link]

Best regards,
EduBlock System`
        },
        systemUpdates: {
            subject: 'EduBlock System Update',
            preview: `Dear User,

We have released a new update to the EduBlock platform.

What's New:
- [Feature 1]
- [Feature 2]
- [Bug fixes and improvements]

Learn More: [Link]

Best regards,
EduBlock Team`
        },
        weeklyDigest: {
            subject: 'Your Weekly EduBlock Summary',
            preview: `Dear [User Name],

Here's your weekly summary:

This Week's Activity:
- Certificates Issued: [Count]
- Certificates Verified: [Count]
- Active Users: [Count]

Quick Stats:
- Total Certificates: [Count]
- Verified Institutions: [Count]

View Dashboard: [Link]

Best regards,
EduBlock Team`
        }
    };

    const showNotification = (message, type = 'success') => {
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

        setNotification({ show: true, message: safeMessage, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
    };

    const handleToggle = (category, type) => {
        setEmailPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [type]: !prev[category][type]
            }
        }));
    };

    const [saving, setSaving] = useState(false);

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            await usersAPI.updatePreferences(emailPreferences);
            // Also keep local fallback
            localStorage.setItem('emailPreferences', JSON.stringify(emailPreferences));
            showNotification('Email preferences saved successfully!', 'success');
        } catch (err) {
            showNotification('Failed to save preferences.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await usersAPI.updateProfile({
                email: profileData.email.trim(),
            });

            // Update user in state and localStorage
            const updatedUser = {
                ...user,
                email: res.data.user.email,
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            window.dispatchEvent(new Event('userProfileUpdated'));
            
            showNotification('Profile updated successfully!', 'success');
        } catch (err) {
            console.error('Failed to update profile:', err);
            showNotification(err.response?.data?.detail || 'Failed to update profile.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleTestEmail = async () => {
        setSendingTestEmail(true);
        try {
            await usersAPI.testEmail();
            showNotification('Test email sent to your inbox!', 'success');
        } catch (err) {
            console.error('Failed to send test email:', err);
            showNotification(err.response?.data?.detail || 'Failed to send test email.', 'error');
        } finally {
            setSendingTestEmail(false);
        }
    };

    const handlePreviewTemplate = (templateKey) => {
        setSelectedTemplate(emailTemplates[templateKey]);
        setShowTemplateModal(true);
    };

    const notificationCategories = [
        {
            key: 'certificateIssued',
            title: 'Certificate Issued',
            description: 'Receive notifications when a new certificate is issued',
            icon: '🎓',
            roles: ['student']
        },
        {
            key: 'statusChanged',
            title: 'Status Changed',
            description: 'Get notified when certificate status changes',
            icon: '🔄',
            roles: ['student', 'admin']
        },
        {
            key: 'newRegistration',
            title: 'New Registration',
            description: 'Alerts for new student registrations',
            icon: '👤',
            roles: ['admin', 'superadmin']
        },
        {
            key: 'systemUpdates',
            title: 'System Updates',
            description: 'Important platform updates and announcements',
            icon: '📢',
            roles: ['student', 'admin', 'superadmin']
        },
        {
            key: 'weeklyDigest',
            title: 'Weekly Digest',
            description: 'Weekly summary of activities and statistics',
            icon: '📊',
            roles: ['admin', 'superadmin']
        }
    ];

    // Filter categories based on user role
    const filteredCategories = notificationCategories.filter(cat =>
        cat.roles.includes((user?.role || 'student').toLowerCase())
    );

    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-bold mb-4">
                            <span className="gradient-text">Settings</span>
                        </h1>
                        <p className="text-white/70 text-lg">
                            Manage your notification preferences and email settings
                        </p>
                    </div>

                    {/* Email Preferences */}
                    <Card className="mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
                                <p className="text-white/60 text-sm">Choose which notifications you want to receive</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTestEmail}
                                loading={sendingTestEmail}
                                disabled={sendingTestEmail}
                                className="w-full sm:w-auto justify-center"
                            >
                                📧 Test Email
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {filteredCategories.map((category) => (
                                <div key={category.key} className="border-b border-white/10 pb-6 last:border-0">
                                    <div className="flex items-start gap-4">
                                        <div className="text-3xl">{category.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                                            <p className="text-white/60 text-sm mb-4">{category.description}</p>

                                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full">
                                                {/* Enable/Disable Toggle */}
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={emailPreferences[category.key]?.enabled}
                                                            onChange={() => handleToggle(category.key, 'enabled')}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-white/20 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                                                    </div>
                                                    <span className="text-sm font-medium">Enable</span>
                                                </label>

                                                {/* Email Toggle */}
                                                <label className="flex items-center gap-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                                                    <div className="relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={emailPreferences[category.key]?.email}
                                                            onChange={() => handleToggle(category.key, 'email')}
                                                            disabled={!emailPreferences[category.key]?.enabled}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-white/20 rounded-full peer peer-checked:bg-green-500 transition-colors peer-disabled:opacity-30"></div>
                                                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 peer-disabled:opacity-30"></div>
                                                    </div>
                                                    <span className="text-sm">📧 Email</span>
                                                </label>

                                                {/* Preview Template Button */}
                                                <button
                                                    onClick={() => handlePreviewTemplate(category.key)}
                                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors ml-0 sm:ml-auto w-full sm:w-auto text-left mt-2 sm:mt-0 font-medium"
                                                >
                                                    Preview Template →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button
                                variant="primary"
                                loading={saving}
                                disabled={saving}
                                onClick={handleSavePreferences}
                            >
                                Save Preferences
                            </Button>
                        </div>
                    </Card>

                    {/* Account Info */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="profileName" className="block text-sm font-medium mb-2 text-white/50">
                                        Full Name (Non-Editable)
                                    </label>
                                    <input
                                        id="profileName"
                                        type="text"
                                        value={user?.name || ''}
                                        className="input-field w-full opacity-60 cursor-not-allowed bg-white/5"
                                        disabled
                                    />
                                    <p className="text-white/30 text-xs mt-1">Name cannot be changed to preserve degree validity.</p>
                                </div>
                                <div>
                                    <label htmlFor="profileRegNo" className="block text-sm font-medium mb-2 text-white/50">
                                        Registration Number (Non-Editable)
                                    </label>
                                    <input
                                        id="profileRegNo"
                                        type="text"
                                        value={user?.registration_no || 'N/A'}
                                        className="input-field w-full opacity-60 cursor-not-allowed bg-white/5"
                                        disabled
                                    />
                                    <p className="text-white/30 text-xs mt-1">Registration number is permanent and cannot be modified.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                                <div>
                                    <label htmlFor="profileEmail" className="block text-sm font-medium mb-2 text-white/70">
                                        Email Address
                                    </label>
                                    <input
                                        id="profileEmail"
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                        className="input-field w-full"
                                        required
                                    />
                                    <p className="text-white/40 text-xs mt-1">Update your primary communication email address.</p>
                                </div>
                                <div>
                                    <p className="text-white/60 text-sm mb-2">Account Type</p>
                                    <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                                        👤 {user?.role || 'Student'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    variant="primary"
                                    type="submit"
                                    loading={savingProfile}
                                    disabled={savingProfile}
                                >
                                    Update Profile
                                </Button>
                            </div>
                        </form>
                    </Card>
                </motion.div>

                {/* Template Preview Modal */}
                {showTemplateModal && selectedTemplate && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowTemplateModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-2xl w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Card>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold">Email Template Preview</h2>
                                    <button
                                        onClick={() => setShowTemplateModal(false)}
                                        className="text-white/60 hover:text-white"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="bg-white/5 p-6 rounded-lg mb-4">
                                    <p className="text-white/60 text-sm mb-2">Subject:</p>
                                    <p className="font-semibold text-lg mb-4">{selectedTemplate.subject}</p>

                                    <p className="text-white/60 text-sm mb-2">Preview:</p>
                                    <div className="bg-black/30 p-4 rounded-lg">
                                        <pre className="text-sm whitespace-pre-wrap font-sans text-white/90">
                                            {selectedTemplate.preview}
                                        </pre>
                                    </div>
                                </div>

                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => setShowTemplateModal(false)}
                                >
                                    Close
                                </Button>
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
                        <div className={`rounded-lg p-4 flex items-center gap-3 backdrop-blur-md border ${notification.type === 'success'
                            ? 'bg-green-500/20 border-green-500'
                            : 'bg-red-500/20 border-red-500'
                            }`}>
                            <svg className={`w-5 h-5 ${notification.type === 'success' ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className={`font-medium ${notification.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {notification.message}
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Settings;
