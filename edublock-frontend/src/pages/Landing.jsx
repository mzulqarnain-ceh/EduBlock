import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';

const Landing = () => {
    const faqRef = useRef(null);
    const navigate = useNavigate();

    // Handle Issue Certificate button click
    const handleIssueCertificate = () => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user.role === 'admin') {
                navigate('/admin');
                return;
            }
        }
        navigate('/login?role=admin');
    };
    const features = [
        {
            icon: '🔒',
            title: 'Blockchain Verified',
            description: 'All certificates are stored on the blockchain, ensuring immutability and authenticity.',
        },
        {
            icon: '⚡',
            title: 'Instant Verification',
            description: 'Verify any certificate in seconds with just a certificate ID or hash.',
        },
        {
            icon: '🌐',
            title: 'Decentralized',
            description: 'No central authority. Certificates are distributed across the blockchain network.',
        },
        {
            icon: '🛡️',
            title: 'Tamper-Proof',
            description: 'Once issued, certificates cannot be altered or forged, ensuring trust.',
        },
    ];

    const faqs = [
        {
            question: 'What is EduBlock?',
            answer: 'EduBlock is a blockchain-based platform for issuing and verifying educational certificates. It ensures that credentials are tamper-proof and instantly verifiable.',
        },
        {
            question: 'How do I verify a certificate?',
            answer: 'Simply enter the certificate ID or scan the QR code on the Verify page. Our system will instantly check the blockchain and display the certificate details.',
        },
        {
            question: 'Is my data secure?',
            answer: 'Absolutely. All certificate data is encrypted and stored on the blockchain. Only authorized parties can access the full certificate details.',
        },
        {
            question: 'Can certificates be faked?',
            answer: 'No. Once a certificate is issued on the blockchain, it cannot be altered or duplicated. Any tampering attempt would be immediately detected.',
        },
    ];

    const [openFaq, setOpenFaq] = React.useState(null);

    // Close FAQ when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (faqRef.current && !faqRef.current.contains(event.target)) {
                setOpenFaq(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Animation variants for different directions
    const fadeInUp = {
        hidden: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }
    };

    const fadeInDown = {
        hidden: { opacity: 0, y: -60 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }
    };

    const fadeInLeft = {
        hidden: { opacity: 0, x: -80 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }
    };

    const fadeInRight = {
        hidden: { opacity: 0, x: 80 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }
    };

    const scaleIn = {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.1,
            },
        },
    };

    const staggerItem = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
        },
    };

    // Alternating left/right for feature cards
    const getFeatureVariant = (index) => {
        if (index % 2 === 0) {
            return {
                hidden: { opacity: 0, x: -60, rotate: -3 },
                visible: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: index * 0.1 } }
            };
        }
        return {
            hidden: { opacity: 0, x: 60, rotate: 3 },
            visible: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: index * 0.1 } }
        };
    };

    return (
        <div className="min-h-screen overflow-hidden">
            {/* Hero Section */}
            <section className="relative section-padding pt-32 min-h-screen flex items-center">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-float"
                    ></motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                        className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float"
                        style={{ animationDelay: '2s' }}
                    ></motion.div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/5 to-emerald-500/5 rounded-full blur-3xl"></div>

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                </div>

                <div className="container-custom relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeInUp}
                        className="text-center max-w-5xl mx-auto"
                    >
                        <motion.div
                            variants={fadeInDown}
                            initial="hidden"
                            animate="visible"
                            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8"
                        >
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span className="text-white/70 text-sm">Secured by Blockchain Technology</span>
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
                        >
                            <span className="gradient-text">Blockchain-Powered</span>
                            <br />
                            <span className="text-white">Educational Certificates</span>
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed"
                        >
                            Secure, verifiable, and tamper-proof certificates for the digital age.
                            Built on blockchain technology for ultimate trust.
                        </motion.p>

                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <Link to="/verify">
                                <Button variant="primary" size="lg" className="group">
                                    <span>Verify Certificate</span>
                                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Button>
                            </Link>
                            <button onClick={handleIssueCertificate}>
                                <Button variant="secondary" size="lg">
                                    Issue Certificate
                                </Button>
                            </button>
                        </motion.div>
                    </motion.div>

                    {/* Hero Stats - Slide in from right */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeInRight}
                        className="mt-20 max-w-4xl mx-auto"
                    >
                        <div className="glass-card p-8 rounded-3xl">
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                className="grid grid-cols-2 md:grid-cols-4 gap-8"
                            >
                                {[
                                    { value: '10K+', label: 'Certificates Issued' },
                                    { value: '500+', label: 'Institutions' },
                                    { value: '99.9%', label: 'Uptime' },
                                    { value: '< 2s', label: 'Verification Time' },
                                ].map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        variants={staggerItem}
                                        className="text-center"
                                    >
                                        <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                                        <div className="text-white/50 text-sm">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section - Cards alternate left/right */}
            <section id="features" className="section-padding bg-white/[0.02]">
                <div className="container-custom">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <motion.span variants={fadeInDown} className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Features</motion.span>
                        <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                            Why <span className="gradient-text">EduBlock</span>?
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                            Experience the future of educational credentials with our blockchain-based verification system.
                        </motion.p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-50px" }}
                                variants={getFeatureVariant(index)}
                            >
                                <Card className="h-full text-center group hover:border-amber-500/30">
                                    <div className="text-5xl mb-6 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">{feature.icon}</div>
                                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-amber-400 transition-colors">{feature.title}</h3>
                                    <p className="text-white/50">{feature.description}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section - Steps come from different directions */}
            <section id="how-it-works" className="section-padding">
                <div className="container-custom">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={scaleIn}
                        className="text-center mb-16"
                    >
                        <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">Process</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                            How It <span className="gradient-text">Works</span>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        {/* Connection line */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/20 via-emerald-500/40 to-amber-500/20 -translate-y-1/2 origin-left"
                        ></motion.div>

                        {[
                            { step: '1', title: 'Issue Certificate', desc: 'Admin creates and issues certificate on blockchain', icon: '📝', direction: fadeInLeft },
                            { step: '2', title: 'Store on Blockchain', desc: 'Certificate data is permanently recorded', icon: '⛓️', direction: fadeInUp },
                            { step: '3', title: 'Verify Anytime', desc: 'Anyone can verify authenticity instantly', icon: '✅', direction: fadeInRight },
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-50px" }}
                                variants={{
                                    hidden: item.direction.hidden,
                                    visible: {
                                        ...item.direction.visible,
                                        transition: { ...item.direction.visible.transition, delay: index * 0.2 }
                                    }
                                }}
                            >
                                <Card className="h-full text-center relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 text-[120px] font-bold text-white/[0.02] leading-none">
                                        {item.step}
                                    </div>
                                    <div className="relative z-10">
                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className="w-20 h-20 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20"
                                        >
                                            <span className="text-3xl">{item.icon}</span>
                                        </motion.div>
                                        <h3 className="text-2xl font-bold mb-3 text-white">{item.title}</h3>
                                        <p className="text-white/50">{item.desc}</p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section - Alternating left/right */}
            <section id="faq" className="section-padding bg-white/[0.02]">
                <div className="container-custom">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <span className="text-amber-400 text-sm font-semibold uppercase tracking-wider">FAQ</span>
                        <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                            Frequently Asked <span className="gradient-text">Questions</span>
                        </h2>
                    </motion.div>

                    <div ref={faqRef} className="max-w-3xl mx-auto space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-30px" }}
                                variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div
                                    className={`glass-card overflow-hidden transition-all duration-500 ${openFaq === index ? 'border-amber-500/30 shadow-lg shadow-amber-500/10' : ''}`}
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                        className="w-full px-6 py-5 flex items-center justify-between text-left group"
                                    >
                                        <span className="text-white font-semibold text-lg group-hover:text-amber-400 transition-colors">{faq.question}</span>
                                        <motion.svg
                                            animate={{ rotate: openFaq === index ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="w-5 h-5 text-amber-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </motion.svg>
                                    </button>
                                    <motion.div
                                        initial={false}
                                        animate={{
                                            height: openFaq === index ? 'auto' : 0,
                                            opacity: openFaq === index ? 1 : 0
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="px-6 pb-5 text-white/60">{faq.answer}</p>
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - Scale in */}
            <section className="section-padding relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-amber-500/10"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

                <div className="container-custom relative z-10">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={scaleIn}
                        className="text-center max-w-3xl mx-auto"
                    >
                        <motion.h2
                            variants={fadeInDown}
                            className="text-4xl md:text-5xl font-bold mb-6"
                        >
                            Ready to Get <span className="gradient-text">Started</span>?
                        </motion.h2>
                        <motion.p
                            variants={fadeInUp}
                            className="text-xl text-white/60 mb-10"
                        >
                            Join the future of educational credential verification today.
                        </motion.p>
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row gap-4 justify-center"
                        >
                            <button onClick={handleIssueCertificate}>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="primary" size="lg">
                                        Issue Your First Certificate
                                    </Button>
                                </motion.div>
                            </button>
                            <Link to="/verify">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button variant="outline" size="lg">
                                        Verify a Certificate
                                    </Button>
                                </motion.div>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Footer - Slide up */}
            <motion.footer
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-black/60 border-t border-white/5 py-16"
            >
                <div className="container-custom">
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12"
                    >
                        <motion.div variants={fadeInLeft}>
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <span className="text-black font-bold text-xl">E</span>
                                </div>
                                <span className="text-2xl font-bold gradient-text">EduBlock</span>
                            </div>
                            <p className="text-white/40 leading-relaxed">
                                Blockchain-powered educational certificate verification for the modern world.
                            </p>
                        </motion.div>
                        <motion.div variants={fadeInUp}>
                            <h4 className="font-bold mb-6 text-white">Product</h4>
                            <ul className="space-y-3 text-white/40">
                                <li><Link to="/verify" className="hover:text-amber-400 transition-colors duration-200">Verify</Link></li>
                                <li><Link to="/login" className="hover:text-amber-400 transition-colors duration-200">Admin</Link></li>
                                <li><Link to="/login" className="hover:text-amber-400 transition-colors duration-200">Student</Link></li>
                            </ul>
                        </motion.div>
                        <motion.div variants={fadeInUp}>
                            <h4 className="font-bold mb-6 text-white">Resources</h4>
                            <ul className="space-y-3 text-white/40">
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">Documentation</a></li>
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">API</a></li>
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">Support</a></li>
                            </ul>
                        </motion.div>
                        <motion.div variants={fadeInRight}>
                            <h4 className="font-bold mb-6 text-white">Legal</h4>
                            <ul className="space-y-3 text-white/40">
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">Privacy</a></li>
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">Terms</a></li>
                                <li><a href="#" className="hover:text-amber-400 transition-colors duration-200">License</a></li>
                            </ul>
                        </motion.div>
                    </motion.div>
                    <motion.div
                        variants={fadeInUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
                    >
                        <p className="text-white/30 text-sm">&copy; 2026 EduBlock. All rights reserved.</p>
                        <div className="flex gap-6">
                            <motion.a whileHover={{ scale: 1.2, y: -2 }} href="#" className="text-white/30 hover:text-amber-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                            </motion.a>
                            <motion.a whileHover={{ scale: 1.2, y: -2 }} href="#" className="text-white/30 hover:text-amber-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                            </motion.a>
                            <motion.a whileHover={{ scale: 1.2, y: -2 }} href="#" className="text-white/30 hover:text-amber-400 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
            </motion.footer>
        </div>
    );
};

export default Landing;
