/**
 * Hook de synchronisation des préférences utilisateur (langue, latéralité) (< 55 lignes).
 */

import { useState, useCallback, useEffect } from 'react';
import { Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { getStoredLeftHanded, setStoredLeftHanded } from '../../utils/userPreferencesStorage';

export function useSequencerUserPreferences(userProfile: any, updateUserPreference: (key: any, val: any) => any) {
  const [isLeftHanded, _setIsLeftHanded] = useState<boolean>(getStoredLeftHanded);
  const [lang, _setLang] = useState<Language>(() => (localStorage.getItem('o_girador_lang') === 'fr' ? 'fr' : 'pt'));

  const setLang = useCallback((newLang: Language) => {
    _setLang(newLang);
    if (typeof window !== 'undefined') localStorage.setItem('o_girador_lang', newLang);
    useSequencerStore.getState().setLang(newLang);
  }, []);

  useEffect(() => useSequencerStore.subscribe((s) => {
    if (s.lang && s.lang !== lang) _setLang(s.lang);
    if (s.isLeftHanded !== isLeftHanded) _setIsLeftHanded(s.isLeftHanded);
  }), [lang, isLeftHanded]);

  useEffect(() => {
    const resolved = userProfile?.lateralite === 'gaucher'
      ? true
      : userProfile?.lateralite === 'droitier'
        ? false
        : typeof userProfile?.isLeftHanded === 'boolean'
          ? userProfile.isLeftHanded
          : undefined;
    if (resolved !== undefined) {
      _setIsLeftHanded(resolved);
      useSequencerStore.getState().setIsLeftHanded(resolved);
    }
  }, [userProfile?.uid, userProfile?.lateralite, userProfile?.isLeftHanded]);

  const setIsLeftHanded = useCallback((val: boolean) => {
    _setIsLeftHanded(val);
    setStoredLeftHanded(val);
    useSequencerStore.getState().setIsLeftHanded(val);
    if (userProfile) updateUserPreference('isLeftHanded', val);
  }, [userProfile, updateUserPreference]);

  return { isLeftHanded, setIsLeftHanded, lang, setLang };
}
