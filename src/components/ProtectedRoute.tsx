import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: 'client' | 'worker' | 'admin';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'white', color: 'black' }}>
            <h2>Cargando...</h2>
        </div>;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Redirect based on the actual user's role
        if (user.role === 'worker') {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/home" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
