
import React, { createContext, useContext, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { UserProfile, UserRole, AuthContextType, checkIsAdmin, checkHasFullPlaybackAccess } from './auth/authTypes';
import { getInitialTestProfile } from './auth/authTestProfile';
import { useAuthSyncEffect } from './auth/useAuthSyncEffect';
import { notifyToast } from '../utils/toastHelper';
import { syncAccountPreferenceSilently } from '../utils/userPreferencesStorage';

export type { UserRole, UserProfile } from './auth/authTypes';
export { checkIsAdmin, checkHasFullPlaybackAccess } from './auth/authTypes';

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
  hasFullPlaybackAccess: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getInitialTestProfile()?.user || null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => getInitialTestProfile()?.profile || null);
  const [loading, setLoading] = useState(() => !getInitialTestProfile());

  useAuthSyncEffect({ setCurrentUser, setUserProfile, setLoading });

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      const isPt = useSequencerStore.getState().lang === 'pt';
      notifyToast((isPt ? 'Erro de conexão Google: ' : 'Erreur de connexion Google : ') + (error?.message || error), 'error');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      useNomenclatureStore.getState().syncGroupNomenclature(null);
      useSequencerStore.getState().setIsLeftHanded(false);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const hasAccess = (requiredRole: UserRole): boolean => {
    if (requiredRole === 'admin') return checkIsAdmin(userProfile);
    return true;
  };

  const updateUserPreference = async (key: 'isDarkMode' | 'isLeftHanded', value: boolean) => {
    if (!currentUser || !userProfile) return;
    const patch: Record<string, unknown> = key === 'isLeftHanded'
      ? { isLeftHanded: value, lateralite: value ? 'gaucher' : 'droitier' }
      : { [key]: value };
    setUserProfile((prev) => (prev ? ({ ...prev, ...patch } as UserProfile) : prev));
    await syncAccountPreferenceSilently(currentUser.uid, patch);
  };

  const updateUserProfileField = async (key: string, value: any) => {
    if (!currentUser || !userProfile) return;
    setUserProfile((prev) => (prev ? ({ ...prev, [key]: value } as UserProfile) : prev));
    await syncAccountPreferenceSilently(currentUser.uid, { [key]: value });
  };

  const isAdmin = checkIsAdmin(userProfile);
  const hasFullPlaybackAccess = checkHasFullPlaybackAccess(userProfile, isAdmin);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithGoogle,
        logout,
        hasAccess,
        updateUserPreference,
        updateUserProfileField,
        isAdmin,
        hasFullPlaybackAccess,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
