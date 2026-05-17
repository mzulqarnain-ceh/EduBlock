import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const Login = ({ onLogin }) => {
    const [searchParams] = useSearchParams();
    const roleFromUrl = searchParams.get('role');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        role: roleFromUrl || 'student',
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const navigate = useNavigate();
    const toast = useToast();

    // Update role if URL param changes
    useEffect(() => {
        if (roleFromUrl && ['student', 'admin', 'superadmin'].includes(roleFromUrl)) {
            setFormData(prev => ({ ...prev, role: roleFromUrl }));
        }
    }, [roleFromUrl]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const emailVal = formData.email.trim();

        // 1. Character whitelist check for Email/Registration input
        const safePattern = /^[a-zA-Z0-9@.\-_\/]{3,100}$/;
        if (!safePattern.test(emailVal)) {
            toast.error('Invalid format. Only letters, numbers, @, ., -, _, and / are allowed (max 100 characters).');
            setLoading(false);
            return;
        }

        // 2. Blacklisted SQL keywords check
        const blacklistedKeywords = [
            'select', 'union', 'insert', 'update', 'delete', 'drop', 'alter', 
            'truncate', 'exec', '--', '/*', '*/', 'xp_cmdshell'
        ];
        const lowerEmail = emailVal.toLowerCase();
        if (blacklistedKeywords.some(keyword => lowerEmail.includes(keyword))) {
            toast.error('Potentially unsafe characters or database keywords detected.');
            setLoading(false);
            return;
        }

        try {
            // Call backend API for authentication
            const response = await authAPI.login(emailVal, formData.password, formData.role);
            const { access_token, user } = response.data;

            // Store token and user data
            localStorage.setItem('token', access_token);
            localStorage.setItem('user', JSON.stringify(user));

            if (onLogin) onLogin(user);

            setLoading(false);
            toast.success('Login successful!');

            // Redirect based on role (case-insensitive)
            const role = user.role?.toLowerCase();
            if (role === 'superadmin') {
                navigate('/superadmin');
            } else if (role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/student');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.detail || 'Login failed. Please try again.';
            toast.error(errorMsg);
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        const emailVal = forgotEmail.trim();

        // Strict Email Format Check
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailVal) || emailVal.length > 100) {
            toast.error('Please enter a valid email address.');
            return;
        }

        setForgotLoading(true);
        try {
            const res = await authAPI.forgotPassword(emailVal);
            toast.success(res.data.message || 'If that email exists, a reset link has been sent.');
            setForgotEmail('');
            setShowForgotModal(false);
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const roleOptions = [
        { value: 'student', label: 'Student', icon: '🎓' },
        { value: 'admin', label: 'Institute Admin', icon: '🏛️' },
        { value: 'superadmin', label: 'Super Admin', icon: '👑' },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                className="max-w-md w-full mx-4 relative z-10"
            >
                <Card className="border-white/10 hover:border-amber-500/20">
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"
                        >
                            <span className="text-3xl">🔐</span>
                        </motion.div>
                        <h1 className="text-3xl font-bold mb-2">
                            <span className="gradient-text">Welcome Back</span>
                        </h1>
                        <p className="text-white/50">Access your EduBlock account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="email" className="block text-sm font-medium text-white/70">
                                    Email or Registration No
                                </label>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">📧</span>
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter email or roll no"
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
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="password" className="block text-sm font-medium text-white/70">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(true)}
                                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">🔑</span>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    className="input-field pl-12 pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors z-10"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label className="block text-sm font-medium mb-3 text-white/70">
                                Login As
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {roleOptions.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setFormData({ ...formData, role: option.value })}
                                        className={`relative p-4 rounded-xl border transition-all duration-300 ${formData.role === option.value
                                            ? 'bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{option.icon}</div>
                                        <div className={`text-xs font-medium ${formData.role === option.value ? 'text-amber-400' : 'text-white/60'
                                            }`}>
                                            {option.label}
                                        </div>
                                        {formData.role === option.value && (
                                            <motion.div
                                                layoutId="activeRole"
                                                className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-full flex items-center justify-center"
                                            >
                                                <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>


                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
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
                                        Logging in...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Login
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </span>
                                )}
                            </Button>
                        </motion.div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-white/50 text-sm">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </Card>
            </motion.div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
                    onClick={() => setShowForgotModal(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Card>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Reset Password</h2>
                                <button
                                    onClick={() => setShowForgotModal(false)}
                                    className="text-white/60 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <p className="text-white/60 text-sm mb-4">
                                        Enter your email address and we'll send you a link to reset your password.
                                    </p>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-white/80">Email</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            className="input-field w-full"
                                            placeholder="your.email@example.com"
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        loading={forgotLoading}
                                        disabled={forgotLoading}
                                    >
                                        Send Reset Link
                                    </Button>
                                </form>
                        </Card>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Login;
