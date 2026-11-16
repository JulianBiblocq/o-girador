import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { AudioContextType } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useDesktopWorkspaceStore } from '../stores/useDesktopWorkspaceStore';
import { detachedWindowManager } from '../utils/detachedWindowManager';
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
    if (typeof window !== 'undefined') (window as any).__OGIRADOR_VIEW_MODE__ = viewMode;
    if (viewMode === 'roda' || viewMode === 'timeline') {
      useDesktopWorkspaceStore.getState().setLastBridgeViewMode(viewMode);
    }
    setRenderedView(null);
    setIsFadingIn(false);

    const delay = viewMode === 'timeline' ? 80 : 32;
    const timer = setTimeout(() => {
      startTransition(() => {
        setRenderedView(viewMode);
        setIsFadingIn(true);
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'admin' && !hasAccessRef.current('admin')) setViewMode('roda');
  }, [viewMode]);

  const changeViewMode = useCallback((targetView: ViewMode) => {
    const ws = useDesktopWorkspaceStore.getState();
    if (targetView === 'console' && ws.isSatelliteOpen && ws.satelliteMode === 'mixer') {
      detachedWindowManager.focusWindow('satellite');
      return;
    }

    if (targetView === 'landing') {
      hasManuallyOpenedAboutRef.current = true;
      setHasManuallyOpenedAbout(true);
    } else {
      hasManuallyOpenedAboutRef.current = false;
      setHasManuallyOpenedAbout(false);
    }

    const applyViewChange = () => {
      startTransition(() => {
        const curWs = useDesktopWorkspaceStore.getState();
        if (!(curWs.isSatelliteOpen && curWs.satelliteMode === 'editor')) {
          useSequencerStore.getState().closeDetailEditor();
        }
        setViewMode(targetView);
        if (targetView === 'console' || targetView === 'timeline') {
          setActiveRightPanelRef.current(null);
        } else if (targetView === 'roda' && window.innerWidth >= 1024) {
          setActiveRightPanelRef.current('info');
        }
      });
    };

    if (targetView === 'admin' && audioRef.current.isPlaying) {
      audioRef.current.handleStop();
      requestAnimationFrame(applyViewChange);
    } else {
      applyViewChange();
    }
  }, []);

  useEffect(() => {
    const onCustomViewChange = (e: Event) => {
      const target = (e as CustomEvent)?.detail?.viewMode as ViewMode | undefined;
      if (target) changeViewMode(target);
    };
    window.addEventListener('app-change-view-mode', onCustomViewChange);
    return () => window.removeEventListener('app-change-view-mode', onCustomViewChange);
  }, [changeViewMode]);

  return { viewMode, renderedView, isFadingIn, changeViewMode, setViewMode, hasManuallyOpenedAbout };
}
