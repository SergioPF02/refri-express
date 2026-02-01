import React from 'react';

const Input = ({ label, type = 'text', placeholder, value, onChange, name }) => {
    return (
        <div style={{ marginBottom: '16px', width: '100%' }}>
            {label && (
                <label
                    style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: 'var(--color-text-secondary)'
                    }}
                >
                    {label}
                </label>
            )}
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #CFD8DC',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--color-text-main)'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-action-blue)'}
                onBlur={(e) => e.target.style.borderColor = '#CFD8DC'}
            />
        </div>
    );
};

export default Input;
