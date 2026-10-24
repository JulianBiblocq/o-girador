/**
 * Détection stricte d'automations réelles (volume, pan, réverbe) sur une piste (< 70 lignes).
 */
import { TrackGroup } from '../types';

export function isArrayFlatWithNoTransitions(
  values: number[] | undefined,
  transitions: ('immediate' | 'ramp' | 'bezier')[] | undefined
): boolean {
  if (!values || values.length === 0) return true;
  const hasTransition = Boolean(transitions?.some((t) => t && t !== 'immediate'));
  if (hasTransition) return false;
  const first = values[0];
  return values.every((v) => v === first);
}

export function hasActiveTrackAutomation(
  track: TrackGroup | null | undefined,
  param: 'volume' | 'pan' | 'reverb'
): boolean {
  if (!track) return false;
  if (param === 'volume') {
    if (!track.measureVols || track.measureVols.length === 0) return false;
    return !isArrayFlatWithNoTransitions(track.measureVols, track.measureVolTransitions);
  }
  if (param === 'pan') {
    if (!track.measurePans || track.measurePans.length === 0) return false;
    return !isArrayFlatWithNoTransitions(track.measurePans, track.measurePanTransitions);
  }
  if (param === 'reverb') {
    if (!track.measureReverbSends || track.measureReverbSends.length === 0) return false;
    return !isArrayFlatWithNoTransitions(track.measureReverbSends, track.measureReverbTransitions);
  }
  return false;
}

export function trackHasRealVolAuto(track: TrackGroup | null | undefined): boolean {
  return hasActiveTrackAutomation(track, 'volume');
}

export function trackHasRealPanAuto(track: TrackGroup | null | undefined): boolean {
  return hasActiveTrackAutomation(track, 'pan');
}

export function trackHasRealRevAuto(track: TrackGroup | null | undefined): boolean {
  return hasActiveTrackAutomation(track, 'reverb');
}

export function trackHasAnyRealAuto(track: TrackGroup | null | undefined): boolean {
  return trackHasRealVolAuto(track) || trackHasRealPanAuto(track) || trackHasRealRevAuto(track);
}

export function anyTrackHasRealAuto(tracks: TrackGroup[] | null | undefined): boolean {
  if (!tracks || tracks.length === 0) return false;
  return tracks.some((t) => trackHasAnyRealAuto(t));
}

