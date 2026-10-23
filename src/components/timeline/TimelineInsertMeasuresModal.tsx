import React, { useState, useEffect } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';

export interface TimelineInsertMeasuresModalProps {
  isOpen: boolean;
  targetIdx: number | null;
  totalMeasures: number;
  lang: string;
  hasAccess: (role: string) => boolean;
  onClose: () => void;
  onInsertMeasure?: (mIdx: number, count: number) => void;
}

export const TimelineInsertMeasuresModal: React.FC<TimelineInsertMeasuresModalProps> = React.memo(({
  isOpen, targetIdx, totalMeasures, lang, hasAccess, onClose, onInsertMeasure,
}) => {
  const [insertAmountStr, setInsertAmountStr] = useState("1");

  useEffect(() => {
    if (!isOpen) return;
    setInsertAmountStr("1");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const amount = parseInt(insertAmountStr, 10);
    if (!isNaN(amount) && amount > 0) {
      const idx = targetIdx ?? totalMeasures;
      const newTotal = Math.min(64, totalMeasures + amount);
      const hasFullPlayback = useSequencerStore.getState().hasFullPlaybackAccess;
      if (newTotal > 30 && !hasAccess('mestre') && !hasFullPlayback) {
        useSequencerStore.getState().openSubscriptionModal();
      } else {
        onInsertMeasure?.(idx, newTotal - totalMeasures);
      }
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--cordel-bg)] text-[var(--cordel-text)] p-6 rounded cordel-border w-full max-w-sm cordel-shadow text-center font-cactus relative">
        <h3 className="text-xl font-bold mb-4 uppercase tracking-wider">
          {lang === 'fr' ? 'Ajouter des mesures' : 'Adicionar compassos'}
        </h3>
        <p className="mb-4 text-sm font-sans font-bold">
          {lang === 'fr' ? 'Combien de mesures voulez-vous ajouter ?' : 'Quantos compassos deseja adicionar?'}
        </p>
        <input
          type="number" min="1" max="64" value={insertAmountStr}
          onChange={(e) => setInsertAmountStr(e.target.value)}
          className="w-24 text-center bg-[var(--cordel-border)]/10 border-2 border-[var(--cordel-border)] rounded px-2 py-1 mb-6 text-xl font-bold font-sans outline-none focus:border-emerald-600"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 cordel-border-sm cordel-button bg-[var(--cordel-wood)] text-[#f4ecd8] font-bold cursor-pointer"
          >
            {lang === 'fr' ? 'Annuler' : 'Cancelar'}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 cordel-border-sm cordel-button bg-[var(--cordel-text)] text-[var(--cordel-bg)] font-bold hover:scale-105 transition-transform cursor-pointer"
          >
            {lang === 'fr' ? 'Ajouter' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
});
