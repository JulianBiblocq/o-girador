import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { WindowContext } from '../contexts/WindowContext';

interface WindowPortalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  width?: number;
  height?: number;
}

export const WindowPortal: React.FC<WindowPortalProps> = ({ 
  children, 
  onClose, 
  title = 'o-girador Detached Window',
  width = 800,
  height = 600
}) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const externalWindow = useRef<Window | null>(null);
  const isUnmounting = useRef(false);

  useEffect(() => {
    // Open a new browser window
    const newWindow = window.open('', '', `width=${width},height=${height},left=200,top=200`);
    if (!newWindow) {
      console.warn('Failed to open new window. Popups might be blocked.');
      onClose(); // Fallback if popup is blocked
      return;
    }

    externalWindow.current = newWindow;
    
    // Create a container div in the new window
    const div = newWindow.document.createElement('div');
    div.id = 'detached-root';
    // Match main app layout classes to ensure styling is applied properly if needed
    div.className = 'w-full h-full'; 
    newWindow.document.body.appendChild(div);
    setContainer(div);

    // Copy title
    newWindow.document.title = title;

    // Copy styles from main window to popup window
    const copyStyles = () => {
      const styleElements = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'));
      styleElements.forEach((node) => {
        newWindow.document.head.appendChild(node.cloneNode(true));
      });
    };
    copyStyles();

    // Copy tailwind/darkmode class from documentElement
    newWindow.document.documentElement.className = document.documentElement.className;
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
      newWindow.document.documentElement.setAttribute('style', document.documentElement.getAttribute('style') || '');
    });
    
    observer.observe(document.head, { childList: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });

    // Handle closing the new window by the user
    newWindow.addEventListener('beforeunload', () => {
      if (!isUnmounting.current) {
        onClose();
      }
    });

    return () => {
      isUnmounting.current = true;
      observer.disconnect();
      if (externalWindow.current && !externalWindow.current.closed) {
        externalWindow.current.close();
      }
    };
  }, [width, height, title, onClose]);

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
