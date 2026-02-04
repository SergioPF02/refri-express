import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { value } = await Preferences.get({ key: 'refri_user' });
                if (value) {
                    setUser(JSON.parse(value));
                }
            } catch (error) {
                console.error("Failed to parse user session", error);
                await Preferences.remove({ key: 'refri_user' });
            } finally {
                setLoading(false);
            }
        };
        checkSession();
    }, []);

    // Push Notifications Logic
    useEffect(() => {
        const setupPush = async () => {
            if (user && Capacitor.getPlatform() !== 'web') {
                try {
                    await PushNotifications.removeAllListeners();

                    let perm = await PushNotifications.checkPermissions();
                    if (perm.receive === 'prompt') {
                        perm = await PushNotifications.requestPermissions();
                    }
                    if (perm.receive !== 'granted') {
                        console.log('Push permissions denied');
                        return;
                    }

                    await PushNotifications.register();

                    PushNotifications.addListener('registration', async (token) => {
                        console.log('Push Token:', token.value);
                        // Send to backend
                        try {
                            await fetch(`${API_URL}/api/users/device-token`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${user.token}`
                                },
                                body: JSON.stringify({ token: token.value })
                            });
                        } catch (err) {
                            console.error("Error sending token to backend", err);
                        }
                    });

                    PushNotifications.addListener('pushNotificationReceived', (notification) => {
                        console.log('Push Received:', notification);
                        // Optional: Show alert or toast if app is open
                    });

                    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                        console.log('Push Action:', notification);
                        // Navigate?
                    });

                } catch (e) {
                    console.error("Push Setup Failed", e);
                }
            }
        };
        setupPush();
    }, [user]);

    const login = async (userData) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();

            if (response.ok) {
                updateUser(data);
                return true;
            } else {
                alert(data.error);
                return false;
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server');
            return false;
        }
    };

    const logout = async () => {
        setUser(null);
        await Preferences.remove({ key: 'refri_user' });
    };

    const updateUser = async (userData) => {
        setUser(userData);
        await Preferences.set({ key: 'refri_user', value: JSON.stringify(userData) });
    };

    const register = async (userData) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(text || "Error del servidor (no JSON)");
            }

            if (response.ok) {
                // Auto login after register
                updateUser(data);
                return true;
            } else {
                let errorMsg = data.error || "Error al registrarse";
                if (errorMsg.includes("already exists")) errorMsg = "El correo ya está registrado.";
                if (errorMsg.includes("Password")) errorMsg = "La contraseña es muy débil.";
                alert(errorMsg);
                return false;
            }
        } catch (err) {
            console.error(err);
            let msg = err.message || 'Error desconocido';
            if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
                msg = 'No se pudo conectar al servidor. Verifica tu conexión a internet e inténtalo de nuevo.';
            }
            alert(msg);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateUser, loading }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'white', color: 'black' }}>
                    <h2>Cargando aplicación...</h2>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
