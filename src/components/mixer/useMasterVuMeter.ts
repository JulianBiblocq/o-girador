import { useRef, useEffect } from 'react';
import { masterLeftMeterNode, masterRightMeterNode } from '../../audio/effectsChain';
import { subscribeVuMeter } from '../controls/vuMeterTicker';

interface UseMasterVuMeterProps {
  isPlaying: boolean;
  isActive: boolean;
}

export function useMasterVuMeter({ isPlaying, isActive }: UseMasterVuMeterProps) {
  const vuMeterLeftRef = useRef<HTMLDivElement>(null);
  const vuMeterRightRef = useRef<HTMLDivElement>(null);
  const dbTextRef = useRef<HTMLDivElement>(null);
  const lastMasterLeftRef = useRef<number>(0);
  const lastMasterRightRef = useRef<number>(0);

  useEffect(() => {
    const resetMasterMeters = () => {
      lastMasterLeftRef.current = 0;
      lastMasterRightRef.current = 0;
      if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(1)';
      if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(1)';
      if (dbTextRef.current) dbTextRef.current.innerText = '— dB';
    };

    if (!isActive || !isPlaying) {
      resetMasterMeters();
      return;
    }

    const updateMasterMeter = () => {
      const liveLeftMeter = masterLeftMeterNode;
      const liveRightMeter = masterRightMeterNode;

      if (liveLeftMeter && liveRightMeter) {
        try {
          const rawLeft = liveLeftMeter.getValue();
          const rawRight = liveRightMeter.getValue();

          let leftDb = Array.isArray(rawLeft) ? Math.max(...rawLeft) : rawLeft;
          let rightDb = Array.isArray(rawRight) ? Math.max(...rawRight) : rawRight;

          if (!Number.isFinite(leftDb) || leftDb <= -60) leftDb = -60;
          if (!Number.isFinite(rightDb) || rightDb <= -60) rightDb = -60;

          const clampedLeftDb = Math.max(-60, Math.min(6, leftDb));
          const clampedRightDb = Math.max(-60, Math.min(6, rightDb));
          const maxDb = Math.max(clampedLeftDb, clampedRightDb);

          if (dbTextRef.current) {
            dbTextRef.current.innerText = maxDb <= -59 ? '-∞ dB' : `${Math.round(maxDb)} dB`;
          }

          const targetLeftScale = clampedLeftDb <= -59 ? 0 : Math.max(0, Math.min(1, (clampedLeftDb + 60) / 66));
          let currentLeftScale = lastMasterLeftRef.current;
          currentLeftScale = targetLeftScale > currentLeftScale ? targetLeftScale : currentLeftScale * 0.97 + targetLeftScale * 0.03;
          lastMasterLeftRef.current = currentLeftScale;

          const targetRightScale = clampedRightDb <= -59 ? 0 : Math.max(0, Math.min(1, (clampedRightDb + 60) / 66));
          let currentRightScale = lastMasterRightRef.current;
          currentRightScale = targetRightScale > currentRightScale ? targetRightScale : currentRightScale * 0.97 + targetRightScale * 0.03;
          lastMasterRightRef.current = currentRightScale;

          if (vuMeterLeftRef.current) {
            vuMeterLeftRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - currentLeftScale))})`;
          }
          if (vuMeterRightRef.current) {
            vuMeterRightRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - currentRightScale))})`;
          }
        } catch (_) {}
      } else {
        if (dbTextRef.current) dbTextRef.current.innerText = 'NO MTR';
        if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(1)';
        if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(1)';
      }
    };

    const unsubscribeTicker = subscribeVuMeter(updateMasterMeter);

    return () => {
      unsubscribeTicker();
      resetMasterMeters();
    };
  }, [isPlaying, isActive]);

  return { vuMeterLeftRef, vuMeterRightRef, dbTextRef };
}
