import React, { ErrorInfo, ReactNode } from 'react';
import { WarningCircle, ArrowClockwise } from 'phosphor-react';
import Button from './Button';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReset = () => {
        window.location.href = '/'; // Reset to home
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '24px',
                    backgroundColor: 'var(--color-bg-light)',
                    textAlign: 'center'
                }}>
                    <div className="glass-card" style={{ padding: '40px', maxWidth: '450px' }}>
                        <WarningCircle size={64} color="#ff5252" weight="duotone" style={{ marginBottom: '24px' }} />
                        <h1 style={{ color: 'var(--color-deep-navy)', marginBottom: '16px' }}>¡Ups! Algo salió mal</h1>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                            La aplicación encontró un error inesperado. Hemos sido notificados y estamos trabajando en ello.
                        </p>

                        <Button onClick={this.handleReset}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ArrowClockwise size={20} weight="bold" />
                                Reiniciar Aplicación
                            </div>
                        </Button>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={{ marginTop: '24px', textAlign: 'left', fontSize: '0.8rem', color: '#666', opacity: 0.7 }}>
                                <summary style={{ cursor: 'pointer' }}>Ver detalles (Desarrollo)</summary>
                                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
