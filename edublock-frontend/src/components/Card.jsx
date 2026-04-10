import React from 'react';

const Card = ({
    children,
    className = '',
    hover = true,
    padding = 'md',
    ...props
}) => {
    const paddings = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const hoverEffect = hover ? 'hover:scale-105 hover:shadow-glow-lg transition-transform duration-300' : '';

    return (
        <div
            className={`glass-card ${paddings[padding]} ${hoverEffect} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
