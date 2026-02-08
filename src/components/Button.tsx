import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: 'primary' | 'secondary';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const baseStyle: React.CSSProperties = {
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        width: '100%',
        fontWeight: '600',
        fontSize: '1rem',
        transition: 'transform 0.1s ease, filter 0.2s',
        border: 'none',
        cursor: 'pointer'
    };

    const variants: Record<string, React.CSSProperties> = {
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
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1)'}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
