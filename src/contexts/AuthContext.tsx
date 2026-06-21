import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export type UserRole = 'visiteur' | 'eleve' | 'mestre' | 'admin';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: number;
  isDarkMode?: boolean;
  isLeftHanded?: boolean;
  mestreId?: string | null;
  groupLogoUrl?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: UserRole) => boolean;
  updateUserPreference: (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => Promise<void>;
}

const roleLevels: Record<UserRole, number> = {
  visiteur: 0,
  eleve: 1,
  mestre: 2,
  admin: 3
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
  hasAccess: () => false,
  updateUserPreference: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'visiteur', // Default role
            createdAt: Date.now(),
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const hasAccess = (requiredRole: UserRole): boolean => {
    if (!userProfile) return requiredRole === 'visiteur';
    return roleLevels[userProfile.role] >= roleLevels[requiredRole];
  };

  const updateUserPreference = async (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => {
    if (currentUser && userProfile) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { [key]: value }, { merge: true });
        setUserProfile((prev) => prev ? { ...prev, [key]: value } : null);
      } catch (error) {
        console.error(`Error updating ${key}:`, error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, signInWithGoogle, logout, hasAccess, updateUserPreference }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
