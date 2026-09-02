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
  dbRole?: string | null;
  createdAt: number;
  isDarkMode?: boolean;
  isLeftHanded?: boolean;
  mestreId?: string | null;
  groupLogoUrl?: string | null;
  maxEleves?: number;
  mestreMessage?: string;
  signatureUrl?: string;
  instrument?: string;
  customSwingOffsets?: [number, number, number, number];
  customSwingIntensity?: number;
  hasDancaAccess?: boolean;
  groupName?: string;
  groupId?: string;
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
  isAdmin: boolean;
}

const roleLevels: Record<UserRole, number> = {
  visiteur: 0,
  eleve: 1,
  mestre: 2,
  admin: 3
};

export const checkIsAdmin = (profile: UserProfile | null | undefined): boolean => {
  if (!profile) return false;
  const actualRole = profile.dbRole || profile.role;
  return actualRole === 'admin' || actualRole === 'mestre' || actualRole === 'mestri';
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
  isAdmin: false,
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
          
          // Auto-resolve Mestre for members belonging to an association/group (e.g. Samambaia)
          if (!profile.mestreId && profile.groupId) {
            try {
              const mestreQ = query(
                collection(db, 'users'),
                where('groupId', 'in', [profile.groupId, profile.groupId.toLowerCase(), 'Samambaia', 'samambaia']),
                where('role', '==', 'mestre')
              );
              const mestreSnap = await getDocs(mestreQ);
              if (!mestreSnap.empty) {
                const mestreDoc = mestreSnap.docs[0];
                profile.mestreId = mestreDoc.id;
                if (!profile.groupName && mestreDoc.data().groupName) {
                  profile.groupName = mestreDoc.data().groupName;
                }
                updateDoc(userRef, { mestreId: mestreDoc.id }).catch(() => {});
              }
            } catch (err) {
              console.warn("Could not resolve mestre for group:", err);
            }
          }

          if ((profile.role === 'mestre' || (profile.dbRole as any) === 'mestre') && !profile.mestreId) {
            profile.mestreId = user.uid;
          }
          
          setUserProfile({ ...profile, dbRole: profile.dbRole || profile.role });
        } else {
          let initialRole: UserRole = 'visiteur';
          let initialMestreId: string | null = null;
          
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
          
          setUserProfile({ ...newProfile, dbRole: newProfile.dbRole || newProfile.role });
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
      return checkIsAdmin(userProfile);
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
      updateUserProfileField,
      isAdmin: checkIsAdmin(userProfile),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
