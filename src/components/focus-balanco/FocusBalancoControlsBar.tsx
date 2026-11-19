import React from 'react';
import { Play, Square, X } from 'lucide-react';
import { FocusMeasureStepsModel } from './focusBalancoTypes';
import { setManualBalancoMorphScale } from '../../audio/groove/liveBalancoMorph';
import { positionSliderThumb } from './updateFocusBalancoDomFrame';

interface FocusBalancoControlsBarProps {
  model: FocusMeasureStepsModel;
  lang: string;
  compact?: boolean;
  isCycleActive: boolean;
  onToggleCycle: () => void;
  onClose: () => void;
  sliderRef: React.RefObject<HTMLInputElement | null>;
  sliderFillRef: React.RefObject<HTMLDivElement | null>;
  sliderThumbRef: React.RefObject<HTMLDivElement | null>;
  scaleBadgeRef: React.RefObject<HTMLSpanElement | null>;
  phaseBadgeRef: React.RefObject<HTMLSpanElement | null>;
  isDraggingSliderRef: React.MutableRefObject<boolean>;
}

export const FocusBalancoControlsBar: React.FC<FocusBalancoControlsBarProps> = ({
  model, lang, compact = false, isCycleActive, onToggleCycle, onClose,
  sliderRef, sliderFillRef, sliderThumbRef, scaleBadgeRef, phaseBadgeRef, isDraggingSliderRef,
}) => {
  const isPt = lang === 'pt';
  const nomPct = model.nominalIntensityPct;
  const cycleLabel = isCycleActive
    ? (isPt ? `Parar (voltar ${nomPct}%)` : `Arrêter (retour ${nomPct}%)`)
    : (isPt ? `Animação: ${nomPct}% -> 0% -> ${nomPct}%` : `Animation : ${nomPct}% -> 0% -> ${nomPct}%`);

  const handleSliderInput = (val: number, immediate: boolean) => {
    const ratio = Math.max(0, Math.min(1, val / 100));
    if (sliderFillRef.current) sliderFillRef.current.style.transform = `scaleX(${ratio.toFixed(3)})`;
    positionSliderThumb(sliderThumbRef.current, ratio);
    if (scaleBadgeRef.current) scaleBadgeRef.current.textContent = `${Math.round(nomPct * ratio)}%`;
    setManualBalancoMorphScale(ratio, immediate);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="xilo-wood-stamp px-2 py-0.5 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-ink-dark)] truncate max-w-[130px]"
          style={{ backgroundColor: model.primaryColor, color: model.contrastColor }}
        >
          {model.trackName}
        </span>
        {!compact && (
          <span className="text-[10px] font-mono font-bold text-[var(--cordel-text-muted)] truncate max-w-[150px]">
            {model.presetName} • {model.timeSig}
          </span>
        )}
        <span
          ref={phaseBadgeRef}
          style={{ opacity: 0 }}
          className="text-[9.5px] font-mono font-bold px-2 py-0.5 border border-[var(--cordel-border-strong)] bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)] transition-opacity whitespace-nowrap"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          data-testid="focus-balanco-auto-cycle-btn"
          onClick={onToggleCycle}
          className={`h-7 px-2.5 border border-[var(--cordel-border-strong)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] flex items-center gap-1.5 text-[10px] font-cactus font-bold uppercase cursor-pointer transition-colors active:translate-y-0.5 ${
            isCycleActive
              ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
              : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
          }`}
          title={isPt ? 'Ciclo pedagógico: Balanço -> 0% (Reto) -> Balanço' : 'Cycle pédagogique : Balanço -> 0% (Droit) -> Balanço'}
        >
          {isCycleActive ? <Square size={10} /> : <Play size={10} />}
          <span className="whitespace-nowrap">{cycleLabel}</span>
        </button>

        <div
          className="flex items-center gap-2 bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] px-2.5 h-7 select-none"
          onDoubleClick={() => handleSliderInput(100, true)}
          title={isPt ? 'Cursor livre (0% Reto - Balanço nominal). Duplo clique = 100%' : 'Curseur bac-à-sable (0% Droit - Balanço nominal). Double-clic = 100%'}
        >
          <span className="text-[9px] font-mono font-bold text-[var(--cordel-text-muted)]">0%</span>
          <div className="relative w-20 sm:w-28 h-5 flex items-center">
            <div className="relative w-full h-2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-xs overflow-hidden pointer-events-none">
              <div
                ref={sliderFillRef}
                className="absolute inset-0 origin-left pointer-events-none"
                style={{ backgroundColor: model.primaryColor, transform: 'scaleX(1)' }}
              />
            </div>
            <div
              ref={sliderThumbRef}
              className="absolute top-1/2 -translate-y-1/2 w-[12px] h-[16px] rounded-[2px] bg-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10"
              style={{ left: 'calc(100% - 12px)' }}
            >
              <span className="w-[1.5px] h-2 bg-[var(--cordel-ink-dark)]/75" />
            </div>
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              defaultValue={100}
              aria-label={isPt ? 'Dosagem ao vivo do Balanço' : 'Dosage temps réel du Balanço'}
              onPointerDown={() => { isDraggingSliderRef.current = true; }}
              onInput={(e) => handleSliderInput(Number(e.currentTarget.value), false)}
              onPointerUp={(e) => { isDraggingSliderRef.current = false; handleSliderInput(Number(e.currentTarget.value), true); }}
              onPointerCancel={() => { isDraggingSliderRef.current = false; }}
              onChange={(e) => { if (!isDraggingSliderRef.current) handleSliderInput(Number(e.target.value), true); }}
              className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-ew-resize m-0"
            />
          </div>
          <span ref={scaleBadgeRef} className="text-[10px] font-mono font-bold tabular-nums min-w-[32px] text-right">
            {nomPct}%
          </span>
        </div>

        <button
          type="button"
          data-testid="focus-balanco-close-btn"
          onClick={onClose}
          aria-label={isPt ? 'Fechar visualizador de Balanço' : 'Fermer le visualiseur de Balanço'}
          title={isPt ? 'Fechar (restaura 100% do Balanço)' : 'Fermer (restaure 100% du Balanço)'}
          className="w-7 h-7 border border-[var(--cordel-border-strong)] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
