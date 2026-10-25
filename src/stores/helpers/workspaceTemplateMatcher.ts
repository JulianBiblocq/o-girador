/**
 * Appariement intelligent des pistes de gabarit avec les pistes du morceau (< 100 lignes).
 */
import { TrackGroup, WorkspaceTemplateTrack } from '../../types';
import { findMatchingBusForTemplate } from './workspaceTemplateBusMatcher';

export interface TemplateMatchResult {
  tplToSongIdMap: Map<number, number>;
  matchedSongTrackIds: Set<number>;
  unmappedTplTracks: WorkspaceTemplateTrack[];
  extraSongTracks: TrackGroup[];
}

export function isVoiceTrack(t: { instrumentIdx: number }, config: any[]): boolean {
  const inst = config[t.instrumentIdx];
  if (!inst) return false;
  return inst.type === 'voice' || ['puxador', 'coro', 'toada'].includes(inst.id);
}

export function matchTemplateTracksWithSong(
  songTracks: TrackGroup[],
  tplTracks: WorkspaceTemplateTrack[],
  config: any[]
): TemplateMatchResult {
  const tplToSongIdMap = new Map<number, number>();
  const matchedSongTrackIds = new Set<number>();
  const unmappedTplTracks: WorkspaceTemplateTrack[] = [];
  const now = Date.now();

  // 1. Appariement des dossiers de BUS
  const songBusFolders = songTracks.filter((t) => t.isBusFolder);
  const matchedBusSongIds = new Set<number>();

  tplTracks.forEach((tplT, i) => {
    if (!tplT.isBusFolder) return;
    const match = findMatchingBusForTemplate(tplT, songBusFolders, matchedBusSongIds, tplTracks, songTracks, config);

    if (match) {
      tplToSongIdMap.set(tplT.id, match.id);
      matchedSongTrackIds.add(match.id);
      matchedBusSongIds.add(match.id);
    } else {
      const newId = now + i * 10 + Math.floor(Math.random() * 9);
      tplToSongIdMap.set(tplT.id, newId);
      unmappedTplTracks.push(tplT);
    }
  });

  // 2. Appariement des pistes instruments standards (hors voix)
  tplTracks.forEach((tplT, i) => {
    if (tplT.isBusFolder) return;
    const tplRole = config[tplT.instrumentIdx]?.id || '';

    const match = songTracks.find((st) => {
      if (matchedSongTrackIds.has(st.id) || st.isBusFolder) return false;
      if (isVoiceTrack(st, config)) return false;
      const songRole = config[st.instrumentIdx]?.id || '';
      return (tplRole && songRole && tplRole === songRole) || st.instrumentIdx === tplT.instrumentIdx;
    });

    if (match) {
      tplToSongIdMap.set(tplT.id, match.id);
      matchedSongTrackIds.add(match.id);
    } else {
      const newId = now + i * 10 + Math.floor(Math.random() * 9);
      tplToSongIdMap.set(tplT.id, newId);
      unmappedTplTracks.push(tplT);
    }
  });

  // 3. Pistes excédentaires du morceau actuel
  const extraSongTracks = songTracks.filter((st) => !matchedSongTrackIds.has(st.id));

  return {
    tplToSongIdMap,
    matchedSongTrackIds,
    unmappedTplTracks,
    extraSongTracks,
  };
}
