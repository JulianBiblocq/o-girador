/**
 * busDynamicsStateHelpers.ts — Transformations pures (immutables) de la dynamique de Bus & Polarité (< 90 lignes).
 */
import type { TrackGroup } from '../../types';
import type { BusCompressorPresetArchetypeId, BusCompressorSettings } from '../../audio/effects/busCompressorTypes';
import { buildArchetypeSettings, detectBusArchetypeForGroup } from '../../audio/effects/busCompressorArchetypes';
import { mergeBusCompressorPatch, sanitizeBusCompressorSettings } from '../../audio/effects/busCompressorSanitizer';

/** Le compresseur VCA n'est applicable qu'aux tranches de groupe (Bus, Link, Toada). */
export const isBusDynamicsTarget = (t: Pick<TrackGroup, 'isBusFolder' | 'isLinkFolder'> | undefined | null): boolean =>
  Boolean(t && (t.isBusFolder || t.isLinkFolder));

const sameId = (t: TrackGroup, id: number) => t.id === id || String(t.id) === String(id);

export function togglePhaseInvertState(tracks: TrackGroup[], trackId: number): TrackGroup[] {
  return tracks.map((t) => (sameId(t, trackId) ? { ...t, phaseInverted: !t.phaseInverted } : t));
}

export function resolveInitialBusCompressor(bus: TrackGroup, tracks: TrackGroup[], enabled: boolean): BusCompressorSettings {
  return buildArchetypeSettings(detectBusArchetypeForGroup(bus, tracks), enabled);
}

export function toggleBusCompressorState(tracks: TrackGroup[], busTrackId: number): TrackGroup[] {
  return tracks.map((t) => {
    if (!sameId(t, busTrackId) || !isBusDynamicsTarget(t)) return t;
    if (!t.busCompressor) return { ...t, busCompressor: resolveInitialBusCompressor(t, tracks, true) };
    const current = sanitizeBusCompressorSettings(t.busCompressor);
    return { ...t, busCompressor: { ...current, enabled: !current.enabled } };
  });
}

export function updateBusCompressorState(
  tracks: TrackGroup[],
  busTrackId: number,
  patch: Partial<BusCompressorSettings>
): TrackGroup[] {
  return tracks.map((t) => {
    if (!sameId(t, busTrackId) || !isBusDynamicsTarget(t)) return t;
    const current = t.busCompressor
      ? sanitizeBusCompressorSettings(t.busCompressor)
      : resolveInitialBusCompressor(t, tracks, false);
    return { ...t, busCompressor: mergeBusCompressorPatch(current, patch) };
  });
}

export function applyBusCompressorArchetypeState(
  tracks: TrackGroup[],
  busTrackId: number,
  archetype: BusCompressorPresetArchetypeId
): TrackGroup[] {
  return tracks.map((t) => {
    if (!sameId(t, busTrackId) || !isBusDynamicsTarget(t)) return t;
    return { ...t, busCompressor: buildArchetypeSettings(archetype, true) };
  });
}

export function findTrackById(tracks: TrackGroup[], id: number): TrackGroup | undefined {
  return tracks.find((t) => sameId(t, id));
}

