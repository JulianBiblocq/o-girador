import { useRef, useEffect, useCallback } from 'react';
import { masterBusWorkletManager, masterLeftMeterNode, masterRightMeterNode } from '../../audio/effectsChain';
import { subscribeVuMeter } from '../controls/vuMeterTicker';
import {
  linearToDbFloor, createPeakHoldState, advancePeakBallistics,
} from '../controls/vuMeterMath';

interface UseMasterVuMeterProps {
  isPlaying: boolean;
  isActive: boolean;
}

export function useMasterVuMeter({ isPlaying, isActive }: UseMasterVuMeterProps) {
  const vuMeterLeftRef = useRef<HTMLDivElement>(null);
  const vuMeterRightRef = useRef<HTMLDivElement>(null);
  const peakLeftRef = useRef<HTMLDivElement>(null);
  const peakRightRef = useRef<HTMLDivElement>(null);
  const clipLeftRef = useRef<HTMLDivElement>(null);
  const clipRightRef = useRef<HTMLDivElement>(null);
  const grMeterRef = useRef<HTMLDivElement>(null);
  const dbTextRef = useRef<HTMLDivElement>(null);

  const lastMasterLeftRef = useRef<number>(0);
  const lastMasterRightRef = useRef<number>(0);
  const lastGrScaleRef = useRef<number>(0);
  const maxSessionPeakDbRef = useRef<number>(-Infinity);
  const peakHoldLeftRef = useRef(createPeakHoldState());
  const peakHoldRightRef = useRef(createPeakHoldState());

  const resetPeakBadgeDom = useCallback(() => {
    maxSessionPeakDbRef.current = -Infinity;
    const el = dbTextRef.current;
    if (el) {
      el.innerText = '— dB';
      el.style.backgroundColor = '';
      el.style.color = '';
      el.style.borderColor = '';
    }
  }, []);

  const clearMasterClipLeds = useCallback(() => {
    peakHoldLeftRef.current.clipUntilMs = 0;
    peakHoldRightRef.current.clipUntilMs = 0;
    if (clipLeftRef.current) clipLeftRef.current.style.opacity = '0.2';
    if (clipRightRef.current) clipRightRef.current.style.opacity = '0.2';
    resetPeakBadgeDom();
  }, [resetPeakBadgeDom]);

  useEffect(() => {
    const resetMasterMeters = () => {
      lastMasterLeftRef.current = 0;
      lastMasterRightRef.current = 0;
      lastGrScaleRef.current = 0;
      peakHoldLeftRef.current = createPeakHoldState();
      peakHoldRightRef.current = createPeakHoldState();
      if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = 'scaleY(1)';
      if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = 'scaleY(1)';
      if (peakLeftRef.current) { peakLeftRef.current.style.opacity = '0'; peakLeftRef.current.style.transform = 'translate3d(0, 100%, 0)'; }
      if (peakRightRef.current) { peakRightRef.current.style.opacity = '0'; peakRightRef.current.style.transform = 'translate3d(0, 100%, 0)'; }
      if (clipLeftRef.current) clipLeftRef.current.style.opacity = '0.2';
      if (clipRightRef.current) clipRightRef.current.style.opacity = '0.2';
      if (grMeterRef.current) grMeterRef.current.style.transform = 'scaleY(0)';
      resetPeakBadgeDom();
    };

    if (!isActive || !isPlaying) { resetMasterMeters(); return; }

    const updateMasterMeter = () => {
      const workletMgr = masterBusWorkletManager;
      const liveLeftMeter = masterLeftMeterNode;
      const liveRightMeter = masterRightMeterNode;
      if (!workletMgr && (!liveLeftMeter || !liveRightMeter)) { resetMasterMeters(); return; }

      try {
        let peakLeftDb = -60, peakRightDb = -60, grDb = 0;
        if (workletMgr) {
          const tel = workletMgr.latestTelemetry;
          peakLeftDb = linearToDbFloor(tel.peakL);
          peakRightDb = linearToDbFloor(tel.peakR);
          grDb = Number.isFinite(tel.grDb) ? tel.grDb : 0;
        } else if (liveLeftMeter && liveRightMeter) {
          const rawLeft = liveLeftMeter.getValue();
          const rawRight = liveRightMeter.getValue();
          const leftDb = Array.isArray(rawLeft) ? Math.max(...rawLeft) : rawLeft;
          const rightDb = Array.isArray(rawRight) ? Math.max(...rawRight) : rawRight;
          peakLeftDb = Number.isFinite(leftDb) ? Math.max(-60, Math.min(6, leftDb)) : -60;
          peakRightDb = Number.isFinite(rightDb) ? Math.max(-60, Math.min(6, rightDb)) : -60;
        }

        const maxPeakDb = Math.max(peakLeftDb, peakRightDb);
        if (maxPeakDb > -59.5 && maxPeakDb > maxSessionPeakDbRef.current) {
          maxSessionPeakDbRef.current = maxPeakDb;
          if (dbTextRef.current) {
            dbTextRef.current.innerText = `${maxPeakDb > 0 ? '+' : ''}${maxPeakDb.toFixed(1)} dB`;
            if (maxPeakDb >= -0.1) {
              dbTextRef.current.style.backgroundColor = 'var(--vu-level-clip)';
              dbTextRef.current.style.color = 'var(--fx-active-text)';
              dbTextRef.current.style.borderColor = 'var(--cordel-ink-dark)';
            }
          }
        }

        const nowMs = performance.now();
        const holdL = advancePeakBallistics(peakHoldLeftRef.current, peakLeftDb, peakLeftDb >= -0.1, nowMs);
        const holdR = advancePeakBallistics(peakHoldRightRef.current, peakRightDb, peakRightDb >= -0.1, nowMs);
        lastMasterLeftRef.current = holdL.barNorm;
        lastMasterRightRef.current = holdR.barNorm;

        if (vuMeterLeftRef.current) vuMeterLeftRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - holdL.barNorm))})`;
        if (vuMeterRightRef.current) vuMeterRightRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, 1 - holdR.barNorm))})`;
        if (peakLeftRef.current) { peakLeftRef.current.style.opacity = holdL.holdNorm > 0.02 ? '0.95' : '0'; peakLeftRef.current.style.transform = `translate3d(0, ${(1 - holdL.holdNorm) * 100}%, 0)`; }
        if (peakRightRef.current) { peakRightRef.current.style.opacity = holdR.holdNorm > 0.02 ? '0.95' : '0'; peakRightRef.current.style.transform = `translate3d(0, ${(1 - holdR.holdNorm) * 100}%, 0)`; }
        if (clipLeftRef.current) clipLeftRef.current.style.opacity = holdL.isClipHeld ? '1' : '0.2';
        if (clipRightRef.current) clipRightRef.current.style.opacity = holdR.isClipHeld ? '1' : '0.2';

        const targetGr = Math.max(0, Math.min(1, Math.abs(grDb) / 12));
        const nextGr = targetGr > lastGrScaleRef.current ? targetGr : lastGrScaleRef.current * 0.88 + targetGr * 0.12;
        lastGrScaleRef.current = nextGr < 0.005 ? 0 : nextGr;
        if (grMeterRef.current) grMeterRef.current.style.transform = `scaleY(${lastGrScaleRef.current})`;
      } catch (_) {}
    };

    const unsubscribeTicker = subscribeVuMeter(updateMasterMeter, resetMasterMeters);
    return () => { unsubscribeTicker(); resetMasterMeters(); };
  }, [isPlaying, isActive, resetPeakBadgeDom]);

  return {
    vuMeterLeftRef, vuMeterRightRef, peakLeftRef, peakRightRef,
    clipLeftRef, clipRightRef, grMeterRef, dbTextRef, clearMasterClipLeds,
  };
}
