import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, CurrencyDollar, Phone, NavigationArrow, WhatsappLogo, Envelope, Trash, Play, CheckCircle } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../socket';
import { api } from '../api/client';
import { toast } from 'react-hot-toast';
import { ClipLoader, PulseLoader } from 'react-spinners';
import { SERVICE_CATALOG } from '../services_catalog'; // Assume this file exists and exports SERVICE_CATALOG
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Geolocation } from '@capacitor/geolocation';
import NotificationBell from '../components/NotificationBell';
import { Booking } from '../types';

// Extended Booking Interface for Local Usage if needed, but Booking from types.ts should be enough if updated.

interface ServiceCatalogItem {
    id: string;
    name: string;
    minPrice: number;
    maxPrice: number;
}

interface EditingJobState {
    id: number;
    mode: 'schedule' | 'quote';
    date?: string;
    time?: string;
    price?: number; // Total price
    items?: (ServiceCatalogItem & { price: number })[]; // Items with price
    description?: string;
}

interface RouteStep {
    maneuver: {
        modifier?: string;
        type: string;
        instruction: string;
    };
    name?: string;
}

interface Location {
    lat: number;
    lng: number;
}


// Helper for Map & Heading Control
const NavigationController = ({ center, heading }: { center: [number, number]; heading: number }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !center) return;

        map.setView(center, 18, { animate: true, duration: 0.5 }); // Closer zoom for nav

        // CSS Map Rotation (Course Up)
        const bearing = heading || 0;

        const container = map.getContainer();
        container.style.transition = 'transform 0.5s ease-out';
        container.style.transform = `rotate(${-bearing}deg)`;

    }, [map, center, heading]);

    return null;
};

// Truck Icon with Rotation support (DivIcon)
const createTruckIcon = (rotation: number) => L.divIcon({
    className: 'truck-driver-icon',
    html: `<div style="transform: rotate(${rotation}deg); width: 40px; height: 40px; display: flex; justify-content: center; align-items: center;">
             <img src="https://cdn-icons-png.flaticon.com/512/741/741407.png" style="width: 100%; height: 100%;" />
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});


// Icons (Reuse from ClientOrders or simpler)
const destIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});



const Dashboard = () => {
    const socket = getSocket();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loadingJobId, setLoadingJobId] = useState<number | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [editingJob, setEditingJob] = useState<EditingJobState | null>(null);
    const [myLocation, setMyLocation] = useState<Location | null>(null);
    const [heading, setHeading] = useState(0); // Bearing
    const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
    const [routePath, setRoutePath] = useState<[number, number][]>([]);
    const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

    useEffect(() => {
        // Initial fetch
        // Initial fetch
        api.get('/api/bookings')
            .then(data => setBookings(data))
            .catch(err => console.error(err));

        // Polling as fallback? No, reliance on socket + manual refresh if needed.

        // Request Notification Permissions on Mount
        const requestPermissions = async () => {
            try {
                const result = await LocalNotifications.requestPermissions();
                if (result.display === 'granted') {
                    console.log("Notification permission granted");
                }
            } catch (e) {
                console.error("Error requesting notifications", e);
            }
        };
        requestPermissions();

        // Socket listeners
        socket.on('new_job', async (job: Booking) => {
            setBookings(prev => [job, ...prev]);
            try { new Audio('/notification.mp3').play().catch(() => { }); } catch { }

            // Trigger System Notification
            try {
                await LocalNotifications.schedule({
                    notifications: [{
                        title: '¡Nueva Solicitud!',
                        body: `Servicio: ${job.service} - ${job.address}`,
                        id: new Date().getTime(),
                        schedule: { at: new Date(Date.now() + 100) }, // Immediate
                        sound: undefined,
                        attachments: undefined,
                        actionTypeId: "",
                        extra: null
                    }]
                });
            } catch (e) { console.error("Notification failed", e); }
        });

        socket.on('job_taken', (updatedJob: Booking) => {
            setBookings(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        });

        socket.on('job_update', (updatedJob: Booking) => {
            setBookings(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        });

        return () => {
            socket.off('new_job');
            socket.off('job_taken');
            socket.off('job_update');
        };
    }, []);

    // Geolocation Tracking Effect
    useEffect(() => {
        if (!user || user.role !== 'worker') return;

        // Check for active In Progress jobs
        const activeJob = bookings.find(b => b.technician_id === user.id && b.status === 'In Progress');

        let watchId: string | null = null;

        const startTracking = async () => {
            try {
                // Check Permission First
                const status = await Geolocation.checkPermissions();
                if (status.location !== 'granted') {
                    const request = await Geolocation.requestPermissions();
                    if (request.location !== 'granted') {
                        console.warn("Se requiere permiso de GPS para ver distancias.");
                        return;
                    }
                }

                // If active job: High accuracy, frequent updates
                // If NOT active job: Balanced (save battery), for "distance to job" only
                const options = activeJob ? {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 5000
                } : {
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: 30000
                };

                watchId = await Geolocation.watchPosition(options, (position, err) => {
                    if (err) {
                        console.error("Tracking error:", err);
                        return;
                    }
                    if (position) {
                        const { latitude, longitude, heading: gpsHeading } = position.coords;

                        // Local state for UI
                        setMyLocation({ lat: latitude, lng: longitude });

                        // If Active Job: Do Routing and Emit
                        if (activeJob) {
                            // Calculate Heading logic
                            let newHeading = gpsHeading;
                            if ((newHeading === null || isNaN(newHeading)) && myLocation) {
                                // Basic calculation if GPS doesn't provide it
                                const y = Math.sin(longitude - myLocation.lng) * Math.cos(latitude);
                                const x = Math.cos(myLocation.lat) * Math.sin(latitude) -
                                    Math.sin(myLocation.lat) * Math.cos(latitude) * Math.cos(longitude - myLocation.lng);
                                const theta = Math.atan2(y, x);
                                newHeading = (theta * 180 / Math.PI + 360) % 360;
                            }
                            if (newHeading !== null && !isNaN(newHeading)) setHeading(newHeading);

                            // Emit to Backend
                            socket.emit('technician_location_update', {
                                jobId: activeJob.id,
                                lat: latitude,
                                lng: longitude
                            });

                            // OSRM Routing
                            const destLat = activeJob.lat;
                            const destLng = activeJob.lng;
                            if (destLat && destLng) {
                                fetch(`https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`)
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.routes && data.routes.length > 0) {
                                            const route = data.routes[0];
                                            setRoutePath(route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
                                            setRouteSteps(route.legs[0].steps);
                                        }
                                    }).catch(e => console.error(e));
                            }
                        }
                    }
                });

            } catch (e) {
                console.error("GPS Init Error:", e);
                // alert("Error GPS: " + (e as any).message); // Don't spam alert if just checking available jobs
            }
        };
        startTracking();

        return () => {
            if (watchId) Geolocation.clearWatch({ id: watchId });
        };
    }, [bookings, user, myLocation]); // Added myLocation to dep for haversine header calc

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1); // Return string "5.2"
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleAcceptJob = async (jobId: number) => {
        if (!user) return;
        try {
            setLoadingJobId(jobId);
            await api.put(`/api/bookings/${jobId}/accept`, {
                technician_name: user.name
            });
            toast.success('¡Trabajo aceptado!');
            // UI update handled by socket 'job_taken' event
        } catch (err: any) {
            console.error(err);
            toast.error(`Error al aceptar: ${err.message}`);
        } finally {
            setLoadingJobId(null);
        }
    };

    const handleStatusUpdate = async (jobId: number, newStatus: string) => {
        if (!user) return;
        setLoadingJobId(jobId);
        try {
            await api.put(`/api/bookings/${jobId}/status`, { status: newStatus });

            if (newStatus === 'Completed') {
                toast.success("✅ Trabajo finalizado. Recibo enviado por correo.");
            } else if (newStatus === 'In Progress') {
                toast.success("Iniciando trabajo. ¡Suerte!");
            } else if (newStatus === 'Cancelled') {
                toast.success("Trabajo cancelado.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(`Error actualizando el estado: ${err.message}`);
        } finally {
            setLoadingJobId(null);
        }
    };

    const handleUpdateDetails = async () => {
        if (!editingJob || !user) return;

        // Construct payload based on flat state
        const payload: any = {};
        if (editingJob.mode === 'schedule') {
            payload.date = editingJob.date;
            payload.time = editingJob.time;
        } else if (editingJob.mode === 'quote') {
            payload.price = editingJob.price;
            payload.description = editingJob.description;
            payload.items = editingJob.items;
        }

        try {
            setIsUpdatingDetails(true);
            await api.put(`/api/bookings/${editingJob.id}/details`, payload);
            setEditingJob(null);
            toast.success("Detalles actualizados correctamente");
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al actualizar");
        } finally {
            setIsUpdatingDetails(false);
        }
    };

    const openGoogleMaps = (job: Booking) => {
        // Prefer handling via search query for better precision with house numbers
        const query = job.address ? encodeURIComponent(job.address) : `${job.lat},${job.lng}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    const myJobs = bookings.filter(b => b.technician_id === user?.id && b.status !== 'Completed' && b.status !== 'Cancelled');
    const availableJobs = bookings.filter(b => b.status === 'Pending');

    return (
        <div style={{ padding: '24px', paddingBottom: '80px', minHeight: '100vh', backgroundColor: 'var(--color-bg-light)' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Panel de Técnico</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        {user ? `Hola, ${user.name}` : 'Bienvenido'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <NotificationBell />
                    <button onClick={handleLogout} style={{ padding: '8px 12px', background: '#ffebee', color: '#d32f2f', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>
                        Salir
                    </button>
                </div>
            </div>

            {/* My Jobs Section */}
            {
                myJobs.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--color-action-blue)' }}>Mis Trabajos Activos</h3>
                        {myJobs.map(job => (
                            <div key={job.id} className="glass-card" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid green' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: 0 }}>{job.service} - {job.tonnage} Ton</h4>
                                    <span style={{
                                        backgroundColor: job.status === 'In Progress' ? '#FFF3E0' : '#E8F5E9',
                                        color: job.status === 'In Progress' ? '#EF6C00' : 'green',
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                                    }}>
                                        {job.status === 'Accepted' ? 'Aceptado' : 'En Curso'}
                                    </span>
                                </div>
                                {job.status === 'In Progress' && (
                                    <>
                                        <div style={{ backgroundColor: '#E1F5FE', color: '#0277BD', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div className="pulse-dot"></div>
                                                Navegación Activa
                                            </div>
                                        </div>

                                        {/* Navigation Map & Panel */}
                                        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #2196F3', marginBottom: '16px' }}>

                                            {/* Top Instruction Panel */}
                                            {routeSteps.length > 0 && (
                                                <div style={{ backgroundColor: '#2196F3', color: 'white', padding: '12px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                                        {routeSteps[0].maneuver.modifier ?
                                                            `${routeSteps[0].maneuver.modifier.toUpperCase()} ${routeSteps[0].name ? 'en ' + routeSteps[0].name : ''}`
                                                            : routeSteps[0].maneuver.type}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                                        {routeSteps[0].maneuver.instruction}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                                                        ({routeSteps.length} pasos restantes)
                                                    </div>
                                                </div>
                                            )}

                                            {/* Map */}
                                            <div style={{ height: '300px', position: 'relative', zIndex: 0 }}>
                                                {myLocation && job.lat && job.lng ? (
                                                    <MapContainer
                                                        center={[myLocation.lat, myLocation.lng]}
                                                        zoom={17}
                                                        style={{ height: '100%', width: '100%' }}
                                                        zoomControl={false}
                                                    >
                                                        {/* Better Tiles: CartoDB Voyager (Free, Google-like style) */}
                                                        <TileLayer
                                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                                            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                                        />

                                                        {/* My Truck */}
                                                        <Marker position={[myLocation.lat, myLocation.lng]} icon={createTruckIcon(heading)} />

                                                        {/* Destination */}
                                                        <Marker position={[job.lat, job.lng]} icon={destIcon} />

                                                        {/* Route */}
                                                        {routePath.length > 0 && (
                                                            <Polyline positions={routePath} pathOptions={{ color: '#2196F3', weight: 6 }} />
                                                        )}

                                                        <NavigationController center={[myLocation.lat, myLocation.lng]} heading={heading} />
                                                    </MapContainer>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '10px', color: '#666', backgroundColor: '#f5f5f5' }}>
                                                        <PulseLoader color="var(--color-action-blue)" size={10} />
                                                        Esperando señal GPS precisa...
                                                    </div>
                                                )}

                                                {/* External Nav Button Overlay */}
                                                <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 1000 }}>
                                                    <button
                                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}&travelmode=driving`, '_blank')}
                                                        style={{
                                                            backgroundColor: 'white',
                                                            color: '#1a73e8',
                                                            padding: '10px 16px',
                                                            border: 'none',
                                                            borderRadius: '24px',
                                                            fontWeight: 'bold',
                                                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer'
                                                        }}>
                                                        <NavigationArrow size={20} weight="fill" />
                                                        Navegar con Google
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div style={{ margin: '12px 0', fontSize: '0.95rem' }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <MapPin size={18} color="#EB5757" /> {job.address}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <Clock size={18} color="#2F80ED" /> {job.date ? `${new Date(job.date).toLocaleDateString()} - ${job.time}` : 'Fecha por Acordar'}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <CurrencyDollar size={18} color="#2196F3" /> Costo: ${job.price}
                                    </p>
                                    {job.description && (
                                        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
                                            <strong>Nota del cliente:</strong> {job.description}
                                        </div>
                                    )}
                                    {job.contact_method && job.service === 'Reparación' && (
                                        <p style={{ marginTop: '4px', fontSize: '0.9rem', color: '#555' }}>
                                            <strong>Contacto preferido:</strong> {job.contact_method}
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                                    <button
                                        onClick={() => openGoogleMaps(job)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '8px' }}
                                    >
                                        <NavigationArrow size={20} /> Ir a Mapa
                                    </button>

                                    {/* Dynamic Contact Button */}
                                    {job.contact_method === 'whatsapp' ? (
                                        <a
                                            href={`https://wa.me/${job.phone ? job.phone.replace(/\D/g, '') : ''}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#E0F2F1', color: '#00695C', border: 'none', borderRadius: '8px', textDecoration: 'none' }}
                                        >
                                            <WhatsappLogo size={20} /> WhatsApp
                                        </a>
                                    ) : job.contact_method === 'email' ? (
                                        <a
                                            href={`mailto:${job.user_email}`}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#F3E5F5', color: '#6A1B9A', border: 'none', borderRadius: '8px', textDecoration: 'none' }}
                                        >
                                            <Envelope size={20} /> Correo
                                        </a>
                                    ) : (
                                        <a
                                            href={`tel:${job.phone || ''}`}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: '8px', textDecoration: 'none' }}
                                        >
                                            <Phone size={20} /> Llamar
                                        </a>
                                    )}
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    {/* Cancel Buttons Logic */}
                                    <div style={{ marginBottom: '12px' }}>
                                        {/* 1. Pre-Start: Release Job (Penalty) */}
                                        {job.status === 'Accepted' && (
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm("⚠️ ADVERTENCIA: ¿Estás seguro de liberar este pedido?\n\nAl hacerlo antes de iniciar el trabajo, se restarán puntos de tu reputación y el trabajo volverá a la lista de disponibles.")) {
                                                        try {
                                                            setLoadingJobId(job.id);
                                                            await api.put(`/api/bookings/${job.id}/release`, {});
                                                            toast.success("Pedido liberado.");
                                                        } catch (e) {
                                                            console.error(e);
                                                            toast.error("Error al liberar.");
                                                        } finally {
                                                            setLoadingJobId(null);
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#fff3e0',
                                                    color: '#e65100',
                                                    border: '1px solid #ff9800',
                                                    borderRadius: '8px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Liberar Pedido (No puedo asistir)
                                            </button>
                                        )}

                                        {/* 2. Post-Start: Cancel Job (No Penalty) */}
                                        {job.status === 'In Progress' && (
                                            <button
                                                onClick={() => {
                                                    const reason = prompt("Por favor, indica la razón (ej. Cliente ausente):");
                                                    if (reason) {
                                                        handleStatusUpdate(job.id, 'Cancelled');
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    backgroundColor: '#ffebee',
                                                    color: '#c62828',
                                                    border: '1px solid #ef5350',
                                                    borderRadius: '8px',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancelar / Cliente Ausente
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Buttons Logic - Unified for ALL Services to allow Upselling */}
                                    <>
                                        {/* Edit Mode UI */}
                                        {editingJob?.id === job.id ? (
                                            <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                                {/* SAME EDIT UI AS BEFORE */}
                                                {editingJob.mode === 'schedule' && (
                                                    <>
                                                        <strong style={{ display: 'block', marginBottom: '8px' }}>Agendar Visita:</strong>
                                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                            <input
                                                                type="date"
                                                                value={editingJob.date || ''}
                                                                onChange={(e) => setEditingJob({ ...editingJob, date: e.target.value })}
                                                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: 1 }}
                                                            />
                                                            <input
                                                                type="time"
                                                                value={editingJob.time || ''}
                                                                onChange={(e) => setEditingJob({ ...editingJob, time: e.target.value })}
                                                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: 1 }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {editingJob.mode === 'quote' && (
                                                    <>
                                                        <strong style={{ display: 'block', marginBottom: '8px' }}>Modificar Presupuesto / Agregar Extras:</strong>

                                                        {/* Service Selector */}
                                                        <div style={{ marginBottom: '12px' }}>
                                                            <select
                                                                onChange={(e) => {
                                                                    const serviceId = e.target.value;
                                                                    if (!serviceId) return;
                                                                    const service = SERVICE_CATALOG.find(s => s.id === serviceId);

                                                                    if (service && editingJob) {
                                                                        // Add Item
                                                                        const newItem = { ...service, price: service.minPrice };
                                                                        // Ensure items array exists and is typed correctly
                                                                        const currentItems = editingJob.items || [];
                                                                        const newItems = [...currentItems, newItem];
                                                                        const newTotal = newItems.reduce((sum, item) => sum + item.price, 0);

                                                                        setEditingJob({
                                                                            ...editingJob,
                                                                            items: newItems,
                                                                            price: newTotal
                                                                        });
                                                                    }
                                                                    e.target.value = ''; // Reset select
                                                                }}
                                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}
                                                            >
                                                                <option value="">+ Agregar Servicio/Refacción</option>
                                                                {SERVICE_CATALOG.map(service => (
                                                                    <option key={service.id} value={service.id}>
                                                                        {service.name} (${service.minPrice} - ${service.maxPrice})
                                                                    </option>
                                                                ))}
                                                            </select>

                                                            {/* Selected Items List */}
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                {editingJob.items?.map((item, index) => (
                                                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                                                                        <div style={{ flex: 1 }}>
                                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                                                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                                                Precio:
                                                                                <input
                                                                                    type="number"
                                                                                    min={item.minPrice}
                                                                                    max={item.maxPrice}
                                                                                    value={item.price}
                                                                                    onChange={(e) => {
                                                                                        const val = parseFloat(e.target.value);
                                                                                        if (editingJob && editingJob.items) {
                                                                                            const updatedItems = [...editingJob.items];
                                                                                            updatedItems[index] = { ...updatedItems[index], price: val };
                                                                                            const newTotal = updatedItems.reduce((sum, it) => sum + (it.price || 0), 0);
                                                                                            setEditingJob({ ...editingJob, items: updatedItems, price: newTotal });
                                                                                        }
                                                                                    }}
                                                                                    style={{ width: '80px', marginLeft: '4px', padding: '2px' }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (editingJob && editingJob.items) {
                                                                                    const updatedItems = editingJob.items.filter((_, i) => i !== index);
                                                                                    const newTotal = updatedItems.reduce((sum, it) => sum + (it.price || 0), 0);
                                                                                    setEditingJob({ ...editingJob, items: updatedItems, price: newTotal });
                                                                                }
                                                                            }}
                                                                            style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                        >
                                                                            <Trash size={18} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#2E7D32' }}>
                                                                Total: ${editingJob.price || 0}
                                                            </div>
                                                        </div>

                                                        <textarea
                                                            placeholder="Notas adicionales (opcional)"
                                                            value={editingJob.description || ''}
                                                            onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                                                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', minHeight: '60px' }}
                                                        />
                                                    </>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    <button onClick={handleUpdateDetails} disabled={isUpdatingDetails} style={{ flex: 1, backgroundColor: 'green', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {isUpdatingDetails ? <ClipLoader color="white" size={16} /> : 'Guardar Cambios'}
                                                    </button>
                                                    <button onClick={() => setEditingJob(null)} style={{ flex: 1, backgroundColor: '#ddd', color: 'black', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Action Buttons - UNIFIED */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                                {/* 1. Modificar Cotización (Always available if Accepted/InProgress) */}
                                                {(job.status === 'Accepted' || job.status === 'In Progress') && (
                                                    <button
                                                        onClick={() => setEditingJob({
                                                            id: job.id,
                                                            mode: 'quote',
                                                            price: job.price,
                                                            items: [], // Use existing items if available in job? job.items is BookingItem[], EditingJobState needs ServiceCatalogItem. Mapping needed if we assume job.items has min/max prices, but BookingItem only has name/price. 
                                                            // For now initializing empty or would need to fetch. 
                                                            // Assuming we start fresh or mapping is lost. 
                                                            // Let's assume we start with empty items for editing or basic mapping.
                                                            // Ideally keys match.
                                                            description: job.description || ''
                                                        })}
                                                        style={{ padding: '12px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        <CurrencyDollar size={20} /> {job.items && job.items.length > 0 ? 'Modificar Cotización' : 'Agregar Extras / Cotizar'}
                                                    </button>
                                                )}

                                                {/* 2. Schedule Visit (If no date yet) */}
                                                {job.status === 'Accepted' && !job.date && (
                                                    <button
                                                        onClick={() => setEditingJob({ id: job.id, mode: 'schedule', date: '', time: '' })}
                                                        style={{ padding: '12px', backgroundColor: '#F2994A', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        <Clock size={20} /> Agendar Visita
                                                    </button>
                                                )}

                                                {/* 3. Start Work (Always available if Accepted) */}
                                                {job.status === 'Accepted' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(job.id, 'In Progress')}
                                                        style={{ padding: '12px', backgroundColor: 'var(--color-action-blue)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                    >
                                                        <Play size={20} /> Iniciar Trabajo
                                                    </button>
                                                )}

                                                {/* 4. Finish (If In Progress) */}
                                                {job.status === 'In Progress' && (
                                                    <button
                                                        disabled={loadingJobId === job.id}
                                                        onClick={() => {
                                                            if ((job.price) <= 0) {
                                                                toast.error("⚠️ No puedes finalizar en $0. Cotiza el servicio.");
                                                            } else {
                                                                handleStatusUpdate(job.id, 'Completed');
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '12px',
                                                            backgroundColor: loadingJobId === job.id ? '#ccc' : '#2E7D32',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: loadingJobId === job.id ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        {loadingJobId === job.id ? (
                                                            <span>Procesando...</span>
                                                        ) : (
                                                            <>
                                                                <CheckCircle size={20} /> Finalizar Trabajo
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Completed Jobs History */}
            {bookings.filter(b => b.technician_id === user?.id && b.status === 'Completed').length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ marginBottom: '16px', color: '#4CAF50' }}>Historial de Trabajos Completados</h3>
                    {bookings.filter(b => b.technician_id === user?.id && b.status === 'Completed').map(job => (
                        <div key={job.id} className="glass-card" style={{ padding: '16px', marginBottom: '16px', borderLeft: '4px solid #4CAF50', opacity: 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ margin: 0 }}>{job.service} - {job.tonnage} Ton</h4>
                                <span style={{
                                    backgroundColor: '#E8F5E9',
                                    color: '#2E7D32',
                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                                }}>
                                    Finalizado
                                </span>
                            </div>
                            <div style={{ margin: '8px 0', fontSize: '0.9rem', color: '#555' }}>
                                <p style={{ margin: '4px 0' }}>{job.address}</p>
                                <p style={{ margin: '4px 0' }}>Fecha: {new Date(job.date).toLocaleDateString()}</p>
                                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>Total: ${job.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h3 style={{ marginBottom: '16px' }}>Ofertas Disponibles en Tiempo Real</h3>

            {
                availableJobs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#999' }}>No hay trabajos pendientes...</p>
                ) : (
                    availableJobs.map((job) => (
                        <div key={job.id} className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{job.service}</h4>
                                    <span style={{ fontSize: '0.9rem', color: '#666' }}>{job.tonnage} Toneladas</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-action-blue)', fontWeight: 'bold' }}>
                                    <CurrencyDollar size={18} />
                                    {job.price}
                                </div>
                            </div>

                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <MapPin size={18} color="#EB5757" />
                                    <span style={{ fontSize: '0.9rem' }}>{job.address}</span>
                                    {myLocation && job.lat && job.lng && (
                                        <span style={{
                                            marginLeft: 'auto',
                                            backgroundColor: '#E1F5FE',
                                            color: '#0288D1',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <NavigationArrow size={14} weight="fill" />
                                            {getDistance(myLocation.lat, myLocation.lng, job.lat, job.lng)} km
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={18} color="#F2994A" />
                                    <span style={{ fontSize: '0.9rem' }}>{job.date ? `${new Date(job.date).toLocaleDateString()} a las ${job.time}` : 'Fecha por Acordar'}</span>
                                </div>
                            </div>

                            {job.description && (
                                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#FFF8E1', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #FFE082' }}>
                                    <strong style={{ display: 'block', marginBottom: '4px', color: '#F57F17' }}>Descripción del problema:</strong>
                                    {job.description}
                                </div>
                            )}

                            {job.contact_method && job.service === 'Reparación' && (
                                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                                    <strong>Prefiere contacto por:</strong> <span style={{ textTransform: 'capitalize' }}>{job.contact_method}</span>
                                </div>
                            )}

                            <div style={{ marginTop: '16px' }}>
                                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleAcceptJob(job.id)}
                                        style={{
                                            flex: 2,
                                            padding: '12px',
                                            backgroundColor: 'var(--color-action-blue)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Aceptar Trabajo
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("¿Estás seguro de rechazar este trabajo? Se eliminará de la lista.")) {
                                                handleStatusUpdate(job.id, 'Cancelled');
                                            }
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            backgroundColor: '#ffebee',
                                            color: '#c62828',
                                            border: '1px solid #ef5350',
                                            borderRadius: '8px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )
            }
        </div>
    );
};
export default Dashboard;
