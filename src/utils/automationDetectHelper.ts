/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Détection stricte d'automations réelles (volume, pan, réverbe) sur une piste (< 55 lignes).
 */
import { TrackGroup } from '../types';

export function trackHasRealVolAuto(track: TrackGroup | null | undefined): boolean {
  if (!track?.measureVols || track.measureVols.length === 0) return false;
  const nominal = track.volumeVal ?? 75;
  const hasDiff = track.measureVols.some((v) => v !== nominal);
  if (hasDiff) return true;
  return Boolean(track.measureVolTransitions?.some((t) => t && t !== 'immediate'));
}

export function trackHasRealPanAuto(track: TrackGroup | null | undefined): boolean {
  if (!track?.measurePans || track.measurePans.length === 0) return false;
  const nominal = track.panVal ?? track.pan ?? 0;
  const hasDiff = track.measurePans.some((p) => p !== nominal);
  if (hasDiff) return true;
  return Boolean(track.measurePanTransitions?.some((t) => t && t !== 'immediate'));
}

export function trackHasRealRevAuto(track: TrackGroup | null | undefined): boolean {
  if (!track?.measureReverbSends || track.measureReverbSends.length === 0) return false;
  const nominal = track.fxSends?.reverb ?? track.reverbVal ?? 0;
  const hasDiff = track.measureReverbSends.some((r) => r !== nominal);
  if (hasDiff) return true;
  return Boolean(track.measureReverbTransitions?.some((t) => t && t !== 'immediate'));
}

export function trackHasAnyRealAuto(track: TrackGroup | null | undefined): boolean {
  return trackHasRealVolAuto(track) || trackHasRealPanAuto(track) || trackHasRealRevAuto(track);
}

export function anyTrackHasRealAuto(tracks: TrackGroup[] | null | undefined): boolean {
  if (!tracks || tracks.length === 0) return false;
  return tracks.some((t) => trackHasAnyRealAuto(t));
}
