/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { User, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useNomenclatureStore } from '../../stores/useNomenclatureStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { UserProfile } from './authTypes';
import { getInitialTestProfile } from './authTestProfile';
import { resolveUserProfileAndGroup } from './authGroupResolver';

interface AuthSyncParams {
  setCurrentUser: (u: User | null) => void;
  setUserProfile: (p: UserProfile | null) => void;
  setLoading: (l: boolean) => void;
}

export function useAuthSyncEffect({ setCurrentUser, setUserProfile, setLoading }: AuthSyncParams) {
  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const checkTestProfile = () => {
      const initial = getInitialTestProfile();
      if (initial) {
        setCurrentUser(initial.user);
        setUserProfile(initial.profile);
        setLoading(false);
        return true;
      }
      return false;
    };

    if (typeof window !== 'undefined') {
      (window as any).__SET_TEST_USER_PROFILE__ = (p: any) => {
        if (p) {
          localStorage.setItem('girador_test_user_profile', JSON.stringify(p));
          checkTestProfile();
        } else {
          localStorage.removeItem('girador_test_user_profile');
        }
      };
    }

    if (checkTestProfile()) {
      return () => {
        if (unsubscribeProfile) unsubscribeProfile();
      };
    }

    const searchParams = new URLSearchParams(window.location.search);
    const ssoToken = searchParams.get('ssoToken') || searchParams.get('token');
    let isSSOPending = Boolean(ssoToken);

    if (ssoToken) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('ssoToken');
      cleanUrl.searchParams.delete('token');
      window.history.replaceState({}, document.title, cleanUrl.toString());

      setLoading(true);
      signInWithCustomToken(auth, ssoToken)
        .catch((err) => {
          console.warn("[Séquenciad'Or SSO] Erreur connexion SSO :", err);
          setLoading(false);
        })
        .finally(() => {
          isSSOPending = false;
        });
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (typeof window !== 'undefined' && localStorage.getItem('girador_test_user_profile')) return;
      setCurrentUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const resolvedProfile = await resolveUserProfileAndGroup(user, docSnap.data(), userRef);
            setUserProfile(resolvedProfile);
            useNomenclatureStore.getState().syncGroupNomenclature(resolvedProfile.groupId || null);
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'membre',
              mestreId: 'iA0SweEHyOPzAPGIDVZdeKAV2mk1',
              groupId: 'Samambaia',
              groupName: 'Samambaia',
              createdAt: Date.now(),
            };
            await setDoc(userRef, newProfile, { merge: true });
            setUserProfile({ ...newProfile, dbRole: newProfile.role });
            useNomenclatureStore.getState().syncGroupNomenclature('Samambaia');
          }
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        useNomenclatureStore.getState().syncGroupNomenclature(null);
        useSequencerStore.getState().setIsLeftHanded(false);
        if (!isSSOPending) setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, [setCurrentUser, setUserProfile, setLoading]);
}
