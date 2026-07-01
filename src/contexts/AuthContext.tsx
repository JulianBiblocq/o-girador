import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  maxEleves?: number;
  mestreMessage?: string;
  signatureUrl?: string;
  instrument?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasAccess: (requiredRole: UserRole) => boolean;
  updateUserPreference: (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => Promise<void>;
  updateUserProfileField: (key: string, value: any) => Promise<void>;
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
  updateUserProfileField: async () => {},
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
          const profile = docSnap.data() as UserProfile;
          
          // Check for pending invite if they are a 'visiteur'
          const pendingInvite = sessionStorage.getItem('o-girador-invite');
          if (pendingInvite && profile.role === 'visiteur') {
            const mestreRef = doc(db, 'users', pendingInvite);
            const mestreSnap = await getDoc(mestreRef);
            if (mestreSnap.exists()) {
              const mestreData = mestreSnap.data() as UserProfile;
              let canJoin = true;
              if (mestreData.maxEleves && mestreData.maxEleves > 0) {
                const elevesQuery = query(collection(db, 'users'), where('mestreId', '==', pendingInvite));
                const elevesSnapshot = await getDocs(elevesQuery);
                if (elevesSnapshot.size >= mestreData.maxEleves) {
                  canJoin = false;
                  alert(`Le Mestre ${mestreData.displayName || ''} a atteint sa limite maximale d'élèves.`);
                }
              }
              if (canJoin) {
                profile.role = 'eleve';
                profile.mestreId = pendingInvite;
                await updateDoc(userRef, { role: 'eleve', mestreId: pendingInvite });
                alert(`Vous êtes maintenant élève du Mestre ${mestreData.displayName || ''} !`);
              }
            }
            sessionStorage.removeItem('o-girador-invite');
          }
          
          // OVERRIDE FOR STANDBY MODE: Everyone gets mestre access
          const profileForUI = { ...profile };
          if (profileForUI.role !== 'admin') {
            profileForUI.role = 'mestre';
          }
          setUserProfile(profileForUI);
        } else {
          let initialRole: UserRole = 'visiteur';
          let initialMestreId: string | undefined = undefined;
          
          // Check for pending invite
          const pendingInvite = sessionStorage.getItem('o-girador-invite');
          if (pendingInvite) {
            const mestreRef = doc(db, 'users', pendingInvite);
            const mestreSnap = await getDoc(mestreRef);
            if (mestreSnap.exists()) {
              const mestreData = mestreSnap.data() as UserProfile;
              let canJoin = true;
              if (mestreData.maxEleves && mestreData.maxEleves > 0) {
                const elevesQuery = query(collection(db, 'users'), where('mestreId', '==', pendingInvite));
                const elevesSnapshot = await getDocs(elevesQuery);
                if (elevesSnapshot.size >= mestreData.maxEleves) {
                  canJoin = false;
                  alert(`Le Mestre ${mestreData.displayName || ''} a atteint sa limite maximale d'élèves.`);
                }
              }
              if (canJoin) {
                initialRole = 'eleve';
                initialMestreId = pendingInvite;
                alert(`Bienvenue ! Vous avez été ajouté comme élève du Mestre ${mestreData.displayName || ''}.`);
              }
            }
            sessionStorage.removeItem('o-girador-invite');
          }

          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: initialRole,
            mestreId: initialMestreId,
            createdAt: Date.now(),
          };
          await setDoc(userRef, newProfile);
          
          // OVERRIDE FOR STANDBY MODE: Everyone gets mestre access
          const profileForUI = { ...newProfile };
          if (profileForUI.role !== 'admin') {
            profileForUI.role = 'mestre';
          }
          setUserProfile(profileForUI);
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
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      alert(`Erreur de connexion Google: ${error?.message || error}`);
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
    if (requiredRole === 'admin') {
      return userProfile?.role === 'admin';
    }
    return true; // TEMPORAIRE: Désactivation des autres restrictions
  };

  const updateUserPreference = async (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => {
    if (!currentUser || !userProfile) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { [key]: value });
      setUserProfile({ ...userProfile, [key]: value });
    } catch (err) {
      console.error('Error updating user preference:', err);
    }
  };

  const updateUserProfileField = async (key: string, value: any) => {
    if (!currentUser || !userProfile) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { [key]: value });
      setUserProfile({ ...userProfile, [key]: value });
    } catch (err) {
      console.error(`Error updating user profile field ${key}:`, err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      loading, 
      signInWithGoogle, 
      logout,
      hasAccess,
      updateUserPreference,
      updateUserProfileField
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
