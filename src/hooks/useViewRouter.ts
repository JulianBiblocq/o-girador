/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioContextType } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';

export type ViewMode =
  | 'landing'
  | 'home'
  | 'roda'
  | 'console'
  | 'timeline'
  | 'admin';

interface UseViewRouterOptions {
  audio: AudioContextType;
  setActiveRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null) => void;
}

const getInitialViewMode = (): ViewMode => {
  if (typeof window === 'undefined') return 'landing';

  // 1. URL Deep Linking / parameters
  const urlParams = new URLSearchParams(window.location.search);
  const targetView = urlParams.get('view');
  if (targetView && ['roda', 'console', 'timeline', 'admin', 'landing', 'home'].includes(targetView)) {
    return targetView as ViewMode;
  }
  if (urlParams.has('loadPreset') || urlParams.has('loadPattern')) {
    return 'roda';
  }

  // 2. Détection synchrone du mode PWA autonome
  const isStandalonePwa = 
    typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone)
    );

  if (isStandalonePwa) {
    return 'roda';
  }

  // 3. Utilisateur connecté ou ayant déjà vu l'accueil
  const hasSeenWelcome = localStorage.getItem('ogirador_has_seen_welcome') === 'true';
  const hasFirebaseAuthSession = Object.keys(localStorage).some((key) =>
    key.startsWith('firebase:authUser:')
  );

  if (hasSeenWelcome || hasFirebaseAuthSession) {
    return 'roda';
  }

  // 4. Première visite sans compte connecté
  return 'landing';
};

export function useViewRouter({ audio, setActiveRightPanel }: UseViewRouterOptions) {
  const { hasAccess, currentUser } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [renderedView, setRenderedView] = useState<ViewMode | null>(getInitialViewMode);
  const [isFadingIn, setIsFadingIn] = useState<boolean>(true);

  // Indique si l'accueil a été ouvert manuellement via le menu « À propos »
  const hasManuallyOpenedAboutRef = useRef<boolean>(false);

  // Latest Ref pattern to stabilize audio and external state references
  const audioRef = useRef<AudioContextType>(audio);
  const hasAccessRef = useRef(hasAccess);
  const setActiveRightPanelRef = useRef(setActiveRightPanel);

  useEffect(() => {
    audioRef.current = audio;
    hasAccessRef.current = hasAccess;
    setActiveRightPanelRef.current = setActiveRightPanel;
  }, [audio, hasAccess, setActiveRightPanel]);

  // Si l'utilisateur se connecte depuis la page d'accueil (hors ouverture manuelle d'À propos)
  useEffect(() => {
    if (currentUser && viewMode === 'landing' && !hasManuallyOpenedAboutRef.current) {
      localStorage.setItem('ogirador_has_seen_welcome', 'true');
      setViewMode('roda');
    }
  }, [currentUser, viewMode]);

  // Handle fading and delayed mounting to yield the Main Thread
  useEffect(() => {
    setRenderedView(null);
    setIsFadingIn(false);

    const delay = viewMode === 'timeline' ? 120 : 80;
    const timer = setTimeout(() => {
      setRenderedView(viewMode);
      setIsFadingIn(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [viewMode]);


  // Security gate redirection
  useEffect(() => {
    if (viewMode === 'admin' && !hasAccessRef.current('admin')) {
      setViewMode('roda');
    }
  }, [viewMode]);

  // Change view mode safely by checking if audio needs to stop
  const changeViewMode = useCallback((targetView: ViewMode) => {
    if (targetView === 'landing') {
      hasManuallyOpenedAboutRef.current = true;
    } else {
      hasManuallyOpenedAboutRef.current = false;
    }

    const isHeavyView = ['admin'].includes(targetView);

    const applyViewChange = () => {
      setViewMode(targetView);
      if (targetView === 'console' || targetView === 'timeline') {
        setActiveRightPanelRef.current(null);
      } else if (targetView === 'roda') {
        if (window.innerWidth >= 1024) {
          setActiveRightPanelRef.current('info');
        }
      }
    };

    if (isHeavyView && audioRef.current.isPlaying) {
      audioRef.current.handleStop();
      requestAnimationFrame(() => {
        applyViewChange();
      });
    } else {
      applyViewChange();
    }
  }, []);

  return {
    viewMode,
    renderedView,
    isFadingIn,
    changeViewMode,
    setViewMode,
  };
}
