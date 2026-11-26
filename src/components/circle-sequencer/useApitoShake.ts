import React, { useEffect } from 'react';

const APITO_SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
  { transform: 'translate3d(-3px, 1px, 0) rotate(-2.5deg)', offset: 0.2 },
  { transform: 'translate3d(3px, -1px, 0) rotate(2.5deg)', offset: 0.4 },
  { transform: 'translate3d(-2px, 1px, 0) rotate(-1.5deg)', offset: 0.65 },
  { transform: 'translate3d(2px, 0, 0) rotate(1deg)', offset: 0.85 },
  { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
];

/**
 * Secousse Apito 100 % WAAPI GPU (`0` `useState` React, `0` re-render de `CircleSequencerView` en lecture).
 */
export function useApitoShake(targetRef?: React.RefObject<HTMLElement | null>): boolean {
  useEffect(() => {
    let activeAnim: Animation | null = null;
    const handleApito = () => {
      const el = targetRef?.current ?? document.getElementById('center-afficheur');
      if (!el || typeof el.animate !== 'function') return;
      try { activeAnim?.cancel(); } catch (_) {}
      activeAnim = el.animate(APITO_SHAKE_KEYFRAMES, { duration: 280, easing: 'ease-out' });
    };

    window.addEventListener('o-girador-apito-shake', handleApito);
    return () => {
      window.removeEventListener('o-girador-apito-shake', handleApito);
      try { activeAnim?.cancel(); } catch (_) {}
    };
  }, [targetRef]);

  return false;
}
