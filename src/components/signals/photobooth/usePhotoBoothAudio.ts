import { useCallback } from 'react';
import { getRawAudioContext, safeResumeAudioContext, scheduleAudioContextAutoSuspend } from '../../../audio/audioContextSuspendManager';

export function usePhotoBoothAudio() {
  const playBeep = useCallback(async (freq: number, durationSec = 0.045, gainVal = 0.35) => {
    try {
      await safeResumeAudioContext();
      const ctx = getRawAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.01);
      scheduleAudioContextAutoSuspend(500);
    } catch (_) {}
  }, []);

  const closeAudio = useCallback(() => {
    scheduleAudioContextAutoSuspend(500);
  }, []);

  return { playBeep, closeAudio };
}
