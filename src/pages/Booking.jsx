import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Drop, Fire, Wrench, Calendar, MapPin, User, Trash, X, Plus, Minus } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import ServiceCard from '../components/ServiceCard';
import Input from '../components/Input';
import TonnageSelector from '../components/TonnageSelector';
import MapSelector from '../components/MapSelector';
import serviceCleaning from '../assets/service-cleaning.png';
import serviceGas from '../assets/service-gas.png';

const Booking = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [takenSlots, setTakenSlots] = useState([]);

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    // Cart State
    const [cart, setCart] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempItem, setTempItem] = useState({ service: '', tonnage: 1, quantity: 1 });

    const [formData, setFormData] = useState({
        date: '',
        time: '',
        address: '',
        addressDetails: '',
        lat: 24.809065,
        lng: -107.394017,
        name: '',
        phone: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name || '' }));
        }
    }, [user]);

    // Fetch taken slots when date changes
    useEffect(() => {
        if (formData.date) {
            fetch(`http://localhost:5000/api/bookings/availability?date=${formData.date}`)
                .then(res => res.json())
                .then(setTakenSlots)
                .catch(console.error);
        }
    }, [formData.date]);

    // Address Autocomplete Logic
    useEffect(() => {
        if (formData.address.length > 3) {
            const timeoutId = setTimeout(() => {
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${formData.address}&countrycodes=mx`)
                    .then(res => res.json())
                    .then(data => {
                        setSuggestions(data);
                        setShowSuggestions(true);
                    })
                    .catch(console.error);
            }, 500); // 500ms debounce
            return () => clearTimeout(timeoutId);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [formData.address]);

    const calculateItemPrice = (service, tons, qty) => {
        let base = 0;
        if (service === 'Lavado') base = 450;
        if (service === 'Gas') base = 800;
        if (service === 'Reparación') return 0; // Cotizar

        if (service !== 'Reparación') {
            if (tons === 1.5) base += 100;
            if (tons === 2) base += 200;
            if (tons === 3) base += 400;
        }
        return base * qty;
    };

    const openServiceModal = (service) => {
        setTempItem({ service, tonnage: 1, quantity: 1 });
        setIsModalOpen(true);
    };

    const addToCart = () => {
        const price = calculateItemPrice(tempItem.service, tempItem.tonnage, tempItem.quantity);
        const newItem = { ...tempItem, price, id: Date.now() };
        setCart([...cart, newItem]);
        setIsModalOpen(false);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const getTotalPrice = () => cart.reduce((acc, item) => acc + item.price, 0);

    const nextStep = () => {
        setDirection(1);
        setStep(step + 1);
    };

    const prevStep = () => {
        setDirection(-1);
        setStep(step - 1);
    };

    const handleNext = async () => {
        if (step < 3) {
            nextStep();
        } else {
            try {
                // Build Description from Cart
                const descriptionItems = cart.map(item => {
                    const tons = item.service !== 'Reparación' ? `(${item.tonnage} Ton)` : '';
                    return `${item.quantity}x ${item.service} ${tons}`;
                });
                const fullDescription = descriptionItems.join(', ');
                const totalPrice = getTotalPrice();
                const primaryService = cart.length === 1 ? cart[0].service : 'Múltiple';

                // Determine max tonnage for blocking rules (simulated)
                // We'll take the max tonnage from the cart to be safe for blocking
                const maxTonnage = Math.max(...cart.map(i => i.tonnage || 0));

                // Format address
                const parts = formData.address.split(',');
                const street = parts[0];
                const rest = parts.slice(1).join(',');
                const formattedAddress = `${street} ${formData.addressDetails || ''},${rest}`;

                const bookingData = {
                    ...formData,
                    formattedAddress, // Note: backend expects 'address', fixed below
                    address: formattedAddress,
                    service: primaryService,
                    description: fullDescription,
                    price: totalPrice,
                    tonnage: maxTonnage, // For blocking logic
                    user_email: user?.email || 'guest'
                };

                const response = await fetch('http://localhost:5000/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    navigate('/success', { state: bookingData });
                } else {
                    alert('Error al agendar.');
                }
            } catch (err) {
                console.error(err);
                alert('Error connecting to server');
            }
        }
    };

    return (
        <div className="container" style={{ overflowX: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={() => step > 1 ? prevStep() : navigate('/home')} style={{ background: 'none', padding: 0 }}>
                    <ArrowLeft size={24} color="var(--color-deep-navy)" />
                </button>
                <h2 style={{ marginLeft: '16px' }}>
                    {step === 1 ? 'Arma tu Pedido' : step === 2 ? '¿Cuándo vamos?' : 'Tus datos'}
                </h2>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            backgroundColor: s <= step ? 'var(--color-action-blue)' : '#CFD8DC',
                            transition: 'background-color 0.3s ease'
                        }}
                    />
                ))}
            </div>

            <AnimatePresence initial={false} custom={direction} mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    >
                        {/* Service Selection Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <ServiceCard
                                image={serviceCleaning}
                                icon={<Drop size={32} weight="duotone" />}
                                title="Lavado"
                                price="$450+"
                                onClick={() => openServiceModal('Lavado')}
                            />
                            <ServiceCard
                                image={serviceGas}
                                icon={<Fire size={32} weight="duotone" />}
                                title="Gas"
                                price="$800+"
                                onClick={() => openServiceModal('Gas')}
                            />
                            <ServiceCard
                                icon={<Wrench size={32} weight="duotone" />}
                                title="Reparación"
                                price="Cotizar"
                                onClick={() => openServiceModal('Reparación')}
                            />
                        </div>

                        {/* Cart Summary */}
                        {cart.length > 0 && (
                            <div className="glass-card" style={{ padding: '20px' }}>
                                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Tu Pedido</h3>
                                {cart.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{item.service} {item.service !== 'Reparación' && `(${item.tonnage} Ton)`}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#666' }}>Cantidad: {item.quantity}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--color-action-blue)' }}>
                                                {item.price > 0 ? `$${item.price}` : 'Por Cotizar'}
                                            </span>
                                            <button onClick={() => removeFromCart(item.id)} style={{ color: '#ff5252', background: 'none', border: 'none', cursor: 'pointer' }}>
                                                <Trash size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #f0f0f0' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total Estimado:</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>${getTotalPrice()}</span>
                                </div>
                            </div>
                        )}

                        {/* Service Config Modal */}
                        {isModalOpen && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                                <div className="glass-card" style={{ width: '90%', maxWidth: '350px', padding: '24px', position: 'relative', backgroundColor: 'white' }}>
                                    <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <X size={24} />
                                    </button>

                                    <h3 style={{ marginBottom: '20px' }}>Configurar {tempItem.service}</h3>

                                    {tempItem.service !== 'Reparación' && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tamaño (Toneladas)</label>
                                            <TonnageSelector
                                                value={tempItem.tonnage}
                                                onChange={(t) => setTempItem({ ...tempItem, tonnage: t })}
                                            />
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Cantidad</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <button
                                                onClick={() => setTempItem(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                                                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #ddd', background: 'white' }}
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tempItem.quantity}</span>
                                            <button
                                                onClick={() => setTempItem(p => ({ ...p, quantity: p.quantity + 1 }))}
                                                style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-action-blue)', color: 'white', border: 'none' }}
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '24px' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            {tempItem.service === 'Reparación' ? 'Precio Base: $0' :
                                                `$${calculateItemPrice(tempItem.service, tempItem.tonnage, tempItem.quantity)}`
                                            }
                                        </div>
                                        <Button onClick={addToCart}>Agregar a la Orden</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    >
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={20} /> Fecha y Hora
                            </h3>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                            />

                            {formData.date && (
                                <>
                                    <h4 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '0.9rem', color: '#666' }}>Horarios Disponibles (10:00 - 16:00):</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                        {(() => {
                                            const slots = [];
                                            for (let hour = 10; hour <= 16; hour++) {
                                                slots.push(`${hour}:00`);
                                                if (hour < 16) slots.push(`${hour}:30`);
                                            }
                                            return slots.map(time => {
                                                const isTaken = takenSlots.includes(time);
                                                const isSelected = formData.time === time;
                                                return (
                                                    <button
                                                        key={time}
                                                        disabled={isTaken}
                                                        onClick={() => setFormData({ ...formData, time })}
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '8px',
                                                            border: isSelected ? '2px solid var(--color-action-blue)' : '1px solid #ddd',
                                                            backgroundColor: isSelected ? '#E3F2FD' : (isTaken ? '#f5f5f5' : 'white'),
                                                            color: isTaken ? '#ccc' : (isSelected ? 'var(--color-action-blue)' : '#333'),
                                                            cursor: isTaken ? 'not-allowed' : 'pointer',
                                                            fontWeight: isSelected ? 'bold' : 'normal',
                                                            textDecoration: isTaken ? 'line-through' : 'none',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    >
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={20} /> Ubicación
                            </h3>
                            <div style={{ position: 'relative' }}>
                                <Input
                                    placeholder="Dirección completa"
                                    value={formData.address}
                                    onChange={(e) => {
                                        setFormData({ ...formData, address: e.target.value });
                                        setShowSuggestions(true);
                                    }}
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
                                                        address: s.display_name,
                                                        lat: parseFloat(s.lat),
                                                        lng: parseFloat(s.lon)
                                                    });
                                                    setShowSuggestions(false);
                                                }}
                                                style={{
                                                    padding: '12px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #eee',
                                                    fontSize: '0.9rem'
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
                                <Input
                                    placeholder="Número Exterior / Interior y Referencias"
                                    value={formData.addressDetails || ''}
                                    onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
                                />
                            </div>

                            <MapSelector
                                lat={formData.lat}
                                lng={formData.lng}
                                onLocationChange={(pos) => setFormData({ ...formData, lat: pos.lat, lng: pos.lng })}
                            />

                            <h3 style={{ marginBottom: '16px', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={20} /> Contacto
                            </h3>
                            <Input
                                placeholder="Tu Nombre"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <Input
                                placeholder="Teléfono"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ marginTop: 'auto', paddingTop: '40px', zIndex: 10, position: 'relative' }}>
                <Button
                    onClick={handleNext}
                    disabled={
                        (step === 1 && cart.length === 0) ||
                        (step === 2 && (!formData.date || !formData.time)) ||
                        (step === 3 && (!formData.address || !formData.addressDetails || !formData.name || !formData.phone))
                    }
                >
                    {step === 3 ? 'Confirmar Pedido' : 'Continuar'}
                </Button>
            </div>
        </div >
    );
};

export default Booking;
