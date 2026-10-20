/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useNomenclatureStore } from '../stores/useNomenclatureStore';
import { useSequencerStore } from '../stores/useSequencerStore';
import { UserProfile, UserRole, AuthContextType, checkIsAdmin, checkHasFullPlaybackAccess } from './auth/authTypes';
import { getInitialTestProfile } from './auth/authTestProfile';
import { useAuthSyncEffect } from './auth/useAuthSyncEffect';

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
      alert(`Erreur de connexion Google: ${error?.message || error}`);
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
