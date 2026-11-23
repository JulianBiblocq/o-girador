/**
 * useTrackLinkRoleBadge.ts — Sélecteur Zustand 100 % primitif (`string`) du rôle piste pilote / piste liée (< 70 lignes).
 * - Retourne `''` | `'M'` | `'S:<AbbrPilote>'` : 0 allocation d'objet/tableau dans `getSnapshot` (React 19).
 */
import { useCallback } from 'react';
import { instrumentsConfig } from '../../../data';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import type { TrackGroup } from '../../../types';
import { getLinkedGroupMembers, isSlaveTrack, resolveMasterTrack } from '../../../utils/trackMasterResolver';

const ROLE_SHORT_CODES: Readonly<Record<string, string>> = {
  marcante: 'Mc',
  meiao: 'Me',
  repique: 'Rp',
  caixa: 'Cx',
  tarol: 'Tr',
  timbal: 'Tb',
  gongue: 'Gg',
  agbe: 'Ag',
  mineiro: 'Mn',
  apito: 'Ap',
};

export function buildShortTrackMasterAbbr(track: TrackGroup): string {
  const inst = instrumentsConfig[track.instrumentIdx];
  const baseCode = ROLE_SHORT_CODES[inst?.id || ''] || (inst?.name || 'M').slice(0, 3);
  const custom = (track.customName || '').trim();
  if (!custom) return baseCode;
  const numMatch = custom.match(/(\d+)\s*$/);
  if (numMatch) return `${baseCode}${numMatch[1]}`;
  return custom.length <= 4 ? custom : baseCode;
}

export function serializeTrackLinkRoleBadge(tracks: readonly TrackGroup[], trackId?: number): string {
  if (trackId === undefined) return '';
  const mutTracks = tracks as TrackGroup[];
  const track = tracks.find((t) => t.id === trackId);
  if (!track || track.isBusFolder || track.isLinkFolder) return '';

  if (isSlaveTrack(track, mutTracks)) {
    const master = resolveMasterTrack(track.id, mutTracks);
    if (master && master.id !== track.id) {
      return `S:${buildShortTrackMasterAbbr(master)}`;
    }
    return '';
  }

  const members = getLinkedGroupMembers(track, mutTracks).filter((m) => m.id !== track.id);
  if (members.length > 0 && (track.isLinkMaster || members.some((m) => isSlaveTrack(m, mutTracks)))) {
    return 'M';
  }
  return '';
}

export function useTrackLinkRoleBadge(trackId?: number): string {
  const selectBadge = useCallback(
    (s: { tracks: TrackGroup[] }) => serializeTrackLinkRoleBadge(s.tracks, trackId),
    [trackId]
  );
  return useSequencerStore(selectBadge);
}
