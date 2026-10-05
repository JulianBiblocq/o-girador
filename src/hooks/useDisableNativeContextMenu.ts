import { useEffect } from 'react';

/**
 * Neutralise le menu contextuel natif du navigateur sur toute l'application.
 * Conserve le menu natif pour la saisie de texte et autorise Alt + Clic droit en DEV.
 */
export function useDisableNativeContextMenu() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;

      // 1. Autoriser le menu natif sur les champs de saisie de texte (y compris balises imbriquées)
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input, textarea, [contenteditable="true"]'))
      ) {
        return;
      }

      // 2. Passe-droit développeur : Alt + Clic droit en local ouvre l'inspecteur natif
      if (import.meta.env.DEV && e.altKey) {
        return;
      }

      // 3. Bloquer le menu natif partout ailleurs
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, []);
}
