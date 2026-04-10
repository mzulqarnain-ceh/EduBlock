import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';

const ContactUs = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setSubmitted(true);
        setLoading(false);

        // Reset form
        setFormData({
            name: '',
            email: '',
            subject: '',
            message: '',
        });

        // Reset success message after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
    };

    const contactInfo = [
        {
            icon: (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            title: 'Email',
            content: 'support@edublock.com',
        },
        {
            icon: (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            title: 'Location',
            content: '123 Blockchain Ave\nWeb3 City, BC 12345',
        },
        {
            icon: (
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Working Hours',
            content: 'Mon - Fri: 9AM - 6PM\nSat - Sun: Closed',
        },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="container-custom relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"
                        >
                            <span className="text-3xl">💬</span>
                        </motion.div>
                        <h1 className="text-5xl font-bold mb-4">
                            <span className="gradient-text">Contact</span> Us
                        </h1>
                        <p className="text-white/50 text-lg">
                            Have questions or feedback? We'd love to hear from you!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <Card className="border-white/10 hover:border-amber-500/20">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">✉️</span>
                                    </div>
                                    <h2 className="text-2xl font-bold">Send us a message</h2>
                                </div>

                                {submitted && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3"
                                    >
                                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-emerald-400 font-semibold">Message sent successfully! We'll get back to you soon.</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <label htmlFor="name" className="block text-sm font-medium mb-2 text-white/70">
                                            Your Name
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">👤</span>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder="Enter your name"
                                                className="input-field pl-12"
                                                required
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                    >
                                        <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/70">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">📧</span>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="your.email@example.com"
                                                className="input-field pl-12"
                                                required
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <label htmlFor="subject" className="block text-sm font-medium mb-2 text-white/70">
                                            Subject
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">📝</span>
                                            <input
                                                id="subject"
                                                name="subject"
                                                type="text"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                placeholder="What is this regarding?"
                                                className="input-field pl-12"
                                                required
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.45 }}
                                    >
                                        <label htmlFor="message" className="block text-sm font-medium mb-2 text-white/70">
                                            Message
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-4 text-white/40">💭</span>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                placeholder="Tell us about your feedback or problem..."
                                                rows="6"
                                                className="input-field resize-none pl-12"
                                                required
                                            />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                    >
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
                                                    Sending...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    Send Message
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </span>
                                            )}
                                        </Button>
                                    </motion.div>
                                </form>
                            </Card>
                        </div>

                        {/* Contact Info Sidebar */}
                        <div className="space-y-6">
                            <Card className="border-white/10 hover:border-amber-500/20">
                                {contactInfo.map((info, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + index * 0.1 }}
                                        className={`flex items-start gap-4 ${index < contactInfo.length - 1 ? 'mb-6 pb-6 border-b border-white/10' : ''}`}
                                    >
                                        <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                                            {info.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold mb-1 text-white">{info.title}</h3>
                                            <p className="text-white/50 text-sm whitespace-pre-line">{info.content}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </Card>

                            <Card className="border-white/10 hover:border-amber-500/20">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-lg">⚡</span>
                                    </div>
                                    <h3 className="text-lg font-bold">Quick Help</h3>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        { text: 'Check our FAQ section', icon: '❓' },
                                        { text: 'Read the documentation', icon: '📚' },
                                        { text: 'Join our Discord community', icon: '💬' },
                                    ].map((item, index) => (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + index * 0.1 }}
                                            className="flex items-center gap-3 text-white/60 text-sm hover:text-amber-400 transition-colors cursor-pointer group"
                                        >
                                            <span className="w-6 h-6 bg-amber-500/10 rounded-md flex items-center justify-center text-xs group-hover:bg-amber-500/20 transition-colors">
                                                {item.icon}
                                            </span>
                                            {item.text}
                                            <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.li>
                                    ))}
                                </ul>
                            </Card>

                            {/* Social Links */}
                            <Card className="border-white/10 hover:border-amber-500/20">
                                <h3 className="text-lg font-bold mb-4">Follow Us</h3>
                                <div className="flex gap-3">
                                    {[
                                        { icon: '𝕏', label: 'Twitter' },
                                        { icon: '📱', label: 'Discord' },
                                        { icon: '💼', label: 'LinkedIn' },
                                        { icon: '📧', label: 'Email' },
                                    ].map((social, index) => (
                                        <motion.a
                                            key={index}
                                            href="#"
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="w-10 h-10 bg-white/5 hover:bg-gradient-to-br hover:from-amber-400 hover:to-emerald-500 rounded-lg flex items-center justify-center text-white/60 hover:text-black transition-all duration-300 border border-white/10 hover:border-transparent"
                                            title={social.label}
                                        >
                                            <span className="text-sm">{social.icon}</span>
                                        </motion.a>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ContactUs;
