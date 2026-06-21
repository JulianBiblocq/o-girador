import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {GameDataProvider} from './contexts/GameDataContext.tsx';
import {SequencerProvider} from './contexts/SequencerContext.tsx';
import {AudioProvider} from './contexts/AudioContext.tsx';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '601273236123-e90og6lr85v5ca2lprke41igbs02alrv.apps.googleusercontent.com';
const hasGoogleClientId = isValidGoogleClientId(googleClientId);

if (!hasGoogleClientId) {
  console.warn("La sauvegarde Cloud (Google Auth/Drive) est désactivée faute de clé client ID valide (VITE_GOOGLE_CLIENT_ID). L'application fonctionne en mode Offline-First.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hasGoogleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <GameDataProvider>
            <SequencerProvider>
              <AudioProvider>
                <App />
              </AudioProvider>
            </SequencerProvider>
          </GameDataProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    ) : (
      <AuthProvider>
        <GameDataProvider>
          <SequencerProvider>
            <AudioProvider>
              <App />
            </AudioProvider>
          </SequencerProvider>
        </GameDataProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
