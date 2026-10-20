import { useEffect } from 'react';

export function useBalancoHardwareInput(
  isOpen: boolean,
  padRef: React.RefObject<HTMLButtonElement | null>,
  registerHit: () => void
) {
  const triggerPadAnimation = () => {
    if (padRef.current) {
      padRef.current.style.transform = 'scale(0.95)';
      padRef.current.style.backgroundColor = '#8b2a1a';
      padRef.current.style.color = '#f4ecd8';
      setTimeout(() => {
        if (padRef.current) {
          padRef.current.style.transform = '';
          padRef.current.style.backgroundColor = '';
          padRef.current.style.color = '';
        }
      }, 70);
    }
  };

  const handlePointerHit = (e: React.PointerEvent) => {
    e.preventDefault();
    triggerPadAnimation();
    registerHit();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (['KeyF', 'KeyJ', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        triggerPadAnimation();
        registerHit();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, registerHit]);

  return { handlePointerHit };
}
