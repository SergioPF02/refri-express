import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for existing session
        const storedUser = localStorage.getItem('refri_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error("Failed to parse user session", error);
                localStorage.removeItem('refri_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (userData) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();

            if (response.ok) {
                setUser(data);
                localStorage.setItem('refri_user', JSON.stringify(data));
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

    const logout = () => {
        setUser(null);
        localStorage.removeItem('refri_user');
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
                setUser(data);
                localStorage.setItem('refri_user', JSON.stringify(data));
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
            alert('Error: ' + (err.message || 'Error de conexión'));
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
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
