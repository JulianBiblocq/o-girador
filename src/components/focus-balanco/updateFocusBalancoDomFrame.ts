import { FocusMeasureStepsModel } from './focusBalancoTypes';
import {
  computeFocusPlayheadTransform,
  computeRelativeMorphPercent,
  computeStepCellWidthPx,
  shouldUseTwoRowBrickStrip,
} from './focusBalancoLayoutMath';

export interface FocusDomRefsBundle {
  stripWidthRef: { current: number };
  isTwoRowRef: { current: boolean };
  brickRefs: { current: (HTMLDivElement | null)[] };
  tensionRefs: { current: (HTMLDivElement | null)[] };
  flashRefs: { current: (HTMLDivElement | null)[] };
  offsetLabelRefs: { current: (HTMLSpanElement | null)[] };
  playheadRef: { current: HTMLDivElement | null };
  sliderRef: { current: HTMLInputElement | null };
  sliderFillRef: { current: HTMLDivElement | null };
  sliderThumbRef: { current: HTMLDivElement | null };
  scaleBadgeRef: { current: HTMLSpanElement | null };
  cycleLabelRef: { current: HTMLSpanElement | null };
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
  const B = Math.max(1, mdl.beatsCount);
  const totalWidth = refs.stripWidthRef.current;
  const isTwoRow = shouldUseTwoRowBrickStrip(B, refs.isTwoRowRef.current, totalWidth);

  if (refs.playheadRef.current && totalWidth > 0) {
    const ph = computeFocusPlayheadTransform(playheadRatio, totalWidth, B, isTwoRow);
    const rowY = isTwoRow && B > 2 && ph.rowIdx === 1 ? '100%' : '0%';
    refs.playheadRef.current.style.opacity = isPlaying && !isPreRoll ? '1' : '0.4';
    refs.playheadRef.current.style.transform = `translate3d(${ph.xPx.toFixed(1)}px, ${rowY}, 0)`;
  }

  const effHeaderPct = computeRelativeMorphPercent(scale);
  if (effHeaderPct !== lastShownPctRef.current) {
    lastShownPctRef.current = effHeaderPct;
    if (refs.scaleBadgeRef.current) refs.scaleBadgeRef.current.textContent = `${effHeaderPct}%`;
  }
  if (!refs.isDraggingSliderRef.current) {
    if (refs.sliderRef.current && refs.sliderRef.current.value !== String(effHeaderPct)) {
      refs.sliderRef.current.value = String(effHeaderPct);
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
    const slotWidth = computeStepCellWidthPx(totalWidth, B, step.beatSubCount, isTwoRow);
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
      const stepNormSpan = 1 / (B * Math.max(1, step.beatSubCount));
      const checkSubHit = (subOff: number) => {
        const pHit = (((step.baseNormPos + (subOff + (effPct / 100) * 0.5) * stepNormSpan) % 1) + 1) % 1;
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
