import React from 'react';
import { motion } from 'framer-motion';

const FloatingBackground = () => {
    // Educational + Blockchain emojis with positions and animation settings
    const floatingItems = [
        // Educational items
        { emoji: '📚', size: 'text-3xl', left: '5%', top: '15%', duration: 18, delay: 0, opacity: 0.15 },
        { emoji: '✏️', size: 'text-2xl', left: '15%', top: '45%', duration: 22, delay: 2, opacity: 0.12 },
        { emoji: '📖', size: 'text-4xl', left: '85%', top: '20%', duration: 20, delay: 1, opacity: 0.1 },
        { emoji: '🖊️', size: 'text-2xl', left: '92%', top: '55%', duration: 25, delay: 3, opacity: 0.12 },
        { emoji: '📝', size: 'text-3xl', left: '8%', top: '75%', duration: 19, delay: 4, opacity: 0.1 },
        { emoji: '🎓', size: 'text-4xl', left: '75%', top: '80%', duration: 23, delay: 2, opacity: 0.08 },
        { emoji: '📒', size: 'text-2xl', left: '45%', top: '10%', duration: 21, delay: 5, opacity: 0.1 },
        { emoji: '✒️', size: 'text-xl', left: '25%', top: '85%', duration: 17, delay: 1, opacity: 0.12 },

        // Blockchain items
        { emoji: '⛓️', size: 'text-3xl', left: '65%', top: '40%', duration: 24, delay: 3, opacity: 0.12 },
        { emoji: '🔗', size: 'text-2xl', left: '35%', top: '60%', duration: 20, delay: 4, opacity: 0.1 },
        { emoji: '🔒', size: 'text-xl', left: '55%', top: '90%', duration: 22, delay: 0, opacity: 0.12 },
        { emoji: '🛡️', size: 'text-3xl', left: '3%', top: '35%', duration: 26, delay: 2, opacity: 0.1 },
        { emoji: '🌐', size: 'text-2xl', left: '88%', top: '70%', duration: 19, delay: 1, opacity: 0.12 },
        { emoji: '💎', size: 'text-xl', left: '40%', top: '25%', duration: 23, delay: 5, opacity: 0.08 },
        { emoji: '🔐', size: 'text-2xl', left: '70%', top: '5%', duration: 21, delay: 3, opacity: 0.1 },
        { emoji: '⚡', size: 'text-xl', left: '20%', top: '30%', duration: 18, delay: 1, opacity: 0.1 },
        { emoji: '🔷', size: 'text-2xl', left: '80%', top: '45%', duration: 22, delay: 4, opacity: 0.08 },
        { emoji: '📜', size: 'text-3xl', left: '50%', top: '70%', duration: 25, delay: 2, opacity: 0.1 },
    ];

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {floatingItems.map((item, index) => (
                <motion.div
                    key={index}
                    className={`absolute ${item.size}`}
                    style={{
                        left: item.left,
                        top: item.top,
                        opacity: item.opacity,
                        filter: 'grayscale(30%) sepia(50%) saturate(150%)',
                    }}
                    animate={{
                        y: [0, -30, 0, 30, 0],
                        x: [0, 15, 0, -15, 0],
                        rotate: [0, 5, 0, -5, 0],
                        scale: [1, 1.05, 1, 0.95, 1],
                    }}
                    transition={{
                        duration: item.duration,
                        delay: item.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    {item.emoji}
                </motion.div>
            ))}

            {/* Subtle golden particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-amber-400/20"
                    style={{
                        left: `${10 + i * 12}%`,
                        top: `${15 + (i % 3) * 30}%`,
                    }}
                    animate={{
                        y: [0, -50, 0],
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: 8 + i * 2,
                        delay: i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};

export default FloatingBackground;
