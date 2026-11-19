import { BalancoMorphPhase } from '../../audio/groove/liveBalancoMorph';
import { FocusMeasureStepsModel } from './focusBalancoTypes';

export const PHASE_LABELS_FR: Record<BalancoMorphPhase, string> = {
  idle: '',
  'waiting-play': 'Démarrage...',
  anchor: '100% Balanço',
  'ramp-down': 'Descente -> 0%',
  'hold-zero': '0% Droit',
  'ramp-up': 'Retour -> 100%',
};

export const PHASE_LABELS_PT: Record<BalancoMorphPhase, string> = {
  idle: '',
  'waiting-play': 'Iniciando...',
  anchor: '100% Balanço',
  'ramp-down': 'Descendo -> 0%',
  'hold-zero': '0% Reto',
  'ramp-up': 'Retorno -> 100%',
};

export interface FocusDomRefsBundle {
  stripWidthRef: { current: number };
  brickRefs: { current: (HTMLDivElement | null)[] };
  tensionRefs: { current: (HTMLDivElement | null)[] };
  flashRefs: { current: (HTMLDivElement | null)[] };
  offsetLabelRefs: { current: (HTMLSpanElement | null)[] };
  playheadRef: { current: HTMLDivElement | null };
  sliderRef: { current: HTMLInputElement | null };
  sliderFillRef: { current: HTMLDivElement | null };
  sliderThumbRef: { current: HTMLDivElement | null };
  scaleBadgeRef: { current: HTMLSpanElement | null };
  phaseBadgeRef: { current: HTMLSpanElement | null };
  isDraggingSliderRef: { current: boolean };
}

export function positionSliderThumb(thumbEl: HTMLDivElement | null, ratio: number): void {
  if (!thumbEl) return;
  const r = Math.max(0, Math.min(1, ratio));
  thumbEl.style.left = `calc(${(r * 100).toFixed(2)}% - ${(r * 12).toFixed(2)}px)`;
}

export function applyFocusBalancoDomFrame(
  refs: FocusDomRefsBundle,
  mdl: FocusMeasureStepsModel,
  scale: number,
  playheadRatio: number,
  isPlaying: boolean,
  isPreRoll: boolean,
  measureDurSec: number,
  lastShownPctRef: { current: number }
): void {
  const N = Math.max(1, mdl.stepCount);
  const totalWidth = refs.stripWidthRef.current;
  const slotWidth = totalWidth > 0 ? totalWidth / N : 0;

  if (refs.playheadRef.current && totalWidth > 0) {
    refs.playheadRef.current.style.opacity = isPlaying && !isPreRoll ? '1' : '0.4';
    refs.playheadRef.current.style.transform = `translate3d(${(playheadRatio * totalWidth).toFixed(1)}px, 0, 0)`;
  }

  const effHeaderPct = Math.round(mdl.nominalIntensityPct * scale);
  if (effHeaderPct !== lastShownPctRef.current) {
    lastShownPctRef.current = effHeaderPct;
    if (refs.scaleBadgeRef.current) refs.scaleBadgeRef.current.textContent = `${effHeaderPct}%`;
  }
  if (!refs.isDraggingSliderRef.current) {
    const sliderVal = Math.round(scale * 100);
    if (refs.sliderRef.current && refs.sliderRef.current.value !== String(sliderVal)) {
      refs.sliderRef.current.value = String(sliderVal);
    }
    if (refs.sliderFillRef.current) {
      refs.sliderFillRef.current.style.transform = `scaleX(${scale.toFixed(3)})`;
    }
    positionSliderThumb(refs.sliderThumbRef.current, scale);
  }

  const measMs = Math.max(400, (measureDurSec || 2.4) * 1000);
  for (let i = 0; i < mdl.steps.length; i++) {
    const step = mdl.steps[i];
    const brickEl = refs.brickRefs.current[i];
    if (!brickEl || !step.isActive) continue;

    const effPct = step.nominalBalancoPct * scale + step.manualMicroPct;
    const shiftRatio = Math.max(-0.42, Math.min(0.42, (effPct / 100) * 0.5 * 1.75));
    const shiftPx = shiftRatio * slotWidth;

    const tensionEl = refs.tensionRefs.current[i];
    if (tensionEl) {
      const absShift = Math.abs(shiftPx);
      if (absShift >= 1.5) {
        const startX = shiftPx < 0 ? shiftPx : 0;
        tensionEl.style.opacity = '0.88';
        tensionEl.style.transform = `translate3d(${startX.toFixed(2)}px, -50%, 0) scaleX(${absShift.toFixed(2)})`;
      } else {
        tensionEl.style.opacity = '0';
      }
    }

    let bounceY = 0, scaleBoost = 1, flashOpacity = 0;
    if (isPlaying && !isPreRoll) {
      const checkSubHit = (subOff: number) => {
        const pHit = (((i + subOff + (effPct / 100) * 0.5) / N) % 1 + 1) % 1;
        const dRatio = ((playheadRatio - pHit) % 1 + 1) % 1;
        const elapsedMs = dRatio * measMs;
        return elapsedMs >= 0 && elapsedMs <= 165 ? Math.pow(1 - elapsedMs / 165, 1.85) : 0;
      };
      const env = step.isSplit ? Math.max(checkSubHit(0), checkSubHit(0.5)) : checkSubHit(0);
      if (env > 0) {
        bounceY = -2.8 * env;
        scaleBoost = 1 + 0.12 * env;
        flashOpacity = 0.72 * env;
      }
    }
    brickEl.style.transform = `translate3d(${shiftPx.toFixed(2)}px, ${bounceY.toFixed(2)}px, 0) scale(${scaleBoost.toFixed(3)})`;
    const flashEl = refs.flashRefs.current[i];
    if (flashEl) flashEl.style.opacity = flashOpacity.toFixed(2);
    const lblEl = refs.offsetLabelRefs.current[i];
    if (lblEl) {
      const rPct = Math.round(effPct);
      lblEl.textContent = Math.abs(rPct) < 1 ? '•' : (rPct > 0 ? `+${rPct}%` : `${rPct}%`);
    }
  }
}
