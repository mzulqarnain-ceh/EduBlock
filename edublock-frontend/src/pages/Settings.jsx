import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';

const Settings = () => {
    const [user, setUser] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Get user from localStorage
    React.useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
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
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
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

    const handleSavePreferences = () => {
        // Save to localStorage (mock backend call)
        localStorage.setItem('emailPreferences', JSON.stringify(emailPreferences));
        showNotification('Email preferences saved successfully!', 'success');
    };

    const handleTestEmail = () => {
        showNotification('Test email sent to your inbox!', 'success');
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
        cat.roles.includes(user?.role || 'student')
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
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">Email Notifications</h2>
                                <p className="text-white/60 text-sm">Choose which notifications you want to receive</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTestEmail}
                            >
                                📧 Test Email
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {filteredCategories.map((category) => (
                                <div key={category.key} className="border-b border-white/10 pb-6 last:border-0">
                                    <div className="flex items-start gap-4">
                                        <div className="text-3xl">{category.icon}</div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg mb-1">{category.title}</h3>
                                            <p className="text-white/60 text-sm mb-4">{category.description}</p>

                                            <div className="flex items-center gap-6">
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
                                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors ml-auto"
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
                                onClick={handleSavePreferences}
                            >
                                Save Preferences
                            </Button>
                        </div>
                    </Card>

                    {/* Account Info */}
                    <Card>
                        <h2 className="text-2xl font-bold mb-4">Account Information</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-white/60 text-sm mb-1">Email Address</p>
                                <p className="text-lg font-semibold">{user?.email || 'user@example.com'}</p>
                            </div>
                            <div>
                                <p className="text-white/60 text-sm mb-1">Account Type</p>
                                <p className="text-lg font-semibold capitalize">{user?.role || 'Student'}</p>
                            </div>
                        </div>
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
