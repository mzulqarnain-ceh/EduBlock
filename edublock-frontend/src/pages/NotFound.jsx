import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import FloatingBackground from '../components/FloatingBackground';

const NotFound = () => {
    return (
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center text-center px-4 relative">
            <FloatingBackground />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 max-w-2xl mx-auto"
            >
                <motion.div
                    initial={{ y: -20 }}
                    animate={{ y: 0 }}
                    transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 2
                    }}
                    className="text-9xl mb-8"
                >
                    🚧
                </motion.div>

                <h1 className="text-6xl font-bold mb-4">
                    <span className="gradient-text">404</span>
                </h1>

                <h2 className="text-2xl font-semibold text-white/90 mb-6">
                    Page Not Found
                </h2>

                <p className="text-white/60 mb-8 text-lg">
                    Oops! The block you are looking for hasn't been mined yet.
                    It might have been removed or the URL is incorrect.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/">
                        <Button variant="primary" size="lg">
                            🏠 Back to Home
                        </Button>
                    </Link>
                    <Link to="/contact">
                        <Button variant="outline" size="lg">
                            📞 Contact Support
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default NotFound;
