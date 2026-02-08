import React, { useState, useEffect, ChangeEvent } from 'react';
import { User, Phone, Image, Article, ArrowLeft, FloppyDisk, MapPin } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import MapSelector from '../components/MapSelector';
import { API_URL } from '../config';

interface NominatimResult {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
}

interface ProfileFormData {
    name: string;
    phone: string;
    bio: string;
    photo_url: string;
    default_address: string;
    default_lat: number;
    default_lng: number;
}

const Profile = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<ProfileFormData>({
        name: '',
        phone: '',
        bio: '',
        photo_url: '',
        default_address: '',
        default_lat: 24.809065,
        default_lng: -107.394017
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Address Autocomplete
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/api/users/profile`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setFormData({
                        name: data.name || '',
                        phone: data.phone || '',
                        bio: data.bio || '',
                        photo_url: data.photo_url || '',
                        default_address: data.default_address || '',
                        default_lat: data.default_lat || 24.809065,
                        default_lng: data.default_lng || -107.394017
                    });
                    setPreviewUrl(null);
                    setSelectedFile(null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Address Autocomplete Logic (Debounced)
    useEffect(() => {
        if (formData.default_address && formData.default_address.length > 3) {
            const timeoutId = setTimeout(() => {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${formData.default_address}&countrycodes=mx`)
                    .then(res => res.json())
                    .then((data: NominatimResult[]) => {
                        setSuggestions(data);
                        setShowSuggestions(true);
                    })
                    .catch(console.error);
            }, 500);
            return () => clearTimeout(timeoutId);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [formData.default_address]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setSelectedFile(null);
            setPreviewUrl(null);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('phone', formData.phone);
            data.append('bio', formData.bio);
            data.append('default_address', formData.default_address);
            data.append('default_lat', formData.default_lat.toString());
            data.append('default_lng', formData.default_lng.toString());

            if (formData.photo_url && !selectedFile) data.append('photo_url', formData.photo_url);
            if (selectedFile) {
                data.append('photo', selectedFile);
            }

            const response = await fetch(`${API_URL}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                },
                body: data
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setFormData(prev => ({ ...prev, photo_url: updatedUser.photo_url }));
                setPreviewUrl(null);
                setSelectedFile(null);

                // Update Globally
                updateUser({ ...user, ...updatedUser });

                alert('Perfil actualizado correctamente');
            } else {
                const err = await response.text();
                console.error("Save Error:", err);
                alert('Error al guardar: ' + err);
            }
        } catch (err: any) {
            console.error(err);
            alert('Error de conexión: ' + err.message);
        }
    };

    if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando perfil...</div>;

    if (!user) return <div>No user logged in</div>;

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
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Dirección Predeterminada</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={24} color="var(--color-primary)" />
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <Input
                                        name="default_address"
                                        value={formData.default_address}
                                        onChange={(e) => {
                                            handleChange(e);
                                            setShowSuggestions(true);
                                        }}
                                        placeholder="Busca tu dirección..."
                                        onFocus={() => setShowSuggestions(true)}
                                    />
                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: 'white',
                                            border: '1px solid #ddd',
                                            borderRadius: '0 0 8px 8px',
                                            listStyle: 'none',
                                            padding: 0,
                                            margin: 0,
                                            zIndex: 1000,
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                        }}>
                                            {suggestions.map((s) => (
                                                <li
                                                    key={s.place_id}
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            default_address: s.display_name,
                                                            default_lat: parseFloat(s.lat),
                                                            default_lng: parseFloat(s.lon)
                                                        });
                                                        setShowSuggestions(false);
                                                    }}
                                                    style={{
                                                        padding: '12px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #eee',
                                                        fontSize: '0.9rem'
                                                    }}
                                                    onMouseEnter={(e: React.MouseEvent<HTMLLIElement>) => (e.target as HTMLLIElement).style.backgroundColor = '#f5f5f5'}
                                                    onMouseLeave={(e: React.MouseEvent<HTMLLIElement>) => (e.target as HTMLLIElement).style.backgroundColor = 'white'}
                                                >
                                                    {s.display_name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div style={{ height: '200px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
                                <MapSelector
                                    lat={parseFloat(formData.default_lat.toString())}
                                    lng={parseFloat(formData.default_lng.toString())}
                                    onLocationChange={(pos) => setFormData({ ...formData, default_lat: pos.lat, default_lng: pos.lng })}
                                />
                            </div>
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
