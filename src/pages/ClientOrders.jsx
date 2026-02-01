import React, { useEffect, useState } from 'react';
import { ArrowLeft, Package, Clock, MapPin, CurrencyDollar, X } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import StarRating from '../components/StarRating';
import Button from '../components/Button';
import Input from '../components/Input';

const socket = io('http://localhost:5000'); // Connect to backend

const ClientOrders = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);

    // Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/bookings', {
                    headers: {
                        'Authorization': `Bearer ${user.token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrders(data);
                }
            } catch (error) {
                console.error("Error fetching orders:", error);
            }
        };

        fetchOrders();

        // Listen for updates to my orders
        socket.on('job_taken', (updatedJob) => {
            setOrders(prev => prev.map(order => order.id === updatedJob.id ? updatedJob : order));
        });
        socket.on('job_update', (updatedJob) => {
            setOrders(prev => prev.map(order => order.id === updatedJob.id ? updatedJob : order));
        });

        return () => {
            socket.off('job_taken');
            socket.off('job_update');
        };

    }, [user]);

    const handleOpenReview = (order) => {
        setSelectedOrder(order);
        setRating(0);
        setReviewText('');
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedOrder || rating === 0) return alert("Por favor selecciona una calificación");

        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${selectedOrder.id}/review`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ rating, review: reviewText })
            });

            if (response.ok) {
                const updatedOrder = await response.json();
                setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                setShowReviewModal(false);
            } else {
                alert("Error enviando reseña");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return '#FF9800'; // Orange
            case 'Accepted': return '#2196F3'; // Blue
            case 'In Progress': return '#9C27B0'; // Purple
            case 'Completed': return '#4CAF50'; // Green
            default: return '#757575';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'Pending': return 'Buscando Técnico...';
            case 'Accepted': return 'Técnico Asignado';
            case 'In Progress': return 'En Curso';
            case 'Completed': return 'Finalizado';
            default: return status;
        }
    };

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: 'var(--color-bg-light)' }}>
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                    <button onClick={() => navigate('/home')} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
                        <ArrowLeft size={24} color="var(--color-deep-navy)" />
                    </button>
                    <h2 style={{ marginLeft: '16px', color: 'var(--color-deep-navy)' }}>Mis Pedidos</h2>
                </div>

                {orders.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
                        <Package size={48} weight="duotone" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No tienes pedidos activos.</p>
                        <button
                            onClick={() => navigate('/booking')}
                            style={{
                                marginTop: '16px',
                                color: 'var(--color-action-blue)',
                                fontWeight: 'bold',
                                background: 'none',
                                border: '1px solid var(--color-action-blue)',
                                padding: '8px 16px',
                                borderRadius: '20px'
                            }}
                        >
                            ¡Haz tu primer pedido!
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {orders.map((order) => (
                            <div key={order.id} className="glass-card" style={{ padding: '20px', borderLeft: `5px solid ${getStatusColor(order.status)}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{order.service}</h3>
                                        {/* Show Rating if Completed */}
                                        {order.status === 'Completed' && order.rating > 0 && (
                                            <div style={{ marginTop: '4px' }}>
                                                <StarRating rating={order.rating} readOnly={true} />
                                            </div>
                                        )}
                                    </div>
                                    <span style={{
                                        backgroundColor: getStatusColor(order.status),
                                        color: 'white',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>

                                <div style={{ color: '#555', fontSize: '0.9rem' }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <Clock size={18} /> {new Date(order.date).toLocaleDateString()} - {order.time}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <MapPin size={18} /> {order.address}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: 'var(--color-text-main)', marginTop: '8px' }}>
                                        <CurrencyDollar size={18} color="var(--color-action-blue)" /> ${order.price}
                                    </p>
                                </div>

                                {order.technician_name && (
                                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '0.9rem' }}>
                                        <strong>Técnico:</strong> {order.technician_name}
                                    </div>
                                )}

                                {/* Calificar Button */}
                                {order.status === 'Completed' && !order.rating && (
                                    <div style={{ marginTop: '16px' }}>
                                        <button
                                            onClick={() => handleOpenReview(order)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                backgroundColor: '#FFC107',
                                                color: '#333',
                                                fontWeight: 'bold',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ⭐ Calificar Servicio
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {showReviewModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="glass-card" style={{ backgroundColor: 'white', width: '90%', maxWidth: '400px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Califica tu experiencia</h3>
                            <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <p style={{ marginBottom: '16px', color: '#666' }}>
                            ¿Qué tal estuvo el servicio de {selectedOrder.technician_name}?
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                            <StarRating rating={rating} setRating={setRating} />
                        </div>

                        <Input
                            placeholder="Escribe un comentario (opcional)"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                        />

                        <div style={{ marginTop: '24px' }}>
                            <Button onClick={handleSubmitReview}>Enviar Opinión</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientOrders;
