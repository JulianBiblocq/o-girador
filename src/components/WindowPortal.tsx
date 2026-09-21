import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { WindowContext } from '../contexts/WindowContext';
import { DetachedPanelKey, DesktopWindowBounds } from '../types/desktopWorkspace.types';
import { detachedWindowManager } from '../utils/detachedWindowManager';
import { useSequencerSettingsStore } from '../stores/useSequencerSettingsStore';

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

export const WindowPortal: React.FC<WindowPortalProps> = ({ 
  children, 
  onClose, 
  title = 'o-girador Detached Window',
  width = 800,
  height = 600,
  left,
  top,
  panelKey,
  initialBounds,
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const externalWindow = useRef<Window | null>(null);
  const isUnmounting = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Calculer les coordonnées et dimensions physiques cibles (coordonnées négatives autorisées pour multi-écrans)
    const pendingBounds = panelKey ? detachedWindowManager.getPendingBounds(panelKey) : undefined;
    const targetBounds = initialBounds || pendingBounds;

    const targetW = targetBounds?.width ?? width ?? 800;
    const targetH = targetBounds?.height ?? height ?? 600;
    const targetLeft = targetBounds?.screenX ?? left ?? 200;
    const targetTop = targetBounds?.screenY ?? top ?? 200;

    // Injection systématique des coordonnées et dimensions dans le 3ᵉ argument de window.open
    const features = `width=${targetW},height=${targetH},left=${targetLeft},top=${targetTop},resizable=yes,scrollbars=yes`;
    
    let newWindow: Window | null = null;
    try {
      newWindow = window.open('', '', features);
    } catch (e) {
      console.warn('Exception while calling window.open:', e);
    }

    if (!newWindow) {
      console.warn('Failed to open new window. Popups might be blocked.');
      onCloseRef.current(); // Fallback if popup is blocked
      return;
    }

    externalWindow.current = newWindow;
    if (panelKey) {
      detachedWindowManager.register(panelKey, newWindow);
      // Nettoyer les pending bounds une fois consommés
      detachedWindowManager.setPendingBounds(panelKey, undefined);
    }
    
    // Create a container div in the new window
    const div = newWindow.document.createElement('div');
    div.id = 'detached-root';
    // Match main app layout classes to ensure styling is applied properly if needed
    div.className = 'w-full h-full'; 
    newWindow.document.body.appendChild(div);
    setContainer(div);

    // Set initial title
    newWindow.document.title = title;

    // Copy styles from main window to popup window
    const copyStyles = () => {
      const styleElements = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
      styleElements.forEach((node) => {
        newWindow.document.head.appendChild(node.cloneNode(true));
      });
    };
    copyStyles();

    // Copy tailwind/darkmode class and data-theme from documentElement
    newWindow.document.documentElement.className = document.documentElement.className;
    newWindow.document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') || '');
    // Copy the style attribute to sync CSS variables
    newWindow.document.documentElement.setAttribute('style', document.documentElement.getAttribute('style') || '');

    // Setup mutation observer to keep styles in sync (e.g. dynamic injected styles)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'STYLE' || (node.nodeName === 'LINK' && (node as HTMLLinkElement).rel === 'stylesheet')) {
            newWindow.document.head.appendChild(node.cloneNode(true));
          }
        });
      });
      // Sync document element attributes if needed
      newWindow.document.documentElement.className = document.documentElement.className;
      newWindow.document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') || '');
      newWindow.document.documentElement.setAttribute('style', document.documentElement.getAttribute('style') || '');
    });
    
    observer.observe(document.head, { childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    // Handle global keyboard shortcuts inside popup window (e.g. 'O' for Atelier)
    const handlePopupKeyDown = (e: KeyboardEvent) => {
      const activeTag = newWindow.document.activeElement?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';
      if (!isInput && (e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        useSequencerSettingsStore.getState().toggleSettings();
        try {
          window.focus();
        } catch (_) {}
      }
    };
    newWindow.addEventListener('keydown', handlePopupKeyDown);

    // Handle closing the new window by the user
    const handleClose = () => {
      if (panelKey) {
        detachedWindowManager.unregister(panelKey);
      }
      if (!isUnmounting.current) {
        onCloseRef.current();
      }
    };
    newWindow.addEventListener('beforeunload', handleClose);
    newWindow.addEventListener('unload', handleClose);

    return () => {
      isUnmounting.current = true;
      observer.disconnect();
      newWindow.removeEventListener('keydown', handlePopupKeyDown);
      newWindow.removeEventListener('beforeunload', handleClose);
      newWindow.removeEventListener('unload', handleClose);
      if (panelKey) {
        detachedWindowManager.unregister(panelKey);
      }
      if (externalWindow.current && !externalWindow.current.closed) {
        externalWindow.current.close();
      }
    };
  // Ne pas réexécuter sur simple changement de callback onClose
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, left, top, panelKey, initialBounds]);

  // Synchronisation dynamique du titre sans réouverture de fenêtre
  useEffect(() => {
    if (externalWindow.current && !externalWindow.current.closed) {
      externalWindow.current.document.title = title;
    }
  }, [title]);

  if (!container || !externalWindow.current) {
    return null; // Don't render until the window and container are ready
  }

  // Provide the external window object through Context so event listeners bind correctly
  return ReactDOM.createPortal(
    <WindowContext.Provider value={externalWindow.current}>
      {children}
    </WindowContext.Provider>,
    container
  );
};
