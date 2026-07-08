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
  | 'quiz'
  | 'dictee'
  | 'inspecteur'
  | 'mestre'
  | 'rythmelive'
  | 'varal'
  | 'studio'
  | 'admin';

interface UseViewRouterOptions {
  audio: AudioContextType;
  setActiveRightPanel: (panel: 'legend' | 'letras' | 'info' | null) => void;
}

export function useViewRouter({ audio, setActiveRightPanel }: UseViewRouterOptions) {
  const { hasAccess } = useAuth();
  
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [renderedView, setRenderedView] = useState<ViewMode | null>('landing');
  const [isFadingIn, setIsFadingIn] = useState<boolean>(true);
  const [hasVisitedStudio, setHasVisitedStudio] = useState<boolean>(false);

  // Latest Ref pattern to stabilize audio and external state references
  const audioRef = useRef<AudioContextType>(audio);
  const hasAccessRef = useRef(hasAccess);
  const setActiveRightPanelRef = useRef(setActiveRightPanel);

  useEffect(() => {
    audioRef.current = audio;
    hasAccessRef.current = hasAccess;
    setActiveRightPanelRef.current = setActiveRightPanel;
  }, [audio, hasAccess, setActiveRightPanel]);

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

  // Track studio visits
  useEffect(() => {
    if (viewMode === 'studio') {
      setHasVisitedStudio(true);
    }
  }, [viewMode]);

  // Security gate redirection
  useEffect(() => {
    if ((viewMode === 'studio' || viewMode === 'admin') && !hasAccessRef.current('admin')) {
      setViewMode('roda');
    }
  }, [viewMode]);

  // Change view mode safely by checking if audio needs to stop
  const changeViewMode = useCallback((targetView: ViewMode) => {
    const isHeavyView = ['studio', 'quiz', 'dictee', 'inspecteur', 'mestre', 'rythmelive', 'admin'].includes(targetView);

    const applyViewChange = () => {
      setViewMode(targetView);
      if (targetView === 'console' || targetView === 'timeline') {
        setActiveRightPanelRef.current(null);
      } else if (targetView === 'roda') {
        if (window.innerWidth >= 1024) {
          setActiveRightPanelRef.current('letras');
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
    hasVisitedStudio,
    changeViewMode,
    setViewMode,
  };
}
