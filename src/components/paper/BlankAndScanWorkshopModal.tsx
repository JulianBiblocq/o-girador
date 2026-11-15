/**
 * BlankAndScanWorkshopModal.tsx
 * Coquille portail légère autour de PaperWorkshopContent (Ctrl+Shift+I & Mobile Édition).
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PaperTabType } from '../../types/paperWorkshop.types';
import { PaperWorkshopContent } from './PaperWorkshopContent';

export interface BlankAndScanWorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PaperTabType;
}

export const BlankAndScanWorkshopModal: React.FC<BlankAndScanWorkshopModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'sheets',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalRoot =
    (typeof document !== 'undefined' && document.getElementById('modal-root')) ||
    (typeof document !== 'undefined' ? document.body : null);
  if (!modalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-[100030] flex items-center justify-center p-3 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-4 border-[var(--cordel-border-strong)] shadow-[8px_8px_0px_var(--cordel-shadow-color)] w-full max-w-4xl max-h-[92vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <PaperWorkshopContent onClose={onClose} initialTab={initialTab} />
      </div>
    </div>,
    modalRoot
  );
};
