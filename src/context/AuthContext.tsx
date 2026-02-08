import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { User, AuthContextType } from '../types';

import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { value } = await Preferences.get({ key: 'refri_user' });
                if (value) {
                    setUser(JSON.parse(value) as User);
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
                            // api client handles auth headers automatically via Preferences
                            await api.put('/api/users/device-token', { token: token.value });
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

    const login = async (userData: any): Promise<boolean> => {
        try {
            const data = await api.post('/api/auth/login', userData);
            updateUser(data);
            return true;
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error connecting to server');
            return false;
        }
    };

    const logout = async () => {
        setUser(null);
        await Preferences.remove({ key: 'refri_user' });
    };

    const updateUser = async (userData: User) => {
        setUser(userData);
        await Preferences.set({ key: 'refri_user', value: JSON.stringify(userData) });
    };

    const register = async (userData: any): Promise<boolean> => {
        try {
            const data = await api.post('/api/auth/register', userData);
            // Auto login after register
            updateUser(data);
            return true;
        } catch (err: any) {
            console.error(err);
            let errorMsg = err.message || "Error al registrarse";
            if (errorMsg.includes("already exists")) errorMsg = "El correo ya está registrado.";
            if (errorMsg.includes("Password")) errorMsg = "La contraseña es muy débil.";
            if (err.status === 404 || err.status === 500) errorMsg = "Error del servidor. Inténtalo más tarde.";

            alert(errorMsg);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout,
            register,
            updateUser, loading
        }}>
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
