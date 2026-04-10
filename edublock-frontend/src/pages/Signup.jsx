import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/Button';
import Card from '../components/Card';
import { authAPI } from '../services/api';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        registrationNo: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    // Password strength calculator
    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, text: '', color: '' };
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { strength, text: 'Weak', color: 'text-red-400', bgColor: 'bg-red-400' };
        if (strength <= 3) return { strength, text: 'Medium', color: 'text-amber-400', bgColor: 'bg-amber-400' };
        return { strength, text: 'Strong', color: 'text-emerald-400', bgColor: 'bg-emerald-400' };
    };

    const passwordStrength = getPasswordStrength(formData.password);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }

        // Password validation
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        // Password match validation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Name validation
        if (formData.name.trim().length < 3) {
            setError('Name must be at least 3 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call backend API to register
            await authAPI.register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });

            setLoading(false);
            setSuccess(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setLoading(false);
            const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.';
            setError(errorMsg);
        }
    };

    const roleOptions = [
        { value: 'student', label: 'Student', icon: '🎓', desc: 'Access your certificates' },
        { value: 'admin', label: 'Institute Admin', icon: '🏛️', desc: 'Issue certificates' },
    ];

    return (
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-20 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                className="max-w-lg w-full mx-4 relative z-10"
            >
                <Card className="border-white/10 hover:border-amber-500/20">
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20"
                        >
                            <span className="text-3xl">✨</span>
                        </motion.div>
                        <h1 className="text-3xl font-bold mb-2">
                            <span className="gradient-text">Create Account</span>
                        </h1>
                        <p className="text-white/50">Join EduBlock and get started</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-red-400 text-sm font-medium">{error}</span>
                        </motion.div>
                    )}

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3"
                        >
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-emerald-400 text-sm font-medium">Account created successfully! Redirecting to login...</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label htmlFor="name" className="block text-sm font-medium mb-2 text-white/70">
                                Full Name
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">👤</span>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
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
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">📧</span>
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
                            <label className="block text-sm font-medium mb-3 text-white/70">
                                Register As
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {roleOptions.map((option) => (
                                    <motion.button
                                        key={option.value}
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setFormData({ ...formData, role: option.value })}
                                        className={`relative p-5 rounded-xl border text-left transition-all duration-300 ${formData.role === option.value
                                            ? 'bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                                            : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-3xl mb-3">{option.icon}</div>
                                        <div className={`text-sm font-semibold mb-1 ${formData.role === option.value ? 'text-amber-400' : 'text-white'
                                            }`}>
                                            {option.label}
                                        </div>
                                        <div className="text-xs text-white/40">{option.desc}</div>
                                        {formData.role === option.value && (
                                            <motion.div
                                                layoutId="activeRoleSignup"
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-amber-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                                            >
                                                <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>

                        {formData.role === 'student' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <label htmlFor="registrationNo" className="block text-sm font-medium mb-2 text-white/70">
                                    Registration Number
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">🔢</span>
                                    <input
                                        id="registrationNo"
                                        name="registrationNo"
                                        type="text"
                                        value={formData.registrationNo}
                                        onChange={handleChange}
                                        placeholder="Enter your registration number"
                                        className="input-field pl-12"
                                        required
                                    />
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 }}
                        >
                            <label htmlFor="password" className="block text-sm font-medium mb-2 text-white/70">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">🔑</span>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a strong password"
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
                            {formData.password && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-3"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-white/50">Password Strength</span>
                                        <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                                            {passwordStrength.text}
                                        </span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                            className={`h-full transition-all duration-500 ${passwordStrength.bgColor}`}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-white/70">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10">🔒</span>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    className="input-field pl-12 pr-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors z-10"
                                >
                                    {showConfirmPassword ? (
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
                            {formData.confirmPassword && formData.password && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`mt-2 text-xs flex items-center gap-1 ${formData.password === formData.confirmPassword ? 'text-emerald-400' : 'text-red-400'
                                        }`}
                                >
                                    {formData.password === formData.confirmPassword ? (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Passwords match
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            Passwords don't match
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 }}
                            className="pt-2"
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
                                        Creating Account...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Create Account
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
                            Already have an account?{' '}
                            <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                                Login here
                            </Link>
                        </p>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default Signup;
