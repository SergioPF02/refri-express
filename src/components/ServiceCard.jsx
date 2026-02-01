import React from 'react';

const ServiceCard = ({ icon, title, price, isSelected, onClick, image }) => {
    return (
        <div
            onClick={onClick}
            className={`glass-card`}
            style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--color-action-blue)' : '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: isSelected ? 'rgba(225, 245, 254, 0.8)' : 'rgba(255, 255, 255, 0.65)',
                transition: 'all 0.2s ease',
                height: '180px',
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {image && (
                <div style={{ width: '100%', height: '90px', overflow: 'hidden' }}>
                    <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            )}

            <div style={{ padding: '12px', textAlign: 'center', width: '100%' }}>
                {!image && <div style={{ color: 'var(--color-action-blue)', marginBottom: '10px' }}>{icon}</div>}
                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{title}</h3>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                    {price}
                </span>
            </div>
        </div>
    );
};

export default ServiceCard;
