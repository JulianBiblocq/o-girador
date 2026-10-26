import { TrackGroup } from '../../../types';
import { interpolateAutomationValue } from '../../../utils/automationMath';
import { faderPositionToDbString } from '../../../utils/audioMath';

export function applyMotorizedTick({
  t,
  prevM,
  currentM,
  progress,
  travelRange,
  isVolActive,
  isPanActive,
  isRevActive,
  faderHandleEl,
  faderTextEl,
  panKnobEl,
  reverbGaugeEl,
  reverbTextEl,
}: {
  t: TrackGroup;
  prevM: number;
  currentM: number;
  progress: number;
  travelRange: number;
  isVolActive: boolean;
  isPanActive: boolean;
  isRevActive: boolean;
  faderHandleEl: HTMLDivElement | null;
  faderTextEl: HTMLSpanElement | null;
  panKnobEl: SVGGElement | null;
  reverbGaugeEl: HTMLDivElement | null;
  reverbTextEl: HTMLSpanElement | null;
}) {
  if (isVolActive && t.measureVols && t.measureVols.length > 0) {
    const manualVol = t.volumeVal ?? 75;
    const rawStart = t.measureVols[prevM] !== undefined ? t.measureVols[prevM] : manualVol;
    const rawEnd = t.measureVols[currentM] !== undefined ? t.measureVols[currentM] : manualVol;
    const trans = t.measureVolTransitions?.[currentM] || 'immediate';
    const interpVol = interpolateAutomationValue(rawStart, rawEnd, progress, trans);
    if (faderHandleEl) {
      faderHandleEl.style.bottom = `${Math.max(0, Math.min(100, interpVol))}%`;
    }
    if (faderTextEl) {
      faderTextEl.textContent = faderPositionToDbString(interpVol);
    }
  }

  if (isPanActive && t.measurePans && t.measurePans.length > 0) {
    const manualPan = t.panVal ?? t.pan ?? 0;
    const rawStart = t.measurePans[prevM] !== undefined ? t.measurePans[prevM] : manualPan;
    const rawEnd = t.measurePans[currentM] !== undefined ? t.measurePans[currentM] : manualPan;
    const trans = t.measurePanTransitions?.[currentM] || 'immediate';
    const interpPan = interpolateAutomationValue(rawStart, rawEnd, progress, trans);
    if (panKnobEl) {
      panKnobEl.style.transform = '';
      panKnobEl.setAttribute('transform', `rotate(${interpPan * 1.35} 16 16)`);
    }
  }

  if (isRevActive && t.measureReverbSends && t.measureReverbSends.length > 0) {
    const manualRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
    const rawStart = t.measureReverbSends[prevM] !== undefined ? t.measureReverbSends[prevM] : manualRev;
    const rawEnd = t.measureReverbSends[currentM] !== undefined ? t.measureReverbSends[currentM] : manualRev;
    const trans = t.measureReverbTransitions?.[currentM] || 'immediate';
    const interpRev = interpolateAutomationValue(rawStart, rawEnd, progress, trans);
    if (reverbGaugeEl) {
      reverbGaugeEl.style.transform = `scaleX(${Math.max(0, Math.min(1, interpRev / 100))})`;
    }
    if (reverbTextEl) {
      reverbTextEl.textContent = `${Math.round(interpRev)}%`;
    }
  }
}
