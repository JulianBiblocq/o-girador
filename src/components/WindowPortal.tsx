/**
 * WindowPortal.tsx — Portail React blindé pour l'unique Fenêtre Satellite Studio (< 95 lignes).
 * Supporte coordonnées négatives, `<base href>`, sync CSS/Thème vivante et protection à la fermeture.
 */
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DesktopWindowBounds } from '../types/desktopWorkspace.types';
import { detachedWindowManager } from '../utils/detachedWindowManager';
import { attachSatelliteWindowWatcher } from '../utils/satelliteWindowWatcher';
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
      rootEl.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;';
      doc.body.appendChild(rootEl);
    }
    if (!doc.getElementById('satellite-modal-root')) {
      const modalRootEl = doc.createElement('div');
      modalRootEl.id = 'satellite-modal-root';
      doc.body.appendChild(modalRootEl);
    }

    setMountState({ popupWin: popup, rootEl });
    const cleanupWatcher = attachSatelliteWindowWatcher(popup, () => callbacksRef.current);

    return () => {
      cleanupWatcher();
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
