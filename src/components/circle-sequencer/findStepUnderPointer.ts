
import { TrackGroup, Pattern, InstrumentConfig } from '../../types';
import { instrumentsConfig } from '../../data';
import { isToadaBus } from '../../stores/useSequencerStore';
import { getTrackRadius } from './circleGeometry';

export interface HitStepResult {
  ownerTrack: TrackGroup;
  activePattern: Pattern;
  stepIdx: number;
  inst: InstrumentConfig;
}

export function findStepUnderPointer(
  dx: number,
  dy: number,
  distance: number,
  activeVisibleTracks: TrackGroup[],
  currentTracks: TrackGroup[],
  getLiveActivePatternId: (track: TrackGroup) => number | null
): HitStepResult | null {
  for (let visibleIdx = 0; visibleIdx < activeVisibleTracks.length; visibleIdx++) {
    const track = activeVisibleTracks[visibleIdx];
    const isToada = isToadaBus(track);
    let activePattern: Pattern | null | undefined = null;
    let ownerTrack = track;
    const activePatternId = getLiveActivePatternId(track);
    if (activePatternId === null) continue;

    if (isToada) {
      const pux = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'puxador');
      const coro = currentTracks.find(t => instrumentsConfig[t.instrumentIdx]?.id === 'coro');
      if (pux) {
        activePattern = pux.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = pux;
      }
      if (!activePattern && coro) {
        activePattern = coro.patterns.find(p => p.id === activePatternId);
        if (activePattern) ownerTrack = coro;
      }
    } else {
      activePattern = track.patterns.find(p => p.id === activePatternId);
    }

    if (!activePattern) continue;
    const inst = instrumentsConfig[ownerTrack.instrumentIdx];
    if (!inst) continue;

    const tRad = getTrackRadius(visibleIdx, activeVisibleTracks.length);
    if (Math.abs(distance - tRad) < 18) {
      let clickAngle = Math.atan2(dy, dx) + Math.PI / 2;
      if (clickAngle < 0) clickAngle += Math.PI * 2;
      const stepAngleSize = (Math.PI * 2) / activePattern.steps;

      for (let i = 0; i < activePattern.steps; i++) {
        const targetAngle = i * stepAngleSize;
        let angleDiff = Math.abs(clickAngle - targetAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff < stepAngleSize / 2) {
          return { ownerTrack, activePattern, stepIdx: i, inst };
        }
      }
    }
  }

  return null;
}
