import React, { useEffect, useRef } from 'react';
import { DetachedPanelKey, DesktopWindowBounds } from '../types/desktopWorkspace.types';

interface WindowPortalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  panelKey?: DetachedPanelKey;
  initialBounds?: DesktopWindowBounds;
}

/**
 * WindowPortal (Désactivé temporairement)
 * 
 * 🛡️ Sanctuarisation mono-fenêtre :
 * Interdit tout appel à window.open pour éviter les pertes de contexte React,
 * les portails orphelins et les dysfonctionnements d'écouteurs d'événements.
 * Court-circuite immédiatement en appelant onClose.
 */
export const WindowPortal: React.FC<WindowPortalProps> = ({ 
  onClose, 
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    console.warn('[WindowPortal] Mode multi-fenêtres temporairement neutralisé. Rapatriement dans la fenêtre principale.');
    onCloseRef.current();
  }, []);

  return null;
};
