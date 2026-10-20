import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { extractBalancoOffsets, HitRecord } from '../../utils/grooveExtractor';
import { scheduleBeep } from './balancoCaptureUtils';

export function useBalancoAudioCapture(
  isOpen: boolean,
  captureBpm: number,
  cycleMeasures: 4 | 8,
  cursorRef: React.RefObject<HTMLDivElement | null>,
  railTrackRef: React.RefObject<HTMLDivElement | null>,
  leftLedRef: React.RefObject<HTMLDivElement | null>,
  rightLedRef: React.RefObject<HTMLDivElement | null>,
  flashLed: (el: HTMLElement | null, isAccent: boolean) => void,
  onCaptureComplete: (offsets: [number, number, number, number]) => void,
  onClose: () => void
) {
  const [phase, setPhase] = useState<'idle' | 'preroll' | 'recording' | 'done'>('idle');
  const [prerollCount, setPrerollCount] = useState<number>(1);
  const [hitCount, setHitCount] = useState<number>(0);

  const phaseRef = useRef<'idle' | 'preroll' | 'recording' | 'done'>('idle');
  const hitsRef = useRef<HitRecord[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const activeOscsRef = useRef<OscillatorNode[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxTravelPxRef = useRef<number>(300);
  const lastFlashedBeatRef = useRef<number>(-1);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const stopAll = () => {
    if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
    activeOscsRef.current.forEach((osc) => { try { osc.stop(); osc.disconnect(); } catch (_) {} });
    activeOscsRef.current = [];
    phaseRef.current = 'idle';
    setPhase('idle');
    setHitCount(0);
    setPrerollCount(1);
    if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${maxTravelPxRef.current * 0.5}px, 0, 0)`;
  };

  useEffect(() => { if (!isOpen) stopAll(); }, [isOpen]);

  const registerHit = () => {
    if (phaseRef.current === 'recording') {
      try {
        const rawCtx = Tone.getContext().rawContext as AudioContext;
        hitsRef.current.push({ timeSec: rawCtx.currentTime });
        setHitCount(hitsRef.current.length);
      } catch (_) {}
    }
  };

  const startCapture = async () => {
    stopAll();
    hitsRef.current = [];
    setHitCount(0);
    const rawCtx = Tone.getContext().rawContext as AudioContext;
    if (rawCtx.state === 'suspended') { try { await rawCtx.resume(); } catch (_) {} }

    const now = rawCtx.currentTime;
    const safeBpm = captureBpm > 0 ? captureBpm : 100;
    const beatSec = 60 / safeBpm;
    const t0 = now + 0.05;
    const recStartTime = t0 + 4 * beatSec;
    const totalRecBeats = cycleMeasures * 4;
    const recEndTime = recStartTime + totalRecBeats * beatSec;

    if (railTrackRef.current) maxTravelPxRef.current = railTrackRef.current.clientWidth;

    const prerollFreqs = [600, 800, 1000, 1300];
    for (let i = 0; i < 4; i++) {
      const clickTime = t0 + i * beatSec;
      activeOscsRef.current.push(scheduleBeep(rawCtx, clickTime, prerollFreqs[i], 0.4));
      timeoutIdsRef.current.push(window.setTimeout(() => setPrerollCount(i + 1), Math.max(0, (clickTime - now) * 1000)));
    }

    phaseRef.current = 'preroll';
    setPrerollCount(1);
    setPhase('preroll');
    startTimeRef.current = t0;
    lastFlashedBeatRef.current = -1;

    const animLoop = () => {
      const ctx = Tone.getContext().rawContext as AudioContext;
      const elapsed = ctx.currentTime - startTimeRef.current;
      if (elapsed >= 0) {
        const currentBeatIndex = Math.floor(elapsed / beatSec);
        const beatProgress = (elapsed % beatSec) / beatSec;
        const smooth = 0.5 * (1 - Math.cos(Math.PI * beatProgress));
        const isEvenBeat = currentBeatIndex % 2 === 0;
        const pos = isEvenBeat ? smooth : 1 - smooth;
        if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${pos * maxTravelPxRef.current}px, 0, 0)`;
        if (currentBeatIndex !== lastFlashedBeatRef.current) {
          lastFlashedBeatRef.current = currentBeatIndex;
          flashLed(isEvenBeat ? leftLedRef.current : rightLedRef.current, isEvenBeat && (currentBeatIndex === 0 || (currentBeatIndex >= 4 && (currentBeatIndex - 4) % 4 === 0)));
        }
      }
      if (phaseRef.current === 'preroll' || phaseRef.current === 'recording') rafIdRef.current = requestAnimationFrame(animLoop);
    };
    rafIdRef.current = requestAnimationFrame(animLoop);

    timeoutIdsRef.current.push(window.setTimeout(() => { phaseRef.current = 'recording'; setPhase('recording'); }, Math.max(0, (recStartTime - now) * 1000)));

    for (let b = 0; b < totalRecBeats; b++) {
      activeOscsRef.current.push(scheduleBeep(rawCtx, recStartTime + b * beatSec, b % 4 === 0 ? 1200 : 800, b % 4 === 0 ? 0.4 : 0.25));
    }

    timeoutIdsRef.current.push(window.setTimeout(() => {
      if (rafIdRef.current !== null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
      phaseRef.current = 'done';
      setPhase('done');
      if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${maxTravelPxRef.current * 0.5}px, 0, 0)`;
      onCaptureComplete(extractBalancoOffsets(hitsRef.current, safeBpm, recStartTime));
      onClose();
    }, Math.max(0, (recEndTime - now) * 1000)));
  };

  return { phase, prerollCount, hitCount, registerHit, startCapture, maxTravelPxRef };
}
