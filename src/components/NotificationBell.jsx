import React, { useState, useEffect, useRef } from 'react';
import { Bell, Trash } from 'phosphor-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import { API_URL } from '../config';
import { getSocket } from '../socket';

// const socket = io(API_URL);

const NotificationBell = () => {
    const socket = getSocket();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const bellRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        // Fetch initial notifications
        fetch(`${API_URL}/api/notifications`, {
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
                fetch(`${API_URL}/api/notifications`, {
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
            await fetch(`${API_URL}/api/notifications/${id}/read`, {
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
                <>
                    {/* Backdrop for mobile to close on click outside (optional but good) */}
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1999 }}
                        onClick={() => setShowDropdown(false)}
                    />
                    <div style={{
                        position: 'fixed', /* Use fixed to center on screen */
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '90%',
                        maxWidth: '400px',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                        zIndex: 2000,
                        overflow: 'hidden',
                        maxHeight: '60vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid #eee',
                            fontWeight: 'bold',
                            color: 'var(--color-deep-navy)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#fafafa'
                        }}>
                            <span>Notificaciones</span>
                            <button onClick={() => setShowDropdown(false)} style={{ background: 'none', border: 'none', color: '#999', fontSize: '1.2rem' }}>&times;</button>
                        </div>
                        <div style={{ overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                                    No tienes notificaciones
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {notifications.map(notif => (
                                        <motion.div
                                            key={notif.id}
                                            layout
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0, x: -100 }}
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            dragElastic={0.5}
                                            onDragEnd={async (e, { offset }) => {
                                                if (offset.x < -50) { // Swipe Left to delete
                                                    // Optimistic update
                                                    const wasUnread = !notif.is_read;
                                                    setNotifications(prev => prev.filter(n => n.id !== notif.id));

                                                    // Update counter if it was unread
                                                    if (wasUnread) {
                                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                                    }

                                                    // Call backend to delete permenantly
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/notifications/${notif.id}`, {
                                                            method: 'DELETE',
                                                            headers: { 'Authorization': `Bearer ${user.token}` }
                                                        });

                                                        if (!res.ok) {
                                                            const errText = await res.text();
                                                            console.error("Failed to delete:", errText);
                                                            // Revert optimistic update if needed or just alert
                                                            alert("Error al eliminar notificación: " + (res.status === 404 ? "El servidor no reconoce la ruta (Reinicia el backend)" : errText));
                                                            // Optional: revert state logic here
                                                        }
                                                    } catch (err) {
                                                        console.error("Error deleting notification:", err);
                                                        alert("Error de conexión al eliminar.");
                                                    }
                                                }
                                            }}
                                            style={{
                                                padding: '16px',
                                                borderBottom: '1px solid #f0f0f0',
                                                backgroundColor: notif.is_read ? 'white' : '#E1F5FE',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                position: 'relative',
                                                touchAction: 'pan-y' // Important for scroll
                                            }}
                                            onClick={() => { handleMarkAsRead(notif.id, notif.is_read); }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <p style={{ margin: 0, fontSize: '0.95rem', color: '#333', lineHeight: '1.4', wordBreak: 'break-word', flex: 1 }}>
                                                    {notif.message}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#888', alignSelf: 'flex-end' }}>
                                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {/* Swipe Hint Background could be added here via another absolute div behind */}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
