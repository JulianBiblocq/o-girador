/**
 * rodaMasterSlaveMuteSoloHelper.ts — Mute / Solo solidaire Maître + Esclaves masqués sur la Roda (< 75 lignes).
 * Lorsque les esclaves sont masqués sur la Roda (`!showLinkedTracksOnRoda`), cliquer sur `[M]` ou `[S]`
 * sur la ligne d'un Maître mute ou solote solidairement ses esclaves liés cachés.
 */
import { TrackGroup } from '../../types';
import { isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';
import {
  reconcileAncestorsSoloBottomUp,
  toggleTrackMuteStudioPro,
  toggleTrackSoloStudioPro,
} from './trackSoloProHelpers';

function findLinkedSlavesOfMaster<T extends TrackGroup>(tracks: T[], masterId: number): T[] {
  return tracks.filter(
    (t) => t.id !== masterId && isSlaveTrack(t, tracks) && resolveMasterTrack(t.id, tracks)?.id === masterId
  );
}

export function toggleRodaTrackMuteWithHiddenSlaves<T extends TrackGroup>(
  tracks: T[],
  targetId: number,
  areSlavesHiddenOnRoda: boolean
): T[] {
  if (!areSlavesHiddenOnRoda) return toggleTrackMuteStudioPro(tracks, targetId);
  const target = tracks.find((t) => t.id === targetId);
  if (!target) return tracks;

  const slaves = findLinkedSlavesOfMaster(tracks, target.id);
  if (slaves.length === 0) return toggleTrackMuteStudioPro(tracks, targetId);

  const nextMute = !Boolean(target.isMute);
  const familyIds = new Set<number>([target.id, ...slaves.map((s) => s.id)]);
  const hadSolo = tracks.some((t) => familyIds.has(t.id) && Boolean(t.isSolo));

  const updated = tracks.map((t) => {
    if (!familyIds.has(t.id)) return t;
    return nextMute
      ? { ...t, isMute: true, isSolo: false }
      : { ...t, isMute: false };
  });

  return nextMute && hadSolo ? reconcileAncestorsSoloBottomUp(updated, target.id) : updated;
}

export function toggleRodaTrackSoloWithHiddenSlaves<T extends TrackGroup>(
  tracks: T[],
  targetId: number,
  areSlavesHiddenOnRoda: boolean
): T[] {
  if (!areSlavesHiddenOnRoda) return toggleTrackSoloStudioPro(tracks, targetId);
  const target = tracks.find((t) => t.id === targetId);
  if (!target) return tracks;

  const slaves = findLinkedSlavesOfMaster(tracks, target.id);
  if (slaves.length === 0) return toggleTrackSoloStudioPro(tracks, targetId);

  const nextSolo = !Boolean(target.isSolo);
  const familyIds = new Set<number>([target.id, ...slaves.map((s) => s.id)]);

  const updated = tracks.map((t) => {
    if (!familyIds.has(t.id)) return t;
    return nextSolo
      ? { ...t, isSolo: true, isMute: false }
      : { ...t, isSolo: false };
  });

  return reconcileAncestorsSoloBottomUp(updated, target.id);
}
