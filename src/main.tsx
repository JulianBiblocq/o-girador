/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { SequencerProvider } from './contexts/SequencerContext';
import { AudioProvider } from './contexts/AudioContext';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { indexedDBPersister } from './queryPersister';
import { TopLevelErrorBoundary } from './components/errors/TopLevelErrorBoundary';
import { GlobalErrorListener } from './components/errors/GlobalErrorListener';
import { setupDevGlobalBindings } from './utils/devGlobalBindings';
import './index.css';

setupDevGlobalBindings();

// Filtrer les logs de debug vocal (VOCAL DEBUG) et de scheduler pour ne pas encombrer la console F12
const originalLog = console.log;
console.log = function (...args) {
  const firstArg = args[0];
  if (typeof firstArg === 'string' && (firstArg.includes('[VOCAL DEBUG]') || firstArg.includes('Scheduling tick'))) {
    return;
  }
  originalLog.apply(console, args);
};

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

// Capture invite code from URL if present
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  if (inviteCode) {
    sessionStorage.setItem('o-girador-invite', inviteCode);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

export { TopLevelErrorBoundary, GlobalErrorListener };

const container = document.getElementById('root')!;
let root = (window as any).__REACT_ROOT__;
if (!root) {
  root = createRoot(container);
  (window as any).__REACT_ROOT__ = root;
}

root.render(
  <TopLevelErrorBoundary>
    <GlobalErrorListener />
    <HelmetProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: indexedDBPersister }}>
        <AuthProvider>
          <SequencerProvider>
            <AudioProvider>
              <App />
            </AudioProvider>
          </SequencerProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </HelmetProvider>
  </TopLevelErrorBoundary>
);
