/**
 * useBusCompGrMeter.ts — Jauge de réduction de gain (GR) 60 FPS d'un Bus, 100 % hors cycle React (< 50 lignes).
 * Branchée sur le ticker centralisé `vuMeterTicker` uniquement quand `active` (lecture + compresseur actif + hors Éco).
 * Mutation directe `transform: scaleX()` (composité GPU, 0 reflow), remise à `scaleX(0)` à l'arrêt / suspension.
 */
import { useEffect } from 'react';
import { subscribeVuMeter } from '../../controls/vuMeterTicker';
import { getBusGrDb } from '../../../audio/worklet/bus-compressor/BusCompressorWorkletManager';

export const BUS_GR_FULL_SCALE_DB = 12;
const RELEASE_SMOOTHING = 0.88;

export function useBusCompGrMeter(
  trackId: number,
  active: boolean,
  barRef: React.RefObject<HTMLDivElement | null>
): void {
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    let display = 0;
    let lastScale = -1;
    const reset = () => {
      display = 0; lastScale = 0;
      el.style.transform = 'scaleX(0)';
    };
    if (!active) { reset(); return; }

    const unsubscribe = subscribeVuMeter(() => {
      const gr = getBusGrDb(trackId);
      display = gr >= display ? gr : display * RELEASE_SMOOTHING + gr * (1 - RELEASE_SMOOTHING);
      if (display < 0.05) display = 0;
      const scale = Math.min(1, display / BUS_GR_FULL_SCALE_DB);
      if (Math.abs(scale - lastScale) > 0.002) {
        el.style.transform = `scaleX(${scale.toFixed(3)})`;
        lastScale = scale;
      }
    }, reset);

    return () => { unsubscribe(); reset(); };
  }, [trackId, active, barRef]);
}

