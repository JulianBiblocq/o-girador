/**
 * WindowContext.tsx — Contexte d'hôte multi-fenêtres (Écran 1 vs Fenêtre Satellite Écran 2) (< 65 lignes).
 */
import { createContext, useContext } from 'react';
import { detachedWindowManager } from '../utils/detachedWindowManager';

const defaultWindow = typeof window !== 'undefined' ? window : ({} as Window);

export const WindowContext = createContext<Window>(defaultWindow);

export const useWindow = (): Window => useContext(WindowContext);

export const useHostDocument = (): Document => {
  const win = useContext(WindowContext);
  return win?.document || document;
};

export const usePortalRoot = (): HTMLElement => {
  const doc = useHostDocument();
  return (
    doc.getElementById('satellite-modal-root') ||
    doc.getElementById('modal-root') ||
    doc.body
  );
};

export function getActiveHostWindow(): Window {
  if (typeof window === 'undefined') return defaultWindow;
  const satWin = detachedWindowManager.getWindow('satellite');
  if (satWin && !satWin.closed) {
    try {
      if (satWin.document.hasFocus()) return satWin;
    } catch {}
  }
  return window;
}
