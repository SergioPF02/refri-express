import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CurrencyDollar, CheckCircle, Phone, NavigationArrow, Play, User, WhatsappLogo, Envelope } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Connect to backend

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [editingJob, setEditingJob] = useState(null); // { id, mode, date, time, price, description }

    useEffect(() => {
        // Initial fetch
        fetch('http://localhost:5000/api/bookings')
            .then(res => res.json())
            .then(data => setBookings(data))
            .catch(err => console.error(err));

        // Socket listeners
        socket.on('new_job', (job) => {
            setBookings(prev => [job, ...prev]);
            try { new Audio('/notification.mp3').play().catch(e => { }); } catch (e) { }
        });

        socket.on('job_taken', (updatedJob) => {
            setBookings(prev => prev.map(job => job.id === updatedJob.id ? updatedJob : job));
        });

        socket.on('job_update', (updatedJob) => {
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

        let watchId;
        if (activeJob) {
            console.log("Starting tracking for job:", activeJob.id);
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        socket.emit('technician_location_update', {
                            jobId: activeJob.id,
                            lat: latitude,
                            lng: longitude
                        });
                    },
                    (err) => console.error("Tracking Error:", err),
                    { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                );
            }
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [bookings, user]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleAcceptJob = async (jobId) => {
        if (!user) return;
        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${jobId}/accept`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    // technician_id is extracted from token on backend now
                    technician_name: user.name
                })
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error);
            }
            // UI update handled by socket 'job_taken' event
        } catch (err) {
            console.error(err);
            alert("Error al aceptar trabajo");
        }
    };

    const handleStatusUpdate = async (jobId, newStatus) => {
        if (!user) return;
        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${jobId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                alert("Error actualizando el estado");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateDetails = async () => {
        if (!editingJob) return;

        // Construct payload based on flat state
        const payload = {};
        if (editingJob.mode === 'schedule') {
            payload.date = editingJob.date;
            payload.time = editingJob.time;
        } else if (editingJob.mode === 'quote') {
            payload.price = editingJob.price;
            payload.description = editingJob.description;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${editingJob.id}/details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setEditingJob(null);
                alert("Actualización exitosa");
            } else {
                const data = await response.json();
                alert(data.error || "Error al actualizar");
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión");
        }
    };

    const openGoogleMaps = (job) => {
        // Prefer handling via search query for better precision with house numbers
        const query = job.address ? encodeURIComponent(job.address) : `${job.lat},${job.lng}`;
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    const myJobs = bookings.filter(b => b.technician_id === user?.id && b.status !== 'Completed' && b.status !== 'Cancelled');
    const availableJobs = bookings.filter(b => b.status === 'Pending');

    return (
        <div style={{ padding: '24px', paddingBottom: '80px', minHeight: '100vh', backgroundColor: 'var(--color-bg-light)' }}>
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button onClick={() => navigate('/home')} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
                            <ArrowLeft size={24} color="var(--color-deep-navy)" />
                        </button>
                        <h2 style={{ marginLeft: '16px' }}>Hola, {user?.name || 'Técnico'}</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => navigate('/profile')}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                cursor: 'pointer'
                            }}
                        >
                            <User size={20} color="var(--color-action-blue)" weight="bold" />
                        </button>
                        <button onClick={handleLogout} style={{ color: 'red', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Salir</button>
                    </div>
                </div>

                {/* My Jobs Section */}
                {myJobs.length > 0 && (
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
                                    <div style={{ backgroundColor: '#E1F5FE', color: '#0277BD', padding: '6px', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div className="pulse-dot"></div> Compartiendo ubicación en tiempo real
                                    </div>
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
                                    {job.contact_method && (
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
                                                            const response = await fetch(`http://localhost:5000/api/bookings/${job.id}/release`, {
                                                                method: 'PUT',
                                                                headers: { 'Authorization': `Bearer ${user.token}` }
                                                            });
                                                            if (!response.ok) alert("Error al liberar");
                                                        } catch (e) { console.error(e); }
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

                                    {/* Action Buttons Logic */}
                                    {job.service === 'Reparación' ? (
                                        <>
                                            {/* Edit Mode UI */}
                                            {editingJob?.id === job.id ? (
                                                <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                                    {editingJob.mode === 'schedule' && (
                                                        <>
                                                            <strong style={{ display: 'block', marginBottom: '8px' }}>Agendar Visita:</strong>
                                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                                <input
                                                                    type="date"
                                                                    value={editingJob.date || ''}
                                                                    onChange={(e) => setEditingJob(prev => ({ ...prev, date: e.target.value }))}
                                                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: 1 }}
                                                                />
                                                                <input
                                                                    type="time"
                                                                    value={editingJob.time || ''}
                                                                    onChange={(e) => setEditingJob(prev => ({ ...prev, time: e.target.value }))}
                                                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flex: 1 }}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    {editingJob.mode === 'quote' && (
                                                        <>
                                                            <strong style={{ display: 'block', marginBottom: '8px' }}>Cotizar y Diagnosticar:</strong>
                                                            <input
                                                                type="number"
                                                                placeholder="Precio ($)"
                                                                value={editingJob.price || ''}
                                                                onChange={(e) => setEditingJob(prev => ({ ...prev, price: e.target.value }))}
                                                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', marginBottom: '8px' }}
                                                            />
                                                            <textarea
                                                                placeholder="Diagnóstico técnico / Descripción del trabajo"
                                                                value={editingJob.description || ''}
                                                                onChange={(e) => setEditingJob(prev => ({ ...prev, description: e.target.value }))}
                                                                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', width: '100%', minHeight: '60px' }}
                                                            />
                                                        </>
                                                    )}
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                        <button onClick={handleUpdateDetails} style={{ flex: 1, backgroundColor: 'green', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Guardar</button>
                                                        <button onClick={() => setEditingJob(null)} style={{ flex: 1, backgroundColor: '#ddd', color: 'black', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Action Buttons for Repair */
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {/* 1. Quote (First step: Define Price) */}
                                                    {job.status === 'Accepted' && job.price == 0 && (
                                                        <button
                                                            onClick={() => setEditingJob({ id: job.id, mode: 'quote', price: '', description: job.description || '' })}
                                                            style={{ padding: '12px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                        >
                                                            <CurrencyDollar size={20} /> Crear Presupuesto
                                                        </button>
                                                    )}

                                                    {/* 2. Schedule Visit (After Price is set) */}
                                                    {job.status === 'Accepted' && job.price > 0 && !job.date && (
                                                        <button
                                                            onClick={() => setEditingJob({ id: job.id, mode: 'schedule', date: '', time: '' })}
                                                            style={{ padding: '12px', backgroundColor: '#F2994A', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                        >
                                                            <Clock size={20} /> Agendar Visita
                                                        </button>
                                                    )}

                                                    {/* 3. Start Work (After Date is set) */}
                                                    {job.status === 'Accepted' && job.price > 0 && job.date && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(job.id, 'In Progress')}
                                                            style={{ padding: '12px', backgroundColor: 'var(--color-action-blue)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                        >
                                                            <Play size={20} /> Iniciar Reparación
                                                        </button>
                                                    )}

                                                    {/* 4. Finish (If In Progress) */}
                                                    {job.status === 'In Progress' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(job.id, 'Completed')}
                                                            style={{ padding: '12px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                                        >
                                                            <CheckCircle size={20} /> Finalizar Reparación
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* Standard Flow for Lavado/Gas */
                                        <div>
                                            {job.status === 'Accepted' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(job.id, 'In Progress')}
                                                    style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-action-blue)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}
                                                >
                                                    <Play size={20} /> Iniciar Trabajo
                                                </button>
                                            )}
                                            {job.status === 'In Progress' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(job.id, 'Completed')}
                                                    style={{ width: '100%', padding: '12px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <CheckCircle size={20} /> Finalizar Trabajo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <h3 style={{ marginBottom: '16px' }}>Ofertas Disponibles en Tiempo Real</h3>

                {availableJobs.length === 0 ? (
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

                            {job.contact_method && (
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
                )}
            </div>
        </div>
    );
};
export default Dashboard;
