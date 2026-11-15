/**
 * WindowPortal.tsx — Portail React blindé pour l'unique Fenêtre Satellite Studio (< 130 lignes).
 * Supporte coordonnées négatives, `<base href>`, sync CSS/Thème vivante et protection de `studio_dual`.
 */
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';
import { detachedWindowManager } from '../utils/detachedWindowManager';
import { syncPopupStylesAndTheme } from '../utils/syncPopupStylesAndTheme';
import { WindowContext } from '../contexts/WindowContext';

export interface WindowPortalProps {
  title: string;
  savedBounds?: DesktopWindowBounds | null;
  onBoundsCaptured?: (bounds: DesktopWindowBounds) => void;
  onBlocked: () => void;
  onClosedByOS: () => void;
  children: React.ReactNode;
}

interface SatelliteMountState {
  popupWin: Window;
  rootEl: HTMLElement;
}

export const WindowPortal: React.FC<WindowPortalProps> = ({
  title,
  savedBounds,
  onBoundsCaptured,
  onBlocked,
  onClosedByOS,
  children,
}) => {
  const [mountState, setMountState] = useState<SatelliteMountState | null>(null);
  const callbacksRef = useRef({ onBoundsCaptured, onBlocked, onClosedByOS });
  callbacksRef.current = { onBoundsCaptured, onBlocked, onClosedByOS };

  useEffect(() => {
    const popup =
      detachedWindowManager.getWindow('satellite') ??
      detachedWindowManager.openSatellitePopup(savedBounds, (b) => callbacksRef.current.onBoundsCaptured?.(b));

    if (!popup || popup.closed) {
      callbacksRef.current.onBlocked();
      return;
    }

    const doc = popup.document;
    doc.title = title;
    const cleanupSync = syncPopupStylesAndTheme(doc);

    let rootEl = doc.getElementById('satellite-root');
    if (!rootEl) {
      rootEl = doc.createElement('div');
      rootEl.id = 'satellite-root';
      rootEl.style.width = '100%';
      rootEl.style.height = '100%';
      rootEl.style.display = 'flex';
      rootEl.style.flexDirection = 'column';
      rootEl.style.overflow = 'hidden';
      doc.body.appendChild(rootEl);
    }

    let modalRootEl = doc.getElementById('satellite-modal-root');
    if (!modalRootEl) {
      modalRootEl = doc.createElement('div');
      modalRootEl.id = 'satellite-modal-root';
      doc.body.appendChild(modalRootEl);
    }

    setMountState({ popupWin: popup, rootEl });

    let closedHandled = false;
    const captureBoundsSafe = () => {
      const b = detachedWindowManager.getBounds('satellite');
      if (b) callbacksRef.current.onBoundsCaptured?.(b);
    };

    const handlePopupClosed = () => {
      if (closedHandled) return;
      closedHandled = true;
      captureBoundsSafe();
      detachedWindowManager.unregister('satellite');
      if (!detachedWindowManager.isMainWindowUnloading()) {
        callbacksRef.current.onClosedByOS();
      }
    };

    const handleMainUnloading = () => {
      detachedWindowManager.setMainWindowUnloading(true);
      captureBoundsSafe();
      detachedWindowManager.closeWindow('satellite');
    };

    popup.addEventListener('pagehide', handlePopupClosed);
    popup.addEventListener('unload', handlePopupClosed);
    window.addEventListener('pagehide', handleMainUnloading);
    window.addEventListener('beforeunload', handleMainUnloading);

    const pollId = window.setInterval(() => {
      if (popup.closed) handlePopupClosed();
      else captureBoundsSafe();
    }, 800);

    return () => {
      closedHandled = true;
      window.clearInterval(pollId);
      popup.removeEventListener('pagehide', handlePopupClosed);
      popup.removeEventListener('unload', handlePopupClosed);
      window.removeEventListener('pagehide', handleMainUnloading);
      window.removeEventListener('beforeunload', handleMainUnloading);
      cleanupSync();
    };
  }, []);

  useEffect(() => {
    if (mountState && !mountState.popupWin.closed) {
      mountState.popupWin.document.title = title;
    }
  }, [title, mountState]);

  if (!mountState || mountState.popupWin.closed) return null;

  return createPortal(
    <WindowContext.Provider value={mountState.popupWin}>
      {children}
    </WindowContext.Provider>,
    mountState.rootEl
  );
};
