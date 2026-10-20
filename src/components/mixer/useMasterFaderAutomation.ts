import { useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { dbToFaderPosition, faderPositionToDbString } from '../../utils/audioMath';
import { interpolateAutomationValue } from '../../utils/automationMath';
import { getLastAudibleTick } from '../../audio/visualTickBuffer';

interface UseMasterFaderAutomationProps {
  isPlaying: boolean;
  isMasterVolActive: boolean;
  isEcoMode: boolean;
  masterVol: number;
  totalMeasures: number;
  measureVols?: number[];
  measureVolTransitions?: ('immediate' | 'ramp' | 'bezier')[];
}

export function useMasterFaderAutomation({
  isPlaying,
  isMasterVolActive,
  isEcoMode,
  masterVol,
  totalMeasures,
  measureVols,
  measureVolTransitions,
}: UseMasterFaderAutomationProps) {
  const masterFaderHandleRef = useRef<HTMLDivElement>(null);
  const masterFaderTextRef = useRef<HTMLSpanElement>(null);
  const masterTravelRangeRef = useRef<number>(90);

  const isEcoModeRef = useRef(isEcoMode);
  isEcoModeRef.current = isEcoMode;
  const measureVolTransitionsRef = useRef(measureVolTransitions);
  measureVolTransitionsRef.current = measureVolTransitions;
  const totalMeasuresRef = useRef(totalMeasures);
  totalMeasuresRef.current = totalMeasures;
  const measureVolsRef = useRef(measureVols);
  measureVolsRef.current = measureVols;
  const masterVolRef = useRef(masterVol);
  masterVolRef.current = masterVol;

  const resetMasterFaderPosition = () => {
    if (masterFaderHandleRef.current) {
      masterFaderHandleRef.current.style.transform = 'translateY(0px)';
      if (masterFaderTextRef.current) {
        const manualVal = dbToFaderPosition(masterVolRef.current);
        masterFaderTextRef.current.textContent = faderPositionToDbString(manualVal);
      }
    }
  };

  useEffect(() => {
    if (!isPlaying || !isMasterVolActive || isEcoMode) {
      resetMasterFaderPosition();
      return;
    }

    let rafId: number | null = null;

    const animate = () => {
      if (isEcoModeRef.current) {
        resetMasterFaderPosition();
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

        const mVols = measureVolsRef.current;
        if (mVols && mVols.length > 0) {
          const rawStart = mVols[prevM] !== undefined ? mVols[prevM] : 75;
          const rawEnd = mVols[currentM] !== undefined ? mVols[currentM] : 75;
          const trans = measureVolTransitionsRef.current?.[currentM] || 'immediate';
          const interpVol = interpolateAutomationValue(rawStart, rawEnd, progress, trans);

          if (masterFaderHandleRef.current) {
            const manualVal = dbToFaderPosition(masterVolRef.current);
            const travel = masterTravelRangeRef.current || 90;
            const deltaY = ((manualVal - interpVol) / 100) * travel;
            masterFaderHandleRef.current.style.transform = `translateY(${deltaY}px)`;
          }
          if (masterFaderTextRef.current) {
            masterFaderTextRef.current.textContent = faderPositionToDbString(interpVol);
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resetMasterFaderPosition();
    };
  }, [isPlaying, isMasterVolActive, isEcoMode]);

  return {
    masterFaderHandleRef,
    masterFaderTextRef,
    masterTravelRangeRef,
  };
}
