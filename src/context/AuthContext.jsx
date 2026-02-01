import React, { createContext, useContext, useState, useEffect } from 'react';

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
            const response = await fetch('http://localhost:5000/api/auth/login', {
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
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();

            if (response.ok) {
                // Auto login after register
                setUser(data);
                localStorage.setItem('refri_user', JSON.stringify(data));
                return true;
            } else {
                alert("Error: " + (data.error || "Failed to register"));
                return false;
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
