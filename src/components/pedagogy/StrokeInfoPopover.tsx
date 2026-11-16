import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Wrench, X } from 'lucide-react';
import { useWindow } from '../../contexts/WindowContext';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useAudio } from '../../contexts/AudioContext';
import { triggerPedagogyPreview } from './resolvePedagogyPopoverModel';
import { StrokeInfoPopoverTarget } from './strokeInfoTypes';

interface StrokeInfoPopoverProps {
  target: StrokeInfoPopoverTarget | null;
  onClose: () => void;
}

export const StrokeInfoPopover: React.FC<StrokeInfoPopoverProps> = ({ target, onClose }) => {
  const hostWin = useWindow();
  const { isPlaying } = useAudio();
  const lang = useSequencerStore((s) => s.lang);
  const isPracticeMode = useSequencerStore((s) => Boolean(s.isPracticeMode));
  const openInstrumentDetailAt = useSequencerStore((s) => s.openInstrumentDetailAt);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!target) return;
    const doc = hostWin?.document || document;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handlePointer = (e: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    const timer = hostWin.setTimeout(() => doc.addEventListener('pointerdown', handlePointer), 15);
    doc.addEventListener('keydown', handleKey);
    return () => {
      hostWin.clearTimeout(timer);
      doc.removeEventListener('pointerdown', handlePointer);
      doc.removeEventListener('keydown', handleKey);
    };
  }, [target, hostWin, onClose]);

  if (!target) return null;
  const isFr = lang === 'fr';
  const portalBody = hostWin?.document?.body || document.body;
  const vw = hostWin?.innerWidth || 1280;
  const vh = hostWin?.innerHeight || 800;
  const estWidth = target.cards.length > 1 ? 430 : 300;
  const estHeight = 215;
  const clampedLeft = Math.max(12, Math.min(target.anchorX - estWidth * 0.5, vw - estWidth - 12));
  const placeAbove = target.anchorY + estHeight + 24 > vh && target.anchorY > estHeight + 24;
  const clampedTop = placeAbove ? Math.max(12, target.anchorY - estHeight - 14) : Math.min(vh - estHeight - 12, target.anchorY + 14);
  const primaryCard = target.cards[0];

  const handleOpenEditor = () => {
    openInstrumentDetailAt({
      trackId: primaryCard.targetTrackId,
      patternId: primaryCard.targetPatternId,
      stepIdx: primaryCard.targetStepIdx,
      subIndex: primaryCard.targetSubIndex,
    });
    onClose();
  };

  return createPortal(
    <div
      ref={popoverRef} data-tour-id="pedagogy-popover" role="dialog" aria-label={target.instrumentName}
      onContextMenu={(e) => e.preventDefault()}
      style={{ transform: `translate3d(${Math.round(clampedLeft)}px, ${Math.round(clampedTop)}px, 0)`, width: `${estWidth}px` }}
      className="fixed left-0 top-0 z-[1200] bg-[var(--cordel-surface)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[4px_4px_0_var(--cordel-shadow-color)] p-3 select-none"
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--cordel-border)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-cactus font-bold text-xs uppercase tracking-wide truncate">{target.instrumentName}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] text-[var(--cordel-text-muted)] shrink-0">
            {isFr ? `Mes. ${target.measureIdx + 1} • Pas ${target.stepIdx + 1}` : `Comp. ${target.measureIdx + 1} • Passo ${target.stepIdx + 1}`}
          </span>
        </div>
        <button type="button" onClick={onClose} className="w-6 h-6 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] cursor-pointer shrink-0" title={isFr ? 'Fermer (Échap)' : 'Fechar (Esc)'}>
          <X size={13} />
        </button>
      </div>

      <div className={`grid gap-2.5 ${target.cards.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {target.cards.map((card, idx) => {
          const canPreview = !isPlaying && (!card.isVoice || Boolean(card.vocalNote && card.semanticStroke !== '0'));
          return (
            <div key={idx} className="flex flex-col justify-between gap-2 p-2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)]">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: card.badgeBg, color: card.badgeTxt }}
                    className="w-7 h-7 flex items-center justify-center font-bold text-xs border border-[var(--cordel-border-strong)] shadow-[1px_1px_0_var(--cordel-shadow-color)] shrink-0"
                  >
                    {card.badgeSymbol}
                  </span>
                  <div className="min-w-0 flex-1">
                    {card.roleTag && (
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-[var(--cordel-text-muted)]">{card.roleTag}</span>
                    )}
                    <h4 className="font-cactus font-bold text-xs leading-tight text-[var(--cordel-text)]">{card.title}</h4>
                  </div>
                </div>
                {(card.vocalSyllable || card.vocalNote) && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    {card.vocalSyllable && <span className="px-1.5 py-0.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border)] font-bold">« {card.vocalSyllable} »</span>}
                    {card.vocalNote && <span className="px-1.5 py-0.5 bg-[var(--cordel-surface)] border border-[var(--cordel-border)]">{isFr ? 'Note' : 'Nota'}: {card.vocalNote}</span>}
                  </div>
                )}
                <p className="text-[11px] leading-snug text-[var(--cordel-text-muted)]">{card.description}</p>
              </div>
              <button
                type="button"
                disabled={!canPreview}
                onClick={() => triggerPedagogyPreview(card)}
                className="h-7 px-2 border border-[var(--cordel-border-strong)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-cactus font-bold uppercase flex items-center justify-center gap-1.5 shadow-[1px_1px_0_var(--cordel-shadow-color)] cursor-pointer"
              >
                <Volume2 size={12} />
                <span>{isFr ? 'Écouter' : 'Ouvir'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {!isPracticeMode && (
        <div className="mt-2.5 pt-2 border-t border-[var(--cordel-border)] flex justify-end">
          <button
            type="button"
            onClick={handleOpenEditor}
            className="h-7 px-2.5 border border-[var(--cordel-border)] bg-[var(--cordel-bg)] hover:bg-[var(--cordel-text)] hover:text-[var(--cordel-bg)] text-[10px] font-cactus font-bold uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench size={11} />
            <span>{isFr ? "Ouvrir dans l'Éditeur" : 'Abrir no Editor'}</span>
          </button>
        </div>
      )}
    </div>,
    portalBody
  );
};
