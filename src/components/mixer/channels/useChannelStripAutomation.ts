import { useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { TrackGroup } from '../../../types';
import { faderPositionToDbString } from '../../../utils/audioMath';
import { getLastAudibleTick } from '../../../audio/visualTickBuffer';
import { applyMotorizedTick } from './motorizedTickHelper';

interface UseChannelStripAutomationProps {
  track: TrackGroup | undefined;
  isPlaying: boolean;
  isEcoMode: boolean;
  totalMeasures: number;
  isVolActive: boolean;
  isPanActive: boolean;
  isRevActive: boolean;
}

export function useChannelStripAutomation({
  track,
  isPlaying,
  isEcoMode,
  totalMeasures,
  isVolActive,
  isPanActive,
  isRevActive,
}: UseChannelStripAutomationProps) {
  const faderHandleRef = useRef<HTMLDivElement>(null);
  const faderTextRef = useRef<HTMLSpanElement>(null);
  const travelRangeRef = useRef<number>(90);
  const panKnobRef = useRef<SVGGElement>(null);
  const reverbGaugeRef = useRef<HTMLDivElement>(null);
  const reverbTextRef = useRef<HTMLSpanElement>(null);

  const isEcoModeRef = useRef(isEcoMode);
  isEcoModeRef.current = isEcoMode;
  const totalMeasuresRef = useRef(totalMeasures);
  totalMeasuresRef.current = totalMeasures;
  const trackRef = useRef(track);
  trackRef.current = track;

  const resetManualPositions = (resetVol = true, resetPan = true, resetRev = true) => {
    const t = trackRef.current;
    if (!t) return;
    if (resetVol && faderHandleRef.current) {
      faderHandleRef.current.style.transform = 'translateY(0px)';
      if (faderTextRef.current) faderTextRef.current.textContent = faderPositionToDbString(t.volumeVal);
    }
    if (resetPan && panKnobRef.current) {
      const manualPan = t.panVal ?? t.pan ?? 0;
      panKnobRef.current.style.transform = '';
      panKnobRef.current.setAttribute('transform', `rotate(${manualPan * 1.35} 16 16)`);
    }
    if (resetRev && reverbGaugeRef.current) {
      const manualRev = t.fxSends?.reverb ?? t.reverbVal ?? 0;
      reverbGaugeRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, manualRev / 100))})`;
      if (reverbTextRef.current) reverbTextRef.current.textContent = `${Math.round(manualRev)}%`;
    }
  };

  useEffect(() => {
    const hasAnyAutomation = isVolActive || isPanActive || isRevActive;
    if (!isPlaying || !hasAnyAutomation || isEcoMode) {
      resetManualPositions(!isVolActive, !isPanActive, !isRevActive);
      if (!isPlaying || isEcoMode) resetManualPositions(true, true, true);
      return;
    }

    let rafId: number | null = null;
    const animate = () => {
      if (isEcoModeRef.current) {
        resetManualPositions(true, true, true);
        return;
      }
      const t = trackRef.current;
      if (!t) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const tick = getLastAudibleTick();
      if (tick && tick.measureDuration && tick.measureDuration > 0 && tick.measureStartTime !== undefined) {
        const audioCtxTime = Tone.context?.currentTime ?? (performance.now() / 1000);
        const elapsed = audioCtxTime - tick.measureStartTime;
        const progress = Math.max(0, Math.min(1, elapsed / tick.measureDuration));
        const currentM = tick.measure;
        const totalM = totalMeasuresRef.current || 1;
        const prevM = (currentM - 1 + totalM) % totalM;

        applyMotorizedTick({
          t,
          prevM,
          currentM,
          progress,
          travelRange: travelRangeRef.current || 90,
          isVolActive,
          isPanActive,
          isRevActive,
          faderHandleEl: faderHandleRef.current,
          faderTextEl: faderTextRef.current,
          panKnobEl: panKnobRef.current,
          reverbGaugeEl: reverbGaugeRef.current,
          reverbTextEl: reverbTextRef.current,
        });
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resetManualPositions(true, true, true);
    };
  }, [isPlaying, isVolActive, isPanActive, isRevActive, isEcoMode]);

  return {
    faderHandleRef,
    faderTextRef,
    travelRangeRef,
    panKnobRef,
    reverbGaugeRef,
    reverbTextRef,
  };
}
