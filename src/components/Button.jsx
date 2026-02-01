import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseStyle = {
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        fontWeight: '600',
        fontSize: '1rem',
        transition: 'transform 0.1s ease, filter 0.2s',
    };

    const variants = {
        primary: {
            backgroundColor: 'var(--color-action-blue)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(2, 136, 209, 0.4)',
        },
        secondary: {
            backgroundColor: 'white',
            color: 'var(--color-action-blue)',
            border: '2px solid var(--color-action-blue)',
        },
    };

    return (
        <button
            style={{ ...baseStyle, ...variants[variant] }}
            onClick={onClick}
            className={className}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
