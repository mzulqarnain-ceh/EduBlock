import React from 'react';

const FloatingBackground = () => {
    // Reduced to 12 elegant items (from 26) for better performance
    // Using pure CSS animations instead of Framer Motion for GPU acceleration
    const floatingItems = [
        // Educational items
        { emoji: '📚', size: '1.875rem', left: '5%', top: '15%', duration: '18s', delay: '0s', opacity: 0.15 },
        { emoji: '✏️', size: '1.5rem', left: '15%', top: '45%', duration: '22s', delay: '2s', opacity: 0.12 },
        { emoji: '📖', size: '2.25rem', left: '85%', top: '20%', duration: '20s', delay: '1s', opacity: 0.1 },
        { emoji: '🎓', size: '2.25rem', left: '75%', top: '80%', duration: '23s', delay: '2s', opacity: 0.08 },
        { emoji: '📝', size: '1.875rem', left: '8%', top: '75%', duration: '19s', delay: '4s', opacity: 0.1 },

        // Blockchain items
        { emoji: '⛓️', size: '1.875rem', left: '65%', top: '40%', duration: '24s', delay: '3s', opacity: 0.12 },
        { emoji: '🔗', size: '1.5rem', left: '35%', top: '60%', duration: '20s', delay: '4s', opacity: 0.1 },
        { emoji: '🔒', size: '1.25rem', left: '55%', top: '90%', duration: '22s', delay: '0s', opacity: 0.12 },
        { emoji: '🛡️', size: '1.875rem', left: '3%', top: '35%', duration: '26s', delay: '2s', opacity: 0.1 },
        { emoji: '💎', size: '1.25rem', left: '40%', top: '25%', duration: '23s', delay: '5s', opacity: 0.08 },
        { emoji: '🔷', size: '1.5rem', left: '80%', top: '45%', duration: '22s', delay: '4s', opacity: 0.08 },
        { emoji: '📜', size: '1.875rem', left: '50%', top: '70%', duration: '25s', delay: '2s', opacity: 0.1 },
    ];

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {floatingItems.map((item, index) => (
                <div
                    key={index}
                    className="floating-item"
                    style={{
                        left: item.left,
                        top: item.top,
                        opacity: item.opacity,
                        fontSize: item.size,
                        animationDuration: item.duration,
                        animationDelay: item.delay,
                        filter: 'grayscale(30%) sepia(50%) saturate(150%)',
                    }}
                >
                    {item.emoji}
                </div>
            ))}

            {/* Subtle golden particles — reduced to 5 */}
            {[...Array(5)].map((_, i) => (
                <div
                    key={`particle-${i}`}
                    className="floating-particle"
                    style={{
                        left: `${10 + i * 18}%`,
                        top: `${15 + (i % 3) * 30}%`,
                        animationDuration: `${8 + i * 2}s`,
                        animationDelay: `${i * 0.5}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default FloatingBackground;
