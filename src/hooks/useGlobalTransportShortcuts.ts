/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';

/**
 * useGlobalTransportShortcuts
 * 
 * Verrouillage global, prioritaire et robuste du raccourci universel DAW : Barre d'espace -> Play / Stop.
 * 
 * Garanties architecturales :
 * 1. Phase de capture stricte ({ capture: true }) : Intercepte l'événement au plus haut niveau (window),
 *    avant que les composants React enfants (boutons de zoom, solo/mute, faders, etc.) ne reçoivent l'événement
 *    et ne déclenchent un re-clic mécanique indésirable.
 * 2. Filtrage strict des modificateurs : Ignore l'événement si ctrlKey, metaKey, altKey ou shiftKey est actif.
 * 3. Double barrière de saisie de texte : Vérifie exhaustivement target ET document.activeElement (inputs, textareas,
 *    champs de paroles, éléments contenteditable) pour sanctuariser la saisie des titres, paroles et notes.
 * 4. Dé-focalisation défensive : blur() automatique sur l'élément actif pour purger tout focus parasite.
 * 5. Zéro Render Thrashing : Utilise une ref mutable stable pour appeler togglePlay() sans ré-enregistrer l'écouteur.
 */
export function useGlobalTransportShortcuts(togglePlay: () => void) {
  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Filtrer exclusivement la barre d'espace
      if (e.code !== 'Space' && e.key !== ' ') return;

      // 2. Touches modificatrices : ne pas interférer avec d'éventuels raccourcis système ou DAW
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

      // 3. Double barrière de saisie de texte (target ET document.activeElement)
      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;

      const isTargetInput = Boolean(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable ||
        target?.closest?.('input, textarea, select, [contenteditable="true"]')
      );

      const isFocusedInput = Boolean(
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.id === 'letras-textarea' ||
        activeEl?.isContentEditable ||
        activeEl?.closest?.('input, textarea, select, [contenteditable="true"]')
      );

      // Si l'utilisateur est en train de taper du texte, laisser passer l'espace normalement
      if (isTargetInput || isFocusedInput) {
        return;
      }

      // 4. Neutralisation complète du comportement natif HTML :
      // - Interdit le défilement (scroll) de la page
      // - Empêche le navigateur de simuler un clic sur le bouton actuellement focalisé
      e.preventDefault();
      e.stopPropagation();

      // 5. Dé-focalisation défensive pour supprimer tout état focus persistant sur un contrôle
      if (activeEl && typeof activeEl.blur === 'function') {
        activeEl.blur();
      }
      if (target && typeof target.blur === 'function') {
        target.blur();
      }

      // 6. Bascule immédiate de la lecture audio
      togglePlayRef.current?.();
    };

    // Verrouillage en phase de capture (capture: true) pour court-circuiter tout bouton focalisé
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}
