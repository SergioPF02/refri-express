import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'phosphor-react';
import Button from '../components/Button';

const Success = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    if (!state) return <div>Error: No hay datos de pedido.</div>;

    return (
        <div className="container" style={{ textAlign: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
                <CheckCircle size={80} color="#00C853" weight="fill" />
            </div>

            <h1 style={{ marginBottom: '16px' }}>¡Pedido Confirmado!</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                Su solicitud ha sido recibida exitosamente. Le notificaremos en cuanto un técnico asignado acepte su servicio.
            </p>

            <div className="glass-card" style={{ padding: '24px', textAlign: 'left', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong>Servicio:</strong>
                    <span>{state.service}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong>Fecha:</strong>
                    <span>{state.date} a las {state.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Dirección:</strong>
                    <span style={{ maxWidth: '60%', textAlign: 'right' }}>{state.address}</span>
                </div>
            </div>

            <Button onClick={() => navigate('/home')} variant="secondary">
                Volver al Inicio
            </Button>
        </div>
    );
};

export default Success;
