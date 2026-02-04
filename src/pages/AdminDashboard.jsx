import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// Using only standard icons for safety
import { Users, Briefcase, ArrowLeft, ShieldCheck, User, Wrench, Trash, CurrencyDollar } from 'phosphor-react';
import { API_URL } from '../config';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState({ users: 0, active_jobs: 0, pending_jobs: 0, revenue: 0 });
    const [usersList, setUsersList] = useState([]);
    const [activeTab, setActiveTab] = useState('stats');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                await Promise.all([fetchStats(), fetchUsers()]);
            } catch (err) {
                console.error("Dashboard Load Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            } else {
                console.error("Stats Error:", res.status);
            }
        } catch (e) { console.error(e); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsersList(data);
            }
        } catch (e) { console.error(e); }
    };

    const handleRoleChange = async (userId, newRole) => {
        if (!window.confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                alert("Rol actualizado");
                fetchUsers();
            } else {
                alert("Error al actualizar");
            }
        } catch (e) { console.error(e); }
    };

    if (error) {
        return <div style={{ padding: 40, color: 'red' }}>Error: {error}</div>;
    }

    return (
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f4f6f8' }}>
            <div className="container">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                    <button onClick={() => navigate('/home')} style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer' }}>
                        <ArrowLeft size={24} color="#333" />
                    </button>
                    <h2 style={{ marginLeft: '16px', color: '#1a1a1a', fontWeight: 'bold' }}>Panel de Administrador</h2>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>Cargando datos...</div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <button
                                onClick={() => setActiveTab('stats')}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    backgroundColor: activeTab === 'stats' ? '#212121' : 'white',
                                    color: activeTab === 'stats' ? 'white' : '#666',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                            >
                                Estadísticas
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    backgroundColor: activeTab === 'users' ? '#212121' : 'white',
                                    color: activeTab === 'users' ? 'white' : '#666',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                            >
                                Usuarios ({usersList.length})
                            </button>
                        </div>

                        {activeTab === 'stats' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                                <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                                    <Users size={32} color="#2196F3" style={{ marginBottom: '8px' }} />
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>{stats.users || 0}</h3>
                                    <p style={{ color: '#666', margin: 0 }}>Usuarios</p>
                                </div>
                                <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                                    <Briefcase size={32} color="#FF9800" style={{ marginBottom: '8px' }} />
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>{stats.active_jobs || 0}</h3>
                                    <p style={{ color: '#666', margin: 0 }}>Trabajos Activos</p>
                                </div>
                                <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                                    <CurrencyDollar size={32} color="#4CAF50" style={{ marginBottom: '8px' }} />
                                    <h3 style={{ margin: 0, fontSize: '2rem' }}>${stats.revenue || 0}</h3>
                                    <p style={{ color: '#666', margin: 0 }}>Ingresos Totales</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="glass-card" style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                            <th style={{ padding: '12px' }}>Usuario</th>
                                            <th style={{ padding: '12px' }}>Email</th>
                                            <th style={{ padding: '12px' }}>Rol Actual</th>
                                            <th style={{ padding: '12px' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersList.map(u => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.name}</td>
                                                <td style={{ padding: '12px', color: '#555' }}>{u.email}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '0.8rem',
                                                        backgroundColor: u.role === 'admin' ? '#212121' : u.role === 'worker' ? '#E3F2FD' : '#eee',
                                                        color: u.role === 'admin' ? 'white' : u.role === 'worker' ? '#1565C0' : '#333'
                                                    }}>
                                                        {u.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {u.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handleRoleChange(u.id, 'admin')}
                                                                title="Hacer Admin"
                                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #333', cursor: 'pointer', background: 'white' }}
                                                            >
                                                                <ShieldCheck size={16} />
                                                            </button>
                                                        )}
                                                        {u.role !== 'worker' && (
                                                            <button
                                                                onClick={() => handleRoleChange(u.id, 'worker')}
                                                                title="Hacer Técnico"
                                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #2196F3', color: '#2196F3', cursor: 'pointer', background: 'white' }}
                                                            >
                                                                <Wrench size={16} />
                                                            </button>
                                                        )}
                                                        {u.role !== 'client' && (
                                                            <button
                                                                onClick={() => handleRoleChange(u.id, 'client')}
                                                                title="Bajar a Cliente"
                                                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #999', color: '#666', cursor: 'pointer', background: 'white' }}
                                                            >
                                                                <User size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
