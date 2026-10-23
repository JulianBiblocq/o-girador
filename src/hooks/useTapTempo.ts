/**
 * Calcul du BPM par tap tempo tactile (< 65 lignes).
 */

import { useRef, useState, useCallback } from 'react';
import { useSequencerStore } from '../stores/useSequencerStore';

const MAX_TAP_INTERVAL_MS = 2500;
const MAX_STORED_TAPS = 4;

export function useTapTempo(minBpm = 30, maxBpm = 240) {
  const tapsRef = useRef<number[]>([]);
  const [isTapping, setIsTapping] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = tapsRef.current;

    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    setIsTapping(true);
    resetTimerRef.current = window.setTimeout(() => setIsTapping(false), 1200);

    if (taps.length > 0 && now - taps[taps.length - 1] > MAX_TAP_INTERVAL_MS) {
      tapsRef.current = [now];
      return;
    }

    taps.push(now);
    if (taps.length > MAX_STORED_TAPS) taps.shift();

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        const clampedBpm = Math.max(minBpm, Math.min(maxBpm, calculatedBpm));
        useSequencerStore.getState().setGlobalBpm(clampedBpm);
      }
    }
  }, [minBpm, maxBpm]);

  return { handleTap, registerTap: handleTap, isTapping };
}
