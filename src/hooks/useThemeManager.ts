/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';

interface UseThemeManagerOptions {
  lang: 'fr' | 'pt';
}

export function useThemeManager({ lang }: UseThemeManagerOptions) {
  const { userProfile, updateUserPreference } = useAuth();
  
  // 1. Eco Mode alignment from sequencer store
  const isEcoMode = useSequencerStore(state => state.isEcoMode);
  
  // 2. Local/Media Query Theme initialization
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('o-girador-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaDark.matches;
  });

  // Latest Ref pattern to stabilize update callbacks
  const userProfileRef = useRef(userProfile);
  const updateUserPreferenceRef = useRef(updateUserPreference);

  useEffect(() => {
    userProfileRef.current = userProfile;
    updateUserPreferenceRef.current = updateUserPreference;
  }, [userProfile, updateUserPreference]);

  // Sync Eco Mode body class
  useEffect(() => {
    document.body.classList.toggle('eco-mode', isEcoMode);
  }, [isEcoMode]);

  // Sync with Cloud Preferences if available
  useEffect(() => {
    if (userProfile?.isDarkMode !== undefined) {
      setIsDarkMode(userProfile.isDarkMode);
    }
  }, [userProfile?.isDarkMode]);

  // Apply theme to DOM and persist locally
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('o-girador-theme', theme);
  }, [isDarkMode]);

  // Document title updates based on UI language
  useEffect(() => {
    document.title = lang === 'fr'
      ? 'O Girador | Séquenceur dédié au Maracatu de Baque Virado'
      : 'O Girador | Sequenciador dedicado ao Maracatu de Baque Virado';
  }, [lang]);

  // Dark mode toggle callback
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      if (userProfileRef.current) {
        updateUserPreferenceRef.current('isDarkMode', newMode);
      }
      return newMode;
    });
  }, []);

  return {
    isDarkMode,
    toggleDarkMode,
    setIsDarkMode,
  };
}
