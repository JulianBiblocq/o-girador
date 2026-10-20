/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioContextType } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { ViewMode, getInitialViewMode } from './view-router/initialViewResolver';

export type { ViewMode };

interface UseViewRouterOptions {
  audio: AudioContextType;
  setActiveRightPanel: (panel: 'legend' | 'letras' | 'info' | 'feedback' | 'sinais' | null) => void;
}

export function useViewRouter({ audio, setActiveRightPanel }: UseViewRouterOptions) {
  const { hasAccess, currentUser } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [renderedView, setRenderedView] = useState<ViewMode | null>(getInitialViewMode);
  const [isFadingIn, setIsFadingIn] = useState<boolean>(true);

  const hasManuallyOpenedAboutRef = useRef<boolean>(false);
  const [hasManuallyOpenedAbout, setHasManuallyOpenedAbout] = useState<boolean>(false);

  const audioRef = useRef<AudioContextType>(audio);
  const hasAccessRef = useRef(hasAccess);
  const setActiveRightPanelRef = useRef(setActiveRightPanel);

  useEffect(() => {
    audioRef.current = audio;
    hasAccessRef.current = hasAccess;
    setActiveRightPanelRef.current = setActiveRightPanel;
  }, [audio, hasAccess, setActiveRightPanel]);

  useEffect(() => {
    if (currentUser && viewMode === 'landing' && !hasManuallyOpenedAboutRef.current) {
      localStorage.setItem('ogirador_has_seen_welcome', 'true');
      setViewMode('roda');
    }
  }, [currentUser, viewMode]);

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

  useEffect(() => {
    if (viewMode === 'admin' && !hasAccessRef.current('admin')) {
      setViewMode('roda');
    }
  }, [viewMode]);

  const changeViewMode = useCallback((targetView: ViewMode) => {
    if (targetView === 'landing') {
      hasManuallyOpenedAboutRef.current = true;
      setHasManuallyOpenedAbout(true);
    } else {
      hasManuallyOpenedAboutRef.current = false;
      setHasManuallyOpenedAbout(false);
    }

    const isHeavyView = ['admin'].includes(targetView);

    const applyViewChange = () => {
      useSequencerStore.getState().closeDetailEditor();
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
    hasManuallyOpenedAbout,
  };
}
