import React, { StrictMode, useState, useEffect } from 'react';
import {createRoot} from 'react-dom/client';
import {GameDataProvider} from './contexts/GameDataContext.tsx';
import {SequencerProvider} from './contexts/SequencerContext.tsx';
import {AudioProvider} from './contexts/AudioContext.tsx';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { indexedDBPersister } from './queryPersister';
import './index.css';

export function isValidGoogleClientId(id: string | undefined | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return (
    trimmed !== '' &&
    trimmed !== 'undefined' &&
    trimmed !== 'null' &&
    !trimmed.includes('YOUR_GOOGLE_CLIENT_ID') &&
    /^\d/.test(trimmed) &&
    trimmed.endsWith('.apps.googleusercontent.com')
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const hasGoogleClientId = isValidGoogleClientId(googleClientId);

if (!hasGoogleClientId) {
  // console.warn("La sauvegarde Cloud (Google Auth/Drive) est désactivée faute de clé client ID valide (VITE_GOOGLE_CLIENT_ID). L'application fonctionne en mode Offline-First.");
}
// Capture invite code from URL if present
const urlParams = new URLSearchParams(window.location.search);
const inviteCode = urlParams.get('invite');
if (inviteCode) {
  sessionStorage.setItem('o-girador-invite', inviteCode);
  // Optional: clear the URL so it looks cleaner
  window.history.replaceState({}, document.title, window.location.pathname);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      gcTime: 1000 * 60 * 60 * 24, // 24 hours cache retention
    },
  },
});

export class TopLevelErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("TopLevelErrorBoundary caught an error:", error, errorInfo);
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
            🚨 ERREUR CRITIQUE DE RENDU (REACT)
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

export const GlobalErrorListener: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setErrorMsg(`[Global Error] ${e.message} at ${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      setErrorMsg(`[Promise Rejection] ${reason?.stack || reason?.message || String(reason)}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (!errorMsg) return null;

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
        🚨 ERREUR ASYNCHRONE DETECTEE (TABLETTE)
      </h1>
      <p>L'application a détecté une erreur hors du cycle de rendu standard :</p>
      <pre style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', overflowX: 'auto', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.2)' }}>
        {errorMsg}
      </pre>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button 
          onClick={() => setErrorMsg(null)}
          style={{
            padding: '0.5rem 1.2rem',
            backgroundColor: '#f4ecd8',
            color: '#8b2a1a',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '3px 3px 0 #000'
          }}
        >
          Fermer / Ignorer
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1.2rem',
            backgroundColor: 'transparent',
            color: '#f4ecd8',
            border: '2px solid #f4ecd8',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Recharger
        </button>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <TopLevelErrorBoundary>
    <GlobalErrorListener />
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: indexedDBPersister }}>
      <AuthProvider>
        <GameDataProvider>
          <SequencerProvider>
            <AudioProvider>
              <App />
            </AudioProvider>
          </SequencerProvider>
        </GameDataProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  </TopLevelErrorBoundary>
);
