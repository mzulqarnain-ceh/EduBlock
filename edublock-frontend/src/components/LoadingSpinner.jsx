import React from 'react';
import { motion } from 'framer-motion';

/**
 * LoadingSpinner Component
 * Reusable loading spinner with different sizes and text
 */
const LoadingSpinner = ({
    size = 'md',
    text = 'Loading...',
    fullScreen = false,
    showText = true
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    const spinnerSize = sizeClasses[size] || sizeClasses.md;

    const spinner = (
        <div className={`flex flex-col items-center justify-center gap-4 ${fullScreen ? 'min-h-screen' : ''}`}>
            <motion.div
                className={`${spinnerSize} border-4 border-white/20 border-t-amber-500 rounded-full`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            {showText && (
                <motion.p
                    className="text-white/60 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );

    return spinner;
};

/**
 * PageLoader Component
 * Full page loading state with skeleton effect
 */
export const PageLoader = ({ text = 'Loading page...' }) => {
    return (
        <div className="min-h-screen pt-32 pb-20">
            <div className="container-custom">
                <div className="flex flex-col items-center justify-center py-20">
                    <LoadingSpinner size="lg" text={text} />
                </div>
            </div>
        </div>
    );
};

/**
 * CardSkeleton Component
 * Skeleton placeholder for card loading states
 */
export const CardSkeleton = ({ count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <motion.div
                    key={index}
                    className="glass-card p-6 rounded-2xl animate-pulse"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                >
                    {/* Header skeleton */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-white/10 rounded-lg"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-white/10 rounded w-1/2"></div>
                        </div>
                    </div>

                    {/* Content skeleton */}
                    <div className="space-y-3">
                        <div className="h-3 bg-white/10 rounded w-full"></div>
                        <div className="h-3 bg-white/10 rounded w-5/6"></div>
                        <div className="h-3 bg-white/10 rounded w-4/6"></div>
                    </div>

                    {/* Button skeleton */}
                    <div className="mt-4 flex gap-2">
                        <div className="h-8 bg-white/10 rounded-lg w-20"></div>
                        <div className="h-8 bg-white/10 rounded-lg w-20"></div>
                    </div>
                </motion.div>
            ))}
        </>
    );
};

/**
 * TableSkeleton Component
 * Skeleton for table loading states
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
    return (
        <div className="animate-pulse">
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-white/10">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-4 bg-white/10 rounded flex-1"></div>
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 p-4 border-b border-white/5">
                    {Array.from({ length: cols }).map((_, colIndex) => (
                        <div key={colIndex} className="h-4 bg-white/10 rounded flex-1"></div>
                    ))}
                </div>
            ))}
        </div>
    );
};

/**
 * ButtonLoader Component
 * Inline button loading state
 */
export const ButtonLoader = () => {
    return (
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
};

export default LoadingSpinner;
