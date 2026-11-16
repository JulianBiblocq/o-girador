import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
import { useTourStore } from '../../stores/useTourStore';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { TOUR_STEPS_PRACTICE } from '../../data/tour/tourStepsPractice';
import { TOUR_STEPS_STUDIO } from '../../data/tour/tourStepsStudio';
import { useTourTargetRect, SpotlightRect } from './useTourTargetRect';

function computeCardPosition(rect: SpotlightRect | null, vw: number, vh: number) {
  const cardW = Math.min(370, vw - 24);
  const cardH = 235;
  if (!rect) {
    return { x: Math.round((vw - cardW) / 2), y: Math.round((vh - cardH) / 2), width: cardW };
  }
  const pad = 14;
  if (rect.y + rect.height + pad + cardH <= vh - 12) {
    const x = Math.max(12, Math.min(rect.x + rect.width / 2 - cardW / 2, vw - cardW - 12));
    return { x: Math.round(x), y: Math.round(rect.y + rect.height + pad), width: cardW };
  }
  if (rect.y - pad - cardH >= 12) {
    const x = Math.max(12, Math.min(rect.x + rect.width / 2 - cardW / 2, vw - cardW - 12));
    return { x: Math.round(x), y: Math.round(rect.y - pad - cardH), width: cardW };
  }
  const placeLeft = rect.x > vw / 2;
  const x = placeLeft ? Math.max(12, rect.x - cardW - pad) : Math.min(vw - cardW - 12, rect.x + rect.width + pad);
  const y = Math.max(16, Math.min(rect.y + rect.height / 2 - cardH / 2, vh - cardH - 16));
  return { x: Math.round(x), y: Math.round(y), width: cardW };
}

export const TourOverlay: React.FC = () => {
  const { isOpen, track, stepIndex, switchTrack, nextStep, prevStep, goToStep, closeTour } = useTourStore();
  const lang = useSequencerStore((s) => s.lang);
  const isFr = lang === 'fr';

  const steps = track === 'practice' ? TOUR_STEPS_PRACTICE : TOUR_STEPS_STUDIO;
  const step = steps[stepIndex] ?? steps[0];
  const { rect, viewport } = useTourTargetRect(step, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeTour(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); nextStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevStep(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeTour, nextStep, prevStep]);

  if (!isOpen || !step || typeof document === 'undefined') return null;

  const pad = 6;
  const hole = rect ? { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), w: rect.width + pad * 2, h: rect.height + pad * 2 } : null;
  const pos = computeCardPosition(rect, viewport.w, viewport.h);
  const isLast = stepIndex === steps.length - 1;
  const portalTarget = document.getElementById('modal-root') || document.body;

  return createPortal(
    <div role="dialog" aria-modal="true" data-testid="tour-overlay" className="fixed inset-0 z-[100050] select-none">
      <svg className="fixed inset-0 w-full h-full pointer-events-auto" onClick={closeTour}>
        <defs>
          <mask id="og-tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="4" fill="black" />}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="var(--cordel-ink-dark)" fillOpacity="0.72" mask="url(#og-tour-spotlight-mask)" />
        {hole && (
          <rect
            x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="4"
            fill="none" stroke="var(--cordel-gold)" strokeWidth="2.5" className="pointer-events-none"
          />
        )}
      </svg>

      <div
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`, width: `${pos.width}px` }}
        onClick={(e) => e.stopPropagation()}
        className="fixed left-0 top-0 z-10 bg-[var(--cordel-bg)] text-[var(--cordel-text)] border-2 border-[var(--cordel-border-strong)] shadow-[6px_6px_0px_var(--cordel-shadow-color)] p-3.5 flex flex-col gap-2.5 transition-transform duration-200"
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--cordel-border)]/50">
          <div className="flex items-center gap-1">
            <Compass size={14} className="text-[var(--cordel-accent-readable)] shrink-0 mr-0.5" />
            <button type="button" onClick={() => switchTrack('practice')} className={`px-2 py-0.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer ${track === 'practice' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'}`}>
              {isFr ? 'Pratique' : 'Prática'}
            </button>
            <button type="button" onClick={() => switchTrack('studio')} className={`px-2 py-0.5 text-[10px] font-cactus font-bold uppercase border cursor-pointer ${track === 'studio' ? 'bg-[var(--cordel-wood)] text-[var(--cordel-on-accent)] border-[var(--cordel-border-strong)]' : 'bg-[var(--cordel-surface)] text-[var(--cordel-text-muted)] border-[var(--cordel-border)]'}`}>
              {isFr ? 'Studio' : 'Estúdio'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[var(--cordel-text-muted)]">{stepIndex + 1}/{steps.length}</span>
            <button type="button" onClick={closeTour} className="w-6 h-6 flex items-center justify-center border border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] cursor-pointer" title={isFr ? 'Fermer (Échap)' : 'Fechar (Esc)'}>
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-cactus font-bold uppercase tracking-wider text-[var(--cordel-accent-readable)]">
            {isFr ? step.badgeFr : step.badgePt}
          </span>
          <h3 className="font-cactus font-bold text-sm text-[var(--cordel-text)] leading-snug">
            {isFr ? step.titleFr : step.titlePt}
          </h3>
          <p className="text-xs text-[var(--cordel-text-muted)] leading-relaxed">
            {isFr ? step.bodyFr : step.bodyPt}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--cordel-border)]/40">
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <button key={s.id} type="button" onClick={() => goToStep(i)} aria-label={`${i + 1}`} className={`h-2 rounded-full transition-opacity cursor-pointer ${i === stepIndex ? 'w-4 bg-[var(--cordel-accent-readable)]' : 'w-2 bg-[var(--cordel-text)]/30 hover:opacity-80'}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <button type="button" onClick={prevStep} className="h-7 px-2 border border-[var(--cordel-border)] bg-[var(--cordel-surface)] hover:bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] text-[11px] font-cactus font-bold uppercase flex items-center gap-1 cursor-pointer">
                <ChevronLeft size={13} /><span>{isFr ? 'Préc.' : 'Ant.'}</span>
              </button>
            )}
            <button type="button" onClick={nextStep} className="h-7 px-2.5 border-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-wood)] hover:bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] text-[11px] font-cactus font-bold uppercase flex items-center gap-1 shadow-[2px_2px_0px_var(--cordel-shadow-color)] cursor-pointer">
              <span>{isLast ? (isFr ? 'Terminer' : 'Concluir') : (isFr ? 'Suivant' : 'Próximo')}</span>
              {!isLast && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
};
