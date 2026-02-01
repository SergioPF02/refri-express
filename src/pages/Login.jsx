import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, SignIn } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        const success = await login({ email, password });
        // Navigation is handled in the component where login is called if needed, 
        // but here we need to check user role from state? 
        // Actually login function updates state. 
        // But we need to know the role to redirect. 
        // Let's modify handleLogin to wait for the state update or return the user.

        // Easier: The login function in context returns true/false. Use that.
        // But we need the ROLE to redirect.
        // Let's assume on successful login, the user data is in localStorage for now (set by context)
        // or we can read the user from the context context but state update might be async.

        // Refactor: Let context login return the user object or null.
        // Actually, for simplicity/speed let's read the stored user immediately after success, 
        // or just redirect to /home and let ProtectedRoute handle dashboard access? 
        // No, we want specific redirect. 

        if (success) {
            const storedUser = JSON.parse(localStorage.getItem('refri_user'));
            if (storedUser?.role === 'worker') {
                navigate('/dashboard');
            } else {
                navigate('/home');
            }
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    width: '64px',
                    height: '64px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: 'var(--shadow-glass)'
                }}>
                    <User size={32} color="var(--color-action-blue)" weight="duotone" />
                </div>
                <h1 style={{ fontSize: '2rem' }}>Bienvenido</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Refri-Express</p>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <User size={20} color="var(--color-text-secondary)" style={{ marginRight: '8px' }} />
                    <Input
                        placeholder="Correo Electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                    <Lock size={20} color="var(--color-text-secondary)" style={{ marginRight: '8px' }} />
                    <Input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <Button onClick={handleLogin}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <SignIn size={20} weight="bold" />
                        Iniciar Sesión
                    </div>
                </Button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>¿No tienes cuenta? </span>
                <button
                    onClick={() => navigate('/register')}
                    style={{ background: 'none', color: 'var(--color-action-blue)', fontWeight: '600', fontSize: '0.9rem' }}
                >
                    Regístrate
                </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                    onClick={() => navigate('/home')}
                    style={{ background: 'none', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}
                >
                    Entrar como invitado
                </button>
            </div>
        </div>
    );
};

export default Login;
