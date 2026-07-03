import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GameDataProvider} from './contexts/GameDataContext.tsx';
import {SequencerProvider} from './contexts/SequencerContext.tsx';
import {AudioProvider} from './contexts/AudioContext.tsx';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  console.warn("La sauvegarde Cloud (Google Auth/Drive) est désactivée faute de clé client ID valide (VITE_GOOGLE_CLIENT_ID). L'application fonctionne en mode Offline-First.");
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
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GameDataProvider>
        <SequencerProvider>
          <AudioProvider>
            <App />
          </AudioProvider>
        </SequencerProvider>
      </GameDataProvider>
    </AuthProvider>
  </QueryClientProvider>
);
