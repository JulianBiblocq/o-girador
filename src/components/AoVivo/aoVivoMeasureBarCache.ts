/**
 * aoVivoMeasureBarCache.ts — Cache O(1) par mesure pour court-circuiter les 5/6e de ticks `96n` (< 65 lignes).
 * Évite d'exécuter `resolveTrackAoVivoFamily` et `resolveAoVivoMeasureBarData` à 40 Hz.
 */
import React from 'react';
import { resolveAoVivoMeasureBarData } from './aoVivoMeasureLookahead';
import { AoVivoResolvedFamily, resolveTrackAoVivoFamily } from './resolveAoVivoFamily';

export interface AoVivoBarCacheEntry {
  key: string;
  validFamily: boolean;
  bar: ReturnType<typeof resolveAoVivoMeasureBarData> | null;
}

export function resolveCachedAoVivoBarForTick(params: {
  cacheRef: React.MutableRefObject<AoVivoBarCacheEntry | null>;
  activeTrack: any;
  family: AoVivoResolvedFamily;
  measure: number;
  measureSeqId: number | undefined;
  soloPlayId: number | null;
  soloVarId: string | null;
  isStepPreview: boolean;
  varMap: Record<number, any> | undefined;
  state: Record<string, any>;
}): ReturnType<typeof resolveAoVivoMeasureBarData> | null {
  const { cacheRef, activeTrack, family, measure, measureSeqId, soloPlayId, soloVarId, isStepPreview, varMap, state } = params;
  const key = `${measureSeqId ?? 0}|${measure}|${activeTrack.id}|${family}|${state.tracksVersion ?? 0}|${soloPlayId ?? ''}|${soloVarId ?? ''}|${state.queuedMeasure ?? ''}|${state.isLooping}|${state.loopMode}|${state.currentLoopIteration}|${state.isLoopRegionActive}|${state.loopStartMeasure ?? ''}|${state.loopEndMeasure ?? ''}|${state.isLoopExitRequested}|${state.isLoopBypassed}`;

  if (!isStepPreview && cacheRef.current?.key === key) {
    return cacheRef.current.validFamily ? cacheRef.current.bar : null;
  }

  const validFamily = resolveTrackAoVivoFamily(activeTrack, state.tracks).family === family;
  if (!validFamily) {
    if (!isStepPreview) cacheRef.current = { key, validFamily: false, bar: null };
    return null;
  }

  const bar = resolveAoVivoMeasureBarData({
    activeTrack,
    allTracks: state.tracks,
    measure,
    soloPlayId,
    measureSeqId,
    varMap,
    state,
  });
  if (!isStepPreview) {
    cacheRef.current = { key, validFamily: true, bar };
  }
  return bar;
}
