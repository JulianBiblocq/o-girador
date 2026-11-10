import { useRef, useEffect } from 'react';
import { masterBusWorkletManager, masterLeftMeterNode, masterRightMeterNode } from '../../audio/effectsChain';
import { subscribeVuMeter } from '../controls/vuMeterTicker';

interface UseMasterVuMeterProps {
  isPlaying: boolean;
  isActive: boolean;
}

const LOG10_20 = 20 / Math.LN10;

function linearToDbSafe(amp: number): number {
  if (!Number.isFinite(amp) || amp <= 1e-3) return -60;
  return Math.max(-60, Math.min(6, LOG10_20 * Math.log(amp)));
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
      const workletMgr = masterBusWorkletManager;
      const liveLeftMeter = masterLeftMeterNode;
      const liveRightMeter = masterRightMeterNode;

      if (!workletMgr && (!liveLeftMeter || !liveRightMeter)) {
        if (dbTextRef.current) dbTextRef.current.innerText = 'NO MTR';
        if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(1)';
        if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(1)';
        return;
      }

      try {
        let clampedLeftDb = -60;
        let clampedRightDb = -60;

        if (workletMgr) {
          const tel = workletMgr.latestTelemetry;
          clampedLeftDb = linearToDbSafe(tel.peakL);
          clampedRightDb = linearToDbSafe(tel.peakR);
        } else if (liveLeftMeter && liveRightMeter) {
          const rawLeft = liveLeftMeter.getValue();
          const rawRight = liveRightMeter.getValue();
          const leftDb = Array.isArray(rawLeft) ? Math.max(...rawLeft) : rawLeft;
          const rightDb = Array.isArray(rawRight) ? Math.max(...rawRight) : rawRight;
          clampedLeftDb = Number.isFinite(leftDb) ? Math.max(-60, Math.min(6, leftDb)) : -60;
          clampedRightDb = Number.isFinite(rightDb) ? Math.max(-60, Math.min(6, rightDb)) : -60;
        }

        const maxDb = Math.max(clampedLeftDb, clampedRightDb);
        if (dbTextRef.current) {
          dbTextRef.current.innerText = maxDb <= -59 ? '-∞ dB' : `${Math.round(maxDb)} dB`;
        }

        const targetLeftScale = clampedLeftDb <= -59 ? 0 : Math.max(0, Math.min(1, (clampedLeftDb + 60) / 66));
        const prevL = lastMasterLeftRef.current;
        const curLeftScale = targetLeftScale > prevL ? targetLeftScale : prevL * 0.94 + targetLeftScale * 0.06;
        lastMasterLeftRef.current = curLeftScale;

        const targetRightScale = clampedRightDb <= -59 ? 0 : Math.max(0, Math.min(1, (clampedRightDb + 60) / 66));
        const prevR = lastMasterRightRef.current;
        const curRightScale = targetRightScale > prevR ? targetRightScale : prevR * 0.94 + targetRightScale * 0.06;
        lastMasterRightRef.current = curRightScale;

        if (vuMeterLeftRef.current) {
          vuMeterLeftRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - curLeftScale))})`;
        }
        if (vuMeterRightRef.current) {
          vuMeterRightRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - curRightScale))})`;
        }
      } catch (_) {}
    };

    const unsubscribeTicker = subscribeVuMeter(updateMasterMeter, resetMasterMeters);
    return () => {
      unsubscribeTicker();
      resetMasterMeters();
    };
  }, [isPlaying, isActive]);

  return { vuMeterLeftRef, vuMeterRightRef, dbTextRef };
}
