import React from 'react';
import { ChevronDown, ChevronUp, Play, Square, X } from 'lucide-react';
import { FocusMeasureStepsModel } from './focusBalancoTypes';
import { getLiveBalancoMorphScale, setManualBalancoMorphScale } from '../../audio/groove/liveBalancoMorph';
import { computeRelativeMorphPercent, resolveFocusCycleButtonLabel } from './focusBalancoLayoutMath';
import { positionSliderThumb } from './updateFocusBalancoDomFrame';

interface FocusBalancoControlsBarProps {
  model: FocusMeasureStepsModel;
  lang: string;
  compact?: boolean;
  isCycleActive: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleCycle: () => void;
  onClose: () => void;
  sliderRef: React.RefObject<HTMLInputElement | null>;
  sliderFillRef: React.RefObject<HTMLDivElement | null>;
  sliderThumbRef: React.RefObject<HTMLDivElement | null>;
  scaleBadgeRef: React.RefObject<HTMLSpanElement | null>;
  cycleLabelRef: React.RefObject<HTMLSpanElement | null>;
  isDraggingSliderRef: React.MutableRefObject<boolean>;
}

export const FocusBalancoControlsBar: React.FC<FocusBalancoControlsBarProps> = ({
  model, lang, compact = false, isCycleActive, isCollapsed = false, onToggleCollapse,
  onToggleCycle, onClose, sliderRef, sliderFillRef, sliderThumbRef, scaleBadgeRef, cycleLabelRef, isDraggingSliderRef,
}) => {
  const isPt = lang === 'pt';
  const initScale = getLiveBalancoMorphScale();
  const initPct = computeRelativeMorphPercent(initScale);
  const initCycleLabel = resolveFocusCycleButtonLabel(isCycleActive ? 'anchor' : 'idle', lang, compact);

  const handleSliderInput = (val: number, immediate: boolean) => {
    const ratio = Math.max(0, Math.min(1, val / 100));
    if (sliderFillRef.current) sliderFillRef.current.style.transform = `scaleX(${ratio.toFixed(3)})`;
    positionSliderThumb(sliderThumbRef.current, ratio);
    if (scaleBadgeRef.current) scaleBadgeRef.current.textContent = `${computeRelativeMorphPercent(ratio)}%`;
    setManualBalancoMorphScale(ratio, immediate);
  };

  return (
    <div
      data-testid="focus-balanco-controls-bar"
      className={`flex items-center flex-nowrap w-full min-w-0 ${compact ? 'gap-1.5 h-8' : 'gap-2'}`}
    >
      {!compact && (
        <div className="flex items-center gap-1.5 min-w-0 mr-auto overflow-hidden">
          <span
            data-testid="focus-balanco-track-badge"
            className="xilo-wood-stamp px-2 py-0.5 text-[10px] font-cactus font-bold uppercase border border-[var(--cordel-ink-dark)] truncate max-w-[140px]"
            style={{ backgroundColor: model.primaryColor, color: model.contrastColor }}
          >
            {model.trackName}
          </span>
          <span className="text-[10px] font-mono font-bold text-[var(--cordel-text-muted)] truncate max-w-[160px] hidden lg:inline">
            {model.presetName} • {model.timeSig}
          </span>
        </div>
      )}

      <button
        type="button"
        data-testid="focus-balanco-auto-cycle-btn"
        onClick={onToggleCycle}
        className={`shrink-0 h-7 ${compact ? 'px-2 gap-1 text-[9.5px]' : 'px-2.5 gap-1.5 text-[10px]'} border border-[var(--cordel-border-strong)] shadow-[1.5px_1.5px_0px_var(--cordel-shadow-color)] flex items-center font-cactus font-bold uppercase cursor-pointer transition-colors active:translate-y-0.5 ${
          isCycleActive
            ? 'bg-[var(--cordel-accent)] text-[var(--cordel-on-accent)]'
            : 'bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)]'
        }`}
        title={isCycleActive ? (isPt ? 'Parar animação (voltar a 100%)' : "Arrêter l'animation (retour à 100%)") : (isPt ? 'Animação: 100% -> 0% (Reto) -> 100%' : 'Animation : 100% -> 0% (Droit) -> 100%')}
      >
        {isCycleActive ? <Square size={10} fill="currentColor" className="shrink-0" /> : <Play size={10} fill="currentColor" className="shrink-0" />}
        <span ref={cycleLabelRef} className="whitespace-nowrap">{initCycleLabel}</span>
      </button>

      <div
        className={`flex items-center bg-[var(--cordel-surface)] text-[var(--cordel-text)] border border-[var(--cordel-border-strong)] h-7 select-none ${compact ? 'flex-1 min-w-0 gap-1.5 px-2' : 'shrink-0 gap-2 px-2.5'}`}
        onDoubleClick={() => handleSliderInput(100, true)}
        title={isPt ? 'Dosagem relativa do Balanço (0% Reto - 100%). Duplo clique = 100%' : 'Dosage relatif du Balanço (0% Droit - 100%). Double-clic = 100%'}
      >
        <span className="text-[9px] font-mono font-bold text-[var(--cordel-text-muted)] shrink-0">0%</span>
        <div className={`relative h-5 flex items-center ${compact ? 'flex-1 min-w-[40px]' : 'w-24 lg:w-28'}`}>
          <div className="relative w-full h-2 bg-[var(--cordel-bg)] border border-[var(--cordel-border)] rounded-xs overflow-hidden pointer-events-none">
            <div ref={sliderFillRef} className="absolute inset-0 origin-left pointer-events-none" style={{ backgroundColor: model.primaryColor, transform: `scaleX(${initScale.toFixed(3)})` }} />
          </div>
          <div ref={sliderThumbRef} className="absolute top-1/2 -translate-y-1/2 w-[12px] h-[16px] rounded-[2px] bg-[var(--cordel-parchment-bg)] border-2 border-[var(--cordel-ink-dark)] shadow-[1px_1px_0px_var(--cordel-shadow-color)] flex items-center justify-center pointer-events-none z-10" style={{ left: `calc(${(initScale * 100).toFixed(2)}% - ${(initScale * 12).toFixed(2)}px)` }}>
            <span className="w-[1.5px] h-2 bg-[var(--cordel-ink-dark)]/75" />
          </div>
          <input
            ref={sliderRef} type="range" min={0} max={100} defaultValue={initPct}
            aria-label={isPt ? 'Dosagem ao vivo do Balanço (0% a 100%)' : 'Dosage temps réel du Balanço (0% à 100%)'}
            onPointerDown={() => { isDraggingSliderRef.current = true; }}
            onInput={(e) => handleSliderInput(Number(e.currentTarget.value), false)}
            onPointerUp={(e) => { isDraggingSliderRef.current = false; handleSliderInput(Number(e.currentTarget.value), true); }}
            onPointerCancel={() => { isDraggingSliderRef.current = false; }}
            onChange={(e) => { if (!isDraggingSliderRef.current) handleSliderInput(Number(e.target.value), true); }}
            className="absolute inset-0 z-20 w-full h-full opacity-0 cursor-ew-resize touch-none m-0"
          />
        </div>
        <span ref={scaleBadgeRef} className="text-[10px] font-mono font-bold tabular-nums min-w-[30px] text-right shrink-0">{initPct}%</span>
      </div>

      {compact ? (
        <button
          type="button" data-testid="focus-balanco-close-btn" onClick={onClose}
          aria-label={isPt ? 'Fechar visualizador de Balanço' : 'Fermer le visualiseur de Balanço'}
          title={isPt ? 'Fechar (restaura 100% do Balanço)' : 'Fermer (restaure 100% du Balanço)'}
          className="w-7 h-7 border border-[var(--cordel-border-strong)] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <X size={13} />
        </button>
      ) : (
        <button
          type="button" data-testid="focus-balanco-collapse-btn" onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? (isPt ? 'Expandir friso do Balanço' : 'Déplier la frise du Balanço') : (isPt ? 'Recolher friso do Balanço' : 'Réduire la frise du Balanço')}
          className="h-7 px-2 border border-[var(--cordel-border-strong)] bg-[var(--cordel-card-btn-bg)] text-[var(--cordel-card-btn-text)] hover:bg-[var(--cordel-wood)] hover:text-[var(--cordel-on-accent)] flex items-center gap-1 text-[10px] font-cactus font-bold uppercase cursor-pointer transition-colors shrink-0"
        >
          <span>{isCollapsed ? (isPt ? 'Expandir' : 'Déplier') : (isPt ? 'Recolher' : 'Réduire')}</span>
          {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}
    </div>
  );
};
