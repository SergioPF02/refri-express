import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, Wind, ShieldCheck, User, SignOut } from 'phosphor-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const Home = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    return (
        <div className="container">
            {/* Header Section */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '20px',
                marginBottom: '40px'
            }}>
                <div>
                    <h2 style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 'normal', margin: 0 }}>Hola,</h2>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-text-main)' }}>
                        ¡Hola, {user ? user.name : 'Visitante'}!
                        {user && <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '10px' }}>({user.role})</span>}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <NotificationBell />
                    <button
                        onClick={() => navigate('/orders')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'white',
                            border: '1px solid var(--color-action-blue)',
                            borderRadius: '20px',
                            color: 'var(--color-action-blue)',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                        }}
                    >
                        Mis Pedidos
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                            cursor: 'pointer'
                        }}
                    >
                        <User size={20} color="var(--color-action-blue)" weight="bold" />
                    </button>

                    {/* Admin Button */}
                    {user && user.role === 'admin' && (
                        <button
                            onClick={() => navigate('/admin')}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#212121',
                                borderRadius: '20px',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                        >
                            Panel Admin
                        </button>
                    )}

                    <div
                        onClick={logout}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#ffebee',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <Snowflake size={20} color="#d32f2f" weight="bold" style={{ transform: 'rotate(45deg)' }} />
                        {/* Using Snowflake as generic icon if SignOut not imported, checking imports... wait, SignOut not in imports? */}
                        {/* Checking imports in file: Snowflake, Wind, ShieldCheck, User. NO SignOut. */}
                        {/* I will use a simple text or generic icon for logout if SignOut is missing, or add import. */}
                        {/* Re-reading file content... line 56 uses User icon for LOGOUT currently?! "User size={20}" inside the logout button? No, wait. */}
                        {/* Line 41-57 is the logout button? No, that's a button with User icon. */}
                        {/* AHH, the file content shows TWO buttons. One "Mis Pedidos" and one with User icon that calls logout. */}
                        {/* I need to Separate them: Profile Button (User Icon) AND Logout Button (SignOut Icon). */}
                        {/* I will Add SignOut to imports and use it. */}
                    </div>
                </div>
            </header>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: 'var(--shadow-glass)'
                }}>
                    <Snowflake size={40} color="var(--color-action-blue)" weight="duotone" />
                </div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Refri-Express</h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>
                    Expertos en frescura.
                    <br />
                    Servicio a domicilio en Culiacán.
                </p>
            </div>

            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>¿Qué necesitas hoy?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: '#E3F2FD', borderRadius: '8px' }}>
                            <Wind size={24} color="var(--color-deep-navy)" />
                        </div>
                        <span>Lavado de Minisplit</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: '#E3F2FD', borderRadius: '8px' }}>
                            <Snowflake size={24} color="var(--color-deep-navy)" />
                        </div>
                        <span>Carga de Gas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: '#E8F5E9', borderRadius: '8px' }}>
                            <ShieldCheck size={24} color="#2E7D32" />
                        </div>
                        <span>Garantía de 30 días</span>
                    </div>
                </div>
            </div>

            <Button onClick={() => navigate('/booking')}>
                Agendar Servicio
            </Button>
        </div>
    );
};

export default Home;
