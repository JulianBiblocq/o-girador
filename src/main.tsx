import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {GameDataProvider} from './contexts/GameDataContext.tsx';
import {SequencerProvider} from './contexts/SequencerContext.tsx';
import {AudioProvider} from './contexts/AudioContext.tsx';
import App from './App.tsx';
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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const hasGoogleClientId = isValidGoogleClientId(googleClientId);

if (!hasGoogleClientId) {
  console.warn("La sauvegarde Cloud (Google Auth/Drive) est désactivée faute de clé client ID valide (VITE_GOOGLE_CLIENT_ID). L'application fonctionne en mode Offline-First.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hasGoogleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <GameDataProvider>
          <SequencerProvider>
            <AudioProvider>
              <App />
            </AudioProvider>
          </SequencerProvider>
        </GameDataProvider>
      </GoogleOAuthProvider>
    ) : (
      <GameDataProvider>
        <SequencerProvider>
          <AudioProvider>
            <App />
          </AudioProvider>
        </SequencerProvider>
      </GameDataProvider>
    )}
  </StrictMode>,
);
