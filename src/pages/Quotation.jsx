import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench } from 'phosphor-react';
import Button from '../components/Button';
import Input from '../components/Input';
import TonnageSelector from '../components/TonnageSelector';
import MapSelector from '../components/MapSelector';
import { useAuth } from '../context/AuthContext';
import { MapPin } from 'phosphor-react';
import { API_URL } from '../config';

const Quotation = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [contactMethod, setContactMethod] = useState('phone');
    const [tonnage, setTonnage] = useState(1);
    const [location, setLocation] = useState({ lat: 21.1617, lng: -86.8510 }); // Default Cancun
    const [address, setAddress] = useState('');
    const [addressDetails, setAddressDetails] = useState(''); // New field for specific details
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [customContact, setCustomContact] = useState(''); // Stores phone or email input

    const handleSubmit = async (e) => {
        e.preventDefault();

        let contactPhone = (contactMethod === 'phone' || contactMethod === 'whatsapp') ? customContact : null;
        let finalEmail = (contactMethod === 'email') ? customContact : (user?.email || 'guest');

        // Format address: Street + Details + Rest of address
        const parts = address.split(',');
        const street = parts[0];
        const rest = parts.slice(1).join(',');
        const formattedAddress = `${street} ${addressDetails},${rest}`;

        const quotationData = {
            service: 'Reparación',
            description,
            price: 0, // 0 indicates it needs a quote
            address: formattedAddress,
            lat: location.lat,
            lng: location.lng,
            tonnage,
            contact_method: contactMethod,
            phone: contactPhone,
            user_email: finalEmail,
            name: user?.name || 'Guest', // Keep name for consistency with original
            date: null, // Keep date for consistency with original
            time: null // Keep time for consistency with original
        };

        try {
            const response = await fetch(`${API_URL}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationData)
            });

            if (response.ok) {
                alert('Solicitud de cotización enviada. Nos pondremos en contacto contigo pronto.');
                navigate('/success', { state: quotationData });
            } else {
                alert('Hubo un error al enviar la solicitud.');
            }
        } catch (error) {
            console.error('Error submitting quotation:', error);
            alert('Error de conexión.');
        }
    };

    return (
        <div className="container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={() => navigate('/booking')} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={24} color="var(--color-deep-navy)" />
                </button>
                <h2 style={{ marginLeft: '16px', color: 'var(--color-deep-navy)' }}>Cotizar Reparación</h2>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '50%' }}>
                        <Wrench size={48} color="var(--color-action-blue)" weight="duotone" />
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#666', marginBottom: '24px' }}>
                    Cuéntanos qué problema tiene tu equipo y te contactaremos con un presupuesto estimado.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Descripción del problema</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: El aire no enfría, hace ruido extraño..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                minHeight: '120px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                            required
                        />
                    </div>

                    <TonnageSelector value={tonnage} onChange={setTonnage} />

                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={20} /> Ubicación
                        </h3>
                        <div style={{ position: 'relative' }}>
                            <Input
                                placeholder="Referencia o dirección breve"
                                value={address}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setAddress(val);
                                    if (val.length > 3) {
                                        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}&countrycodes=mx`)
                                            .then(res => res.json())
                                            .then(data => {
                                                setSuggestions(data);
                                                setShowSuggestions(true);
                                            })
                                            .catch(console.error);
                                    } else {
                                        setSuggestions([]);
                                        setShowSuggestions(false);
                                    }
                                }}
                                onFocus={() => address.length > 3 && setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
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
                                                setAddress(s.display_name);
                                                setLocation({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                                                setShowSuggestions(false);
                                            }}
                                            style={{
                                                padding: '12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #eee',
                                                fontSize: '0.9rem',
                                                color: 'black'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                        >
                                            {s.display_name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>Número Exterior / Interior y Referencias:</label>
                            <Input
                                placeholder="Ej: Lote 5, Casa 12, portón blanco..."
                                value={addressDetails}
                                onChange={(e) => setAddressDetails(e.target.value)}
                            />
                        </div>

                        <MapSelector
                            lat={location.lat}
                            lng={location.lng}
                            onLocationChange={setLocation}
                        />
                    </div>

                    <div style={{ marginBottom: '24px', marginTop: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Prefiero ser contactado por:</label>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="contact"
                                    value="phone"
                                    checked={contactMethod === 'phone'}
                                    onChange={() => setContactMethod('phone')}
                                />
                                Llamada
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="contact"
                                    value="whatsapp"
                                    checked={contactMethod === 'whatsapp'}
                                    onChange={() => setContactMethod('whatsapp')}
                                />
                                WhatsApp
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="contact"
                                    value="email"
                                    checked={contactMethod === 'email'}
                                    onChange={() => setCustomContact('') || setContactMethod('email')}
                                />
                                Correo
                            </label>
                        </div>
                    </div>

                    {/* Conditional Inputs */}
                    {(contactMethod === 'phone' || contactMethod === 'whatsapp') && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Número de Teléfono (10 dígitos)</label>
                            <Input
                                type="tel"
                                placeholder="Ej: 6671234567"
                                value={customContact}
                                onChange={(e) => setCustomContact(e.target.value)}
                                required
                                maxLength={10}
                            />
                        </div>
                    )}

                    {contactMethod === 'email' && (
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Correo Electrónico</label>
                            <Input
                                type="email"
                                placeholder="tu@correo.com"
                                value={customContact}
                                onChange={(e) => setCustomContact(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <Button type="submit">Enviar Solicitud</Button>
                </form>
            </div >
        </div >
    );
};

export default Quotation;
