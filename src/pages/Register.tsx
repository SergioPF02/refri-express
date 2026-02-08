import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';


interface RegisterErrors {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
}

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [role, setRole] = useState<'client' | 'worker'>('client');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: ''
    });

    // Validation States
    const [errors, setErrors] = useState<RegisterErrors>({});

    // Helpers
    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const getPasswordStrength = (pass: string) => {
        if (!pass) return 0;
        let score = 0;
        if (pass.length > 5) score += 1;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1; // has uppercase
        if (/[0-9]/.test(pass)) score += 1; // has number
        return score; // 0 to 4
    };

    const passwordStrength = getPasswordStrength(formData.password);

    const getStrengthColor = () => {
        if (passwordStrength < 2) return 'red';
        if (passwordStrength < 3) return 'orange';
        return '#00C853'; // Green
    };

    const getStrengthLabel = () => {
        if (passwordStrength < 2) return 'Débil';
        if (passwordStrength < 3) return 'Media';
        return 'Fuerte';
    };

    const handleSubmit = async () => {
        setErrors({});
        const newErrors: RegisterErrors = {};

        if (!formData.name) newErrors.name = "El nombre es obligatorio.";
        if (!formData.phone) newErrors.phone = "El teléfono es obligatorio.";
        if (!validateEmail(formData.email)) newErrors.email = "Correo inválido.";
        if (formData.password.length < 8) newErrors.password = "La contraseña debe tener al menos 8 caracteres.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        // Ensure the object passed matches what register expects. 
        // register in AuthContext typically expects { name, email, password, role, phone? }
        const newUser = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: role,
            phone: formData.phone
        };

        const success = await register(newUser);
        setLoading(false);

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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <Input
                            label="Nombre Completo"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={role === 'client' ? "Tu Nombre" : "Nombre del Técnico"}
                        />
                        {errors.name && <span style={{ color: 'red', fontSize: '0.8rem', marginLeft: '4px' }}>{errors.name}</span>}
                    </div>

                    <div>
                        <Input
                            label="Teléfono"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Ej. 55 1234 5678"
                            type="tel"
                        />
                        {errors.phone && <span style={{ color: 'red', fontSize: '0.8rem', marginLeft: '4px' }}>{errors.phone}</span>}
                    </div>

                    <div>
                        <Input
                            label="Correo Electrónico"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="ejemplo@correo.com"
                            type="email"
                        />
                        {errors.email && <span style={{ color: 'red', fontSize: '0.8rem', marginLeft: '4px' }}>{errors.email}</span>}
                    </div>

                    <div>
                        <Input
                            label="Contraseña"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Al menos 8 caracteres"
                        />

                        {/* Password Strength Meter */}
                        {formData.password && (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{
                                    height: '4px',
                                    width: '100%',
                                    backgroundColor: '#e0e0e0',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(passwordStrength / 4) * 100}%`,
                                        backgroundColor: getStrengthColor(),
                                        transition: 'width 0.3s ease, background-color 0.3s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Seguridad:</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: getStrengthColor() }}>
                                        {getStrengthLabel()}
                                    </span>
                                </div>
                            </div>
                        )}
                        {errors.password && <span style={{ color: 'red', fontSize: '0.8rem', marginLeft: '4px' }}>{errors.password}</span>}
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Registrando...' : `Registrarme como ${role === 'client' ? 'Cliente' : 'Técnico'}`}
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
