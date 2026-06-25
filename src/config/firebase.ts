import { initializeApp } from 'firebase/app';

// Configuration Firebase récupérée depuis les variables d'environnement (Vite)
// Aucune clé n'est codée en dur ici pour des raisons de sécurité.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialisation de l'application Firebase
const app = initializeApp(firebaseConfig);

export default app;
