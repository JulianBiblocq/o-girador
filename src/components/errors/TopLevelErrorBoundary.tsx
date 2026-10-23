
import React from 'react';
import { telemetryService } from '../../services/telemetryService';

export class TopLevelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("TopLevelErrorBoundary caught an error:", error, errorInfo);
    try {
      telemetryService.logError(error, 'ReactBoundary');
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#8b2a1a',
          color: '#f4ecd8',
          padding: '2rem',
          zIndex: 999999,
          fontFamily: 'monospace',
          overflowY: 'auto',
          fontSize: '13px',
          textAlign: 'left',
          border: '10px double #f4ecd8',
          boxSizing: 'border-box'
        }}>
          <h1 style={{ fontSize: '20px', borderBottom: '2px solid #f4ecd8', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'sans-serif' }}>
            ERREUR CRITIQUE DE RENDU (REACT)
          </h1>
          <p><strong>Message :</strong> {this.state.error?.message}</p>
          <p><strong>Détails :</strong></p>
          <pre style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.2)' }}>
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.2rem',
              backgroundColor: '#f4ecd8',
              color: '#8b2a1a',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '3px 3px 0 #000'
            }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
