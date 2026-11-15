import React, { useEffect } from 'react';
import { useWindow } from '../../contexts/WindowContext';
import { isEditableTarget } from '../../utils/crossRealmDom';

export function useBalancoHardwareInput(
  isOpen: boolean,
  padRef: React.RefObject<HTMLButtonElement | null>,
  registerHit: () => void
) {
  const hostWin = useWindow();

  const triggerPadAnimation = () => {
    if (padRef.current) {
      padRef.current.style.transform = 'scale(0.95)';
      padRef.current.style.backgroundColor = 'var(--cordel-accent)';
      padRef.current.style.color = 'var(--cordel-on-accent)';
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
    if (!isOpen || !hostWin?.addEventListener) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (isEditableTarget(e.target) || isEditableTarget(hostWin.document.activeElement)) return;
      if (['KeyF', 'KeyJ', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        triggerPadAnimation();
        registerHit();
      }
    };
    hostWin.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => hostWin.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, registerHit, hostWin]);

  return { handlePointerHit };
}
