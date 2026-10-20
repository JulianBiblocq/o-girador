/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { TrackGroup, Pattern } from '../../types';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { EMPTY_ARRAY } from './circleSequencerConstants';

export const isTracksStructureEqual = (prev: TrackGroup[], next: TrackGroup[]): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (
      p.id !== n.id ||
      p.instrumentIdx !== n.instrumentIdx ||
      p.isHidden !== n.isHidden ||
      p.isMute !== n.isMute ||
      p.isSolo !== n.isSolo ||
      p.radius !== n.radius
    ) {
      return false;
    }
    if (p.patterns.length !== n.patterns.length) return false;
    for (let j = 0; j < p.patterns.length; j++) {
      const pp = p.patterns[j];
      const np = n.patterns[j];
      if (pp.id !== np.id || pp.steps !== np.steps) return false;
      if (pp.measureAssignments.length !== np.measureAssignments.length) return false;
      for (let m = 0; m < pp.measureAssignments.length; m++) {
        if (pp.measureAssignments[m] !== np.measureAssignments[m]) return false;
      }
    }
  }
  return true;
};

export function useTracksWithCustomEquality(isActive: boolean): TrackGroup[] {
  const [tracks, setTracks] = useState<TrackGroup[]>(() => {
    if (!isActive) return EMPTY_ARRAY;
    return useSequencerStore.getState().tracks;
  });

  const lastTracksRef = useRef<TrackGroup[]>(tracks);

  useEffect(() => {
    if (!isActive) {
      if (lastTracksRef.current !== EMPTY_ARRAY) {
        lastTracksRef.current = EMPTY_ARRAY;
        setTracks(EMPTY_ARRAY);
      }
      return;
    }

    const handleStoreChange = (state: any) => {
      const nextTracks = state.tracks;
      if (!isTracksStructureEqual(lastTracksRef.current, nextTracks)) {
        lastTracksRef.current = nextTracks;
        setTracks(nextTracks);
      }
    };

    handleStoreChange(useSequencerStore.getState());
    const unsubscribe = useSequencerStore.subscribe(handleStoreChange);
    return unsubscribe;
  }, [isActive]);

  return tracks;
}

export const resolvePatternForMeasure = (
  tObj: TrackGroup | undefined,
  mIdx: number,
  sPlayId: number | null | undefined
): Pattern | null => {
  if (!tObj) return null;
  if (sPlayId !== undefined && sPlayId !== null) {
    return tObj.patterns.find(p => p.id === sPlayId) || null;
  }
  const overrideId = tObj.patternOverrides?.[mIdx];
  if (overrideId !== undefined) {
    return overrideId !== null ? (tObj.patterns.find(p => p.id === overrideId) || null) : null;
  }
  return tObj.patterns.find(p => p.measureAssignments?.[mIdx]) || null;
};

export function getDefaultStepsForMeasure(
  measureIdx: number,
  timeSig: string = '4/4',
  measureTimeSigs?: Record<number, string> | string[]
): number {
  const effectiveTimeSig = (measureTimeSigs && (Array.isArray(measureTimeSigs) ? measureTimeSigs[measureIdx] : measureTimeSigs[measureIdx])) || timeSig || '4/4';
  if (effectiveTimeSig === '12/8') return 12;
  if (effectiveTimeSig === '6/8') return 6;
  if (effectiveTimeSig === '9/8') return 9;
  if (effectiveTimeSig === '2/4') return 8;
  if (effectiveTimeSig === '3/4') return 12;
  if (effectiveTimeSig === '4/4') return 16;
  const parts = effectiveTimeSig.split('/');
  const num = parseInt(parts[0], 10) || 4;
  const den = parseInt(parts[1], 10) || 4;
  if (den === 8) return num;
  return num * 4;
}

export function getPhysicalStepFromRatio(
  ratio: number,
  pattern: Pattern | null | undefined,
  totalSteps: number,
  beatsCount: number
): number {
  const clampedRatio = Math.min(0.999999, Math.max(0, ratio));
  const resolutions = pattern?.beatResolutions && pattern.beatResolutions.length === beatsCount
    ? pattern.beatResolutions
    : (pattern?.beatResolutions && pattern.beatResolutions.length > 0 
        ? pattern.beatResolutions 
        : Array(beatsCount).fill(Math.max(1, Math.floor(totalSteps / beatsCount))));

  const b = Math.min(resolutions.length - 1, Math.floor(clampedRatio * resolutions.length));
  const subProgression = (clampedRatio * resolutions.length) - b;
  const res = resolutions[b] || 4;
  const k = Math.min(res - 1, Math.floor(subProgression * res));

  let stepOffset = 0;
  for (let i = 0; i < b; i++) {
    stepOffset += resolutions[i] || 4;
  }

  return Math.min(totalSteps - 1, Math.max(0, stepOffset + k));
}
