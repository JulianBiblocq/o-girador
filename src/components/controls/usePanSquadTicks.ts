/**
 * usePanSquadTicks.ts — Calcul des repères radiaux de pupitre & Maître/Esclaves sur la couronne d'un `PanKnob` (< 130 lignes).
 * - Sélecteur Zustand 100 % primitif (`string`) pour `useSyncExternalStore` (React 19) : 0 allocation en `getSnapshot`.
 * - Sépare les membres d'escouade relatifs (`isFixedWorld: false`) des pistes liées/enfants absolues (`isFixedWorld: true`).
 */
import { useCallback, useMemo } from 'react';
import { isSectionEnsembleEligible } from '../../constants/sectionEnsembleLimits';
import { instrumentsConfig } from '../../data';
import { useSequencerStore } from '../../stores/useSequencerStore';
import type { TrackGroup } from '../../types';
import { getLinkedGroupMembers, isSlaveTrack, resolveMasterTrack } from '../../utils/trackMasterResolver';

export type PanCrownTickKind = 'squad' | 'linked-slave' | 'linked-master' | 'bus-child';

export interface PanCrownTickSpec {
  baseOffset: number;
  isLeader: boolean;
  kind?: PanCrownTickKind;
  isFixedWorld?: boolean;
}

export const EMPTY_SQUAD_TICKS: readonly PanCrownTickSpec[] = Object.freeze([]);

const clampPan = (v: number): number => Math.max(-100, Math.min(100, Math.round(v)));

function resolvePlayerBasePan(x: number, panVal?: number): number {
  return typeof panVal === 'number' && Number.isFinite(panVal) ? clampPan(panVal) : clampPan((x - 50) * 2);
}

function collectTrackWorldVoicePans(track: TrackGroup, allTracks: readonly TrackGroup[]): Array<{ pan: number; isMaster: boolean }> {
  const inst = instrumentsConfig[track.instrumentIdx];
  const trackPan = track.panVal ?? track.pan ?? 0;
  const isMaster = !isSlaveTrack(track, allTracks as TrackGroup[]) && Boolean(track.isLinkMaster);
  if (track.sectionPlayers && track.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type)) {
    return track.sectionPlayers.map((p, idx) => ({
      pan: clampPan(resolvePlayerBasePan(p.x, p.panVal) + trackPan),
      isMaster: idx === 0 && isMaster,
    }));
  }
  return [{ pan: clampPan(trackPan), isMaster }];
}

export function resolvePanCrownTicksForTrack(
  tracks: readonly TrackGroup[],
  trackId?: number
): PanCrownTickSpec[] {
  if (trackId === undefined) return [];
  const mutTracks = tracks as TrackGroup[];
  const track = tracks.find((t) => t.id === trackId);
  if (!track) return [];

  // 1. Dossier Bus ou Groupe Lié (plié OU déplié : éventail permanent des enfants)
  if (track.isBusFolder || track.isLinkFolder) {
    const pid = String(track.id);
    const children = tracks.filter(
      (c) => !c.isBusFolder && !c.isLinkFolder && !c.isHidden && (String(c.busId) === pid || String(c.linkedToTrackId) === pid)
    );
    const voices = children.flatMap((c) => collectTrackWorldVoicePans(c, tracks));
    if (voices.length === 0) return [];
    const hasExplicitMaster = voices.some((v) => v.isMaster);
    return voices.map((v, idx) => {
      const isLead = hasExplicitMaster ? v.isMaster : idx === 0;
      return { baseOffset: v.pan, isLeader: isLead, kind: isLead ? 'linked-master' : 'bus-child', isFixedWorld: true };
    });
  }

  const out: PanCrownTickSpec[] = [];
  const inst = instrumentsConfig[track.instrumentIdx];

  // 2. Membres d'escouade propres `#1..#N` (relatifs au trim Pan de la piste)
  if (track.sectionPlayers && track.sectionPlayers.length > 1 && isSectionEnsembleEligible(inst?.id, inst?.type)) {
    for (let idx = 0; idx < track.sectionPlayers.length; idx++) {
      const p = track.sectionPlayers[idx];
      out.push({ baseOffset: resolvePlayerBasePan(p.x, p.panVal), isLeader: idx === 0, kind: 'squad', isFixedWorld: false });
    }
  }

  // 3. Relation Maître <-> Esclaves liés (coordonnées absolues fixes `isFixedWorld: true` : 0 saut au relâchement)
  if (isSlaveTrack(track, mutTracks)) {
    const master = resolveMasterTrack(track.id, mutTracks);
    if (master && master.id !== track.id && !master.isHidden) {
      const masterPan = clampPan(master.panVal ?? master.pan ?? 0);
      out.push({ baseOffset: masterPan, isLeader: true, kind: 'linked-master', isFixedWorld: true });
    }
    return out;
  }

  const groupMembers = getLinkedGroupMembers(track, mutTracks).filter((m) => m.id !== track.id && !m.isHidden);
  if (groupMembers.length > 0 && (track.isLinkMaster || groupMembers.some((m) => isSlaveTrack(m, mutTracks)))) {
    for (const sl of groupMembers) {
      for (const v of collectTrackWorldVoicePans(sl, tracks)) {
        out.push({ baseOffset: v.pan, isLeader: false, kind: 'linked-slave', isFixedWorld: true });
      }
    }
  }

  return out;
}

const KIND_TO_CODE: Record<PanCrownTickKind, string> = {
  squad: 'q',
  'linked-slave': 's',
  'linked-master': 'm',
  'bus-child': 'b',
};
const CODE_TO_KIND: Record<string, PanCrownTickKind> = {
  q: 'squad',
  s: 'linked-slave',
  m: 'linked-master',
  b: 'bus-child',
};

export function serializePanCrownTicks(tracks: readonly TrackGroup[], trackId?: number): string {
  const ticks = resolvePanCrownTicksForTrack(tracks, trackId);
  if (ticks.length === 0) return '';
  return ticks
    .map((t) => `${t.baseOffset}:${t.isLeader ? 1 : 0}:${KIND_TO_CODE[t.kind || 'squad']}:${t.isFixedWorld ? 1 : 0}`)
    .join('|');
}

export function parsePanCrownTicksKey(ticksKey: string): readonly PanCrownTickSpec[] {
  if (!ticksKey) return EMPTY_SQUAD_TICKS;
  return Object.freeze(
    ticksKey.split('|').map((part) => {
      const [offStr, leadStr, kindCode, fixedStr] = part.split(':');
      return {
        baseOffset: Number(offStr) || 0,
        isLeader: leadStr === '1',
        kind: CODE_TO_KIND[kindCode] || 'squad',
        isFixedWorld: fixedStr === '1',
      };
    })
  );
}

export function usePanSquadTicks(trackId?: number): readonly PanCrownTickSpec[] {
  const selectKey = useCallback((s: { tracks: TrackGroup[] }) => serializePanCrownTicks(s.tracks, trackId), [trackId]);
  const ticksKey = useSequencerStore(selectKey);
  return useMemo(() => parsePanCrownTicksKey(ticksKey), [ticksKey]);
}
