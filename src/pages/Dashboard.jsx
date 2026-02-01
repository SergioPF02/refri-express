import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, CurrencyDollar, CheckCircle, Phone, NavigationArrow, Play, User } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Connect to backend

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        // Initial fetch
        fetch('http://localhost:5000/api/bookings')
            .then(res => res.json())
            .then(data => setBookings(data))
            .catch(err => console.error(err));

        // Socket listeners
        socket.on('new_job', (job) => {
            // Add new job to top
            setBookings(prev => [job, ...prev]);
            // Optional: Sound alert
            try { new Audio('/notification.mp3').play().catch(e => { }); } catch (e) { }
        });

        socket.on('job_taken', (updatedJob) => {
            // Update the specific job in the list
            setBookings(prev => prev.map(job =>
                job.id === updatedJob.id ? updatedJob : job
            ));
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

    const openGoogleMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    const myJobs = bookings.filter(b => b.technician_id === user?.id && b.status !== 'Completed');
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

                                <div style={{ margin: '12px 0', fontSize: '0.95rem' }}>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <MapPin size={18} color="#EB5757" /> {job.address}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <Clock size={18} color="#2F80ED" /> {new Date(job.date).toLocaleDateString()} - {job.time}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                        <CurrencyDollar size={18} color="#2196F3" /> Costo: ${job.price}
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                                    <button
                                        onClick={() => openGoogleMaps(job.lat, job.lng)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '8px' }}
                                    >
                                        <NavigationArrow size={20} /> Ir a Mapa
                                    </button>
                                    <a
                                        href={`tel:${job.phone || ''}`}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', backgroundColor: '#E8F5E9', color: '#2E7D32', border: 'none', borderRadius: '8px', textDecoration: 'none' }}
                                    >
                                        <Phone size={20} /> Llamar
                                    </a>
                                </div>

                                <div style={{ marginTop: '12px' }}>
                                    {job.status === 'Accepted' && (
                                        <button
                                            onClick={() => handleStatusUpdate(job.id, 'In Progress')}
                                            style={{ width: '100%', padding: '12px', backgroundColor: 'var(--color-action-blue)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
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
                                    <span style={{ fontSize: '0.9rem' }}>{new Date(job.date).toLocaleDateString()} a las {job.time}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <button
                                    onClick={() => handleAcceptJob(job.id)}
                                    style={{
                                        width: '100%',
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
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default Dashboard;
