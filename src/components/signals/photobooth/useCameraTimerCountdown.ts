import { useState, useRef, useCallback, useEffect } from 'react';

export type CameraTimerSec = 0 | 3 | 5;

const STORAGE_KEY = 'girador_photolab_timer_sec';

function playSafeBeep(freq: number) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
    setTimeout(() => {
      try { ctx.close(); } catch (_) {}
    }, 100);
  } catch (_) {
    // Non-bloquant : aucun impact si l'audio système est restreint
  }
}

export function useCameraTimerCountdown() {
  const [timerSec, setTimerSecState] = useState<CameraTimerSec>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '0' || saved === '3' || saved === '5') {
        return parseInt(saved, 10) as CameraTimerSec;
      }
    } catch (_) {}
    return 3;
  });

  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownNumber, setCountdownNumber] = useState(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setTimerSec = useCallback((sec: CameraTimerSec) => {
    setTimerSecState(sec);
    try {
      localStorage.setItem(STORAGE_KEY, String(sec));
    } catch (_) {}
  }, []);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsCountingDown(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = useCallback(
    (onComplete: () => void | Promise<void>) => {
      cancelCountdown();
      if (timerSec === 0) {
        onComplete();
        return;
      }

      let current = timerSec;
      setCountdownNumber(current);
      setIsCountingDown(true);
      playSafeBeep(650);

      timerRef.current = setInterval(() => {
        current -= 1;
        if (current > 0) {
          setCountdownNumber(current);
          playSafeBeep(650);
        } else {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsCountingDown(false);
          playSafeBeep(1300);
          onComplete();
        }
      }, 1000);
    },
    [timerSec, cancelCountdown]
  );

  return {
    timerSec,
    setTimerSec,
    isCountingDown,
    countdownNumber,
    startCountdown,
    cancelCountdown,
  };
}
