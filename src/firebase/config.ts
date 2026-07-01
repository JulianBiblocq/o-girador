import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCTvRPj2p3zdIfEjftXoSvRJ43Uy0EfPMY";
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "o-girador-7828c.firebaseapp.com";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "o-girador-7828c";
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "o-girador-7828c.firebasestorage.app";
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488703864701";
const appId = import.meta.env.VITE_FIREBASE_APP_ID || "1:488703864701:web:50b8cbcd1ca4038e15e614";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "601273236123-e90og6lr85v5ca2lprke41igbs02alrv.apps.googleusercontent.com";

if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
  throw new Error("🔥 ERREUR CRITIQUE: Configuration Firebase manquante. Vérifiez vos variables d'environnement VITE_FIREBASE_*");
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  measurementId: "G-PZJKCF2271"
};

// Initialize Firebase safely for HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
