import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {GoogleOAuthProvider} from '@react-oauth/google';
import {GameDataProvider} from './contexts/GameDataContext.tsx';
import App from './App.tsx';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <GameDataProvider>
        <App />
      </GameDataProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
