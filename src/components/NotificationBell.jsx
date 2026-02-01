import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

const NotificationBell = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const bellRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Fetch initial notifications
        fetch('http://localhost:5000/api/notifications', {
            headers: { 'Authorization': `Bearer ${user.token}` }
        })
            .then(res => res.json())
            .then(data => {
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            })
            .catch(console.error);

        // Listen for new notifications
        socket.on('notification', (payload) => {
            if (payload.user_email === user.email) {
                // Re-fetch or manually add. Let's simple re-fetch for sync
                fetch('http://localhost:5000/api/notifications', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
                    .then(res => res.json())
                    .then(data => {
                        setNotifications(data);
                        setUnreadCount(data.filter(n => !n.is_read).length);
                        // Play sound
                        const audio = new Audio('/notification.mp3'); // Assuming file exists or fails silently
                        audio.play().catch(e => { });
                    });
            }
        });

        return () => {
            socket.off('notification');
        };
    }, [user]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, isRead) => {
        if (isRead) return;
        try {
            await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) { console.error(e); }
    };

    const toggleDropdown = () => setShowDropdown(!showDropdown);

    return (
        <div style={{ position: 'relative' }} ref={bellRef}>
            <button
                onClick={toggleDropdown}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px'
                }}
            >
                <Bell size={28} color="var(--color-deep-navy)" weight={unreadCount > 0 ? "fill" : "regular"} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '0px',
                        right: '0px',
                        backgroundColor: 'red',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '300px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#333' }}>
                        Notificaciones
                    </div>
                    {notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                            Sin notificaciones
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => handleMarkAsRead(notif.id, notif.is_read)}
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f5f5f5',
                                    backgroundColor: notif.is_read ? 'white' : '#e3f2fd',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = notif.is_read ? '#f9f9f9' : '#bbdefb'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = notif.is_read ? 'white' : '#e3f2fd'}
                            >
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>{notif.message}</p>
                                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginTop: '4px' }}>
                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
