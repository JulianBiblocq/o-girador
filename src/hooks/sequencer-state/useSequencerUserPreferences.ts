/**
 * Hook de synchronisation des préférences utilisateur (langue, gaucher) (< 50 lignes).
 */

import { useState, useCallback, useEffect } from 'react';
import { Language } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';

export function useSequencerUserPreferences(userProfile: any, updateUserPreference: (key: any, val: any) => any) {

  const [isLeftHanded, _setIsLeftHanded] = useState<boolean>(() => localStorage.getItem('o_girador_left_handed') === 'true');
  const [lang, _setLang] = useState<Language>(() => (localStorage.getItem('o_girador_lang') === 'fr' ? 'fr' : 'pt'));

  const setLang = useCallback((newLang: Language) => {
    _setLang(newLang);
    if (typeof window !== 'undefined') localStorage.setItem('o_girador_lang', newLang);
    useSequencerStore.getState().setLang(newLang);
  }, []);

  useEffect(() => useSequencerStore.subscribe((s) => {
    if (s.lang && s.lang !== lang) _setLang(s.lang);
  }), [lang]);

  useEffect(() => {
    if (userProfile?.isLeftHanded !== undefined) {
      _setIsLeftHanded(userProfile.isLeftHanded);
      localStorage.setItem('o_girador_left_handed', String(userProfile.isLeftHanded));
    }
  }, [userProfile?.isLeftHanded]);

  const setIsLeftHanded = (val: boolean) => {
    _setIsLeftHanded(val);
    localStorage.setItem('o_girador_left_handed', String(val));
    if (userProfile) updateUserPreference('isLeftHanded', val);
  };

  return { isLeftHanded, setIsLeftHanded, lang, setLang };
}
