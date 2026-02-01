import React, { useState, useEffect } from 'react';
import { User, Phone, Image, Article, ArrowLeft, FloppyDisk } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        bio: '',
        photo_url: ''
    });

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/users/profile', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        name: data.name || '',
                        phone: data.phone || '',
                        bio: data.bio || '',
                        photo_url: data.photo_url || ''
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Perfil actualizado correctamente');
            } else {
                alert('Error al guardar');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        }
    };

    if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando perfil...</div>;

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: 'var(--color-bg-light)' }}>
            <div className="container" style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
                        <ArrowLeft size={24} color="var(--color-deep-navy)" />
                    </button>
                    <h2 style={{ marginLeft: '16px', color: 'var(--color-deep-navy)' }}>Mi Perfil</h2>
                </div>

                <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Photo Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%',
                            backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}>
                            {formData.photo_url ? (
                                <img src={formData.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={48} color="#999" />
                            )}
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>{user.role === 'worker' ? 'Técnico' : 'Cliente'}</span>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nombre</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={24} color="var(--color-primary)" />
                            <Input name="name" value={formData.name} onChange={handleChange} placeholder="Tu nombre completo" />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Teléfono</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={24} color="var(--color-primary)" />
                            <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="667 123 4567" type="tel" />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>URL Foto de Perfil</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Image size={24} color="var(--color-primary)" />
                            <Input name="photo_url" value={formData.photo_url} onChange={handleChange} placeholder="https://..." />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Biografía / Notas</label>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <Article size={24} color="var(--color-primary)" style={{ marginTop: '8px' }} />
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder={user.role === 'worker' ? "Cuenta tu experiencia..." : "Instrucciones para ubicar tu casa..."}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontFamily: 'inherit',
                                    minHeight: '100px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <Button onClick={handleSave}>
                            <FloppyDisk size={24} style={{ marginRight: '8px' }} />
                            Guardar Cambios
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
