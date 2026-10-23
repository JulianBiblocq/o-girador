import { useRef, useEffect } from 'react';

export function usePhotoBoothCaptureSequence(
  bpm: number,
  beatsCount: number,
  playBeep: (freq: number, durationSec?: number, gainVal?: number) => void,
  captureCurrentFrame: () => void,
  stopCamera: () => void,
  startCordelProcessing: () => Promise<void>,
  setPhase: (phase: 'idle' | 'repositioning' | 'beat_countdown' | 'processing' | 'review') => void,
  setCurrentStepIdx: (idx: number) => void,
  setSasCountdown: (c: number) => void,
  beatNumberElRef: React.RefObject<HTMLDivElement | null>,
  flashElRef: React.RefObject<HTMLDivElement | null>,
  rawBase64ImagesRef: React.RefObject<string[]>
) {
  const activeTimersRef = useRef<Set<any>>(new Set());

  const registerTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      activeTimersRef.current.delete(id);
      fn();
    }, ms);
    activeTimersRef.current.add(id);
    return id;
  };

  const registerInterval = (fn: () => void, ms: number) => {
    const id = setInterval(fn, ms);
    activeTimersRef.current.add(id);
    return id;
  };

  const clearAllTimers = () => {
    activeTimersRef.current.forEach((id) => {
      clearTimeout(id);
      clearInterval(id);
    });
    activeTimersRef.current.clear();
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  const runBeatCountdown = (stepIndex: number) => {
    setPhase('beat_countdown');
    const beatIntervalMs = (60 / bpm) * 1000;
    let beat = 1;
    const countdownLen = (beatsCount === 5 || beatsCount === 1) ? 4 : beatsCount;

    const doBeat = () => {
      if (beatNumberElRef.current) beatNumberElRef.current.innerText = `${beat}`;
      if (beat < countdownLen) {
        playBeep(600 + (beat - 1) * 150);
        beat++;
        registerTimeout(doBeat, beatIntervalMs);
      } else {
        playBeep(1500, 0.08, 0.45);
        if (flashElRef.current) {
          flashElRef.current.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 220, easing: 'ease-out' });
        }
        captureCurrentFrame();
        if (stepIndex + 1 < beatsCount) {
          registerTimeout(() => {
            setCurrentStepIdx(stepIndex + 1);
            setPhase('repositioning');
            let c = 3;
            setSasCountdown(3);
            const subInt = registerInterval(() => {
              c--;
              if (c > 0) setSasCountdown(c);
              else {
                clearInterval(subInt);
                activeTimersRef.current.delete(subInt);
                runBeatCountdown(stepIndex + 1);
              }
            }, 1000);
          }, 350);
        } else {
          registerTimeout(async () => {
            stopCamera();
            setPhase('processing');
            await startCordelProcessing();
            setPhase('review');
          }, 400);
        }
      }
    };
    doBeat();
  };

  const handleStartCaptureSequence = () => {
    clearAllTimers();
    if (rawBase64ImagesRef.current) rawBase64ImagesRef.current = [];
    setCurrentStepIdx(0);
    setSasCountdown(3);
    setPhase('repositioning');
    let count = 3;
    playBeep(450, 0.03, 0.2);
    const interval = registerInterval(() => {
      count--;
      if (count > 0) {
        setSasCountdown(count);
        playBeep(450, 0.03, 0.2);
      } else {
        clearInterval(interval);
        activeTimersRef.current.delete(interval);
        runBeatCountdown(0);
      }
    }, 1000);
  };

  return { handleStartCaptureSequence, clearAllTimers };
}
