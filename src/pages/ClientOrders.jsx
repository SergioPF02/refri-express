import React, { useEffect, useState } from 'react';
import { ArrowLeft, Package, Clock, MapPin, CurrencyDollar, X } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import StarRating from '../components/StarRating';
import Button from '../components/Button';
import Input from '../components/Input';

import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Custom Technician Icon (Truck Emoji as SVG)
const truckIconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2196F3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1" y="3" width="15" height="13"></rect>
  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
  <circle cx="5.5" cy="18.5" r="2.5"></circle>
  <circle cx="18.5" cy="18.5" r="2.5"></circle>
</svg>
`);

const technicianIcon = new L.Icon({
    iconUrl: truckIconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

// Destination Icon
const destIconUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#F44336" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
  <circle cx="12" cy="10" r="3"></circle>
</svg>
`);

const destinationIcon = new L.Icon({
    iconUrl: destIconUrl,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

// Component to fit map bounds to show both points
// Component to follow the technician
const AutoCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !center) return;
        map.setView(center, 16, { animate: true, duration: 1 });
    }, [map, center]);
    return null;
};



import { API_URL } from '../config';
import { getSocket } from '../socket';

// const socket = io(API_URL);

const ClientOrders = () => {
    const socket = getSocket();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [technicianLocations, setTechnicianLocations] = useState({}); // { jobId: { lat, lng } }
    const [routeCoordinates, setRouteCoordinates] = useState({}); // { jobId: [[lat, lng], ...] }

    // Fetch Route from OSRM
    useEffect(() => {
        orders.forEach(order => {
            if (order.status === 'In Progress' && technicianLocations[order.id]) {
                const techPos = technicianLocations[order.id];
                const destLat = order.lat;
                const destLng = order.lng;

                // Simple cache/debounce check: avoid refetching if very close (optional, skipping for simplicity)

                // Format: lng,lat;lng,lat
                const url = `https://router.project-osrm.org/route/v1/driving/${techPos.lng},${techPos.lat};${destLng},${destLat}?overview=full&geometries=geojson`;

                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (data.routes && data.routes.length > 0) {
                            // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                            setRouteCoordinates(prev => ({ ...prev, [order.id]: coords }));
                        }
                    })
                    .catch(e => { });
            }
        });
    }, [technicianLocations, orders]);



    useEffect(() => {
        // ... (existing listeners)
        socket.on('technician_location_update', (data) => {
            setTechnicianLocations(prev => ({
                ...prev,
                [data.jobId]: { lat: data.lat, lng: data.lng }
            }));
        });

        return () => {
            socket.off('technician_location_update');
            // ... (existing off)
        };
    }, []);

    // Review Modal State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            try {
                const response = await fetch(`${API_URL}/api/bookings`, {
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
            const response = await fetch(`${API_URL}/api/bookings/${selectedOrder.id}/review`, {
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

                                {/* Real-time Tracking Map */}
                                {order.status === 'In Progress' && (
                                    <div style={{ marginTop: '16px', borderRadius: '12px', overflow: 'hidden', height: '250px', border: '2px solid #2196F3', position: 'relative', zIndex: 0 }}>
                                        {technicianLocations[order.id] && order.lat && order.lng ? (
                                            <MapContainer
                                                center={[technicianLocations[order.id].lat, technicianLocations[order.id].lng]}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                                key={`${technicianLocations[order.id].lat}-${technicianLocations[order.id].lng}`}
                                            >
                                                <TileLayer
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />

                                                {/* Technician Marker */}
                                                <Marker
                                                    position={[technicianLocations[order.id].lat, technicianLocations[order.id].lng]}
                                                    icon={technicianIcon}
                                                />

                                                {/* Destination Marker */}
                                                <Marker
                                                    position={[order.lat, order.lng]}
                                                    icon={destinationIcon}
                                                />

                                                {/* Trajectory Polyline */}
                                                <Polyline
                                                    positions={
                                                        routeCoordinates[order.id] || [
                                                            [technicianLocations[order.id].lat, technicianLocations[order.id].lng],
                                                            [order.lat, order.lng]
                                                        ]
                                                    }
                                                    pathOptions={{
                                                        color: '#2196F3',
                                                        weight: 5,
                                                        opacity: 0.8,
                                                        lineJoin: 'round'
                                                    }}
                                                />

                                                {/* Follow Technician */}
                                                <AutoCenter center={[
                                                    technicianLocations[order.id].lat,
                                                    technicianLocations[order.id].lng
                                                ]} />
                                            </MapContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3F2FD', color: '#1565C0', gap: '8px' }}>
                                                <div style={{ width: '10px', height: '10px', backgroundColor: '#2196F3', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                                                Esperando ubicación del técnico...
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(255,255,255,0.8)', padding: '2px 5px', borderRadius: '4px', fontSize: '0.7rem', zIndex: 1000 }}>
                                            Actualización en tiempo real
                                        </div>
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
