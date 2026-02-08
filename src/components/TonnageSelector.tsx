import React from 'react';

interface TonnageSelectorProps {
    value: number;
    onChange: (value: number) => void;
}

const TonnageSelector: React.FC<TonnageSelectorProps> = ({ value, onChange }) => {
    const options = [
        { label: '1 Ton', value: 1, extraCost: 0 },
        { label: '1.5 Ton', value: 1.5, extraCost: 100 },
        { label: '2 Ton', value: 2, extraCost: 200 },
        { label: '3 Ton', value: 3, extraCost: 400 },
    ];

    return (
        <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.5)', padding: '16px', borderRadius: '12px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                ¿De cuántas toneladas?
            </label>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        style={{
                            flex: 1,
                            padding: '10px 4px',
                            borderRadius: '8px',
                            border: value === opt.value ? '2px solid var(--color-action-blue)' : '1px solid #CFD8DC',
                            backgroundColor: value === opt.value ? 'white' : 'transparent',
                            color: value === opt.value ? 'var(--color-action-blue)' : 'var(--color-text-secondary)',
                            fontWeight: value === opt.value ? '700' : '500',
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                            minWidth: '60px'
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TonnageSelector;
