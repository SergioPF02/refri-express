import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Briefcase, IdentificationCard } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [role, setRole] = useState('client'); // 'client' or 'worker'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.password) return;

        const newUser = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: role
        };

        const success = await register(newUser);

        if (success) {
            if (role === 'worker') {
                navigate('/dashboard');
            } else {
                navigate('/home');
            }
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem' }}>Crear Cuenta</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Únete a Refri-Express</p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
                {/* Role Selector */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button
                        onClick={() => setRole('client')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: role === 'client' ? '2px solid var(--color-action-blue)' : '1px solid #CFD8DC',
                            backgroundColor: role === 'client' ? 'rgba(225, 245, 254, 0.5)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <User size={24} color={role === 'client' ? 'var(--color-action-blue)' : 'var(--color-text-secondary)'} />
                        <span style={{ fontWeight: role === 'client' ? '600' : '400', fontSize: '0.9rem' }}>Cliente</span>
                    </button>

                    <button
                        onClick={() => setRole('worker')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: role === 'worker' ? '2px solid var(--color-action-blue)' : '1px solid #CFD8DC',
                            backgroundColor: role === 'worker' ? 'rgba(225, 245, 254, 0.5)' : 'transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Briefcase size={24} color={role === 'worker' ? 'var(--color-action-blue)' : 'var(--color-text-secondary)'} />
                        <span style={{ fontWeight: role === 'worker' ? '600' : '400', fontSize: '0.9rem' }}>Técnico</span>
                    </button>
                </div>

                <Input
                    label="Nombre Completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={role === 'client' ? "Tu Nombre" : "Nombre del Técnico"}
                />
                <Input
                    label="Correo Electrónico"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ejemplo@correo.com"
                />
                <Input
                    label="Contraseña"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                />

                <div style={{ marginTop: '24px' }}>
                    <Button onClick={handleSubmit}>
                        Registrarme como {role === 'client' ? 'Cliente' : 'Técnico'}
                    </Button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>¿Ya tienes cuenta? </span>
                <button
                    onClick={() => navigate('/')}
                    style={{ background: 'none', color: 'var(--color-action-blue)', fontWeight: '600', fontSize: '0.9rem' }}
                >
                    Iniciar Sesión
                </button>
            </div>
        </div>
    );
};

export default Register;
