import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Clock, MapPin, CurrencyDollar, X } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import Button from '../components/Button';
import Input from '../components/Input';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSocket } from '../socket';
import { bookingService } from '../services/bookingService';
import './ClientOrders.css';
import { Booking } from '../types';

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
const AutoCenter = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        if (!map || !center) return;
        map.setView(center as L.LatLngExpression, 16, { animate: true, duration: 1 });
    }, [map, center]);
    return null;
};

const ClientOrders = () => {
    const socket = getSocket();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Booking[]>([]);
    const [technicianLocations, setTechnicianLocations] = useState<Record<number, { lat: number; lng: number }>>({}); // { jobId: { lat, lng } }
    const [routeCoordinates, setRouteCoordinates] = useState<Record<number, [number, number][]>>({}); // { jobId: [[lat, lng], ...] }

    // Fetch Route from OSRM
    useEffect(() => {
        orders.forEach(order => {
            if (order.status === 'In Progress' && technicianLocations[order.id] && order.lat && order.lng) {
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
                            const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
                            setRouteCoordinates(prev => ({ ...prev, [order.id]: coords }));
                        }
                    })
                    .catch(() => { });
            }
        });
    }, [technicianLocations, orders]);

    useEffect(() => {
        // ... (existing listeners)
        socket.on('technician_location_update', (data: any) => {
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
    const [selectedOrder, setSelectedOrder] = useState<Booking | null>(null);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchOrders = async () => {
            try {
                console.log("Fetching orders for user...", user.email);
                const data = await bookingService.getAll();
                console.log("Orders received:", data);
                setOrders(data);
            } catch (error) {
                console.error("Error fetching orders:", error);
            }
        };

        fetchOrders();

        // Listen for updates to my orders
        socket.on('job_taken', (updatedJob: Booking) => {
            setOrders(prev => prev.map(order => order.id === updatedJob.id ? updatedJob : order));
        });
        socket.on('job_update', (updatedJob: Booking) => {
            setOrders(prev => prev.map(order => order.id === updatedJob.id ? updatedJob : order));
        });

        return () => {
            socket.off('job_taken');
            socket.off('job_update');
        };

    }, [user]);

    const handleOpenReview = (order: Booking) => {
        setSelectedOrder(order);
        setRating(0);
        setReviewText('');
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedOrder || rating === 0) return alert("Por favor selecciona una calificación");

        try {
            const updatedOrder = await bookingService.submitReview(selectedOrder.id, rating, reviewText);
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setShowReviewModal(false);
        } catch (err) {
            console.error(err);
            alert("Error enviando reseña");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return '#FF9800'; // Orange
            case 'Accepted': return '#2196F3'; // Blue
            case 'In Progress': return '#9C27B0'; // Purple
            case 'Completed': return '#4CAF50'; // Green
            default: return '#757575';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'Pending': return 'Buscando Técnico...';
            case 'Accepted': return 'Técnico Asignado';
            case 'In Progress': return 'En Curso';
            case 'Completed': return 'Finalizado';
            default: return status;
        }
    };

    return (
        <div className="client-orders-page">
            <div className="container">
                <div className="orders-header">
                    <button onClick={() => navigate('/home')} className="back-button">
                        <ArrowLeft size={24} color="var(--color-deep-navy)" />
                    </button>
                    <h2 className="page-title">Mis Pedidos</h2>
                </div>

                {orders.length === 0 ? (
                    <div className="empty-state">
                        <Package size={48} weight="duotone" className="empty-state-icon" />
                        <p>No tienes pedidos activos.</p>
                        <button
                            onClick={() => navigate('/booking')}
                            className="create-order-button"
                        >
                            ¡Haz tu primer pedido!
                        </button>
                    </div>
                ) : (
                    <div className="orders-list">
                        {orders.map((order) => (
                            <div key={order.id} className="glass-card order-card" style={{ borderLeft: `5px solid ${getStatusColor(order.status)}` }}>
                                <div className="card-header">
                                    <div>
                                        <h3 className="service-name">{order.service}</h3>
                                        {/* Show Rating if Completed */}
                                        {order.status === 'Completed' && (order.rating || 0) > 0 && (
                                            <div style={{ marginTop: '4px' }}>
                                                <StarRating rating={order.rating || 0} readOnly={true} setRating={() => { }} />
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(order.status) }}
                                    >
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>

                                <div className="order-details">
                                    <p className="detail-row">
                                        <Clock size={18} /> {new Date(order.date).toLocaleDateString()} - {order.time}
                                    </p>
                                    <p className="detail-row">
                                        <MapPin size={18} /> {order.address}
                                    </p>
                                    {order.items && order.items.length > 0 ? (
                                        <div className="receipt-section">
                                            <div className="receipt-header">
                                                <h4 className="receipt-title">📝 Recibo Digital:</h4>
                                                <button
                                                    onClick={() => {
                                                        try {
                                                            const doc = new jsPDF();

                                                            // Header
                                                            doc.setFontSize(20);
                                                            doc.setTextColor(33, 150, 243); // Blue
                                                            doc.text("RefriExpress", 105, 20, null, null, "center");

                                                            doc.setFontSize(12);
                                                            doc.setTextColor(100);
                                                            doc.text("Recibo de Servicio", 105, 30, null, null, "center");

                                                            // Info
                                                            doc.setFontSize(10);
                                                            doc.setTextColor(0);
                                                            doc.text(`Fecha: ${new Date(order.date).toLocaleDateString()}`, 14, 45);
                                                            doc.text(`Cliente: ${user?.name || 'Cliente'}`, 14, 50);
                                                            doc.text(`Dirección: ${order.address}`, 14, 55);
                                                            doc.text(`Servicio: ${order.service}`, 14, 60);

                                                            // Table
                                                            const tableColumn = ["Descripción", "Precio"];
                                                            const tableRows: any[] = [];

                                                            order.items?.forEach(item => {
                                                                const itemData = [
                                                                    item.name,
                                                                    `$${(item.price || 0).toFixed(2)}`
                                                                ];
                                                                tableRows.push(itemData);
                                                            });

                                                            // Add Total Row
                                                            tableRows.push(["", ""]);
                                                            tableRows.push(["TOTAL PAGADO", `$${order.price}`]);

                                                            // Use autoTable function directly instead of doc.autoTable
                                                            autoTable(doc, {
                                                                startY: 70,
                                                                head: [tableColumn],
                                                                body: tableRows,
                                                                theme: 'striped',
                                                                headStyles: { fillColor: [33, 150, 243] },
                                                                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
                                                            });

                                                            // Warranty Disclaimer
                                                            // Note: autoTable modifies doc.lastAutoTable.finalY even if called as function
                                                            const finalY = ((doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150) + 15;
                                                            doc.setDrawColor(255, 152, 0); // Orange border
                                                            doc.setFillColor(255, 243, 224); // Light orange bg
                                                            doc.rect(14, finalY, 182, 25, 'FD');

                                                            doc.setFontSize(10);
                                                            doc.setTextColor(230, 81, 0); // Dark orange text
                                                            doc.text("GARANTÍA PROTEGIDA", 105, finalY + 8, null, null, "center");

                                                            doc.setFontSize(9);
                                                            doc.setTextColor(0);
                                                            doc.text(`Este recibo oficial por $${order.price} es su único comprobante válido para reclamos de garantía.`, 105, finalY + 16, null, null, "center");
                                                            doc.text("Si el monto cobrado fue mayor al de este recibo, repórtelo inmediatamente.", 105, finalY + 21, null, null, "center");

                                                            // Footer
                                                            doc.setFontSize(8);
                                                            doc.setTextColor(150);
                                                            doc.text("Gracias por su preferencia - RefriExpress", 105, 280, null, null, "center");

                                                            doc.save(`Recibo_RefriExpress_${order.id}.pdf`);
                                                        } catch (err: any) {
                                                            console.error("PDF Error:", err);
                                                            alert(`Error al generar PDF: ${err.message}`);
                                                        }
                                                    }}
                                                    className="download-pdf-btn"
                                                >
                                                    ⬇️ PDF
                                                </button>
                                            </div>
                                            <ul className="items-list">
                                                {order.items.map((item, idx) => (
                                                    <li key={idx} className="item-row">
                                                        <span>{item.name}</span>
                                                        <span style={{ fontWeight: 'bold' }}>${item.price}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="total-row">
                                                <span>Total Pagado</span>
                                                <span>${order.price}</span>
                                            </div>
                                            <div className="warranty-notice">
                                                🛡️ <strong>Garantía Protegida:</strong><br />
                                                Tu garantía solo cubre el monto exacto de este recibo digital (${order.price}).
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="price-display">
                                            <CurrencyDollar size={18} color="var(--color-action-blue)" /> ${order.price}
                                        </p>
                                    )}
                                </div>

                                {order.technician_name && (
                                    <div className="technician-info">
                                        <strong>Técnico:</strong> {order.technician_name}
                                    </div>
                                )}

                                {/* Real-time Tracking Map */}
                                {order.status === 'In Progress' && (
                                    <div className="map-container">
                                        {technicianLocations[order.id] && order.lat && order.lng ? (
                                            <MapContainer
                                                center={[technicianLocations[order.id].lat, technicianLocations[order.id].lng] as L.LatLngExpression}
                                                zoom={13}
                                                style={{ height: '100%', width: '100%' }}
                                                // @ts-ignore
                                                key={`${technicianLocations[order.id].lat}-${technicianLocations[order.id].lng}`}
                                            >
                                                <TileLayer
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />

                                                {/* Technician Marker */}
                                                <Marker
                                                    position={[technicianLocations[order.id].lat, technicianLocations[order.id].lng] as L.LatLngExpression}
                                                    icon={technicianIcon}
                                                />

                                                {/* Destination Marker */}
                                                <Marker
                                                    position={[order.lat, order.lng] as L.LatLngExpression}
                                                    icon={destinationIcon}
                                                />

                                                {/* Trajectory Polyline */}
                                                <Polyline
                                                    positions={
                                                        (routeCoordinates[order.id] || [
                                                            [technicianLocations[order.id].lat, technicianLocations[order.id].lng],
                                                            [order.lat, order.lng]
                                                        ]) as L.LatLngExpression[]
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
                                            <div className="map-loader">
                                                <div className="pulse-dot"></div>
                                                Esperando ubicación del técnico...
                                            </div>
                                        )}
                                        <div className="live-indicator">
                                            <div className="pulse-dot" style={{ width: 6, height: 6, background: '#d32f2f' }}></div>
                                            EN VIVO
                                        </div>
                                    </div>
                                )}

                                {/* Calificar Button */}
                                {order.status === 'Completed' && !order.rating && (
                                    <div style={{ marginTop: '16px' }}>
                                        <button
                                            onClick={() => handleOpenReview(order)}
                                            className="rate-button"
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
            {showReviewModal && selectedOrder && (
                <div className="modal-overlay">
                    <div className="glass-card modal-content">
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>Califica tu experiencia</h3>
                            <button onClick={() => setShowReviewModal(false)} className="close-button"><X size={24} /></button>
                        </div>

                        <p className="modal-instruction">
                            ¿Qué tal estuvo el servicio de {selectedOrder.technician_name}?
                        </p>

                        <div className="star-container">
                            <StarRating rating={rating} setRating={setRating} />
                        </div>

                        <Input
                            placeholder="Escribe un comentario (opcional)"
                            value={reviewText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewText(e.target.value)}
                        />

                        <div className="submit-review-container">
                            <Button onClick={handleSubmitReview}>Enviar Opinión</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientOrders;
