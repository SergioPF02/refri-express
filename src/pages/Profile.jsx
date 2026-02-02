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
        photo_url: '' // Holds string URL from DB
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

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
                    setPreviewUrl(null); // Clear preview when new data is fetched
                    setSelectedFile(null); // Clear selected file when new data is fetched
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    };

    const handleSave = async () => {
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('bio', formData.bio);
            if (formData.photo_url && !selectedFile) data.append('photo_url', formData.photo_url);
            if (selectedFile) {
                data.append('photo', selectedFile);
                // We don't send photo_url if we are sending a new photo, backend will generate new one
            }

            const response = await fetch('http://localhost:5000/api/users/profile', {
                method: 'PUT',
                headers: {
                    // 'Content-Type': 'multipart/form-data', // DO NOT set content-type manually with FormData, browser does it with boundary
                    'Authorization': `Bearer ${user.token}`
                },
                body: data
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setFormData(prev => ({ ...prev, photo_url: updatedUser.photo_url }));
                setPreviewUrl(null);
                setSelectedFile(null);
                // Update local storage too to keep session sync
                const newSession = { ...user, ...updatedUser };
                localStorage.setItem('refri_user', JSON.stringify(newSession));

                alert('Perfil actualizado correctamente');
                // Force reload or re-fetch (optional)
            } else {
                const err = await response.text();
                console.error("Save Error:", err);
                alert('Error al guardar: ' + err);
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión: ' + err.message);
        }
    };

    if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando perfil...</div>;

    const displayImage = previewUrl || formData.photo_url;

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

                    {/* Photo Upload */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            backgroundColor: '#e0e0e0', overflow: 'hidden', marginBottom: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            position: 'relative'
                        }}>
                            {displayImage ? (
                                <img src={displayImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User size={48} color="#999" />
                            )}
                        </div>

                        <label
                            htmlFor="photo-upload"
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#E3F2FD',
                                color: 'var(--color-action-blue)',
                                borderRadius: '20px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Image size={20} />
                            Cambiar Foto
                        </label>
                        <input
                            id="photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>{user.role === 'worker' ? 'Técnico' : 'Cliente'}</span>
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
                        <Button onClick={async () => {
                            console.log("Button Clicked"); // Debug
                            await handleSave();
                        }}>
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
